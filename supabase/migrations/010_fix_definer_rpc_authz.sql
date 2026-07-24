-- Migration 010: Close the authorization holes in the SECURITY DEFINER RPCs.
--
-- search_bookmarks (002) and get_folders_with_counts (006) are SECURITY DEFINER
-- (they bypass RLS) and filter by a caller-supplied `p_user_id` rather than the
-- session identity. Postgres grants EXECUTE to PUBLIC by default, so both were
-- reachable with the public anon key: any caller who knew a victim's user UUID
-- could pass it as p_user_id and read that user's data (IDOR).
--
-- Fix strategy differs per function based on who legitimately calls it:
--   * search_bookmarks       — only ever called with the service-role client
--                              (bookmarks/search route + grok buildBookmarkContext),
--                              so lock EXECUTE to service_role.
--   * get_folders_with_counts — called with the user's JWT client (authenticated
--                              role), so it must stay executable by `authenticated`;
--                              instead bind identity to auth.uid() inside the body.
-- get_related_bookmarks (007) is invoker-rights (no SECURITY DEFINER) — RLS still
-- constrains it — so it needs no change.

-- ── (A) search_bookmarks: restrict execution to service_role ──────────────
REVOKE EXECUTE ON FUNCTION
  search_bookmarks(uuid, text, int, int, text, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  search_bookmarks(uuid, text, int, int, text, timestamptz, timestamptz)
  TO service_role;

-- Pin the definer search_path so the function cannot resolve `bookmarks` (or the
-- text-search config) to an attacker-created object earlier in the search_path.
ALTER FUNCTION
  search_bookmarks(uuid, text, int, int, text, timestamptz, timestamptz)
  SET search_path = public;

-- ── (B) get_folders_with_counts: bind identity to the session ─────────────
-- CREATE OR REPLACE preserves existing grants; re-assert them explicitly and
-- revoke the default PUBLIC/anon grant so the auth.uid()-IS-NULL branch (kept for
-- service-role reuse) is never reachable by an unauthenticated caller.
CREATE OR REPLACE FUNCTION get_folders_with_counts(p_user_id uuid)
RETURNS TABLE (
  id             uuid,
  name           text,
  x_folder_id    text,
  created_at     timestamptz,
  updated_at     timestamptz,
  bookmark_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.name,
    f.x_folder_id,
    f.created_at,
    f.updated_at,
    COALESCE(COUNT(b.id), 0)::bigint AS bookmark_count
  FROM folders f
  LEFT JOIN bookmarks b ON b.folder_id = f.id
  WHERE f.user_id = p_user_id
    -- An authenticated caller may only read their own folders regardless of the
    -- p_user_id they pass; auth.uid() is NULL only for trusted service_role calls.
    AND (auth.uid() IS NULL OR f.user_id = auth.uid())
  GROUP BY f.id, f.name, f.x_folder_id, f.created_at, f.updated_at
  ORDER BY f.created_at;
$$;

REVOKE EXECUTE ON FUNCTION get_folders_with_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_folders_with_counts(uuid) TO authenticated, service_role;

-- ── (C) get_related_bookmarks: drop the unused service_role grant ─────────
-- 007 is invoker-rights (no SECURITY DEFINER), so RLS constrains it for the
-- `authenticated` role and it is safe as-is. But it also filters by a caller-
-- supplied p_user_id, so a service-role caller (which bypasses RLS) would
-- reintroduce the IDOR. Its only caller uses the user JWT client; remove the
-- latent service_role grant so a future service-role call cannot silently open
-- that hole. (Also revoke the default PUBLIC/anon execute grant.)
REVOKE EXECUTE ON FUNCTION get_related_bookmarks(uuid, uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION get_related_bookmarks(uuid, uuid) TO authenticated;
