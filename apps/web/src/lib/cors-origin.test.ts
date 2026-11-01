import { describe, expect, it } from 'vitest';
import { isAllowedAppOrigin } from './cors-origin';

describe('isAllowedAppOrigin', () => {
  it('allows Capacitor/localhost and rejects * / attacker sites', () => {
    expect(isAllowedAppOrigin('https://localhost:3000')).toBe(true);
    expect(isAllowedAppOrigin('capacitor://localhost')).toBe(true);
    expect(isAllowedAppOrigin('https://evil.example')).toBe(false);
    expect(isAllowedAppOrigin('*')).toBe(false);
    expect(isAllowedAppOrigin('https://helloagainlinks.com')).toBe(false);
  });
});
