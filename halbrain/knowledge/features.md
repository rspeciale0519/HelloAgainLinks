---
kind: knowledge
slug: features
status: current
updated: 2026-07-31
layer: reference
sources:
  - docs/dev-docs/PRD.md
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - apps/extension/src/background.ts
  - apps/web/src/lib/grok.ts
  - apps/web/src/lib/grok-conversation.ts
  - apps/web/src/lib/quota.ts
  - apps/web/src/lib/llm-usage.ts
  - apps/web/src/lib/blend-engine.ts
  - apps/web/src/app/dashboard/bookmarks/page.tsx
  - packages/shared/src
  - supabase/migrations
---

# Features — build status (evidence-gated)

BUILT = entrypoint exists, non-stub, wired end-to-end (cited). PARTIAL =
exists but incomplete/unwired piece. PLANNED = no code entrypoint found.
ORPHANED = compiles, works, zero callers. Full re-audit 2026-07-31 (5 parallel
verification passes over `develop` @ `8ac341f`; `turbo build` + lint green).
Line numbers cited as of that commit.

## Chrome Extension (apps/extension, v0.5.4)
- One-Click Save — BUILT — `background.ts:664 handleSaveBookmark()`; injected HAL button + native-bookmark mirroring both directions (`content.ts:355-430`)
- Bulk Import (direct-GraphQL + scroll-intercept fallback) — BUILT — `background.ts:141 handleStartBulkImport()`, `direct-import.ts:244`, `x-interceptor.ts` (MAIN-world fetch/XHR patch), `graphql-parser.ts:135` (handles `Bookmarks` + `BookmarkFolderTimeline`)
- Save-order preservation — BUILT (PR #41) — descending synthetic cursor `background.ts:250` (`startedMs - ingestOffset++ * 1000`), spans batches
- REBUILD ORDER repair — BUILT (PR #43, v0.5.4) — settings-page button → `dashboard.ts:40-49` → `START_BULK_IMPORT {reorder:true}` → server rewrites only `bookmarked_at` on existing rows (`bookmark-upsert.ts:71-82`), counted separately as `reordered`
- Search — BUILT — `background.ts:693` → `/api/bookmarks/search` (Postgres FTS)
- Folders (X folder-walk import, main-first) — BUILT — `folder-walk-import.ts:62 startMainFirstImport()`; root sweep imports bookmarks, folder walk collects assignments only; POST to `/api/folders/import-x` happens in `background.ts:354` (NOT in folder-walk-import.ts)
- Quick Access Sidebar — PARTIAL — `sidepanel/SidePanel.tsx` is complete (search/tag/folder filters, pagination, delete), **but the toolbar open path is broken**: `manifest.json` sets `action.default_popup`, so `chrome.action.onClicked → sidePanel.open()` (`background.ts:705-709`) never fires; panel reachable only via Chrome's own side-panel menu
- Export (CSV/JSON) — PLANNED ✓ — zero export code, no `downloads` permission (re-confirmed 2026-07-31)
- Not built: offline save queue, Save+Tag quick selector, recent-searches history (all re-confirmed absent)
- Dead code: `HAL_FOLDERS_IMPORT_X` relay (`background.ts:528-536`, no sender), `fetchServerQueryId()` (`background.ts:433-439`, never called)
- LOC caps blown: `background.ts` **709**, `content.ts` **580**, `Popup.tsx` 579

## AI (apps/web/src/lib, api/*)
- **Live NL-query path is the chat**, not `/api/ai/search`: deterministic query-rewrite (`grok-conversation.ts:80 rewriteQueryForSearch()`) → FTS retrieval → prompt with `[bm:<uuid>]` citation contract, resolved **server-side** to numbered citations (`extractCitations` `grok-conversation.ts:284-312`)
- Smart natural-language search endpoint — ORPHANED — `api/ai/search/route.ts` exists (calls `grok.ts:287 parseSearchIntent()`), zero UI callers; live search is `/api/bookmarks/search` → `search_bookmarks` RPC
- Auto-categorization (two-tier) — BUILT — Tier 1 regex runs on EVERY upsert path (`bookmark-upsert.ts:126-139`, incl. extension batch); Tier 2 `enrichBookmarkLLM()` (`grok.ts:136-198`, Zod-validated `{ai_summary, ai_tags}`, ≥0.6 → tag rows) via `/api/bookmarks/classify` banner or X-sync
- **Defect:** X-sync classify path discards enrichment — `sync/background/route.ts:185-193` writes only category/domain, drops `ai_summary`/`ai_tags`
- Related content — BUILT — live route is `/api/bookmarks/[id]/related` → RPC `get_related_bookmarks` (0.5×category + 0.5×tag-Jaccard, migration 007); `/api/ai/related/[bookmarkId]` (LLM-driven) is ORPHANED
- Summaries — BUILT via enrichment `ai_summary` on cards/Spread; `/api/ai/summarize` endpoint ORPHANED
- Duplicate detection — ORPHANED — `/api/ai/duplicate-check` exists, zero callers, **no plan gate, no quota**
- AI Assistant chat — BUILT (streaming SSE, no function calling) — `streamGrokChat()` `grok-conversation.ts:319`; **zero `tools`/`tool_choice`/`function_call` params anywhere** (re-confirmed); PRD function-calling claim remains false → [[knowledge/superseded]]
- Grok `x_search()` / Collections — PLANNED — comments only (`grok.ts:344,347`)
- Embeddings/pgvector — PLANNED — zero vector code anywhere (re-confirmed)
- **Quota/rate-limiting — BUILT (new since 07-24 pass)** — `lib/quota.ts enforceQuota()` + atomic `consume_quota` RPC (migration **011**), per-plan windows (`packages/shared/src/plans.ts`: free chat = 25-message *lifetime* trial) + global daily circuit breaker; fails closed; `Retry-After` emitted
- **LLM cost tracking — BUILT** — `lib/llm-usage.ts logLlmUsage()` structured per-call token+USD lines, wired into both call paths
- **Unmetered Grok paths (defect):** `/api/ai/assistant` (legacy; live consumer = mobile AI page `mobile/ai/page.tsx:50`, NOT the extension; also always reports "Total bookmarks: 0" — `countData?.length` on head-count query), `/api/ai/duplicate-check`, `blend-engine.ts` (which also defaults to decommissioned `grok-3` when `GROK_MODEL_FULL` unset)
- **Gating inconsistency (defect):** AskTab hard-locks free users client-side (`AskTab.tsx:263`) while the server allows the 25-msg trial via `/dashboard/assistant`, and mobile hits the unmetered legacy route
- Not built: retry/backoff (all clients throw on first non-2xx), response caching

## Bookmark Blend
- Invite flow — **PARTIAL, viral loop broken** — create (`POST /api/blends`), public details + accept (`api/blends/invite/[code]`) work, but the returned `inviteUrl` targets `/blend/invite/[code]` and **no `/blend/** page exists → every invite link 404s** (`api/blends/route.ts:57`). No decline route. Accept requires a direct API POST.
- Taste analysis / Blend Score — BUILT, mechanism differs from docs — single Grok call over last 25 bookmarks + tags per user; **model invents the 0-100 score** (no cosine/Jaccard math); parse failure → hardcoded score 50 fallback (`blend-engine.ts:116-130`); unmetered
- Dashboard + mobile blend pages — BUILT (list + create + copy link only; no detail view)
- Shareable OG card — PLANNED ✓ — no `ImageResponse`/`satori`/`next/og`/OG meta anywhere (re-confirmed)
- Blend public page / Blend Feed — PLANNED — zero code
- Privacy controls — PLANNED ✓ (upgraded from UNVERIFIED) — zero matches for `blend_opt_in`/`blend_excluded*`; analysis reads counterparty data unconditionally on accept
- Free-tier 1/month cap — BUILT but leaky — counts `blends` for `user_a_id` at invite creation only; unlimited invites until accept, unlimited accepts as `user_b_id`; outside the atomic quota system
- `blends`/`blend_invites` schema — CONFIRMED untracked — no DDL in migrations 001-011; all `api/blends/*` handlers use the RLS-bypassing service client with hand-written `.or()` ownership filters (no DB backstop)

## Signal Boards / The Pulse / Community Knowledge Graphs (roadmap Phases 4-6)
All three — PLANNED — zero code (re-confirmed 2026-07-31). Consistent with PRD's out-of-scope list.

## Mobile app (Capacitor, apps/web)
- Native shells — BUILT — `capacitor.config.ts`, `ios/App/`, `android/app/`
- Share target — PARTIAL — Android intent filters + `MobileShareSheet` + `POST /api/mobile/share` (auto-tags) work, **but** (a) response-shape mismatch: sheet reads `data.bookmark.*` / expects 409 for dupes; route returns `{status,id,tags}` / 200 — tags never display, duplicates render as saves; (b) `MobileShareListener.tsx` is dead code
- **iOS Share Extension — MISSING (defect)** — no app-extension target in the Xcode project, yet `capacitor.config.ts:12` names `ShareExtension` and iOS onboarding step 4 teaches enabling it. Native iOS share-sheet ingestion non-functional.
- Background sync — BUILT — `api/sync/background/route.ts`, 5-guard, cron+user modes, order-preserving descending cursor (`route.ts:109-156`); X-402 surfaced via `xApiError` **body field on HTTP 200** (only `mobile/more/settings/page.tsx:30-34` decodes it — any consumer checking `res.ok` sees success)
- App-open/resume auto-sync — BUILT — `lib/use-auto-sync.ts`, native-only, **15-min throttle** (widened from 2 min for X API cost; comment at `:10-14`), wired in `mobile/layout.tsx:44` (NOT root layout)
- Onboarding — BUILT — 5 steps on iOS / 4 on Android (`TOTAL_STEPS = isIOS ? 5 : 4`); iOS step 4 references the missing share extension
- Pull-to-refresh/haptics, `helloagainlinks://` + App Links, mobile sort control — BUILT
- CI — BUILT — Codemagic (iOS→TestFlight build 15+, Android AAB on push to develop) + GH Actions smoke builds + manual `release-mobile.yml`
- Server-side sync cron — still MISSING — no `crons` in vercel.json, no scheduled workflow (re-confirmed)
- **Operational blocker (external):** X developer account out of API credits (402) — sync imports nothing on any trigger

## HAL Dashboard (apps/web/src/app/dashboard, packages/ui/hal)
BUILT end-to-end — `dashboard/bookmarks/page.tsx` (**680 LOC**) wires 3-pane shell, SignalRail (AskTab SSE + server-resolved citations, ThreadsTab, RelatedTab), ⌘K Palette (Ask-HAL row is FIRST, not fallback), Spread (4 tabs + RelatedSidebar, focus trap), NotesTab autosave → `/api/bookmarks/[id]/notes`, TweaksPanel, BulkActionBar → `/api/bookmarks/bulk` (delete/tag/move-folder), Esc cascade (order verified), sort control + unclassified filter (PR #39, server-side `.or()` predicate matches classify's), a11y pass (real fonts via next/font, AA ramp, text-4 = disabled-only 4.0:1).
- **Defect (new):** `/api/bookmarks/search` ignores `folder_id` — schema accepts it, client sends it (`use-bookmarks-data.ts:92`), route never applies it (`search/route.ts:18-35`) → in-folder search silently searches everything
- Tag filtering still client-side-only post-filter (no `tag_ids[]` server param; pagination math broken) — unchanged
- `HalSearchBar` still unconditional at `page.tsx:496`; `HalMobileBar`/`HalDrawer` still dead (touched by #34's font sweep, not wired)
- Dashboard home "Recent" — displays `post_created_at` (PR #45) but still **sorts** by `bookmarked_at` → visible dates can appear out of order
- Dead endpoints: `/api/bookmarks/[id]/folder` (zero callers; bulk move-folder is the live path), `/api/bookmarks/bulk-delete` (superseded by `/api/bookmarks/bulk`)
- Also live: `/dashboard/lists` (shared lists + public `/lists/join/[code]`), `/dashboard/tags`, `/dashboard/settings` (usage, billing, API import, REBUILD ORDER), pin-to-feed via `ids` param

## Payments & Auth
- Stripe — BUILT — checkout (inline `price_data`, subscription + lifetime modes), portal, webhook with raw-body signature verification, 4 events, syncs `subscriptions` + `profiles.plan`. **Gaps:** `customer.subscription.updated` never re-syncs `profiles.plan`; no webhook idempotency store
- Plan limits — BUILT — free 500 bookmarks / 5 folders / 20 tags (`schemas.ts:114-119`), enforced in bookmarks/batch/import/folders/tags routes (count-then-insert, non-atomic)
- Auth — BUILT, differs from docs — **live flow is hand-rolled X OAuth 2.0 PKCE** (`/api/auth/x-login` → `/api/auth/x-callback`, sessions minted via Supabase admin API + magiclink; raw X tokens stored in `profiles`); Supabase `signInWithOAuth` route `/api/auth/login` is DEAD code; `middleware.ts` enforces nothing (CORS + `/mobile` redirect only); per-route `getAuthContext()` verifies via `auth.getUser`
- set-session StrictMode flash — **FIXED** (PR #32, `42492a7`) — `startedRef` guard at `set-session/page.tsx:86-87`; superseded.md operator-correction now resolved
- RPC authz hardening (migration 010) — BUILT, re-verified verbatim
- Open-redirect defense — BUILT — `safeInternalPath()` in `auth/callback` + `auth/login`; note the LIVE flow (`x-callback`) doesn't need/use it (literal paths only)
- RLS — 12 tracked policies (migration 005: folders/conversations/messages) + `usage_counters` RLS-no-policies (011, deliberate); core tables verified in prod 2026-07-24; `blends`/`blend_invites`/`shared_lists`/baseline tables have NO tracked DDL
- Login page "Terms"/"Privacy Policy" — dead `<span>`s, no pages exist anywhere (CWS blocker)
- Supabase Storage / Realtime / pgvector — NOT FOUND (re-confirmed)

## Cross-cutting
- Tests — ZERO — no configs, no test files, no test scripts, no testing deps anywhere (confirmed exhaustively 2026-07-31)
- Error tracking / analytics — NONE (only `[llm-usage]` cost log lines)
- Gates that do run: `turbo build` (tsc + next build) and `next lint` — both green 2026-07-31; `ui-hal` lint still a no-op echo
