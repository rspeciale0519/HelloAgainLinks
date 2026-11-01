import { describe, expect, it } from 'vitest';
import {
  consumeMobileAuthHandoff,
  createMobileAuthHandoff,
  isExpiredMobileAuthHandoff,
  matchesMobileAuthNonceHash,
  parseMobileAuthHandoff,
  hashMobileAuthNonce,
} from './mobile-auth-handoff';

const NONCE_A = 'a'.repeat(64);
const NONCE_B = 'b'.repeat(64);

describe('mobile auth handoff', () => {
  it('rejects User B’s nonce on User A’s handoff', () => {
    const handoff = createMobileAuthHandoff({
      accessToken: 'access-a',
      refreshToken: 'refresh-a',
      sessionExpiresAt: 1,
      nonceHash: hashMobileAuthNonce(NONCE_A),
    });
    const payload = parseMobileAuthHandoff(handoff);
    expect(isExpiredMobileAuthHandoff(payload)).toBe(false);
    expect(matchesMobileAuthNonceHash(payload.nonceHash, NONCE_A)).toBe(true);
    expect(matchesMobileAuthNonceHash(payload.nonceHash, NONCE_B)).toBe(false);
  });

  it('rejects a replay of the same handoff on this instance', () => {
    const handoff = createMobileAuthHandoff({
      accessToken: 'access-a',
      refreshToken: 'refresh-a',
      sessionExpiresAt: 1,
      nonceHash: hashMobileAuthNonce(NONCE_A),
    });
    const payload = parseMobileAuthHandoff(handoff);
    expect(consumeMobileAuthHandoff(handoff, payload.expiresAt)).toBe(true);
    expect(consumeMobileAuthHandoff(handoff, payload.expiresAt)).toBe(false);
  });

  it('rejects a forged blob', () => {
    expect(() => parseMobileAuthHandoff('not-valid-base64url-ciphertext')).toThrow();
  });
});
