const SEARCH_TERM_MAX_LENGTH = 100;
const UNSAFE_POSTGREST_SEARCH_CHARS = /[^\p{L}\p{N}\s@#\u2018\u2019_-]+/gu;

export function sanitizePostgrestSearchTerm(input: string): string {
  return input
    .replace(UNSAFE_POSTGREST_SEARCH_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SEARCH_TERM_MAX_LENGTH);
}

const FTS_QUERY_MAX_LENGTH = 200;

/** Sanitize input for websearch_to_tsquery -- allows quotes and hyphens for phrase/negation. */
export function sanitizeFtsQuery(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}\s@#\u2018\u2019"_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, FTS_QUERY_MAX_LENGTH);
}
