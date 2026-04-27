-- Migration 008: capture the original X author's avatar URL on each bookmark
-- so the feed/Spread/Palette UIs can render the real profile picture instead
-- of a hash-colored letter circle.
--
-- Population path: the Chrome extension already has the post DOM during
-- scrape and pulls the avatar src from the same node it pulls the handle
-- + display name from. New bookmarks get the URL on insert; older rows
-- stay null and fall back to the colored-letter circle until re-imported.
--
-- The column is text (URLs vary in length); we don't index it.

ALTER TABLE bookmarks
ADD COLUMN IF NOT EXISTS x_author_avatar_url TEXT;

COMMENT ON COLUMN bookmarks.x_author_avatar_url IS
  'Stable URL for the bookmark author''s X profile picture, captured by the extension during scrape. Null for pre-Phase-6 rows.';
