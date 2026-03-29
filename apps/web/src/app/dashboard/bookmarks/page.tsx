'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { ImpactStyle } from '@capacitor/haptics';
import { authFetch } from '@/lib/auth-fetch';
import { isNativeApp, triggerHaptic } from '@/lib/mobile';
import BookmarkCard, { type BookmarkWithTags, type BookmarkTag, type TagInfo } from '@/components/BookmarkCard';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkWithTags[]>([]);
  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const pageSize = 20;

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sort: 'bookmarked_at',
      order: 'desc',
    });
    if (debouncedSearch) params.set('q', debouncedSearch);

    const res = await authFetch(`/api/bookmarks?${params}`);

    if (res?.ok) {
      const data = await res.json();
      setBookmarks(data.data || []);
      setTotal(data.count || 0);
    }
    setLoading(false);
  }, [page, debouncedSearch]);

  const fetchTags = useCallback(async () => {
    const res = await authFetch('/api/tags');
    if (res?.ok) {
      const data = await res.json();
      const tags = data.tags || data || [];
      setAllTags(tags.map((t: TagInfo & Record<string, unknown>) => ({ id: t.id, name: t.name, color: t.color })));
    }
  }, []);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

  // Live updates from the extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== 'hal-extension') return;
      if (event.data.type === 'HAL_BOOKMARK_ADDED') {
        fetchBookmarks();
      } else if (event.data.type === 'HAL_BOOKMARK_DELETED') {
        setBookmarks((prev) => prev.filter((bm) => bm.x_post_id !== event.data.postId));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [fetchBookmarks]);

  const handleTagsChanged = useCallback((bookmarkId: string, tags: BookmarkTag[]) => {
    setBookmarks((prev) =>
      prev.map((bm) => bm.id === bookmarkId ? { ...bm, bookmark_tags: tags } : bm)
    );
  }, []);

  const handleDelete = useCallback(async (bookmarkId: string, xPostId: string) => {
    const res = await authFetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' });
    if (res?.ok) {
      setBookmarks((prev) => prev.filter((bm) => bm.id !== bookmarkId));
      setTotal((prev) => prev - 1);
      // Notify extension to deactivate HAL button on any open X tabs
      const extensionId = localStorage.getItem('hal_extension_id');
      if (extensionId) {
        const w = window as unknown as { chrome?: { runtime?: { sendMessage?: (id: string, msg: unknown) => void } } };
        try { w.chrome?.runtime?.sendMessage?.(extensionId, { type: 'BOOKMARK_DELETED', postId: xPostId }); } catch { /* not installed */ }
      }
    }
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isNativeApp() || window.scrollY > 0) return;
    setTouchStartY(e.touches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isNativeApp() || touchStartY === null) return;
    const distance = e.touches[0].clientY - touchStartY;
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
    setTouchStartY(null);
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>
          Bookmarks
        </h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          {total > 0 ? `${total} bookmarks saved` : 'Your saved X bookmarks will appear here.'}
        </p>
      </div>

      {isNativeApp() && isPulling && (
        <div style={{ color: '#8a8a9a', fontSize: '12px', marginBottom: '10px' }}>
          {pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Search bookmarks..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.15)',
            background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5',
            fontSize: '14px',
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
          }}
        />
      </div>

      {/* Bookmarks list */}
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : bookmarks.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass glow-border"
          style={{ padding: '48px', borderRadius: '14px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔖</div>
          <div style={{ fontSize: '18px', color: '#f0f0f5', fontWeight: 600, marginBottom: '8px' }}>
            {search ? 'No bookmarks match your search' : 'No bookmarks yet'}
          </div>
          <div style={{ fontSize: '14px', color: '#8a8a9a' }}>
            {search ? 'Try a different search term.' : 'Install the Chrome extension and save posts from X.'}
          </div>
        </motion.div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bookmarks.map((bm, i) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                index={i}
                allTags={allTags}
                onTagsChanged={handleTagsChanged}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
              <button
                onClick={async () => { await triggerHaptic(ImpactStyle.Light); setPage(p => Math.max(1, p - 1)); }}
                disabled={page === 1}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.15)',
                  background: 'transparent', color: page === 1 ? '#4a4a5a' : '#00d4ff',
                  cursor: page === 1 ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '13px',
                }}
              >
                ← Prev
              </button>
              <span style={{ padding: '8px 14px', color: '#8a8a9a', fontSize: '13px' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={async () => { await triggerHaptic(ImpactStyle.Light); setPage(p => Math.min(totalPages, p + 1)); }}
                disabled={page === totalPages}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(0,212,255,0.15)',
                  background: 'transparent', color: page === totalPages ? '#4a4a5a' : '#00d4ff',
                  cursor: page === totalPages ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '13px',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
