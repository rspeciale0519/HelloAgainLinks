# HAL Mobile App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native iOS/Android HAL app with full feature parity using Capacitor + a new `/mobile` Next.js route tree, plus a polished share-sheet overlay so users can save tweets from the X app without leaving it.

**Architecture:** New `apps/web/src/app/mobile/` route tree runs only inside Capacitor (middleware redirects web browsers to `/dashboard`). The static export (`BUILD_TARGET=mobile next build`) bundles only the `/mobile` UI; all API calls hit the live Vercel deployment. The existing auth, API routes, and dashboard are untouched.

**Tech Stack:** Next.js 15, Capacitor v8, @capgo/capacitor-share-target, @capacitor/app, Framer Motion, Supabase JS, Tailwind CSS v4

---

## Chunk 1: Foundation — Config, Build, Auth Plumbing

### File map for this chunk

| Action | File |
|--------|------|
| Modify | `apps/web/capacitor.config.ts` |
| Modify | `apps/web/next.config.ts` |
| Modify | `package.json` (root) |
| Modify | `apps/web/src/middleware.ts` |
| Modify | `apps/web/src/app/api/auth/x-login/route.ts` |
| Modify | `apps/web/src/app/api/auth/x-callback/route.ts` |
| Modify | `apps/web/ios/App/App/Info.plist` |
| Modify | `apps/web/android/app/src/main/AndroidManifest.xml` |
| Create | `archive/MobileShareListener.tsx` |
| Modify | `apps/web/src/app/dashboard/layout.tsx` |

---

### Task 1: Remove `server.url` from Capacitor config

The current config loads the live Vercel URL on every app open. Removing it makes the app load from the local `out/` bundle instead.

**Files:**
- Modify: `apps/web/capacitor.config.ts`

- [ ] **Step 1.1: Edit capacitor.config.ts**

  Open `apps/web/capacitor.config.ts`. Remove the entire `server` block:

  ```typescript
  import type { CapacitorConfig } from '@capacitor/cli';

  const config: CapacitorConfig = {
    appId: 'com.helloagainlinks.app',
    appName: 'Hello Again Links',
    webDir: 'out',
    plugins: {
      CapacitorShareTarget: {
        shareExtensionName: 'ShareExtension',
      },
    },
  };

  export default config;
  ```

- [ ] **Step 1.2: Verify no TypeScript errors**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 1.3: Commit**

  ```bash
  git add apps/web/capacitor.config.ts
  git commit -m "chore: remove server.url override — load from local bundle"
  ```

---

### Task 2: Add conditional `output: 'export'` to Next.js config

Applying `output: 'export'` unconditionally breaks the Vercel deployment (disables API routes). Gate it on a `BUILD_TARGET` env var so only mobile builds get static export.

**Files:**
- Modify: `apps/web/next.config.ts`
- Modify: `package.json` (root)

- [ ] **Step 2.1: Update next.config.ts**

  ```typescript
  import type { NextConfig } from 'next';

  const nextConfig: NextConfig = {
    transpilePackages: ['@helloagain/shared', '@helloagain/ui'],
    output: process.env.BUILD_TARGET === 'mobile' ? 'export' : undefined,
  };

  export default nextConfig;
  ```

- [ ] **Step 2.2: Update root package.json mobile:build script**

  Find the `"mobile:build"` entry in root `package.json` and update it:

  ```json
  "mobile:build": "BUILD_TARGET=mobile pnpm --filter @helloagain/web run build && pnpm --filter @helloagain/web exec cap sync"
  ```

- [ ] **Step 2.3: Verify TypeScript still passes**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 2.4: Verify standard build still works (no BUILD_TARGET)**

  ```bash
  cd apps/web && pnpm run build
  ```
  Expected: build succeeds, no `output: 'export'` behaviour (API routes included)

- [ ] **Step 2.5: Commit**

  ```bash
  git add apps/web/next.config.ts package.json
  git commit -m "chore: add conditional static export for mobile builds"
  ```

---

### Task 3: Add `/mobile` redirect to middleware

Prevent web browsers from accessing `/mobile/*` routes — they should always go to `/dashboard`.

**Files:**
- Modify: `apps/web/src/middleware.ts`

- [ ] **Step 3.1: Update middleware**

  The current `matcher` only covers `/dashboard/:path*`. Add `/mobile` redirect logic before the existing checks:

  ```typescript
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  import { createClient } from '@supabase/supabase-js';

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const protectedRoutes = ['/dashboard'];
  const publicRoutes = ['/', '/login', '/api', '/auth', '/lists'];

  export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Redirect /mobile/* to /dashboard for web browsers
    // (mobile routes are only intended for use inside the Capacitor native shell)
    if (pathname === '/mobile' || pathname.startsWith('/mobile/')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Skip public routes and API routes
    if (publicRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return NextResponse.next();
    }

    // Check if this is a protected route
    if (!protectedRoutes.some(r => pathname === r || pathname.startsWith(r + '/'))) {
      return NextResponse.next();
    }

    // Check for Supabase session via cookies
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (user) return NextResponse.next();
    }

    const cookies = req.cookies.getAll();
    const hasSession = cookies.some(c =>
      c.name.includes('sb-') && c.name.includes('auth-token')
    );
    if (hasSession) return NextResponse.next();

    return NextResponse.next();
  }

  export const config = {
    matcher: ['/dashboard/:path*', '/mobile/:path*', '/mobile'],
  };
  ```

- [ ] **Step 3.2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 3.3: Commit**

  ```bash
  git add apps/web/src/middleware.ts
  git commit -m "chore: redirect /mobile/* to /dashboard for web browsers"
  ```

---

### Task 4: Add `platform=mobile` support to auth flow

Lets the mobile app signal that after OAuth it should receive a custom scheme URL instead of being redirected to `/auth/set-session`.

**Files:**
- Modify: `apps/web/src/app/api/auth/x-login/route.ts`
- Modify: `apps/web/src/app/api/auth/x-callback/route.ts`

- [ ] **Step 4.1: Update x-login to thread `platform` through state cookie**

  ```typescript
  import { NextRequest, NextResponse } from 'next/server';
  import crypto from 'crypto';

  const X_CLIENT_ID = process.env.X_CLIENT_ID!;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const extensionId = url.searchParams.get('extension_id');
    const platform = url.searchParams.get('platform'); // 'mobile' | null

    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const state = crypto.randomBytes(16).toString('hex');
    const callbackUrl = `${APP_URL}/api/auth/x-callback`;

    const stateData = JSON.stringify({
      codeVerifier,
      state,
      extensionId: extensionId || null,
      platform: platform || null,
    });

    const xAuthUrl = new URL('https://x.com/i/oauth2/authorize');
    xAuthUrl.searchParams.set('response_type', 'code');
    xAuthUrl.searchParams.set('client_id', X_CLIENT_ID);
    xAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    xAuthUrl.searchParams.set('scope', 'tweet.read users.read bookmark.read offline.access');
    xAuthUrl.searchParams.set('state', state);
    xAuthUrl.searchParams.set('code_challenge', codeChallenge);
    xAuthUrl.searchParams.set('code_challenge_method', 'S256');

    const response = NextResponse.redirect(xAuthUrl.toString());
    response.cookies.set('x-oauth-state', stateData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });

    return response;
  }
  ```

- [ ] **Step 4.2: Update x-callback to redirect to custom scheme when `platform === 'mobile'`**

  Find the final redirect in `x-callback/route.ts` (around line 207–216 in the original). Replace the `sessionUrl` redirect block:

  ```typescript
  // Existing stateData type now includes platform
  let stateData: {
    codeVerifier: string;
    state: string;
    extensionId: string | null;
    platform: string | null;
  };
  ```

  And replace the final redirect (was `NextResponse.redirect(sessionUrl.toString())`):

  ```typescript
  // Mobile: redirect to custom scheme with tokens so Capacitor can intercept
  if (stateData.platform === 'mobile') {
    const mobileUrl = new URL('helloagainlinks://auth/callback');
    mobileUrl.searchParams.set('access_token', verifyData.session.access_token);
    mobileUrl.searchParams.set('refresh_token', verifyData.session.refresh_token);
    const response = NextResponse.redirect(mobileUrl.toString());
    response.cookies.delete('x-oauth-state');
    return response;
  }

  // Web: existing flow
  const sessionUrl = new URL(`${APP_URL}/auth/set-session`);
  sessionUrl.searchParams.set('access_token', verifyData.session.access_token);
  sessionUrl.searchParams.set('refresh_token', verifyData.session.refresh_token);
  if (stateData.extensionId) {
    sessionUrl.searchParams.set('extension_id', stateData.extensionId);
  }

  const response = NextResponse.redirect(sessionUrl.toString());
  response.cookies.delete('x-oauth-state');
  return response;
  ```

- [ ] **Step 4.3: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 4.4: Verify lint**

  ```bash
  cd apps/web && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 4.5: Commit**

  ```bash
  git add apps/web/src/app/api/auth/x-login/route.ts apps/web/src/app/api/auth/x-callback/route.ts
  git commit -m "feat: add platform=mobile support to auth flow for custom scheme redirect"
  ```

---

### Task 5: Register deep-link URL scheme on iOS and Android

Required for the OS to route `helloagainlinks://` URLs back into the HAL app.

**Files:**
- Modify: `apps/web/ios/App/App/Info.plist`
- Modify: `apps/web/android/app/src/main/AndroidManifest.xml`
- Create: `archive/MobileShareListener.tsx`
- Modify: `apps/web/src/app/dashboard/layout.tsx`

- [ ] **Step 5.1: Register URL scheme in iOS Info.plist**

  Open `apps/web/ios/App/App/Info.plist`. Add `CFBundleURLTypes` before the closing `</dict>`:

  ```xml
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleURLName</key>
      <string>com.helloagainlinks.app</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>helloagainlinks</string>
      </array>
    </dict>
  </array>
  ```

- [ ] **Step 5.2: Add deep-link intent filter to Android manifest**

  Open `apps/web/android/app/src/main/AndroidManifest.xml`. Inside the `<activity>` element that already has `MAIN`/`LAUNCHER` intent filters, add:

  ```xml
  <intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="helloagainlinks" android:host="auth" />
  </intent-filter>
  ```

- [ ] **Step 5.3: Archive MobileShareListener**

  ```bash
  mkdir -p archive
  cp apps/web/src/components/MobileShareListener.tsx archive/MobileShareListener.tsx
  ```

- [ ] **Step 5.4: Remove MobileShareListener from dashboard layout**

  Open `apps/web/src/app/dashboard/layout.tsx`. Remove the import and JSX usage of `<MobileShareListener />`:

  - Delete: `import { MobileShareListener } from '@/components/MobileShareListener';`
  - Delete: `<MobileShareListener />` from the JSX

- [ ] **Step 5.5: Verify TypeScript and lint**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 5.6: Commit**

  ```bash
  git add apps/web/ios/App/App/Info.plist apps/web/android/app/src/main/AndroidManifest.xml archive/MobileShareListener.tsx apps/web/src/app/dashboard/layout.tsx
  git commit -m "chore: register helloagainlinks:// deep-link scheme, archive MobileShareListener"
  ```

---

## Chunk 2: Share Sheet — MobileShareSheet Component

### File map for this chunk

| Action | File |
|--------|------|
| Create | `apps/web/src/components/MobileShareSheet.tsx` |

The `MobileShareSheet` handles all 4 states: saving (shimmer), saved (colored tags), error (network/duplicate), unauthenticated (sign-in prompt). It listens for `shareIntent` events from `@capgo/capacitor-share-target`, calls `/api/mobile/share`, and displays a bottom-sheet overlay.

---

### Task 6: Create MobileShareSheet component

**Files:**
- Create: `apps/web/src/components/MobileShareSheet.tsx`

- [ ] **Step 6.1: Create the component**

  ```typescript
  'use client';

  import { useEffect, useState, useCallback } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { useRouter } from 'next/navigation';
  import { Capacitor } from '@capacitor/core';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  type ShareState = 'idle' | 'saving' | 'saved' | 'error' | 'unauthenticated';

  interface SavedBookmark {
    content_text: string;
    x_author_handle: string;
    tags: Array<{ name: string; color: string }>;
  }

  export function MobileShareSheet() {
    const router = useRouter();
    const [state, setState] = useState<ShareState>('idle');
    const [tweetPreview, setTweetPreview] = useState<{ handle: string; text: string } | null>(null);
    const [savedBookmark, setSavedBookmark] = useState<SavedBookmark | null>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleShare = useCallback(async (tweetUrl: string) => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setState('unauthenticated');
        return;
      }

      // Extract tweet info for preview (handle from URL)
      const urlMatch = tweetUrl.match(/x\.com\/([^/]+)\/status\/(\d+)/);
      if (urlMatch) {
        setTweetPreview({ handle: urlMatch[1], text: tweetUrl });
      }

      setState('saving');

      try {
        const res = await fetch('/api/mobile/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ url: tweetUrl }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 409 || data?.error?.includes('duplicate')) {
            setErrorMessage('Already in your HAL');
          } else {
            setErrorMessage('Something went wrong. Try again.');
          }
          setState('error');
          return;
        }

        const data = await res.json();
        setSavedBookmark({
          content_text: data.bookmark?.content_text || tweetPreview?.text || '',
          x_author_handle: data.bookmark?.x_author_handle || tweetPreview?.handle || '',
          tags: data.bookmark?.bookmark_tags?.map((bt: { tags: { name: string; color: string } }) => bt.tags) || [],
        });
        setState('saved');
      } catch {
        setErrorMessage('Something went wrong. Try again.');
        setState('error');
      }
    }, [tweetPreview]);

    const dismiss = useCallback(() => {
      setState('idle');
      setTweetPreview(null);
      setSavedBookmark(null);
      setErrorMessage('');
    }, []);

    useEffect(() => {
      if (!Capacitor.isNativePlatform()) return;

      let cleanup: (() => void) | undefined;

      import('@capgo/capacitor-share-target').then(({ ShareTarget }) => {
        ShareTarget.addListener('shareIntent', (data: { url?: string; text?: string }) => {
          const tweetUrl = data.url ?? data.text ?? '';
          if (tweetUrl) handleShare(tweetUrl);
        }).then((handle) => {
          cleanup = () => handle.remove();
        });
      });

      return () => { cleanup?.(); };
    }, [handleShare]);

    if (state === 'idle') return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              width: '100%',
              background: '#13131f',
              borderRadius: '20px 20px 0 0',
              borderTop: '1px solid rgba(0,212,255,0.2)',
              padding: '12px 20px 32px',
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: 32, height: 3, borderRadius: 100,
              background: 'rgba(255,255,255,0.12)',
              margin: '0 auto 16px',
            }} />

            {/* HAL header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#0a0a0f',
                boxShadow: '0 0 12px rgba(0,212,255,0.35)',
              }}>H</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5' }}>
                  {state === 'saving' && 'Save to HAL'}
                  {state === 'saved' && 'Saved to HAL'}
                  {state === 'error' && "Couldn't save"}
                  {state === 'unauthenticated' && 'Sign in to save'}
                </div>
                <div style={{ fontSize: 10, color: '#4a4a5a' }}>
                  {state === 'saving' && 'AI tagging your bookmark...'}
                  {state === 'saved' && 'Auto-tagged by AI'}
                  {state === 'error' && errorMessage}
                  {state === 'unauthenticated' && 'Open HAL to sign in first'}
                </div>
              </div>
            </div>

            {/* Tweet preview (saving / saved / error states) */}
            {(state === 'saving' || state === 'saved' || state === 'error') && tweetPreview && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(0,212,255,0.08)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#00d4ff', marginBottom: 4 }}>
                  @{tweetPreview.handle}
                </div>
                <div style={{ fontSize: 10, color: '#8a8a9a', lineHeight: 1.5 }}>
                  {tweetPreview.text.length > 120 ? tweetPreview.text.slice(0, 120) + '...' : tweetPreview.text}
                </div>
              </div>
            )}

            {/* State: Saving — shimmer skeleton */}
            {state === 'saving' && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {[52, 68, 44].map((w, i) => (
                  <div key={i} style={{
                    height: 20, width: w, borderRadius: 100,
                    background: 'rgba(255,255,255,0.06)',
                    animation: 'shimmer 1.5s infinite',
                  }} />
                ))}
              </div>
            )}

            {/* State: Saved — colored tags + success badge */}
            {state === 'saved' && savedBookmark && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,212,255,0.06)',
                  border: '1px solid rgba(0,212,255,0.2)',
                  borderRadius: 10, padding: '8px 12px', marginBottom: 10,
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#00d4ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: '#0a0a0f', fontWeight: 700,
                    boxShadow: '0 0 8px rgba(0,212,255,0.4)',
                  }}>✓</div>
                  <span style={{ fontSize: 11, color: '#00d4ff', fontWeight: 500 }}>
                    Bookmark saved successfully
                  </span>
                </div>
                {savedBookmark.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                    {savedBookmark.tags.map((tag) => {
                      const r = parseInt(tag.color.slice(1, 3), 16);
                      const g = parseInt(tag.color.slice(3, 5), 16);
                      const b = parseInt(tag.color.slice(5, 7), 16);
                      return (
                        <span key={tag.name} style={{
                          borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 500,
                          background: `rgba(${r},${g},${b},0.1)`,
                          border: `1px solid rgba(${r},${g},${b},0.25)`,
                          color: tag.color,
                        }}>{tag.name}</span>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Primary CTA */}
            {state === 'saving' && (
              <button
                onClick={dismiss}
                style={{
                  width: '100%', padding: 12, borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent', color: '#8a8a9a',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >Cancel</button>
            )}

            {state === 'saved' && (
              <button
                onClick={dismiss}
                style={{
                  width: '100%', padding: 12, borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  color: '#0a0a0f', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  boxShadow: '0 0 20px rgba(0,212,255,0.25)',
                }}
              >Done — Back to X</button>
            )}

            {state === 'error' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => tweetPreview && handleShare(tweetPreview.text)}
                  style={{
                    flex: 1, padding: 12, borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                    color: '#0a0a0f', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >Try Again</button>
                <button
                  onClick={dismiss}
                  style={{
                    flex: 1, padding: 12, borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', color: '#8a8a9a',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >Done</button>
              </div>
            )}

            {state === 'unauthenticated' && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => { dismiss(); router.push('/mobile/onboarding'); }}
                  style={{
                    flex: 1, padding: 12, borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                    color: '#0a0a0f', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >Open HAL</button>
                <button
                  onClick={dismiss}
                  style={{
                    flex: 1, padding: 12, borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent', color: '#8a8a9a',
                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >Dismiss</button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }
  ```

- [ ] **Step 6.2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 6.3: Verify lint**

  ```bash
  cd apps/web && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 6.4: Commit**

  ```bash
  git add apps/web/src/components/MobileShareSheet.tsx
  git commit -m "feat: add MobileShareSheet with 4 states (saving/saved/error/unauthenticated)"
  ```

---

## Chunk 3: Mobile Layout + Onboarding

### File map for this chunk

| Action | File |
|--------|------|
| Create | `apps/web/src/app/mobile/layout.tsx` |
| Create | `apps/web/src/app/mobile/page.tsx` |
| Create | `apps/web/src/app/mobile/onboarding/page.tsx` |

---

### Task 7: Create mobile root layout

The layout wraps all `/mobile` routes. It handles: platform guard (redirect web users), onboarding detection, auth deep-link callback, and renders the bottom tab bar.

**Files:**
- Create: `apps/web/src/app/mobile/layout.tsx`
- Create: `apps/web/src/app/mobile/page.tsx`

- [ ] **Step 7.1: Create apps/web/src/app/mobile/page.tsx**

  Simple redirect to home tab:

  ```typescript
  import { redirect } from 'next/navigation';

  export default function MobileRoot() {
    redirect('/mobile/home');
  }
  ```

- [ ] **Step 7.2: Create apps/web/src/app/mobile/layout.tsx**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { usePathname, useRouter } from 'next/navigation';
  import Link from 'next/link';
  import { motion, AnimatePresence } from 'framer-motion';
  import { Capacitor } from '@capacitor/core';
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
      let appListener: { remove: () => void } | undefined;
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appUrlOpen', async ({ url }) => {
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
        }).then((handle) => { appListener = handle; });
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

      return () => { appListener?.remove(); };
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
  ```

- [ ] **Step 7.3: Install @capacitor/preferences if not present**

  ```bash
  cd apps/web && pnpm list @capacitor/preferences
  ```

  If not listed, install it:

  ```bash
  cd apps/web && pnpm add @capacitor/preferences && pnpm mobile:sync
  ```

- [ ] **Step 7.4: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 7.5: Commit**

  ```bash
  git add apps/web/src/app/mobile/layout.tsx apps/web/src/app/mobile/page.tsx
  git commit -m "feat: add mobile layout with tab bar, onboarding guard, and auth deep-link handler"
  ```

---

### Task 8: Create onboarding flow

5 screens managed as a single-page step machine at `/mobile/onboarding`. Platform is detected to skip screen 4 on Android.

**Files:**
- Create: `apps/web/src/app/mobile/onboarding/page.tsx`

- [ ] **Step 8.1: Create onboarding page**

  ```typescript
  'use client';

  import { useState } from 'react';
  import { motion, AnimatePresence } from 'framer-motion';
  import { useRouter } from 'next/navigation';
  import { Capacitor } from '@capacitor/core';
  import { Preferences } from '@capacitor/preferences';
  import { ImpactStyle } from '@capacitor/haptics';
  import { triggerHaptic } from '@/lib/mobile';

  const isIOS = Capacitor.getPlatform() === 'ios';
  const TOTAL_STEPS = isIOS ? 5 : 4; // Android skips share extension setup

  export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);

    const next = async () => {
      await triggerHaptic(ImpactStyle.Light);
      // Android: skip step 4 (iOS share extension setup)
      const nextStep = (!isIOS && step === 3) ? 5 : step + 1;
      if (nextStep > 5) {
        await complete();
      } else {
        setStep(nextStep);
      }
    };

    const complete = async () => {
      await Preferences.set({ key: 'onboarding_complete', value: 'true' });
      router.replace('/mobile/home');
    };

    const openSignIn = () => {
      // window.open with '_system' target opens in the device's default browser,
      // which preserves the appUrlOpen listener mounted in layout.tsx.
      // Do NOT use window.location.href — that navigates the WebView away from
      // the app shell and destroys the listener before the deep-link fires.
      window.open('/api/auth/x-login?platform=mobile', '_system');
    };

    return (
      <div style={{
        minHeight: '100vh', background: '#0a0a0f', padding: '48px 24px 32px',
        display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif",
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const isActive = i + 1 === (isIOS ? step : step > 3 ? step - 1 : step);
            return (
              <div key={i} style={{
                height: 5, borderRadius: 3,
                width: isActive ? 20 : 5,
                background: isActive ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                boxShadow: isActive ? '0 0 6px rgba(0,212,255,0.5)' : 'none',
                transition: 'all 0.3s ease',
              }} />
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
            {step === 1 && <StepWelcome onGetStarted={next} onReturning={openSignIn} />}
            {step === 2 && <StepSignIn onSignIn={openSignIn} />}
            {step === 3 && <StepTwoWays onNext={next} />}
            {step === 4 && isIOS && <StepEnableShare onNext={next} onSkip={next} />}
            {step === 5 && <StepAllSet onDone={complete} />}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  function StepWelcome({ onGetStarted, onReturning }: { onGetStarted: () => void; onReturning: () => void }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 700, color: '#0a0a0f',
          boxShadow: '0 0 40px rgba(0,212,255,0.4)',
          marginBottom: 20,
        }}>H</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0f0f5', marginBottom: 8, lineHeight: 1.2 }}>
          Hello Again Links
        </h1>
        <p style={{ color: '#4a4a5a', fontSize: 14, lineHeight: 1.6, marginBottom: 48, maxWidth: 260 }}>
          Your AI-powered bookmark manager for X — everywhere.
        </p>
        <button onClick={onGetStarted} style={primaryBtn}>Get Started</button>
        <button onClick={onReturning} style={{ ...secondaryBtn, marginTop: 12 }}>I already have an account</button>
      </div>
    );
  }

  function StepSignIn({ onSignIn }: { onSignIn: () => void }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, margin: '0 auto 16px',
            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>𝕏</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 8 }}>Sign in with X</h2>
          <p style={{ color: '#4a4a5a', fontSize: 13, lineHeight: 1.6 }}>
            HAL uses your X account to sync bookmarks and personalise your AI experience.
          </p>
        </div>
        <div style={{
          background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Permissions requested</div>
          {['✓  Read your profile', '✓  Read your bookmarks', '✗  Post on your behalf'].map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: p.startsWith('✗') ? '#4a4a5a' : '#8a8a9a', lineHeight: 1.8 }}>{p}</div>
          ))}
        </div>
        <button onClick={onSignIn} style={{
          ...primaryBtn, background: '#000',
          border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
          Continue with X
        </button>
        <p style={{ textAlign: 'center', fontSize: 10, color: '#4a4a5a', marginTop: 16, lineHeight: 1.6 }}>
          By continuing you agree to HAL&apos;s{' '}
          <span style={{ color: '#00d4ff' }}>Terms</span> and{' '}
          <span style={{ color: '#00d4ff' }}>Privacy Policy</span>
        </p>
      </div>
    );
  }

  function StepTwoWays({ onNext }: { onNext: () => void }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 6 }}>Two ways to save</h2>
        <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          HAL works with how you already use X — no changes needed.
        </p>
        {[
          { icon: '🔖', title: 'Bookmark in X, sync to HAL', desc: 'Tap X\'s native bookmark button as usual. HAL automatically syncs it in the background — no extra steps.', badge: 'Zero extra taps', badgeColor: '#22c55e' },
          { icon: '📤', title: 'Share directly to HAL', desc: 'Tap Share on any tweet → select HAL. Saves without adding to X bookmarks. AI tags it instantly.', badge: 'AI-tagged on save', badgeColor: '#00d4ff' },
        ].map((m) => (
          <div key={m.title} style={{
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(0,212,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
              }}>{m.icon}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{m.title}</span>
            </div>
            <p style={{ fontSize: 11, color: '#4a4a5a', lineHeight: 1.5, marginBottom: 8 }}>{m.desc}</p>
            <span style={{
              borderRadius: 100, padding: '2px 10px', fontSize: 9, fontWeight: 600,
              background: `rgba(${parseInt(m.badgeColor.slice(1,3),16)},${parseInt(m.badgeColor.slice(3,5),16)},${parseInt(m.badgeColor.slice(5,7),16)},0.1)`,
              border: `1px solid ${m.badgeColor}40`, color: m.badgeColor,
            }}>{m.badge}</span>
          </div>
        ))}
        <button onClick={onNext} style={{ ...primaryBtn, marginTop: 'auto' }}>Next →</button>
      </div>
    );
  }

  function StepEnableShare({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 6 }}>Enable HAL in X</h2>
        <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
          One-time setup so HAL appears in X&apos;s share menu.
        </p>
        {[
          { num: '1', title: 'Open the X app', desc: 'Tap Share (↑) on any tweet' },
          { num: '2', title: 'Scroll down → tap "More"', desc: 'Or "Edit Actions" on iOS 17+' },
          { num: '3', title: 'Find HAL and tap +', desc: 'HAL will now appear every time you share a tweet.' },
        ].map((s) => (
          <div key={s.num} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
              background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#00d4ff',
            }}>{s.num}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', marginBottom: 3 }}>{s.title}</div>
              <div style={{ fontSize: 11, color: '#4a4a5a', lineHeight: 1.4 }}>{s.desc}</div>
            </div>
          </div>
        ))}
        <button onClick={onNext} style={{ ...primaryBtn, marginTop: 'auto' }}>I&apos;ve done this →</button>
        <button onClick={onSkip} style={{ ...secondaryBtn, marginTop: 10 }}>Skip for now</button>
      </div>
    );
  }

  function StepAllSet({ onDone }: { onDone: () => void }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
          border: '2px solid #00d4ff', boxShadow: '0 0 24px rgba(0,212,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        }}>✓</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5', marginBottom: 8 }}>You&apos;re all set</h2>
        <p style={{ color: '#4a4a5a', fontSize: 13, lineHeight: 1.6, marginBottom: 32, maxWidth: 260 }}>
          HAL is ready. Start saving bookmarks from X anytime.
        </p>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
          {[
            { icon: '✨', text: 'AI auto-tags every bookmark you save' },
            { icon: '🔄', text: 'X bookmarks sync automatically' },
            { icon: '🔗', text: 'Blend with friends to discover shared interests' },
          ].map((f) => (
            <div key={f.icon} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              <span style={{ fontSize: 12, color: '#8a8a9a' }}>{f.text}</span>
            </div>
          ))}
        </div>
        <button onClick={onDone} style={primaryBtn}>Go to my bookmarks →</button>
      </div>
    );
  }

  // Shared button styles
  const primaryBtn: React.CSSProperties = {
    width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
    background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
    color: '#0a0a0f', fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    boxShadow: '0 0 20px rgba(0,212,255,0.2)',
  };

  const secondaryBtn: React.CSSProperties = {
    width: '100%', padding: '12px 0', borderRadius: 13,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'transparent', color: '#8a8a9a',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  };
  ```

- [ ] **Step 8.2: Verify TypeScript**

  ```bash
  cd apps/web && npx tsc --noEmit
  ```
  Expected: no errors

- [ ] **Step 8.3: Verify lint**

  ```bash
  cd apps/web && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 8.4: Commit**

  ```bash
  git add apps/web/src/app/mobile/onboarding/page.tsx
  git commit -m "feat: add 5-screen mobile onboarding flow"
  ```

---

## Chunk 4: Core Screens — Home, Bookmarks, AI, Blend

### File map for this chunk

| Action | File |
|--------|------|
| Create | `apps/web/src/app/mobile/home/page.tsx` |
| Create | `apps/web/src/app/mobile/bookmarks/page.tsx` |
| Create | `apps/web/src/app/mobile/ai/page.tsx` |
| Create | `apps/web/src/app/mobile/blend/page.tsx` |

All screens follow the same pattern: `'use client'`, client-side Supabase session fetch, HAL design tokens, Framer Motion fade-in on mount. Shared styles: `bg: #0a0a0f`, `padding: 20px 16px`, cards with `glass glow-border` classes.

---

### Task 9: Home screen

**Files:**
- Create: `apps/web/src/app/mobile/home/page.tsx`

- [ ] **Step 9.1: Create home page**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { motion } from 'framer-motion';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  interface Bookmark {
    id: string;
    x_author_handle: string;
    x_author_name: string;
    content_text: string;
    bookmarked_at: string;
    bookmark_tags?: Array<{ tags: { name: string; color: string } }>;
  }

  export default function MobileHomePage() {
    const [user, setUser] = useState<{ name: string; handle: string } | null>(null);
    const [bookmarkCount, setBookmarkCount] = useState(0);
    const [tagCount, setTagCount] = useState(0);
    const [recent, setRecent] = useState<Bookmark[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        const meta = session.user.user_metadata || {};
        setUser({ name: meta.full_name || '', handle: meta.preferred_username || '' });
        const h = { Authorization: `Bearer ${session.access_token}` };

        const [bmRes, tagRes] = await Promise.all([
          fetch('/api/bookmarks?pageSize=5&sort=bookmarked_at&order=desc', { headers: h }),
          fetch('/api/tags', { headers: h }),
        ]);

        if (bmRes.ok) {
          const d = await bmRes.json();
          setRecent(d.data || []);
          setBookmarkCount(d.count ?? d.data?.length ?? 0);
        }
        if (tagRes.ok) {
          const d = await tagRes.json();
          setTagCount((d.tags || d || []).length);
        }
        setLoading(false);
      });
    }, []);

    const timeAgo = (d: string) => {
      const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
      if (m < 1) return 'Just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    };

    return (
      <div style={{ padding: '24px 16px', minHeight: '100%' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f5', marginBottom: 2 }}>
            {user ? `Hey, ${user.name || '@' + user.handle} ⬡` : 'Dashboard'}
          </h1>
          <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 20 }}>
            {bookmarkCount > 0 ? `${bookmarkCount} bookmarks saved` : 'No bookmarks yet'}
          </p>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Bookmarks', value: bookmarkCount.toLocaleString(), sub: 'All time' },
              { label: 'Tags', value: tagCount.toString(), sub: 'Categories' },
              { label: 'Blend Score', value: '—', sub: 'Invite a friend!' },
              { label: 'AI Searches', value: '0', sub: 'Ask anything' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass glow-border"
                style={{ padding: '16px 14px', borderRadius: 14 }}
              >
                <div style={{ fontSize: 11, color: '#4a4a5a', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f0f5', lineHeight: 1 }}>{loading ? '…' : s.value}</div>
                <div style={{ fontSize: 10, color: '#00d4ff', marginTop: 4 }}>{s.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Recent bookmarks */}
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5', marginBottom: 12 }}>Recent</h2>
          {loading ? (
            <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 24, fontSize: 13 }}>Loading…</div>
          ) : recent.length === 0 ? (
            <div className="glass glow-border" style={{ padding: 28, borderRadius: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📚</div>
              <div style={{ fontSize: 14, color: '#f0f0f5', fontWeight: 600, marginBottom: 6 }}>No bookmarks yet</div>
              <div style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.6 }}>
                Share a tweet from X to save your first bookmark.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.map((bm, i) => (
                <motion.div
                  key={bm.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="glass glow-border"
                  style={{ padding: '14px 16px', borderRadius: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#00d4ff' }}>@{bm.x_author_handle}</span>
                    <span style={{ fontSize: 11, color: '#4a4a5a', marginLeft: 'auto' }}>{timeAgo(bm.bookmarked_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8a8a9a', lineHeight: 1.5 }}>
                    {bm.content_text.length > 160 ? bm.content_text.slice(0, 160) + '…' : bm.content_text}
                  </div>
                  {(bm.bookmark_tags?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {bm.bookmark_tags!.slice(0, 3).map((bt) => {
                        const c = bt.tags.color;
                        const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
                        return (
                          <span key={bt.tags.name} style={{
                            borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 500,
                            background: `rgba(${r},${g},${b},0.1)`, border: `1px solid rgba(${r},${g},${b},0.22)`, color: c,
                          }}>{bt.tags.name}</span>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }
  ```

- [ ] **Step 9.2: Verify TypeScript + lint**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 9.3: Commit**

  ```bash
  git add apps/web/src/app/mobile/home/page.tsx
  git commit -m "feat: add mobile home screen"
  ```

---

### Task 10: Bookmarks screen

> **Note:** The spec calls for "infinite-scroll" but this plan intentionally implements a "Load More" button instead. True infinite scroll requires an Intersection Observer setup that adds complexity disproportionate to the benefit for v1. Load-more achieves the same pagination goal with less code and is easier to test.

**Files:**
- Create: `apps/web/src/app/mobile/bookmarks/page.tsx`

- [ ] **Step 10.1: Create bookmarks page**

  ```typescript
  'use client';

  import { useEffect, useState, useCallback, useRef } from 'react';
  import { motion } from 'framer-motion';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  interface Tag { id: string; name: string; color: string; }
  interface Bookmark {
    id: string; x_post_id: string; x_author_handle: string;
    content_text: string; bookmarked_at: string;
    bookmark_tags?: Array<{ tag_id: string; tags: Tag }>;
  }

  const PAGE_SIZE = 20;

  export default function MobileBookmarksPage() {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(true);
    const [swipedId, setSwipedId] = useState<string | null>(null);
    const touchStartX = useRef(0);

    const fetchBookmarks = useCallback(async (pageNum: number, reset = false) => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const h = { Authorization: `Bearer ${session.access_token}` };

      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        page: String(pageNum),
        sort: 'bookmarked_at',
        order: 'desc',
      });
      if (search) params.set('q', search);
      if (activeTag) params.set('tag', activeTag);

      const res = await fetch(`/api/bookmarks?${params}`, { headers: h });
      if (!res.ok) return;
      const data = await res.json();
      const items: Bookmark[] = data.data || [];
      setBookmarks(prev => reset ? items : [...prev, ...items]);
      setHasMore(items.length === PAGE_SIZE);
      setLoading(false);
    }, [search, activeTag]);

    // Initial load of tags
    useEffect(() => {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        const res = await fetch('/api/tags', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) {
          const d = await res.json();
          setTags((d.tags || d || []).slice(0, 12));
        }
      });
    }, []);

    // Reload on filter change
    useEffect(() => {
      setPage(0);
      setLoading(true);
      fetchBookmarks(0, true);
    }, [fetchBookmarks]);

    const deleteBookmark = async (id: string, xPostId: string) => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch(`/api/bookmarks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}`, 'x-post-id': xPostId },
      });
      setBookmarks(prev => prev.filter(b => b.id !== id));
      setSwipedId(null);
    };

    const timeAgo = (d: string) => {
      const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
      if (m < 60) return `${Math.max(1,m)}m`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h`;
      return `${Math.floor(h / 24)}d`;
    };

    return (
      <div style={{ padding: '20px 16px', minHeight: '100%' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 14 }}>Bookmarks</h1>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.1)',
          borderRadius: 12, padding: '10px 14px', marginBottom: 12,
        }}>
          <span style={{ fontSize: 14, color: '#4a4a5a' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your bookmarks..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#f0f0f5', fontSize: 14, fontFamily: "'Inter', sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer', fontSize: 16 }}>×</button>
          )}
        </div>

        {/* Tag filter chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 14 }}>
          <button
            onClick={() => setActiveTag(null)}
            style={{
              borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 500,
              border: `1px solid ${!activeTag ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: !activeTag ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: !activeTag ? '#00d4ff' : '#4a4a5a',
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
            }}
          >All</button>
          {tags.map((tag) => {
            const r = parseInt(tag.color.slice(1,3),16), g = parseInt(tag.color.slice(3,5),16), b = parseInt(tag.color.slice(5,7),16);
            const isActive = activeTag === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setActiveTag(isActive ? null : tag.id)}
                style={{
                  borderRadius: 100, padding: '5px 12px', fontSize: 11, fontWeight: 500,
                  border: `1px solid rgba(${r},${g},${b},${isActive ? 0.4 : 0.15})`,
                  background: isActive ? `rgba(${r},${g},${b},0.1)` : 'rgba(255,255,255,0.03)',
                  color: isActive ? tag.color : '#4a4a5a',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
                }}
              >{tag.name}</button>
            );
          })}
        </div>

        {/* Bookmark list */}
        {loading ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
        ) : bookmarks.length === 0 ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>No bookmarks found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bookmarks.map((bm, i) => (
              <div key={bm.id} style={{ position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
                {/* Delete action (swipe-left reveal) */}
                {swipedId === bm.id && (
                  <button
                    onClick={() => deleteBookmark(bm.id, bm.x_post_id)}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: 72,
                      background: '#ef4444', border: 'none', color: '#fff',
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >Delete</button>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0, x: swipedId === bm.id ? -72 : 0 }}
                  transition={{ delay: i < 10 ? i * 0.03 : 0 }}
                  className="glass glow-border"
                  style={{ padding: '14px 16px', borderRadius: 12, position: 'relative' }}
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const dx = touchStartX.current - e.changedTouches[0].clientX;
                    if (dx > 60) setSwipedId(bm.id);
                    else if (dx < -20) setSwipedId(null);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#00d4ff' }}>@{bm.x_author_handle}</span>
                    <span style={{ fontSize: 11, color: '#4a4a5a', marginLeft: 'auto' }}>{timeAgo(bm.bookmarked_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#8a8a9a', lineHeight: 1.5 }}>
                    {bm.content_text.length > 180 ? bm.content_text.slice(0, 180) + '…' : bm.content_text}
                  </div>
                  {(bm.bookmark_tags?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {bm.bookmark_tags!.slice(0, 4).map((bt) => {
                        const c = bt.tags.color;
                        const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
                        return (
                          <span key={bt.tag_id} style={{
                            borderRadius: 100, padding: '2px 9px', fontSize: 10, fontWeight: 500,
                            background: `rgba(${r},${g},${b},0.1)`, border: `1px solid rgba(${r},${g},${b},0.22)`, color: c,
                          }}>{bt.tags.name}</span>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => { const next = page + 1; setPage(next); fetchBookmarks(next); }}
                style={{
                  padding: '12px 0', borderRadius: 12,
                  border: '1px solid rgba(0,212,255,0.15)',
                  background: 'transparent', color: '#00d4ff',
                  fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >Load more</button>
            )}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 10.2: Verify TypeScript + lint**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 10.3: Commit**

  ```bash
  git add apps/web/src/app/mobile/bookmarks/page.tsx
  git commit -m "feat: add mobile bookmarks screen with search, tag filters, and swipe-to-delete"
  ```

---

### Task 11: AI Assistant screen

**Files:**
- Create: `apps/web/src/app/mobile/ai/page.tsx`

- [ ] **Step 11.1: Create AI assistant page**

  ```typescript
  'use client';

  import { useState, useRef, useEffect } from 'react';
  import { motion } from 'framer-motion';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  interface Message { role: 'user' | 'assistant'; content: string; }

  export default function MobileAIPage() {
    const [messages, setMessages] = useState<Message[]>([{
      role: 'assistant',
      content: "Hey! Ask me anything about your bookmarks. I can find threads, summarize topics, or surface ideas you've saved.",
    }]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = async () => {
      const text = input.trim();
      if (!text || loading) return;
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: text }]);
      setLoading(true);

      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      try {
        const res = await fetch('/api/ai/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: text, history: messages }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.message || 'Sorry, I had trouble with that.' }]);
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
      }
      setLoading(false);
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px 16px 0' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 16 }}>AI Assistant ✨</h1>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                maxWidth: '85%',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,212,255,0.07)',
                border: msg.role === 'user'
                  ? '1px solid rgba(255,255,255,0.08)'
                  : '1px solid rgba(0,212,255,0.15)',
                borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                padding: '10px 14px',
                fontSize: 13,
                color: '#c0c0d0',
                lineHeight: 1.5,
              }}
            >
              {msg.content}
            </motion.div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: '12px 12px 12px 3px', padding: '10px 14px',
              fontSize: 13, color: '#4a4a5a',
            }}>Thinking…</div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,212,255,0.12)',
          borderRadius: 12, padding: '10px 12px', marginBottom: 16,
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask about your bookmarks..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#f0f0f5', fontSize: 13, fontFamily: "'Inter', sans-serif",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            style={{
              width: 28, height: 28, borderRadius: 7, border: 'none',
              background: input.trim() && !loading ? '#00d4ff' : 'rgba(0,212,255,0.2)',
              color: '#0a0a0f', fontSize: 13, fontWeight: 700,
              cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >↑</button>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 11.2: Verify TypeScript + lint**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 11.3: Commit**

  ```bash
  git add apps/web/src/app/mobile/ai/page.tsx
  git commit -m "feat: add mobile AI assistant screen"
  ```

---

### Task 12: Blend screen

**Files:**
- Create: `apps/web/src/app/mobile/blend/page.tsx`

- [ ] **Step 12.1: Create blend page**

  ```typescript
  'use client';

  import { useEffect, useState, useCallback } from 'react';
  import { motion } from 'framer-motion';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  interface Blend {
    id: string; status: string; blend_score: number | null;
    analysis_json: { tier?: string; commonGround?: string[]; summary?: string } | null;
  }

  const TIER_COLORS: Record<string, string> = {
    'Intellectual Twins': '#22c55e',
    'Bookmark Buddies': '#00d4ff',
    'Interesting Crossovers': '#f59e0b',
    "Expanding Each Other's Horizons": '#8b5cf6',
  };

  export default function MobileBlendPage() {
    const [blends, setBlends] = useState<Blend[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteUrl, setInviteUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchBlends = useCallback(async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/blends', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) { const d = await res.json(); setBlends(d.blends || []); }
      setLoading(false);
    }, []);

    useEffect(() => { fetchBlends(); }, [fetchBlends]);

    const createInvite = async () => {
      setCreating(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setCreating(false); return; }
      const res = await fetch('/api/blends', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) { const d = await res.json(); setInviteUrl(d.inviteUrl || ''); }
      setCreating(false);
    };

    const copyInvite = () => {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    // Best blend score across all completed blends
    const bestScore = blends.reduce((max, b) => Math.max(max, b.blend_score ?? 0), 0);
    const bestBlend = blends.find(b => b.blend_score === bestScore && bestScore > 0);
    const ringColor = (bestBlend && TIER_COLORS[bestBlend.analysis_json?.tier ?? '']) || '#00d4ff';
    const ringR = 38;
    const ringCirc = 2 * Math.PI * ringR;
    const ringProgress = (bestScore / 100) * ringCirc;

    return (
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 6 }}>Blend 🔗</h1>
        <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 20 }}>Compare bookmark taste with friends.</p>

        {/* Score ring — shows best blend score */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="50" cy="50" r={ringR} fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={ringR} fill="none" stroke={ringColor} strokeWidth="8"
                strokeDasharray={`${ringProgress} ${ringCirc}`} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)`, transition: 'stroke-dasharray 0.6s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: ringColor }}>
                {bestScore > 0 ? `${bestScore}%` : '—'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 8 }}>Best Blend Score</div>
          {bestBlend?.analysis_json?.tier && (
            <div style={{ fontSize: 12, color: ringColor, fontWeight: 500, marginTop: 2 }}>
              {bestBlend.analysis_json.tier}
            </div>
          )}
        </div>

        {/* Create invite */}
        <div className="glass glow-border" style={{ padding: 20, borderRadius: 14, marginBottom: 24 }}>
          {inviteUrl ? (
            <>
              <div style={{ fontSize: 12, color: '#8a8a9a', marginBottom: 10 }}>Share with a friend to start a Blend:</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={inviteUrl} style={{
                  flex: 1, padding: '9px 12px', borderRadius: 10,
                  border: '1px solid rgba(0,212,255,0.15)', background: 'rgba(15,16,25,0.8)',
                  color: '#00d4ff', fontSize: 11, fontFamily: 'monospace', outline: 'none',
                }} />
                <button onClick={copyInvite} style={{
                  padding: '9px 14px', borderRadius: 10, border: 'none',
                  background: copied ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  color: copied ? '#22c55e' : '#0a0a0f', fontWeight: 600, fontSize: 12,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>{copied ? '✓' : 'Copy'}</button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', marginBottom: 6 }}>Start a Blend</div>
              <div style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.5, marginBottom: 16 }}>
                Generate an invite link and share it with a friend. AI will analyze your compatibility.
              </div>
              <button onClick={createInvite} disabled={creating} style={{
                padding: '11px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                color: '#0a0a0f', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", opacity: creating ? 0.5 : 1,
              }}>{creating ? 'Creating…' : 'Create Blend Invite'}</button>
            </div>
          )}
        </div>

        {/* Existing blends */}
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5', marginBottom: 12 }}>Your Blends</h2>
        {loading ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 24, fontSize: 13 }}>Loading…</div>
        ) : blends.length === 0 ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 24, fontSize: 13 }}>No blends yet. Create an invite!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {blends.map((blend, i) => {
              const tier = blend.analysis_json?.tier || 'Pending';
              const color = TIER_COLORS[tier] || '#8a8a9a';
              return (
                <motion.div
                  key={blend.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass glow-border"
                  style={{ padding: '16px 20px', borderRadius: 14 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color }}>{tier}</span>
                    {blend.blend_score !== null && (
                      <span style={{ fontSize: 20, fontWeight: 700, color }}>{blend.blend_score}%</span>
                    )}
                  </div>
                  {blend.analysis_json?.summary && (
                    <div style={{ fontSize: 12, color: '#8a8a9a', lineHeight: 1.5, marginBottom: 10 }}>
                      {blend.analysis_json.summary}
                    </div>
                  )}
                  {(blend.analysis_json?.commonGround?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {blend.analysis_json!.commonGround!.map((t) => (
                        <span key={t} style={{
                          padding: '3px 9px', borderRadius: 100, fontSize: 11,
                          background: 'rgba(0,212,255,0.06)', color: '#00d4ff',
                          border: '1px solid rgba(0,212,255,0.15)',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {blend.status === 'pending' && (
                    <div style={{ fontSize: 12, color: '#f59e0b', fontStyle: 'italic', marginTop: 8 }}>
                      ⏳ Waiting for your friend to accept…
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 12.2: Verify TypeScript + lint**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 12.3: Commit**

  ```bash
  git add apps/web/src/app/mobile/blend/page.tsx
  git commit -m "feat: add mobile blend screen"
  ```

---

## Chunk 5: More Tab — Menu, Tags, Lists, Settings

### File map for this chunk

| Action | File |
|--------|------|
| Create | `apps/web/src/app/mobile/more/page.tsx` |
| Create | `apps/web/src/app/mobile/more/tags/page.tsx` |
| Create | `apps/web/src/app/mobile/more/lists/page.tsx` |
| Create | `apps/web/src/app/mobile/more/settings/page.tsx` |

---

### Task 13: More menu page

**Files:**
- Create: `apps/web/src/app/mobile/more/page.tsx`

- [ ] **Step 13.1: Create more page**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { motion } from 'framer-motion';
  import { ImpactStyle } from '@capacitor/haptics';
  import { triggerHaptic } from '@/lib/mobile';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  export default function MobileMorePage() {
    const router = useRouter();
    const [user, setUser] = useState<{ name: string; handle: string; avatar: string; plan: string } | null>(null);
    const [confirmSignOut, setConfirmSignOut] = useState(false);

    useEffect(() => {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        const meta = session.user.user_metadata || {};
        setUser({
          name: meta.full_name || meta.name || '',
          handle: meta.preferred_username || meta.user_name || '',
          avatar: meta.avatar_url || '',
          plan: 'Free',
        });
      });
    }, []);

    const signOut = async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
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
              background: user.avatar ? `url(${user.avatar}) center/cover` : 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#0a0a0f',
              border: '2px solid rgba(0,212,255,0.2)',
            }}>
              {!user.avatar && user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5' }}>{user.name}</div>
              <div style={{ fontSize: 12, color: '#4a4a5a' }}>@{user.handle}</div>
              <span style={{
                display: 'inline-block', marginTop: 4,
                borderRadius: 100, padding: '1px 8px', fontSize: 9, fontWeight: 600,
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff',
              }}>{user.plan}</span>
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
                border: '1px solid rgba(0,212,255,0.06)',
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
  ```

- [ ] **Step 13.2: Verify TypeScript + lint**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 13.3: Commit**

  ```bash
  git add apps/web/src/app/mobile/more/page.tsx
  git commit -m "feat: add mobile More tab with profile header and menu"
  ```

---

### Task 14: Tags, Lists, and Settings sub-screens

> **Note — intentional v1 scope:** The spec mentions tag create/edit and list create/join, but those operations are managed through the web app (which has full UI for them). The mobile versions are read-only viewers for v1. This is a conscious v1 decision — write operations are in scope for a future mobile v2.

**Files:**
- Create: `apps/web/src/app/mobile/more/tags/page.tsx`
- Create: `apps/web/src/app/mobile/more/lists/page.tsx`
- Create: `apps/web/src/app/mobile/more/settings/page.tsx`

- [ ] **Step 14.1: Create tags page**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { motion } from 'framer-motion';
  import { useRouter } from 'next/navigation';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  interface Tag { id: string; name: string; color: string; bookmark_count?: number; }

  export default function MobileTagsPage() {
    const router = useRouter();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        const res = await fetch('/api/tags', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { const d = await res.json(); setTags(d.tags || d || []); }
        setLoading(false);
      });
    }, []);

    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5' }}>Tags</h1>
        </div>
        {loading ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
        ) : tags.length === 0 ? (
          <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 32, fontSize: 13 }}>No tags yet. Tags are created automatically when you save bookmarks.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {tags.map((tag, i) => {
              const r = parseInt(tag.color.slice(1,3),16), g = parseInt(tag.color.slice(3,5),16), b = parseInt(tag.color.slice(5,7),16);
              return (
                <motion.div
                  key={tag.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    borderRadius: 100, padding: '8px 16px',
                    background: `rgba(${r},${g},${b},0.1)`,
                    border: `1px solid rgba(${r},${g},${b},0.25)`,
                    color: tag.color, fontSize: 13, fontWeight: 500,
                  }}
                >
                  {tag.name}{(tag.bookmark_count ?? 0) > 0 && <span style={{ color: `rgba(${r},${g},${b},0.6)`, fontSize: 11 }}> ({tag.bookmark_count})</span>}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 14.2: Create lists page**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { motion } from 'framer-motion';
  import { useRouter } from 'next/navigation';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  interface SharedList { id: string; name: string; description?: string; member_count?: number; }

  export default function MobileListsPage() {
    const router = useRouter();
    const [lists, setLists] = useState<SharedList[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return;
        const res = await fetch('/api/shared-lists', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) { const d = await res.json(); setLists(d.lists || d || []); }
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
  ```

- [ ] **Step 14.3: Create settings page**

  ```typescript
  'use client';

  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { motion } from 'framer-motion';
  import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

  export default function MobileSettingsPage() {
    const router = useRouter();
    const [syncStatus, setSyncStatus] = useState<string>('');
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
      setSyncStatus('Last synced: auto-syncing in background');
    }, []);

    const triggerSync = async () => {
      setSyncing(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch('/api/sync/background', { headers: { Authorization: `Bearer ${session.access_token}` } });
        setSyncStatus(res.ok ? 'Sync complete' : 'Sync failed');
      }
      setSyncing(false);
    };

    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#00d4ff', fontSize: 20, cursor: 'pointer', padding: 0 }}>‹</button>
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
                  background: syncing ? 'rgba(0,212,255,0.2)' : 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  color: syncing ? '#00d4ff' : '#0a0a0f', fontSize: 13, fontWeight: 600,
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
  ```

- [ ] **Step 14.4: Verify TypeScript + lint for all three files**

  ```bash
  cd apps/web && npx tsc --noEmit && pnpm run lint
  ```
  Expected: no errors

- [ ] **Step 14.5: Commit**

  ```bash
  git add apps/web/src/app/mobile/more/tags/page.tsx apps/web/src/app/mobile/more/lists/page.tsx apps/web/src/app/mobile/more/settings/page.tsx
  git commit -m "feat: add mobile Tags, Lists, and Settings screens"
  ```

---

### Task 15: Run full mobile build and verify

- [ ] **Step 15.1: Run mobile build**

  ```bash
  pnpm mobile:build
  ```
  Expected: `next build` completes with `BUILD_TARGET=mobile`, then `cap sync` copies `out/` into native projects. No build errors.

- [ ] **Step 15.2: Verify out/ contains all required mobile routes**

  ```bash
  ls apps/web/out/mobile/home apps/web/out/mobile/bookmarks apps/web/out/mobile/ai apps/web/out/mobile/blend apps/web/out/mobile/more apps/web/out/mobile/onboarding
  ```
  Expected: all six directories exist. A missing directory means that route will 404 in the native shell.

- [ ] **Step 15.3: Verify Vercel build still works (no BUILD_TARGET)**

  ```bash
  cd apps/web && pnpm run build
  ```
  Expected: standard Next.js build succeeds, API routes included, no `output: 'export'` warnings.

- [ ] **Step 15.4: Open Android Studio and verify the build runs**

  ```bash
  pnpm mobile:open:android
  ```
  In Android Studio: Run → Run 'app' on an emulator or device.
  Expected: App opens, shows HAL splash screen, then routes to onboarding.

  Manual smoke-test checklist on device/emulator:
  - [ ] Onboarding: all 4 Android steps render (step 4 — share extension setup — is skipped)
  - [ ] Sign in with X taps open the system browser (not navigate the WebView)
  - [ ] Bottom tab bar shows after onboarding completes: Home, Bookmarks, AI, Blend, More
  - [ ] Each tab taps without crashing
  - [ ] Share a tweet URL from another app → HAL share sheet appears with saving/saved states

- [ ] **Step 15.5: Open Xcode and verify the build runs (macOS only)**

  ```bash
  pnpm mobile:open:ios
  ```
  In Xcode: Select a simulator → Product → Run.
  Expected: App opens, shows HAL splash screen, then routes to onboarding.

  Manual smoke-test checklist on simulator:
  - [ ] Onboarding: all 5 iOS steps render (step 4 — share extension setup — is shown)
  - [ ] Sign in with X taps open Safari (not navigate the WebView)
  - [ ] Bottom tab bar appears after onboarding completes
  - [ ] Each tab taps without crashing
  - [ ] `helloagainlinks://auth/callback?access_token=...&refresh_token=...` deep-link opens the app and navigates to Home

- [ ] **Step 15.6: Final commit (only if any config files changed during sync)**

  The `cap sync` command may update native project files. Stage only those:

  ```bash
  git status
  ```

  If `apps/web/ios/` or `apps/web/android/` show changes from `cap sync`, stage and commit them:

  ```bash
  git add apps/web/ios apps/web/android
  git commit -m "chore: sync Capacitor native projects after mobile build"
  ```

  If `git status` shows no changes, no commit is needed.
