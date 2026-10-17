const QUERY_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
const FEATURES_MAX_LENGTH = 4000;

export function isValidXQueryId(queryId: unknown): queryId is string {
  return typeof queryId === 'string' && QUERY_ID_RE.test(queryId);
}

export function sanitizeXFeatures(features: unknown): string {
  if (typeof features !== 'string') return '';
  return features.slice(0, FEATURES_MAX_LENGTH);
}
