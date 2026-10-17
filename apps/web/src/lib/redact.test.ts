import { describe, expect, it } from 'vitest';
import { redactForLog } from './redact';

describe('redactForLog', () => {
  it('strips token fields so OAuth JSON cannot hit logs', () => {
    const redacted = redactForLog({
      access_token: 'secret-value',
      token_type: 'bearer',
      refresh_token: 'also-secret',
      expires_in: 7200,
    }) as Record<string, unknown>;
    expect(redacted.access_token).toBe('[redacted]');
    expect(redacted.refresh_token).toBe('[redacted]');
    expect(redacted.expires_in).toBe(7200);
  });
});
