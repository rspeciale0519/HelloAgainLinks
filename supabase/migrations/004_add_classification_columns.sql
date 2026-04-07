-- Migration 004: Add classification columns to bookmarks
-- Supports two-tier auto-classification (regex fast-path + LLM fallback).

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS primary_category text,
  ADD COLUMN IF NOT EXISTS primary_domain   text;

CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(primary_category);
CREATE INDEX IF NOT EXISTS idx_bookmarks_domain   ON bookmarks(primary_domain);
