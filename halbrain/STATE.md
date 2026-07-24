# hal brain — STATE
Updated: 2026-07-24

## Current focus
None active. Security review + fix shipped and verified in prod; first brain
consolidation completed this session.

## Latest synopsis
Full-codebase security review found and closed 3 real vulns: an open redirect in
the OAuth callback and two `SECURITY DEFINER` RPCs that trusted a caller-supplied
`p_user_id` (anon-reachable IDORs). Fixed via `lib/safe-redirect.ts` + migration
010, adversarially verified, merged as `a35304e` (PR #16), applied to prod and
confirmed by live ACL inspection. See [[journal/2026-07-23]], [[journal/2026-07-24]],
[[skills/supabase-definer-rpc-authz]].

## Open threads
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
