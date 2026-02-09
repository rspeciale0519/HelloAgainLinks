'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { ImpactStyle } from '@capacitor/haptics';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { isNativeApp, triggerHaptic } from '@/lib/mobile';

interface Bookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[];
  bookmarked_at: string;
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const pageSize = 20;

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      sort: 'bookmarked_at',
      order: 'desc',
    });
    if (search) params.set('q', search);

    const res = await fetch(`/api/bookmarks?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setBookmarks(data.data || []);
      setTotal(data.count || 0);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

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
              <motion.a
                key={bm.id}
                href={`https://x.com/${bm.x_author_handle}/status/${bm.x_post_id}`}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass glow-border"
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  display: 'block',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#00d4ff' }}>
                    @{bm.x_author_handle}
                  </span>
                  {bm.x_author_name && (
                    <span style={{ fontSize: '13px', color: '#4a4a5a' }}>{bm.x_author_name}</span>
                  )}
                  <span style={{ fontSize: '12px', color: '#4a4a5a', marginLeft: 'auto' }}>
                    {timeAgo(bm.bookmarked_at)}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#c0c0d0', lineHeight: 1.5 }}>
                  {bm.content_text}
                </div>
              </motion.a>
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
