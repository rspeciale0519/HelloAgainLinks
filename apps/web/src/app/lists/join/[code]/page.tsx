'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import Link from 'next/link';

interface ListPreview {
  list: { name: string; description: string | null; bookmarkCount: number; memberCount: number };
  owner: { name: string; handle: string; avatar: string | null } | null;
}

export default function JoinListPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [preview, setPreview] = useState<ListPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/shared-lists/join/${code}`).then(async (res) => {
      if (res.ok) setPreview(await res.json());
      else setError('Invite not found or expired.');
      setLoading(false);
    });
  }, [code]);

  const handleJoin = async () => {
    setJoining(true);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?redirect=/lists/join/${code}`);
      return;
    }

    const res = await fetch(`/api/shared-lists/join/${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setSuccess(true);
      setTimeout(() => router.push(`/dashboard/lists`), 1500);
      void data;
    } else {
      const err = await res.json();
      setError(err.error || 'Failed to join');
    }
    setJoining(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a8a9a' }}>
        Loading invite...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass"
        style={{
          padding: '48px', borderRadius: '20px', maxWidth: '440px', width: '100%',
          textAlign: 'center', border: '1px solid rgba(0,212,255,0.1)',
          boxShadow: '0 0 60px rgba(0,212,255,0.08)', position: 'relative', zIndex: 10,
        }}
      >
        {error && !preview ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
            <div style={{ fontSize: '18px', color: '#f0f0f5', fontWeight: 600, marginBottom: '8px' }}>{error}</div>
            <Link href="/" style={{ color: '#00d4ff', fontSize: '14px' }}>Go home</Link>
          </>
        ) : success ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontSize: '18px', color: '#f0f0f5', fontWeight: 600 }}>You&apos;re in!</div>
            <div style={{ color: '#8a8a9a', fontSize: '14px', marginTop: '8px' }}>Redirecting to your lists...</div>
          </>
        ) : preview ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <div style={{ fontSize: '22px', color: '#f0f0f5', fontWeight: 700, marginBottom: '8px' }}>
              {preview.list.name}
            </div>
            {preview.list.description && (
              <div style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '16px', lineHeight: 1.5 }}>
                {preview.list.description}
              </div>
            )}
            {preview.owner && (
              <div style={{ fontSize: '13px', color: '#4a4a5a', marginBottom: '16px' }}>
                Created by <span style={{ color: '#00d4ff' }}>@{preview.owner.handle}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '24px', fontSize: '14px', color: '#8a8a9a' }}>
              <span>📚 {preview.list.bookmarkCount} bookmarks</span>
              <span>👥 {preview.list.memberCount} members</span>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoin}
              disabled={joining}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                opacity: joining ? 0.5 : 1,
              }}
            >
              {joining ? 'Joining...' : 'Join This List'}
            </motion.button>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
