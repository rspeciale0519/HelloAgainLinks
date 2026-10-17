import { describe, expect, it } from 'vitest';
import { isValidXQueryId, sanitizeXFeatures } from './x-query-id';

describe('x queryId validation', () => {
  it('accepts GraphQL query ids and rejects poison payloads', () => {
    expect(isValidXQueryId('AbCdEfGhIjKlMnOp')).toBe(true);
    expect(isValidXQueryId('https://evil.example/steal')).toBe(false);
    expect(isValidXQueryId('../../etc/passwd')).toBe(false);
    expect(isValidXQueryId('<script>')).toBe(false);
    expect(isValidXQueryId('short')).toBe(false);
  });

  it('caps features length', () => {
    expect(sanitizeXFeatures('a'.repeat(5000)).length).toBe(4000);
  });
});
