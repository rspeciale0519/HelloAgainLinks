# hal brain — STATE
Updated: 2026-07-31

## Current focus
None active. Audit → defect sweep → Blend viral loop all shipped to `develop`
(2026-07-31). **`develop` is AHEAD of `main`** — prod web still runs the old
`main`; a develop→main release is the next deploy step. Migration 012 is
already applied to the prod DB (correct order: schema before code).

## Latest synopsis
Comprehensive audit (5 parallel verification passes over `develop` @ `8ac341f`;
`turbo build` + lint green). Every `DEVELOPMENT_ROADMAP.md` Phase 1-3 checkbox
now reflects audited reality, with a dated audit summary + 13-defect list at the
top of that file; `PRD.md` gained an Implementation Status Addendum. Knowledge
layer refreshed the same day ([[knowledge/features]], [[knowledge/superseded]],
[[knowledge/roadmap]] all `updated: 2026-07-31`). Headline finds: **Blend invite
links 404** (no `/blend/**` page — viral loop broken), `/api/bookmarks/search`
ignores `folder_id`, extension side panel unreachable from the toolbar, iOS Share
Extension missing though config+onboarding reference it, mobile share response
contract mismatch, four orphaned `/api/ai/*` routes, three unmetered Grok paths,
quota + LLM cost tracking exist (docs said they didn't), set-session StrictMode
flash was FIXED in PR #32 (old memory stale), zero automated tests anywhere.

## Open threads
**Awaiting the user (only they can do these)**
- Reload extension **0.5.4** and click **REBUILD ORDER** in settings — repairs
  `bookmarked_at` on the ~1,600 pre-fix rows.
- Start a **Codemagic build off `develop`** — the native bundle predates the
  legibility, timestamp, sort-control and blue-accent releases.
- Decide priorities among the audit's 13 defects — top candidates: Blend invite
  404 (product-breaking), folder-scoped search bug, mobile share contract, iOS
  Share Extension.

**External / operational**
- X developer account out of API credits (402) → sync imports nothing regardless
  of trigger — [[knowledge/features]].
- **Prod DB password is stale in every `.env.local` variant** (verified by psql
  2026-07-31) → no direct psql/CLI route to prod; needs a dashboard reset.
  Migrations go through the SQL editor — [[skills/supabase-prod-migration-route]].
- Nested `apps/web/.git` repo + stray `apps/*/brain/`, `packages/shared/brain/`
  dirs need manual removal (the auto-mode classifier blocks rm/mv of them).

**Product / code** — see [[knowledge/roadmap]] "Defects worth fixing first"
(10-item triage) and the gap list. Notables: server-side sync cron still missing;
zero tests; LOC-cap refactors owed (background.ts 709, page.tsx 680); dead-code
sweep owed.

## Active skills in play
- [[skills/supabase-definer-rpc-authz]] — read before touching any `SECURITY DEFINER` function or RPC grant.
- [[skills/auth-stale-shell-retest]] — read before diagnosing "the fix didn't work" on an already-logged-in shell.
- [[skills/build-stale-artifact-traps]] — read before claiming any change "done" or debugging a fix that "didn't take".
- [[skills/integrations-x-api-cost-model]] — read before any X API cost estimate or billing experiment.
- [[skills/supabase-prod-migration-route]] — read before applying ANY migration to prod (no psql route exists; verify via PostgREST, not the dashboard message).

## Notes
- dev docs reconciled 2026-07-31; on conflict prefer the newer audit date, then [[knowledge/superseded]].
- `DEVELOPMENT_ROADMAP.md` checkboxes are now trustworthy (audited); the pre-07-31
  warning about stale Phase 1-3 checkboxes is historical.
- Brain-root gotcha: repo root `.brain.json` sets `vaultDir: halbrain`; journal to
  `halbrain/`, never `apps/web/brain/`.
- The Stop-hook gate matches the **literal** labels `**What did NOT work:**` and
  `Evidence:` — variants fail the regex and re-block.
- Second consolidation completed 2026-07-31 (2 new skills distilled; journal
  gap for PRs #36/#38/#39/#41/#43 recorded in log.md, not backfilled).
