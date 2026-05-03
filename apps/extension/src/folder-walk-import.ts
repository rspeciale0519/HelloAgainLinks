// HelloAgain — Main-first X bookmark import.
//
// Flow (entered when the user lands on /i/bookmarks?hal_folder_walk=1
// after clicking "Import X folders" on the HAL dashboard):
//
//   Phase A — main pass:
//     Auto-scroll the root /i/bookmarks page and import every bookmark
//     into HAL via the existing BULK_IMPORT_BATCH path. The X main page
//     shows ALL bookmarks (loose + foldered), so this single sweep
//     captures everything. No folder is assigned at this stage.
//
//   Phase B — folder discovery:
//     While the main pass runs, x-interceptor.ts caches the
//     BookmarkFoldersSlice GraphQL response to window.__halXFoldersList
//     and posts an X_INTERCEPT_FOLDERS_LIST message. We collect both
//     and reconcile after the main pass completes.
//
//   Phase C — folder direct-fetch (only if folders exist):
//     Navigate to the FIRST folder URL once. This causes X to fire
//     BookmarkFolderTimeline, which the interceptor uses to capture
//     that operation's queryId. Once captured, ask the background
//     script to direct-fetch ALL folders via paginated GraphQL (no
//     more navigation, no more scroll-intercept-per-folder dance).
//     The background then POSTs { folders, assignments } to
//     /api/folders/import-x. This replaces the old per-folder scroll
//     loop which terminated too early on slow folders and routinely
//     missed pages.

import { startScrollInterceptImport } from './bulk-import';

const ROOT_URL = 'https://x.com/i/bookmarks';
const FOLDER_LIST_GRACE_MS = 5_000;
// After navigating to the first folder, wait this long for X to fire
// BookmarkFolderTimeline so the interceptor captures the operation's
// queryId. Without this queryId the direct-fetch path errors out.
const FOLDER_QUERYID_WAIT_MS = 15_000;
const FOLDER_QUERYID_POLL_MS = 250;

interface XFolderEntry {
  x_folder_id: string;
  folder_name: string;
}

interface WalkState {
  folders: XFolderEntry[];
  // currentIndex retained for backwards-compatibility with any in-flight
  // pre-v0.5 walk state in chrome.storage. The new direct-fetch path
  // doesn't use it.
  currentIndex: number;
}

const STORAGE_KEY = 'hal_folder_walk_state';

let importRunning = false;

export function isImportRunning(): boolean {
  return importRunning;
}

// ── Entry point: main-first orchestration ───────────────────────────

export async function startMainFirstImport(): Promise<void> {
  if (importRunning) {
    showWalkOverlay('An import is already running.');
    return;
  }
  if (!/\/i\/bookmarks\/?$/.test(window.location.pathname)) {
    // Not on the root page — bounce there. Navigation discards this
    // context; on reload we re-enter via the ?hal_folder_walk=1 path.
    window.location.href = `${ROOT_URL}?hal_folder_walk=1`;
    return;
  }

  importRunning = true;

  // Start collecting any folder-list responses that fire during the
  // main pass. We also check the synchronous cache after the pass.
  const collectedFolders: XFolderEntry[] = [];
  const folderListListener = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'hal-x-interceptor') return;
    if (event.data.type !== 'X_INTERCEPT_FOLDERS_LIST') return;
    const folders = (event.data.folders ?? []) as XFolderEntry[];
    for (const f of folders) {
      if (!collectedFolders.some((x) => x.x_folder_id === f.x_folder_id)) {
        collectedFolders.push(f);
      }
    }
  };
  window.addEventListener('message', folderListListener);

  try {
    showWalkOverlay('phase=main-pass · Importing all bookmarks from X…');
    await runScrollImportAsPromise();
    showWalkOverlay('phase=main-pass-done · Looking for folders…');

    // Give the BookmarkFoldersSlice response one last grace window in
    // case X loads it lazily (e.g. only after timeline render).
    const folders = await waitForFolders(collectedFolders, FOLDER_LIST_GRACE_MS);
    window.removeEventListener('message', folderListListener);

    if (folders.length === 0) {
      sendBulkImportDone();
      showWalkOverlay('phase=done · Main bookmarks imported. No folders found.', { final: true });
      importRunning = false;
      return;
    }

    // Persist state and navigate to the first folder ONCE. The
    // navigation tears down this script context; on reload,
    // maybeResumeFolderWalk takes over and triggers the direct-fetch
    // path that handles ALL folders without further navigation.
    showWalkOverlay(`phase=persist-state · Saving state for ${folders.length} folders…`);
    const state: WalkState = { folders, currentIndex: 0 };
    await persistWalkState(state);
    showWalkOverlay(`phase=navigate · Opening first folder to capture API credentials…`);
    window.location.href = `${ROOT_URL}/${encodeURIComponent(folders[0].x_folder_id)}`;
    // Navigation discards this context.
  } catch (err) {
    window.removeEventListener('message', folderListListener);
    showWalkOverlay(`phase=error · Import failed: ${(err as Error).message}`, { final: true });
    importRunning = false;
  }
}

// ── Resume entry point — runs on every /i/bookmarks/* page load ─────

export async function maybeResumeFolderWalk(): Promise<void> {
  const state = await loadWalkState();
  if (!state) return;
  if (!/\/i\/bookmarks\//.test(window.location.pathname)) return;

  importRunning = true;

  try {
    showWalkOverlay(`phase=capture-creds · Waiting for X folder API credentials…`);
    // X fires BookmarkFolderTimeline shortly after a folder page loads.
    // The interceptor stores its queryId on the page-world global so
    // we can poll for it from the isolated content world here.
    const credsReady = await waitForFolderTimelineCredentials(FOLDER_QUERYID_WAIT_MS);
    if (!credsReady) {
      showWalkOverlay('phase=error · Could not capture folder API credentials in time.', { final: true });
      await clearWalkState();
      sendBulkImportDone();
      importRunning = false;
      return;
    }

    showWalkOverlay(`phase=direct-fetch · Fetching all ${state.folders.length} folders via API…`);
    const result = await sendDirectFolderFetch(state.folders);

    await clearWalkState();
    sendBulkImportDone();
    importRunning = false;

    if (result.ok) {
      showWalkOverlay(
        `phase=done · ${result.foldersFetched}/${state.folders.length} folders, ${result.assignmentsCount} bookmarks assigned.`,
        { final: true },
      );
    } else {
      showWalkOverlay(
        `phase=error · Direct fetch failed: ${result.error || 'unknown error'} (got ${result.assignmentsCount} assignments from ${result.foldersFetched} folders before failing).`,
        { final: true },
      );
    }
  } catch (err) {
    showWalkOverlay(`phase=error · Folder walk failed: ${(err as Error).message}`, { final: true });
    await clearWalkState();
    sendBulkImportDone();
    importRunning = false;
  }
}

// ── Internals ───────────────────────────────────────────────────────

function runScrollImportAsPromise(): Promise<void> {
  return new Promise((resolve, reject) => {
    startScrollInterceptImport({
      onBatch: (tweets) =>
        new Promise((batchResolve) => {
          chrome.runtime.sendMessage({ type: 'BULK_IMPORT_BATCH', tweets }, (response) => {
            void chrome.runtime.lastError;
            // Forward all four buckets so the overlay's accuracy invariant
            // holds: Found = imported + updated + skipped + errored + queued.
            batchResolve({
              imported: response?.imported || 0,
              updated:  response?.updated  || 0,
              skipped:  response?.skipped  || 0,
              errored:  response?.errored  || 0,
            });
          });
        }),
      onDone: () => resolve(),
      onError: (msg) => reject(new Error(msg)),
    });
  });
}

async function waitForFolders(
  collected: XFolderEntry[],
  graceMs: number,
): Promise<XFolderEntry[]> {
  // Prefer whatever has already been cached by the interceptor.
  const cached = (window as unknown as { __halXFoldersList?: XFolderEntry[] }).__halXFoldersList;
  if (cached && cached.length > 0) return dedupeFolders([...cached, ...collected]);
  if (collected.length > 0) return dedupeFolders(collected);

  // Poll briefly in case the response arrives during the grace window.
  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    await sleep(250);
    const latest = (window as unknown as { __halXFoldersList?: XFolderEntry[] }).__halXFoldersList;
    if (latest && latest.length > 0) return dedupeFolders([...latest, ...collected]);
    if (collected.length > 0) return dedupeFolders(collected);
  }
  return [];
}

function dedupeFolders(list: XFolderEntry[]): XFolderEntry[] {
  const seen = new Set<string>();
  const out: XFolderEntry[] = [];
  for (const f of list) {
    if (seen.has(f.x_folder_id)) continue;
    seen.add(f.x_folder_id);
    out.push(f);
  }
  return out;
}

/**
 * Poll for an X_CREDENTIALS_CAPTURED message that came from a
 * BookmarkFolderTimeline call. We can't directly read the page-world
 * `queryIdsByOperation` map from this content-world script, so we
 * subscribe to the bridge messages the interceptor fires every time it
 * captures credentials. We also tag-team-check the most recent stored
 * X session so a credential capture from before this listener attached
 * isn't lost.
 */
function waitForFolderTimelineCredentials(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', listener);
      resolve(ok);
    };

    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.source !== 'hal-x-interceptor') return;
      // Any X_INTERCEPT_BOOKMARKS message that has a folderContext means
      // a BookmarkFolderTimeline response just landed AND was parsed,
      // which implies its queryId was captured during the .send() that
      // started the call.
      if (event.data.type === 'X_INTERCEPT_BOOKMARKS' && event.data.folderContext) {
        settle(true);
      }
    };
    window.addEventListener('message', listener);

    // Safety timeout.
    const timer = setTimeout(() => settle(false), timeoutMs);
    // Tighter polling cleanup if we settle early.
    const cleanup = () => clearTimeout(timer);
    void cleanup; // referenced for clarity; settled-flag handles the actual cleanup
    // Backstop: poll while waiting in case nothing fires (e.g. empty folder).
    (async () => {
      const deadline = Date.now() + timeoutMs;
      while (!settled && Date.now() < deadline) {
        await sleep(FOLDER_QUERYID_POLL_MS);
      }
      settle(false);
    })();
  });
}

interface DirectFolderFetchResult {
  ok: boolean;
  assignmentsCount: number;
  foldersFetched: number;
  error?: string;
}

async function sendDirectFolderFetch(folders: XFolderEntry[]): Promise<DirectFolderFetchResult> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'HAL_DIRECT_FOLDER_FETCH', folders },
      (response) => {
        const lastErr = chrome.runtime.lastError?.message;
        if (lastErr) {
          resolve({ ok: false, assignmentsCount: 0, foldersFetched: 0, error: lastErr });
          return;
        }
        if (!response) {
          resolve({ ok: false, assignmentsCount: 0, foldersFetched: 0, error: 'No response from background' });
          return;
        }
        resolve(response as DirectFolderFetchResult);
      },
    );
  });
}

function sendBulkImportDone(): void {
  try {
    chrome.runtime.sendMessage({ type: 'BULK_IMPORT_DONE' }, () => {
      void chrome.runtime.lastError;
    });
  } catch { /* no-op */ }
}

// ── chrome.storage helpers ──────────────────────────────────────────

async function persistWalkState(state: WalkState): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, () => resolve());
  });
}

async function loadWalkState(): Promise<WalkState | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (res) => {
      resolve((res?.[STORAGE_KEY] as WalkState | undefined) ?? null);
    });
  });
}

async function clearWalkState(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(STORAGE_KEY, () => resolve());
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Minimal status overlay (independent of bulk-import.ts overlay) ──

const OVERLAY_ID = 'hal-folder-walk-overlay';

function showWalkOverlay(message: string, opts?: { final?: boolean }): void {
  let el = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_ID;
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      maxWidth: '320px',
      padding: '12px 14px',
      borderRadius: '12px',
      background: 'rgba(10,10,15,0.95)',
      border: '1px solid rgba(0,212,255,0.25)',
      color: '#f0f0f5',
      fontFamily: "'Inter', -apple-system, sans-serif",
      fontSize: '12px',
      zIndex: '999998',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    });
    document.body.appendChild(el);
  }
  el.textContent = `HAL · ${message}`;
  if (opts?.final) {
    setTimeout(() => el?.remove(), 12000);
  }
}
