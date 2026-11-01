import { describe, expect, it } from 'vitest';
import { isAllowedAvatarUrl } from './safe-avatar-url';

describe('isAllowedAvatarUrl', () => {
  it('allows X CDN avatars', () => {
    expect(isAllowedAvatarUrl('https://pbs.twimg.com/profile_images/1.jpg')).toBe(true);
  });

  it('blocks SSRF targets User A might plant on a profile', () => {
    expect(isAllowedAvatarUrl('http://pbs.twimg.com/x.jpg')).toBe(false);
    expect(isAllowedAvatarUrl('https://169.254.169.254/latest/meta-data/')).toBe(false);
    expect(isAllowedAvatarUrl('https://localhost/admin')).toBe(false);
    expect(isAllowedAvatarUrl('https://evil.example/steal')).toBe(false);
    expect(isAllowedAvatarUrl('https://pbs.twimg.com.evil.com/x.jpg')).toBe(false);
    expect(isAllowedAvatarUrl('https://user:pass@pbs.twimg.com/x.jpg')).toBe(false);
  });
});
