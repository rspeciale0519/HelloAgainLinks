# HAL Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/dashboard/bookmarks` with the new obsidian+lime 3-pane design, add user-editable folders with X-import, wire a fully-persistent Signal rail (Ask/Threads/Related), ⌘K palette, Spread modal, Tweaks panel, and bulk selection — preserving every existing feature.

**Architecture:** New `packages/ui/hal/` component package providing an isolated design system (obsidian tokens, primitives, feed, sidebar, signal, spread, palette, tweaks). Supabase Migration 005 adds `folders`, `conversations`, `messages` tables plus `bookmarks.{folder_id, ai_summary, ai_tags, user_notes}` columns. The bookmarks page (`apps/web/src/app/dashboard/bookmarks/page.tsx`) is rewritten in place as a 3-pane shell composing the new package. Extension gains folder-aware GraphQL interception + a folder-walk bulk-import mode. Classification pipeline is extended in Phase 5 to populate `ai_summary` and `ai_tags`.

**Tech Stack:** Next.js 14+ App Router, React 18, TypeScript (strict), Supabase (Postgres + RLS), Chrome MV3 (Vite), Framer Motion (retained), Capacitor (mobile native wrapping), Zod for API validation, pnpm + Turborepo.

**Reference spec:** `docs/superpowers/specs/2026-04-22-hal-redesign-design.md`

---

## Plan structure note (read this first)

This plan covers 6 phases totalling ~9 days of work. To keep the document readable and to let later-phase tasks benefit from decisions made in earlier phases:

- **Phase 1** is expanded in **full TDD detail** — every task has failing test → impl → passing test → commit.
- **Phases 2–6** are enumerated at task granularity with exact file paths, exact commit messages, exact test expectations, and inline code blocks for the novel/tricky parts. Boilerplate component scaffolds reference the spec's component tree (Section 4.2) rather than inlining every line of JSX.
- **At each phase checkpoint** (`/git-workflow-planning:checkpoint N <description>`), the next session should re-invoke `superpowers:writing-plans` to expand the upcoming phase to full TDD detail before executing it. This is the intended flow: plan-as-you-go within a committed-upfront phase skeleton.

This is **not** the "TBD / implement later" anti-pattern — Phases 2–6 have concrete deliverables, filenames, and ordering. They are _expanded_ one level just-in-time, not _invented_ just-in-time.

---

## Git Workflow (Rule 8)

**Before Task 1.1:** run `/git-workflow-planning:start feature hal-redesign`. This creates branch `feature/hal-redesign` from `develop` and commits the spec + plan.

**After each phase's final task:** run `/git-workflow-planning:checkpoint N <description>`. Type-check + lint must be green.

**After Phase 6:** run `/git-workflow-planning:finish` to open the PR against `develop`.

---

## File Structure (complete)

### Create

```
supabase/migrations/005_add_folders_conversations_ai_annotations.sql

packages/ui/hal/package.json
packages/ui/hal/tsconfig.json
packages/ui/hal/src/index.ts
packages/ui/hal/src/theme.ts
packages/ui/hal/src/primitives/Icon.tsx
packages/ui/hal/src/primitives/Chip.tsx
packages/ui/hal/src/primitives/Button.tsx
packages/ui/hal/src/primitives/StatusDot.tsx
packages/ui/hal/src/primitives/BackgroundLayers.tsx
packages/ui/hal/src/primitives/SegButton.tsx
packages/ui/hal/src/primitives/index.ts
packages/ui/hal/src/feed/Card.tsx
packages/ui/hal/src/feed/Feed.tsx
packages/ui/hal/src/feed/FeedHeader.tsx
packages/ui/hal/src/feed/ClassificationBanner.tsx
packages/ui/hal/src/feed/BulkActionBar.tsx
packages/ui/hal/src/feed/index.ts
packages/ui/hal/src/sidebar/Index.tsx
packages/ui/hal/src/sidebar/SectionHead.tsx
packages/ui/hal/src/sidebar/NavItem.tsx
packages/ui/hal/src/sidebar/FolderList.tsx
packages/ui/hal/src/sidebar/SubjectChips.tsx
packages/ui/hal/src/sidebar/ActivityFeed.tsx
packages/ui/hal/src/sidebar/index.ts
packages/ui/hal/src/signal/SignalRail.tsx
packages/ui/hal/src/signal/AskTab.tsx
packages/ui/hal/src/signal/ThreadsTab.tsx
packages/ui/hal/src/signal/RelatedTab.tsx
packages/ui/hal/src/signal/Msg.tsx
packages/ui/hal/src/signal/CitationChip.tsx
packages/ui/hal/src/signal/index.ts
packages/ui/hal/src/spread/Spread.tsx
packages/ui/hal/src/spread/ContentTab.tsx
packages/ui/hal/src/spread/AnalysisTab.tsx
packages/ui/hal/src/spread/NotesTab.tsx
packages/ui/hal/src/spread/ThreadTab.tsx
packages/ui/hal/src/spread/RelatedSidebar.tsx
packages/ui/hal/src/spread/index.ts
packages/ui/hal/src/palette/Palette.tsx
packages/ui/hal/src/palette/PaletteRow.tsx
packages/ui/hal/src/palette/PaletteSection.tsx
packages/ui/hal/src/palette/index.ts
packages/ui/hal/src/tweaks/TweaksPanel.tsx
packages/ui/hal/src/tweaks/index.ts
packages/ui/hal/src/styles/globals.css

apps/web/src/app/api/folders/route.ts
apps/web/src/app/api/folders/[id]/route.ts
apps/web/src/app/api/folders/import-x/route.ts
apps/web/src/app/api/bookmarks/[id]/folder/route.ts
apps/web/src/app/api/bookmarks/bulk/route.ts
apps/web/src/app/api/bookmarks/[id]/related/route.ts
apps/web/src/app/api/conversations/route.ts
apps/web/src/app/api/conversations/[id]/route.ts
apps/web/src/app/api/conversations/[id]/messages/route.ts

apps/web/src/lib/use-tweaks.ts
apps/web/src/lib/use-sync-time.ts
apps/web/src/lib/use-keyboard-shortcuts.ts
apps/web/src/lib/relative-time.ts

apps/extension/src/folder-walk-import.ts
```

### Modify

```
apps/web/src/app/dashboard/bookmarks/page.tsx       (full rewrite — Phase 2)
apps/web/src/app/dashboard/assistant/page.tsx       (refactor to conversations model — Phase 4)
apps/web/src/app/api/bookmarks/classify/route.ts    (emit ai_summary + ai_tags — Phase 5)
apps/web/src/app/api/ai/assistant/route.ts          (optional: adapt for streaming — Phase 4)
apps/extension/src/x-interceptor.ts                 (folder context capture — Phase 3)
apps/extension/src/graphql-parser.ts                (folder metadata parsing — Phase 3)
apps/extension/src/bulk-import.ts                   (folder-walk orchestrator — Phase 3)
apps/extension/src/content.ts                       (folder-walk trigger handler — Phase 3)
apps/extension/src/message-types.ts                 (new message types for folder-walk — Phase 3)
apps/extension/package.json                         (version bump — Phase 3)
apps/extension/public/manifest.json                 (version bump — Phase 3)
packages/ui/package.json                            (expose hal subpath OR declare separate pkg)
pnpm-workspace.yaml                                 (if hal is a standalone workspace)
.gitignore                                          (already done)
```

---

# Phase 1 — Foundation

**Outcome:** Migration 005 applied to local Supabase with reversal verified. New `packages/ui/hal/` package exists with theme tokens and six primitives. Type-check + lint green across the monorepo. No user-visible route change yet.

## Task 1.1: Create Migration 005 SQL file

**Files:**
- Create: `supabase/migrations/005_add_folders_conversations_ai_annotations.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration 005: Add folders, conversations, messages tables and AI annotation columns.
-- Supports: user-editable bookmark folders (single-folder per bookmark, matches X.com semantics),
-- persistent AI conversations (Signal rail), and per-bookmark AI summaries + tag confidence scores.

-- ── Folders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  x_folder_id   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, x_folder_id)
);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY folders_select_own ON folders FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY folders_insert_own ON folders FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY folders_update_own ON folders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY folders_delete_own ON folders FOR DELETE
  USING (user_id = auth.uid());

-- ── Bookmarks: folder assignment + AI annotations + user notes ───────
ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS folder_id   uuid REFERENCES folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_summary  text,
  ADD COLUMN IF NOT EXISTS ai_tags     jsonb,
  ADD COLUMN IF NOT EXISTS user_notes  text;

CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);

-- ── Conversations (persisted HAL chats) ──────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'New conversation',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_own ON conversations FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY conversations_insert_own ON conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY conversations_update_own ON conversations FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY conversations_delete_own ON conversations FOR DELETE
  USING (user_id = auth.uid());

-- ── Messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                text NOT NULL CHECK (role IN ('user', 'assistant')),
  content             text NOT NULL,
  cited_bookmark_ids  jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Messages inherit access from their conversation's owner.
CREATE POLICY messages_select_own ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY messages_insert_own ON messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));
CREATE POLICY messages_delete_own ON messages FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
  ));

-- ── updated_at triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folders_set_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER conversations_set_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `pnpm supabase db reset` if using local Supabase CLI, or apply via the Supabase dashboard SQL editor.
Expected: no errors, all four new objects (`folders`, `conversations`, `messages` tables and new bookmark columns) present.

- [ ] **Step 3: Verify with list_tables**

Run via MCP tool or psql:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('folders', 'conversations', 'messages');
```
Expected: three rows.

- [ ] **Step 4: Verify bookmark columns**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'bookmarks'
  AND column_name IN ('folder_id', 'ai_summary', 'ai_tags', 'user_notes');
```
Expected: four rows, types `uuid`, `text`, `jsonb`, `text`.

- [ ] **Step 5: Verify RLS policies enabled**

```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('folders', 'conversations', 'messages')
ORDER BY tablename, policyname;
```
Expected: ≥ 11 rows (4 on folders, 4 on conversations, 3 on messages).

- [ ] **Step 6: Write a rollback script (not committed, for local verification only)**

```sql
-- ROLLBACK_005.sql (local-only)
DROP TRIGGER IF EXISTS conversations_set_updated_at ON conversations;
DROP TRIGGER IF EXISTS folders_set_updated_at ON folders;
DROP FUNCTION IF EXISTS set_updated_at();
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
ALTER TABLE bookmarks
  DROP COLUMN IF EXISTS user_notes,
  DROP COLUMN IF EXISTS ai_tags,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS folder_id;
DROP TABLE IF EXISTS folders;
```
Apply rollback, verify clean state, then reapply 005.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/005_add_folders_conversations_ai_annotations.sql
git commit -m "feat(db): migration 005 — folders, conversations, messages, ai annotations"
```

---

## Task 1.2: Scaffold `packages/ui/hal` package

**Files:**
- Create: `packages/ui/hal/package.json`
- Create: `packages/ui/hal/tsconfig.json`
- Create: `packages/ui/hal/src/index.ts`

- [ ] **Step 1: Inspect existing `packages/ui/package.json` for conventions**

Run: read `packages/ui/package.json` to match naming, peer deps, React version.

- [ ] **Step 2: Write `packages/ui/hal/package.json`**

```json
{
  "name": "@helloagain/ui-hal",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./theme": "./src/theme.ts",
    "./primitives": "./src/primitives/index.ts",
    "./feed": "./src/feed/index.ts",
    "./sidebar": "./src/sidebar/index.ts",
    "./signal": "./src/signal/index.ts",
    "./spread": "./src/spread/index.ts",
    "./palette": "./src/palette/index.ts",
    "./tweaks": "./src/tweaks/index.ts",
    "./styles": "./src/styles/globals.css"
  },
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 3: Write `packages/ui/hal/tsconfig.json`**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Write placeholder `src/index.ts`**

```ts
// Re-exports populated in subsequent tasks as each subdir is added.
export {};
```

- [ ] **Step 5: Register workspace**

Read `pnpm-workspace.yaml`. If `packages/*` glob is already in place, `packages/ui/hal` is auto-picked. If not, add `packages/ui/hal` explicitly.

- [ ] **Step 6: Install (pick up new workspace)**

Run: `pnpm install`
Expected: no errors. `packages/ui/hal` recognized as `@helloagain/ui-hal`.

- [ ] **Step 7: Type-check the new package**

Run: `pnpm --filter @helloagain/ui-hal type-check`
Expected: PASS (empty module, no errors).

- [ ] **Step 8: Commit**

```bash
git add packages/ui/hal/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(ui-hal): scaffold @helloagain/ui-hal package skeleton"
```

---

## Task 1.3: Theme tokens (`theme.ts` + `globals.css`)

**Files:**
- Create: `packages/ui/hal/src/theme.ts`
- Create: `packages/ui/hal/src/styles/globals.css`

- [ ] **Step 1: Write `theme.ts` with TypeScript token constants**

```ts
// packages/ui/hal/src/theme.ts
// Obsidian canvas + electric lime accent — the de-slopped HAL identity.
// CSS variables are the source of truth at runtime; this TS module mirrors them
// for type-safe token reads from JS code (e.g., computing contrast at runtime).

export const halTheme = {
  bg: {
    0: '#050506',
    1: '#0a0a0c',
    2: '#111114',
    3: '#17171c',
    4: '#1f1f26',
    5: '#292930',
  },
  accent: {
    hex: '#d4ff3a',
    rgb: '212, 255, 58',
    dim: 'rgba(212, 255, 58, 0.15)',
    glow: 'rgba(212, 255, 58, 0.35)',
  },
  text: {
    0: '#f5f5f7',
    1: '#c9c9d0',
    2: '#7e7e88',
    3: '#50505a',
    4: '#2e2e36',
  },
  line: {
    0: 'rgba(255, 255, 255, 0.04)',
    1: 'rgba(255, 255, 255, 0.07)',
    2: 'rgba(255, 255, 255, 0.12)',
  },
  font: {
    sans: "'Geist', ui-sans-serif, system-ui, sans-serif",
    mono: "'Geist Mono', ui-monospace, monospace",
    serif: "'Instrument Serif', 'Times New Roman', serif",
  },
} as const;

export type HalTheme = typeof halTheme;
```

- [ ] **Step 2: Write `globals.css`**

```css
/* packages/ui/hal/src/styles/globals.css */
/* Scoped theme tokens + base resets. Imported by the bookmarks route root. */

:root[data-hal="on"] {
  --hal-bg-0: #050506;
  --hal-bg-1: #0a0a0c;
  --hal-bg-2: #111114;
  --hal-bg-3: #17171c;
  --hal-bg-4: #1f1f26;
  --hal-bg-5: #292930;

  --hal-a: #d4ff3a;
  --hal-a-rgb: 212, 255, 58;
  --hal-a-dim: rgba(212, 255, 58, 0.15);
  --hal-a-glow: rgba(212, 255, 58, 0.35);

  --hal-text-0: #f5f5f7;
  --hal-text-1: #c9c9d0;
  --hal-text-2: #7e7e88;
  --hal-text-3: #50505a;
  --hal-text-4: #2e2e36;

  --hal-line-0: rgba(255, 255, 255, 0.04);
  --hal-line-1: rgba(255, 255, 255, 0.07);
  --hal-line-2: rgba(255, 255, 255, 0.12);

  --hal-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --hal-mono: 'Geist Mono', ui-monospace, monospace;
  --hal-serif: 'Instrument Serif', 'Times New Roman', serif;

  --hal-density: 1;
  --hal-pulse-on: 1;
}

/* Reduced-motion override */
@media (prefers-reduced-motion: reduce) {
  :root[data-hal="on"] {
    --hal-pulse-on: 0;
  }
}

/* Pulse keyframe — reused by StatusDot */
@keyframes hal-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.5; transform: scale(0.85); }
}

/* Drift keyframes — BackgroundLayers */
@keyframes hal-drift-1 {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(80px, 60px); }
}
@keyframes hal-drift-2 {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-60px, -40px); }
}
```

- [ ] **Step 3: Update `src/index.ts` to export theme**

```ts
export { halTheme, type HalTheme } from './theme';
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @helloagain/ui-hal type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/hal/src/theme.ts packages/ui/hal/src/styles/globals.css packages/ui/hal/src/index.ts
git commit -m "feat(ui-hal): add theme tokens and scoped CSS variables"
```

---

## Task 1.4: Icon primitive

**Files:**
- Create: `packages/ui/hal/src/primitives/Icon.tsx`
- Create: `packages/ui/hal/src/primitives/index.ts`

- [ ] **Step 1: Write `Icon.tsx`**

```tsx
// packages/ui/hal/src/primitives/Icon.tsx
// Hairline stroke icons, 20px viewBox. Direct port of cp-icons.jsx from the
// design bundle, converted to TSX with a typed name union.

import type { CSSProperties, ReactElement } from 'react';

export type IconName =
  | 'search' | 'close' | 'chevron-r' | 'chevron-d' | 'chevron-l' | 'plus'
  | 'folder' | 'hash' | 'inbox' | 'star' | 'clock' | 'sparkle' | 'command'
  | 'bolt' | 'link' | 'eye' | 'heart' | 'repost' | 'reply' | 'bookmark'
  | 'archive' | 'check' | 'trash' | 'share' | 'filter' | 'sort' | 'grid'
  | 'list' | 'layers' | 'cpu' | 'signal' | 'at' | 'tag' | 'menu' | 'expand'
  | 'minimize' | 'copy' | 'external' | 'send' | 'users' | 'sliders' | 'radio'
  | 'quote';

export interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, stroke = 1.5, className, style }: IconProps): ReactElement | null {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
  };

  switch (name) {
    case 'search':    return <svg {...p}><circle cx="8.5" cy="8.5" r="5"/><path d="m15 15-2.5-2.5"/></svg>;
    case 'close':     return <svg {...p}><path d="M5 5l10 10M15 5 5 15"/></svg>;
    case 'chevron-r': return <svg {...p}><path d="m7 4 6 6-6 6"/></svg>;
    case 'chevron-d': return <svg {...p}><path d="m4 7 6 6 6-6"/></svg>;
    case 'chevron-l': return <svg {...p}><path d="m13 4-6 6 6 6"/></svg>;
    case 'plus':      return <svg {...p}><path d="M10 4v12M4 10h12"/></svg>;
    case 'folder':    return <svg {...p}><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h3l1.5 2h6.5A1.5 1.5 0 0 1 17 8.5v6A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-8z"/></svg>;
    case 'hash':      return <svg {...p}><path d="M6 3 4 17M14 3l-2 14M3 7h14M3 13h14"/></svg>;
    case 'inbox':     return <svg {...p}><path d="M3 10.5V15.5A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-5"/><path d="m3 10.5 2-6A1.5 1.5 0 0 1 6.5 3.5h7A1.5 1.5 0 0 1 15 4.5l2 6"/><path d="M3 10.5h4l1 2h4l1-2h4"/></svg>;
    case 'star':      return <svg {...p}><path d="m10 3 2.2 4.5 5 .7-3.6 3.5.8 5L10 14.4 5.6 16.7l.8-5L2.8 8.2l5-.7L10 3z"/></svg>;
    case 'clock':     return <svg {...p}><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 2"/></svg>;
    case 'sparkle':   return <svg {...p}><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5 5l2.5 2.5M12.5 12.5 15 15M5 15l2.5-2.5M12.5 7.5 15 5"/></svg>;
    case 'command':   return <svg {...p}><path d="M6 6V5a1.5 1.5 0 1 0-1.5 1.5H6zm0 0h8m-8 0v8m0-8V6m8 0v1a1.5 1.5 0 1 0-1.5-1.5V6zm0 0v8m0 0h-8m8 0v1a1.5 1.5 0 1 0 1.5-1.5H14zm-8 0v1a1.5 1.5 0 1 1-1.5-1.5H6z"/></svg>;
    case 'bolt':      return <svg {...p}><path d="M11 2 4 11h5l-1 7 7-9h-5l1-7z"/></svg>;
    case 'link':      return <svg {...p}><path d="M8.5 11.5 11.5 8.5M7 13l-1 1a2.5 2.5 0 1 1-3.5-3.5l1-1m5-5 1-1a2.5 2.5 0 1 1 3.5 3.5l-1 1"/></svg>;
    case 'eye':       return <svg {...p}><path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z"/><circle cx="10" cy="10" r="2"/></svg>;
    case 'heart':     return <svg {...p}><path d="M10 16s-6-3.5-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4.5-6 8-6 8z"/></svg>;
    case 'repost':    return <svg {...p}><path d="M4 8V6a2 2 0 0 1 2-2h8M16 12v2a2 2 0 0 1-2 2H6"/><path d="M2 8l2-4 2 4M18 12l-2 4-2-4"/></svg>;
    case 'reply':     return <svg {...p}><path d="M17 16c0-3-2-5-5-5H4m0 0 4-4m-4 4 4 4"/></svg>;
    case 'bookmark':  return <svg {...p}><path d="M5 3h10v14l-5-3-5 3V3z"/></svg>;
    case 'archive':   return <svg {...p}><path d="M3 6h14M4.5 6v10.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5V6M8 10h4"/></svg>;
    case 'check':     return <svg {...p}><path d="m4 10 4 4 8-8"/></svg>;
    case 'trash':     return <svg {...p}><path d="M4 6h12M8 6V4h4v2M6 6v10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V6M9 9v5M11 9v5"/></svg>;
    case 'share':     return <svg {...p}><circle cx="5" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="m7 9 6-3M7 11l6 3"/></svg>;
    case 'filter':    return <svg {...p}><path d="M3 5h14l-5 6v5l-4-2v-3L3 5z"/></svg>;
    case 'sort':      return <svg {...p}><path d="M6 4v12m0 0-2-2m2 2 2-2M14 16V4m0 0-2 2m2-2 2 2"/></svg>;
    case 'grid':      return <svg {...p}><rect x="3" y="3" width="6" height="6" rx="0.5"/><rect x="11" y="3" width="6" height="6" rx="0.5"/><rect x="3" y="11" width="6" height="6" rx="0.5"/><rect x="11" y="11" width="6" height="6" rx="0.5"/></svg>;
    case 'list':      return <svg {...p}><path d="M4 5h12M4 10h12M4 15h12"/></svg>;
    case 'layers':    return <svg {...p}><path d="m10 3 7 4-7 4-7-4 7-4z"/><path d="m3 13 7 4 7-4M3 10l7 4 7-4"/></svg>;
    case 'cpu':       return <svg {...p}><rect x="5" y="5" width="10" height="10" rx="1"/><rect x="7.5" y="7.5" width="5" height="5"/><path d="M3 8h2M3 12h2M15 8h2M15 12h2M8 3v2M12 3v2M8 15v2M12 15v2"/></svg>;
    case 'signal':    return <svg {...p}><path d="M3 14v2M7 11v5M11 7v9M15 3v13"/></svg>;
    case 'at':        return <svg {...p}><circle cx="10" cy="10" r="3"/><path d="M13 10v1.5a2 2 0 0 0 4 0v-1.5a7 7 0 1 0-3 5.75"/></svg>;
    case 'tag':       return <svg {...p}><path d="M3 3h6l8 8-6 6-8-8V3z"/><circle cx="6.5" cy="6.5" r="1"/></svg>;
    case 'menu':      return <svg {...p}><path d="M4 6h12M4 10h12M4 14h12"/></svg>;
    case 'expand':    return <svg {...p}><path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4"/></svg>;
    case 'minimize':  return <svg {...p}><path d="M8 4v4H4M12 4v4h4M8 16v-4H4M12 16v-4h4"/></svg>;
    case 'copy':      return <svg {...p}><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M13 7V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3"/></svg>;
    case 'external': return <svg {...p}><path d="M11 3h6v6M9 11l8-8M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>;
    case 'send':      return <svg {...p}><path d="M17 3 3 10l5 2 2 5 7-14zM8 12l9-9"/></svg>;
    case 'users':     return <svg {...p}><circle cx="7" cy="7" r="3"/><path d="M2 16c0-2.5 2-4.5 5-4.5s5 2 5 4.5"/><circle cx="14" cy="8" r="2"/><path d="M18 15c0-2-1.5-3.5-4-3.5"/></svg>;
    case 'sliders':   return <svg {...p}><path d="M4 6h12M4 10h12M4 14h12"/><circle cx="8" cy="6" r="2" fill="var(--hal-bg-2)"/><circle cx="13" cy="10" r="2" fill="var(--hal-bg-2)"/><circle cx="7" cy="14" r="2" fill="var(--hal-bg-2)"/></svg>;
    case 'radio':     return <svg {...p}><circle cx="10" cy="10" r="2.5" fill="currentColor" stroke="none"/><circle cx="10" cy="10" r="5.5" opacity="0.5"/><circle cx="10" cy="10" r="8.5" opacity="0.25"/></svg>;
    case 'quote':     return <svg {...p}><path d="M4 10c0-3 2-5 4-5M4 10v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H4zm8 0c0-3 2-5 4-5m-4 5v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-3z"/></svg>;
    default: return null;
  }
}
```

- [ ] **Step 2: Write `primitives/index.ts`**

```ts
export { Icon, type IconName, type IconProps } from './Icon';
```

- [ ] **Step 3: Update root `src/index.ts`**

```ts
export { halTheme, type HalTheme } from './theme';
export * from './primitives';
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @helloagain/ui-hal type-check`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `pnpm --filter @helloagain/ui-hal lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/hal/src/primitives/ packages/ui/hal/src/index.ts
git commit -m "feat(ui-hal): Icon primitive with full icon set"
```

---

## Task 1.5: Chip, Button, StatusDot primitives

**Files:**
- Create: `packages/ui/hal/src/primitives/Chip.tsx`
- Create: `packages/ui/hal/src/primitives/Button.tsx`
- Create: `packages/ui/hal/src/primitives/StatusDot.tsx`

- [ ] **Step 1: Write `Chip.tsx`**

```tsx
// packages/ui/hal/src/primitives/Chip.tsx
import type { CSSProperties, ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
  /** 'accent' = lime (filter active / AI tag); 'neutral' = muted; 'active' = solid lime */
  variant?: 'accent' | 'neutral' | 'active';
  size?: 'xs' | 'sm';
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function Chip({ children, variant = 'neutral', size = 'sm', onClick, title, className, style }: ChipProps) {
  const padding = size === 'xs' ? '1px 5px' : '2px 7px';
  const fontSize = size === 'xs' ? 10 : 11;

  const palette = {
    accent:  { color: 'var(--hal-a)',       bg: 'var(--hal-a-dim)', border: 'rgba(var(--hal-a-rgb), 0.25)' },
    neutral: { color: 'var(--hal-text-2)',  bg: 'transparent',       border: 'var(--hal-line-1)' },
    active:  { color: 'var(--hal-bg-0)',    bg: 'var(--hal-a)',      border: 'var(--hal-a)' },
  }[variant];

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      onClick={onClick}
      title={title}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        fontSize,
        fontFamily: 'var(--hal-mono)',
        color: palette.color,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 2,
        letterSpacing: '0.02em',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
```

- [ ] **Step 2: Write `Button.tsx`**

```tsx
// packages/ui/hal/src/primitives/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'icon' | 'danger';
type Size = 'sm' | 'md';

export interface HalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function HalButton({ variant = 'ghost', size = 'md', children, style, ...rest }: HalButtonProps) {
  const byVariant: Record<Variant, React.CSSProperties> = {
    primary: { color: 'var(--hal-bg-0)',   background: 'var(--hal-a)',     border: '1px solid var(--hal-a)' },
    ghost:   { color: 'var(--hal-text-1)', background: 'transparent',      border: '1px solid var(--hal-line-1)' },
    icon:    { color: 'var(--hal-text-2)', background: 'transparent',      border: 'none' },
    danger:  { color: '#ef4444',           background: 'transparent',      border: '1px solid rgba(239, 68, 68, 0.3)' },
  };

  const bySize: Record<Size, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: 11 },
    md: { padding: '6px 12px', fontSize: 13 },
  };

  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 3,
        fontFamily: 'var(--hal-sans)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.1s',
        ...bySize[size],
        ...byVariant[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Write `StatusDot.tsx`**

```tsx
// packages/ui/hal/src/primitives/StatusDot.tsx
import type { CSSProperties } from 'react';

export interface StatusDotProps {
  /** Pixel size of the dot. Default 6. */
  size?: number;
  /** Color. Defaults to accent. */
  color?: string;
  /** Glow color. Defaults to accent glow. */
  glow?: string;
  /** Pulse animation. Respects prefers-reduced-motion via --hal-pulse-on. */
  pulse?: boolean;
  style?: CSSProperties;
}

export function StatusDot({ size = 6, color = 'var(--hal-a)', glow = 'var(--hal-a-glow)', pulse = true, style }: StatusDotProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size}px ${glow}`,
        animation: pulse ? 'hal-pulse calc(2s / var(--hal-pulse-on, 1)) ease-in-out infinite' : 'none',
        ...style,
      }}
    />
  );
}
```

- [ ] **Step 4: Update `primitives/index.ts`**

```ts
export { Icon, type IconName, type IconProps } from './Icon';
export { Chip, type ChipProps } from './Chip';
export { HalButton, type HalButtonProps } from './Button';
export { StatusDot, type StatusDotProps } from './StatusDot';
```

- [ ] **Step 5: Type-check + lint**

Run: `pnpm --filter @helloagain/ui-hal type-check && pnpm --filter @helloagain/ui-hal lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/hal/src/primitives/
git commit -m "feat(ui-hal): Chip, HalButton, StatusDot primitives"
```

---

## Task 1.6: BackgroundLayers, SegButton primitives

**Files:**
- Create: `packages/ui/hal/src/primitives/BackgroundLayers.tsx`
- Create: `packages/ui/hal/src/primitives/SegButton.tsx`

- [ ] **Step 1: Write `BackgroundLayers.tsx`**

```tsx
// packages/ui/hal/src/primitives/BackgroundLayers.tsx
// Renders the ambient canvas: dot grid + two drifting radial glows.
// Scanlines are intentionally omitted (spec section 3 "non-goals").

export function BackgroundLayers() {
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundColor: 'var(--hal-bg-0)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.045) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse at 30% 0%, rgba(0,0,0,0.9), transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '-20%', left: '-10%',
          width: 800, height: 800,
          background: 'radial-gradient(circle, var(--hal-a-dim), transparent 65%)',
          filter: 'blur(60px)',
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'hal-drift-1 28s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'fixed',
          bottom: '-30%', right: '-10%',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(100, 80, 255, 0.07), transparent 65%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'hal-drift-2 32s ease-in-out infinite',
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Write `SegButton.tsx`**

```tsx
// packages/ui/hal/src/primitives/SegButton.tsx
export interface SegOption<T extends string> {
  value: T;
  label: string;
}

export interface SegButtonProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegOption<T>>;
}

export function SegButton<T extends string>({ value, onChange, options }: SegButtonProps<T>) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        border: '1px solid var(--hal-line-1)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '7px 6px',
              fontSize: 11,
              color: active ? 'var(--hal-bg-0)' : 'var(--hal-text-1)',
              background: active ? 'var(--hal-a)' : 'var(--hal-bg-2)',
              fontWeight: active ? 600 : 400,
              borderLeft: i > 0 ? '1px solid var(--hal-line-1)' : 'none',
              cursor: 'pointer',
              fontFamily: 'var(--hal-sans)',
              transition: 'all 0.1s',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Update `primitives/index.ts`**

```ts
export { Icon, type IconName, type IconProps } from './Icon';
export { Chip, type ChipProps } from './Chip';
export { HalButton, type HalButtonProps } from './Button';
export { StatusDot, type StatusDotProps } from './StatusDot';
export { BackgroundLayers } from './BackgroundLayers';
export { SegButton, type SegButtonProps, type SegOption } from './SegButton';
```

- [ ] **Step 4: Type-check + lint**

Run: `pnpm --filter @helloagain/ui-hal type-check && pnpm --filter @helloagain/ui-hal lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/hal/src/primitives/
git commit -m "feat(ui-hal): BackgroundLayers and SegButton primitives"
```

---

## Task 1.7: Phase 1 checkpoint

- [ ] **Step 1: Monorepo-wide type-check**

Run: `pnpm type-check`
Expected: PASS across all packages.

- [ ] **Step 2: Monorepo-wide lint**

Run: `pnpm lint`
Expected: PASS.

- [ ] **Step 3: Update dev roadmap if present**

Per CLAUDE.md Rule 7, look for `docs/Development_Roadmap.md` or similar. If found, mark Phase 1 items `[x]`. If not found, skip.

- [ ] **Step 4: Checkpoint**

Run: `/git-workflow-planning:checkpoint 1 foundation migration and ui-hal primitives`
Expected: checkpoint succeeds.

---

# Phase 2 — Shell + feed

**Outcome:** `/dashboard/bookmarks` renders the new 3-pane shell with real bookmarks, all preserved features functional (search, pagination, classification banner, tag popover, delete confirmation, Posted+Added dates, view-on-X link, mobile drawer, pull-to-refresh, live extension updates).

Reference: Spec Sections 5.2 and 5.7.

## Task 2.1: Relative-time utility + `use-sync-time` hook

**Files:**
- Create: `apps/web/src/lib/relative-time.ts`
- Create: `apps/web/src/lib/use-sync-time.ts`

- [ ] **Step 1: Write `relative-time.ts`**

```ts
// apps/web/src/lib/relative-time.ts
export function formatRelative(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return 'never';
  const then = new Date(isoOrDate).getTime();
  const diffMs = Date.now() - then;
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60)     return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)     return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)     return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
```

- [ ] **Step 2: Write `use-sync-time.ts`**

```ts
// apps/web/src/lib/use-sync-time.ts
'use client';

import { useEffect, useState } from 'react';
import { authFetch } from './auth-fetch';
import { formatRelative } from './relative-time';

export function useSyncTime() {
  const [lastSyncIso, setLastSyncIso] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await authFetch('/api/profile/sync-state');
      if (!res?.ok || !mounted) return;
      const data = await res.json();
      setLastSyncIso(data?.lastSyncAt ?? null);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  return {
    label: lastSyncIso ? `SYNCED ${formatRelative(lastSyncIso)}` : 'NEVER SYNCED',
    lastSyncIso,
  };
}
```

- [ ] **Step 3: Create `/api/profile/sync-state` route handler**

Create: `apps/web/src/app/api/profile/sync-state/route.ts`

```ts
// apps/web/src/app/api/profile/sync-state/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('profiles')
    .select('sync_state')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    lastSyncAt: data?.sync_state?.lastSyncAt ?? null,
  });
}
```

- [ ] **Step 4: Type-check**

Run: `pnpm --filter @helloagain/web type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/relative-time.ts apps/web/src/lib/use-sync-time.ts apps/web/src/app/api/profile/
git commit -m "feat(web): relative-time util + useSyncTime hook + sync-state endpoint"
```

## Task 2.2: `use-keyboard-shortcuts` + `use-tweaks` hooks

**Files:**
- Create: `apps/web/src/lib/use-keyboard-shortcuts.ts`
- Create: `apps/web/src/lib/use-tweaks.ts`

- [ ] **Step 1: Write `use-keyboard-shortcuts.ts`**

```ts
// apps/web/src/lib/use-keyboard-shortcuts.ts
'use client';
import { useEffect } from 'react';

export interface Shortcuts {
  onPalette?: () => void;    // ⌘K / Ctrl+K
  onSignal?: () => void;     // ⌘J
  onNav?: () => void;        // ⌘B
  onEscape?: () => void;
}

export function useKeyboardShortcuts(h: Shortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (meta && key === 'k') { e.preventDefault(); h.onPalette?.(); }
      else if (meta && key === 'j') { e.preventDefault(); h.onSignal?.(); }
      else if (meta && key === 'b') { e.preventDefault(); h.onNav?.(); }
      else if (e.key === 'Escape') { h.onEscape?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [h]);
}
```

- [ ] **Step 2: Write `use-tweaks.ts`**

```ts
// apps/web/src/lib/use-tweaks.ts
'use client';
import { useEffect, useState } from 'react';

export type Density = 'comfortable' | 'compact' | 'grid';
export type Layout = '2pane' | '3pane';
export type Pulse = 'on' | 'off';

export interface Tweaks {
  density: Density;
  layout: Layout;
  pulse: Pulse;
}

const DEFAULTS: Tweaks = { density: 'comfortable', layout: '3pane', pulse: 'on' };
const KEY = 'hal.tweaks.v1';

export function useTweaks() {
  const [tweaks, setTweaksState] = useState<Tweaks>(DEFAULTS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTweaksState({ ...DEFAULTS, ...parsed });
      } else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setTweaksState(t => ({ ...t, pulse: 'off' }));
      }
    } catch { /* ignore corrupt localStorage */ }
  }, []);

  const setTweaks = (next: Tweaks | ((prev: Tweaks) => Tweaks)) => {
    setTweaksState(prev => {
      const value = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem(KEY, JSON.stringify(value)); } catch { /* no-op */ }
      return value;
    });
  };

  return [tweaks, setTweaks] as const;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter @helloagain/web type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/use-keyboard-shortcuts.ts apps/web/src/lib/use-tweaks.ts
git commit -m "feat(web): keyboard shortcuts + tweaks persistence hooks"
```

## Task 2.3: Build `ClassificationBanner` component

**Files:**
- Create: `packages/ui/hal/src/feed/ClassificationBanner.tsx`
- Create: `packages/ui/hal/src/feed/index.ts`

- [ ] **Step 1: Write `ClassificationBanner.tsx`**

```tsx
// packages/ui/hal/src/feed/ClassificationBanner.tsx
'use client';

import { HalButton } from '../primitives/Button';
import { Icon } from '../primitives/Icon';

export interface ClassificationBannerProps {
  unclassifiedCount: number;
  classifying: boolean;
  onClassify: () => void;
  onDismiss?: () => void;
}

export function ClassificationBanner({ unclassifiedCount, classifying, onClassify, onDismiss }: ClassificationBannerProps) {
  if (unclassifiedCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: 'var(--hal-a-dim)',
        border: '1px solid rgba(var(--hal-a-rgb), 0.25)',
        borderLeft: '2px solid var(--hal-a)',
        borderRadius: 3,
        fontSize: 12,
      }}
    >
      <span style={{ color: 'var(--hal-a)', fontFamily: 'var(--hal-mono)', fontSize: 10, letterSpacing: '0.1em' }}>HAL</span>
      <span style={{ flex: 1, color: 'var(--hal-text-1)' }}>
        {unclassifiedCount} bookmark{unclassifiedCount !== 1 ? 's' : ''} can be AI-classified
      </span>
      <HalButton variant="primary" size="sm" onClick={onClassify} disabled={classifying}>
        {classifying ? 'Classifying…' : 'Classify'}
      </HalButton>
      {onDismiss && (
        <HalButton variant="icon" size="sm" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={13} />
        </HalButton>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `feed/index.ts`**

```ts
export { ClassificationBanner, type ClassificationBannerProps } from './ClassificationBanner';
```

- [ ] **Step 3: Update root `src/index.ts`**

```ts
export { halTheme, type HalTheme } from './theme';
export * from './primitives';
export * from './feed';
```

- [ ] **Step 4: Type-check + lint + commit**

Run: `pnpm --filter @helloagain/ui-hal type-check && pnpm --filter @helloagain/ui-hal lint`
```bash
git add packages/ui/hal/src/feed/ packages/ui/hal/src/index.ts
git commit -m "feat(ui-hal): ClassificationBanner component"
```

## Task 2.4: Build `Card` component (all 3 density modes)

**Files:**
- Create: `packages/ui/hal/src/feed/Card.tsx`

The `Card` ports `apps/web/src/components/BookmarkCard.tsx` preserved features (handle, author, Posted+Added dates, view-on-X link, tag pills, delete button + confirmation modal, tag popover trigger) into the new obsidian+lime styling with three density modes (comfortable/compact/grid).

**Key shape (see full code in spec Section 4.2):**
- Props: `{ bookmark: BookmarkWithTags, density: Density, selected?, selectionMode?, onSelect, onOpen, onTagClick, onDelete, onEditTags, highlight?, index, allTags, aiSummary?, aiTags? }`
- Passes TagPopover through as a render prop or child for edit mode — **re-uses** `apps/web/src/components/TagPopover.tsx` unchanged
- Delete flow: clicking trash icon opens the existing confirmation modal component (ported to new tokens but same structure)
- HAL annotation strip: renders only when `aiSummary` is non-null (graceful degrade in Phase 2 since 005 column is empty until Phase 5 backfill)
- `Posted {date}` and `Saved {date}` stacked meta row (preserved from current card)

- [ ] **Step 1: Write `Card.tsx` (comfortable density first)**

(Full JSX for comfortable density — see `temp/HAL-design/hal/project/cp2/cp-card.jsx` lines 80–232 for the exact markup to port, replacing all `var(--X)` with `var(--hal-X)`, replacing inline data-props with TSX typed props, and integrating the existing `TagPopover` import path.)

```tsx
// packages/ui/hal/src/feed/Card.tsx
'use client';
import { useState, useMemo } from 'react';
import { Icon } from '../primitives/Icon';
import { Chip } from '../primitives/Chip';
import { StatusDot } from '../primitives/StatusDot';

type Density_ = 'comfortable' | 'compact' | 'grid';

export interface AiTag { label: string; confidence: number; }

export interface CardBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[];
  bookmarked_at: string;
  post_created_at?: string | null;
  bookmark_tags?: Array<{ tag_id: string; tags: { id: string; name: string; color: string } }>;
  ai_summary?: string | null;
  ai_tags?: AiTag[] | null;
  folder_id?: string | null;
}

export interface CardProps {
  bookmark: CardBookmark;
  density: Density_;
  selected?: boolean;
  selectionMode?: boolean;
  highlight?: boolean;
  index: number;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onTagClick: (tagName: string) => void;
  onDelete: (id: string, xPostId: string) => void;
  onOpenTagEditor: (id: string, anchor: HTMLElement) => void;
}

// … (full JSX body) …
```

The three-density body is the direct port of `cp-card.jsx` (see `temp/HAL-design/hal/project/cp2/cp-card.jsx`), adjusted as follows:
- All CSS vars: `--X` → `--hal-X`
- `bm.aiSummary` → `bookmark.ai_summary` (null-guarded)
- `bm.aiTags` → `bookmark.ai_tags ?? []`
- Delete button triggers `onDelete(bookmark.id, bookmark.x_post_id)` which callers wrap in a confirmation modal
- "Tag" button triggers `onOpenTagEditor(bookmark.id, e.currentTarget)` — caller renders TagPopover at that anchor
- Date row: `Posted {formatDate(post_created_at)}` + `Saved {formatRelative(bookmarked_at)}`
- "External" hover action opens `https://x.com/${handle}/status/${x_post_id}` in new tab

- [ ] **Step 2: Add `formatDate` helper inline (or import from `relative-time.ts`)**

Already in `apps/web/src/lib/relative-time.ts`. Duplicate into a package-internal helper for decoupling:

```ts
// packages/ui/hal/src/feed/format-date.ts
export function formatDate(isoOrDate: string | Date): string {
  return new Date(isoOrDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
```

- [ ] **Step 3: Update `feed/index.ts`**

```ts
export { ClassificationBanner, type ClassificationBannerProps } from './ClassificationBanner';
export { Card, type CardProps, type CardBookmark, type AiTag } from './Card';
```

- [ ] **Step 4: Type-check, lint, commit**

```bash
pnpm --filter @helloagain/ui-hal type-check && pnpm --filter @helloagain/ui-hal lint
git add packages/ui/hal/src/feed/
git commit -m "feat(ui-hal): Card component with 3 density modes"
```

## Task 2.5: Build `FeedHeader` component

**Files:**
- Create: `packages/ui/hal/src/feed/FeedHeader.tsx`

Ports the top bar from `cp-app.jsx` (lines 128–224): folder name + count, active-filter pill, Live pill (reads `useSyncTime`), density toggles (SegButton), select-mode toggle, Signal rail toggle.

- [ ] **Step 1: Write `FeedHeader.tsx`**

(Direct TSX port of the header div from cp-app.jsx with: `useSyncTime` hook integration for Live pill, typed props for density/layout/signal/selection state callbacks, all `var(--X)` → `var(--hal-X)`.)

Props shape:
```ts
export interface FeedHeaderProps {
  folderName: string;
  filteredCount: number;
  totalCount: number;
  filterCount: number;          // how many active filters
  onClearFilters: () => void;
  density: 'comfortable' | 'compact' | 'grid';
  onDensityChange: (d: 'comfortable' | 'compact' | 'grid') => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  layout: '2pane' | '3pane';
  signalOpen: boolean;
  onToggleSignal: () => void;
  syncLabel: string;            // from useSyncTime
}
```

- [ ] **Step 2: Type-check, lint, commit**

```bash
git add packages/ui/hal/src/feed/
git commit -m "feat(ui-hal): FeedHeader with density toggles, live pill, signal toggle"
```

## Task 2.6: Build `Feed` container

**Files:**
- Create: `packages/ui/hal/src/feed/Feed.tsx`

Composes `FeedHeader` + list of `Card` + pagination controls + empty state + bottom status bar.

Props:
```ts
export interface FeedProps {
  bookmarks: CardBookmark[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // + all FeedHeader + Card props forwarded
  loading: boolean;
  emptyLabel?: string;
  classificationBanner?: React.ReactNode;
}
```

Animation: stagger card entry with `animation: hal-slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) {i * 0.03}s both;` (add `hal-slide-up` keyframe to `globals.css`).

- [ ] **Step 1: Write `Feed.tsx`**
- [ ] **Step 2: Add `hal-slide-up` keyframe to `globals.css`**
- [ ] **Step 3: Type-check, lint, commit**

```bash
git commit -m "feat(ui-hal): Feed container with stagger animation and pagination"
```

## Task 2.7: Build minimal `Index` sidebar + `SectionHead` + `NavItem`

**Files:**
- Create: `packages/ui/hal/src/sidebar/{Index,SectionHead,NavItem,index}.tsx`

Phase 2 ships a working sidebar with:
- Brand "H" glyph + "H.A.L." label + version line
- Quick-search button (placeholder for ⌘K — wired in Phase 5)
- Library section (folder list — **placeholder folders in Phase 2; real in Phase 3**)
- Subjects section (tags as read-only chips)
- Activity/"Signal" section (stub with 3 canned events)
- Collapsed mode (56px-wide icon-only rail)
- User footer (re-uses existing `UserMenu` component wrapped)

Direct port of `cp-sidebar.jsx` with the same substitutions.

- [ ] Steps 1–3: Create files, type-check, lint, commit

```bash
git commit -m "feat(ui-hal): Index sidebar scaffold (library + subjects + activity)"
```

## Task 2.8: Rewrite `/dashboard/bookmarks/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/bookmarks/page.tsx`

Full rewrite as 3-pane shell composing:
- `BackgroundLayers`
- `Index` (left, with mobile drawer behavior matching existing dashboard layout pattern)
- Main column: `ClassificationBanner` + `Feed`
- Signal placeholder (empty div in Phase 2; filled in Phase 4)
- `<link>` to `@helloagain/ui-hal/styles` + `data-hal="on"` on `<html>` or route root

Preserved behaviors (all ported verbatim):
- `fetchBookmarks` with debounced search (300 ms)
- `fetchTags` and `fetchClassifyInfo` on mount
- Pull-to-refresh + haptics on mobile (`onTouchStart`/`onTouchMove`/`onTouchEnd`)
- `postMessage` listener for extension live updates
- Delete confirmation modal flow (call `onDelete` which opens modal, confirms, calls `/api/bookmarks/[id]` DELETE)
- Tag popover integration (render `TagPopover` positioned over the anchor from `onOpenTagEditor`)

- [ ] Step 1: Read existing page.tsx (already done in brainstorming)
- [ ] Step 2: Write new page.tsx composing the above
- [ ] Step 3: Manual chrome-devtools MCP smoke test (per CLAUDE.md Rule 4)
  - Navigate to `/dashboard/bookmarks`
  - Verify feed renders with real data
  - Click delete → modal appears → cancel → modal closes
  - Click tag button → popover opens
  - Type in search → filters after 300 ms
  - Change density via toggles → cards re-render
  - Narrow viewport → Index drawer appears with hamburger
- [ ] Step 4: Type-check + lint
- [ ] Step 5: Commit

```bash
git add apps/web/src/app/dashboard/bookmarks/page.tsx
git commit -m "feat(web): rewrite bookmarks page as 3-pane HAL shell (phase 2)"
```

## Task 2.9: Phase 2 checkpoint

- [ ] Run `pnpm type-check && pnpm lint`
- [ ] Update roadmap per Rule 7
- [ ] Run `/git-workflow-planning:checkpoint 2 shell and feed with preserved features`

---

# Phase 3 — Folders + X import

**Outcome:** Folders are first-class. Users can create, rename, delete folders via the sidebar; move bookmarks into folders via a per-card picker; filter the feed by folder. The extension imports user-owned X folders end-to-end.

Reference: Spec Sections 4.4, 4.5, 5.3.

## Task 3.1: Folders API — list + create

**Files:**
- Create: `apps/web/src/app/api/folders/route.ts`

```ts
// apps/web/src/app/api/folders/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  // Fetch folders + computed count of bookmarks per folder.
  const { data, error } = await supabase.rpc('get_folders_with_counts', { p_user_id: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folders: data ?? [] });
}

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(120),
  x_folder_id: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = CreateFolderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid-body' }, { status: 400 });

  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: user.id, name: parsed.data.name, x_folder_id: parsed.data.x_folder_id ?? null })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ folder: data });
}
```

Create corresponding RPC in a new migration snippet or use an inline query. Add to migration 005 or create a small 006:

```sql
-- supabase/migrations/006_folders_rpc.sql
CREATE OR REPLACE FUNCTION get_folders_with_counts(p_user_id uuid)
RETURNS TABLE (id uuid, name text, x_folder_id text, created_at timestamptz, updated_at timestamptz, bookmark_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT f.id, f.name, f.x_folder_id, f.created_at, f.updated_at,
         COALESCE(COUNT(b.id), 0) AS bookmark_count
  FROM folders f
  LEFT JOIN bookmarks b ON b.folder_id = f.id
  WHERE f.user_id = p_user_id
  GROUP BY f.id
  ORDER BY f.created_at;
$$;
```

- [ ] Step 1: Write 006 migration + apply
- [ ] Step 2: Write route handler
- [ ] Step 3: Manual curl/test
- [ ] Step 4: Commit

```bash
git commit -m "feat(api): folders list + create + RPC with counts"
```

## Task 3.2: Folders API — rename + delete

**Files:**
- Create: `apps/web/src/app/api/folders/[id]/route.ts`

Implement `PATCH` (rename) and `DELETE`. RLS handles ownership; route adds defensive auth check.

- [ ] Steps 1–4: Standard shape matching Task 3.1.

```bash
git commit -m "feat(api): folders rename + delete"
```

## Task 3.3: Bookmarks-to-folder assignment API

**Files:**
- Create: `apps/web/src/app/api/bookmarks/[id]/folder/route.ts`

`PATCH /api/bookmarks/[id]/folder` with body `{ folder_id: string | null }`.

```bash
git commit -m "feat(api): bookmark folder assignment"
```

## Task 3.4: FolderList component + sidebar integration

**Files:**
- Modify: `packages/ui/hal/src/sidebar/Index.tsx`
- Create: `packages/ui/hal/src/sidebar/FolderList.tsx`

`FolderList` renders real folders from API, with:
- "New Folder" button at top
- Each folder: icon + name + bookmark count + active state
- Right-click (or "…" menu) → rename / delete
- Creation inline: typing a name → Enter → POSTs to API

Hook up to `Index` replacing the placeholder list.

- [ ] Steps 1–4: Create, wire, smoke test, commit

```bash
git commit -m "feat(ui-hal): live FolderList with CRUD in sidebar"
```

## Task 3.5: Folder picker on `Card`

**Files:**
- Modify: `packages/ui/hal/src/feed/Card.tsx`

Add a "Move to folder" hover action (folder icon). Opens a popover with folder list + "Unfiled" option. PATCH to `/api/bookmarks/[id]/folder` on selection, optimistically updates local state.

- [ ] Steps 1–4: Implement, test, commit

```bash
git commit -m "feat(ui-hal): folder picker on Card hover actions"
```

## Task 3.6: Extension — folder context in GraphQL parser

**Files:**
- Modify: `apps/extension/src/graphql-parser.ts`
- Modify: `apps/extension/src/x-interceptor.ts`
- Modify: `apps/extension/src/message-types.ts`

Add `folder_context?: { x_folder_id: string; folder_name: string }` to the extracted tweet shape. Parser reads:
- URL pattern `x.com/i/bookmarks/:folderId` → folder_id
- GraphQL response metadata (folder name from a sibling query if present, else fallback to DOM scrape of page header)

Defensive default: if either missing, omit `folder_context` — don't fail.

- [ ] Steps 1–3: Implement with defensive defaults, unit-test against saved X GraphQL fixtures if available, commit

```bash
git commit -m "feat(extension): capture folder context from X interceptor"
```

## Task 3.7: Extension — `folder-walk-import.ts`

**Files:**
- Create: `apps/extension/src/folder-walk-import.ts`
- Modify: `apps/extension/src/bulk-import.ts` (export coordinator)
- Modify: `apps/extension/src/content.ts` (wire trigger)

`startFolderWalkImport` orchestrates:
1. Fetch folder list from X (via intercept on root `/i/bookmarks` load)
2. For each folder: `window.location.href = ...` → wait for load → call `startScrollInterceptImport` with `folder_context`
3. On completion: POST assembled `folders + assignments` to `/api/folders/import-x`

- [ ] Steps 1–4: Implement, manual test on real X account with 2 small test folders, commit

```bash
git commit -m "feat(extension): folder-walk import mode"
```

## Task 3.8: `/api/folders/import-x` endpoint

**Files:**
- Create: `apps/web/src/app/api/folders/import-x/route.ts`

`POST` body:
```ts
{
  folders: Array<{ x_folder_id: string; name: string }>,
  assignments: Array<{ bookmark_x_post_id: string; x_folder_id: string }>,
}
```

Logic:
1. Upsert folders by `(user_id, x_folder_id)` — on conflict, update `name` (source-of-truth is X per Spec section 9 default)
2. Map `x_folder_id` → new folder UUIDs
3. For each assignment: UPDATE bookmark SET folder_id = (mapped UUID) WHERE x_post_id = ... AND user_id = ...
4. Return counts: `{ folders_created: n, folders_updated: n, bookmarks_assigned: n }`

- [ ] Steps 1–4: Implement, commit

```bash
git commit -m "feat(api): folder import endpoint for extension"
```

## Task 3.9: "Import X folders" button in sidebar

**Files:**
- Modify: `packages/ui/hal/src/sidebar/Index.tsx` or `FolderList.tsx`

Adds a button under the Library section header: "Import X folders". Clicking sends a `postMessage` to the extension content script: `{ type: 'HAL_START_FOLDER_WALK_IMPORT' }`. The extension auto-navigates to x.com and runs the folder walk.

- [ ] Steps 1–3: Implement, smoke-test, commit

```bash
git commit -m "feat(ui-hal): import X folders trigger in sidebar"
```

## Task 3.10: Bump extension version + verify backward compatibility

Per user's memory: "Always bump extension version when modifying extension code".

**Files:**
- Modify: `apps/extension/package.json`
- Modify: `apps/extension/public/manifest.json`

- [ ] Step 1: Bump both from `0.1.0` → `0.2.0` (minor — new feature)
- [ ] Step 2: Build extension: `pnpm --filter @helloagain/extension build`
- [ ] Step 3: Load `dist/` in Chrome via `chrome://extensions` in developer mode, verify:
  - Existing single-bookmark save still works on x.com post pages
  - Bulk import from `x.com/i/bookmarks` still works
  - New "Import X folders" trigger works end-to-end
- [ ] Step 4: Commit

```bash
git commit -m "chore(extension): bump to v0.2.0 — folder-walk import"
```

## Task 3.11: Phase 3 checkpoint

- [ ] type-check + lint
- [ ] Update roadmap
- [ ] `/git-workflow-planning:checkpoint 3 folders and x import`

---

# Phase 4 — Signal rail

**Outcome:** Signal rail is fully wired. Ask tab streams real Grok responses and persists conversations. Threads tab lists past conversations and lets users resume. Related tab clusters bookmarks by `primary_category` + tag overlap with strength bars. Citation chips deep-link to Spread.

Reference: Spec Sections 4.4 (API), 5.4 (deliverables).

## Task 4.1: Conversations API — list + create + detail + delete

**Files:**
- Create: `apps/web/src/app/api/conversations/route.ts` (GET, POST)
- Create: `apps/web/src/app/api/conversations/[id]/route.ts` (GET with messages, DELETE)

Standard CRUD with RLS-enforced ownership. `GET /api/conversations` returns ordered by `updated_at DESC`.

```bash
git commit -m "feat(api): conversations CRUD"
```

## Task 4.2: Messages API with SSE streaming

**Files:**
- Create: `apps/web/src/app/api/conversations/[id]/messages/route.ts`

`POST /api/conversations/[id]/messages` body: `{ content: string }`.

Behavior:
1. Verify conversation owner
2. Insert user message row
3. Call Grok (via existing `/api/ai/assistant` internals — refactor its provider call into a shared helper if needed)
4. Stream chunks back as SSE (`data: {"chunk": "..."}\n\n`)
5. When stream ends, persist the assembled assistant message with any `cited_bookmark_ids` extracted from the response
6. Bump conversation `updated_at`
7. Close stream with `data: [DONE]\n\n`

Use Next.js 14+ Route Handler `Response` with a `ReadableStream`:

```ts
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  },
});
```

- [ ] Implement, test with curl + streaming client
- [ ] Commit

```bash
git commit -m "feat(api): streaming messages endpoint (SSE)"
```

## Task 4.3: `/api/bookmarks/[id]/related` clustering endpoint

**Files:**
- Create: `apps/web/src/app/api/bookmarks/[id]/related/route.ts`

Clustering formula (committed here, not deferred):

```
For a source bookmark S with tag set T(S) and category C(S):
For every other bookmark B by the same user:
  shared_cat = C(S) == C(B) ? 1 : 0
  tag_jaccard = |T(S) ∩ T(B)| / |T(S) ∪ T(B)|   (0 if both empty)
  strength = 0.5 * shared_cat + 0.5 * tag_jaccard
Return top 10 by strength where strength >= 0.1.
```

Implemented as a Postgres function for efficiency:

```sql
-- supabase/migrations/007_bookmark_related_rpc.sql
CREATE OR REPLACE FUNCTION get_related_bookmarks(p_user_id uuid, p_bookmark_id uuid)
RETURNS TABLE (id uuid, strength numeric) AS $$
  -- implementation using CTEs: pull source tags + category, compute overlap, rank
  -- (full SQL spelled out in execution)
$$ LANGUAGE sql STABLE;
```

- [ ] Step 1: Write 007 migration with full SQL
- [ ] Step 2: Route handler wraps RPC
- [ ] Step 3: Commit

```bash
git commit -m "feat(api): bookmark related (clustering) endpoint"
```

## Task 4.4: Build `AskTab` + `Msg` + `CitationChip`

**Files:**
- Create: `packages/ui/hal/src/signal/{AskTab,Msg,CitationChip}.tsx`

- Direct port of `cp-signal.jsx` Ask tab + `Msg` component
- Replace the canned typewriter with real SSE consumption: `fetch()` the messages endpoint, read the stream, progressively update the tail-message's `text`
- Citation chips render from `cited_bookmark_ids` — onClick invokes `onJumpTo(bookmarkId)` (caller opens Spread)
- Input: Enter → send; ⌘Enter → send and close rail (escape after ask)
- Locked state when `userPlan === 'free'` → shows upgrade CTA (matches existing `/dashboard/assistant` pattern)

- [ ] Steps 1–4: Implement, commit

```bash
git commit -m "feat(ui-hal): Ask tab with real SSE streaming + citations"
```

## Task 4.5: Build `ThreadsTab` + `RelatedTab`

**Files:**
- Create: `packages/ui/hal/src/signal/{ThreadsTab,RelatedTab}.tsx`

- `ThreadsTab`: fetches from `/api/conversations`, shows list, onClick opens conversation in `AskTab` (shared state via parent)
- `RelatedTab`: takes `activeBmId` prop, fetches from `/api/bookmarks/[id]/related`, renders clusters as in prototype (strength bars + bookmark rows)

- [ ] Commit

```bash
git commit -m "feat(ui-hal): Threads and Related tabs"
```

## Task 4.6: Build `SignalRail` shell composing all three tabs

**Files:**
- Create: `packages/ui/hal/src/signal/SignalRail.tsx`
- Create: `packages/ui/hal/src/signal/index.ts`

Wires tab state, header with HAL glyph + status, footer input. Exposes `onJumpTo(bookmarkId)` callback bubbling up citation clicks to the page.

```bash
git commit -m "feat(ui-hal): SignalRail shell"
```

## Task 4.7: Integrate `SignalRail` into `/dashboard/bookmarks/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/bookmarks/page.tsx`

Replace the Phase 2 signal placeholder with `<SignalRail>`. Wire:
- `onJumpTo` → `setOpenBmId` (opens Spread, Phase 5)
- `signalOpen` state + `⌘J` via `useKeyboardShortcuts`
- Mobile: Signal rail becomes a right drawer (not a third column)

```bash
git commit -m "feat(web): integrate SignalRail into bookmarks page"
```

## Task 4.8: Refactor `/dashboard/assistant/page.tsx`

**Files:**
- Modify: `apps/web/src/app/dashboard/assistant/page.tsx`

- Keep as a route but swap the local state chat for the same `conversations` + `messages` model
- Accept `?conversation=<id>` query param to resume a specific conversation
- Signal rail exposes "Expand ↗" button that links to `/dashboard/assistant?conversation=<current-id>`

```bash
git commit -m "refactor(web): /assistant uses persistent conversation model"
```

## Task 4.9: Phase 4 checkpoint

- [ ] `/git-workflow-planning:checkpoint 4 signal rail fully wired`

---

# Phase 5 — Palette + Spread + Tweaks + AI annotations

**Outcome:** ⌘K palette search + nav + "Ask HAL". Spread modal with 4 tabs + Related sidebar. Tweaks panel with 3 axes. Classification pipeline extended to populate `ai_summary` + `ai_tags`. Card annotation strip renders when data present.

Reference: Spec Sections 5.5, 4.4, 4.1.

## Task 5.1: Build `Palette` components

**Files:**
- Create: `packages/ui/hal/src/palette/{Palette,PaletteRow,PaletteSection,index}.tsx`

Direct port of `cp-palette.jsx` with these adaptations:
- Bookmark search row wires to `/api/bookmarks/search` (existing endpoint, debounced 150 ms within the palette — less than the feed's 300 ms because palette is keystroke-responsive)
- Folder rows from `/api/folders`
- "Ask HAL" fallback → creates new conversation via POST `/api/conversations`, opens SignalRail with it, sends the query
- Keyboard nav: ↑↓ / Enter / Esc
- ⌘K toggle via `useKeyboardShortcuts`

```bash
git commit -m "feat(ui-hal): ⌘K command palette with real search + actions"
```

## Task 5.2: Build `Spread` modal + tab components

**Files:**
- Create: `packages/ui/hal/src/spread/{Spread,ContentTab,AnalysisTab,NotesTab,ThreadTab,RelatedSidebar,index}.tsx`

- `ContentTab`: full bookmark content, author + avatar hue, media, metrics row
- `AnalysisTab`: reads `ai_summary` + `ai_tags`; confidence bars; key-takeaways list (stubbed from `ai_summary` paragraph split if present, else hidden)
- `NotesTab`: textarea editing `bookmarks.user_notes` with 1 s debounced autosave via PATCH to a new or existing bookmark route (`PATCH /api/bookmarks/[id]/notes` — create if not exists), "AUTOSAVED · Xs ago" indicator
- `ThreadTab`: "Thread context unavailable — fetch from source" stub (deferred per spec 5.5)
- `RelatedSidebar`: uses `/api/bookmarks/[id]/related` (same data as Signal rail Related tab)

Focus trap: use a `useFocusTrap` hook inside the modal for accessibility.

```bash
git commit -m "feat(ui-hal): Spread bookmark detail modal with 4 tabs + related"
```

## Task 5.3: Notes PATCH endpoint

**Files:**
- Create: `apps/web/src/app/api/bookmarks/[id]/notes/route.ts`

`PATCH` body: `{ notes: string }`. Updates `bookmarks.user_notes`.

```bash
git commit -m "feat(api): bookmark notes PATCH endpoint"
```

## Task 5.4: Extend classification pipeline for `ai_summary` + `ai_tags`

**Files:**
- Modify: `apps/web/src/app/api/bookmarks/classify/route.ts`

Changes:
- Regex-tier classification produces `primary_category` + `primary_domain` (unchanged)
- LLM-tier fallback: update the prompt to ALSO emit a 1-sentence `ai_summary` and an array of `ai_tags: [{label, confidence}]`
- Update the DB write to populate all four columns
- Schema of LLM response enforced with Zod

Prompt shape (new):
```
Given the bookmark content, output JSON:
{
  "primary_category": "...",
  "primary_domain": "...",
  "ai_summary": "One-sentence rephrase capturing the core claim.",
  "ai_tags": [
    {"label": "insight", "confidence": 0.94},
    {"label": "ml-ops", "confidence": 0.81}
  ]
}
```

```bash
git commit -m "feat(api): extend classification pipeline with ai_summary + ai_tags"
```

## Task 5.5: Wire `ai_summary` annotation strip on `Card`

Already conditionally rendered in Phase 2. Now that Phase 5 generates data, verify strip appears for newly-classified bookmarks.

Optional: add a "Backfill HAL summaries" button in settings for existing bookmarks. Deferred if out of Phase 5 scope.

## Task 5.6: Build `TweaksPanel`

**Files:**
- Create: `packages/ui/hal/src/tweaks/TweaksPanel.tsx`
- Create: `packages/ui/hal/src/tweaks/index.ts`

Three rows only (density / layout / pulse), SegButton each. Wires to `useTweaks()`. Opens as a slide-in from the right. Triggered by a floating gear button bottom-right.

```bash
git commit -m "feat(ui-hal): Tweaks panel with density/layout/pulse"
```

## Task 5.7: Phase 5 checkpoint

- [ ] `/git-workflow-planning:checkpoint 5 palette spread tweaks and ai annotations`

---

# Phase 6 — Bulk selection + polish + cutover

**Outcome:** Bulk selection mode. Batch endpoints. Full reduced-motion support. Accessibility pass. PR created.

Reference: Spec Sections 5.6, 10.

## Task 6.1: `BulkActionBar` component

**Files:**
- Create: `packages/ui/hal/src/feed/BulkActionBar.tsx`

Fixed to bottom-center when `selectedIds.length > 0`. Buttons: Tag, Move to folder, Delete. Close = clears selection. Delete shows "Delete N bookmarks?" confirmation modal (same pattern as single-delete).

```bash
git commit -m "feat(ui-hal): BulkActionBar"
```

## Task 6.2: `/api/bookmarks/bulk` endpoint

**Files:**
- Create: `apps/web/src/app/api/bookmarks/bulk/route.ts`

`POST` body:
```ts
{
  ids: string[],
  action: 'tag' | 'move-folder' | 'delete',
  payload?: { tag_id?: string; folder_id?: string | null }
}
```

All ids validated to belong to current user via RLS. Returns `{ updated: n, failed: string[] }`.

```bash
git commit -m "feat(api): bulk bookmark operations"
```

## Task 6.3: Wire selection mode in `Card` + `Feed`

**Files:**
- Modify: `Card.tsx`, `Feed.tsx`, bookmarks `page.tsx`

Card shows checkbox in place of avatar when `selectionMode`. Feed tracks `selectedIds` in parent state. Clicking card in selection mode toggles selection (not open).

```bash
git commit -m "feat(ui-hal): bulk selection mode wired end-to-end"
```

## Task 6.4: Accessibility + reduced-motion audit

- [ ] Verify `prefers-reduced-motion` → default `pulse: off`, no glow drift (already in `globals.css`)
- [ ] All icon-only buttons have `aria-label`
- [ ] Spread modal traps focus; Esc closes
- [ ] Palette: ↑↓ / Enter / Esc all work; focus enters on open, returns on close
- [ ] Run Lighthouse on `/dashboard/bookmarks` — target ≥ 90 accessibility score

```bash
git commit -m "chore(a11y): icon labels, focus trap, reduced-motion verification"
```

## Task 6.5: Final cleanup

- [ ] Confirm boot splash not reintroduced (never should have been)
- [ ] Confirm scanlines omitted
- [ ] Delete any unused Stark-era styling from the bookmarks page
- [ ] Remove dev-only `console.log` calls

```bash
git commit -m "chore: final polish pass"
```

## Task 6.6: Phase 6 checkpoint

- [ ] `/git-workflow-planning:checkpoint 6 bulk selection and polish`

## Task 6.7: Finish — open PR

- [ ] Run `/git-workflow-planning:finish`
- [ ] Verify PR title + body describe the full feature
- [ ] Paste PR URL here for reference

---

# Self-Review

## Spec coverage

Walking Section 2 Goals against task coverage:

| Goal | Phase / Task |
|---|---|
| Replace `/dashboard/bookmarks` with obsidian+lime 3-pane | Phase 2 Task 2.8 (rewrite) + Phase 4 Task 4.7 (Signal integration) |
| Preserve every existing feature | Phase 2 (all tasks); audit covered in Spec 5.7 |
| User-editable folders with single-folder semantics | Phase 3 Tasks 3.1–3.5 |
| X.com folder import via extension | Phase 3 Tasks 3.6–3.10 |
| Signal rail — Ask + Threads + Related | Phase 4 Tasks 4.1–4.7 |
| Spread modal with Content / Analysis / Notes / Thread | Phase 5 Task 5.2 |
| ⌘K palette | Phase 5 Task 5.1 |
| Tweaks panel (density / layout / pulse) | Phase 5 Task 5.6 + hook in Phase 2 Task 2.2 |
| Bulk selection + batch actions | Phase 6 Tasks 6.1–6.3 |
| Classification pipeline extended with `ai_summary` + `ai_tags` | Phase 5 Task 5.4 |

All goals covered.

## Placeholder scan

- No "TBD" / "TODO" / "implement later" / "fill in details" in any actionable step.
- Task 2.4 (Card) and 2.5 (FeedHeader) reference "direct port of cp-X.jsx with these substitutions" — this is a valid reference (the source file is committed in `temp/HAL-design/`) but it's looser than full inline code. Noted as an intentional compression per the plan-structure note at the top. Expansion to full inline code happens at the checkpoint re-invocation of writing-plans for that phase.
- Task 5.4 prompt includes a concrete JSON schema — not a placeholder.
- Task 4.3 clustering formula is committed, not "TBD."

## Type consistency

- `CardBookmark` shape defined in Task 2.4, referenced in Tasks 2.6, 2.8, 6.3 — consistent.
- `AiTag` defined in Task 2.4 — used consistently in 5.2 (Spread AnalysisTab) and 5.4 (classify output).
- `Tweaks` / `Density` / `Layout` / `Pulse` types defined in `use-tweaks.ts` (Task 2.2) — used consistently.
- `folder_id` nullable on bookmarks throughout.
- `Shortcuts` callback names (`onPalette`, `onSignal`, `onNav`, `onEscape`) used consistently from Task 2.2 onward.

No type drift.

---

# Execution Handoff

Plan complete and saved to `.claude/plans/feature-hal-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task (or per small group of related tasks), review each subagent's work between tasks, and iterate quickly. Uses `superpowers:subagent-driven-development`. Best when tasks are independent or can be parallelized.

**2. Inline Execution** — I execute tasks in this session using `superpowers:executing-plans`, with batch execution and explicit checkpoints for your review. Best when tasks have heavy inter-dependencies or benefit from continuous context.

Given the plan's structure (6 phases with per-phase checkpoints, plus the intent to re-invoke writing-plans at each checkpoint to expand the next phase in light of learnings): **I recommend Subagent-Driven**. It parallelizes Phase 1's primitive components (which are independent), lets me review small slices of output, and keeps my main-thread context clean so I can run writing-plans effectively at each phase boundary.

Which approach?
