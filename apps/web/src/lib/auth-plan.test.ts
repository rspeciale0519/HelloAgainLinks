import { describe, expect, it } from 'vitest';
import { planFromPrefetch } from './auth-plan';

const USER_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('planFromPrefetch', () => {
  it('does not grant User B / admin plan from a forged JWT sub', () => {
    expect(planFromPrefetch(USER_A, USER_B, 'max')).toBe('free');
    expect(planFromPrefetch(USER_A, USER_A, 'pro')).toBe('pro');
    expect(planFromPrefetch(USER_A, null, 'max')).toBe('free');
  });
});
