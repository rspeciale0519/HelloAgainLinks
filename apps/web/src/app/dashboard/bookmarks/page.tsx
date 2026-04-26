'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ImpactStyle } from '@capacitor/haptics';

import {
  ClassificationBanner,
  Feed,
  SignalRail,
  type CardBookmark,
  type CitationBookmark,
} from '@helloagain/ui-hal';

import { isNativeApp, triggerHaptic } from '@/lib/mobile';
import { useSyncTime } from '@/lib/use-sync-time';
import { useTweaks } from '@/lib/use-tweaks';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';
import { useBookmarksData, type RawBookmark } from '@/lib/use-bookmarks-data';
import { useBookmarkMutations } from '@/lib/use-bookmark-mutations';
import { authFetch } from '@/lib/auth-fetch';

import { DeleteConfirmModal } from '@/components/hal/DeleteConfirmModal';
import { TagPopoverAnchored, type TagAnchorRect } from '@/components/hal/TagPopoverAnchored';
import { HalSearchBar, PullIndicator } from '@/components/hal/HalSearchBar';

import { useBookmarkSidebar, ALL_FOLDER_ID } from '../bookmark-context';

const MOBILE_BREAKPOINT = 768;
const PAGE_SIZE = 20;

function toCardBookmark(b: RawBookmark): CardBookmark {
  return {
    id: b.id,
    x_post_id: b.x_post_id,
    x_author_handle: b.x_author_handle,
    x_author_name: b.x_author_name,
    content_text: b.content_text,
    media_urls: b.media_urls ?? [],
    bookmarked_at: b.bookmarked_at,
    post_created_at: b.post_created_at ?? null,
    bookmark_tags: b.bookmark_tags ?? [],
    ai_summary: b.ai_summary ?? null,
    ai_tags: b.ai_tags ?? null,
    folder_id: b.folder_id ?? null,
  };
}

interface TagAnchor {
  bookmarkId: string;
  rect: TagAnchorRect;
}

export default function BookmarksPage() {
  const [tweaks, setTweaks] = useTweaks();
  const sidebar = useBookmarkSidebar();

  // ---- Search (debounced) + paging ----
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  // "Pin to feed" mode — populated by AskTab's "VIEW N IN FEED" pill. When
  // non-null, the feed shows exactly these bookmarks (cited by the AI in a
  // chat message) until the user clears it. Any of: typing in search,
  // picking a folder, or toggling a tag also clears pinning so the user's
  // intent always wins.
  const [pinnedIds, setPinnedIds] = useState<string[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const folderFilter =
    sidebar.activeFolder && sidebar.activeFolder !== ALL_FOLDER_ID ? sidebar.activeFolder : undefined;

  const data = useBookmarksData({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    folderId: folderFilter,
    idsFilter: pinnedIds,
  });
  const {
    rawBookmarks,
    setRawBookmarks,
    total,
    setTotal,
    loading,
    allTags,
    unclassifiedCount,
    setUnclassifiedCount,
    userPlan,
    refetch: fetchBookmarks,
  } = data;

  // Push fetched tags into the layout-level sidebar context so the
  // sidebar's Subjects section renders real tags. Destructure the
  // useState setter (stable reference) so this effect doesn't see the
  // whole `sidebar` context object — including it would loop forever
  // because the context value reference changes whenever any state
  // inside the provider updates.
  const { setTags: setSidebarTags } = sidebar;
  useEffect(() => {
    setSidebarTags(allTags.map((t) => ({ id: t.id, name: t.name })));
  }, [allTags, setSidebarTags]);

  // While pinning is active, picking a folder or tag in the sidebar should
  // exit pinning and apply the filter normally. handlePinCitations resets
  // folder to ALL and tags to [] before setting pinnedIds, so this effect
  // only fires when the user explicitly changes the filter.
  useEffect(() => {
    if (!pinnedIds) return;
    if (sidebar.activeFolder !== ALL_FOLDER_ID || sidebar.activeTags.length > 0) {
      setPinnedIds(null);
    }
  }, [pinnedIds, sidebar.activeFolder, sidebar.activeTags]);

  const mutations = useBookmarkMutations({
    allTags,
    setRawBookmarks,
    setTotal,
    setUnclassifiedCount,
    refetch: fetchBookmarks,
  });

  // ---- Page-local UI state ----
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [signalOpen, setSignalOpen] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; xPostId: string } | null>(null);
  const [tagAnchor, setTagAnchor] = useState<TagAnchor | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // ---- Pull-to-refresh ----
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Live updates from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== 'hal-extension') return;
      if (event.data.type === 'HAL_BOOKMARK_ADDED') {
        fetchBookmarks();
      } else if (event.data.type === 'HAL_BOOKMARK_DELETED') {
        setRawBookmarks((prev) => prev.filter((bm) => bm.x_post_id !== event.data.postId));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchBookmarks, setRawBookmarks, setTotal]);

  const handleTagClickFromCard = useCallback(
    (tagName: string) => {
      const tag = allTags.find((t) => t.name === tagName);
      if (!tag) return;
      setPinnedIds(null);
      sidebar.setActiveTags((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
    },
    [allTags, sidebar],
  );

  const handleOpenTagEditor = useCallback((bookmarkId: string, anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect();
    setTagAnchor({
      bookmarkId,
      rect: { top: r.top, left: r.left, right: r.right, bottom: r.bottom },
    });
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleClearFilters = useCallback(() => {
    sidebar.setActiveFolder(ALL_FOLDER_ID);
    sidebar.setActiveTags([]);
    setPinnedIds(null);
    setPage(1);
  }, [sidebar]);

  const handleClearPinned = useCallback(() => {
    setPinnedIds(null);
    setPage(1);
  }, []);

  // Pin a set of bookmark ids into the feed. Called when the AI chat surface's
  // "VIEW N IN FEED" pill is clicked. We also reset folder/tag filters and
  // search so the pinned set isn't accidentally re-filtered to nothing.
  const handlePinCitations = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      sidebar.setActiveFolder(ALL_FOLDER_ID);
      sidebar.setActiveTags([]);
      setSearch('');
      setDebouncedSearch('');
      setPage(1);
      setPinnedIds(ids);
      // On mobile the feed lives below the rail; on desktop the sidebar may
      // be in the user's peripheral vision but the feed is the focus.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [sidebar],
  );

  // ---- Filtering (client-side tag filter for Phase 2) ----
  const filtered = useMemo(() => {
    if (sidebar.activeTags.length === 0) return rawBookmarks;
    const tagNames = new Set(
      sidebar.activeTags.map((id) => allTags.find((t) => t.id === id)?.name).filter(Boolean) as string[],
    );
    return rawBookmarks.filter((bm) => {
      const own = (bm.bookmark_tags ?? []).map((bt) => bt.tags.name);
      const ai = (bm.ai_tags ?? []).map((t) => t.label);
      return own.some((n) => tagNames.has(n)) || ai.some((n) => tagNames.has(n));
    });
  }, [rawBookmarks, sidebar.activeTags, allTags]);

  const cardBookmarks = useMemo(() => filtered.map(toCardBookmark), [filtered]);
  // Lookup map for citation chips and Related-tab rows. Citation chips only
  // render for ids the page actually knows about, so missing entries are
  // silently dropped rather than shown as a broken link.
  const bookmarkLookup = useMemo<Record<string, CitationBookmark>>(() => {
    const out: Record<string, CitationBookmark> = {};
    for (const bm of rawBookmarks) {
      out[bm.id] = {
        id: bm.id,
        x_post_id: bm.x_post_id,
        x_author_handle: bm.x_author_handle,
        content_text: bm.content_text,
      };
    }
    return out;
  }, [rawBookmarks]);
  const folderName = useMemo(() => {
    if (pinnedIds) return 'Cited bookmarks';
    return sidebar.folders.find((f) => f.id === sidebar.activeFolder)?.name ?? 'Archive';
  }, [pinnedIds, sidebar.folders, sidebar.activeFolder]);
  const filterCount = pinnedIds
    ? 0
    : sidebar.activeTags.length + (sidebar.activeFolder !== ALL_FOLDER_ID ? 1 : 0);
  const pinnedCount = pinnedIds?.length ?? 0;

  const { label: syncLabel } = useSyncTime();

  useKeyboardShortcuts({
    onPalette: () => {
      /* TODO Phase 5: command palette */
    },
    onSignal: () => setSignalOpen((v) => !v),
    onEscape: () => {
      if (confirmDelete) setConfirmDelete(null);
      else if (tagAnchor) setTagAnchor(null);
      else if (selectionMode) {
        setSelectionMode(false);
        setSelectedIds([]);
      }
    },
  });

  // ---- Pull to refresh (mobile) ----
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isNativeApp() || window.scrollY > 0) return;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isNativeApp() || touchStartY.current === null) return;
    const distance = e.touches[0].clientY - touchStartY.current;
    if (distance > 0 && window.scrollY === 0) {
      setIsPulling(true);
      setPullDistance(Math.min(80, distance));
    }
  };
  const onTouchEnd = async () => {
    if (isPulling && pullDistance > 60) {
      await triggerHaptic(ImpactStyle.Medium);
      await fetchBookmarks();
    }
    touchStartY.current = null;
    setIsPulling(false);
    setPullDistance(0);
  };

  const layout = tweaks.layout;
  const showSignalRail = !isMobile && layout === '3pane' && signalOpen;

  const tagPopoverContent = (() => {
    if (!tagAnchor) return null;
    const bm = rawBookmarks.find((b) => b.id === tagAnchor.bookmarkId);
    if (!bm) return null;
    const activeTagIds = new Set((bm.bookmark_tags ?? []).map((bt) => bt.tag_id));
    return (
      <TagPopoverAnchored
        rect={tagAnchor.rect}
        allTags={allTags}
        activeTagIds={activeTagIds}
        onToggle={(tagId, add) => mutations.toggleTag(bm.id, tagId, add)}
        onClose={() => setTagAnchor(null)}
      />
    );
  })();

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <PullIndicator visible={isNativeApp() && isPulling} pullDistance={pullDistance} />
      <HalSearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
          if (v) setPinnedIds(null);
        }}
      />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <Feed
          bookmarks={cardBookmarks}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          loading={loading}
          onPageChange={async (p) => {
            await triggerHaptic(ImpactStyle.Light);
            setPage(p);
          }}
          folderName={folderName}
          filterCount={filterCount}
          onClearFilters={handleClearFilters}
          pinnedCount={pinnedCount}
          onClearPinned={handleClearPinned}
          density={tweaks.density}
          onDensityChange={(d) => setTweaks((prev) => ({ ...prev, density: d }))}
          selectionMode={selectionMode}
          onToggleSelectionMode={() => {
            setSelectionMode((v) => !v);
            if (selectionMode) setSelectedIds([]);
          }}
          layout={layout}
          signalOpen={signalOpen}
          onToggleSignal={() => setSignalOpen((v) => !v)}
          syncLabel={syncLabel}
          onSelect={handleSelect}
          onOpen={() => {
            /* TODO Phase 5: Spread modal */
          }}
          onTagClick={handleTagClickFromCard}
          onDelete={(id, xPostId) => setConfirmDelete({ id, xPostId })}
          onOpenTagEditor={handleOpenTagEditor}
          selectedIds={selectedIds}
          emptyLabel={search ? 'No matches.' : 'No bookmarks yet.'}
          classificationBanner={
            unclassifiedCount > 0 && userPlan !== 'free' ? (
              <ClassificationBanner
                unclassifiedCount={unclassifiedCount}
                classifying={mutations.classifying}
                onClassify={mutations.classify}
              />
            ) : null
          }
        />

        {showSignalRail && (
          <SignalRail
            isProUser={userPlan !== 'free'}
            totalBookmarks={total}
            activeBookmarkId={null /* TODO Phase 5: wire from Spread modal selection */}
            onJumpTo={(id) => {
              // TODO Phase 5: open Spread modal for this bookmark.
              if (process.env.NODE_ENV !== 'production') {
                console.info('[SignalRail] onJumpTo (Phase 5 stub):', id);
              }
            }}
            onPinCitations={handlePinCitations}
            bookmarkLookup={bookmarkLookup}
            authFetch={authFetch}
            onClose={() => setSignalOpen(false)}
          />
        )}
      </div>

      {tagPopoverContent}

      <DeleteConfirmModal
        open={confirmDelete !== null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) return;
          const target = confirmDelete;
          setConfirmDelete(null);
          mutations.remove(target.id, target.xPostId);
        }}
      />
    </div>
  );
}
