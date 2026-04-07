const SEARCH_TERM_MAX_LENGTH = 100;
const UNSAFE_POSTGREST_SEARCH_CHARS = /[^\p{L}\p{N}\s@#'’_-]+/gu;

export function sanitizePostgrestSearchTerm(input: string): string {
  return input
    .replace(UNSAFE_POSTGREST_SEARCH_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_TERM_MAX_LENGTH);
}
