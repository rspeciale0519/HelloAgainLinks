-- Migration 007: get_related_bookmarks RPC.
--
-- Phase 4 (HAL redesign): clustering for the Signal-rail Related tab and the
-- Spread modal's RelatedSidebar. Returns the top 10 bookmarks by the same
-- user that share the source bookmark's primary_category and/or tags.
--
-- Strength formula (committed in spec 5.4):
--   strength = 0.5 * shared_category + 0.5 * tag_jaccard
--   where tag_jaccard = |T(S) ∩ T(B)| / |T(S) ∪ T(B)|, treating 0/0 as 0.
-- Bookmarks with strength < 0.1 are filtered out.

CREATE OR REPLACE FUNCTION get_related_bookmarks(
  p_user_id     uuid,
  p_bookmark_id uuid
)
RETURNS TABLE (id uuid, strength numeric)
LANGUAGE sql
STABLE
AS $$
  WITH source AS (
    SELECT id, user_id, primary_category
    FROM bookmarks
    WHERE id = p_bookmark_id AND user_id = p_user_id
  ),
  source_tags AS (
    SELECT bt.tag_id
    FROM bookmark_tags bt
    JOIN source s ON s.id = bt.bookmark_id
  ),
  candidates AS (
    SELECT b.id, b.primary_category
    FROM bookmarks b, source s
    WHERE b.user_id = s.user_id
      AND b.id <> s.id
  ),
  per_candidate AS (
    SELECT
      c.id,
      c.primary_category,
      COALESCE(
        (SELECT COUNT(*)::int
         FROM bookmark_tags bt
         WHERE bt.bookmark_id = c.id
           AND bt.tag_id IN (SELECT tag_id FROM source_tags)),
        0
      ) AS shared_tag_count,
      COALESCE(
        (SELECT COUNT(*)::int FROM bookmark_tags bt WHERE bt.bookmark_id = c.id),
        0
      ) AS candidate_tag_count
    FROM candidates c
  ),
  source_meta AS (
    SELECT
      s.primary_category AS src_category,
      (SELECT COUNT(*)::int FROM source_tags) AS src_tag_count
    FROM source s
  ),
  scored AS (
    SELECT
      pc.id,
      CASE
        WHEN sm.src_category IS NOT NULL
             AND pc.primary_category IS NOT NULL
             AND pc.primary_category = sm.src_category
        THEN 1
        ELSE 0
      END AS shared_cat,
      CASE
        WHEN (sm.src_tag_count + pc.candidate_tag_count - pc.shared_tag_count) = 0
        THEN 0::numeric
        ELSE pc.shared_tag_count::numeric
             / (sm.src_tag_count + pc.candidate_tag_count - pc.shared_tag_count)::numeric
      END AS tag_jaccard
    FROM per_candidate pc
    CROSS JOIN source_meta sm
  )
  SELECT
    s.id,
    ROUND((0.5 * s.shared_cat + 0.5 * s.tag_jaccard)::numeric, 4) AS strength
  FROM scored s
  WHERE (0.5 * s.shared_cat + 0.5 * s.tag_jaccard) >= 0.1
  ORDER BY strength DESC, s.id ASC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION get_related_bookmarks(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_bookmarks(uuid, uuid) TO service_role;
