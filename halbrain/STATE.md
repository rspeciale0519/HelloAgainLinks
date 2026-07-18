# hal brain — STATE
Updated: 2026-07-18

## Current focus
feature/mobile-sync-trigger — app-open + resume auto-sync implemented and
checkpointed (725011c); PR to develop pending owner's on-device verification
(resume sync, throttle, share sheet).

## Latest synopsis
Full knowledge-build pass: product intent, codebase build-status,
integrations, and doc-vs-code conflicts researched in parallel and
independently re-verified. See [[journal/2026-07-18]] and
[[knowledge/orientation]] as the entry point.

## Open threads
- Tag filtering is client-side-only (cross-page filtering broken) — `knowledge/superseded.md`
- StrictMode auth-flash on `/auth/set-session` redirect — `knowledge/superseded.md`
- `apps/extension/{content.ts,background.ts}` over the 450-LOC cap and growing (580/687 LOC)
- 6 PLANNED-but-documented gaps worth a product decision: CSV/JSON export, Blend OG share card, Grok real function calling — `knowledge/roadmap.md`

## Active skills in play
- (none yet)

## Notes
- dev docs are a baseline; on conflict prefer [[knowledge/superseded]] (now populated with 6 genuine deltas).
- `docs/dev-docs/DEVELOPMENT_ROADMAP.md`'s Phase 1-3 MVP checkboxes are stale/unreliable — always check [[knowledge/features]] instead.

