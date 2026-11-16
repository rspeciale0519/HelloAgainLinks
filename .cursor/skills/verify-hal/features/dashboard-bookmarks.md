# Dashboard bookmarks

Dashboard bookmarks is the signed-in library: home at `/dashboard` and the feed at `/dashboard/bookmarks`. A user browses, searches, sorts, and opens saved X posts. Without a session this path is blocked.

## Sub-features

- `dash-home` shows `DASHBOARD · HOME` with bookmark/tag stats and `RECENT · LAST 5`.
- `dash-nav` moves between `Dashboard`, `Bookmarks`, `Tags`, `Shared Lists`, `Blend`, and `Assistant`.
- `dash-feed` lists bookmark cards on `/dashboard/bookmarks`.
- `dash-search` filters the feed from the `Search bookmarks…` field.
- `dash-sort` changes the `Sort` select.
- `dash-unclassified` toggles `Unclassified`.
- `dash-spread` opens a bookmark detail (`aria-label` `Bookmark detail`).

## How to get to it (user POV)

- Choose `Dashboard` after a successful X sign-in.
- Open `/dashboard` or `/dashboard/bookmarks` while signed in.
- Choose `Bookmarks` in the app nav.
- Finish `/welcome` import or skip, which routes to `/dashboard`.

## Driving it with verify-hal

Preconditions:

- HAL is healthy at `http://127.0.0.1:4370`.
- Doctor has run on this instance.
- A disposable signed-in session exists. **This skill does not create one.** Real X OAuth, real user bookmarks, and production Supabase credentials are forbidden here. If `auth_driveable=0`, run the driver anyway so the block is evidenced, then stop.

- **Unauthenticated probe.** Run `node .cursor/skills/verify-hal/scripts/drive.mjs --feature dashboard-bookmarks`. The app does not redirect to `/login`. Home stays on `QUERYING…` / `Hello` without stats. Screenshot `dashboard-unauthenticated.png`. Record `blocked: true` with this precondition.
- **Home (session required).** Go to `/dashboard`. The eyebrow reads `DASHBOARD · HOME`. The greeting is `Hello, <name>` or `Hello, @<handle>`. Stats `BOOKMARKS` and `TAGS` are numbers, not a stuck `QUERYING…`.
- **Open feed.** Choose the nav button named `Bookmarks`. The URL is `/dashboard/bookmarks`. The search field placeholder is `Search bookmarks…`. The header includes `Sort` and `Unclassified`.
- **Search.** Type a token that exists in a visible card. After debounce (~300ms) the feed either shows matching cards or `No matches.` Empty library copy is `No bookmarks yet.`
- **Sort.** Change the `Sort` select. The feed re-requests; wait for loading to finish before asserting order.
- **Open a bookmark.** Choose a card. A dialog named `Bookmark detail` appears. Close it with the control named `Close`.
- **Proof.** Screenshots of home with a non-zero or explicitly empty archive, the feed with the search field, and (if any rows) an open Spread. A second read-only view of the same bookmark (home Recent vs feed) must agree. Without a session, the unauthenticated screenshot plus `blockedReason` is the proof of inaccessibility — not a pass.

## Gotchas

- Middleware matcher includes `/dashboard` but **does not redirect** anonymous users (`apps/web/src/middleware.ts` returns `next()` when cookies are missing). Client `getSession()` returning empty leaves dashboard home on `QUERYING…` forever (`if (!session) return`). That hang is not a loaded dashboard.
- `/api/bookmarks/search` ignores `folder_id`. Folder-scoped search is a known product gap; do not mark folder search verified.
- Tag filters on the feed are client-side. Do not treat cross-page tag URLs as server-filtered proof.
- `⌘K` opens the command palette (`aria-label` `Command palette`) on the bookmarks page only. The layout sidebar dispatches a fake keydown; prove palette from `/dashboard/bookmarks`, not from `/dashboard`.
- Mobile `/mobile/bookmarks` redirects to `/dashboard` in a web browser. Native Capacitor is a different surface.
- Do not upsert bookmarks through `/api/bookmarks` to make the feed look populated. That is not the user path and needs a real session plus write access.
