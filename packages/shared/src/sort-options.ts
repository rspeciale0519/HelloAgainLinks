/**
 * The sort choices offered in the UI, shared so web and mobile can't drift.
 *
 * Note "Recently saved" leans on bookmarked_at, which is only a true save time
 * for single saves — bulk ingest stamps a batch cursor. The list endpoint adds
 * post_created_at as a tiebreaker so the result is always deterministic.
 */
export type BookmarkSortKey = 'bookmarked_at' | 'post_created_at' | 'created_at';
export type BookmarkSortOrder = 'asc' | 'desc';

export interface BookmarkSortOption {
  id: string;
  /** Shown in the UI. Sentence case — these are choices, not labels. */
  label: string;
  sort: BookmarkSortKey;
  order: BookmarkSortOrder;
}

export const BOOKMARK_SORT_OPTIONS: readonly BookmarkSortOption[] = [
  { id: 'saved_desc', label: 'Recently saved', sort: 'bookmarked_at', order: 'desc' },
  { id: 'posted_desc', label: 'Recently posted', sort: 'post_created_at', order: 'desc' },
  { id: 'saved_asc', label: 'Oldest first', sort: 'bookmarked_at', order: 'asc' },
] as const;

export const DEFAULT_BOOKMARK_SORT = BOOKMARK_SORT_OPTIONS[0];

export function bookmarkSortById(id: string | null | undefined): BookmarkSortOption {
  return BOOKMARK_SORT_OPTIONS.find((o) => o.id === id) ?? DEFAULT_BOOKMARK_SORT;
}
