'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';

interface SharedList { id: string; name: string; description?: string; member_count?: number; }

export default function MobileListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/shared-lists').then(async (res) => {
      if (res?.ok) { const d = await res.json(); setLists(d.lists || d || []); }
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5' }}>Shared Lists</h1>
      </div>
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
      ) : lists.length === 0 ? (
        <div className="glass glow-border" style={{ padding: 28, borderRadius: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, color: '#f0f0f5', fontWeight: 600, marginBottom: 6 }}>No shared lists yet</div>
          <div style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.6 }}>Create lists and share them with others from the web app.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lists.map((list, i) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass glow-border"
              style={{ padding: '16px', borderRadius: 12 }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', marginBottom: 4 }}>{list.name}</div>
              {list.description && <div style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.5 }}>{list.description}</div>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
