'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { authFetch } from '@/lib/auth-fetch';
import { timeAgo, hexToRgba } from '@helloagain/shared';

interface Tag { id: string; name: string; color: string; }
interface Bookmark {
  id: string; x_post_id: string; x_author_handle: string;
  content_text: string; bookmarked_at: string;
  bookmark_tags?: Array<{ tag_id: string; tags: Tag }>;
}

const PAGE_SIZE = 20;

export default function MobileBookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);
  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookmarks = useCallback(async (pageNum: number, reset = false) => {
    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      page: String(pageNum),
      sort: 'bookmarked_at',
      order: 'desc',
    });
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (activeTag) params.set('tag', activeTag);

    const res = await authFetch(`/api/bookmarks?${params}`);
    if (!res?.ok) { setLoading(false); return; }
    const data = await res.json();
    const items: Bookmark[] = data.data || [];
    setBookmarks(prev => reset ? items : [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    setLoading(false);
  }, [debouncedSearch, activeTag]);

  // Initial load of tags
  useEffect(() => {
    authFetch('/api/tags').then(async (res) => {
      if (!res?.ok) return;
      const d = await res.json();
      setTags((d.tags || d || []).slice(0, 12));
    });
  }, []);

  // Reload on filter change
  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchBookmarks(1, true);
  }, [fetchBookmarks]);

  const deleteBookmark = async (id: string, xPostId: string) => {
    await authFetch(`/api/bookmarks/${id}`, {
      method: 'DELETE',
      headers: { 'x-post-id': xPostId },
    });
    setBookmarks(prev => prev.filter(b => b.id !== id));
    setSwipedId(null);
  };


  return (
    <div style={{ padding: '20px 16px', minHeight: '100%' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 14 }}>Bookmarks</h1>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 12,
      }}>
        <span style={{ fontSize: 14, color: '#4a4a5a' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your bookmarks..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#f0f0f5', fontSize: 14, fontFamily: "'Inter', sans-serif",
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer', fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Tag filter chips */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
        <button
          onClick={() => setActiveTag(null)}
          style={{
            borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 500,
            border: `1px solid ${!activeTag ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            background: !activeTag ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
            color: !activeTag ? '#00d4ff' : '#4a4a5a',
            cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
          }}
        >All</button>
        {tags.map((tag) => {
          const isActive = activeTag === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => setActiveTag(isActive ? null : tag.id)}
              style={{
                borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 500,
                border: `1px solid ${hexToRgba(tag.color, isActive ? 0.4 : 0.15)}`,
                background: isActive ? hexToRgba(tag.color, 0.1) : 'rgba(255,255,255,0.03)',
                color: isActive ? tag.color : '#4a4a5a',
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
              }}
            >{tag.name}</button>
          );
        })}
      </div>

      {/* Bookmark list */}
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
      ) : bookmarks.length === 0 ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>No bookmarks found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bookmarks.map((bm, i) => (
            <div key={bm.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
              {/* Delete action (swipe-left reveal) */}
              {swipedId === bm.id && (
                <button
                  onClick={() => deleteBookmark(bm.id, bm.x_post_id)}
                  style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
                    background: '#ef4444', border: 'none', color: '#fff',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >Delete</button>
              )}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, x: swipedId === bm.id ? -72 : 0 }}
                transition={{ delay: i < 10 ? i * 0.03 : 0 }}
                className="glass glow-border"
                style={{ padding: '14px 16px', borderRadius: 12, position: 'relative' }}
                onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  const dx = touchStartX.current - e.changedTouches[0].clientX;
                  if (dx > 60) setSwipedId(bm.id);
                  else if (dx < -20) setSwipedId(null);
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#00d4ff' }}>@{bm.x_author_handle}</span>
                  <span style={{ fontSize: 11, color: '#4a4a5a', marginLeft: 'auto' }}>{timeAgo(bm.bookmarked_at, { short: true })}</span>
                </div>
                <div style={{ fontSize: 13, color: '#8a8a9a', lineHeight: 1.5 }}>
                  {bm.content_text.length > 180 ? bm.content_text.slice(0, 180) + '…' : bm.content_text}
                </div>
                {(bm.bookmark_tags?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    {bm.bookmark_tags!.slice(0, 4).map((bt) => {
                      const c = bt.tags.color;
                      return (
                        <span key={bt.tag_id} style={{
                          borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 500,
                          background: hexToRgba(c, 0.1), border: `1px solid ${hexToRgba(c, 0.22)}`, color: c,
                        }}>{bt.tags.name}</span>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => { const next = page + 1; setPage(next); fetchBookmarks(next); }}
              style={{
                padding: '12px 0', borderRadius: 12,
                border: '1px solid rgba(0,212,255,0.15)',
                background: 'transparent', color: '#00d4ff',
                fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >Load more</button>
          )}
        </div>
      )}
    </div>
  );
}
