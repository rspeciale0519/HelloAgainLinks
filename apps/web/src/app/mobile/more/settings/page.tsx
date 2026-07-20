'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { authFetch } from '@/lib/auth-fetch';

export default function MobileSettingsPage() {
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setSyncStatus('Last synced: auto-syncing in background');
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    const res = await authFetch('/api/sync/background', { method: 'POST' });
    if (!res) { setSyncStatus('Please sign in again'); setSyncing(false); return; }
    if (!res.ok) { setSyncStatus('Sync failed'); setSyncing(false); return; }
    const data = await res.json().catch(() => null);
    if (data?.xApiError) {
      setSyncStatus(
        data.xApiError.status === 402
          ? 'X API quota reached — add credits to your X developer plan'
          : `X API error (${data.xApiError.status})`
      );
    } else {
      const n = data?.imported ?? 0;
      setSyncStatus(n > 0 ? `Synced ${n} new bookmark${n === 1 ? '' : 's'}` : 'Up to date — no new bookmarks');
    }
    setSyncing(false);
  };

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5' }}>Settings</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Sync section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            Bookmark Sync
          </div>
          <div className="glass glow-border" style={{ padding: '16px', borderRadius: 12 }}>
            <div style={{ fontSize: 13, color: '#8a8a9a', marginBottom: 12 }}>{syncStatus}</div>
            <button
              onClick={triggerSync}
              disabled={syncing}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: syncing ? 'rgba(var(--accent-rgb),0.2)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan))',
                color: syncing ? 'var(--accent-cyan)' : '#0a0a0f', fontSize: 13, fontWeight: 600,
                cursor: syncing ? 'default' : 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >{syncing ? 'Syncing…' : 'Sync Now'}</button>
          </div>
        </div>

        {/* App info */}
        <div>
          <div style={{ fontSize: 11, color: '#4a4a5a', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
            About
          </div>
          <div className="glass glow-border" style={{ padding: '16px', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#8a8a9a' }}>App</span>
              <span style={{ fontSize: 13, color: '#f0f0f5' }}>Hello Again Links</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#8a8a9a' }}>Platform</span>
              <span style={{ fontSize: 13, color: '#f0f0f5' }}>Mobile</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
