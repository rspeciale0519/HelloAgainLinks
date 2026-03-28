# Feature: Extension-Based Bulk Bookmark Import

## Context

HAL's bookmark import currently requires the X API v2 Bookmarks endpoint, which costs $200+/mo (Basic tier). With no paying users yet, this is not viable. Every user needs to import their existing X bookmarks to get value from HAL.

**Solution**: Use the Chrome extension to auto-scroll `x.com/i/bookmarks`, scrape tweet data from the DOM using the existing `extractTweetData()` function, and batch-send bookmarks to the HAL API. Zero API costs, unlimited bookmarks, full tweet content (text, author, media).

The existing API-based import stays in the codebase but is hidden behind a feature flag (`NEXT_PUBLIC_API_IMPORT_ENABLED`) for future activation when revenue supports it.

---

## Phase 1: Batch API Route + Schema

**Goal**: Create a server endpoint that accepts an array of bookmarks in one request.

### 1.1 Add `batchImportSchema` to shared package
- **File**: `packages/shared/src/schemas.ts`
- Add schema and export type:
  ```ts
  export const batchImportSchema = z.object({
    bookmarks: z.array(createBookmarkSchema).min(1).max(100),
  });
  export type BatchImportInput = z.infer<typeof batchImportSchema>;
  ```

### 1.2 Create batch API route
- **File (new)**: `apps/web/src/app/api/bookmarks/batch/route.ts`
- `export const dynamic = 'force-dynamic'`
- POST handler:
  1. `getAuthContext(req)` + `isAuthError(ctx)` guard
  2. Parse body with `batchImportSchema`
  3. Count current bookmarks: `SELECT count(*) WHERE user_id = $1` (one query)
  4. If at limit → return `{ imported: 0, skipped: 0, limitReached: true, remaining: 0 }`
  5. Dedup: `SELECT x_post_id WHERE user_id = $1 AND x_post_id IN (...)` (one query)
  6. Filter out existing, slice to remaining plan capacity
  7. Bulk insert new rows (one query)
  8. Return `{ imported, skipped, limitReached, remaining }`
- Uses `ctx.serviceClient` for inserts (same as existing `/api/import`)

---

## Phase 2: Extension Scraper Module

**Goal**: Build the auto-scroll + scrape engine that runs on x.com/i/bookmarks.

### 2.1 Extract `extractTweetData` to shared module
- **File (new)**: `apps/extension/src/tweet-utils.ts`
- Move `extractTweetData()` function and its return type `TweetData` here
- Export both
- **File (modify)**: `apps/extension/src/content.ts`
- Replace inline function with `import { extractTweetData } from './tweet-utils'`

### 2.2 Create bulk import module
- **File (new)**: `apps/extension/src/bulk-import.ts` (~200 lines)
- Exports:
  - `startBulkImport(callbacks: BulkImportCallbacks): void`
  - `stopBulkImport(): void`
- `BulkImportCallbacks`: `{ onBatch(tweets: TweetData[]): void; onDone(): void; onError(msg: string): void }`
- Internal scroll loop:
  1. Verify on `x.com/i/bookmarks` (error if not)
  2. Inject progress overlay (fixed-position DOM element, HAL-styled)
  3. Query `article[data-testid="tweet"]:not([data-hal-scraped])`
  4. Run `extractTweetData()` on each, mark `data-hal-scraped`
  5. Buffer tweets; when buffer hits 25, call `onBatch(batch)` and clear
  6. `window.scrollBy(0, 800)`, wait 1200ms for X's virtual list to load
  7. If 3 consecutive scrolls yield 0 new articles → flush remaining buffer, call `onDone()`
- Progress overlay: shows "Importing bookmarks... X found" with a stop button
- `stopBulkImport()`: sets abort flag, removes overlay

### 2.3 Wire up content script message handlers
- **File (modify)**: `apps/extension/src/content.ts`
- Add to existing `chrome.runtime.onMessage.addListener`:
  - `START_BULK_IMPORT` → call `startBulkImport(...)` with callbacks that send `BULK_IMPORT_BATCH` / `BULK_IMPORT_DONE` / `BULK_IMPORT_ERROR` messages to background
  - `STOP_BULK_IMPORT` → call `stopBulkImport()`

---

## Phase 3: Background Coordinator

**Goal**: Orchestrate the import session — tab management, API calls, progress broadcasting.

### 3.1 Add import coordinator to background
- **File (modify)**: `apps/extension/src/background.ts`
- Add `ImportSession` type: `{ tabId, originTabId, imported, skipped, limitReached }`
- Add module-level `let currentSession: ImportSession | null`
- New message handlers in `handleMessage` switch:
  - `START_BULK_IMPORT`:
    1. Find or create tab at `x.com/i/bookmarks`
    2. Wait for tab to finish loading
    3. Send `{ type: 'START_BULK_IMPORT' }` to that tab's content script
    4. Initialize `currentSession`
  - `BULK_IMPORT_BATCH`:
    1. Call `apiCall('POST', '/api/bookmarks/batch', { bookmarks })`
    2. Update session counters
    3. If `limitReached` → send `STOP_BULK_IMPORT` to content tab
    4. Broadcast progress to popup/sidepanel and dashboard
    5. Update HAL post ID cache
  - `BULK_IMPORT_STOP` → send `STOP_BULK_IMPORT` to content tab, clear session
  - `BULK_IMPORT_DONE` → finalize session, broadcast done event
  - `BULK_IMPORT_ERROR` → broadcast error, clear session
  - `BULK_IMPORT_KEEPALIVE` → respond with ACK (prevents MV3 service worker timeout)
- Add to `onMessageExternal`: handle `START_BULK_IMPORT` and `STOP_BULK_IMPORT` from HAL dashboard

### 3.2 Update dashboard content script
- **File (modify)**: `apps/extension/src/dashboard.ts`
- Listen for `import_progress` key changes in `chrome.storage.local.onChanged`
- Forward to page via `window.postMessage({ source: 'hal-extension', type: 'BULK_IMPORT_PROGRESS' | 'BULK_IMPORT_DONE' | 'BULK_IMPORT_ERROR', ...data })`
- Also listen for `window.addEventListener('message')` for `{ source: 'hal-dashboard', type: 'START_BULK_IMPORT' }` from the settings page → forward to `chrome.runtime.sendMessage`

---

## Phase 4: Extension UI

**Goal**: Add import triggers to popup and side panel.

### 4.1 Add ImportBookmarks component to popup
- **File (modify)**: `apps/extension/src/popup/Popup.tsx`
- New `ImportBookmarks` component placed between the bookmark list and `HalButtonToggle`
- Three states: `idle` (import button), `running` (progress counts + stop button), `done`/`error` (result message)
- Button triggers `chrome.runtime.sendMessage({ type: 'START_BULK_IMPORT' })`
- Listens to `chrome.runtime.onMessage` for progress/done/error updates
- Shows "Limit reached — upgrade to Pro" when `limitReached` is true

### 4.2 Add compact import to side panel
- **File (modify)**: `apps/extension/src/sidepanel/SidePanel.tsx`
- Add a slim "Import Bookmarks" button in the header area
- Same message protocol as popup; shows inline progress text when running

---

## Phase 5: Dashboard Settings Integration

**Goal**: Trigger import from the HAL web dashboard and feature-flag the API import.

### 5.1 Rewrite ImportSection in settings
- **File (modify)**: `apps/web/src/app/dashboard/settings/page.tsx`
- Replace `ImportSection` with two subsections:

**Extension Import** (always shown):
- Detects extension via `localStorage.getItem('hal_extension_id')` (set by `dashboard.ts`)
- If no extension: shows "Install the HAL Chrome extension to import your bookmarks" with link
- If extension installed: shows "Import from X" button
- On click: `window.postMessage({ source: 'hal-dashboard', type: 'START_BULK_IMPORT' }, '*')`
- Listens for `{ source: 'hal-extension', type: 'BULK_IMPORT_PROGRESS' | 'DONE' | 'ERROR' }` via `window.addEventListener('message')`
- Shows live progress: "Imported X bookmarks (Y skipped)..."
- Shows `limitReached` upgrade prompt when applicable

**API Import** (feature-flagged):
- Only rendered when `process.env.NEXT_PUBLIC_API_IMPORT_ENABLED === 'true'`
- Existing `handleImport` logic, unchanged
- Default: hidden (env var not set or `'false'`)

---

## Files Summary

### New Files (3)
| File | Purpose |
|------|---------|
| `apps/web/src/app/api/bookmarks/batch/route.ts` | Batch bookmark creation API |
| `apps/extension/src/bulk-import.ts` | Auto-scroll scraper + progress overlay |
| `apps/extension/src/tweet-utils.ts` | Shared `extractTweetData()` + `TweetData` type |

### Modified Files (8)
| File | Change |
|------|--------|
| `packages/shared/src/schemas.ts` | Add `batchImportSchema` |
| `apps/extension/src/content.ts` | Import from `tweet-utils`, add START/STOP handlers |
| `apps/extension/src/background.ts` | Import coordinator, batch API calls, session state |
| `apps/extension/src/dashboard.ts` | Forward `import_progress` events to/from page |
| `apps/extension/src/popup/Popup.tsx` | Add `ImportBookmarks` component |
| `apps/extension/src/sidepanel/SidePanel.tsx` | Add compact import trigger |
| `apps/web/src/app/dashboard/settings/page.tsx` | Rewrite `ImportSection` with extension + flagged API |

---

## Key Design Decisions

- **Batch size 25**: Balances API efficiency vs. progress responsiveness. 200 bookmarks = 8 API calls
- **Scroll delay 1200ms**: Gives X's virtual list time to render. Configurable constant
- **3 empty scrolls = done**: Conservative end-of-list detection for X's lazy loading
- **MV3 keepalive**: Content script pings background every 20s to prevent service worker shutdown
- **Feature flag as env var**: `NEXT_PUBLIC_API_IMPORT_ENABLED` — no DB migration needed, deploy-time toggle
- **`data-hal-scraped` attribute**: Marks processed articles since X's virtual list removes DOM nodes above viewport

---

## Verification

1. **Unit test the batch API**: POST array of bookmarks, verify dedup, verify plan limit stops at 500 for free tier
2. **Extension build**: `npm run build` in `apps/extension/`, load unpacked in Chrome
3. **End-to-end from popup**: Click "Import Bookmarks" in popup → verify it navigates to x.com/i/bookmarks, shows overlay, scrolls, and bookmarks appear in HAL dashboard
4. **End-to-end from dashboard**: Click "Import from X" on settings page → same flow, progress shown inline
5. **Plan limit**: Set a free account with 490 bookmarks, import 20 → verify only 10 imported, `limitReached` shown
6. **Dedup**: Run import twice → second run shows all skipped
7. **Feature flag**: Verify API import section hidden by default, visible when `NEXT_PUBLIC_API_IMPORT_ENABLED=true`
8. **Stop button**: Click stop mid-import → verify it stops cleanly, shows partial count
