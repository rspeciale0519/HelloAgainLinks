import crypto from 'crypto';

const DEV_FALLBACK_HANDOFF_SECRET = 'helloagain-mobile-auth-dev-only-secret';
const MOBILE_AUTH_HANDOFF_SECRET =
  process.env.MOBILE_AUTH_HANDOFF_SECRET ||
  (process.env.NODE_ENV === 'production' ? null : DEV_FALLBACK_HANDOFF_SECRET);

const HANDOFF_TTL_SECONDS = 120;
const AES_ALGORITHM = 'aes-256-gcm';
const NONCE_PATTERN = /^[a-f0-9]{64}$/i;
const replayStoreKey = Symbol.for('helloagain.mobile-auth-handoff.replay-store');

type MobileAuthReplayStore = Map<string, number>;

export interface MobileAuthHandoffPayload {
  accessToken: string;
  refreshToken: string;
  sessionExpiresAt: number | null;
  nonceHash: string;
  expiresAt: number;
}

function getHandoffKey() {
  if (!MOBILE_AUTH_HANDOFF_SECRET) {
    throw new Error('Mobile auth handoff secret is not configured');
  }

  return crypto
    .createHash('sha256')
    .update(MOBILE_AUTH_HANDOFF_SECRET)
    .digest();
}

function getReplayStore(): MobileAuthReplayStore {
  const globalScope = globalThis as typeof globalThis & {
    [replayStoreKey]?: MobileAuthReplayStore;
  };

  if (!globalScope[replayStoreKey]) {
    globalScope[replayStoreKey] = new Map<string, number>();
  }

  return globalScope[replayStoreKey];
}

function hashHandoffValue(handoff: string): string {
  return crypto.createHash('sha256').update(handoff).digest('hex');
}

export function isValidMobileAuthNonce(nonce: string | null | undefined): nonce is string {
  return typeof nonce === 'string' && NONCE_PATTERN.test(nonce);
}

export function hashMobileAuthNonce(nonce: string): string {
  return crypto
    .createHash('sha256')
    .update(nonce)
    .digest('hex');
}

export function createMobileAuthHandoff(
  payload: Omit<MobileAuthHandoffPayload, 'expiresAt'>
): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, getHandoffKey(), iv);
  const plaintext = JSON.stringify({
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + HANDOFF_TTL_SECONDS,
  } satisfies MobileAuthHandoffPayload);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString('base64url');
}

export function parseMobileAuthHandoff(handoff: string): MobileAuthHandoffPayload {
  const raw = Buffer.from(handoff, 'base64url');
  if (raw.length <= 28) {
    throw new Error('Invalid mobile auth handoff');
  }

  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);

  const decipher = crypto.createDecipheriv(AES_ALGORITHM, getHandoffKey(), iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
  const parsed = JSON.parse(plaintext) as Partial<MobileAuthHandoffPayload>;

  if (
    typeof parsed.accessToken !== 'string' ||
    typeof parsed.refreshToken !== 'string' ||
    typeof parsed.nonceHash !== 'string' ||
    typeof parsed.expiresAt !== 'number' ||
    (parsed.sessionExpiresAt !== null && typeof parsed.sessionExpiresAt !== 'number')
  ) {
    throw new Error('Invalid mobile auth handoff payload');
  }

  return {
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    sessionExpiresAt: parsed.sessionExpiresAt ?? null,
    nonceHash: parsed.nonceHash,
    expiresAt: parsed.expiresAt,
  };
}

export function isExpiredMobileAuthHandoff(payload: MobileAuthHandoffPayload): boolean {
  return payload.expiresAt <= Math.floor(Date.now() / 1000);
}

export function consumeMobileAuthHandoff(handoff: string, expiresAt: number): boolean {
  const replayStore = getReplayStore();
  const now = Math.floor(Date.now() / 1000);

  for (const [key, expiry] of replayStore.entries()) {
    if (expiry <= now) {
      replayStore.delete(key);
    }
  }

  const handoffHash = hashHandoffValue(handoff);
  if (replayStore.has(handoffHash)) {
    return false;
  }

  replayStore.set(handoffHash, expiresAt);
  return true;
}

export function matchesMobileAuthNonceHash(
  expectedHash: string,
  nonce: string
): boolean {
  const actualHash = hashMobileAuthNonce(nonce);
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');

  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}
