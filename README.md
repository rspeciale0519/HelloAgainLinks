# Hello Again Links (HAL)

AI-powered bookmark manager for X/Twitter.

## Mobile App (Capacitor)

HAL now supports iOS and Android via Capacitor.

### What was added

- Capacitor runtime in `apps/web`
- Native projects:
  - `apps/web/android`
  - `apps/web/ios`
- Share Target support (receive shared X links from other apps)
- Haptics support on key interactions
- Pull-to-refresh on mobile bookmark list
- Background bookmark sync API endpoint (server-side)

### Capacitor config

`apps/web/capacitor.config.ts`

- `appId`: `com.helloagainlinks.app`
- `appName`: `Hello Again Links`
- `webDir`: `out`
- `server.url`: `https://helloagain-three.vercel.app`

> We use `server.url` so native apps can point to the deployed web app/API while still keeping Capacitor-native integrations.

## Share Sheet / Share Target

### Android

Intent filters were added in:

- `apps/web/android/app/src/main/AndroidManifest.xml`

Configured to receive `SEND` and `SEND_MULTIPLE` with `text/plain`.

### iOS

Plugin integrated via Capacitor sync (`@capgo/capacitor-share-target`).

To finalize release-ready iOS share extension behavior in Xcode:

1. Open iOS project: `pnpm mobile:open:ios`
2. Add/verify Share Extension target in Xcode if prompted by plugin workflow
3. Ensure extension activation supports URLs and text
4. Build and test from device Share Sheet

### In-app shared URL handler

- Listener component: `apps/web/src/components/MobileShareListener.tsx`
- API endpoint: `POST /api/mobile/share`

Flow:

1. Receive share event from native Share Sheet
2. Extract X/Twitter status URL
3. Save bookmark
4. Trigger AI auto-tagging

## Background Bookmark Sync (Server-side)

Endpoint: `POST /api/sync/background`

Modes:

- **Cron mode**: provide `x-bookmark-sync-secret` header matching `BOOKMARK_SYNC_SECRET`
  - Syncs users with connected X tokens
- **User mode**: authenticated request
  - Syncs current user

Behavior:

- Uses stored X OAuth access/refresh tokens
- Refreshes token when needed
- Imports new bookmarks, skips duplicates
- Applies AI auto-tags

## Mobile Scripts

From repo root:

- `pnpm mobile:build` – build/export web + sync native
- `pnpm mobile:sync` – sync Capacitor native projects
- `pnpm mobile:open:android` – open Android Studio project
- `pnpm mobile:open:ios` – open Xcode project

## Local mobile workflow

1. `pnpm install`
2. `pnpm mobile:sync`
3. `pnpm mobile:open:android` or `pnpm mobile:open:ios`
4. Run app from Android Studio/Xcode

## Environment variables

Server-side sync and tagging rely on existing env vars:

- `X_CLIENT_ID`
- `X_CLIENT_SECRET`
- `XAI_API_KEY`
- `BOOKMARK_SYNC_SECRET` (new, recommended for cron mode)
