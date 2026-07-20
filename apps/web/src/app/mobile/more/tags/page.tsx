'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { hexToRgba } from '@helloagain/shared';

interface Tag { id: string; name: string; color: string; bookmark_count?: number; }

export default function MobileTagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/tags').then(async (res) => {
      if (res?.ok) { const d = await res.json(); setTags(d.tags || d || []); }
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5' }}>Tags</h1>
      </div>
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
      ) : tags.length === 0 ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>No tags yet. Tags are created automatically when you save bookmarks.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {tags.map((tag, i) => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  borderRadius: 100, padding: '8px 16px',
                  background: hexToRgba(tag.color, 0.1),
                  border: `1px solid ${hexToRgba(tag.color, 0.25)}`,
                  color: tag.color, fontSize: 13, fontWeight: 500,
                }}
              >
                {tag.name}{(tag.bookmark_count ?? 0) > 0 && <span style={{ color: hexToRgba(tag.color, 0.6), fontSize: 11 }}> ({tag.bookmark_count})</span>}
              </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
