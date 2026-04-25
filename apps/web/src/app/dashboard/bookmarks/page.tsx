'use client';

import '@helloagain/ui-hal/styles';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ImpactStyle } from '@capacitor/haptics';

import {
  BackgroundLayers,
  ClassificationBanner,
  Feed,
  Index as IndexSidebar,
  type CardBookmark,
  type SidebarFolder,
  type SidebarTag,
} from '@helloagain/ui-hal';

import { isNativeApp, triggerHaptic } from '@/lib/mobile';
import { useAuth } from '@/lib/use-auth';
import { usePlan } from '@/lib/use-plan';
import { useSyncTime } from '@/lib/use-sync-time';
import { useTweaks } from '@/lib/use-tweaks';
import { useKeyboardShortcuts } from '@/lib/use-keyboard-shortcuts';
import { useBookmarksData, type RawBookmark } from '@/lib/use-bookmarks-data';
import { useBookmarkMutations } from '@/lib/use-bookmark-mutations';

import UserMenu from '@/components/UserMenu';
import { DeleteConfirmModal } from '@/components/hal/DeleteConfirmModal';
import { TagPopoverAnchored, type TagAnchorRect } from '@/components/hal/TagPopoverAnchored';
import { HalMobileBar } from '@/components/hal/HalMobileBar';
import { HalDrawer } from '@/components/hal/HalDrawer';
import { SignalPlaceholder } from '@/components/hal/SignalPlaceholder';
import { HalSearchBar, PullIndicator } from '@/components/hal/HalSearchBar';

const MOBILE_BREAKPOINT = 768;
const PAGE_SIZE = 20;

// Phase 2 placeholder folders. TODO Phase 3: replace with /api/folders.
const PLACEHOLDER_FOLDERS: SidebarFolder[] = [
  { id: 'f_all', name: 'All', icon: 'inbox', count: '?' },
  { id: 'f_unread', name: 'Unread', icon: 'bookmark', count: '?' },
  { id: 'f_brain', name: 'Brain food', icon: 'cpu', count: '?' },
  { id: 'f_design', name: 'Design craft', icon: 'layers', count: '?' },
  { id: 'f_read', name: 'Read later', icon: 'clock', count: '?' },
];

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
  const { user } = useAuth();
  const meta = user?.user_metadata || {};
  const displayName = meta.preferred_username || meta.user_name || 'User';
  const avatarUrl = meta.avatar_url || meta.picture || '';
  const userPlanLive = usePlan(user?.id);

  const [tweaks, setTweaks] = useTweaks();

  // ---- Search (debounced) + paging ----
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const data = useBookmarksData({ page, pageSize: PAGE_SIZE, search: debouncedSearch });
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

  const mutations = useBookmarkMutations({
    allTags,
    setRawBookmarks,
    setTotal,
    setUnclassifiedCount,
    refetch: fetchBookmarks,
  });

  // ---- UI state ----
  const [activeFolder, setActiveFolder] = useState('f_all');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [signalOpen, setSignalOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; xPostId: string } | null>(null);
  const [tagAnchor, setTagAnchor] = useState<TagAnchor | null>(null);

  // ---- Mobile + pull-to-refresh ----
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number | null>(null);

  // Apply data-hal scoping only on this route
  useEffect(() => {
    document.documentElement.setAttribute('data-hal', 'on');
    return () => document.documentElement.removeAttribute('data-hal');
  }, []);

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
      setActiveTags((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
    },
    [allTags],
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
    setActiveFolder('f_all');
    setActiveTags([]);
    setPage(1);
  }, []);

  // ---- Filtering (client-side tag filter for Phase 2) ----
  const filtered = useMemo(() => {
    if (activeTags.length === 0) return rawBookmarks;
    const tagNames = new Set(
      activeTags.map((id) => allTags.find((t) => t.id === id)?.name).filter(Boolean) as string[],
    );
    return rawBookmarks.filter((bm) => {
      const own = (bm.bookmark_tags ?? []).map((bt) => bt.tags.name);
      const ai = (bm.ai_tags ?? []).map((t) => t.label);
      return own.some((n) => tagNames.has(n)) || ai.some((n) => tagNames.has(n));
    });
  }, [rawBookmarks, activeTags, allTags]);

  const cardBookmarks = useMemo(() => filtered.map(toCardBookmark), [filtered]);
  const folderName = useMemo(
    () => PLACEHOLDER_FOLDERS.find((f) => f.id === activeFolder)?.name ?? 'Archive',
    [activeFolder],
  );
  const filterCount = activeTags.length + (activeFolder !== 'f_all' ? 1 : 0);
  const sidebarTags: SidebarTag[] = useMemo(
    () => allTags.map((t) => ({ id: t.id, name: t.name })),
    [allTags],
  );

  const { label: syncLabel } = useSyncTime();

  useKeyboardShortcuts({
    onPalette: () => {
      /* TODO Phase 5: command palette */
    },
    onSignal: () => setSignalOpen((v) => !v),
    onNav: () => setSidebarCollapsed((v) => !v),
    onEscape: () => {
      if (confirmDelete) setConfirmDelete(null);
      else if (tagAnchor) setTagAnchor(null);
      else if (drawerOpen) setDrawerOpen(false);
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

  const sidebarNode = (
    <IndexSidebar
      folders={PLACEHOLDER_FOLDERS}
      activeFolder={activeFolder}
      onSelectFolder={(id) => {
        setActiveFolder(id);
        setPage(1);
        if (isMobile) setDrawerOpen(false);
      }}
      tags={sidebarTags}
      activeTags={activeTags}
      onToggleTag={(id) =>
        setActiveTags((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      }
      onOpenCmd={() => {
        /* TODO Phase 5 */
      }}
      collapsed={sidebarCollapsed && !isMobile}
      onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      userFooter={
        <UserMenu
          avatarUrl={avatarUrl}
          displayName={displayName}
          plan={userPlanLive}
          onNavigate={isMobile ? () => setDrawerOpen(false) : undefined}
        />
      }
    />
  );

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
      <BackgroundLayers />

      {isMobile && <HalMobileBar syncLabel={syncLabel} onOpenDrawer={() => setDrawerOpen(true)} />}
      <PullIndicator visible={isNativeApp() && isPulling} pullDistance={pullDistance} />
      <HalSearchBar
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
      />

      <div
        style={{
          display: 'flex',
          minHeight: 'calc(100vh - 56px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {!isMobile && sidebarNode}

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

        {showSignalRail && <SignalPlaceholder />}
      </div>

      <HalDrawer open={isMobile && drawerOpen} onClose={() => setDrawerOpen(false)}>
        {sidebarNode}
      </HalDrawer>

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
