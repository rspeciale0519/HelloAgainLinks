---
kind: knowledge
slug: orientation
status: current
updated: 2026-07-24
layer: orientation
sources:
  - README.md
  - docs/dev-docs/PRD.md
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - package.json
  - docs/x-api/bookmarks-reference.md
---

# Orientation

**HAL (`helloagain`)** — AI-powered bookmark manager for X/Twitter. Solves X's
lack of search/tags/organization for saved posts by layering Grok-based
AI (auto-tag, NL search, summaries) + planned social features (Bookmark
Blend today; Signal Boards/Pulse/Community Graphs — none built, see
[[knowledge/roadmap]]) on top of best-in-class personal bookmark management.
Target user: power X users (5K-100K followers, 10-50 saves/week). PRD:
`docs/dev-docs/PRD.md`.

## Shape of the repo
pnpm + Turborepo monorepo (`packageManager: pnpm@10.28.2`).
- `apps/extension` — Chrome MV3 extension (TS + React 19): save, bulk
  import (direct-GraphQL-first, scroll-intercept fallback), folder-walk
  import, search, sidepanel.
- `apps/web` — Next.js 16 + React 19 App Router backend/dashboard, wraps
  the same UI as a Capacitor mobile shell (iOS/Android) for
  `com.helloagainlinks.app`.
- `packages/shared` — cross-cutting logic (classification regex, bookmark
  merge scoring, sync guards) consumed by both `apps/web` and the
  extension build.
- `packages/ui` / `packages/ui/hal` — component library; the `hal/`
  subpackage is the redesigned dashboard's primitive/component set
  (Palette, Spread, TweaksPanel, SignalRail, etc.).
- `supabase/migrations` — Postgres schema (10 tracked migrations; the
  pre-existing baseline tables — `bookmarks`, `profiles`, `tags` — predate
  migration tracking, so their DDL isn't in the repo, but `bookmarks` and
  `bookmark_tags` are confirmed RLS-enabled in prod, verified 2026-07-24).
  Migration 010 is the RPC-authorization hardening — see
  [[skills/supabase-definer-rpc-authz]] before touching any `SECURITY DEFINER`
  function.

## Integrations (all confirmed by direct code inspection — see [[knowledge/features]])
Supabase (Postgres + Auth + RLS; **no** Storage/Realtime/pgvector wired
despite PRD mentions) · X API v2 OAuth2 PKCE + bookmarks endpoints
(`docs/x-api/bookmarks-reference.md` — note X's API caps at 800 most-recent
bookmarks and has no folder CRUD, which is *why* the extension does
folder-walk import) · Grok/xAI plain chat completions (**not** function
calling / `x_search` tool / Collections API — PRD overclaims this, see
[[knowledge/superseded]] #4/#6) · Stripe (Checkout/Subscriptions/Portal/
webhooks) · Capacitor (share target, haptics, preferences). Sentry,
PostHog/Plausible, and any email provider are **not installed** — mentioned
in docs only.

## What's actually built vs. what the roadmap doc implies
The redesigned dashboard, extension, AI features (except real function
calling), Blend (except the OG share card), mobile app, Stripe, and all
four fieldtheory-inspired backend upgrades are **BUILT**. `DEVELOPMENT_ROADMAP.md`'s
original Phase 1-3 MVP checkboxes are stale/unchecked despite this — don't
trust them; see [[knowledge/superseded]] #1. Genuinely unbuilt: Signal
Boards, The Pulse, Community Knowledge Graphs (Phases 4-6) — zero code,
consistent with the PRD's own out-of-scope list. Full detail:
[[knowledge/features]] · [[knowledge/roadmap]].

## Known live issues (operator-confirmed, re-verified 2026-07-18)
StrictMode auth-flash on login redirect, client-side-only tag filtering
(cross-page filtering broken), two components exceeding the 450-LOC cap
and growing, a division-by-zero CSS calc trick in `StatusDot`, a
placeholder lint script in `ui-hal`. Full list with paths:
[[knowledge/superseded]] "Operator corrections."

## Where to look next
Feature-level build status + evidence → [[knowledge/features]].
Genuinely open roadmap work → [[knowledge/roadmap]].
Doc-vs-code and doc-vs-doc conflicts → [[knowledge/superseded]].
Session history → `journal/`. Current focus → `STATE.md`.
