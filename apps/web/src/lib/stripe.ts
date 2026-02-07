import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
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
