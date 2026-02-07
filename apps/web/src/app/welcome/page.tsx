'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function WelcomePage() {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ status: '', count: 0, message: '', hasMore: false });
  const [user, setUser] = useState<{ name: string; handle: string; avatar: string } | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      const meta = session.user.user_metadata || {};
      setUser({
        name: meta.full_name || meta.name || '',
        handle: meta.preferred_username || meta.user_name || '',
        avatar: meta.avatar_url || meta.picture || '',
      });
    });
  }, [router]);

  const handleImport = async () => {
    setImporting(true);
    setProgress({ status: 'importing', count: 0, message: 'Connecting to X...', hasMore: false });

    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    setProgress({ status: 'importing', count: 0, message: 'Fetching your bookmarks from X...', hasMore: false });

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setProgress({
        status: data.status,
        count: data.imported,
        message: data.message,
        hasMore: data.hasMore || false,
      });

      if (data.status === 'complete') {
        setTimeout(() => router.push('/dashboard'), 2500);
      }
      // Don't auto-redirect on rate_limited — let them click import again or skip
    } else {
      const err = await res.json().catch(() => ({}));
      setProgress({
        status: 'error',
        count: 0,
        message: err.error || 'Import failed. You can try again from Settings.',
        hasMore: false,
      });
    }

    setImporting(false);
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass"
        style={{
          padding: '56px 48px', borderRadius: '24px', maxWidth: '500px', width: '100%',
          textAlign: 'center', border: '1px solid rgba(0,212,255,0.1)',
          boxShadow: '0 0 80px rgba(0,212,255,0.08)', position: 'relative', zIndex: 10,
        }}
      >
        {/* Avatar */}
        {user?.avatar && (
          <motion.img
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            src={user.avatar}
            alt=""
            style={{
              width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px',
              border: '3px solid rgba(0,212,255,0.3)', display: 'block',
              boxShadow: '0 0 30px rgba(0,212,255,0.2)',
            }}
          />
        )}

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: '28px', fontWeight: 700, color: '#f0f0f5', marginBottom: '8px' }}
        >
          Welcome{user?.name ? `, ${user.name}` : ''}! 👋
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{ fontSize: '15px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '32px' }}
        >
          Let&apos;s get your bookmarks into HAL. Want to import everything you&apos;ve already saved on X?
        </motion.p>

        {progress.status ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginBottom: '24px' }}
          >
            {/* Progress indicator */}
            {progress.status === 'importing' && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  width: '100%', height: '4px', borderRadius: '2px',
                  background: 'rgba(0,212,255,0.1)', overflow: 'hidden',
                }}>
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                    style={{
                      width: '40%', height: '100%', borderRadius: '2px',
                      background: 'linear-gradient(90deg, transparent, #00d4ff, transparent)',
                    }}
                  />
                </div>
              </div>
            )}

            {progress.status === 'complete' && (
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            )}

            {progress.status === 'rate_limited' && (
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⏳</div>
            )}

            {progress.status === 'error' && (
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>😕</div>
            )}

            <div style={{
              fontSize: progress.count > 0 ? '32px' : '16px',
              fontWeight: 700,
              color: progress.status === 'error' ? '#ef4444' : '#00d4ff',
              marginBottom: '8px',
            }}>
              {progress.count > 0 ? `${progress.count} bookmarks` : ''}
            </div>

            <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5 }}>
              {progress.message}
            </div>

            {progress.status === 'complete' && (
              <div style={{ fontSize: '13px', color: '#4a4a5a', marginTop: '12px' }}>
                Redirecting to dashboard...
              </div>
            )}

            {progress.status === 'rate_limited' && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleImport}
                  disabled={importing}
                  style={{
                    padding: '12px 28px', borderRadius: '12px', border: 'none',
                    background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
                    fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    opacity: importing ? 0.5 : 1,
                  }}
                >
                  {importing ? '⏳ Importing...' : '📚 Import Next Batch'}
                </motion.button>
                <button
                  onClick={handleSkip}
                  style={{
                    padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(0,212,255,0.1)',
                    background: 'transparent', color: '#8a8a9a', fontSize: '13px',
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Continue to Dashboard (import more later from Settings)
                </button>
              </div>
            )}

            {progress.status === 'error' && (
              <button
                onClick={handleSkip}
                style={{
                  marginTop: '16px', padding: '10px 24px', borderRadius: '10px',
                  border: '1px solid rgba(0,212,255,0.15)', background: 'transparent',
                  color: '#00d4ff', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Continue to Dashboard →
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(0,212,255,0.4)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleImport}
              disabled={importing}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
                background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                marginBottom: '14px', opacity: importing ? 0.5 : 1,
              }}
            >
              📚 Import My X Bookmarks
            </motion.button>

            <button
              onClick={handleSkip}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                border: '1px solid rgba(0,212,255,0.1)', background: 'transparent',
                color: '#8a8a9a', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Skip for now
            </button>

            <div style={{ fontSize: '12px', color: '#4a4a5a', marginTop: '16px', lineHeight: 1.5 }}>
              We&apos;ll read your bookmarks from X and save them here.<br />
              This usually takes less than a minute.
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
