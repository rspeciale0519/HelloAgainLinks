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
//   Phase C — folder walk (only if folders exist):
//     Persist { folders, assignments:[], currentIndex:0 } to
//     chrome.storage.local and navigate to /i/bookmarks/:firstFolderId.
//     Each navigation tears down the script context, so resumption is
//     handled by maybeResumeFolderWalk() on the next page load.
//     For each folder we run the same scroll-intercept-import (its
//     BULK_IMPORT_BATCH calls are no-op skips because the main pass
//     already inserted those rows) and record every postId we see, so
//     we can POST { folders, assignments } to /api/folders/import-x at
//     the end. That endpoint reconciles X folders into HAL folders by
//     x_folder_id and sets bookmarks.folder_id by x_post_id.

import { startScrollInterceptImport } from './bulk-import';
import type { TweetData } from './message-types';

const ROOT_URL = 'https://x.com/i/bookmarks';
const FOLDER_LIST_GRACE_MS = 5_000;
// Each folder navigation tears down the script context and X has to fire
// `BookmarkFolderTimeline` before the scroll-intercept's 5×400ms empty-
// scroll fail-fast triggers `intercept_failed`. 2.5s wasn't enough on a
// heavy account — most folders failed silently. 6s gives X room to load.
const PER_FOLDER_NAVIGATION_WAIT_MS = 6_000;

interface XFolderEntry {
  x_folder_id: string;
  folder_name: string;
}

interface FolderAssignment {
  bookmark_x_post_id: string;
  x_folder_id: string;
}

interface WalkState {
  folders: XFolderEntry[];
  assignments: FolderAssignment[];
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

    // Persist state and navigate to the first folder. Resumption is
    // handled by maybeResumeFolderWalk() on the next page load.
    showWalkOverlay(`phase=persist-state · Saving state for ${folders.length} folders…`);
    const state: WalkState = { folders, assignments: [], currentIndex: 0 };
    await persistWalkState(state);
    showWalkOverlay(`phase=navigate · Indexing folder 1/${folders.length}: ${folders[0].folder_name}…`);
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

  const folder = state.folders[state.currentIndex];
  if (!folder) {
    await finalize(state);
    return;
  }

  importRunning = true;
  showWalkOverlay(
    `Indexing folder ${state.currentIndex + 1}/${state.folders.length}: ${folder.folder_name}…`,
  );

  // Wait briefly for X's folder timeline GraphQL to start firing.
  await sleep(PER_FOLDER_NAVIGATION_WAIT_MS);

  const interceptedPostIds = new Set<string>();
  const onMessage = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'hal-x-interceptor') return;
    if (event.data.type !== 'X_INTERCEPT_BOOKMARKS') return;
    const tweets = (event.data.tweets ?? []) as TweetData[];
    for (const t of tweets) {
      if (t.postId) interceptedPostIds.add(t.postId);
    }
  };
  window.addEventListener('message', onMessage);

  try {
    await runScrollImportAsPromise();
  } catch (err) {
    // Skip this folder, continue to the next one.
    console.warn('[HAL] folder-walk: folder failed —', err);
  } finally {
    window.removeEventListener('message', onMessage);
  }

  for (const postId of interceptedPostIds) {
    state.assignments.push({ bookmark_x_post_id: postId, x_folder_id: folder.x_folder_id });
  }

  state.currentIndex += 1;
  await persistWalkState(state);

  if (state.currentIndex >= state.folders.length) {
    await finalize(state);
    return;
  }

  const nextFolder = state.folders[state.currentIndex];
  window.location.href = `${ROOT_URL}/${encodeURIComponent(nextFolder.x_folder_id)}`;
}

// ── Internals ───────────────────────────────────────────────────────

function runScrollImportAsPromise(): Promise<void> {
  return new Promise((resolve, reject) => {
    startScrollInterceptImport({
      onBatch: (tweets) =>
        new Promise((batchResolve) => {
          chrome.runtime.sendMessage({ type: 'BULK_IMPORT_BATCH', tweets }, (response) => {
            void chrome.runtime.lastError;
            batchResolve({
              imported: response?.imported || 0,
              skipped: response?.skipped || 0,
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

async function finalize(state: WalkState): Promise<void> {
  await postImport(state.folders, state.assignments);
  sendBulkImportDone();
  await clearWalkState();
  importRunning = false;
  showWalkOverlay(
    `Done — ${state.folders.length} folders, ${state.assignments.length} bookmarks assigned.`,
    { final: true },
  );
}

function sendBulkImportDone(): void {
  try {
    chrome.runtime.sendMessage({ type: 'BULK_IMPORT_DONE' }, () => {
      void chrome.runtime.lastError;
    });
  } catch { /* no-op */ }
}

async function postImport(
  folders: XFolderEntry[],
  assignments: FolderAssignment[],
): Promise<void> {
  const payload = {
    folders: folders.map((f) => ({ x_folder_id: f.x_folder_id, name: f.folder_name })),
    assignments,
  };
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'HAL_FOLDERS_IMPORT_X', payload },
      (response) => {
        void chrome.runtime.lastError;
        if (!response?.ok) {
          // JSON.stringify so the runtime errors panel actually shows the
          // failure body instead of `[object Object]`. Truncate so a huge
          // Zod issues array doesn't blow up the panel.
          const dump = (() => {
            try { return JSON.stringify(response).slice(0, 2000); }
            catch { return String(response); }
          })();
          console.warn('[HAL] folder-walk: import-x failed', dump,
            '· payload sizes:', `folders=${folders.length}`, `assignments=${assignments.length}`);
        }
        resolve();
      },
    );
  });
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
    setTimeout(() => el?.remove(), 8000);
  }
}
