# HAL Dashboard Redesign — Design Spec

**Date:** 2026-04-22
**Status:** Proposed → pending user approval
**Author:** Brainstorming session (Rob + Claude)
**Target route:** `/dashboard/bookmarks`
**Phase plan target:** `.claude/plans/feature-hal-redesign.md` (generated next)

---

## 1. Context

HAL is an AI-powered X/Twitter bookmark manager (Turborepo monorepo: Next.js web app + Chrome extension + shared UI package + Supabase backend). The current dashboard uses the "Stark" theme — dark canvas with cyan/blue gradient accents and purple for AI signals.

A design handoff bundle was delivered from Claude Design (`/v1/design/h/erlX1yAQI1GVyVteD_Izhg`). The bundle contains a prototype of a new "obsidian + electric lime" dashboard with a 3-pane shell (Index | Feed | Signal), keyboard-first interactions (⌘K palette, ⌘J Signal toggle, ⌘B nav collapse), a bookmark Spread modal, and a Tweaks panel. Chat transcript confirms the user iterated through several directions before landing on this one, explicitly rejecting the prior cyan+purple palette as "AI slop" and a paper/library aesthetic as "not it."

This spec reconciles the new design with all existing features. No production users exist yet; solo dev + AI pair is the entire audience during build.

---

## 2. Goals

- Replace `/dashboard/bookmarks` with the new obsidian+lime 3-pane design
- Preserve every existing feature on the bookmarks page (see Section 7.1)
- Add user-editable **folders** with single-folder-per-bookmark semantics matching X.com
- Support **X.com folder import** via the existing Chrome extension (no X API dependency)
- Add a fully-wired **Signal rail** — Ask + Threads (persisted) + Related (clustered)
- Add a **Spread modal** for bookmark detail with Content / HAL analysis / Notes / Thread tabs
- Add a **⌘K command palette** for search + navigation + "Ask HAL"
- Add a **Tweaks panel** for density / layout / pulse (three axes, not all six from the prototype)
- Add **bulk selection** mode with batch actions (tag / move to folder / delete)
- Extend the classification pipeline to populate `ai_summary` + `ai_tags` on bookmarks

## 3. Non-Goals

- Redesigning the other dashboard routes (`/dashboard`, `/tags`, `/lists`, `/blend`, `/assistant`, `/settings`) — these migrate in a later follow-up
- Multi-folder per bookmark (single-folder, matches X.com)
- Multiple accent-color swatches in Tweaks (lime is the identity)
- Shade swap (obsidian vs charcoal) or typography swap (sans/mono/serif) in Tweaks
- Boot splash animation (cut — 650 ms of overhead per page load)
- Scanlines overlay (cut — HUD cliché)
- Replacing the `/dashboard/assistant` route (it becomes the expanded view of the same conversation model)
- Native X API bookmark-folder integration (bypassed in favor of extension-based import)
- Infinite scroll on the feed (pagination retained for Phase 1)

---

## 4. Architecture Overview

### 4.1 Data model — Supabase Migration 005

File: `supabase/migrations/005_add_folders_conversations_ai_annotations.sql`

```sql
-- Folders (user-editable; nullable x_folder_id for imported ones)
CREATE TABLE folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  x_folder_id   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, x_folder_id)
);
CREATE INDEX idx_folders_user ON folders(user_id);

-- Bookmark folder assignment (single folder per bookmark)
ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS folder_id   uuid REFERENCES folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_summary  text,
  ADD COLUMN IF NOT EXISTS ai_tags     jsonb,  -- array of {label: string, confidence: number}
  ADD COLUMN IF NOT EXISTS user_notes  text;   -- free-form notes for the Spread → Notes tab
CREATE INDEX idx_bookmarks_folder ON bookmarks(folder_id);

-- Conversations (persisted chat with HAL)
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New conversation',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

-- Messages (user + assistant turns)
CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('user', 'assistant')),
  content             text NOT NULL,
  cited_bookmark_ids  jsonb,  -- array of bookmark ids string[]
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- RLS policies (all four tables): user_id match enforces ownership.
-- (See migration file for full policy text.)
```

**Reversibility:** `DROP TABLE messages; DROP TABLE conversations; DROP TABLE folders;` + `ALTER TABLE bookmarks DROP COLUMN folder_id; DROP COLUMN ai_summary; DROP COLUMN ai_tags;`. No destructive defaults on bookmarks.

### 4.2 Component package structure

New subdir: `packages/ui/hal/` exporting the obsidian+lime component system. Keeps the existing Stark components untouched so other routes don't change until their own migration.

```
packages/ui/hal/
├── theme.ts                    # obsidian+lime tokens (CSS vars + TS constants)
├── primitives/
│   ├── Icon.tsx                # 40+ hairline stroke icons (ported from cp-icons.jsx)
│   ├── Chip.tsx                # tag/filter/annotation chip
│   ├── Button.tsx              # primary/ghost/icon variants
│   ├── StatusDot.tsx           # pulse dot with reduced-motion support
│   ├── BackgroundLayers.tsx    # dot grid + drifting radial glow
│   └── SegButton.tsx           # segmented control
├── feed/
│   ├── Card.tsx                # bookmark card, 3 density modes
│   ├── Feed.tsx                # feed container with pagination
│   ├── FeedHeader.tsx          # density toggles, live pill, Signal toggle
│   ├── ClassificationBanner.tsx # ported from current, restyled
│   └── BulkActionBar.tsx       # floating action bar when items selected
├── sidebar/
│   ├── Index.tsx               # left nav (Library + Subjects + Signal activity)
│   ├── SectionHead.tsx
│   ├── NavItem.tsx
│   ├── FolderList.tsx          # folders with live counts + New Folder
│   ├── SubjectChips.tsx        # tags as chips (read-only filter)
│   └── ActivityFeed.tsx        # live Signal events
├── signal/
│   ├── SignalRail.tsx          # right rail shell with tabs
│   ├── AskTab.tsx              # streaming AI chat
│   ├── ThreadsTab.tsx          # persisted conversations list
│   ├── RelatedTab.tsx          # clusters with strength bars
│   ├── Msg.tsx                 # single message with citations
│   └── CitationChip.tsx        # deep-links to Spread
├── spread/
│   ├── Spread.tsx              # bookmark detail modal
│   ├── ContentTab.tsx
│   ├── AnalysisTab.tsx         # ai_summary + ai_tags with confidence bars
│   ├── NotesTab.tsx
│   ├── ThreadTab.tsx
│   └── RelatedSidebar.tsx
├── palette/
│   ├── Palette.tsx             # ⌘K modal
│   ├── PaletteRow.tsx
│   └── PaletteSection.tsx
├── tweaks/
│   └── TweaksPanel.tsx         # density/layout/pulse only
└── index.ts                    # public exports
```

All files target ≤ 450 LOC (CLAUDE.md rule). Split further if exceeded.

### 4.3 Route layout

Primary change: `apps/web/src/app/dashboard/bookmarks/page.tsx` rewritten as the 3-pane shell composing components from `packages/ui/hal/`.

The dashboard layout (`apps/web/src/app/dashboard/layout.tsx`) keeps the outer nav (Dashboard / Bookmarks / Tags / Lists / Blend / Assistant) with the current Stark theme for now. The new Index sidebar lives *inside* the bookmarks page as its second column, beside the outer nav. In a later phase the outer nav will be restyled to match, but cross-route theme mixing is acceptable during this rollout.

`apps/web/src/app/dashboard/assistant/page.tsx` is refactored in Phase 4 to read/write from the same `conversations` + `messages` tables as the Signal rail. It becomes the "expanded view" — a button in the rail opens the current conversation there full-screen.

### 4.4 API surface additions

All under `apps/web/src/app/api/`:

**Folders**
- `GET  /api/folders` — list current user's folders with bookmark counts
- `POST /api/folders` — create (`{name}`)
- `PATCH /api/folders/[id]` — rename (`{name}`)
- `DELETE /api/folders/[id]` — delete (bookmarks become `folder_id = NULL`)
- `POST /api/folders/import-x` — bulk-upsert endpoint called by extension after scrape (`{folders: [{x_folder_id, name}], bookmark_folder_assignments: [{bookmark_x_post_id, x_folder_id}]}`)

**Bookmarks (additions)**
- `PATCH /api/bookmarks/[id]/folder` — move to folder (`{folder_id: string | null}`)
- `POST  /api/bookmarks/bulk` — batch ops (`{ids: string[], action: "tag" | "move-folder" | "delete", payload?}`)
- `GET   /api/bookmarks/[id]/related` — clustering (groups by shared `primary_category` + tag overlap, returns `[{id, strength}]`)
- **Extend** existing `POST /api/bookmarks/classify` to also generate `ai_summary` + `ai_tags` during LLM-fallback tier (not regex fast-path; regex doesn't produce summaries)

**Conversations**
- `GET    /api/conversations` — list user's conversations (ordered by `updated_at DESC`)
- `POST   /api/conversations` — create (`{title?}`, returns conversation)
- `GET    /api/conversations/[id]` — fetch with messages
- `POST   /api/conversations/[id]/messages` — append user message, stream AI response via Server-Sent Events (SSE), persist both turns with `cited_bookmark_ids`
- `DELETE /api/conversations/[id]`

All endpoints enforce user ownership via RLS + route-handler auth check (matching existing patterns in `apps/web/src/app/api/bookmarks/`).

### 4.5 Extension changes

Files touched (version bump required per user's `feedback_extension_version` memory):

- `apps/extension/src/x-interceptor.ts` — detect folder context from URL pattern `x.com/i/bookmarks/:folderId` + GraphQL response metadata; emit `X_INTERCEPT_BOOKMARKS` messages with attached `folder_context: {x_folder_id, folder_name}`
- `apps/extension/src/graphql-parser.ts` — extend parser to read folder metadata fields from X's GraphQL responses (folder list endpoint, folder detail endpoint)
- `apps/extension/src/bulk-import.ts` — new `startFolderWalkImport` function that: (1) enumerates user's folder list from X, (2) iterates through each folder URL via `window.location.href` navigation, (3) runs the existing `startScrollInterceptImport` with folder context, (4) reports progress in the overlay, (5) finalizes with a single `POST /api/folders/import-x` call
- `apps/extension/src/content.ts` — add entry point to trigger folder-walk mode from the HAL dashboard ("Import X folders" button)
- `apps/extension/package.json` — bump version (patch → minor per convention)
- `apps/extension/public/manifest.json` — bump version to match

**GraphQL parser defensive behavior:** if folder metadata is absent (X changes schema), fall back to capturing bookmarks without folder assignment and log a warning. Do not fail the whole import.

---

## 5. Feature detail by phase

### Phase 1 — Foundation

**Deliverables**
- Migration 005 applied to local Supabase; reversal tested
- `packages/ui/hal/theme.ts` with token export
- `packages/ui/hal/primitives/{Icon, Chip, Button, StatusDot, BackgroundLayers, SegButton}`
- `packages/ui/hal/index.ts` exports
- CI passes

**Not shipped this phase:** any visible route change (primitives only).

**Checkpoint:** `/git-workflow-planning:checkpoint 1 foundation (migration + primitives)`

### Phase 2 — Shell + feed

**Deliverables**
- `apps/web/src/app/dashboard/bookmarks/page.tsx` rewritten as 3-pane shell (Index placeholder + Feed with real bookmarks + Signal placeholder)
- `packages/ui/hal/feed/{Card, Feed, FeedHeader, ClassificationBanner}`
  - `FeedHeader` "Live pill" reads the current user's `profiles.sync_state.lastSyncAt` (added in migration 003) and formats it as a relative time (e.g. `SYNCED 2s ago`, `SYNCED 3m ago`). Refreshes every 15s. If no sync ever occurred, displays `NEVER SYNCED`.
- `packages/ui/hal/sidebar/{Index, SectionHead, NavItem}` — minimal, folders list still placeholder
- All preserved features from the current bookmarks page:
  - Search input (mobile-visible; desktop triggers ⌘K hint instead)
  - Pagination (current pattern)
  - Classification banner (non-free plan gated — matches current `userPlan !== 'free'` check)
  - BookmarkCard with Posted+Added dates, @handle, view-on-X link, tag pills, tag edit popover, delete button + confirmation modal
  - Tag pills colored from `tags.color`
  - Mobile: hamburger + drawer Index (reuses existing dashboard layout drawer pattern)
  - Pull-to-refresh + haptics preserved on feed
  - Live updates from extension via `postMessage`
- Feed densities: comfortable (default) / compact / grid rows

**Not shipped this phase:** folders (sidebar shows static placeholders for now), Signal rail (empty rail or hidden), Spread modal, Palette, Tweaks, bulk selection, AI annotations on cards.

**Checkpoint:** `/git-workflow-planning:checkpoint 2 shell and feed with preserved features`

### Phase 3 — Folders + X import

**Deliverables**
- Migration 005 applied (already done in P1) — folders table is live
- `packages/ui/hal/sidebar/{FolderList, SubjectChips}`
- Folders CRUD UI in sidebar: create / rename / delete via popover
- Folder picker on card (assign/move)
- API: `/api/folders` (list, create, rename, delete), `/api/bookmarks/[id]/folder`, `/api/folders/import-x`
- Extension: folder-aware interceptor + parser, `startFolderWalkImport`, "Import X folders" trigger in HAL dashboard
- Extension version bumped
- Folder filter state: clicking a folder filters feed by `folder_id`
- Counts in sidebar reflect current folder membership

**Checkpoint:** `/git-workflow-planning:checkpoint 3 folders and x import`

### Phase 4 — Signal rail

**Deliverables**
- `packages/ui/hal/signal/{SignalRail, AskTab, ThreadsTab, RelatedTab, Msg, CitationChip}`
- API: `/api/conversations` (GET/POST), `/api/conversations/[id]` (GET/DELETE), `/api/conversations/[id]/messages` (POST w/ SSE streaming), `/api/bookmarks/[id]/related`
- Ask tab: real streaming chat against Grok (via existing `/api/ai/assistant` integration extended with conversation persistence). Matches existing `/dashboard/assistant` plan gating — free users see the rail with a locked state ("AI assistant is a Pro feature"); the existing Pro-upgrade prompt pattern is reused.
- Threads tab: list past conversations, open one to continue
- Related tab: clusters by shared `primary_category` + tag overlap, strength bars, click-through to bookmarks
- Citation chips in assistant messages → open Spread modal for that bookmark
- Refactor `/dashboard/assistant/page.tsx` to use same conversations/messages model; add "Expand to full screen" button in the rail that navigates there with the current conversation id
- ⌘J keyboard shortcut to toggle rail

**Checkpoint:** `/git-workflow-planning:checkpoint 4 signal rail fully wired`

### Phase 5 — Palette + Spread + Tweaks + AI annotations

**Deliverables**
- `packages/ui/hal/palette/{Palette, PaletteRow, PaletteSection}` — ⌘K command palette with:
  - Bookmark search (wires to `/api/bookmarks/search`)
  - Folder navigation
  - Commands (toggle Signal, change density, open Tweaks)
  - "Ask HAL" fallback (creates/opens conversation, sends query, opens rail)
- `packages/ui/hal/spread/*` — bookmark detail modal:
  - Content tab (full text + media + metrics)
  - HAL analysis tab (`ai_summary` + `ai_tags` with confidence bars)
  - Notes tab (user-editable notes — note: needs minor schema addition `bookmarks.user_notes text`, or store in a separate `bookmark_notes` table; decision deferred to phase execution)
  - Thread tab (placeholder for "fetch thread context" — stub for now)
  - Related sidebar (uses `/api/bookmarks/[id]/related`)
- `packages/ui/hal/tweaks/TweaksPanel.tsx` — three axes only (density / layout / pulse), localStorage persistence, respects `prefers-reduced-motion` for pulse default
- Extend `POST /api/bookmarks/classify` LLM-fallback branch to also produce `ai_summary` (1-sentence rephrase) + `ai_tags` (array of `{label, confidence}`) — updates existing prompt
- Card annotation strip renders when `ai_summary` is non-null; hidden when null (graceful degrade)

**Checkpoint:** `/git-workflow-planning:checkpoint 5 palette spread tweaks and ai annotations`

### Phase 6 — Bulk + polish + cleanup

**Deliverables**
- `packages/ui/hal/feed/BulkActionBar.tsx` + selection mode in `Card` and `Feed`
- API: `/api/bookmarks/bulk` (action: tag | move-folder | delete)
- `prefers-reduced-motion` respected across all pulse/drift/shimmer animations (defaults to `pulse: off` in Tweaks)
- Remove any leftover dev artifacts (no boot splash, no scanlines in the final render path — they were never added but confirm)
- Delete confirmation modal restyled with new tokens (was already ported in P2; confirm visual polish)
- Lighthouse/accessibility pass on `/dashboard/bookmarks`
- Final `/git-workflow-planning:finish` to create PR

**Checkpoint:** `/git-workflow-planning:checkpoint 6 bulk selection and polish` → then `/git-workflow-planning:finish`

### 5.7 Phase-independent preserved features (audit checklist — all kept)

| Current feature | Preserved how |
|---|---|
| Debounced search (300 ms) | Feed header search input + ⌘K palette both call `/api/bookmarks/search` |
| Pagination (pageSize=20, prev/next) | Retained in `Feed` component |
| Classification banner (non-free plan gated, `/api/bookmarks/classify`) | `ClassificationBanner` component, top of feed |
| Pull-to-refresh (mobile, Capacitor haptic) | Retained in `Feed` container touch handlers |
| Live updates from extension via `postMessage` | Retained in page-level effect |
| BookmarkCard: @handle, author name, view-on-X icon | All retained in new `Card` |
| Posted + Added date pair | Retained — new card shows `Posted Apr 12 · Saved 2d ago` |
| Delete confirmation modal | Retained, restyled with new tokens |
| TagPopover (add/remove tags on bookmark) | Retained — accessible via `+` icon on card |
| Tag pills with color from `tags.color` | Retained — also clickable to filter (new behavior) |
| Framer Motion entry animations | Retained with reduced-motion guard |
| UserMenu + plan indicator | Retained in outer dashboard layout (unchanged) |

---

## 6. Mobile strategy

- **Layout:** Feed-first (Option A from brainstorming). Index = left drawer triggered by hamburger; Signal = right drawer triggered by ✨ icon in feed header.
- **Breakpoint:** 3-pane renders ≥ 1024 px viewport. Below that, single feed column with drawer nav. Signal rail is drawer-only on narrow viewports.
- **Native-app preservation:** Capacitor haptic feedback on taps (existing `triggerHaptic` calls retained). Pull-to-refresh gesture retained on feed.
- **Drawer pattern:** reuses the existing `AnimatePresence` drawer infra from `apps/web/src/app/dashboard/layout.tsx`.
- **Keyboard shortcuts (⌘K / ⌘J / ⌘B):** desktop only; hidden on touch devices.

---

## 7. Testing approach

- **Per-phase:** type-check + lint pass (enforced by `/git-workflow-planning:checkpoint`)
- **Phase 1:** manual verification that migration applies + reverts cleanly against a scratch DB
- **Phase 2:** chrome-devtools MCP smoke test — load `/dashboard/bookmarks`, verify feed renders, click delete → confirmation modal appears, tag popover opens, search filters results, classification banner appears when unclassified > 0
- **Phase 3:** chrome-devtools MCP test — create folder, rename, delete. Extension: manual test against a real X account with 2–3 small folders
- **Phase 4:** chrome-devtools MCP — open Signal rail, send message, receive streamed response, verify it persists to Threads tab, citation chips open Spread
- **Phase 5:** chrome-devtools MCP — ⌘K opens palette, typing filters, Enter on a bookmark opens Spread; Spread tabs all render with real data; Tweaks panel persists to localStorage
- **Phase 6:** chrome-devtools MCP — select 2 bookmarks, bulk-tag, verify API call; `prefers-reduced-motion` emulation kills animations
- **End-to-end:** full walkthrough script run before `/git-workflow-planning:finish`

No unit-test mandate for this feature; integration/E2E via the chrome-devtools MCP browser tools (`mcp__chrome-devtools__*`) is the primary safety net per CLAUDE.md Rule 4 (tests co-located with source `.test.ts` are supported but not required for UI-heavy work).

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| X.com GraphQL schema changes break folder-context detection | Defensive parser: if folder metadata absent, import bookmarks folder-less with a warning; don't fail the whole run |
| AI cost increase from adding `ai_summary` generation to classification | Only generate during LLM-fallback tier, not regex fast-path. Budget check before Phase 5 (estimate: +1 short LLM call per uncategorized bookmark on classify trigger; batched in groups of 50) |
| SSE streaming on Next.js route handlers misbehaves on Vercel | Use `Response` with readable stream per Next 14+ patterns; validate on preview deployment before Phase 4 finishes |
| Supabase RLS policies missed on new tables | Migration 005 includes explicit policies for `folders`, `conversations`, `messages`. Checkpoint 1 includes a manual RLS verification test. |
| Migration 005 fails mid-apply | All `ADD COLUMN` uses `IF NOT EXISTS`. All `CREATE TABLE` uses standard patterns. Run against scratch DB first. |
| Bookmark card annotation strip renders before classification extension ships | Annotation strip conditionally renders only when `ai_summary` is non-null. Backfill script as optional post-P5 action. |
| 3-pane Index sidebar conflicts visually with outer dashboard sidebar | Intentionally acceptable during this rollout (Scope B). Follow-up phase migrates the outer sidebar. |

---

## 9. Open questions (to resolve during execution)

1. **Notes tab storage:** resolved — `bookmarks.user_notes text` is in Migration 005 (Section 4.1). If future requirements emerge (multiple notes, shared notes), migrate to a dedicated `bookmark_notes` table then.
2. **Thread tab in Spread modal:** stub for Phase 5; real thread fetching (reading parent/replies from X) deferred. Acceptable as-is.
3. **Folder import merge strategy:** if a folder with the same `x_folder_id` already exists in HAL, do we update the name or leave it? **Default:** update (source-of-truth is X during import).

---

## 10. Success criteria

- `/dashboard/bookmarks` renders the new design at desktop, tablet, and mobile viewports
- Migration 005 applies cleanly; all new tables have RLS; reversal is clean
- Every preserved feature (Section 5.7 table) demonstrably still works
- At least one X folder imports end-to-end on a test account, with bookmarks correctly assigned
- ⌘K palette opens, searches bookmarks, routes "Ask HAL" to the Signal rail
- Signal rail Ask tab streams a real Grok response; conversation persists; visible in Threads tab; Related tab shows at least one cluster when sufficient data exists
- Spread modal opens from a card click and from a citation chip; HAL analysis tab renders with confidence bars for any classified bookmark
- Tweaks panel density/layout/pulse all persist across reload
- `prefers-reduced-motion` disables pulse/drift
- Lighthouse accessibility score ≥ 90 on `/dashboard/bookmarks`
- Extension version bumped; extension still works on non-folder X usage (backward compatible)
- All 6 phases pass `/git-workflow-planning:checkpoint` (type-check + lint green)
- Final PR created via `/git-workflow-planning:finish`

---

## 11. Build sequencing note

Per the project's Rule 8, implementation will be kicked off by `/git-workflow-planning:start feature hal-redesign` (from filename `.claude/plans/feature-hal-redesign.md`). Each of the six phases above ends with a `checkpoint` call. The `finish` call at the end creates the PR against `develop`.

Subagent usage during execution: each phase can dispatch specialized subagents in parallel where work is independent (e.g., in Phase 2: one agent for Card + one for FeedHeader + one for ClassificationBanner). The `superpowers:subagent-driven-development` skill is invoked at execution time.
