'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import Link from 'next/link';

interface InvitePreview {
  invite: { code: string; status: string; createdAt: string };
  inviter: { name: string | null; handle: string | null; avatar: string | null } | null;
}

export default function BlendInvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/blends/invite/${code}`).then(async (res) => {
      if (res.ok) setPreview(await res.json());
      else setError('Invite not found or expired.');
      setLoading(false);
    });
  }, [code]);

  const handleAccept = async () => {
    setAccepting(true);
    setError('');
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setAccepting(false);
      router.push(`/login?redirect=/blend/invite/${code}`);
      return;
    }

    const res = await fetch(`/api/blends/invite/${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/blend'), 1500);
    } else {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Failed to accept invite');
    }
    setAccepting(false);
  };

  const pending = preview?.invite.status === 'pending';

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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧬</div>
            <div style={{ fontSize: '18px', color: '#f0f0f5', fontWeight: 600 }}>Blend accepted!</div>
            <div style={{ color: '#8a8a9a', fontSize: '14px', marginTop: '8px' }}>
              Generating your taste analysis... Redirecting.
            </div>
          </>
        ) : preview ? (
          <>
            {preview.inviter?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.inviter.avatar}
                alt=""
                style={{ width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 16px', display: 'block', border: '2px solid rgba(0,212,255,0.3)' }}
              />
            ) : (
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧬</div>
            )}
            <div style={{ fontSize: '22px', color: '#f0f0f5', fontWeight: 700, marginBottom: '8px' }}>
              Bookmark Blend invite
            </div>
            <div style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '16px', lineHeight: 1.5 }}>
              {preview.inviter?.name || preview.inviter?.handle || 'A HelloAgain user'}
              {preview.inviter?.handle && (
                <span style={{ color: '#00d4ff' }}> @{preview.inviter.handle}</span>
              )}{' '}
              wants to compare bookmark tastes with you — shared topics, unique
              interests, and a compatibility score.
            </div>

            {!pending && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px',
                marginBottom: '16px',
              }}>
                This invite has already been {preview.invite.status === 'accepted' ? 'accepted' : 'used'}.
              </div>
            )}

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            {pending ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAccept}
                disabled={accepting}
                style={{
                  width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
                  fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  opacity: accepting ? 0.5 : 1,
                }}
              >
                {accepting ? 'Accepting...' : 'Accept Blend Invite'}
              </motion.button>
            ) : (
              <Link href="/dashboard/blend" style={{ color: '#00d4ff', fontSize: '14px' }}>
                Go to your Blends
              </Link>
            )}
            <div style={{ fontSize: '12px', color: '#7e7e8c', marginTop: '16px' }}>
              New here? Accepting will ask you to sign in with X first.
            </div>
          </>
        ) : null}
      </motion.div>
    </div>
  );
}
