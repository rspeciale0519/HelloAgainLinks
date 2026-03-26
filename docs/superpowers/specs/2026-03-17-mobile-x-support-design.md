# HAL Mobile App — Design Spec
**Date:** 2026-03-17
**Status:** Approved
**Scope:** Native iOS & Android app + mobile X.com support

---

## 1. Overview

HAL (Hello Again Links) is an AI-powered bookmark manager for X/Twitter. The current product is a Chrome extension + Next.js web app. This spec defines the mobile app experience for iOS and Android — enabling users who access X on their phones (primarily via the native X app) to save, manage, and search their bookmarks natively.

---

## 2. Goals

- Ship a native iOS and Android app with full feature parity to the web app
- Allow users to save tweets from the X native app via a share extension overlay (without leaving X)
- Preserve the existing native X bookmark → HAL auto-sync feature
- Match HAL's existing visual design language precisely (dark theme, cyan accent, glass cards)
- Get the app approved and distributed on the Apple App Store and Google Play Store

---

## 3. Non-Goals (v1)

- Safari Web Extension for x.com in mobile browser (separate future project)
- Offline bookmark browsing (data still requires internet; shell loads locally)
- React Native rewrite (Capacitor is the chosen platform — see decision rationale below)

---

## 4. Technical Approach — Option A: Capacitor + Mobile-Specific Routes

### Current state (what exists today)

- Capacitor v8 configured in `apps/web/capacitor.config.ts` with `appId: com.helloagainlinks.app` and `webDir: 'out'`
- `server.url: 'https://helloagain-three.vercel.app'` override **still present** — currently loads the live web URL (to be removed as part of this work)
- iOS and Android native projects exist under `apps/web/ios` and `apps/web/android`
- `@capgo/capacitor-share-target@^8.0.16` installed; `CapacitorShareTarget: { shareExtensionName: 'ShareExtension' }` in config
- `AndroidManifest.xml` has `ACTION_SEND`/`ACTION_SEND_MULTIPLE` intent filters for share target
- `MobileShareListener.tsx` and `/api/mobile/share` exist and handle share payloads silently today
- Root `package.json` has `mobile:build`, `mobile:sync`, `mobile:open:android`, `mobile:open:ios` scripts
- Background sync cron mirrors native X bookmarks — no changes required

### What this feature builds

- **New** `/mobile` route tree: `apps/web/src/app/mobile/` (does not exist yet)
- **New** `MobileShareSheet.tsx` component replacing the existing silent `MobileShareListener.tsx`
- **Modified** `capacitor.config.ts`: remove `server.url` block
- **Modified** `apps/web/next.config.ts`: add conditional `output: 'export'`
- **Modified** `apps/web/src/middleware.ts`: add `/mobile` redirect rule
- **Modified** `apps/web/src/app/dashboard/layout.tsx`: remove `<MobileShareListener />`
- **Modified** `/api/auth/x-login`: add `platform=mobile` support for custom scheme redirect
- **New** iOS `Info.plist` URL scheme registration
- **New** Android `AndroidManifest.xml` deep-link intent filter

### Target architecture

```
apps/web/
  src/app/
    dashboard/       ← existing web app (untouched)
    mobile/          ← NEW: all routes below are new
      layout.tsx     ← bottom tab bar, appUrlOpen listener, onboarding guard
      page.tsx       ← redirects to /mobile/home
      onboarding/    ← 5-screen onboarding flow
      home/
      bookmarks/
      ai/
      blend/
      more/
        page.tsx     ← profile + menu
        tags/
        lists/
        settings/
    api/             ← shared backend (unchanged)
```

**Platform detection:** `apps/web/src/middleware.ts` redirects all `/mobile/*` requests to `/dashboard` for web browsers. `/mobile/layout.tsx` also guards with `Capacitor.isNativePlatform()` client-side.

**Local bundle:** Remove `server.url` from `capacitor.config.ts`. `webDir: 'out'` (already set) serves the local static export. App shell loads instantly.

**Shared backend:** All mobile screens call the same existing API routes on Vercel. No new backend code required.

**Static export constraints:** All `/mobile` pages use client-side data fetching. No dynamic route segments — bookmark details open as modal overlays within list pages.

### Auth flow for mobile

The existing auth system uses a **custom token flow** (not Supabase-native OAuth). Understanding this is critical:

1. `/api/auth/x-login` generates a PKCE challenge, stores the verifier in a cookie, and redirects to X OAuth with `redirect_uri = APP_URL/api/auth/x-callback`
2. `/api/auth/x-callback` exchanges the code → fetches X user → upserts Supabase user via admin API → generates a magic link → verifies the OTP server-side → redirects to `/auth/set-session?access_token=...&refresh_token=...`
3. `/auth/set-session` (client page) calls `supabase.auth.setSession({ access_token, refresh_token })` → routes to `/dashboard`

**`supabase.auth.exchangeCodeForSession()` will NOT work** — this helper expects Supabase to be the OAuth provider. HAL uses X as the OAuth provider via a custom flow.

**Mobile implementation** — reuse the existing flow with a `platform` flag:

1. Mobile sign-in screen navigates to `/api/auth/x-login?platform=mobile` in the system browser
2. `/api/auth/x-login` stores `platform: 'mobile'` in the state cookie (alongside `codeVerifier` and `state`)
3. X OAuth completes and redirects to `/api/auth/x-callback` (redirect_uri is unchanged — X requires it to match a registered web URL)
4. `/api/auth/x-callback` reads `platform: 'mobile'` from the state cookie. Instead of redirecting to `/auth/set-session`, it redirects to `helloagainlinks://auth/callback?access_token=...&refresh_token=...`
5. iOS/Android intercepts the custom scheme URL and fires `appUrlOpen` in Capacitor
6. `/mobile/layout.tsx` handles the event:

```typescript
App.addListener('appUrlOpen', async ({ url }) => {
  if (url.startsWith('helloagainlinks://auth/callback')) {
    const params = new URL(url).searchParams;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.setSession({
      access_token: params.get('access_token')!,
      refresh_token: params.get('refresh_token')!,
    });
    router.push('/mobile/home');
  }
});
```

This requires **no change to Supabase config** and **no new redirect URLs** — X OAuth still calls back to the web server URL. Only `/api/auth/x-login` and `/api/auth/x-callback` need minor additions to thread the `platform` flag through the state cookie.

---

## 5. Navigation

**Bottom tab bar** with 5 tabs (replaces the sidebar used on desktop):

| Tab | Icon | Mobile Route | Maps From (web) |
|-----|------|-------------|-----------------|
| Home | ⬡ | `/mobile/home` | `/dashboard` |
| Bookmarks | 🔖 | `/mobile/bookmarks` | `/dashboard/bookmarks` |
| AI | ✨ | `/mobile/ai` | `/dashboard/assistant` |
| Blend | 🔗 | `/mobile/blend` | `/dashboard/blend` |
| More | ··· | `/mobile/more` | Tags + Lists + Settings collapsed |

Tags (`/dashboard/tags`) and Shared Lists (`/dashboard/lists`) are accessible via the More tab as push screens — they are not removed, just deprioritised for the mobile tab bar. The "AI" tab label maps to the existing "Assistant" feature.

The tab bar renders only within the `/mobile` layout. The existing `DashboardLayout` (sidebar) is untouched and continues to render for web users. No conditional rendering is added to existing components.

**Platform guard:** `/mobile/layout.tsx` checks `Capacitor.isNativePlatform()` on mount. If `false` (web browser), it redirects to `/dashboard`. This prevents web users from accessing mobile routes.

**More tab sub-routes:**

| Route | Purpose |
|-------|---------|
| `/mobile/more` | Profile header + menu list |
| `/mobile/more/tags` | Tag management (full list, create, edit) |
| `/mobile/more/lists` | Shared Lists (browse, create, join) |
| `/mobile/more/settings` | Account settings, sync status, plan |

The tab bar is always visible. Active tab shows a cyan glow dot indicator beneath the icon. Transitions use Framer Motion fade + slide (matching web app).

---

## 6. Screen Designs

All screens use the HAL design system:
- **Background:** `#0a0a0f` / `#0f1019`
- **Primary accent:** `#00d4ff` (cyan)
- **Text:** `#f0f0f5` (primary), `#8a8a9a` (secondary), `#4a4a5a` (muted)
- **Cards:** `glass` + `glow-border` CSS classes, 12–14px border radius
- **Font:** Inter
- **Motion:** Framer Motion (fade + slide on mount, haptics on key interactions)

### Home (`/mobile/home`)
- Greeting: "Hey, @username ⬡"
- 2×2 stats grid: Total Bookmarks, Tags, Blend Score, AI Searches
- "Recent" section: last 5 bookmarks as glass cards with author handle, truncated content, tag pills

### Bookmarks (`/mobile/bookmarks`)
- Search bar at top (full-width, glass style)
- Horizontal scrollable tag filter chips below search
- Infinite-scroll bookmark list with `BookmarkCard` adapted for mobile touch targets
- Swipe-left on a card reveals Delete action

### AI Assistant (`/mobile/ai`)
- Chat interface: bot bubbles (cyan tint, left-aligned) + user bubbles (glass, right-aligned)
- Input bar pinned to bottom with send button
- Placeholder: "Ask about your bookmarks..."
- Backed by existing `/api/ai/assistant` endpoint

### Blend (`/mobile/blend`)
- Score ring (circular, cyan glow) showing user's blend score
- "Top Matches" list: avatar, handle, shared topic tags, match percentage
- Invite link CTA for users with no matches yet

### More (`/mobile/more`)
- Profile header: avatar, display name, handle, plan badge
- Menu items: Tags, Shared Lists, Settings, Upgrade to Pro, Sign Out
- Tags and Shared Lists open as push screens within the More stack
- Sign Out shown in red, with confirmation

---

## 7. Share Extension — Save from X App

The primary save mechanism for mobile users. Appears as an overlay sheet on top of the X app without switching away from it.

### Flow

1. User taps **Share** on a tweet in the X app
2. System share sheet appears (iOS/Android native)
3. User taps **HAL** in the share options
4. HAL share extension opens as a **bottom sheet overlay** — X app stays visible and dimmed behind it
5. Sheet shows: tweet preview + animated skeleton tags (AI processing)
6. AI tagging completes: colored tag pills appear, success badge shown
7. User taps **"Done — Back to X"** → sheet dismisses, X app regains focus

### Relationship to existing `MobileShareListener`

The existing `MobileShareListener.tsx` silently saves the share payload without any confirmation UI. This spec replaces it with a two-state sheet UI. Implementation:

- **Archive** `apps/web/src/components/MobileShareListener.tsx` (do not delete)
- **Create** `apps/web/src/components/MobileShareSheet.tsx` — the new sheet component
- Remove `<MobileShareListener />` from `apps/web/src/app/dashboard/layout.tsx`
- Add `<MobileShareSheet />` to `apps/web/src/app/mobile/layout.tsx`
- The `/api/mobile/share` endpoint is **reused unchanged** — only the UI layer changes

### Platform Implementation

- **iOS:** `@capgo/capacitor-share-target` plugin — already installed (`^8.0.16`) and configured in `capacitor.config.ts` as `CapacitorShareTarget: { shareExtensionName: 'ShareExtension' }`. No new native code or Xcode targets needed.
- **Android:** `ACTION_SEND` / `text/plain` intent filter already defined in `AndroidManifest.xml`. The `@capgo/capacitor-share-target` plugin handles the intent and fires a JS event. No custom native Activity code needed.

**JS event subscription** (same for both platforms) in `MobileShareSheet.tsx`:

```typescript
import { ShareTarget } from '@capgo/capacitor-share-target';

ShareTarget.addListener('shareIntent', (data: { url?: string; text?: string; title?: string }) => {
  const tweetUrl = data.url ?? data.text ?? '';
  // Extract tweet URL from payload and call /api/mobile/share
});
```

The payload shape is `{ url, text, title }` — for tweets shared from X, the tweet URL arrives in `data.url`.

### Sheet States

**State 1 — Saving:**
- HAL logo + "Save to HAL" title + "AI tagging your bookmark..." subtitle
- Tweet preview card (author handle + truncated content)
- Animated shimmer skeleton for tags (3 placeholder pills)
- "Cancel" secondary button

**State 2 — Saved:**
- HAL logo + "Saved to HAL" title + "Auto-tagged by AI" subtitle
- Tweet preview card
- Colored tag pills (AI-assigned)
- Green success badge: "✓ Bookmark saved successfully"
- "Done — Back to X" primary CTA button

**State 3 — Error:**
- HAL logo + "Couldn't save" title
- Single-line error message: "Something went wrong. Try again." (network error) or "Already in your HAL" (duplicate)
- "Try Again" primary button — retries the save
- "Done" secondary button — dismisses without saving

**State 4 — Unauthenticated:**
- Shown when `MobileShareSheet` receives a share intent but no active Supabase session exists
- HAL logo + "Sign in to save" title + "Open HAL to sign in first" subtitle
- "Open HAL" primary button — closes the sheet and navigates to `/mobile/onboarding` (screen 2, Sign in with X)
- "Dismiss" secondary button

---

## 8. Native X Bookmark Mirror

Already functional. When a user taps X's native bookmark button, the content script (extension on desktop; background sync on mobile) captures the event and silently saves/removes the bookmark in HAL. No changes required — this runs via the server-side background sync cron job on mobile.

Users who prefer not to use the share extension can simply use X's bookmark button and HAL syncs automatically.

---

## 9. Onboarding Flow

5 screens with progress dot indicator. Shown only on first launch.

**First-launch detection:** On app start, `/mobile/layout.tsx` checks `Capacitor.Preferences.get({ key: 'onboarding_complete' })`. This is async — while the check resolves, render a splash screen (HAL logo centred on dark background) to prevent a flash of unrelated content. If the key is absent or `'false'`, route to `/mobile/onboarding`. On completion of screen 5, set `Capacitor.Preferences.set({ key: 'onboarding_complete', value: 'true' })` then navigate to `/mobile/home`.

| Screen | Purpose |
|--------|---------|
| 1. Welcome | HAL logo, tagline, "Get Started" + "I already have an account" |
| 2. Sign in with X | OAuth sign-in, permissions listed clearly (no posting permission) |
| 3. Two ways to save | Explains native bookmark mirror (zero taps) + share extension (AI-tagged) |
| 4. Enable share extension | Step-by-step iOS setup guide. Has "Skip for now" option. Android skips this screen entirely. |
| 5. All set | Confirmation, feature summary, "Go to my bookmarks" CTA |

**Returning users** ("I already have an account" on screen 1) skip screens 3–5 and go directly to sign-in, then straight to the home tab.

---

## 10. Configuration Changes

### `capacitor.config.ts`

Remove the `server.url` override so the app loads from the local bundle:

```typescript
// Before
server: { url: 'https://helloagain-three.vercel.app', cleartext: false },

// After — remove the server block entirely
// webDir: 'out' is already set and will be used
```

No changes to the `plugins` block — `CapacitorShareTarget` config remains as-is.

### `apps/web/next.config.ts`

`output: 'export'` disables API routes and SSR for the entire app — applying it unconditionally would break the Vercel web deployment. Use a `BUILD_TARGET` environment variable to conditionally enable it for mobile builds only:

```typescript
output: process.env.BUILD_TARGET === 'mobile' ? 'export' : undefined,
```

Update `mobile:build` in root `package.json` to pass the variable:

```json
"mobile:build": "BUILD_TARGET=mobile pnpm --filter @helloagain/web run build && pnpm --filter @helloagain/web exec cap sync"
```

Vercel deployment continues to run standard `next build` (no `BUILD_TARGET`) — API routes and SSR are unaffected.

**Routing `/mobile` on Vercel:** Since `/mobile` routes also exist in the Vercel deployment, add a rule to `apps/web/src/middleware.ts` to redirect all `/mobile/*` requests to `/dashboard`. The client-side `Capacitor.isNativePlatform()` guard in `/mobile/layout.tsx` acts as a secondary fallback.

### Auth deep-link handling (code, not config)

`App: { appUrlOpen }` is not a valid `capacitor.config.ts` key. Deep-link handling is done in code. The listener must be mounted in `apps/web/src/app/mobile/layout.tsx` **which must also wrap the `/mobile/onboarding` routes** — the auth callback fires during onboarding (screen 2: Sign in with X).

By the time `appUrlOpen` fires, the server-side `x-callback` route has already completed the full token exchange and the URL contains resolved Supabase session tokens:

```typescript
import { App } from '@capacitor/app';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// In a useEffect on mount:
App.addListener('appUrlOpen', async ({ url }) => {
  if (url.startsWith('helloagainlinks://auth/callback')) {
    const params = new URL(url).searchParams;
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.setSession({
      access_token: params.get('access_token')!,
      refresh_token: params.get('refresh_token')!,
    });
    router.push('/mobile/home');
  }
});
```

No changes to `getSupabaseBrowserClient()` — PKCE is handled server-side in `x-login`/`x-callback`. The browser client never participates in code exchange and `flowType` does not need to be set.

### iOS — `Info.plist`

Register the custom URL scheme so iOS can deep-link back into the app after X OAuth:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>helloagainlinks</string>
    </array>
  </dict>
</array>
```

### Android — `AndroidManifest.xml`

Add an intent filter to the main activity for the deep-link scheme:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="helloagainlinks" android:host="auth" />
</intent-filter>
```

### Supabase Dashboard

No Supabase redirect URL changes needed. The mobile auth flow redirects through the existing web server callback URL (`/api/auth/x-callback`) before issuing the custom scheme redirect — Supabase is not involved in the OAuth redirect.

---

## 11. Build & Distribution

### Build sequence

```bash
# 1. Build Next.js static export (produces out/)
pnpm mobile:build
# Runs: next build (in apps/web) + cap sync — defined in root package.json

# 2. OR individually:
pnpm mobile:sync                   # cap sync only — copies out/ into iOS/Android projects

# 3. Open native IDE
pnpm mobile:open:android           # Android Studio — build signed APK/AAB
pnpm mobile:open:ios               # Xcode — archive for App Store
```

`pnpm mobile:sync` is defined in root `package.json` as `pnpm --filter @helloagain/web exec cap sync` and already exists in the codebase.

### CI pipeline changes

Extend existing GitHub Actions workflows (`.github/workflows/`) to:
- Run `BUILD_TARGET=mobile next build` (static export) on push to `main`
- Run `npx cap sync` after build
- Build signed Android AAB for Play Store upload
- Build and archive iOS IPA for App Store upload (requires macOS runner)

### Distribution requirements

- **Apple Developer Program** account ($99/year) required for App Store Connect submission
- **Google Play Console** account ($25 one-time) required for Play Store submission
- App IDs: `com.helloagainlinks.app` (already set in `capacitor.config.ts`)
- Both stores require privacy policy URL, screenshots, and app description before review

---

## 12. Design System Preservation

The mobile app uses the same Tailwind config, CSS variables, and glass/glow CSS classes as the web app. No new design tokens are introduced. Mobile-specific components (`MobileShareSheet`, mobile `BookmarkCard` variant, bottom tab bar) live entirely within `apps/web/src/app/mobile/` and `apps/web/src/components/` — no changes to `packages/ui` are required.

---

## 13. Out of Scope / Future Phases

- **Offline bookmarks:** Service worker caching of bookmark data for offline reading
- **Push notifications:** "New bookmarks synced" or Blend match notifications
- **iOS Safari Extension:** Separate project for users browsing x.com in mobile Safari
- **Widgets:** iOS/Android home screen widgets showing recent bookmarks
- **React Native migration:** Not recommended — Capacitor is the long-term platform choice
