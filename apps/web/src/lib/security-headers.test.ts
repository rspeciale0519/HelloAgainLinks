import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from './security-headers';

describe('SECURITY_HEADERS', () => {
  it('sets clickjacking, CSP, and HSTS guards', () => {
    const map = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    expect(map['X-Frame-Options']).toBe('DENY');
    expect(map['X-Content-Type-Options']).toBe('nosniff');
    expect(map['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(map['Strict-Transport-Security']).toContain('max-age=');
  });
});
