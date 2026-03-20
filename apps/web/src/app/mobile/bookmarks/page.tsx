'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

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
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const touchStartX = useRef(0);

  const fetchBookmarks = useCallback(async (pageNum: number, reset = false) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const h = { Authorization: `Bearer ${session.access_token}` };

    const params = new URLSearchParams({
      pageSize: String(PAGE_SIZE),
      page: String(pageNum),
      sort: 'bookmarked_at',
      order: 'desc',
    });
    if (search) params.set('q', search);
    if (activeTag) params.set('tag', activeTag);

    const res = await fetch(`/api/bookmarks?${params}`, { headers: h });
    if (!res.ok) return;
    const data = await res.json();
    const items: Bookmark[] = data.data || [];
    setBookmarks(prev => reset ? items : [...prev, ...items]);
    setHasMore(items.length === PAGE_SIZE);
    setLoading(false);
  }, [search, activeTag]);

  // Initial load of tags
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const res = await fetch('/api/tags', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        const d = await res.json();
        setTags((d.tags || d || []).slice(0, 12));
      }
    });
  }, []);

  // Reload on filter change
  useEffect(() => {
    setPage(0);
    setLoading(true);
    fetchBookmarks(0, true);
  }, [fetchBookmarks]);

  const deleteBookmark = async (id: string, xPostId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch(`/api/bookmarks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}`, 'x-post-id': xPostId },
    });
    setBookmarks(prev => prev.filter(b => b.id !== id));
    setSwipedId(null);
  };

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 60) return `${Math.max(1,m)}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
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
          const r = parseInt(tag.color.slice(1,3),16), g = parseInt(tag.color.slice(3,5),16), b = parseInt(tag.color.slice(5,7),16);
          const isActive = activeTag === tag.id;
          return (
            <button
              key={tag.id}
              onClick={() => setActiveTag(isActive ? null : tag.id)}
              style={{
                borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 500,
                border: `1px solid rgba(${r},${g},${b},${isActive ? 0.4 : 0.15})`,
                background: isActive ? `rgba(${r},${g},${b},0.1)` : 'rgba(255,255,255,0.03)',
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
                  <span style={{ fontSize: 11, color: '#4a4a5a', marginLeft: 'auto' }}>{timeAgo(bm.bookmarked_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#8a8a9a', lineHeight: 1.5 }}>
                  {bm.content_text.length > 180 ? bm.content_text.slice(0, 180) + '…' : bm.content_text}
                </div>
                {(bm.bookmark_tags?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    {bm.bookmark_tags!.slice(0, 4).map((bt) => {
                      const c = bt.tags.color;
                      const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
                      return (
                        <span key={bt.tag_id} style={{
                          borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 500,
                          background: `rgba(${r},${g},${b},0.1)`, border: `1px solid rgba(${r},${g},${b},0.22)`, color: c,
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
