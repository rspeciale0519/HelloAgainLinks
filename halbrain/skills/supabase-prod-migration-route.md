---
type: skill
area: supabase
status: active
confidence: provisional
updated: 2026-07-31
sources:
  - journal/2026-07-31 (migration 012 applied)
  - knowledge/superseded (credential corrections)
  - skills/supabase-definer-rpc-authz (ACL verification companion)
---

# Applying a migration to prod hal (and proving it landed)

## When to use
Any time a `supabase/migrations/*.sql` file has to reach the prod database.
There is no CI/`db push` path in this repo — migrations are applied by hand.

## The approach
1. **Don't reach for psql/CLI first.** As of 2026-07-31 every DB credential in
   `.env.local` (`DIRECT_DATABASE_URL`, `DATABASE_URL`, `SUPABASE_DB_PASSWORD`)
   is the same stale 27-char password and fails auth. Until the password is
   reset in the dashboard, direct connections are dead — see
   [[knowledge/superseded]].
2. **Use the dashboard SQL editor via chrome-devtools MCP** (Rule 4). Project
   `hvvvoiwpoldnresqqcbc`, URL `…/project/<ref>/sql/new`, role `postgres`.
   - The editor is **Monaco**: set SQL with
     `window.monaco.editor.getModels()[0].setValue(sql)` — far more reliable
     than typing. **Read the existing model value first and restore it after**;
     `/sql/new` reuses the last Untitled snippet and autosaves, so you can
     silently destroy the user's scratch query.
   - Run with `Ctrl+Enter` (the Run button's uid churns between snapshots).
   - Any `DROP` triggers a **"Potential issue detected"** confirm dialog —
     the run does not proceed until "Run query" is clicked.
3. **Wrap DDL in `BEGIN; … COMMIT;`.** A drop+recreate that half-applies leaves
   the function missing and breaks the live app. This is what saved the first
   attempt below.
4. **Verify against the DB, never against the UI message.** The dashboard's
   control plane (`api.supabase.com`) is a *different service* from the
   project's PostgREST endpoint (`https://<ref>.supabase.co`). When the control
   plane is down you get `Error: Failed to fetch` with no idea whether the DDL
   ran — but PostgREST still answers, so probe it:
   - new signature present → POST `/rest/v1/rpc/<fn>` with the new param names,
     service_role key, expect 200 (`PGRST202` = not applied).
   - backward compatibility → call with only the OLD params, expect 200 (proves
     currently-deployed code keeps working).
   - **ACLs preserved** → same call with the ANON key, expect `42501 permission
     denied` (proves migration-010 hardening survived the recreate).

## Pitfalls & anti-patterns
- Trusting "Success. No rows returned" without the PostgREST probe.
- Treating `Failed to fetch` as "it failed" — it is genuinely ambiguous; verify.
- `CREATE OR REPLACE` when the signature changed: it creates an *overload* and
  leaves the old, differently-granted function live. Drop + recreate.
- Forgetting that a recreated function gets the default `PUBLIC` EXECUTE grant
  back — re-assert REVOKE/GRANT in the same migration.
- Echoing secrets: parse env values into shell vars, print only lengths/hosts.

## Evidence
Migration 012 applied 2026-07-31. First attempt returned `Failed to fetch`
during a Supabase incident; PostgREST probe proved the DDL had NOT run (old
7-arg live, `PGRST202` for 9-arg) and prod was untouched thanks to the
transaction. Retried after the control plane recovered → "Success", and all
three probes passed (9-arg 200, 7-arg 200, anon `42501`).

## Revision log
- 2026-07-31: created while applying migration 012.
