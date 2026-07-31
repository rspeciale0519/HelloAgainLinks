# HelloAgain — Development Roadmap

> **Version:** 1.1  
> **Date:** February 7, 2026 (checkbox statuses audited against code: **July 31, 2026**)  
> **MVP Scope:** Phases 1-3 (Core Extension + AI + Bookmark Blend)  
> **Estimated MVP Timeline:** 4 weeks

---

## Codebase Audit — 2026-07-31

Every checkbox below was reconciled against the code on `develop` (`8ac341f`).
`[x]` = verified built and wired; `[ ]` = not built (or noted as **PARTIAL**).
Where the implementation diverges from the item's wording, an *italic note* says how.
Evidence-gated detail lives in `halbrain/knowledge/features.md`.

**Phase status at a glance**
- **Phase 1 (Foundation & Core Extension): built** — gaps: no CSV/JSON export, no offline save queue, no Save+Tag quick selector, no recent-searches history, no nested folders/drag-and-drop, no search highlighting, side-panel toolbar open path broken.
- **Phase 2 (AI): largely built, different shape than planned** — no embeddings/pgvector, no Grok function calling, no `x_search()`/Collections; four of six `/api/ai/*` routes are orphaned (no UI callers). Quota metering + LLM cost logging exist (better than planned); response caching and retry/backoff do not.
- **Phase 3 (Bookmark Blend): PARTIAL — the viral loop is broken.** Invite create/accept APIs and analysis engine work, but generated invite links point to `/blend/invite/[code]` which has **no page — every invite link 404s**. No decline route, no shareable card, no public page, no Blend Feed, no privacy controls.
- **Phases 4-6 (Signal Boards / Pulse / CKG): not started** (consistent with PRD's post-MVP scope).
- **Mobile (Capacitor): built and shipping via CI** — but the iOS Share Extension referenced by config + onboarding does not exist in the Xcode project, and there is still no server-side sync cron.
- **Cross-cutting: zero automated tests, no error tracking/analytics, no privacy policy or ToS pages** (the login page renders dead "Terms"/"Privacy Policy" spans).

**Defects found by this audit (open):**
1. **[FIXED 2026-07-31]** ~~Blend invite links 404~~ — `/blend/invite/[code]` landing page added (inviter preview, accept CTA, login redirect for signed-out users).
2. **`/api/bookmarks/search` ignores `folder_id`** — the client sends it, the Zod schema accepts it, the route never applies it: searching inside a folder silently searches the whole archive (`api/bookmarks/search/route.ts:18-35`).
3. **Tag filtering is client-side-only** — filters the current 20-row page while `total` stays server-side; paging + tag filter disagree (`dashboard/bookmarks/page.tsx:385-395`, `use-bookmarks-data.ts`).
4. **Extension side panel can't open from the toolbar** — `manifest.json` sets `action.default_popup`, so the `chrome.action.onClicked → sidePanel.open()` handler never fires (`background.ts:705-709`).
5. **`/api/mobile/share` response mismatch** — `MobileShareSheet` reads `data.bookmark.*` and treats HTTP 409 as duplicate; the route returns `{status, id, tags}` with HTTP 200 for duplicates. Tags never display; duplicates render as successful saves.
6. **iOS Share Extension missing** — `capacitor.config.ts` names `ShareExtension` and onboarding step 4 (iOS) teaches users to enable it, but the Xcode project has no app-extension target. Native iOS share-sheet ingestion is non-functional.
7. **X-sync classification discards enrichment** — `api/sync/background/route.ts:185-193` writes only `primary_category`/`primary_domain`, dropping the `ai_summary`/`ai_tags` that `classifyBookmark` returns.
8. **Unmetered Grok cost paths** — `/api/ai/assistant` (live from mobile AI page), `/api/ai/duplicate-check`, and `blend-engine.ts` never call `enforceQuota`; `blend-engine` also defaults to decommissioned `grok-3` if `GROK_MODEL_FULL` is unset.
9. **Stripe drift** — `customer.subscription.updated` updates `subscriptions` but never re-syncs `profiles.plan`; no webhook idempotency/event-dedup store.
10. **[FIXED 2026-07-31]** ~~Free-tier Blend cap leaky~~ — invite creation now counts `blend_invites` (pending+accepted) and acceptance checks the invitee's own monthly blend count.
11. **Plan-gating inconsistency** — AskTab hard-locks free users client-side while the server grants a 25-message lifetime chat trial; the trial *is* reachable via `/dashboard/assistant` and (unmetered) the mobile AI page.
12. **Dashboard "Recent" order/label mismatch** — sorted by `bookmarked_at` but rows display `post_created_at`, so visible dates can appear out of order.
13. **Legacy `/api/ai/assistant` prompt bug** — `countData?.length` on a `head:true` count query is always `undefined`; the prompt always claims "Total bookmarks: 0".

**Dead code inventory (compiles, zero callers):** `/api/ai/search`, `/api/ai/summarize`, `/api/ai/related/[bookmarkId]`, `/api/ai/duplicate-check` (all orphaned; live equivalents are `/api/bookmarks/search`, enrichment `ai_summary`, `/api/bookmarks/[id]/related`), `/api/bookmarks/[id]/folder`, `/api/bookmarks/bulk-delete`, `/api/auth/login` (superseded by the hand-rolled `/api/auth/x-login` PKCE flow), `MobileShareListener.tsx`, `components/hal/{HalMobileBar,HalDrawer}.tsx`, extension `HAL_FOLDERS_IMPORT_X` relay + `fetchServerQueryId()`.

**File-size cap (450 LOC) violations:** `extension/background.ts` 709, `dashboard/bookmarks/page.tsx` 680, `extension/content.ts` 580, `Popup.tsx` 579.

---

## Shipped Initiative: HAL Dashboard Redesign (complete, merged to `develop`)

> **Spec:** `docs/superpowers/specs/2026-04-22-hal-redesign-design.md`  
> **Plan:** `.claude/plans/feature-hal-redesign.md`  
> **Branch:** `feature/hal-redesign` (merged)  
> **Goal:** Replace `/dashboard/bookmarks` with the new obsidian+lime 3-pane design while preserving every existing feature; add user-editable folders with X-import, fully-wired Signal AI rail, ⌘K palette, Spread modal, Tweaks panel, bulk selection.  
> **2026-07-31 audit:** all six phases verified in code (extension now at **0.5.4**, well past the 0.4.2 noted below; the phase-3 "user verification still needed" items have since been exercised through real imports). Post-redesign work shipped on top: a11y/legibility pass (PRs #34/#36), sort control + unclassified filter (#39), save-order preservation (#38/#41) and REBUILD ORDER (#43), dashboard Recent date fix (#45). Known remaining gaps from the redesign era: client-side-only tag filtering (defect #3), `HalSearchBar` never absorbed into the ⌘K palette, dead `HalMobileBar`/`HalDrawer` components, `page.tsx` at 680 LOC.

- [x] **Phase 1 — Foundation** *(complete)*
  - [x] Migration 005 (folders, conversations, messages, bookmarks AI annotation columns)
  - [x] `@helloagain/ui-hal` package scaffold + workspace registration
  - [x] Theme tokens + scoped CSS (`globals.css` under `[data-hal="on"]`)
  - [x] Six primitives: `Icon`, `Chip`, `HalButton`, `StatusDot`, `BackgroundLayers`, `SegButton`
- [x] **Phase 2 — Shell + feed** *(complete)*
  - [x] Hooks: `relative-time`, `use-sync-time`, `use-keyboard-shortcuts`, `use-tweaks`, `use-bookmarks-data`, `use-bookmark-mutations`
  - [x] `/api/profile/sync-state` endpoint
  - [x] `ClassificationBanner` ported (non-free plan-gated)
  - [x] `Card` (3 density modes — comfortable / compact / grid; grid extracted to `Card.grid.tsx`)
  - [x] `FeedHeader` with density toggles + Live pill + Signal toggle
  - [x] `Feed` container with stagger animation + pagination + status bar
  - [x] `IndexSidebar` + `NavItem` + `SectionHead` (Library section uses placeholder folders, marked `// TODO Phase 3`)
  - [x] `/dashboard/bookmarks/page.tsx` rewritten as 3-pane shell with `data-hal="on"` scoped tokens
  - [x] Every spec 5.7 preserved feature wired (search, pagination, classification, tag popover, delete modal, dates, view-on-X, pull-to-refresh + haptics, extension live updates, ⌘K/⌘J/⌘B/Esc)
- [x] **Phase 3 — Folders + X import** *(complete — pending user manual verification)*
  - [x] Migration 006: `get_folders_with_counts` RPC + reconciled folders schema (added `x_folder_id`, `updated_at`, unique `(user_id, x_folder_id)`, trigger)
  - [x] `/api/folders` GET (RPC) + POST (Zod-validated)
  - [x] `/api/folders/[id]` PATCH rename + DELETE (bookmarks become `folder_id = NULL`)
  - [x] `/api/bookmarks/[id]/folder` PATCH for single-folder assignment
  - [x] `/api/folders/import-x` POST (upserts folders + assignments in 500-row chunks)
  - [x] Live folders in sidebar via `/api/folders`; "All" synthetic folder always present
  - [x] Folder filter on feed (`folder_id` query param on `/api/bookmarks` and `/api/bookmarks/search`)
  - [x] Sidebar folder CRUD: hover-revealed rename/delete + "+ New folder" button + "Import X" pill
  - [x] Extension folder-context capture (URL + GraphQL parser handling both `Bookmarks` and `BookmarkFolderTimeline` operations)
  - [x] Extension `folder-walk-import.ts` orchestrator with `chrome.storage`-backed walk-state for resume across navigations
  - [x] Extension version bumped 0.3.3 → 0.4.0
  - [x] Legacy multi-folder routes archived to `archive/phase3/` per Rule 1
  - [x] **Main-first import orchestrator (v0.4.2):** `folder-walk-import.ts` rewritten so a single root-page sweep imports every X bookmark before walking folders; folder walk now only collects post-IDs to POST as assignments; handles "no folders" by exiting after the main pass. Interceptor caches `BookmarkFoldersSlice` to `window.__halXFoldersList` so the orchestrator doesn't race the initial GraphQL fire. Plan: `.claude/plans/feature-x-import-main-first.md`.
  - **User verification still needed:** reload unpacked extension in Chrome, confirm v0.4.2; test single-bookmark save + bulk import unchanged; run end-to-end main-first import against a real X account (with and without folders); validate GraphQL parser TODOs against live X markup
- [x] **Phase 4 — Signal rail** *(complete)*
  - [x] Conversations + messages CRUD (`/api/conversations`, `/api/conversations/[id]`, `/api/conversations/[id]/messages`)
  - [x] Migration 007: `get_related_bookmarks` clustering RPC (Jaccard tags + primary_category)
  - [x] SSE-streamed Grok responses with `[bm:<id>]` citation extraction → `cited_bookmark_ids`
  - [x] AskTab (real streaming + locked state for free plan), ThreadsTab, RelatedTab
  - [x] SignalRail shell with HAL header + tab routing + `initialConversationId` deep-linking
  - [x] Bookmarks page integrates SignalRail (replaces SignalPlaceholder, archived to `archive/phase2-signal-placeholder/`)
  - [x] `/dashboard/assistant` refactored to use the same conversations + messages tables; supports `?conversation=<id>` deep links
  - [x] AskTab split: extracted `sse-consumer.ts` + `AskSuggestions.tsx` to stay under 450 LOC
  - [x] Browser smoke verified: streaming chat with 10 citation chips, threads tab populates, locked state shows for free plan
  - **Tech debt:** legacy `/api/ai/assistant` route kept for extension/mobile compatibility (migrate in later phase)
- [x] **Phase 5 — Palette + Spread + Tweaks + AI annotations** *(complete)*
  - [x] `Palette` (⌘K) — bookmark search via `/api/bookmarks/search` (debounced 150ms), folder rows, Ask HAL fallback that prefills the rail; flex-centered modal + scroll-into-view + keyboard/hover precedence guard
  - [x] `Spread` modal — flex-centered, two-column grid (main / 300px related); 4 tabs (Content, HAL analysis, Notes, Thread) + RelatedSidebar; Esc + click-backdrop close
  - [x] `NotesTab` autosave (1s debounce) → new `/api/bookmarks/[id]/notes` PATCH; status pill cycles EDITING → SAVING → AUTOSAVED · Xs AGO and persists after settling
  - [x] LLM enrichment (`enrichBookmarkLLM`) — single MODEL_FULL call returning Zod-validated `{ ai_summary, ai_tags: [{label, confidence}] }`; classify route writes all four enrichment columns at once and continues to upsert tag rows from high-confidence (≥0.6) ai_tags
  - [x] Card `ai_summary` annotation strip verified end-to-end (already conditionally rendered in Phase 2; now produces data via Phase 5.4)
  - [x] `TweaksPanel` (slide-in from right via new `hal-slide-in-x` keyframe) + floating gear `TweaksTrigger` — three rows (density / layout / pulse) wired to existing `useTweaks()`
  - [x] Citation surface refined (out-of-plan polish): chip-row replaced with inline numbered badges then with per-bullet "View post by @handle on X →" links; Grok system prompt enforces one bullet per cited bookmark
- [x] **Phase 6 — Bulk + polish + cutover** *(complete)*
  - [x] `BulkActionBar` — fixed bottom-center bar with Tag · Move · Delete + clear-selection close. Appears when `selectedIds.length > 0`. forwardRef on Tag/Move buttons so popovers anchor cleanly.
  - [x] `/api/bookmarks/bulk` POST endpoint — discriminated-union Zod schema for `{ ids, action, payload? }` with RLS + explicit user_id guard. Tag action verifies tag ownership before upsert. Returns `{ updated, failed }`.
  - [x] `FolderPickerAnchored` for the Move flow (user folders + "Unfile" option, click-outside + Esc close)
  - [x] `DeleteConfirmModal` generalized with title/description/confirmLabel props so single-delete and bulk-delete share one component
  - [x] Selection mode end-to-end: Esc cascade extended (palette → spread → tweaks → bulk anchors → bulk confirm → single confirm → tag popover → exit selection)
  - [x] A11y pass — Spread modal traps Tab/Shift+Tab + auto-focuses on open; zero icon-only buttons missing aria-label/title across the package; reduced-motion CSS rules verified loaded and functional
  - [x] Final polish: sidebar "Search & ask…" pill now opens the ⌘K palette via dispatched keydown (was a TODO stub since Phase 2). No scanlines/boot-splash artifacts; source clean of `console.log`

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Extension | Chrome Extension (Manifest V3), TypeScript, React 19 | MV3 |
| Backend | Next.js 16, React 19, TypeScript | 16.x |
| Database | Supabase (PostgreSQL + Auth + RLS) — *pgvector never enabled; search is tsvector FTS* | Latest |
| AI | Grok API (xAI) — Chat completions only. *`x_search()` and Collections are not wired (plain chat calls)* | Latest |
| Payments | Stripe (Subscriptions + Checkout + Portal) | Latest |
| Hosting | Vercel | Latest |
| Package Manager | pnpm | 10.x (`packageManager: pnpm@10.28.2`) |
| Monorepo | Turborepo | Latest |

---

## Phase 1: Foundation & Core Extension (Week 1-2)

> **Goal:** Working Chrome extension that imports, stores, searches, and organizes X bookmarks.

### 1.1 Project Setup & Infrastructure

- [x] **Initialize monorepo with Turborepo**
  - [x] Create root `package.json` with pnpm workspaces
  - [x] Configure `turbo.json` with build/dev/lint pipelines — *no `test` pipeline (no tests exist)*
  - [x] Create workspace packages: `apps/web`, `apps/extension`, `packages/shared`, `packages/ui` — *plus `packages/ui/hal`*
  - [x] Set up shared TypeScript config (`tsconfig.base.json`)
  - [ ] Set up shared ESLint config (`eslint.config.mjs`) — *not built: only `apps/web` lints (`next lint`); `ui-hal` lint script is a no-op echo*
  - [x] Add `.nvmrc` with Node 22 LTS

- [x] **Set up Next.js 16 backend (`apps/web`)**
  - [x] Initialize Next.js 16 with App Router and TypeScript
  - [x] Configure environment variables
  - [x] Set up `src/app` directory structure — *flat dirs (`api/`, `auth/`, `dashboard/`, `mobile/`, …), no `(auth)`/`(dashboard)` route groups*
  - [ ] Add Tailwind CSS 4 + shadcn/ui component library — *not used: styling is hand-rolled CSS + inline styles with the HAL token system*
  - [x] Create base layout with responsive design
  - [x] Set up error boundary and loading states — *loading/error handling is per-page state, not App Router `error.tsx`/`loading.tsx` conventions*

- [x] **Set up Supabase project**
  - [x] Create Supabase project — *production only; no staging project*
  - [ ] Enable pgvector extension for future embedding storage — *never enabled; no embeddings anywhere, search is tsvector FTS*
  - [x] Configure Auth providers (X/Twitter OAuth 2.0) — *live flow is a hand-rolled X OAuth 2.0 PKCE (`/api/auth/x-login` → `/api/auth/x-callback` minting sessions via Supabase admin API); the Supabase `signInWithOAuth` route (`/api/auth/login`) is dead code*
  - [x] Set up Row Level Security policies — *tracked in migrations only for `folders`/`conversations`/`messages`/`usage_counters`; core tables (`bookmarks`, `bookmark_tags`) verified RLS-enabled against prod 2026-07-24 but their DDL predates migration tracking*
  - [x] Create database migration system using Supabase CLI — *migrations 001-011; baseline schema (profiles, bookmarks, tags, subscriptions, blends, shared-lists) predates tracking*
  - [x] Set up Supabase clients

- [x] **Design and create database schema**
  - [x] `profiles` table — *untracked baseline; includes X OAuth token columns + sync state (migration 003)*
  - [x] `bookmarks` table — *plus enrichment columns (001/004/008): search_vector, primary_category/domain, ai_summary, ai_tags, x_author_avatar_url*
  - [x] `tags` table (with color)
  - [x] `bookmark_tags` junction table
  - [x] `folders` table — *single-level; no `parent_id` nesting*
  - [ ] `bookmark_folders` junction table — *superseded by design: single `bookmarks.folder_id` column is the source of truth; legacy multi-folder routes archived*
  - [x] `subscriptions` table
  - [x] Add indexes — *FTS GIN via migration 002; classification indexes via 004; baseline btrees untracked*
  - [x] Write RLS policies — *see Supabase item above*
  - [ ] Create initial migration file and apply — *never done: tracked migrations start mid-stream; `blends`/`blend_invites`/`shared_lists` have **no tracked DDL at all***

- [x] **Set up Chrome Extension scaffold (`apps/extension`)**
  - [x] Create `manifest.json` (Manifest V3)
  - [x] Extension bundling
  - [x] Create service worker (`background.ts`) — *709 LOC, over the 450 cap*
  - [x] Create content script (`content.ts`) — *580 LOC, over the 450 cap; plus MAIN-world `x-interceptor.ts` (fetch/XHR monkey-patch for GraphQL capture)*
  - [x] Create popup UI (`popup/`)
  - [x] Create sidebar panel (`sidepanel/`) — *⚠ toolbar-open path broken: `action.default_popup` means `chrome.action.onClicked → sidePanel.open()` never fires; panel reachable only via Chrome's side-panel menu*
  - [x] Configure message passing between content script ↔ service worker ↔ popup/sidebar
  - [x] Set up extension storage for cache and auth tokens — *saved-IDs cache (`hal_post_ids`, 5-min TTL); no offline save queue*

- [x] **Implement authentication flow**
  - [x] Configure X/Twitter OAuth 2.0 — *hand-rolled PKCE flow, not Supabase's provider (see above)*
  - [x] Build login page in Next.js (`/login`) with X OAuth button — *⚠ its "Terms"/"Privacy Policy" spans are dead (no pages, no links)*
  - [x] Implement extension auth: open web login → receive token → store in extension
  - [x] Create auth middleware for API routes — *per-route `getAuthContext()` (verifies via `auth.getUser`); `middleware.ts` itself enforces nothing (CORS for Capacitor origins + `/mobile` redirect only)*
  - [x] Build session management (auto-refresh tokens, handle expiry) — *extension background refresh with retry + hard clear on 401*
  - [x] Create `/api/auth/callback` route for OAuth redirect — *with `safeInternalPath()` open-redirect defense*
  - [x] Test auth flow end-to-end — *manual verification only; no automated test*

### 1.2 Bookmark Import & Storage

- [x] **Build X bookmark import pipeline** — *two pipelines exist: extension direct-GraphQL import (primary, with scroll-intercept fallback) and server-side X API v2 sync (`/api/sync/background`; currently a no-op — X developer account out of API credits, 402)*
  - [x] Research X API v2 bookmark endpoints (GET /2/users/:id/bookmarks)
  - [x] Implement paginated bookmark fetch — *cursor pagination in both pipelines*
  - [x] Parse bookmark response: post ID, author, content, media, timestamps — *plus engagement/thread/sensitive-content metadata*
  - [x] Handle rate limits — *5-guard stop-condition model (`packages/shared/src/sync-guards.ts`) + rate-limit handling in `direct-import.ts`*
  - [x] Build progress indicator for import — *phased overlay enforcing `Found = Imported + Updated + Skipped + Errored + Queued`*
  - [x] Implement deduplication check by x_post_id
  - [x] Store raw bookmark data in Supabase `bookmarks` table — *via score-based merge upsert (`bookmark-upsert.ts`) that never downgrades richer data; save order preserved by descending synthetic `bookmarked_at` cursor (PRs #38/#41), repairable retroactively via REBUILD ORDER (PR #43)*
  - [x] Handle edge cases — *partial: duplicate-cursor/stale-page/time-limit guards; no specific handling for suspended/private accounts*

- [x] **Create bookmark CRUD API routes**
  - [x] `POST /api/bookmarks` — create bookmark
  - [x] `GET /api/bookmarks` — list with pagination, sorting (3 sort options + deterministic tiebreaker, PR #39), folder + unclassified filtering — *tag filtering NOT server-side (defect #3)*
  - [ ] `GET /api/bookmarks/:id` — *no single-bookmark GET route; detail views hydrate from the list payload*
  - [x] `PATCH /api/bookmarks/:id` — *notes via `/api/bookmarks/[id]/notes`; folder via bulk endpoint*
  - [x] `DELETE /api/bookmarks/:id`
  - [x] `POST /api/bookmarks/bulk-delete` — *exists but unused; live path is `POST /api/bookmarks/bulk` `{action: 'delete'|'tag'|'move-folder'}`*
  - [x] `GET /api/bookmarks/count`
  - [x] Add input validation with Zod schemas for all routes
  - [x] Add plan limit enforcement: 500 bookmarks / 5 folders / 20 tags on free — *enforced in bookmarks, batch, import, folders, tags routes; count-then-insert (non-atomic)*

- [x] **Build one-click save from X timeline**
  - [x] Content script: injected HAL save button + native-bookmark mirroring (document-level capture listener; native un-bookmark mirrors deletes too)
  - [x] Extract post data from DOM / X's internal API responses
  - [x] Send bookmark data to service worker → API
  - [x] Show save confirmation toast on X timeline
  - [ ] Handle save failures gracefully (retry, offline queue) — *fails fast with an error message; no retry, no offline queue*
  - [ ] Add "Save + Tag" option: show quick tag selector on save — *not built; tagging happens later in dashboard/popup*

### 1.3 Search & Organization

- [x] **Implement bookmark search**
  - [x] `GET /api/bookmarks/search?q=` — full-text search via `search_bookmarks` RPC (weighted tsvector, `ts_rank_cd`, `websearch_to_tsquery`)
  - [x] Create GIN index on content_text (migration 002, on the generated `search_vector`)
  - [x] Support filters: author, date range — *tags: client-side only (defect #3); folders: param accepted but silently ignored (defect #2)*
  - [x] Support sorting: date saved, date posted, relevance — *feed sort control (PR #39); search results rank by relevance*
  - [ ] Implement search highlighting (return matched snippets) — *no `ts_headline`/snippets*
  - [x] Build search UI in extension sidebar with real-time results (debounced input) — *popup + side panel + dashboard (300ms) + ⌘K palette (150ms)*
  - [ ] Add recent searches history — *not built; search state is ephemeral*

- [x] **Build folder management**
  - [x] `POST /api/folders` — create folder (5-folder free limit enforced)
  - [x] `GET /api/folders` — list with bookmark counts (`get_folders_with_counts` RPC, auth-hardened in migration 010)
  - [x] `PATCH /api/folders/:id` — rename
  - [x] `DELETE /api/folders/:id` — delete (bookmarks become `folder_id = NULL`)
  - [x] Add/remove bookmark ↔ folder — *single-folder model: `PATCH /api/bookmarks/[id]/folder` exists but has zero callers; live path is bulk `move-folder`. Plus `POST /api/folders/import-x` (X folder import from the extension)*
  - [x] Build folder UI in sidebar — *flat list with hover rename/delete, "+ New folder", "Import X" pill; no drag-and-drop / dnd-kit*
  - [ ] Support nested folders (parent_id reference) — *single-level only*

- [x] **Build tag management**
  - [x] `POST /api/tags` — create tag with optional color (20-tag free limit)
  - [x] `GET /api/tags` — list with usage counts
  - [x] `PATCH /api/tags/:id` / `DELETE /api/tags/:id` — *delete wired in dashboard tags page*
  - [x] Add/remove tags on bookmark — *TagPopover on cards + bulk tag action*
  - [x] Tag input component — *create-on-the-fly in popover; dedicated tags page with color*
  - [x] Support bulk tagging (BulkActionBar → `POST /api/bookmarks/bulk` `{action:'tag'}` with ownership check)

### 1.4 Extension UI

- [x] **Build popup UI**
  - [x] Quick search bar — *live search inside the popup*
  - [x] Recent bookmarks list
  - [x] Bookmark count and plan status
  - [ ] Quick save button for current page — *not built; saving happens via the injected button / native-bookmark mirror on x.com*
  - [x] Settings/login link — *plus show/hide-HAL-button toggle and sign-out confirm*
  - [x] "Open full dashboard" link

- [x] **Build sidebar panel UI**
  - [x] Full bookmark list — *pagination/load-more, not virtual scrolling*
  - [x] Search bar with filters — *search + tag filters + folder filters*
  - [x] Folder navigation — *flat filter list, not a tree panel*
  - [x] Bookmark card component: post preview, author, date, tags, actions
  - [ ] Bookmark detail view — *not built in the side panel; detail lives in the dashboard Spread modal*
  - [ ] Bulk selection mode in side panel — *not built there; bulk selection is a dashboard feature*
  - [x] Import progress view with real-time count
  - [x] Empty states — *basic; ⚠ toolbar-open path broken (defect #4)*

- [x] **Build web dashboard (`apps/web`)**
  - [x] Dashboard home: bookmark stats, recent saves, quick search — *⚠ Recent list sorts by ingest time but displays post date (defect #12)*
  - [x] Full bookmark library view — *the HAL 3-pane redesign (see Active Initiative above)*
  - [x] Settings page: account, plan management, usage, API import, extension import + REBUILD ORDER
  - [x] Billing: checkout + Stripe customer portal (within settings)
  - [ ] Data export page: download CSV/JSON — *not built anywhere (extension, web, or API)*
  - [x] Mobile-responsive design — *dedicated `/mobile/*` app shell for Capacitor; desktop dashboard is desktop-oriented*

### 1.5 Payments & Plan Enforcement

- [x] **Integrate Stripe**
  - [x] Products and prices — *inline `price_data` in the checkout session (no pre-created Stripe Price objects); `PRICE_CONFIG` validated server-side*
  - [x] Implement `POST /api/stripe/checkout` — subscription and one-time (lifetime) modes
  - [x] Implement `POST /api/stripe/portal`
  - [x] Implement `POST /api/stripe/webhook` — *raw-body signature verification via `constructEvent`*
  - [x] Handle webhook events: all four listed — *⚠ `customer.subscription.updated` never re-syncs `profiles.plan` (defect #9); no idempotency/event-dedup store*
  - [x] Sync subscription status to `subscriptions` table — *and `profiles.plan`*
  - [x] Build upgrade prompt component (`UpgradePrompt.tsx`)
  - [x] Test full payment flow in Stripe test mode — *manual only; no automated test*

---

## Phase 2: AI Integration & Smart Features (Week 2-3)

> **Goal:** Grok-powered auto-tagging, smart search, and content intelligence.

### 2.1 Grok API Integration Layer

- [x] **Build Grok API client service**
  - [x] Typed Grok API wrapper — *lives at `apps/web/src/lib/grok.ts` (+ `grok-conversation.ts`), not `packages/shared`*
  - [x] Implement chat completions endpoint (non-streaming + SSE streaming with usage in final chunk)
  - [ ] Implement `x_search()` tool calling — *never wired; only comments reference it, no `tools` param anywhere*
  - [ ] Implement Collections API — *zero usage anywhere*
  - [x] Add rate limiting — *quota system: `lib/quota.ts` `enforceQuota()` + atomic `consume_quota` RPC (migration 011), per-plan windows (`packages/shared/src/plans.ts`) + platform-wide daily circuit breaker; fails closed; emits `Retry-After`. **Retry/backoff: not built** — every client throws on first non-2xx*
  - [ ] Add response caching layer — *not built; only passive xAI-side prompt caching (reported, not managed)*
  - [x] Add cost tracking — *`lib/llm-usage.ts` logs structured per-call token + USD lines (prefers xAI billed cost ticks), wired into both call paths. ⚠ three unmetered/unlogged paths: `/api/ai/assistant`, `/api/ai/duplicate-check`, `blend-engine.ts` (defect #8)*
  - [x] Create environment config for API keys and model selection — *⚠ `blend-engine.ts` defaults to decommissioned `grok-3` when `GROK_MODEL_FULL` unset*

### 2.2 Auto-Tagging System

- [x] **Implement AI auto-tagging pipeline** — *shipped as the two-tier classification system: Tier 1 instant regex (`packages/shared/src/classify-regex.ts`, runs on every upsert) + Tier 2 Grok enrichment (`enrichBookmarkLLM` → `ai_summary` + confidence-scored `ai_tags`)*
  - [x] Create `POST /api/ai/auto-tag` endpoint — *exists; only reachable by direct API call (mobile share route calls `autoTagBookmark` directly). The live UI path is `POST /api/bookmarks/classify`*
  - [x] Prompt template returning tags — *Zod-validated `{ai_summary, ai_tags:[{label, confidence}]}`; tags ≥0.6 confidence become tag rows*
  - [x] Define initial tag taxonomy — *regex rule set (URL + text rules) serves as the deterministic taxonomy; LLM tags are open-vocabulary, not from a curated list*
  - [ ] Allow user-defined custom tags in the taxonomy — *not built*
  - [ ] Batch processing in background (pg_cron / Edge Function) — *no queue; X-API sync path classifies inline (⚠ but discards `ai_summary`/`ai_tags` — defect #7)*
  - [ ] Run auto-tag on bulk import — *deliberate gap: `/api/bookmarks/batch` (extension import) gets Tier 1 regex only; Tier 2 requires the manual "Classify N unclassified" banner click (plan-gated)*
  - [x] Build UI — *`ClassificationBanner` + `ai_tags` chips and `ai_summary` strip on cards/Spread; auto-applied at ≥0.6 rather than accept/reject*
  - [x] Store auto-generated tags distinctly — *`ai_tags` JSON column is separate from manual `tags` rows*
  - [ ] Add settings toggle: enable/disable auto-tagging — *not built*

### 2.3 Smart Search (Natural Language)

- [ ] **Implement AI-powered search** — **PARTIAL, orphaned:** *the endpoint exists but nothing calls it; natural-language querying actually ships through the HAL chat (query-rewrite + FTS retrieval + cited answers)*
  - [x] Create `POST /api/ai/search` endpoint — *⚠ zero UI callers; the live search path is `GET /api/bookmarks/search` (plain FTS)*
  - [x] Build search pipeline: `parseSearchIntent()` → PostgREST query with author/date-hint filters — *in the orphaned route*
  - [ ] Generate and store embeddings (pgvector) — *not built; no pgvector anywhere*
  - [ ] Implement semantic search — *not built*
  - [ ] Hybrid search — *not built*
  - [ ] "Smart search" UI toggle — *not built*
  - [x] Free tier gating — *the orphaned route 403s free plans; keyword search is free*
  - [ ] Cache frequent queries — *not built*

### 2.5 AI Assistant (Conversational Interface)

- [x] **Build AI Assistant chat UI** — *two surfaces: `/dashboard/assistant` full page and the Signal-rail AskTab (SSE streaming, citations)*
  - [x] Create `/dashboard/assistant` page with full chat interface — *shares the conversations/messages tables; keeps its own SSE consumer copy (noted in `sse-consumer.ts`)*
  - [x] Add "Assistant" nav item
  - [x] Dark theme consistent with the HAL design system
  - [x] Message alignment/styling
  - [x] Input bar with send
  - [x] Typing/streaming indicator
  - [x] Message animations
  - [x] Suggested prompt chips (`AskSuggestions.tsx`)

- [x] **Implement conversational bookmark queries** — *mechanism: deterministic query-rewrite (`rewriteQueryForSearch`, 60-term stopword list) → FTS retrieval → context-stuffed prompt with `[bm:<uuid>]` citation contract, resolved server-side to numbered citations*
  - [x] Natural language understanding over the library
  - [x] Context-aware responses (retrieved bookmarks in prompt)
  - [x] Date/topic/author queries — *handled by the LLM over retrieved context, not structured parsers*
  - [x] Return formatted bookmark results inline — *per-bullet "View post by @handle on X →" citation links*

- [ ] **Implement chat-based bookmark actions** — **NOT BUILT** *(requires function calling, which was never wired)*
  - [ ] Tag / folder / bulk operations via chat
  - [ ] Confirmation prompts, success/failure feedback

- [ ] **Implement bookmark discovery via chat** — **NOT BUILT** *(no `x_search()`; assistant only answers over the saved library)*

- [ ] **Build Grok API function calling integration** — **NOT BUILT.** *No `tools`/`tool_choice`/`function_call` parameter exists anywhere in the codebase (PRD §3.2 overclaims this). Rate-limit + cost tracking per conversation DO exist (quota `chat` metric + `[llm-usage]` logging)*

- [x] **Chat history and persistence**
  - [x] Tables — *shipped as `conversations`/`messages` (migration 005, RLS'd), not `chat_sessions`/`chat_messages`*
  - [x] Session titles — *derived from first message*
  - [x] List previous chats — *ThreadsTab + assistant page list*
  - [x] Load and continue previous conversations — *`?conversation=<id>` deep links on both surfaces*

- [x] **Suggested prompts and onboarding**
  - [x] Suggested prompt chips
  - [ ] Context-aware suggestions from the user's library — *static chips only*
  - [x] Empty state
  - [x] Gating — *shipped differently than planned: free tier gets a **25-message lifetime trial** via the quota system (not 5/day). ⚠ inconsistent: AskTab hard-locks free users client-side while `/dashboard/assistant` allows the trial, and the mobile AI page uses the unmetered legacy `/api/ai/assistant` (defects #8/#11)*

### 2.4 Content Intelligence

- [x] **Implement bookmark summaries** — *live path is the enrichment pipeline: `ai_summary` written by classify/enrichment and rendered on cards + Spread Analysis tab*
  - [x] Create `POST /api/ai/summarize` endpoint — *⚠ orphaned: exists (single + collection summaries) but has zero UI callers*
  - [x] Single bookmark summary — *via `ai_summary` enrichment (live)*
  - [ ] Folder/tag collection summary surfaced in UI — *`summarizeCollection()` exists in the orphaned route only*
  - [x] Summary UI — *`ai_summary` annotation strip on cards; Analysis tab in Spread*
  - [x] Cache summaries in database — *`ai_summary` column persists; classify guards against clobbering existing values*

- [x] **Implement related content discovery**
  - [x] Endpoint — *live route is `GET /api/bookmarks/[id]/related` using the `get_related_bookmarks` RPC (0.5×shared-category + 0.5×tag-Jaccard, migration 007). The LLM-driven `GET /api/ai/related/[bookmarkId]` also exists but is orphaned*
  - [ ] Use embeddings — *not built; similarity is category/tag-based, no vectors*
  - [ ] Use Grok `x_search()` for unsaved public posts — *not built*
  - [x] Build "Related" tab — *RelatedTab in the Signal rail + RelatedSidebar in Spread*
  - [x] Limits on result count

- [ ] **Implement duplicate detection** — **PARTIAL, orphaned:** *`POST /api/ai/duplicate-check` exists (Grok-based, no embeddings) but nothing calls it, it has no plan gate and no quota (defect #8). No on-save duplicate check, no warning UI, no merge UI. (Note: `bookmark-merge.ts` score-based merge on re-import is a different, live mechanism that prevents exact-dup rows by `x_post_id`.)*

---

## Phase 3: Bookmark Blend — Viral Feature (Week 3-4)

> **Goal:** Ship the flagship social feature that drives viral growth through shareable artifacts on X.

### 3.1 Blend Infrastructure

- [x] **Design Blend database schema**
  - [x] `blends` table — *exists in prod and is used by code, but has **no tracked migration DDL***
  - [x] `blend_invites` table — *same: used by code, no tracked DDL*
  - [ ] Add RLS policies — *unverifiable from the repo (no tracked DDL); every `api/blends/*` handler uses the RLS-bypassing service client with hand-written `.or()` ownership filters — no DB-level backstop*
  - [ ] Add indexes — *unverifiable from the repo*

- [x] **Build Blend invite system** — **PARTIAL: APIs work, the shareable link is broken**
  - [x] Generate invite link with unique code — *`POST /api/blends` (route shape differs from plan)*
  - [x] `GET /api/blends/invite/:code` — public invite details (inviter name/handle/avatar)
  - [x] Accept — *`POST /api/blends/invite/:code` marks accepted, inserts blend, runs analysis inline*
  - [ ] Decline — *no decline/reject route exists*
  - [ ] Build invite landing page (`/blend/invite/:code`) — **NOT BUILT — this is defect #1: the API returns `${appUrl}/blend/invite/${code}` and every generated link 404s.** *(Contrast: shared lists has a real `/lists/join/[code]` page.)*
  - [ ] Signup-then-auto-accept flow for non-users — *not built*
  - [x] Enforce free tier 1 Blend/month — *⚠ leaky (defect #10): counts `blends` for `user_a_id` at invite creation only; unlimited invites until accept, unlimited accepts as `user_b_id`; not part of the atomic quota system*

### 3.2 Blend Analysis Engine

- [x] **Build taste analysis pipeline** — *mechanism differs from plan: one Grok chat call over each user's last 25 bookmarks + tag lists; the **model invents the 0-100 score** (no cosine/topic-vector math anywhere); JSON-parse failure falls back to a hardcoded score of 50 with canned strings. Unmetered (defect #8)*
  - [x] Common Ground / Unique Tastes / Hidden Connections — *LLM-generated fields of the single call*
  - [x] Blend Score 0-100 — *LLM-asserted, not computed*
  - [x] Map score to tier label — *the four tiers, computed deterministically from the score*
  - [x] Generate natural language summary
  - [x] Store full analysis as JSON in `blends.analysis_json`
  - [ ] Handle edge cases (<10 bookmarks, identical libraries) — *not handled; failure path is the hardcoded-50 fallback*

- [ ] **Build Blend Feed generation** — **NOT BUILT** *(no feed endpoint, no `x_search()`, nothing)*

### 3.3 Shareable Blend Card

- [ ] **Design Blend card visual** — **NOT BUILT.** *Zero matches for `ImageResponse`/`opengraph-image`/`satori`/`next/og`/`/api/og` anywhere; no OG/twitter-card meta tags exist in the app at all. (PRD §3.3 overclaims this.)*

- [ ] **Build Blend public page** — **NOT BUILT.** *No `/blend/**` page routes exist (also the cause of defect #1); there is no per-blend detail page even behind auth — `GET /api/blends/[id]` has no page consumer.*

### 3.4 Blend UI in Extension & Dashboard

- [x] **Build Blend management UI** — **PARTIAL**
  - [x] "Blend" in dashboard navigation (`/dashboard/blend`) + mobile tab (`/mobile/blend`)
  - [x] Create invite → copy link to clipboard — *⚠ the copied link 404s (defect #1)*
  - [x] Blends list with score/tier
  - [ ] Blend detail view (full analysis, feed, share options) — *not built*
  - [ ] Blend privacy controls — *not built*
  - [ ] Free tier count display (1/1 used) — *not built; the cap just 403s*

### 3.5 Blend Privacy & Safety

- [ ] **Implement privacy controls** — **NOT BUILT.** *No `blend_opt_in`, no excluded tags/bookmarks columns or UI anywhere; analysis reads the counterparty's bookmarks/tags unconditionally once an invite is accepted. Delete-a-blend does exist (`DELETE /api/blends/[id]`). No abuse rate-limit beyond the leaky free-tier check.*

---

## Phase 4: Signal Boards (Month 2)

> **Goal:** Small-group collaborative bookmark collections with Grok-powered AI scout.
> **Status 2026-07-31: not started — zero code** (consistent with PRD post-MVP scope).

### 4.1 Signal Board Infrastructure

- [ ] **Design Signal Board database schema**
  - [ ] `boards` table (id, owner_id, name, description, topic_scope, is_public, scout_frequency: hourly/daily/weekly, created_at)
  - [ ] `board_members` table (board_id, user_id, role: owner/editor/viewer, joined_at)
  - [ ] `board_bookmarks` table (id, board_id, bookmark_id or x_post_id, added_by_user_id, source: member/scout, status: active/dismissed, created_at)
  - [ ] `board_invites` table (id, board_id, invite_code, created_at, expires_at)
  - [ ] `scout_runs` table (id, board_id, ran_at, candidates_found, candidates_promoted, candidates_dismissed)
  - [ ] Add RLS policies for multi-user board access
  - [ ] Add indexes on board_id, user_id, status

- [ ] **Build Board CRUD API**
  - [ ] `POST /api/boards` — create board (enforce limits: free 1 board, pro unlimited)
  - [ ] `GET /api/boards` — list user's boards with member counts and bookmark counts
  - [ ] `GET /api/boards/:id` — get board with members, bookmarks, scout status
  - [ ] `PATCH /api/boards/:id` — update name, description, topic scope, scout frequency, visibility
  - [ ] `DELETE /api/boards/:id` — delete board (owner only)
  - [ ] `POST /api/boards/:id/invite` — generate invite link
  - [ ] `POST /api/boards/:id/join` — join via invite code (enforce member limits: free 3, pro 8)
  - [ ] `DELETE /api/boards/:id/members/:userId` — remove member (owner only)
  - [ ] `POST /api/boards/:id/bookmarks` — add bookmark to board
  - [ ] `PATCH /api/boards/:id/bookmarks/:bookmarkId` — promote/dismiss scout candidate
  - [ ] `DELETE /api/boards/:id/bookmarks/:bookmarkId` — remove bookmark from board

### 4.2 Grok Scout Agent

- [ ] **Build Scout pipeline**
  - [ ] Create scheduled job (Supabase Edge Function + pg_cron) per scout frequency
  - [ ] For each board due for a scout run: extract topic scope + analyze existing board bookmarks
  - [ ] Construct semantic search queries from board's content profile
  - [ ] Call Grok `x_search()` with date range filter (since last scout run)
  - [ ] Filter out posts already on the board or dismissed previously
  - [ ] Score candidates by relevance to board's topic profile
  - [ ] Insert top 5-10 candidates into `board_bookmarks` with status: 'candidate'
  - [ ] Log scout run in `scout_runs` table
  - [ ] Send notification to board members: "Your Scout found 7 new posts for [Board Name]"

- [ ] **Build Radar tab UI**
  - [ ] Show scout candidates in a dedicated "Radar" tab on the board view
  - [ ] Each candidate shows: post preview, relevance score, Grok's reason for surfacing it
  - [ ] Quick actions: "Add to Board" (promote) or "Dismiss" with one click
  - [ ] Bulk promote/dismiss actions
  - [ ] Show scout run history: when it ran, how many found, how many promoted

### 4.3 Board UI

- [ ] **Build Board views in dashboard & extension**
  - [ ] Board list view with cards: name, topic, member avatars, bookmark count
  - [ ] Board detail view: bookmarks grid/list, Radar tab, members panel, settings
  - [ ] Board public page (opt-in): browsable by non-members, "Join" CTA
  - [ ] Real-time updates via Supabase Realtime: new bookmarks, scout candidates appear live
  - [ ] Member activity feed: "[User] added [post] to the board"
  - [ ] Board settings panel: topic scope, scout frequency, visibility, member management

---

## Phase 5: Social Proof & The Pulse (Month 3)

> **Goal:** Collective intelligence layer — "X users who bookmarked this also bookmarked..." and niche trending.
> **Status 2026-07-31: not started — zero code.**

### 5.1 Anonymous Signal Collection

- [ ] **Build privacy-preserving signal pipeline**
  - [ ] Add Pulse opt-in toggle in user settings (default: off)
  - [ ] On bookmark save (for opted-in users): compute topic embedding locally in extension
  - [ ] Add calibrated noise to embedding (local differential privacy)
  - [ ] Send noisy topic vector to server — NOT the bookmark URL or content
  - [ ] Store anonymous signals in `pulse_signals` table (id, noisy_embedding, topic_clusters, created_at) — no user_id
  - [ ] Build privacy documentation page explaining exactly what is collected

### 5.2 "Also Bookmarked" Recommendations

- [ ] **Build collaborative filtering engine**
  - [ ] Aggregate anonymous signals into topic co-occurrence matrix
  - [ ] Build "users who saved posts about [topic A] also save posts about [topic B]" model
  - [ ] Create `GET /api/pulse/related-topics/:topicId` endpoint
  - [ ] When user views a bookmark, show: "HelloAgain users who save posts like this also explore: [Topic 1], [Topic 2]"
  - [ ] Clicking a topic triggers Grok `x_search()` for top recent posts in that topic
  - [ ] Build subtle UI indicator on bookmark cards in extension sidebar

### 5.3 Pulse Trends Dashboard (Pro)

- [ ] **Build trending topics engine**
  - [ ] Compute topic velocity: rate of bookmark signals per topic over rolling 24h/7d windows
  - [ ] Filter trends by user's interest profile (don't show mass-market trends, show niche ones)
  - [ ] Create `GET /api/pulse/trends` endpoint with personalization
  - [ ] Build Pulse Trends dashboard page: topic cards with velocity indicators, sparkline charts
  - [ ] "Rising Posts" feed: posts with accelerating save rates among similar users
  - [ ] Grok integration: for each trending topic, fetch latest notable posts via `x_search()`

### 5.4 Save Velocity Indicators

- [ ] **Build on-timeline social proof (extension content script)**
  - [ ] For opted-in users: when viewing X timeline, check posts against Pulse data
  - [ ] Show subtle indicator (small icon) on posts being actively saved by similar users
  - [ ] Indicator appears only for posts with significant velocity (not every post)
  - [ ] Clicking indicator shows: "Saved by N users with interests like yours"
  - [ ] Ensure indicator doesn't interfere with X's UI or violate extension policies

---

## Phase 6: Community Knowledge Graphs (Month 4+)

> **Goal:** Self-assembling knowledge maps from community bookmark behavior.
> **Status 2026-07-31: not started — zero code** (would also need an email provider; none is integrated).

### 6.1 Community Infrastructure

- [ ] **Design Community database schema**
  - [ ] `communities` table (id, name, description, domain, is_public, owner_id, max_members, created_at)
  - [ ] `community_members` table (community_id, user_id, role, joined_at)
  - [ ] `community_signals` table (id, community_id, topic_cluster, post_metadata, contributed_at) — anonymous
  - [ ] `knowledge_nodes` table (id, community_id, topic, parent_topic_id, post_count, velocity, key_authors_json, canonical_posts_json, updated_at)
  - [ ] RLS policies for community access

- [ ] **Build Community CRUD API**
  - [ ] Create, list, join, leave, manage community endpoints
  - [ ] Enforce limits: free 2 communities, pro unlimited + create communities
  - [ ] Community discovery page: browse public communities by domain
  - [ ] Invite system similar to Signal Boards

### 6.2 Knowledge Graph Engine

- [ ] **Build automatic knowledge graph construction**
  - [ ] When community members bookmark posts relevant to the community domain, auto-contribute anonymous topic signal
  - [ ] Use Grok Collections API: upload community's aggregate content into a searchable collection
  - [ ] Periodic Grok synthesis job (weekly): analyze accumulated signals and build/update topic graph
  - [ ] Identify topic clusters, subtopic hierarchy, key voices, canonical threads
  - [ ] Compute topic velocity (emerging vs. established)
  - [ ] Store graph in `knowledge_nodes` table

- [ ] **Build gap-filling with Grok**
  - [ ] Compare community's bookmarked coverage against live X conversation
  - [ ] Use `x_search()` to find notable posts/threads on community topics that nobody has bookmarked
  - [ ] Surface gaps as "Recommended for community" in a moderation queue

### 6.3 Knowledge Graph UI

- [ ] **Build visual knowledge graph browser**
  - [ ] Interactive topic map (D3.js or similar): nodes = topics, edges = relationships, size = post count
  - [ ] Topic detail view: top posts, key authors, velocity chart, Grok-curated latest posts
  - [ ] Heat map overlay: which topics are gaining/fading
  - [ ] Community dashboard: member count, total contributions, weekly activity
  - [ ] "Community Digest" notification: weekly Grok-generated summary of community activity

### 6.4 Community Digest

- [ ] **Build weekly digest system**
  - [ ] Grok generates natural language summary of each community's weekly activity
  - [ ] Topics gaining momentum, top saved threads, emerging subtopics, key voices
  - [ ] Deliver via email (Resend or SendGrid) and in-app notification
  - [ ] Digest settings: email frequency, topic filters
  - [ ] Digest public page (for public communities) — drives SEO and discovery

---

## Cross-Cutting Concerns (Ongoing)

### Testing

> **Status 2026-07-31: zero automated tests.** No vitest/jest/playwright configs, no `*.test.*`/`*.spec.*` files, no `test` script in any `package.json`, no testing dependencies anywhere in the workspace. All verification to date has been manual.

- [ ] **Unit tests** — none
- [ ] **Integration tests** — none
- [ ] **E2E tests** — none

### DevOps & CI/CD

- [x] **Set up CI/CD pipeline** — **PARTIAL: mobile-only**
  - [ ] Lint + type check on every PR — *no such workflow; the only GH Actions are mobile builds*
  - [ ] Run unit + integration tests on every PR — *no tests exist*
  - [x] Build pipelines — *`codemagic.yaml`: iOS → TestFlight ("Internal Testers", shipped through build 15) + Android release AAB/APK, both on push to `develop`; GH Actions `build-ios.yml`/`build-android.yml` (smoke builds on `develop`), `release-mobile.yml` (manual, tags GitHub release with debug APK + simulator zip)*
  - [x] Auto-deploy web app to Vercel — *via the Vercel Git integration (not in-repo config)*
  - [ ] Extension build artifact uploaded to GitHub releases — *not automated*
  - [ ] Environment-specific deploys (staging) — *no staging environment*

- [ ] **Monitoring & observability** — **NOT BUILT except LLM cost logging**
  - [ ] Error tracking with Sentry — *absent (error handling is `console.error`)*
  - [ ] API performance monitoring — *absent (no analytics packages at all)*
  - [x] Grok API cost tracking — *structured `[llm-usage]` log lines per call (`lib/llm-usage.ts`); no dashboard on top*
  - [ ] Supabase database performance monitoring — *absent*
  - [ ] Uptime monitoring — *absent*

### Chrome Web Store Launch

- [ ] **Prepare for Chrome Web Store submission** — **NOT STARTED, and blocked by missing legal pages**
  - [ ] Extension description, screenshots, promotional images
  - [ ] Create privacy policy page — *no `privacy`/`terms`/`legal` routes exist; the login page renders dead "Terms"/"Privacy Policy" spans with no target*
  - [ ] Create terms of service page — *same*
  - [ ] Permission justifications / review submission / Product Hunt assets

---

## Milestone Summary

| Milestone | Target Date | Deliverable |
|---|---|---|
| **M1: Core Extension** | End of Week 2 | Working extension: import, save, search, organize, payments |
| **M2: AI Features** | End of Week 3 | Auto-tagging, smart search, summaries, related content |
| **M3: Bookmark Blend (MVP Complete)** | End of Week 4 | Blend invite, analysis, shareable card, public page |
| **M4: Signal Boards** | End of Month 2 | Collaborative boards with Grok Scout |
| **M5: Social Proof & Pulse** | End of Month 3 | Anonymous aggregate intelligence, trending, on-timeline indicators |
| **M6: Community Knowledge Graphs** | Month 4+ | Self-assembling community knowledge maps with digests |

---

## Pricing Reference

| Feature | Free | Pro ($9/mo) |
|---|---|---|
| Bookmarks | 500 | Unlimited |
| Folders | 5 | Unlimited |
| Search | Keyword | AI natural language |
| Auto-tagging | ❌ | ✅ |
| AI Summaries | ❌ | ✅ |
| Related Content | ❌ | ✅ |
| Bookmark Blend | 1/month | Unlimited |
| Blend Feed | ❌ | ✅ |
| Signal Boards | 1 board, 3 members | Unlimited, 8 members |
| Scout frequency | Daily | Hourly |
| The Pulse | "Also Bookmarked" only | Full dashboard + alerts |
| Communities | Join 2 | Unlimited + create |
| Export | CSV | CSV + JSON + API |

**Lifetime Deal (Launch):** $79 one-time = Pro forever (limited to first 500 buyers)

---

## Mobile Delivery Track (Capacitor)

### ✅ Completed (re-verified 2026-07-31)
- Added Capacitor to `apps/web` (`appId: com.helloagainlinks.app`, `appStartPath: /mobile`)
- Added Android/iOS platforms
- Added Share Target plugin + Android `SEND`/`SEND_MULTIPLE` intent filters — *⚠ `MobileShareSheet` ↔ `/api/mobile/share` response-shape mismatch (defect #5); `MobileShareListener.tsx` is dead code*
- Added shared URL ingestion endpoint (`/api/mobile/share`) with auto-tag on save
- Added background sync endpoint (`/api/sync/background`) — 5-guard model, cron + user modes; order-preserving descending-cursor ingest; X-402 credit exhaustion surfaced via `xApiError` body field (HTTP 200 — only the mobile settings page decodes it)
- Added client-side app-open/resume auto-sync (`lib/use-auto-sync.ts`) — native-only, **15-minute throttle** (widened from 2 min for X API cost), wired in `mobile/layout.tsx`
- Added pull-to-refresh + haptic feedback improvements
- Added mobile sort control + unclassified filter (PR #39), 5-tab mobile shell, 5-step (iOS) / 4-step (Android) onboarding, `helloagainlinks://` deep links + App Links
- **iOS TestFlight + Android release CI via Codemagic** — shipping since 2026-07-19, through TestFlight build 15
- Added mobile scripts (`scripts/mobile-build.mjs` static-export shuffle) and README mobile docs

### 🔜 Next
- **Create the iOS Share Extension target** — it does not exist in the Xcode project, yet `capacitor.config.ts` names it and onboarding step 4 (iOS) teaches users to enable it (defect #6). Native iOS share-sheet ingestion is non-functional until this ships.
- Fix the `/api/mobile/share` ↔ `MobileShareSheet` response contract (defect #5)
- Add background sync scheduler wiring (Vercel Cron/GitHub Actions/worker) — *still missing: `vercel.json` has no `crons`, no scheduled workflow anywhere*
- Add telemetry for share ingestion success/failure rates — *absent*
- Add retry/backoff for sync runs across large user sets — *absent; cron loop is sequential with no retry*
- External blocker: X developer account out of API credits (402) — sync imports nothing on any trigger until billing is resolved
