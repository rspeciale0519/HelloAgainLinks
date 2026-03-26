'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Tag { id: string; name: string; color: string; bookmark_count?: number; }

export default function MobileTagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const res = await fetch('/api/tags', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) { const d = await res.json(); setTags(d.tags || d || []); }
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5' }}>Tags</h1>
      </div>
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
      ) : tags.length === 0 ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>No tags yet. Tags are created automatically when you save bookmarks.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {tags.map((tag, i) => {
            const r = parseInt(tag.color.slice(1,3),16), g = parseInt(tag.color.slice(3,5),16), b = parseInt(tag.color.slice(5,7),16);
            return (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  borderRadius: 100, padding: '8px 16px',
                  background: `rgba(${r},${g},${b},0.1)`,
                  border: `1px solid rgba(${r},${g},${b},0.25)`,
                  color: tag.color, fontSize: 13, fontWeight: 500,
                }}
              >
                {tag.name}{(tag.bookmark_count ?? 0) > 0 && <span style={{ color: `rgba(${r},${g},${b},0.6)`, fontSize: 11 }}> ({tag.bookmark_count})</span>}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
