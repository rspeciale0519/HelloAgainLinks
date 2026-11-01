import { describe, expect, it } from 'vitest';
import { secretsMatch } from './secrets-match';

describe('secretsMatch', () => {
  it('accepts the real cron secret and rejects User A guesses', () => {
    expect(secretsMatch('correct-horse', 'correct-horse')).toBe(true);
    expect(secretsMatch('user-a-guess', 'correct-horse')).toBe(false);
    expect(secretsMatch('', 'correct-horse')).toBe(false);
    expect(secretsMatch(null, 'correct-horse')).toBe(false);
    expect(secretsMatch('a', 'ab')).toBe(false);
  });
});
