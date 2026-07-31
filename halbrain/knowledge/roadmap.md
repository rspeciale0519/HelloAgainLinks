---
kind: knowledge
slug: roadmap
status: current
updated: 2026-07-31
layer: roadmap
sources:
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - docs/dev-docs/PRD.md
  - docs/dev-docs/fieldtheory-inspired-upgrades.md
---

# Roadmap

Genuinely unbuilt work only — see [[knowledge/features]] for build-status
evidence. As of 2026-07-31 `DEVELOPMENT_ROADMAP.md` itself is reconciled
(audited checkboxes + defect list), so it and this file should agree; on
conflict trust whichever has the newer audit date.

## Audit defect triage — status after `bugfix/audit-defects` (2026-07-31)
Fixed on the branch (see DEVELOPMENT_ROADMAP.md audit header for per-item
detail): Blend invite 404, folder/tag search filters (**migration 012 must be
applied to prod before deploy**), extension side panel (0.5.5), mobile share
contract, sync enrichment write, unmetered Grok paths + `grok-3` default,
Stripe plan re-sync on `subscription.updated`, leaky Blend cap, dashboard
Recent sort, assistant count bug.

Still open / deferred:
- **iOS Share Extension missing** — needs a new native Xcode target + Apple
  provisioning decisions (user).
- **AskTab lock vs 25-msg free trial** — product decision.
- **Stripe webhook idempotency store** — needs a table; low current risk.

## Not started (Phases 4-6 — consistent, no code)
- **Signal Boards**, **The Pulse**, **Community Knowledge Graphs** (CKG would need an email provider — none integrated).

## Product gaps (documented, no code — re-confirmed 2026-07-31)
- Bookmark export (CSV/JSON) — anywhere (extension, web, API)
- Blend: ~~OG share card, public page~~ (BUILT 2026-07-31, `feature/blend-share-card`); still missing: Blend Feed, decline route, privacy controls, signup-then-accept flow
- Grok function calling / `x_search()` / Collections (blocks chat-based actions + discovery)
- Embeddings/pgvector (semantic/hybrid search, real duplicate detection)
- Account self-deletion (PRD AC-03)
- ~~Privacy policy + Terms pages~~ (BUILT 2026-07-31 — `/privacy` + `/terms`, login consent line linked; CWS content prep itself still open)
- Settings toggle for auto-tagging; custom-tag taxonomy; accept/reject UI for AI tags
- Nested folders + drag-and-drop; search highlighting; recent-searches history; offline save queue; Save+Tag
- Extension bulk-import path still has no automatic Tier-2 enrichment (manual banner only) — deliberate cost choice, revisit

## Mobile delivery track — next steps
- Create the iOS Share Extension target (defect 6) and fix the share response contract (defect 5)
- Server-side sync scheduler — still missing (no `crons`, no scheduled workflow); only client app-open/resume auto-sync (15-min throttle)
- Telemetry for share ingestion; retry/backoff for cross-user sync runs
- **Blocked externally:** X developer account out of API credits (402)

## Cross-cutting
- **Zero automated tests** (confirmed exhaustively: no configs/files/scripts/deps) — worth at least API-route smoke tests before feature work resumes
- No error tracking (Sentry) / product analytics — only `[llm-usage]` cost lines
- No lint/type-check CI on PRs (only mobile build workflows); `ui-hal` lint is a no-op
- LOC-cap refactors owed: `background.ts` 709, `page.tsx` 680, `content.ts` 580, `Popup.tsx` 579
- Dead-code sweep owed: 4 orphaned `/api/ai/*` routes, `/api/auth/login`, `/api/bookmarks/[id]/folder`, `/api/bookmarks/bulk-delete`, `MobileShareListener`, `HalMobileBar`/`HalDrawer`, extension `HAL_FOLDERS_IMPORT_X` + `fetchServerQueryId`

## Fieldtheory-inspired backend upgrades — all four shipped (unchanged)
Historical design rationale only; see [[knowledge/features]].
