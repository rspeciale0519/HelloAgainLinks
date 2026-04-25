'use client';

import { useCallback, useState } from 'react';
import { authFetch } from './auth-fetch';
import type { TagInfo } from '@/components/TagPopover';
import type { RawBookmark } from './use-bookmarks-data';

export interface UseBookmarkMutationsArgs {
  allTags: TagInfo[];
  setRawBookmarks: React.Dispatch<React.SetStateAction<RawBookmark[]>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  setUnclassifiedCount: (n: number) => void;
  refetch: () => Promise<void>;
}

export interface UseBookmarkMutationsState {
  classifying: boolean;
  classify: () => Promise<void>;
  remove: (bookmarkId: string, xPostId: string) => Promise<void>;
  toggleTag: (bookmarkId: string, tagId: string, add: boolean) => Promise<void>;
}

/**
 * Co-locates the bookmark write operations (classify, delete, tag toggle)
 * with their optimistic updates so the route component stays small.
 */
export function useBookmarkMutations(args: UseBookmarkMutationsArgs): UseBookmarkMutationsState {
  const { allTags, setRawBookmarks, setTotal, setUnclassifiedCount, refetch } = args;
  const [classifying, setClassifying] = useState(false);

  const classify = useCallback(async () => {
    setClassifying(true);
    const res = await authFetch('/api/bookmarks/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    });
    if (res?.ok) {
      const body = (await res.json()) as { remaining?: number };
      setUnclassifiedCount(body.remaining ?? 0);
      refetch();
    }
    setClassifying(false);
  }, [refetch, setUnclassifiedCount]);

  const remove = useCallback(
    async (bookmarkId: string, xPostId: string) => {
      const res = await authFetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });
      if (!res?.ok) return;
      setRawBookmarks((prev) => prev.filter((bm) => bm.id !== bookmarkId));
      setTotal((prev) => prev - 1);
      const extensionId = localStorage.getItem('hal_extension_id');
      if (extensionId) {
        const w = window as unknown as {
          chrome?: { runtime?: { sendMessage?: (id: string, msg: unknown) => void } };
        };
        try {
          w.chrome?.runtime?.sendMessage?.(extensionId, {
            type: 'BOOKMARK_DELETED',
            postId: xPostId,
          });
        } catch {
          /* extension not installed */
        }
      }
    },
    [setRawBookmarks, setTotal],
  );

  const toggleTag = useCallback(
    async (bookmarkId: string, tagId: string, add: boolean) => {
      const tagInfo = allTags.find((t) => t.id === tagId);
      if (!tagInfo) return;
      // Optimistic update
      setRawBookmarks((prev) =>
        prev.map((bm) => {
          if (bm.id !== bookmarkId) return bm;
          const current = bm.bookmark_tags ?? [];
          if (add) {
            if (current.some((bt) => bt.tag_id === tagId)) return bm;
            return { ...bm, bookmark_tags: [...current, { tag_id: tagId, tags: tagInfo }] };
          }
          return { ...bm, bookmark_tags: current.filter((bt) => bt.tag_id !== tagId) };
        }),
      );

      try {
        const res = add
          ? await authFetch(`/api/bookmarks/${bookmarkId}/tags`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tag_ids: [tagId] }),
            })
          : await authFetch(`/api/bookmarks/${bookmarkId}/tags/${tagId}`, { method: 'DELETE' });
        if (!res?.ok) throw new Error('tag toggle failed');
      } catch {
        refetch();
      }
    },
    [allTags, refetch, setRawBookmarks],
  );

  return { classifying, classify, remove, toggleTag };
}
