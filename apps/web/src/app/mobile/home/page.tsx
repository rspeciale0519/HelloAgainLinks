'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { authFetch } from '@/lib/auth-fetch';
import { timeAgo, hexToRgba } from '@helloagain/shared';

interface Bookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  bookmarked_at: string;
  bookmark_tags?: Array<{ tags: { name: string; color: string } }>;
}

export default function MobileHomePage() {
  const [user, setUser] = useState<{ name: string; handle: string } | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [recent, setRecent] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.user_metadata || {};
      setUser({ name: meta.full_name || '', handle: meta.preferred_username || '' });

      const [bmRes, tagRes] = await Promise.all([
        authFetch('/api/bookmarks?pageSize=5&sort=bookmarked_at&order=desc'),
        authFetch('/api/tags'),
      ]);

      if (bmRes?.ok) {
        const d = await bmRes.json();
        setRecent(d.data || []);
        setBookmarkCount(d.count ?? d.data?.length ?? 0);
      }
      if (tagRes?.ok) {
        const d = await tagRes.json();
        setTagCount((d.tags || d || []).length);
      }
      setLoading(false);
    });
  }, []);


  return (
    <div style={{ padding: '24px 16px', minHeight: '100%' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f5', marginBottom: 2 }}>
          {user ? `Hey, ${user.name || '@' + user.handle} ⬡` : 'Dashboard'}
        </h1>
        <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 20 }}>
          {bookmarkCount > 0 ? `${bookmarkCount} bookmarks saved` : 'No bookmarks yet'}
        </p>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Bookmarks', value: bookmarkCount.toLocaleString(), sub: 'All time' },
            { label: 'Tags', value: tagCount.toString(), sub: 'Categories' },
            { label: 'Blend Score', value: '—', sub: 'Invite a friend!' },
            { label: 'AI Searches', value: '0', sub: 'Ask anything' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass glow-border"
              style={{ padding: '16px 14px', borderRadius: 14 }}
            >
              <div style={{ fontSize: 11, color: '#4a4a5a', marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f5', lineHeight: 1 }}>{loading ? '…' : s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--accent-cyan)', marginTop: 4 }}>{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Recent bookmarks */}
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5', marginBottom: 12 }}>Recent</h2>
        {loading ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 24, fontSize: 13 }}>Loading…</div>
        ) : recent.length === 0 ? (
          <div className="glass glow-border" style={{ padding: 28, borderRadius: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
            <div style={{ fontSize: 14, color: '#f0f0f5', fontWeight: 600, marginBottom: 6 }}>No bookmarks yet</div>
            <div style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.6 }}>
              Share a tweet from X to save your first bookmark.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.map((bm, i) => (
              <motion.div
                key={bm.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="glass glow-border"
                style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer' }}
                onClick={() => window.open(`https://x.com/${bm.x_author_handle}/status/${bm.x_post_id}`, '_system')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-cyan)' }}>@{bm.x_author_handle}</span>
                  <span style={{ fontSize: 11, color: '#4a4a5a', marginLeft: 'auto' }}>{timeAgo(bm.bookmarked_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: '#8a8a9a', lineHeight: 1.5 }}>
                  {bm.content_text.length > 160 ? bm.content_text.slice(0, 160) + '…' : bm.content_text}
                </div>
                {(bm.bookmark_tags?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                    {bm.bookmark_tags!.slice(0, 3).map((bt) => {
                      const c = bt.tags.color;
                      return (
                        <span key={bt.tags.name} style={{
                          borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 500,
                          background: hexToRgba(c, 0.1), border: `1px solid ${hexToRgba(c, 0.22)}`, color: c,
                        }}>{bt.tags.name}</span>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
