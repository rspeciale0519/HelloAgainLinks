'use client';

import { useCallback, useEffect, useState } from 'react';
import { authFetch } from './auth-fetch';
import type { TagInfo } from '@/components/TagPopover';

export interface RawBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  x_author_avatar_url?: string | null;
  content_text: string;
  media_urls: string[] | null;
  bookmarked_at: string;
  post_created_at?: string | null;
  bookmark_tags?: Array<{ tag_id: string; tags: TagInfo }>;
  ai_summary?: string | null;
  ai_tags?: Array<{ label: string; confidence: number }> | null;
  folder_id?: string | null;
  user_notes?: string | null;
}

export interface UseBookmarksDataOptions {
  page: number;
  pageSize: number;
  search: string;
  /**
   * Optional folder filter. When set, only bookmarks with this folder_id are
   * returned. The HAL Index sidebar's "All" virtual folder leaves this
   * undefined so the API returns every bookmark for the user.
   */
  folderId?: string;
  /**
   * Optional explicit id list. When non-null, the hook fetches exactly those
   * bookmarks (preserving order) and ignores page/pageSize/search/folder.
   * Used by the chat surface to pin cited bookmarks into the feed.
   */
  idsFilter?: string[] | null;
}

export interface UseBookmarksDataState {
  rawBookmarks: RawBookmark[];
  setRawBookmarks: React.Dispatch<React.SetStateAction<RawBookmark[]>>;
  total: number;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
  allTags: TagInfo[];
  unclassifiedCount: number;
  setUnclassifiedCount: (n: number) => void;
  userPlan: string;
  refetch: () => Promise<void>;
  refetchTags: () => Promise<void>;
}

/**
 * Encapsulates the existing /api/bookmarks + /api/tags + /api/bookmarks/classify
 * fetch pattern from the legacy bookmarks page so the route component stays
 * within the 450 LOC budget.
 */
export function useBookmarksData(opts: UseBookmarksDataOptions): UseBookmarksDataState {
  const { page, pageSize, search, folderId, idsFilter } = opts;
  // Stable key for idsFilter so the refetch callback doesn't recreate when an
  // array with identical contents is passed in.
  const idsKey = idsFilter ? idsFilter.join(',') : '';

  const [rawBookmarks, setRawBookmarks] = useState<RawBookmark[]>([]);
  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [userPlan, setUserPlan] = useState('free');

  const refetch = useCallback(async () => {
    setLoading(true);
    let res: Response | null;
    if (idsKey) {
      // Pin-to-feed mode: fetch exactly the cited bookmarks, preserving order.
      const params = new URLSearchParams({ ids: idsKey });
      res = await authFetch(`/api/bookmarks?${params}`);
    } else if (search) {
      const params = new URLSearchParams({
        q: search,
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (folderId) params.set('folder_id', folderId);
      res = await authFetch(`/api/bookmarks/search?${params}`);
    } else {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sort: 'bookmarked_at',
        order: 'desc',
      });
      if (folderId) params.set('folder_id', folderId);
      res = await authFetch(`/api/bookmarks?${params}`);
    }
    if (res?.ok) {
      const data = (await res.json()) as { data?: RawBookmark[]; count?: number };
      setRawBookmarks(data.data ?? []);
      setTotal(data.count ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search, folderId, idsKey]);

  const refetchTags = useCallback(async () => {
    const res = await authFetch('/api/tags');
    if (!res?.ok) return;
    const data = (await res.json()) as { tags?: TagInfo[] } | TagInfo[];
    const tags = Array.isArray(data) ? data : data.tags ?? [];
    setAllTags(tags.map((t) => ({ id: t.id, name: t.name, color: t.color })));
  }, []);

  const fetchClassifyInfo = useCallback(async () => {
    const res = await authFetch('/api/bookmarks/classify');
    if (!res?.ok) return;
    const data = (await res.json()) as { unclassified?: number; plan?: string };
    setUnclassifiedCount(data.unclassified ?? 0);
    setUserPlan(data.plan ?? 'free');
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);
  useEffect(() => {
    refetchTags();
  }, [refetchTags]);
  useEffect(() => {
    fetchClassifyInfo();
  }, [fetchClassifyInfo]);

  return {
    rawBookmarks,
    setRawBookmarks,
    total,
    setTotal,
    loading,
    allTags,
    unclassifiedCount,
    setUnclassifiedCount,
    userPlan,
    refetch,
    refetchTags,
  };
}
