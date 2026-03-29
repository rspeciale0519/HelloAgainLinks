'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { authFetch } from '@/lib/auth-fetch';
import { timeAgo } from '@helloagain/shared';

interface Bookmark {
  id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  bookmarked_at: string;
}

interface Tag {
  name: string;
  count: number;
}

export default function DashboardPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [tagCount, setTagCount] = useState(0);
  const [topTags, setTopTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; handle: string } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const meta = session.user.user_metadata || {};
      setUser({
        name: meta.full_name || meta.name || '',
        handle: meta.preferred_username || meta.user_name || '',
      });

      // Fetch recent bookmarks
      const bmRes = await authFetch('/api/bookmarks?pageSize=5&sort=bookmarked_at&order=desc');
      if (bmRes?.ok) {
        const data = await bmRes.json();
        setBookmarks(data.data || []);
        setBookmarkCount(data.count ?? data.data?.length ?? 0);
      }

      // Fetch tags
      const tagRes = await authFetch('/api/tags');
      if (tagRes?.ok) {
        const data = await tagRes.json();
        const tags = data.tags || data || [];
        setTagCount(tags.length);
        setTopTags(tags.slice(0, 5).map((t: { name: string; bookmark_count?: number }) => ({ name: t.name, count: t.bookmark_count ?? 0 })));
      }

      setLoading(false);
    }

    load();
  }, []);


  const stats = [
    { label: 'Total Bookmarks', value: bookmarkCount.toLocaleString(), change: loading ? '...' : 'All time' },
    { label: 'Tags', value: tagCount.toString(), change: loading ? '...' : 'Categories' },
    { label: 'Blend Score', value: '—', change: 'Invite a friend!' },
    { label: 'AI Searches', value: '0', change: 'Pro feature' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>
          {user ? `Hey, ${user.name || '@' + user.handle}` : 'Dashboard'}
        </h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          {bookmarkCount > 0
            ? `You have ${bookmarkCount} bookmarks saved.`
            : 'Install the Chrome extension to start saving bookmarks from X.'}
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '40px',
        }}
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass glow-border"
            style={{ padding: '24px', borderRadius: '14px' }}
          >
            <div style={{ fontSize: '13px', color: '#8a8a9a', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f0f0f5', marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#00d4ff' }}>{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Top tags */}
      {topTags.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '12px' }}>
            Your Tags
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {topTags.map((tag) => (
              <span
                key={tag.name}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#00d4ff',
                  background: 'rgba(0,212,255,0.08)',
                  border: '1px solid rgba(0,212,255,0.15)',
                }}
              >
                {tag.name}{tag.count > 0 && ` (${tag.count})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent bookmarks */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>
          Recent Bookmarks
        </h2>
        {loading ? (
          <div style={{ color: '#4a4a5a', padding: '20px', textAlign: 'center' }}>Loading...</div>
        ) : bookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass glow-border"
            style={{ padding: '40px', borderRadius: '14px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
            <div style={{ fontSize: '16px', color: '#f0f0f5', fontWeight: 600, marginBottom: '8px' }}>
              No bookmarks yet
            </div>
            <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6 }}>
              Install the HAL Chrome extension, then browse X/Twitter.<br />
              Click the bookmark icon on any post to save it here.
            </div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookmarks.map((bm, i) => (
              <motion.div
                key={bm.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
                className="glass glow-border"
                style={{
                  padding: '16px 20px',
                  borderRadius: '12px',
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
                <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5 }}>
                  {bm.content_text.length > 200 ? bm.content_text.slice(0, 200) + '...' : bm.content_text}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
