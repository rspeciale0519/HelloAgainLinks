// HelloAgain — Direct GraphQL Import (Phase 2)
//
// Handles X.com session credential management, direct paginated GraphQL import
// via the MAIN world relay, and the multi-strategy fallback orchestrator.

import type { ExtensionMessage, TweetData, XSessionCredentials, ImportPhase, ImportStrategy, ImportProgress } from './message-types';
import { createSyncGuards } from '@helloagain/shared';

// ── X session credentials ───────────────────────────────────

const X_SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

export async function storeXSession(credentials: XSessionCredentials): Promise<void> {
  await chrome.storage.local.set({ x_session: credentials });
}

export async function getXSession(): Promise<XSessionCredentials | null> {
  const result = await chrome.storage.local.get('x_session');
  return result.x_session || null;
}

export function isXSessionFresh(session: XSessionCredentials): boolean {
  return Date.now() - session.capturedAt < X_SESSION_MAX_AGE_MS;
}

// ── Extended progress broadcasting ──────────────────────────

let importPhase: ImportPhase = 'done';
let importStrategy: ImportStrategy | null = null;
let importStartedAt = 0;

export function getImportTiming() {
  return { importPhase, importStrategy, importStartedAt };
}

export function setImportTiming(phase: ImportPhase, strategy: ImportStrategy | null, startedAt: number) {
  importPhase = phase;
  importStrategy = strategy;
  importStartedAt = startedAt;
}

export function broadcastExtendedProgress(
  getProgress: () => { imported: number; skipped: number; limitReached: boolean },
  phase?: ImportPhase,
  phaseMessage?: string,
) {
  const base = getProgress();
  const progress: ImportProgress = {
    ...base,
    done: false,
    error: null,
    phase: phase || importPhase,
    phaseMessage: phaseMessage || '',
    startedAt: importStartedAt,
    strategy: importStrategy,
  };
  chrome.storage.local.set({ import_progress: progress });
}

// ── Tab management ──────────────────────────────────────────

export function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    function check(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(check);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(check);
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(check);
        resolve();
      }
    });
  });
}

export async function ensureXTab(): Promise<number | null> {
  const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
  const existing = tabs.find((t) => t.id !== undefined);

  if (existing?.id) {
    // Reload the tab to ensure fresh content scripts are injected
    // (after extension updates, existing tabs keep OLD content scripts)
    await chrome.tabs.update(existing.id, { url: 'https://x.com/i/bookmarks' });
    await waitForTabLoad(existing.id);
    await new Promise((r) => setTimeout(r, 1500));
    return existing.id;
  }

  const tab = await chrome.tabs.create({ url: 'https://x.com/i/bookmarks', active: false });
  if (!tab.id) return null;

  await waitForTabLoad(tab.id);
  await new Promise((r) => setTimeout(r, 1500));
  return tab.id;
}

export async function waitForCredentialCapture(tabId: number, timeoutMs = 15000): Promise<XSessionCredentials | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(null);
    }, timeoutMs);

    function listener(message: ExtensionMessage) {
      if (message.type === 'X_CREDENTIALS_CAPTURED') {
        clearTimeout(timeout);
        chrome.runtime.onMessage.removeListener(listener);
        storeXSession(message.credentials);
        resolve(message.credentials);
      }
    }

    chrome.runtime.onMessage.addListener(listener);
    chrome.tabs.update(tabId, { url: 'https://x.com/i/bookmarks' }).catch(() => {});
  });
}

// ── Direct API page fetching via MAIN world relay ───────────

let pendingPageResolve: ((result: { tweets: TweetData[]; cursor: string | null; error: string | null }) => void) | null = null;

export function handleBookmarksPageResult(tweets: TweetData[], cursor: string | null, error: string | null) {
  if (pendingPageResolve) {
    pendingPageResolve({ tweets, cursor, error });
    pendingPageResolve = null;
  }
}

async function fetchBookmarksPageViaRelay(tabId: number, cursor: string | null): Promise<{ tweets: TweetData[]; cursor: string | null; error: string | null }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingPageResolve = null;
      resolve({ tweets: [], cursor: null, error: 'timeout' });
    }, 30000);

    pendingPageResolve = (result) => {
      clearTimeout(timeout);
      resolve(result);
    };

    chrome.tabs.sendMessage(tabId, { type: 'FETCH_BOOKMARKS_PAGE', cursor }).catch(() => {
      clearTimeout(timeout);
      pendingPageResolve = null;
      resolve({ tweets: [], cursor: null, error: 'Tab communication failed' });
    });
  });
}

// ── Phase 4: Folder-scoped direct fetch via MAIN world relay ──

interface FolderPageResult { tweets: TweetData[]; cursor: string | null; error: string | null }

let pendingFolderPageResolve: ((result: FolderPageResult) => void) | null = null;
let pendingFolderId: string | null = null;

export function handleFolderPageResult(folderId: string, tweets: TweetData[], cursor: string | null, error: string | null): void {
  if (pendingFolderPageResolve && pendingFolderId === folderId) {
    pendingFolderPageResolve({ tweets, cursor, error });
    pendingFolderPageResolve = null;
    pendingFolderId = null;
  }
}

async function fetchFolderPageViaRelay(tabId: number, folderId: string, cursor: string | null): Promise<FolderPageResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      pendingFolderPageResolve = null;
      pendingFolderId = null;
      resolve({ tweets: [], cursor: null, error: 'timeout' });
    }, 30000);

    pendingFolderPageResolve = (result) => {
      clearTimeout(timeout);
      resolve(result);
    };
    pendingFolderId = folderId;

    chrome.tabs.sendMessage(tabId, { type: 'FETCH_FOLDER_PAGE', folderId, cursor }).catch(() => {
      clearTimeout(timeout);
      pendingFolderPageResolve = null;
      pendingFolderId = null;
      resolve({ tweets: [], cursor: null, error: 'Tab communication failed' });
    });
  });
}

/**
 * Direct GraphQL pagination for one folder. Loops until X returns the
 * same cursor twice (= end of data) or an error/safety limit. Returns
 * every postId observed inside that folder. Replaces the old
 * scroll-intercept-per-folder dance which routinely missed pages.
 */
export async function directFolderFetch(
  tabId: number,
  folderId: string,
  isActive: () => boolean,
): Promise<{ postIds: string[]; error?: string }> {
  const postIds = new Set<string>();
  let cursor: string | null = null;
  let prevCursor: string | null = null;
  let safety = 200; // hard cap (~20K tweets per folder); X bookmark folders are far smaller
  let consecutiveErrors = 0;

  while (safety-- > 0) {
    if (!isActive()) return { postIds: [...postIds], error: 'cancelled' };

    const result = await fetchFolderPageViaRelay(tabId, folderId, cursor);

    if (result.error) {
      if (result.error === 'rate_limited') return { postIds: [...postIds], error: 'rate_limited' };
      if (result.error === 'auth_expired') return { postIds: [...postIds], error: 'auth_expired' };
      consecutiveErrors++;
      if (consecutiveErrors >= 3) return { postIds: [...postIds], error: result.error };
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    consecutiveErrors = 0;

    for (const t of result.tweets) {
      if (t.postId) postIds.add(t.postId);
    }

    prevCursor = cursor;
    cursor = result.cursor;

    // X returns the same cursor when there's no more data. Also exit if
    // X returns no cursor at all OR no tweets (defensive).
    if (!cursor) break;
    if (cursor === prevCursor) break;
    if (result.tweets.length === 0) break;

    await new Promise((r) => setTimeout(r, 200)); // small delay to be polite
  }

  return { postIds: [...postIds] };
}

// ── Direct GraphQL import loop ──────────────────────────────

export async function directGraphQLImport(
  tabId: number,
  isActive: () => boolean,
  onBatch: (tweets: TweetData[]) => Promise<{ error?: string; inserted?: number; imported?: number }>,
  getProgress: () => { imported: number; skipped: number; limitReached: boolean },
): Promise<{ success: boolean; error?: string; stopReason?: string }> {
  importPhase = 'direct_api';
  importStrategy = 'Direct API';
  broadcastExtendedProgress(getProgress, 'direct_api', 'Importing bookmarks...');

  const guards = createSyncGuards({
    maxStalePages: 3,
    maxDurationMs: 5 * 60 * 1000, // 5 minutes max for extension imports
  });

  let cursor: string | null = null;
  let prevCursor: string | null = null;
  let consecutiveErrors = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!isActive()) return { success: false, error: 'Import cancelled' };

    const result = await fetchBookmarksPageViaRelay(tabId, cursor);

    if (result.error) {
      if (result.error === 'rate_limited') {
        return { success: false, error: 'X rate limit reached -- try again in 15 minutes' };
      }
      if (result.error === 'auth_expired') {
        return { success: false, error: 'auth_expired' };
      }
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        return { success: false, error: result.error };
      }
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    consecutiveErrors = 0;
    let pageNewCount = 0;

    if (result.tweets.length > 0) {
      const batchResult = await onBatch(result.tweets);
      if (batchResult.error) {
        return { success: false, error: batchResult.error };
      }
      pageNewCount = batchResult.inserted ?? batchResult.imported ?? 0;
      broadcastExtendedProgress(getProgress, 'direct_api', 'Importing bookmarks...');
    }

    prevCursor = cursor;
    cursor = result.cursor;

    // X API returns the same cursor when there's no more data
    if (cursor && cursor === prevCursor) {
      return { success: true, stopReason: 'end_of_data_duplicate_cursor' };
    }

    const stopReason = guards.check(pageNewCount, !!cursor);
    if (stopReason) {
      return { success: true, stopReason };
    }

    await new Promise((r) => setTimeout(r, 200));
  }
}
