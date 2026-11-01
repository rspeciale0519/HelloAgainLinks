import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, planForPriceId, planForPriceAmount, resolvePaidPlan } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase-server';

async function alreadyProcessed(
  serviceClient: ReturnType<typeof getServiceClient>,
  eventId: string,
): Promise<boolean> {
  const { error } = await serviceClient
    .from('stripe_processed_events')
    .insert({ event_id: eventId });
  if (!error) return false;
  if (error.code === '23505') return true; // unique violation — replay
  // Table missing until migration 013 is applied: continue without ledger.
  console.error('[Stripe Webhook] idempotency insert failed:', error.code);
  return false;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const serviceClient = getServiceClient();

  if (await alreadyProcessed(serviceClient, event.id)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        const isLifetime = session.mode === 'payment';
        const itemInterval = isLifetime ? null : 'month';
        const plan = resolvePaidPlan({
          priceId: session.metadata?.price_id,
          amountTotal: session.amount_total,
          interval: itemInterval,
        });
        if (!plan) {
          console.error('[Stripe Webhook] Unresolved checkout plan; skipping upgrade');
          break;
        }

        await serviceClient
          .from('subscriptions')
          .update({
            stripe_subscription_id: session.subscription as string | null,
            plan,
            status: 'active',
            current_period_end: isLifetime ? null : undefined,
          })
          .eq('user_id', userId);

        await serviceClient
          .from('profiles')
          .update({ plan })
          .eq('id', userId);

        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: dbSub } = await serviceClient
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (dbSub) {
          const status = sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status;
          // A plan change made in the Stripe portal (e.g. Pro → Max) arrives as
          // subscription.updated — resolve the tier and re-sync both tables,
          // not just the status (2026-07-31 audit defect #9). Newer
          // subscriptions carry our internal price_id in their metadata
          // (stamped at checkout); older ones fall back to matching the
          // inline-price amount+interval against PRICE_CONFIG, since the
          // Stripe-generated price id is meaningless to planForPriceId.
          const item = sub.items?.data?.[0];
          const plan =
            planForPriceId(sub.metadata?.price_id) ??
            planForPriceAmount(item?.price?.unit_amount, item?.price?.recurring?.interval);
          await serviceClient
            .from('subscriptions')
            .update({
              status,
              ...(plan ? { plan } : {}),
              current_period_end: new Date(((sub as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString(),
            })
            .eq('user_id', dbSub.user_id);

          if (plan && status === 'active') {
            await serviceClient
              .from('profiles')
              .update({ plan })
              .eq('id', dbSub.user_id);
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: dbSub } = await serviceClient
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (dbSub) {
          await serviceClient
            .from('subscriptions')
            .update({ plan: 'free', status: 'canceled', stripe_subscription_id: null })
            .eq('user_id', dbSub.user_id);

          await serviceClient
            .from('profiles')
            .update({ plan: 'free' })
            .eq('id', dbSub.user_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: dbSub } = await serviceClient
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();

        if (dbSub) {
          await serviceClient
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('user_id', dbSub.user_id);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
