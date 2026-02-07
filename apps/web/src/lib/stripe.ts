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

export const PRICE_CONFIG = {
  pro_monthly: {
    name: 'Pro Monthly',
    amount: 900,
    interval: 'month' as const,
    mode: 'subscription' as const,
  },
  pro_annual: {
    name: 'Pro Annual',
    amount: 8600,
    interval: 'year' as const,
    mode: 'subscription' as const,
  },
  lifetime: {
    name: 'Lifetime Deal',
    amount: 7900,
    interval: null,
    mode: 'payment' as const,
  },
} as const;

export type PriceId = keyof typeof PRICE_CONFIG;
