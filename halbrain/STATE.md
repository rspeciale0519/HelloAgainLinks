# hal brain — STATE
Updated: 2026-07-31

## Current focus
None active. Full codebase-vs-docs audit completed 2026-07-31; docs and the
knowledge layer are reconciled. Prod at `551e021`, `main`/`develop` at parity.

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
- `.env.local`: stale `SUPABASE_DB_PASSWORD`; `DIRECT_DATABASE_URL` password not
  percent-encoded — [[knowledge/superseded]] operator corrections.

**Product / code** — see [[knowledge/roadmap]] "Defects worth fixing first"
(10-item triage) and the gap list. Notables: server-side sync cron still missing;
zero tests; LOC-cap refactors owed (background.ts 709, page.tsx 680); dead-code
sweep owed.

## Active skills in play
- [[skills/supabase-definer-rpc-authz]] — read before touching any `SECURITY DEFINER` function or RPC grant.
- [[skills/auth-stale-shell-retest]] — read before diagnosing "the fix didn't work" on an already-logged-in shell.

## Notes
- dev docs reconciled 2026-07-31; on conflict prefer the newer audit date, then [[knowledge/superseded]].
- `DEVELOPMENT_ROADMAP.md` checkboxes are now trustworthy (audited); the pre-07-31
  warning about stale Phase 1-3 checkboxes is historical.
- Brain-root gotcha: repo root `.brain.json` sets `vaultDir: halbrain`; journal to
  `halbrain/`, never `apps/web/brain/`.
- The Stop-hook gate matches the **literal** labels `**What did NOT work:**` and
  `Evidence:` — variants fail the regex and re-block.
- Consolidation was flagged overdue at session start (2026-07-31) — the 07-24
  watermark reconcile is now largely covered by this audit; a time-boxed pass to
  distil skills from journals 07-26→07-31 is still owed.
