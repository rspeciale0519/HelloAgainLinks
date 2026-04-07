-- Migration 001: Add enrichment columns to bookmarks table
-- Supports the Record Merge Scoring upgrade (fieldtheory-inspired)
--
-- These columns allow HAL to store richer bookmark data from the GraphQL
-- intercept and merge it with minimal data from the REST API.

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS x_author_avatar_url  text,
  ADD COLUMN IF NOT EXISTS engagement            jsonb,
  ADD COLUMN IF NOT EXISTS language              text,
  ADD COLUMN IF NOT EXISTS conversation_id       text,
  ADD COLUMN IF NOT EXISTS in_reply_to_status_id text,
  ADD COLUMN IF NOT EXISTS quoted_status_id      text,
  ADD COLUMN IF NOT EXISTS possibly_sensitive    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ingested_via          text,
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz DEFAULT now();

-- Trigger to auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookmarks_updated_at ON bookmarks;
CREATE TRIGGER trg_bookmarks_updated_at
  BEFORE UPDATE ON bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_bookmarks_updated_at();
