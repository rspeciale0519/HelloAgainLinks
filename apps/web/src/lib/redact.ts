const SENSITIVE_KEY = /(token|secret|password|authorization|cookie|api[_-]?key)/i;

/** Drop credential material before logging third-party JSON. */
export function redactForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length > 8 && SENSITIVE_KEY.test(value)) return '[redacted]';
    return value;
  }
  if (Array.isArray(value)) return value.map(redactForLog);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? '[redacted]' : redactForLog(nested);
    }
    return out;
  }
  return value;
}
