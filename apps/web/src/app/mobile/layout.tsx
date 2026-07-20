'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { ImpactStyle } from '@capacitor/haptics';
import { HalLogo } from '@helloagain/ui';
import { triggerHaptic } from '@/lib/mobile';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAutoSync } from '@/lib/use-auto-sync';
import { MobileShareSheet } from '@/components/MobileShareSheet';

const TABS = [
  { id: 'home',      label: 'Home',      icon: '⬡', href: '/mobile/home' },
  { id: 'bookmarks', label: 'Bookmarks', icon: '🔖', href: '/mobile/bookmarks' },
  { id: 'ai',        label: 'AI',        icon: '✨', href: '/mobile/ai' },
  { id: 'blend',     label: 'Blend',     icon: '🔗', href: '/mobile/blend' },
  { id: 'more',      label: 'More',      icon: '···', href: '/mobile/more' },
] as const;

type AppState = 'loading' | 'onboarding' | 'app';
const MOBILE_AUTH_NONCE_KEY = 'mobile_auth_handoff_nonce';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://helloagainlinks.com';
const MOBILE_AUTH_CALLBACK_URL =
  process.env.NEXT_PUBLIC_MOBILE_AUTH_CALLBACK_URL ||
  `${APP_URL}/auth/mobile-callback`;

function extractHandoffParam(url: string): string | null {
  const parsedUrl = new URL(url);
  const hashParams = new URLSearchParams(parsedUrl.hash.startsWith('#') ? parsedUrl.hash.slice(1) : parsedUrl.hash);
  return hashParams.get('handoff') || parsedUrl.searchParams.get('handoff');
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [appState, setAppState] = useState<AppState>('loading');

  // App-open + resume auto-sync (native only, throttled) — from PR #9.
  useAutoSync();

  // Platform guard + onboarding check + deep-link listener
  useEffect(() => {
    // Redirect web browsers to dashboard
    if (!Capacitor.isNativePlatform()) {
      router.replace('/dashboard');
      return;
    }

    let cancelled = false;

    const completeMobileAuth = async (handoff: string) => {
      const { value: mobileNonce } = await Preferences.get({ key: MOBILE_AUTH_NONCE_KEY });
      if (!mobileNonce) {
        console.error('[Mobile auth] Missing stored mobile auth nonce');
        return false;
      }

      try {
        const response = await fetch(`${APP_URL}/api/auth/mobile-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            handoff,
            nonce: mobileNonce,
          }),
        });

        if (!response.ok) {
          console.error('[Mobile auth] Session exchange failed:', response.status);
          return false;
        }

        const payload = await response.json();
        const supabase = getSupabaseBrowserClient();
        const { error } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });

        if (error) {
          console.error('[Mobile auth] Supabase session setup failed:', error);
          return false;
        }

        await Preferences.set({ key: 'onboarding_complete', value: 'true' });
        if (!cancelled) {
          router.replace('/mobile/home');
          setAppState('app');
        }
        return true;
      } finally {
        await Preferences.remove({ key: MOBILE_AUTH_NONCE_KEY });
      }
    };

    const consumeMobileAuthUrl = async (url: string) => {
      if (
        !url.startsWith('helloagainlinks://auth/callback') &&
        !url.startsWith(MOBILE_AUTH_CALLBACK_URL)
      ) {
        return false;
      }

      const handoff = extractHandoffParam(url);
      if (!handoff) {
        console.error('[Mobile auth] Missing handoff parameter');
        return false;
      }

      return completeMobileAuth(handoff);
    };

    // Deep-link auth callback handler
    const appListenerPromise = App.addListener('appUrlOpen', async ({ url }) => {
      await consumeMobileAuthUrl(url);
    });

    const initializeAppState = async () => {
      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          const handled = await consumeMobileAuthUrl(launchUrl.url);
          if (handled) {
            return;
          }
        }

        const { value } = await Preferences.get({ key: 'onboarding_complete' });
        if (value === 'true') {
          if (!cancelled) {
            setAppState('app');
          }
          return;
        }

        if (!cancelled) {
          setAppState('onboarding');
        }
        if (!cancelled && !pathname.startsWith('/mobile/onboarding')) {
          router.replace('/mobile/onboarding');
        }
      } catch (error) {
        console.error('[Mobile auth] Failed to initialize app state:', error);
      }
    };

    void initializeAppState();

    return () => {
      cancelled = true;
      appListenerPromise.then(handle => handle.remove()).catch(() => {});
    };
  }, [router, pathname]);

  // Splash screen while checking onboarding
  if (appState === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <HalLogo size={56} />
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
