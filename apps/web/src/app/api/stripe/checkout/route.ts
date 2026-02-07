import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { stripe, PRICE_CONFIG, PriceId } from '@/lib/stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const { priceId } = (await req.json()) as { priceId: PriceId };
    const config = PRICE_CONFIG[priceId];
    if (!config) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // Get or create Stripe customer
    const { data: sub } = await ctx.serviceClient
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', ctx.userId)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const { data: profile } = await ctx.serviceClient
        .from('profiles')
        .select('x_handle, display_name')
        .eq('id', ctx.userId)
        .single();

      const customer = await stripe.customers.create({
        metadata: { user_id: ctx.userId },
        name: profile?.display_name || undefined,
        description: profile?.x_handle ? `@${profile.x_handle}` : undefined,
      });
      customerId = customer.id;

      await ctx.serviceClient.from('subscriptions').upsert(
        {
          user_id: ctx.userId,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'active',
        },
        { onConflict: 'user_id' }
      );
    }

    const sessionParams: Record<string, unknown> = {
      customer: customerId,
      success_url: `${APP_URL}/dashboard/settings?payment=success`,
      cancel_url: `${APP_URL}/dashboard/settings?payment=cancelled`,
      metadata: { user_id: ctx.userId, price_id: priceId },
    };

    if (config.mode === 'subscription') {
      Object.assign(sessionParams, {
        mode: 'subscription',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: config.amount,
              recurring: { interval: config.interval },
              product_data: { name: config.name },
            },
            quantity: 1,
          },
        ],
      });
    } else {
      Object.assign(sessionParams, {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: config.amount,
              product_data: { name: config.name },
            },
            quantity: 1,
          },
        ],
      });
    }

    const session = await stripe.checkout.sessions.create(
      sessionParams as Stripe.Checkout.SessionCreateParams
    );
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout]', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
