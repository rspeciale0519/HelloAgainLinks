import { describe, expect, it } from 'vitest';
import { allIdsOwned } from './owned-ids';
import { planFromPrefetch } from './auth-plan';
import { isAllowedAppOrigin } from './cors-origin';
import { secretsMatch } from './secrets-match';
import { resolvePaidPlan } from './stripe';
import { isAllowedAvatarUrl } from './safe-avatar-url';
import { isValidXQueryId } from './x-query-id';
import { safeInternalPath } from './safe-redirect';

/**
 * Local A/B/admin attack battery (no production, no real cards/SMS).
 * User A = attacker, User B = victim, Admin = cron/webhook privileged path.
 */
const USER_A = 'user-a';
const USER_B = 'user-b';

describe('attack battery: impersonation / IDOR / privilege / auth bypass', () => {
  it('IDOR: A cannot use B’s tag id', () => {
    expect(allIdsOwned(['tag-b'], ['tag-a'])).toBe(false);
  });

  it('privilege: A cannot mint B’s max plan from a JWT sub swap', () => {
    expect(planFromPrefetch(USER_A, USER_B, 'max')).toBe('free');
  });

  it('CORS: evil origin does not get reflected ACAO', () => {
    expect(isAllowedAppOrigin('https://evil.example')).toBe(false);
  });

  it('admin cron: wrong secret is not accepted', () => {
    expect(secretsMatch('x-bookmark-sync-secret-from-a', 'real-cron-secret')).toBe(false);
  });

  it('payment tamper: unknown price id does not grant pro', () => {
    expect(resolvePaidPlan({ priceId: 'admin_unlimited', amountTotal: 0 })).toBeNull();
  });

  it('SSRF: card route will not fetch metadata IPs', () => {
    expect(isAllowedAvatarUrl('https://127.0.0.1/secret')).toBe(false);
  });

  it('x-config poison: A cannot set a URL as queryId', () => {
    expect(isValidXQueryId('https://attacker.test/x')).toBe(false);
  });

  it('open redirect: OAuth redirect stays on-origin', () => {
    expect(safeInternalPath('https://phish.test/login')).toBe('/dashboard');
  });
});
