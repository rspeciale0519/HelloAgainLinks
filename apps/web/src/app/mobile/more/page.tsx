'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { triggerHaptic } from '@/lib/mobile';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { usePlan } from '@/lib/use-plan';

export default function MobileMorePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; handle: string; avatar: string } | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const plan = usePlan(user?.id);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      const meta = session.user.user_metadata || {};
      setUser({
        id: session.user.id,
        name: meta.full_name || meta.name || '',
        handle: meta.preferred_username || meta.user_name || '',
        avatar: meta.avatar_url || '',
      });
    });
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    // Clear the onboarding flag too — otherwise a relaunch sees onboarding
    // complete + no session and strands the user on a sessionless app shell.
    await Preferences.remove({ key: 'onboarding_complete' });
    router.replace('/mobile/onboarding');
  };

  // v1: Upgrade to Pro is intentionally absent — no billing/paywall screen yet.
  // When Pro tier is built, replace the Settings entry with a dedicated /mobile/more/upgrade route.
  const items = [
    { icon: '🏷️', label: 'Tags', href: '/mobile/more/tags' },
    { icon: '📋', label: 'Shared Lists', href: '/mobile/more/lists' },
    { icon: '⚙️', label: 'Settings', href: '/mobile/more/settings' },
  ];

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Profile header */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: user.avatar ? `url(${user.avatar}) center/cover` : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#0a0a0f',
            border: '2px solid rgba(var(--accent-rgb),0.2)',
          }}>
            {!user.avatar && user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5' }}>{user.name}</div>
            <div style={{ fontSize: 12, color: '#4a4a5a' }}>@{user.handle}</div>
            <span style={{
              display: 'inline-block', marginTop: 4,
              borderRadius: 100, padding: '1px 8px', fontSize: 9, fontWeight: 600,
              background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.2)', color: 'var(--accent-cyan)',
            }}>{plan === 'free' ? 'Free' : plan === 'lifetime' ? 'Lifetime' : 'Pro'}</span>
          </div>
        </motion.div>
      )}

      {/* Menu items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item, i) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={async () => { await triggerHaptic(ImpactStyle.Light); router.push(item.href); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(var(--accent-rgb),0.06)',
              cursor: 'pointer', textAlign: 'left',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#f0f0f5', flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: 16, color: '#4a4a5a' }}>›</span>
          </motion.button>
        ))}

        {/* Sign out */}
        {!confirmSignOut ? (
          <button
            onClick={() => setConfirmSignOut(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', borderRadius: 12, marginTop: 8,
              background: 'transparent', border: '1px solid rgba(239,68,68,0.12)',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>↩</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#ef4444', flex: 1, textAlign: 'left' }}>Sign Out</span>
          </button>
        ) : (
          <div style={{
            padding: '16px', borderRadius: 12,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            marginTop: 8,
          }}>
            <div style={{ fontSize: 13, color: '#f0f0f5', marginBottom: 12 }}>Sign out of HAL?</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={signOut} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>Sign Out</button>
              <button onClick={() => setConfirmSignOut(false)} style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'transparent', color: '#8a8a9a',
                fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
