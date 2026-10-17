import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safe-redirect';

describe('safeInternalPath', () => {
  it('keeps a same-origin dashboard path', () => {
    expect(safeInternalPath('/dashboard')).toBe('/dashboard');
  });

  it('rejects host-escaping and absolute URLs (open redirect)', () => {
    expect(safeInternalPath('.evil.com/phish')).toBe('/dashboard');
    expect(safeInternalPath('@evil.com')).toBe('/dashboard');
    expect(safeInternalPath('//evil.com')).toBe('/dashboard');
    expect(safeInternalPath('https://evil.com')).toBe('/dashboard');
    expect(safeInternalPath('javascript:alert(1)')).toBe('/dashboard');
    expect(safeInternalPath('/\\evil.com')).toBe('/dashboard');
    expect(safeInternalPath('/\r\nLocation: https://evil.com')).toBe('/dashboard');
  });
});
