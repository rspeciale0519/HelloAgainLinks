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

## Defects worth fixing first (from the 2026-07-31 audit — full list in DEVELOPMENT_ROADMAP.md header)
1. **Blend invite links 404** — no `/blend/invite/[code]` page; the viral loop is dead on arrival.
2. **`/api/bookmarks/search` ignores `folder_id`** — in-folder search silently global.
3. **Tag filtering client-side-only** — cross-page filtering/pagination broken (long-standing).
4. **Extension side panel unreachable from toolbar** — `default_popup` blocks `onClicked`.
5. **`/api/mobile/share` ↔ sheet contract mismatch** — tags never display; dupes look like saves.
6. **iOS Share Extension missing** — config + onboarding reference a target that doesn't exist.
7. **X-sync classify discards `ai_summary`/`ai_tags`** — Spread analysis never populates from sync.
8. **Unmetered Grok paths** — `/api/ai/assistant`, `/api/ai/duplicate-check`, `blend-engine` (also defaults to dead `grok-3` model).
9. **Stripe**: `subscription.updated` doesn't re-sync `profiles.plan`; no webhook idempotency.
10. **Leaky Blend free-tier cap**; AskTab-lock vs 25-msg-trial gating inconsistency.

## Not started (Phases 4-6 — consistent, no code)
- **Signal Boards**, **The Pulse**, **Community Knowledge Graphs** (CKG would need an email provider — none integrated).

## Product gaps (documented, no code — re-confirmed 2026-07-31)
- Bookmark export (CSV/JSON) — anywhere (extension, web, API)
- Blend: OG share card, public page, Blend Feed, decline route, detail view, privacy controls, signup-then-accept flow
- Grok function calling / `x_search()` / Collections (blocks chat-based actions + discovery)
- Embeddings/pgvector (semantic/hybrid search, real duplicate detection)
- Account self-deletion (PRD AC-03)
- Privacy policy + Terms pages (login-page links are dead spans; blocks Chrome Web Store)
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
