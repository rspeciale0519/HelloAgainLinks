import crypto from 'crypto';

/**
 * Compare two secrets in constant time.
 * Hashes first so unequal lengths cannot throw or leak length via timingSafeEqual.
 */
export function secretsMatch(
  provided: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
