-- Migration 003: Add sync checkpoint state to profiles
-- Supports multi-stop-condition sync with resume capability.
--
-- Shape: {
--   "lastSyncAt": "2026-04-05T...",
--   "lastCursor": "abc123",
--   "stopReason": "time_limit",
--   "totalSynced": 450,
--   "newestKnownPostId": "1234..."
-- }

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS sync_state jsonb DEFAULT NULL;
