-- Migration 012: teach search_bookmarks about folder and tag filters.
--
-- The search route accepted folder_id (and the UI sends it) but the RPC had no
-- folder parameter, so searching inside a folder silently searched the whole
-- archive (2026-07-31 audit defect #2). Tag filtering was client-side-only on
-- the current page, which broke pagination math (defect #3) — p_tag_ids gives
-- it a real server-side home (OR-semantics across the supplied tags, matching
-- the sidebar's multi-select behavior).
--
-- Adding parameters changes the function signature, and CREATE OR REPLACE with
-- a different signature would create an overload alongside the old 7-arg
-- function (leaving the old, grant-hardened one behind). Drop + recreate, then
-- re-assert the migration-010 ACLs on the new signature: EXECUTE for
-- service_role only, definer search_path pinned.

DROP FUNCTION IF EXISTS search_bookmarks(uuid, text, int, int, text, timestamptz, timestamptz);

CREATE FUNCTION search_bookmarks(
  p_user_id   uuid,
  p_query     text,
  p_limit     int DEFAULT 20,
  p_offset    int DEFAULT 0,
  p_author    text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to   timestamptz DEFAULT NULL,
  p_folder_id uuid DEFAULT NULL,
  p_tag_ids   uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  rank        real,
  total_count bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    ts_rank_cd(b.search_vector, websearch_to_tsquery('english', p_query)) AS rank,
    count(*) OVER() AS total_count
  FROM bookmarks b
  WHERE b.user_id = p_user_id
    AND b.search_vector @@ websearch_to_tsquery('english', p_query)
    AND (p_author IS NULL OR b.x_author_handle = p_author)
    AND (p_date_from IS NULL OR b.bookmarked_at >= p_date_from)
    AND (p_date_to IS NULL OR b.bookmarked_at <= p_date_to)
    AND (p_folder_id IS NULL OR b.folder_id = p_folder_id)
    AND (p_tag_ids IS NULL OR EXISTS (
      SELECT 1 FROM bookmark_tags bt
      WHERE bt.bookmark_id = b.id AND bt.tag_id = ANY(p_tag_ids)
    ))
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Re-assert migration-010 ACLs on the new signature (Postgres grants EXECUTE
-- to PUBLIC by default on creation).
REVOKE EXECUTE ON FUNCTION
  search_bookmarks(uuid, text, int, int, text, timestamptz, timestamptz, uuid, uuid[])
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  search_bookmarks(uuid, text, int, int, text, timestamptz, timestamptz, uuid, uuid[])
  TO service_role;
