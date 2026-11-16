---
name: verify-hal
description: Verify Hello Again Links (HAL) — the Next.js web app (landing, login, dashboard, legal, install), Chrome MV3 extension, and Capacitor iOS/Android shell. Use before claiming UI or app work is done, or when you need to launch the web app locally, run a read-only doctor check, drive a mapped user flow in Chromium, and keep screenshots as evidence.
---

# Verify Hello Again Links

Read this cold. Drive the **web app** the way a user does. Do not claim a UI change done until launch, doctor, and one mapped feature have run, with screenshots of the action and the resulting state.

Primary surface: Next.js 15 App Router web app in `apps/web` (`pnpm --filter @helloagain/web exec next dev`). Secondary: Chrome MV3 extension in `apps/extension` (needs a Chromium profile + unpacked `dist`; this skill does not load it). Secondary: Capacitor iOS/Android shell wrapping the same web app (`apps/web/ios`, `apps/web/android`) — **not driveable without a device or emulator**; see Capacitor below.

There is **no mock/test-mode stack** and **no unit/integration test suite**. Public pages can be driven with verification placeholders. Authenticated dashboard, X bookmark import, Grok, and Stripe cannot. Never put secrets in committed files, never use real X API keys, never use real user data.

## Install / build / lint / typecheck / tests

Run from the repo root. Record the real exit code. Do not invent a missing gate.

| Gate | Command | What exists |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | Root + workspaces. `packageManager` is `pnpm@10.28.2`. |
| Build | `pnpm build` | `turbo build`: `tsc` for `@helloagain/shared` and `@helloagain/ui`; `tsc && vite build` for `@helloagain/extension`; `next build` for `@helloagain/web`. |
| Lint | `pnpm lint` | `turbo lint` (`dependsOn: ^build`). Only `@helloagain/web` has a real linter (`next lint`). `@helloagain/ui-hal` lint is `echo "(no eslint configured for ui-hal yet)"`. Other packages have **no** lint script. |
| Typecheck | See below | **No** root `typecheck` script and **no** turbo `typecheck` task. |
| Tests | `pnpm test` | **Missing.** No `test` script, no `*.test.*` / `*.spec.*` files, no Jest/Vitest/Playwright test suite. `pnpm test` fails with `Missing script: test`. Report that; do not add tests as part of a verification run. |

Typecheck commands that actually exist:

```bash
pnpm --filter @helloagain/ui-hal type-check          # tsc --noEmit (the only type-check script)
pnpm --filter @helloagain/web exec tsc --noEmit      # web has no typecheck script; this is the ad-hoc equivalent
```

`pnpm build` already typechecks shared, ui, and the extension (`tsc` in their build scripts) and typechecks web via `next build`.

One-shot recorder (writes `evidence/<run>/gates.json`):

```bash
bash .cursor/skills/verify-hal/scripts/gates.sh
```

Playwright Chromium (needed only for Drive), once per machine:

```bash
pnpm exec playwright install chromium
```

## Launch

Exact command:

```bash
bash .cursor/skills/verify-hal/scripts/launch.sh
```

What it does:

- Builds `@helloagain/shared` and `@helloagain/ui` (`tsc` → `dist/`). Next resolves those packages from `dist/`, so a cold `pnpm install` is not enough to serve `/`.
- Starts **only** `@helloagain/web` with `pnpm --filter @helloagain/web exec next dev --hostname 127.0.0.1 --port 4370`.
- Default URL: `http://127.0.0.1:4370`. Override with `HAL_VERIFY_PORT`.
- Ready means `GET /` returns HTML containing `Hello Again Links` or `Your X Bookmarks`, not merely that a port is open. First compile can take ~60s; the script waits up to 120s (`HAL_VERIFY_READY_TIMEOUT`).
- Loads `apps/web/.env.local` if present (values never printed). If that file is missing, sets verification **placeholders** for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `X_CLIENT_ID`, `X_CLIENT_SECRET`, and `NEXT_PUBLIC_APP_URL`. Placeholder names are documented in `apps/web/.env.example`. Do not commit `.env.local`. Do not substitute real keys.
- Writes pid/url/evidence path under `/tmp/hal-verify/current`.
- Refuses to start if that pid is still alive or if port 4370 is already taken. Do not hijack a developer's `next dev` on 3000.
- Isolation limit: two `next dev` processes on the same checkout share `apps/web/.next`. Run **one** verify instance per checkout.

Teardown is not part of launch. Use Cleanup.

Env names the web app can read (document names only; never log values):

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- X OAuth: `X_CLIENT_ID`, `X_CLIENT_SECRET`
- xAI/Grok: `XAI_API_KEY`, `GROK_MODEL_FAST`, `GROK_MODEL_FULL`
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- App: `NEXT_PUBLIC_APP_URL`
- Mobile/sync: `BOOKMARK_SYNC_SECRET`, `MOBILE_AUTH_HANDOFF_SECRET`, `NEXT_PUBLIC_MOBILE_AUTH_CALLBACK_URL`

## Doctor

```bash
bash .cursor/skills/verify-hal/scripts/doctor.sh
```

Read-only. Run before the first drive, after any failed drive, and whenever the instance looks off. Passes only when all of these hold:

- The pid recorded by launch is still alive and its cmdline is the next/pnpm process we started.
- Port `HAL_VERIFY_PORT` is owned by that pid or a descendant — not some other server. Lookup order: `ss`, then `lsof`, then `/proc/net/tcp` + `/proc/*/fd` (this VM has no `ss`).
- `GET $URL/` contains the HAL identity string.
- Prints `auth_driveable=0` when env came from placeholders. In that case drive public features only.

Never drive an instance this run did not start.

## Drive

Harness: Playwright Chromium via `drive.mjs`. There was no existing browser harness in the repo; this is the verification helper. Prefer role + accessible name. Public pages have almost no ARIA; use heading/link/button names from the source.

```bash
node .cursor/skills/verify-hal/scripts/drive.mjs --feature landing
```

`--feature` is one of: `landing`, `sign-in`, `legal`, `install-extension`, `dashboard-bookmarks`.

One-shot (launch → doctor → drive one feature → cleanup → confirm evidence survived):

```bash
node .cursor/skills/verify-hal/scripts/run.mjs --feature landing
```

Read `features/README.md` and the matching feature file before driving. Drive the user path in the feature file, not an internal setter or a test-only endpoint. The map lists every entry point; proving one convenient path is incomplete when the file lists others.

Stable handles from this repo:

- Landing `/`: heading `Your X Bookmarks, Reimagined`; links `Sign In`, `Get Started` (`/login`); link `Install Chrome Extension` (`/install`); in-page `See Features` (`#features`).
- Login `/login`: heading `Welcome back`; button `Continue with X` (navigates to `/api/auth/x-login`); links `Terms`, `Privacy Policy`, `← Back to home`.
- Privacy `/privacy`: heading `Privacy Policy`; links `Terms of Service`, `Home`.
- Terms `/terms`: heading `Terms of Service`; links `Privacy Policy`, `Home`.
- Install `/install`: heading `Install the Chrome Extension`; link matching `Download Extension` (external GitHub releases — do not follow as proof of HAL).
- Dashboard `/dashboard`: eyebrow `DASHBOARD · HOME`; nav buttons `Dashboard`, `Bookmarks`, `Tags`, `Shared Lists`, `Blend`, `Assistant`; search placeholder `Search bookmarks…` on `/dashboard/bookmarks`. **Requires a session.**

OAuth boundary: clicking `Continue with X` is as far as a no-secret run may go. Do not complete X login, do not paste real tokens, do not capture real bookmarks.

## Evidence

Location: `.cursor/skills/verify-hal/evidence/<run_id>/` (gitignored). Launch prints the path; cleanup must leave it in place.

Proof standards:

- Exercise the real user path in a real browser, not `router.push` from the console and not internal API setters.
- Capture the action and the resulting state (at least two screenshots per feature: before/after or origin/destination).
- `drive-report.json` records the feature id, entry point, and each step.
- Side effects: public pages have none beyond navigation. Do not call `/api/bookmarks`, `/api/import`, `/api/sync/background`, or Stripe as "proof" — those mutate or require secrets.
- Mocks only where a production boundary already isolates the system. This app has no such test double. Placeholders make the process boot; they are not a fake X/Supabase.
- When a path is blocked, the report must name the unmet precondition and the route attempted. Do not mark it verified via a different path.

## Cleanup

```bash
bash .cursor/skills/verify-hal/scripts/cleanup.sh
```

Kills the recorded pid and its descendants only. Never `pkill next` / `killall node`. Drops `/tmp/hal-verify/current` and the instance log. **Does not delete evidence.** After cleanup, `ls` the evidence directory and require the screenshots still exist.

If a drive fails, run cleanup before the next launch so ports and pids are not stranded.

## Helpers

All scripts are executable. From repo root:

```bash
bash .cursor/skills/verify-hal/scripts/launch.sh
bash .cursor/skills/verify-hal/scripts/doctor.sh
node .cursor/skills/verify-hal/scripts/drive.mjs --feature landing
bash .cursor/skills/verify-hal/scripts/cleanup.sh
node .cursor/skills/verify-hal/scripts/run.mjs --feature landing
bash .cursor/skills/verify-hal/scripts/gates.sh
pnpm verify -- --feature landing
```

`pnpm verify` is `node .cursor/skills/verify-hal/scripts/run.mjs`.

## Capacitor mobile (secondary)

`apps/web` is also a Capacitor app (`appId` `com.helloagainlinks.app`, `webDir` `out`). Native projects: `apps/web/android`, `apps/web/ios`. Middleware redirects `/mobile` and `/mobile/*` to `/dashboard` for ordinary browsers, so the mobile routes are **not** a web-verification target.

Can verify without a device:

- `pnpm mobile:build` / `pnpm --filter @helloagain/web run build` (web compile).
- Presence of `apps/web/capacitor.config.ts`, Android/iOS project trees.

Cannot verify without a device or emulator (report `verified-unreachable`):

- Share sheet / Share Target ingestion (`POST /api/mobile/share`).
- Haptics, pull-to-refresh, `helloagainlinks://` deep links, App Links.
- iOS Share Extension (the Xcode project has no share-extension target; onboarding still mentions it).
- Native session handoff (`MOBILE_AUTH_HANDOFF_SECRET`).

Do not add paid device farms or new accounts to work around this.

## Chrome extension (secondary)

`apps/extension` (`Hello Again Links — X Bookmark Manager`, v0.5.5). Build: `pnpm --filter @helloagain/extension build` (also part of `pnpm build`). Driving save/import requires x.com, an unpacked extension, and a signed-in HAL session. Out of scope for a no-secret web run. The `/install` page is the user-facing web stand-in.

## Feature map

Index: [`features/README.md`](features/README.md). Seeded features: landing, sign-in, legal, install-extension, dashboard-bookmarks. Keep the map current with `/maintain-verification-skill`.
