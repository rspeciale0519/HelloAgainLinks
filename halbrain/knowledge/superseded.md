---
kind: knowledge
slug: superseded
status: current
updated: 2026-07-24
layer: reference
sources:
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - docs/dev-docs/PRD.md
  - package.json
  - apps/web/src/lib/grok.ts
  - apps/web/src/app/auth/set-session/page.tsx
  - claude-memory:project_hal_redesign_open_bugs.md (Claude Code auto-memory, 2026-04-26)
---

# Superseded — doc-vs-truth deltas

Genuine discrepancies only, each with both sides cited. This is not "no
deltas found" — real gaps exist below — but Signal Boards/Pulse/CKG being
absent from code is **not** a delta; PRD explicitly lists those as
post-MVP-out-of-scope and the code agrees. See [[knowledge/features]] for
the full evidence-gated build status.

## 1. `DEVELOPMENT_ROADMAP.md` Phase 1-3 MVP checkboxes are stale, not a build-status signal
The doc's original Feb-7 "Phase 1/2/3: Foundation, AI Integration, Bookmark Blend" section (lines ~92-254) shows every item as `- [ ]` unchecked — extension scaffold, Stripe, Grok client, auto-tag, Blend infra, etc. All of it is actually BUILT (verified directly in code, see [[knowledge/features]]). Only the later "Active Initiative: HAL Dashboard Redesign" section at the top of the file was kept up to date with checkmarks. **Do not use the Phase 1-3 checkbox state as evidence of what's built** — always check code directly or consult [[knowledge/features]].

## 2. PRD self-contradicts on mobile-app scope
`docs/dev-docs/PRD.md` §10 "Out of Scope (Post-MVP)" lists "Mobile app (iOS/Android)" — but the same file's later appended section "Mobile App Support (Capacitor) — Added" describes it as shipped, and it is BUILT in code (`apps/web/capacitor.config.ts`, `apps/web/ios/`, `apps/web/android/`). The PRD is dated 2026-02-07 and predates the mobile work; the out-of-scope line is stale. Firefox extension, listed in the same out-of-scope bullet, remains genuinely unbuilt — that half of the line is still accurate.

## 3. Package-manager version mismatch
`DEVELOPMENT_ROADMAP.md` Tech Stack table states pnpm "9.x". Root `package.json` declares `"packageManager": "pnpm@10.28.2"`. Trust `package.json`.

## 4. AI Assistant "function calling" is documented but not implemented
PRD §3.2 describes the AI Assistant using "Grok function calling" for bookmark CRUD/discovery. Actual code (`apps/web/src/lib/grok.ts`, `apps/web/src/lib/grok-conversation.ts`) sends plain chat completions with no `tools`/`tool_choice`/`function_call` parameter anywhere (confirmed by direct grep, independently re-verified). Citations use a `[bm:<uuid>]` text-marker convention parsed client-side. The chat UI itself (`packages/ui/hal/src/signal/AskTab.tsx`) is real and streaming — only the "function calling" mechanism claim is inaccurate.

## 5. Blend shareable OG card is documented but not implemented
PRD §3.3 describes a "Shareable Card (1200×630 OG image) optimized for posting to X." No `/api/og`, `ImageResponse`, or `opengraph-image` route exists anywhere in `apps/web` (confirmed by direct grep, independently re-verified). Blend invite/analysis/score/feed are otherwise BUILT.

## 6. Grok `x_search()` / Collections API documented, not wired
PRD describes "Related Content" using Grok's `x_search()` tool and PRD's roadmap describes Collections API usage for Community Knowledge Graphs. `findRelatedPosts()` in `grok.ts:324-338` has only a comment referencing `x_search` — no tool params are actually passed. No Collections API usage found anywhere. Related-content still works (BUILT), just via a plain Grok chat call, not the documented tool-use mechanism.

## 7. Mobile spec claims the sync cron is "already functional" — it is not wired
`docs/superpowers/specs/2026-03-17-mobile-x-support-design.md` §8 states the native X bookmark mirror "runs via the server-side background sync cron job on mobile. No changes required." **No server-side cron exists** — `apps/web/vercel.json` still has no `crons` entry and nothing calls `/api/sync/background` with the `x-bookmark-sync-secret` header. The roadmap is honest about this ("Add background sync scheduler wiring" — unchecked); the spec overclaims.

**Updated 2026-07-24 (partially superseded):** the original claim that "the only live trigger is a manual button" is now stale. Since `3ec14ad` (2026-07-19) a **client-side** app-open/resume auto-sync exists (`apps/web/src/lib/use-auto-sync.ts`, native-only, 2min throttle, wired in `app/layout.tsx`), alongside the manual button (`mobile/more/settings/page.tsx`). So the onboarding copy ("HAL automatically syncs it in the background — no extra steps") is now *approximately* true on mobile — but only while the user opens/resumes the app, never truly in the background, and the spec's specific "server-side cron" mechanism claim remains false. Separately, sync currently imports nothing regardless of trigger because the X developer account is **out of API credits (402)** — an external billing blocker, surfaced honestly since `3114da3`.

## Operator corrections (re-verified this pass, source: `claude-memory:project_hal_redesign_open_bugs.md`, 2026-04-26)
Still present, unchanged:
- **set-session StrictMode auth flash** — `apps/web/src/app/auth/set-session/page.tsx:83` unconditionally `router.push('/login?error=no_tokens')` inside a `useEffect` with no guard against StrictMode double-invocation. Cosmetic (~1s red flash) but user still lands authenticated.
- **`HalMobileBar`/`HalDrawer` dead code** — `apps/web/src/components/hal/{HalMobileBar,HalDrawer}.tsx` still exist, zero references anywhere else, not archived.
- **`HalSearchBar` never absorbed into ⌘K palette** — still rendered unconditionally (not mobile-gated) in `dashboard/bookmarks/page.tsx:484`, despite Phase 5 (palette) being marked complete.
- **`.env.local` `NEXT_PUBLIC_APP_URL=http://localhost:3001`** — must be overridden/reverted before prod deploy; prod value present but commented out.
- **`.env.local` DB credentials are inconsistent (found 2026-07-24)** — `SUPABASE_DB_PASSWORD` is **stale**: it fails authentication against the prod database (`FATAL: password authentication failed`). Only the password embedded in `DIRECT_DATABASE_URL` authenticates — and that URL is itself malformed, because the password contains a literal `%` that is not percent-encoded, so standard URI parsers (libpq included) reject the string outright. Anything reading `DIRECT_DATABASE_URL` as a URI will fail. Likely fallout from the 2026-06-18 key rotation (`claude-memory:reference_credentials`). Fix both: rotate/refresh `SUPABASE_DB_PASSWORD` and percent-encode the URL's password. (Names only here — no values; see [[skills/supabase-definer-rpc-authz]] for the read-only verification path that avoids needing these at all.)
- **`@helloagain/ui-hal` lint script is a no-op echo** — `packages/ui/hal/package.json`, unchanged.
- **`apps/extension/{content.ts,background.ts}` exceed the 450-LOC file cap, and grew** — now 580 LOC / 687 LOC respectively (were 541/562 at the 2026-04-26 memory date). Getting worse, not better.
- **`StatusDot` division-by-zero calc trick** — `packages/ui/hal/src/primitives/StatusDot.tsx:26`, `calc(2s / var(--hal-pulse-on, 1))`, unchanged.
- **Tag filtering is client-side-only** — `dashboard/bookmarks/page.tsx` filters `rawBookmarks` in a `useMemo` post-fetch; `use-bookmarks-data.ts` only sends `folder_id`, never `tag_ids[]`. Cross-page filtering and pagination math are still broken as originally flagged.

Resolved since 2026-04-26 (no longer applicable):
- **`SignalPlaceholder`** — moved to `archive/phase2-signal-placeholder/SignalPlaceholder.tsx` as planned, matches `DEVELOPMENT_ROADMAP.md` note. Confirmed archived, not just claimed.
- **`@helloagain/ui-hal` React peerDependency** — now `^19.0.0` (was pinned `^18.0.0`), matches the monorepo's React 19. Confirmed fixed in `packages/ui/hal/package.json`.
