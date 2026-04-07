-- Migration 002: Add full-text search infrastructure
-- Replaces ILIKE with tsvector/tsquery + GIN index + ranked RPC
--
-- Content text gets weight 'A' (highest priority) with English stemming.
-- Author handle/name get weight 'B' with simple config (no stemming on usernames).

-- 1. Generated tsvector column that auto-updates on insert/update
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(content_text, '')), 'A') ||
    setweight(to_tsvector('simple',  coalesce(x_author_handle, '')), 'B') ||
    setweight(to_tsvector('simple',  coalesce(x_author_name, '')), 'B')
  ) STORED;

-- 2. GIN index for sub-millisecond full-text lookups
CREATE INDEX IF NOT EXISTS idx_bookmarks_search_vector
  ON bookmarks USING GIN (search_vector);

-- 3. RPC function for ranked search with pagination count
--    Returns only (id, rank, total_count) — caller hydrates via userClient.
--    SECURITY DEFINER bypasses RLS; we filter by p_user_id explicitly.
CREATE OR REPLACE FUNCTION search_bookmarks(
  p_user_id   uuid,
  p_query     text,
  p_limit     int DEFAULT 20,
  p_offset    int DEFAULT 0,
  p_author    text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id          uuid,
  rank        real,
  total_count bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
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
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
