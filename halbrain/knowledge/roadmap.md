---
kind: knowledge
slug: roadmap
status: current
updated: 2026-07-24
layer: roadmap
sources:
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - docs/dev-docs/PRD.md
  - docs/dev-docs/fieldtheory-inspired-upgrades.md
---

# Roadmap

Genuinely unbuilt work only — see [[knowledge/features]] for build-status
evidence and [[knowledge/superseded]] for why the doc's own checkboxes aren't
a reliable signal on their own.

## Not started (Phases 4-6, PRD "out of scope for MVP" — consistent, no code)
- **Signal Boards** (Month 2 target) — collaborative boards, Grok Scout Agent, Radar tab. `DEVELOPMENT_ROADMAP.md` Phase 4.
- **The Pulse** (Month 3 target) — anonymous aggregate signals, "Also Bookmarked," Pulse Trends dashboard, save-velocity indicators. Phase 5.
- **Community Knowledge Graphs** (Month 4+ target) — multi-user communities, auto-assembled topic graph, weekly Grok Community Digest (would need an email provider — none integrated; Resend/SendGrid only mentioned, not installed). Phase 6.

## Mobile delivery track — next steps (`DEVELOPMENT_ROADMAP.md` "🔜 Next")
Core mobile app is BUILT (see [[knowledge/features]]); these are the documented remaining items:
- Finalize iOS Share Extension setup/verification in the Xcode release pipeline
- Add background-sync scheduler wiring — **partially addressed 2026-07-19**: a
  client-side app-open/resume auto-sync now exists (`lib/use-auto-sync.ts`,
  native-only, 2min throttle). The *server-side* scheduler is still missing —
  `apps/web/vercel.json` has no `crons` key; GitHub Actions/worker unstarted. So
  sync only runs while someone opens the app.
- Add telemetry for share-ingestion success/failure rates
- Add retry/backoff for sync runs across large user sets
- **Release CI is now DONE** (was implicit in this track): Codemagic iOS/Android
  pipelines shipped 2026-07-19 (`c0512ca`), delivering through TestFlight build 15.
- **Blocked externally:** X developer account is out of API credits (402) — sync
  imports nothing until billing is resolved. Not a code gap; see [[knowledge/features]].

## Smaller gaps surfaced during this knowledge-build pass (not previously roadmap-tracked)
- Extension bookmark export (CSV/JSON) — documented in PRD §3.1, no code exists
- Blend shareable OG card (1200×630 image) — documented in PRD §3.3, no `/api/og` route exists
- Grok real function calling / `x_search()` tool / Collections API — documented, chat calls pass no `tools` param (plain completions only)
- `/api/bookmarks/batch` (extension bulk-import path) doesn't auto-trigger two-tier classification — only the background X-API sync path and a manual banner click do

## Fieldtheory-inspired backend upgrades — status: all four shipped
Design doc (`fieldtheory-inspired-upgrades.md`) proposed 4 upgrades in order (merge scoring → FTS → multi-stop sync → two-tier classification); all 4 are BUILT per [[knowledge/features]]. The doc itself carries no roadmap checkboxes and is never cross-referenced from `DEVELOPMENT_ROADMAP.md` as adopted — treat it as historical design rationale, not a live roadmap source.

## Cross-cutting, still unchecked in `DEVELOPMENT_ROADMAP.md`
- Formal test suite (unit/integration/E2E) — not verified either way in this pass, scope was feature build-status not test coverage
- Monitoring: Sentry — NOT FOUND anywhere in the repo (no package, no init code, no doc beyond the roadmap's own unchecked line)
- Analytics: PostHog or Plausible — NOT FOUND, PRD lists as an unresolved "or" choice, neither is installed
- Chrome Web Store launch prep — not verified in this pass

## Known operator-flagged tech debt still open
See [[knowledge/superseded]] "Operator corrections" section — these are concrete, previously-flagged items (StrictMode auth flash, dead components, LOC-cap violations, client-side-only tag filtering, etc.), re-verified as still present as of this pass.
