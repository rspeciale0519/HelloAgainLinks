/**
 * Return `raw` only if it is a safe same-origin relative path, otherwise the
 * fallback. Used to gate the post-login `redirect` parameter before it is
 * concatenated onto APP_URL, so an attacker cannot smuggle an absolute or
 * host-changing value (`.evil.com`, `@evil.com`, `//evil.com`, `https://…`,
 * `javascript:…`) and turn the OAuth callback into an open redirect.
 *
 * A value is accepted only when it starts with a single `/` (a path rooted at
 * the app origin) and contains no protocol-relative prefix, backslash, or
 * control characters that a browser might normalize into an authority.
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = '/dashboard',
): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback; // absolute URL, scheme, or host-escape
  if (raw.startsWith('//')) return fallback; // protocol-relative → other host
  if (raw.includes('\\')) return fallback; // backslash can normalize to `/`
  if (/[\x00-\x1f\x7f]/.test(raw)) return fallback; // CR/LF/control chars
  return raw;
}
