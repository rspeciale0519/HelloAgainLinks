'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { ImpactStyle } from '@capacitor/haptics';
import { triggerHaptic } from '@/lib/mobile';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { MobileShareSheet } from '@/components/MobileShareSheet';

const TABS = [
  { id: 'home',      label: 'Home',      icon: '⬡', href: '/mobile/home' },
  { id: 'bookmarks', label: 'Bookmarks', icon: '🔖', href: '/mobile/bookmarks' },
  { id: 'ai',        label: 'AI',        icon: '✨', href: '/mobile/ai' },
  { id: 'blend',     label: 'Blend',     icon: '🔗', href: '/mobile/blend' },
  { id: 'more',      label: 'More',      icon: '···', href: '/mobile/more' },
] as const;

type AppState = 'loading' | 'onboarding' | 'app';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [appState, setAppState] = useState<AppState>('loading');

  // Platform guard + onboarding check + deep-link listener
  useEffect(() => {
    // Redirect web browsers to dashboard
    if (!Capacitor.isNativePlatform()) {
      router.replace('/dashboard');
      return;
    }

    // Deep-link auth callback handler
    const appListenerPromise = App.addListener('appUrlOpen', async ({ url }) => {
      if (url.startsWith('helloagainlinks://auth/callback')) {
        const params = new URL(url).searchParams;
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.setSession({
          access_token: params.get('access_token')!,
          refresh_token: params.get('refresh_token')!,
        });
        if (!error) {
          await Preferences.set({ key: 'onboarding_complete', value: 'true' });
          router.replace('/mobile/home');
          setAppState('app');
        }
      }
    });

    // Check onboarding status
    Preferences.get({ key: 'onboarding_complete' }).then(({ value }) => {
      if (value === 'true') {
        setAppState('app');
      } else {
        setAppState('onboarding');
        if (!pathname.startsWith('/mobile/onboarding')) {
          router.replace('/mobile/onboarding');
        }
      }
    });

    return () => { appListenerPromise.then(handle => handle.remove()); };
  }, [router, pathname]);

  // Splash screen while checking onboarding
  if (appState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: '#0a0a0f',
          boxShadow: '0 0 30px rgba(0,212,255,0.4)',
        }}>H</div>
      </div>
    );
  }

  // Onboarding — no tab bar
  if (appState === 'onboarding' || pathname.startsWith('/mobile/onboarding')) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Inter', sans-serif" }}>
        <MobileShareSheet />
        {children}
      </div>
    );
  }

  // App — with tab bar
  const activeTab = TABS.find(t => pathname.startsWith(t.href))?.id ?? 'home';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <MobileShareSheet />
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex',
        borderTop: '1px solid rgba(0,212,255,0.1)',
        background: 'rgba(10,10,15,0.98)',
        padding: '6px 4px 10px',
        zIndex: 50,
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => triggerHaptic(ImpactStyle.Light)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, textDecoration: 'none',
                padding: '4px 0',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
              <span style={{ fontSize: 9, color: isActive ? '#00d4ff' : '#4a4a5a' }}>
                {tab.label}
              </span>
              {isActive && (
                <div style={{
                  width: 4, height: 4, borderRadius: '50%',
                  background: '#00d4ff',
                  boxShadow: '0 0 6px rgba(0,212,255,0.8)',
                  marginTop: 2,
                }} />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
