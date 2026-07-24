---
kind: knowledge
slug: features
status: current
updated: 2026-07-24
layer: reference
sources:
  - docs/dev-docs/PRD.md
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - apps/extension/src/background.ts
  - apps/web/src/lib/grok.ts
  - apps/web/src/lib/grok-conversation.ts
  - apps/web/src/lib/blend-engine.ts
  - apps/web/src/app/dashboard/bookmarks/page.tsx
  - packages/shared/src
  - supabase/migrations
---

# Features — build status (evidence-gated)

BUILT = entrypoint exists, non-stub, wired end-to-end (cited). PARTIAL =
exists but incomplete/unwired piece. PLANNED = no code entrypoint found.
Re-verified independently (2nd pass) for the highest-risk items marked ✓.

## Chrome Extension (apps/extension)
- One-Click Save — BUILT — `background.ts:642 handleSaveBookmark()`
- Bulk Import (direct-GraphQL + scroll-intercept fallback) — BUILT — `background.ts:124-357`, `direct-import.ts`, `folder-walk-import.ts`, `graphql-parser.ts`
- Search — BUILT — `background.ts:671` → `/api/bookmarks/search` (Postgres FTS)
- Folders & Tags (X folder-walk import) — BUILT — `folder-walk-import.ts`, `POST /api/folders/import-x`
- Quick Access Sidebar — BUILT — `sidepanel/SidePanel.tsx`, `chrome.sidePanel.open()` in `background.ts:683`
- Export (CSV/JSON) — PLANNED ✓ — no export code found (`text/csv`/`downloadCSV`/`Blob(` absent from source; only `.next` build-artifact false positives)

## AI (apps/web/src/lib/grok.ts, api/ai/*)
- Smart natural-language search — BUILT — `api/ai/search/route.ts`, `grok.ts:268 parseSearchIntent()`
- Auto-categorization (two-tier) — BUILT — `grok.ts:200-235 classifyBookmark()`, `packages/shared/src/classify-regex.ts` (Tier 1) + Grok (Tier 2)
- Related content — BUILT — `api/ai/related/[bookmarkId]/route.ts`, RPC `get_related_bookmarks` (migration 007)
- Bookmark summaries — BUILT — `api/ai/summarize/route.ts`
- Duplicate detection — BUILT — `api/ai/duplicate-check/route.ts`
- AI Assistant chat — PARTIAL ✓ — streaming chat is real (`grok-conversation.ts streamGrokChat()`, `packages/ui/hal/src/signal/AskTab.tsx`), but **no function calling**: no `tools`/`tool_choice`/`function_call` param anywhere in `grok.ts` or `grok-conversation.ts` (confirmed by direct re-grep). Citations are a `[bm:<uuid>]` text-marker convention parsed client-side, not tool invocation. PRD's "Grok function calling" claim is inaccurate — see [[knowledge/superseded]].
- Grok `x_search()` tool / Collections API — PLANNED — `findRelatedPosts()` in `grok.ts:324-338` has a comment referencing `x_search` but passes no tool params; grep for Collections API usage: zero hits.

## Bookmark Blend
- Invite flow — BUILT — `api/blends/route.ts`, `.../blends/invite/[code]/route.ts`, `dashboard/blend/page.tsx`
- Taste analysis / Blend Score — BUILT — `blend-engine.ts generateBlendAnalysis()`
- Mobile blend page — BUILT — `app/mobile/blend/page.tsx`
- Shareable OG card (1200×630) — PLANNED ✓ — no `/api/og`, `ImageResponse`, or `opengraph-image` route anywhere (confirmed by direct re-grep)
- Privacy controls (opt-in/exclude tags) — UNVERIFIED — not located as a distinct entrypoint in this pass
- `blends`/`blend_invites` table schema — UNVERIFIED — not in tracked migrations 001-009 (migration history starts mid-stream from a pre-existing baseline; this is a repo-completeness gap, not evidence of breakage)

## Signal Boards / The Pulse / Community Knowledge Graphs (roadmap Phases 4-6)
All three — PLANNED — zero code (grep for "signal board", "scout agent", "radar tab", "pulse", "also bookmarked", "save velocity", "knowledge graph" across `apps/`, `packages/`, `supabase/` returns nothing outside docs). Consistent with PRD's own "out of scope for MVP" list.

## Mobile app (Capacitor, apps/web)
- Native shells — BUILT — `capacitor.config.ts`, `apps/web/ios/App/`, `apps/web/android/app/`
- Share target/sheet — BUILT — `MobileShareSheet.tsx`, `MobileShareListener.tsx`, `POST /api/mobile/share`, Android `SEND`/`SEND_MULTIPLE` intent filters
- Background sync (native bookmark mirror) — BUILT — `api/sync/background/route.ts` (5-guard sync, cron + user-triggered modes)
- Pull-to-refresh / haptics — BUILT — `dashboard/bookmarks/page.tsx:430-450`, `@capacitor/haptics`
- Onboarding (5-screen) — BUILT — `app/mobile/onboarding/page.tsx`
- `helloagainlinks://` URL scheme — BUILT — `Info.plist` + `AndroidManifest.xml` + `auth/mobile-callback/page.tsx:20`
- App-open / resume auto-sync — BUILT (added 2026-07-19, commit `3ec14ad`) — `apps/web/src/lib/use-auto-sync.ts`, native-only + throttled 2min, POSTs `/api/sync/background`; wired in `app/layout.tsx`. This is a *client-side* trigger, not the server cron the roadmap still tracks as missing — see [[knowledge/superseded]] #7.
- iOS TestFlight + Android release CI — BUILT (added 2026-07-19, `c0512ca`) — `codemagic.yaml`, `.github/workflows/{build-ios,release-mobile}.yml`, `scripts/mobile-build.mjs`. Shipped through TestFlight build 15 as of 2026-07-20.
- **Operational blocker (external, not code):** the X developer account is **out of API credits (402)**, so sync is a no-op regardless of trigger. `api/sync/background/route.ts` now surfaces this honestly instead of returning 200 (`3114da3`). Nothing in the sync path will import until X API billing is resolved.

## HAL Dashboard Redesign (apps/web/src/app/dashboard/bookmarks, packages/ui/hal)
BUILT end-to-end, most complete area of the codebase — `dashboard/bookmarks/page.tsx` (657 LOC) wires all of: 3-pane shell, Signal rail (`SignalRail.tsx`, `AskTab.tsx` streaming SSE + citations, `ThreadsTab.tsx`, `RelatedTab.tsx`), ⌘K command palette (`Palette.tsx`), Spread modal (`Spread.tsx`), Tweaks panel (`TweaksPanel.tsx`), bulk selection (`BulkActionBar.tsx` → `POST /api/bookmarks/bulk`).
Known gap: tag filtering is client-side-only post-filter — no `tag_ids[]` param wired to `/api/bookmarks/search` — see [[knowledge/superseded]] operator-correction log.

## Fieldtheory-inspired backend upgrades (design doc → all shipped)
- Postgres full-text search (tsvector/GIN) — BUILT — `supabase/migrations/002_add_search_vector_and_rpc.sql`
- Record merge scoring — BUILT ✓ — `packages/shared/src/bookmark-merge.ts`, consumed in `apps/web/src/lib/bookmark-upsert.ts:2,55-58` (confirmed by direct re-grep, not dead code)
- Multi-stop-condition sync (5 guards) — BUILT — `packages/shared/src/sync-guards.ts`, `api/sync/background/route.ts:87-90`
- Two-tier auto-classification — BUILT, one wiring gap — regex Tier 1 + Grok Tier 2 exist and work, but `/api/bookmarks/batch` (extension bulk-import path) does **not** call classification automatically; it only runs automatically in the background X-API sync path, otherwise requires a manual "Classify N unclassified" click (`ClassificationBanner`, `dashboard/bookmarks/page.tsx:529`)

## Payments & Auth
- Stripe (Checkout, Subscriptions, Customer Portal, signed webhooks) — BUILT — `api/stripe/{checkout,portal,webhook}/route.ts`
- Supabase Auth + RLS — BUILT — `lib/auth.ts getAuthContext()`, `middleware.ts`; 14 `CREATE POLICY`/`ENABLE ROW LEVEL SECURITY` statements in migration 005 (folders/conversations/messages). The pre-existing core tables predate migration tracking, but `bookmarks` and `bookmark_tags` are **confirmed RLS-enabled** against prod (`relrowsecurity = true`, verified 2026-07-24) — this closes a previously UNVERIFIED item. App code double-filters by `user_id` regardless.
- RPC authorization hardening — BUILT (2026-07-24, migration 010, PR #16 `a35304e`) — `search_bookmarks` and `get_folders_with_counts` were `SECURITY DEFINER` filtering on a **caller-supplied** `p_user_id` with the default `PUBLIC` execute grant, i.e. anon-reachable IDORs. Now: `search_bookmarks` → `service_role` only; `get_folders_with_counts` → identity bound in-body via `auth.uid()`, PUBLIC/anon revoked; `get_related_bookmarks` → unused `service_role` grant dropped. Live ACLs verified. Method + verification query: [[skills/supabase-definer-rpc-authz]].
- Open-redirect defense — BUILT (2026-07-24) — `lib/safe-redirect.ts` `safeInternalPath()` gates the post-OAuth `redirect` param to same-origin relative paths; applied in `api/auth/callback/route.ts` and `api/auth/login/route.ts`.
- Supabase Storage — NOT FOUND — no `.storage.from(` calls; PRD-only mention
- Supabase Realtime — NOT FOUND — no `.channel(`/`postgres_changes` calls
- Supabase pgvector — NOT FOUND — search is plain FTS, no vector column/extension
