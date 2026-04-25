-- Migration 006: get_folders_with_counts RPC + reconcile folders schema.
--
-- The live `folders` table predates migration 005 (it had parent_id/sort_order
-- as a multi-folder hierarchy) and lacks the columns 005 expected. Migration 005
-- used CREATE TABLE IF NOT EXISTS, so the new columns were never added on
-- environments where the older folders table already existed.
--
-- This migration brings the folders table to the shape Phase 3 needs and
-- adds the get_folders_with_counts RPC used by the sidebar.

-- ── Reconcile folders columns ─────────────────────────────────────
ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS x_folder_id text,
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

-- Unique (user_id, x_folder_id) so import-x can upsert by source-of-truth ID.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'folders_user_x_folder_id_key' AND conrelid = 'public.folders'::regclass
  ) THEN
    ALTER TABLE folders
      ADD CONSTRAINT folders_user_x_folder_id_key UNIQUE (user_id, x_folder_id);
  END IF;
END $$;

-- updated_at trigger (set_updated_at function created in migration 005).
DROP TRIGGER IF EXISTS folders_set_updated_at ON folders;
CREATE TRIGGER folders_set_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RPC: list folders with bookmark counts ────────────────────────
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
  GROUP BY f.id, f.name, f.x_folder_id, f.created_at, f.updated_at
  ORDER BY f.created_at;
$$;

GRANT EXECUTE ON FUNCTION get_folders_with_counts(uuid) TO authenticated;
