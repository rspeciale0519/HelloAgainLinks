# hal brain — STATE
Updated: 2026-07-28

## Current focus
None active. Bookmark time/ordering work closed out and released; prod at
`551e021`, `main`/`develop` at parity.

## Latest synopsis
Timestamps and save-ordering, fixed end to end across four releases. The
underlying confusion was one field doing two jobs: `bookmarked_at` is INGEST
time, not save time, and bulk paths stamped whole batches with a single instant.
Fixed at ingest (descending cursor on all three paths), at query time
(deterministic tiebreaker), in the UI (`formatPostDate(post_created_at)` on every
surface — last one closed today, PR #45), and retroactively via the opt-in
non-destructive **REBUILD ORDER** pass (PR #43, extension 0.5.4). See
[[journal/2026-07-26]], [[journal/2026-07-27]], [[journal/2026-07-28]].

## Open threads
**Awaiting the user (only they can do these)**
- Reload extension **0.5.4** and click **REBUILD ORDER** in settings — repairs
  `bookmarked_at` on the ~1,600 pre-fix rows.
- Start a **Codemagic build off `develop`** — the native bundle predates the
  legibility, timestamp, sort-control and blue-accent releases.

**NOTE:** the Open-threads list below is stale as of 2026-07-24 and needs
reconciling against journals 07-26 → 07-28 at the next consolidation.

**External / operational**
- X developer account out of API credits (402) → sync imports nothing regardless
  of trigger. Not a code gap — `knowledge/features.md`.
- `.env.local`: `SUPABASE_DB_PASSWORD` is stale (fails auth) and
  `DIRECT_DATABASE_URL`'s password isn't percent-encoded (URI parsers reject it)
  — `knowledge/superseded.md` operator corrections.

**Product / code**
- Server-side sync cron still missing; only client-side app-open/resume auto-sync
  exists — `knowledge/roadmap.md`.
- Tag filtering is client-side-only (cross-page filtering broken) — `knowledge/superseded.md`
- StrictMode auth-flash on `/auth/set-session` redirect — `knowledge/superseded.md`
- `apps/extension/{content.ts,background.ts}` over the 450-LOC cap and growing (580/687 LOC)
- 6 PLANNED-but-documented gaps worth a product decision: CSV/JSON export, Blend
  OG share card, Grok real function calling — `knowledge/roadmap.md`

## Active skills in play
- [[skills/supabase-definer-rpc-authz]] — read before touching any `SECURITY DEFINER` function or RPC grant.
- [[skills/auth-stale-shell-retest]] — read before diagnosing "the fix didn't work" on an already-logged-in shell.

## Notes
- dev docs are a baseline; on conflict prefer [[knowledge/superseded]].
- `docs/dev-docs/DEVELOPMENT_ROADMAP.md`'s Phase 1-3 MVP checkboxes are stale/unreliable — always check [[knowledge/features]] instead.
- Brain-root gotcha: the repo root `.brain.json` sets `vaultDir: halbrain`. A hook
  rooted at `apps/web` instead defaults to `brain/` — that's the origin of the
  stray empty untracked `apps/web/brain/`. Journal to `halbrain/`.
- The Stop-hook gate matches the **literal** labels `**What did NOT work:**` and
  `Evidence:` — a variant like "What did NOT work / caveats:" fails the regex and
  re-blocks.
