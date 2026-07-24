---
type: skill
area: supabase
status: current
confidence: established
updated: 2026-07-24
sources:
  - supabase/migrations/010_fix_definer_rpc_authz.sql
  - supabase/migrations/002_add_search_vector_and_rpc.sql
  - supabase/migrations/006_folders_rpc.sql
  - supabase/migrations/007_related_bookmarks_rpc.sql
  - apps/web/src/lib/auth.ts
  - journal/2026-07-23
  - journal/2026-07-24
---

# Postgres `SECURITY DEFINER` RPC authorization (Supabase/PostgREST)

## When to use
Any time you write, review, or audit a Postgres function in `supabase/migrations`
that (a) is declared `SECURITY DEFINER`, and/or (b) takes a user-identity argument
like `p_user_id uuid`. Also the entry point for "is this RPC an IDOR?" reviews.

## The approach
**The core defect:** a `SECURITY DEFINER` function bypasses RLS and runs as its
owner. If it then filters by a **caller-supplied** `p_user_id` instead of
`auth.uid()`, the caller chooses whose data they read — an IDOR. The route
passing `ctx.userId` is *app-layer discipline, not a DB control*: PostgREST is
directly reachable at `/rest/v1/rpc/<fn>` with the public anon key, bypassing
your route entirely.

**The reachability multiplier:** Postgres grants `EXECUTE` to `PUBLIC` **by
default**. A migration that defines a function and never `REVOKE`s leaves it
callable by `anon` — i.e. unauthenticated. `proacl IS NULL` means exactly this.

**Pick the fix by who legitimately calls it — check first:**
- Called only with the **service-role** client → `REVOKE EXECUTE ... FROM PUBLIC,
  anon, authenticated;` + `GRANT ... TO service_role;`
- Called with the **user JWT** client (`authenticated` role) → it *must* keep the
  `authenticated` grant, so bind identity **inside the body** instead:
  `AND (auth.uid() IS NULL OR t.user_id = auth.uid())`, plus `REVOKE ... FROM
  PUBLIC, anon` so the `auth.uid() IS NULL` branch is unreachable by anon.
- Always add `SET search_path = public` to a definer function.

**`auth.uid()` works inside `SECURITY DEFINER`.** The definer switches the
executing *role*, but `auth.uid()` reads the per-request `request.jwt.claims`
GUC that PostgREST sets, so it still resolves to the calling user. It is also
schema-qualified, so `SET search_path` does not break it.

**Verify against the live DB, not the migration file:**
```sql
SELECT p.proname, p.prosecdef AS secdef,
       COALESCE(array_to_string(p.proacl, ' | '), '(default: PUBLIC has EXECUTE)') AS grants
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (...);
```
**Reading the ACL is the part that trips people up:** a `PUBLIC` grant renders as
an entry with an **empty grantee** — `=X/postgres`. A named entry
(`authenticated=X/postgres`) is *not* PUBLIC. So "no bare `=X/` entry anywhere"
is the pass condition, and non-NULL `proacl` means explicit ACLs are set.

## Pitfalls & anti-patterns
- **Blanket-revoking without checking callers breaks features.** Two sibling RPCs
  here needed *opposite* fixes: `search_bookmarks` (service-role callers) could be
  locked to `service_role`; `get_folders_with_counts` (userClient caller) would
  have 500'd on the same treatment. Grep every `.rpc('<name>'` call site and note
  whether it uses `userClient` or `serviceClient` **before** writing the migration.
- **Invoker-rights functions are safe *until* someone grants `service_role`.** A
  function without `SECURITY DEFINER` is RLS-constrained for `authenticated` — but
  it often still filters by a caller-supplied `p_user_id`, so a future service-role
  caller silently reintroduces the IDOR. Drop unused `service_role` grants.
- **`CREATE OR REPLACE` preserves existing grants** — re-assert them explicitly
  rather than assuming a replace resets the ACL.
- **Signatures must match exactly** in `REVOKE`/`GRANT`/`ALTER FUNCTION` (full
  parameter type list); a mismatch targets nothing or errors.
- **Never edit an applied migration** — write a forward migration. 010 fixes 002/006.
- A comment asserting safety ("SECURITY DEFINER bypasses RLS; we filter by
  p_user_id explicitly") is a **smell, not evidence** — that exact comment sat
  above the vulnerable function.

## Evidence
- Migration `010_fix_definer_rpc_authz.sql` applied to prod (project
  `hvvvoiwpoldnresqqcbc`) 2026-07-24; live ACLs verified in the SQL editor:
  `search_bookmarks` → `postgres | service_role` (secdef true);
  `get_folders_with_counts` → `postgres | authenticated | service_role` (secdef true);
  `get_related_bookmarks` → `postgres | authenticated` (secdef false). No empty-grantee
  (PUBLIC) entry on any.
- `npx tsc --noEmit` + `next lint` clean on the accompanying TS changes.
- Three independent adversarial verification agents (SQL-authz correctness,
  redirect-bypass, repo-wide completeness sweep) all returned sound.
- Base-table RLS confirmed live: `bookmarks` and `bookmark_tags` `relrowsecurity = true`.
- Merged as `a35304e` (PR #16).

## Revision log
- 2026-07-24 — created during first brain consolidation, distilled from the
  full-codebase security review + fix + live prod verification
  ([[journal/2026-07-23]], [[journal/2026-07-24]]). Confidence `established`:
  verified against production and by independent adversarial review, and the ACL
  semantics are standard Postgres behavior rather than a repo-local quirk.
