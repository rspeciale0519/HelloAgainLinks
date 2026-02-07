'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; handle: string; avatar: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const meta = session.user.user_metadata || {};
        setUser({
          name: meta.full_name || meta.name || '',
          handle: meta.preferred_username || meta.user_name || '',
          avatar: meta.avatar_url || meta.picture || '',
          email: session.user.email || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleUpgrade = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId: 'pro_monthly' }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  };

  const handleManageBilling = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  };

  if (loading) {
    return <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  const sectionStyle = {
    padding: '24px',
    borderRadius: '14px',
    marginBottom: '20px',
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>Manage your account and subscription.</p>
      </div>

      {/* Profile */}
      <div className="glass glow-border" style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid rgba(0,212,255,0.2)' }} />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '2px solid rgba(0,212,255,0.2)' }} />
          )}
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: '14px', color: '#00d4ff' }}>@{user?.handle || 'unknown'}</div>
            <div style={{ fontSize: '12px', color: '#4a4a5a', marginTop: '2px' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="glass glow-border" style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Subscription</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
            background: 'rgba(0,212,255,0.08)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.15)',
          }}>
            Free Plan
          </span>
        </div>
        <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
          Upgrade to Pro for AI auto-tagging, smart search, unlimited Blends, shared lists, and the AI assistant.
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUpgrade}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Upgrade to Pro — $9.99/mo
          </motion.button>
          <button
            onClick={handleManageBilling}
            style={{
              padding: '10px 24px', borderRadius: '10px',
              border: '1px solid rgba(0,212,255,0.15)', background: 'transparent',
              color: '#8a8a9a', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Manage Billing
          </button>
        </div>
      </div>

      {/* Chrome Extension */}
      <div className="glass glow-border" style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Chrome Extension</h2>
        <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
          Save bookmarks directly from X/Twitter with one click. The extension adds a HAL button to every tweet.
        </div>
        <button
          onClick={() => window.open('https://github.com/rspeciale0519/HelloAgain/tree/main/apps/extension', '_blank')}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.15)', background: 'transparent',
            color: '#00d4ff', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Install Extension →
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass" style={{ ...sectionStyle, border: '1px solid rgba(239,68,68,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444', marginBottom: '16px' }}>Account</h2>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)',
            color: '#ef4444', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
