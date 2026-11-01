const ALLOWED_HOST_SUFFIXES = ['.twimg.com'];
const ALLOWED_HOSTS = new Set(['pbs.twimg.com', 'abs.twimg.com', 'ton.twimg.com']);

/**
 * Avatars on OG cards are fetched server-side. Only allow X/Twitter CDN hosts
 * so a poisoned profiles.avatar_url cannot turn the card route into SSRF.
 */
export function isAllowedAvatarUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (ALLOWED_HOSTS.has(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
