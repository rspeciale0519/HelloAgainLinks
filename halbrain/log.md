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

