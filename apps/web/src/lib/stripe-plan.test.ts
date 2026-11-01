import { describe, expect, it } from 'vitest';
import { resolvePaidPlan } from './stripe';

describe('resolvePaidPlan', () => {
  it('maps our checkout price ids to the paid tier', () => {
    expect(resolvePaidPlan({ priceId: 'max_monthly' })).toBe('max');
    expect(resolvePaidPlan({ priceId: 'lifetime', amountTotal: 7900 })).toBe('lifetime');
  });

  it('does not grant pro when User A tampers metadata / amount', () => {
    expect(resolvePaidPlan({ priceId: 'free_forever' })).toBeNull();
    expect(resolvePaidPlan({ priceId: 'max_monthly_but_cheap', amountTotal: 1 })).toBeNull();
    expect(resolvePaidPlan({})).toBeNull();
  });

  it('matches unique amounts when metadata is missing', () => {
    expect(resolvePaidPlan({ amountTotal: 2900 })).toBe('max');
  });
});
