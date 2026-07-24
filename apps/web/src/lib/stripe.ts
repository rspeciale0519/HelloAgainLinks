import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
    _stripe = new Stripe(key, {
      // @ts-expect-error - use latest API version
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    });
  }
  return _stripe;
}

// Backwards compat — lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Each price carries the plan it grants, so the webhook maps a completed
// checkout to a tier explicitly (via session metadata.price_id) instead of
// inferring "subscription => pro" — which silently made Max subscribers Pro.
// Amounts are USD cents and must stay in step with PLAN_INFO in
// packages/shared/src/plans.ts, where the quota ceilings are sized against them.
export const PRICE_CONFIG = {
  pro_monthly: {
    name: 'Pro Monthly',
    amount: 1299,
    interval: 'month' as const,
    mode: 'subscription' as const,
    plan: 'pro' as const,
  },
  pro_annual: {
    name: 'Pro Annual',
    amount: 12900, // ~17% off monthly
    interval: 'year' as const,
    mode: 'subscription' as const,
    plan: 'pro' as const,
  },
  max_monthly: {
    name: 'Max Monthly',
    amount: 2900,
    interval: 'month' as const,
    mode: 'subscription' as const,
    plan: 'max' as const,
  },
  max_annual: {
    name: 'Max Annual',
    amount: 27900, // ~20% off monthly
    interval: 'year' as const,
    mode: 'subscription' as const,
    plan: 'max' as const,
  },
  lifetime: {
    name: 'Lifetime Deal',
    amount: 7900,
    interval: null,
    mode: 'payment' as const,
    plan: 'lifetime' as const,
  },
} as const;

export type PriceId = keyof typeof PRICE_CONFIG;

/** Map a checkout's price_id back to the plan it grants. */
export function planForPriceId(priceId: string | undefined | null) {
  if (!priceId) return null;
  return PRICE_CONFIG[priceId as PriceId]?.plan ?? null;
}
