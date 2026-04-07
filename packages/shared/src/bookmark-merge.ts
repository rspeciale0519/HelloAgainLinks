import type { Bookmark } from './types';

type BookmarkRecord = Partial<Bookmark> & Record<string, unknown>;

/** Score a bookmark record's richness. Higher = more complete. */
export function scoreBookmarkRecord(record: BookmarkRecord): number {
  let score = 0;
  if (record.content_text) score += 2;
  if (record.x_author_handle) score += 1;
  if (record.x_author_name) score += 1;
  if (record.x_author_avatar_url) score += 2;
  if (record.post_created_at) score += 2;
  if (record.bookmarked_at) score += 1;
  if (record.engagement) score += 3;
  if (record.language) score += 1;
  if (record.conversation_id) score += 1;
  if (record.media_urls && (record.media_urls as string[]).length > 0) score += 3;
  return score;
}

/**
 * Merge two bookmark records. The richer record's non-null fields win;
 * the other record fills gaps. Always returns a new object.
 *
 * Inspired by fieldtheory-cli's mergeBookmarkRecord pattern.
 */
export function mergeBookmarkRecords<T extends Record<string, unknown>>(
  existing: T,
  incoming: T,
): T {
  const existingScore = scoreBookmarkRecord(existing);
  const incomingScore = scoreBookmarkRecord(incoming);

  if (incomingScore >= existingScore) {
    return { ...existing, ...stripNulls(incoming) };
  }
  return { ...incoming, ...stripNulls(existing) };
}

/** Remove keys whose values are null, undefined, or empty string. */
function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}
