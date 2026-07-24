import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, planForPriceId } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase-server';

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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        const isLifetime = session.mode === 'payment';
        // Resolve the tier from the price the customer actually bought. The old
        // `subscription => 'pro'` inference would have granted Pro limits to a
        // Max subscriber. Fall back to the mode-based guess only if metadata is
        // missing (e.g. a session created outside this app).
        const plan =
          planForPriceId(session.metadata?.price_id) ?? (isLifetime ? 'lifetime' : 'pro');

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
          await serviceClient
            .from('subscriptions')
            .update({
              status,
              current_period_end: new Date(((sub as unknown as Record<string, unknown>).current_period_end as number) * 1000).toISOString(),
            })
            .eq('user_id', dbSub.user_id);
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
