-- Migration 009: backfill x_author_avatar_url for pre-Phase-6 bookmarks.
--
-- Migration 008 added the column but left existing rows null because the
-- canonical pbs.twimg.com URL is only captured by the extension during
-- scrape. Without a re-import, the feed/Spread/Palette UIs render a
-- hash-colored letter circle for every legacy row.
--
-- We populate NULL rows with an unavatar.io proxy URL keyed off the X
-- handle. unavatar.io resolves the current profile picture for any X
-- account at request time, so the URL stays valid even when the user
-- changes their avatar. The Avatar primitive (`packages/ui/hal/src/
-- primitives/Avatar.tsx`) falls back cleanly to the lettered circle if
-- unavatar 404s (deleted/suspended accounts).
--
-- Future imports from the extension will upgrade these proxy URLs to the
-- canonical pbs.twimg.com value via the merge-upsert path in
-- `bookmark-upsert.ts`: incoming rows with engagement/media data score
-- higher and `stripNulls(incoming)` overwrites the avatar field.

-- `?fallback=false` makes unavatar return 404 (instead of a generic
-- silhouette) for unknown handles, letting the Avatar primitive drop to
-- the lettered-circle tier when an account is deleted or suspended.

UPDATE bookmarks
SET x_author_avatar_url = 'https://unavatar.io/x/' || x_author_handle || '?fallback=false'
WHERE x_author_avatar_url IS NULL
  AND x_author_handle IS NOT NULL
  AND x_author_handle <> '';
