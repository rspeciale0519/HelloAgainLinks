# Feature: Main-First X Bookmark Import (with Folder Reconciliation)

## Goal

Replace the current "folder-walk only" import behavior with a **main-first** orchestrator that:

1. **Always** auto-scrolls the X main bookmarks page first (`/i/bookmarks`) and imports every bookmark into HAL — no folder assignment yet.
2. **If folders exist**, walks each X bookmark folder, collects post-IDs from intercepted timeline responses, and POSTs `{ folders, assignments }` to `/api/folders/import-x` to (a) create same-named HAL folders and (b) attach `folder_id` to each bookmark already in HAL.
3. **If no folders exist**, finishes after the main pass.

Net result: every X bookmark lands in HAL exactly once; bookmarks that lived inside an X folder land in the matching HAL folder; loose bookmarks remain folderless.

## Why main-first (vs folders-first)

- The X main page already shows **every** bookmark (loose + foldered). One scroll-pass on root inserts everything.
- Folder walks then only need to record post-ID → folder-ID mappings; no inserts.
- Avoids the wasteful "extra root pass at the end" that a folders-first ordering needs.
- The backend route `POST /api/folders/import-x` already supports assignment-only updates by `x_post_id` — no server changes required.

## Scope

### In-scope (this feature)

- Refactor `apps/extension/src/folder-walk-import.ts` into a main-first orchestrator.
- Run folder discovery in parallel with the main pass (X loads `BookmarkFoldersSlice` on initial render, so it's usually intercepted before the main pass finishes).
- Persist orchestrator state in `chrome.storage.local` so the folder-walk phase survives page navigations.
- Update overlay copy to reflect the new phases ("Importing all bookmarks…", "Indexing folder X of N: <name>", "Done").
- Bump extension `version` in `apps/extension/public/manifest.json` (project rule).
- Rebuild `apps/extension/dist/`.

### Out-of-scope

- Backend changes — `/api/folders/import-x` already does the right thing.
- Dashboard UI changes — the existing **Library → "X" download icon** button keeps the same behavior (open `x.com/i/bookmarks?hal_folder_walk=1`).
- Adding nested-folder support (X doesn't have nested folders currently).

## Architecture

### State machine

```
phase: 'main-pass' → 'folder-walk' → 'done'
```

| Field           | Type                  | Notes                                                             |
| --------------- | --------------------- | ----------------------------------------------------------------- |
| `phase`         | `'main-pass'`/etc.    | Current step; persisted only when entering folder-walk            |
| `folders`       | `XFolderEntry[]`      | Snapshot from `BookmarkFoldersSlice`                              |
| `assignments`   | `FolderAssignment[]`  | Accumulated postId → x_folder_id pairs                            |
| `currentIndex`  | `number`              | Index of the folder being walked                                  |

The main pass never navigates away from `/i/bookmarks`, so its state can stay in memory. State is only persisted to `chrome.storage.local` once the folder-walk phase begins (each folder navigation tears down the script context).

### Sequence

```
User clicks "Import X folders" on dashboard
        │
        ▼
window.open('https://x.com/i/bookmarks?hal_folder_walk=1')
        │
        ▼ (extension content script loads on x.com)
content.ts → maybeResumeOnLoad() sees hal_folder_walk=1
        │
        ▼
startMainFirstImport()
   1. Install folder-list listener (records BookmarkFoldersSlice payload)
   2. startScrollInterceptImport on root          ← imports ALL bookmarks
   3. Wait briefly (≤ FOLDER_LIST_TIMEOUT_MS) for folder list
   4. If folders.length === 0 → finish
        │
        ▼ (folders found)
Persist { phase:'folder-walk', folders, assignments:[], currentIndex:0 }
window.location.href = '/i/bookmarks/<folders[0].id>'
        │
        ▼ (script context torn down → reloaded at new URL)
maybeResumeOnLoad() → maybeResumeFolderWalk()
   - Loads state from chrome.storage.local
   - Records all postIds intercepted during this folder's scroll
   - Appends to state.assignments with this folder's x_folder_id
   - state.currentIndex += 1; persist; navigate to next folder
        │
        ▼ (last folder done)
POST /api/folders/import-x { folders, assignments }
Clear chrome.storage state, show "Done — N folders, M assignments"
```

### Dedup semantics

`startScrollInterceptImport`'s batch callback already calls `chrome.runtime.sendMessage({ type: 'BULK_IMPORT_BATCH', tweets })`, which inserts new rows and reports `imported`/`skipped`. During the folder-walk phase these will all be skipped duplicates of the main pass's inserts — exactly what we want. (Optimization: skip the BULK_IMPORT_BATCH calls during folder-walk and only record post-IDs. Defer; not worth the extra code path right now.)

## Files Changed

### `apps/extension/src/folder-walk-import.ts` (rewrite)

Public API:

```ts
export function startMainFirstImport(): Promise<void>
export function maybeResumeFolderWalk(): Promise<void>
export function isImportRunning(): boolean
```

Internal:

- `runMainPass()` — wraps `startScrollInterceptImport` in a Promise
- `discoverFolders()` — listens for `X_INTERCEPT_FOLDERS_LIST`, returns `XFolderEntry[] | null`
- `walkNextFolder(state)` — navigates to next folder, persists state
- `finalize(state)` — POSTs to `/api/folders/import-x`, clears state, shows final overlay
- `showWalkOverlay(message, opts?)` — unchanged

### `apps/extension/src/content.ts`

- `maybeResumeOnLoad()` already calls `startFolderWalkImport` / `maybeResumeFolderWalk`. Rename the call site to `startMainFirstImport`.
- `HAL_START_FOLDER_WALK_IMPORT` window-message handler also routes to `startMainFirstImport`.

### `apps/extension/public/manifest.json`

- Bump `version`: `0.4.1` → `0.4.2`.

### `apps/extension/dist/*`

- Rebuild via the extension's build command.

## Testing

Manual end-to-end (no automated coverage today for the extension import path):

1. **Build & reload extension.**
   - `cd apps/extension && npm run build`
   - In Chrome: `chrome://extensions` → reload "Hello Again Links".

2. **Account with NO X folders.**
   - Confirm overlay shows "Importing all bookmarks…", scroll runs, then "Done — no folders found".
   - HAL `bookmarks` table contains every bookmark; all rows have `folder_id IS NULL`.

3. **Account WITH X folders.**
   - Confirm phases: main pass → folder walk → final POST.
   - HAL `folders` table has rows with `x_folder_id` set and matching names.
   - HAL `bookmarks` rows that were in folder F have `folder_id = F.id`.
   - HAL `bookmarks` rows that were NOT in any folder have `folder_id IS NULL`.

4. **Resume after browser reload mid-walk.**
   - During the folder-walk phase, manually reload the tab.
   - Confirm `maybeResumeFolderWalk` picks up at the saved `currentIndex` and continues.

## Risks

- **X interceptor naming drift** — if X renames `BookmarkFoldersSlice`, folder discovery silently returns null and we degrade to a main-pass-only run. Acceptable failure mode.
- **Folder-walk navigation caught by X SPA router** — `window.location.href = …` forces a hard nav and resets the script context, which is what `chrome.storage`-persisted state is designed for. Already proven in the current implementation.
- **Double-counting in totals** — totals shown during folder walk are mostly duplicate skips; overlay copy must say "indexing" not "importing" during that phase to avoid confusing the user.

## Phases (for git-workflow checkpoints)

This is effectively a single-phase change (one orchestrator rewrite + version bump + rebuild), so it will run as a one-phase plan per Rule 8.
