# Log
Append-only timeline. Entry format: `## [YYYY-MM-DD] <op> | <title>`.

## [2026-07-18] init | hal brain initialized
- Vault scaffolded from _brain engine. Knowledge layer = stub.

## [2026-07-18] knowledge-build | full backfill pass
- All 4 knowledge docs stub→current. See [[journal/2026-07-18]] for evidence and classification counts.

## [2026-07-24] consolidation | first consolidation pass (29 tasks, watermark was empty)
- Journal-vs-git gap check: **no gaps** in the real window (2026-07-18→HEAD); every
  commit maps to a journal entry. The helper's long gap list is pre-brain-init
  history (Feb–Jun), an artifact of the empty watermark — not actionable.
- Distilled 2 skills from 5 days of journals (skills/ was empty):
  [[skills/supabase-definer-rpc-authz]] and [[skills/auth-stale-shell-retest]].
- Knowledge reconciled against `git log --name-only` since init: orientation
  (9→10 migrations + prod RLS confirmed), features (auto-sync, release CI, RPC
  authz hardening, open-redirect defense, RLS UNVERIFIED→confirmed), roadmap
  (sync-scheduler item partially addressed; CI done; X-402 blocker), superseded
  (#7 partially superseded by client-side auto-sync; new env-credential
  correction). All 4 remain `status: current` — no `needs-reconcile`.
- STATE trimmed and re-sectioned (external vs product threads); index refreshed.


## [2026-07-31] audit | full codebase-vs-docs audit + doc reconciliation
- 5 parallel verification passes over develop @ 8ac341f; build + lint green.
- DEVELOPMENT_ROADMAP.md checkboxes audited (13-defect list added); PRD.md
  gained an Implementation Status Addendum; features/superseded/roadmap
  knowledge docs refreshed to 2026-07-31. See [[journal/2026-07-31]].

## [2026-07-31] consolidation | second consolidation pass (window 2026-07-24 → 2026-07-31)
- Distilled 2 skills: [[skills/build-stale-artifact-traps]] (dist/extension/
  mobile-bundle/Vercel staleness, hit 5+ times) and
  [[skills/integrations-x-api-cost-model]] (24h UTC dedup reframes X spend).
- Journal-vs-git gap check: PRs #36, #38, #39, #41, #43 (07-26 21:35-23:41
  local) have NO journal entries — the window between the 07-27 20:42 entry
  and the 07-28 00:12 entry went unjournaled. Facts are covered by STATE's
  synopsis and the 07-31 audit ([[knowledge/features]]); gap recorded, not
  backfilled.
- Knowledge reconcile was performed by the 07-31 audit itself (features/
  superseded/roadmap all refreshed; superseded set-session item resolved via
  PR #32). orientation.md left at 2026-07-24 — nothing in the audit
  contradicted it.
- Index refreshed; STATE trimmed (consolidation-owed note cleared).
