// HelloAgain — Phase 3: folder-walk import for X bookmarks.
//
// Orchestrates a per-folder walk of the user's X bookmarks:
//   1. Navigate to https://x.com/i/bookmarks (root) and listen for the
//      BookmarkFoldersSlice GraphQL response (intercepted in
//      x-interceptor.ts and forwarded as X_INTERCEPT_FOLDERS_LIST).
//   2. For each folder: navigate to /i/bookmarks/:folderId, run the
//      existing scroll-intercept import, and accumulate the assignment
//      list (bookmark_x_post_id → x_folder_id).
//   3. POST the assembled { folders, assignments } to /api/folders/import-x.
//
// Network is owned by the existing batch sender (background.ts /
// content.ts BULK_IMPORT_BATCH path), so the per-folder scrape itself
// reuses startScrollInterceptImport. We maintain a side-channel for the
// folder→tweet mapping by inspecting the X_INTERCEPT_BOOKMARKS messages
// we see during each folder phase.

import { startScrollInterceptImport } from './bulk-import';
import type { TweetData } from './message-types';

const ROOT_URL = 'https://x.com/i/bookmarks';
const FOLDER_LIST_TIMEOUT_MS = 15_000;
const PER_FOLDER_NAVIGATION_WAIT_MS = 2_500;

interface XFolderEntry {
  x_folder_id: string;
  folder_name: string;
}

interface FolderAssignment {
  bookmark_x_post_id: string;
  x_folder_id: string;
}

let walkRunning = false;

export function isFolderWalkRunning(): boolean {
  return walkRunning;
}

export async function startFolderWalkImport(): Promise<void> {
  if (walkRunning) {
    showWalkOverlay('A folder-walk import is already running.');
    return;
  }
  walkRunning = true;
  showWalkOverlay('Discovering folders on X.com…');

  try {
    // Phase 1: navigate to bookmark root if we're not already there.
    if (!/\/i\/bookmarks\/?$/.test(window.location.pathname + window.location.search)) {
      window.location.href = ROOT_URL;
      // Page navigation will discard this script context — abort here.
      return;
    }

    const folders = await waitForFolderList(FOLDER_LIST_TIMEOUT_MS);
    if (!folders || folders.length === 0) {
      showWalkOverlay('No folders found on X. Nothing to import.', { final: true });
      walkRunning = false;
      return;
    }

    // Phase 2: walk each folder.
    const assignments: FolderAssignment[] = [];
    for (let i = 0; i < folders.length; i++) {
      const f = folders[i];
      showWalkOverlay(`Walking folder ${i + 1}/${folders.length}: ${f.folder_name}`);

      // Hand off via the background → content path: navigate, wait for
      // the page to load and the folder timeline to be intercepted, then
      // scroll-intercept-import.
      // Because navigation tears down our script context, we persist
      // walk state in chrome.storage so the next instance can resume.
      await persistWalkState({ folders, assignments, currentIndex: i });
      window.location.href = `${ROOT_URL}/${encodeURIComponent(f.x_folder_id)}`;
      // Navigation discards this context.
      return;
    }

    // (Reached only when the loop finishes without navigation, which is
    // currently never — kept for future "single-page" mode.)
    await postImport(folders, assignments);
    showWalkOverlay(
      `Done — ${folders.length} folders, ${assignments.length} assignments.`,
      { final: true },
    );
    walkRunning = false;
  } catch (err) {
    showWalkOverlay(`Folder-walk failed: ${(err as Error).message}`, { final: true });
    walkRunning = false;
  }
}

// ── Resume entry point — content.ts calls this on every page load
// when chrome.storage has a pending walk-state with currentIndex < N ──

interface WalkState {
  folders: XFolderEntry[];
  assignments: FolderAssignment[];
  currentIndex: number;
}

const STORAGE_KEY = 'hal_folder_walk_state';

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

export async function maybeResumeFolderWalk(): Promise<void> {
  const state = await loadWalkState();
  if (!state) return;
  if (!/\/i\/bookmarks\//.test(window.location.pathname)) return;

  const folder = state.folders[state.currentIndex];
  if (!folder) {
    // No more folders — submit and clear.
    await postImport(state.folders, state.assignments);
    await clearWalkState();
    walkRunning = false;
    showWalkOverlay(
      `Done — imported ${state.folders.length} folders, ${state.assignments.length} bookmarks assigned.`,
      { final: true },
    );
    return;
  }

  walkRunning = true;
  showWalkOverlay(`Resuming folder ${state.currentIndex + 1}/${state.folders.length}: ${folder.folder_name}`);

  // Wait briefly for the folder timeline GraphQL to start firing.
  await sleep(PER_FOLDER_NAVIGATION_WAIT_MS);

  // Capture all tweet postIds intercepted during this folder's scroll.
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

  await new Promise<void>((resolve, reject) => {
    startScrollInterceptImport({
      onBatch: async (tweets) => {
        // Send batch via the existing background path.
        return new Promise((batchResolve) => {
          chrome.runtime.sendMessage({ type: 'BULK_IMPORT_BATCH', tweets }, (response) => {
            void chrome.runtime.lastError;
            batchResolve({
              imported: response?.imported || 0,
              skipped: response?.skipped || 0,
            });
          });
        });
      },
      onDone: () => resolve(),
      onError: (msg) => reject(new Error(msg)),
    });
  }).catch((err) => {
    // Skip this folder, continue.
    console.warn('[HAL] folder-walk: folder failed —', err);
  });

  window.removeEventListener('message', onMessage);

  for (const postId of interceptedPostIds) {
    state.assignments.push({ bookmark_x_post_id: postId, x_folder_id: folder.x_folder_id });
  }

  state.currentIndex += 1;
  await persistWalkState(state);

  if (state.currentIndex >= state.folders.length) {
    await postImport(state.folders, state.assignments);
    await clearWalkState();
    walkRunning = false;
    showWalkOverlay(
      `Done — imported ${state.folders.length} folders, ${state.assignments.length} bookmarks assigned.`,
      { final: true },
    );
    return;
  }

  // Navigate to the next folder; resume picks it up on next load.
  const nextFolder = state.folders[state.currentIndex];
  window.location.href = `${ROOT_URL}/${encodeURIComponent(nextFolder.x_folder_id)}`;
}

// ── Helpers ─────────────────────────────────────────────────────

function waitForFolderList(timeoutMs: number): Promise<XFolderEntry[] | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', listener);
      resolve(null);
    }, timeoutMs);
    function listener(event: MessageEvent) {
      if (event.source !== window) return;
      if (event.data?.source !== 'hal-x-interceptor') return;
      if (event.data.type !== 'X_INTERCEPT_FOLDERS_LIST') return;
      const folders = (event.data.folders ?? []) as XFolderEntry[];
      if (folders.length === 0) return;
      clearTimeout(timer);
      window.removeEventListener('message', listener);
      resolve(folders);
    }
    window.addEventListener('message', listener);
  });
}

async function postImport(folders: XFolderEntry[], assignments: FolderAssignment[]): Promise<void> {
  const payload = {
    folders: folders.map((f) => ({ x_folder_id: f.x_folder_id, name: f.folder_name })),
    assignments,
  };
  // Use the existing background-bridged authenticated relay.
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'HAL_FOLDERS_IMPORT_X', payload },
      (response) => {
        void chrome.runtime.lastError;
        if (!response?.ok) {
          console.warn('[HAL] folder-walk: import-x failed', response);
        }
        resolve();
      },
    );
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
