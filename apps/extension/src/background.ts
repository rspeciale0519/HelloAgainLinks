// HelloAgain — Service Worker (Background Script)

import type { ExtensionMessage, TweetData, TabMessage, ExternalMessage } from './message-types';
import {
  storeXSession, getXSession, isXSessionFresh,
  setImportTiming, broadcastExtendedProgress,
  waitForTabLoad, ensureXTab, waitForCredentialCapture,
  handleBookmarksPageResult, directGraphQLImport,
} from './direct-import';

const API_BASE = 'https://helloagainlinks.com';

interface AuthData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    handle: string;
    name: string;
    avatar: string;
  };
}

// ── Auth helpers ──────────────────────────────────────────────

async function getAuth(): Promise<AuthData | null> {
  const result = await chrome.storage.local.get('auth');
  return result.auth || null;
}

async function setAuth(auth: AuthData): Promise<void> {
  await chrome.storage.local.set({ auth });
}

async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove('auth');
}

async function getToken(): Promise<string | null> {
  const auth = await getAuth();
  if (!auth) return null;

  // Check if token is expired or expiring soon (5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (auth.expires_at && auth.expires_at - now < 300) {
    if (!auth.refresh_token) {
      await clearAuth();
      return null;
    }
    // Try refresh with one retry
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: auth.refresh_token }),
        });
        if (res.ok) {
          const data = await res.json();
          await setAuth({ ...auth, ...data });
          return data.access_token;
        }
        if (res.status === 401) {
          // Refresh token itself is invalid — force re-login
          await clearAuth();
          return null;
        }
      } catch {
        if (attempt === 1) {
          // Both attempts failed — clear auth so user re-logs in cleanly
          await clearAuth();
          return null;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return auth.access_token;
}

// ── API helpers ──────────────────────────────────────────────

async function apiCall(path: string, options: RequestInit = {}) {
  const token = await getToken();
  if (!token) return { error: 'Not authenticated', status: 401 };

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ...data, error: data.error || 'Request failed', status: res.status };
    return data;
  } catch (err) {
    console.error('[HelloAgain] API call failed:', path, err);
    return { error: 'Network error — check your connection', status: 0 };
  }
}

// ── Bulk import session ──────────────────────────────────────

interface ImportSession {
  tabId: number;
  imported: number;     // API `inserted` — brand-new rows
  updated: number;      // API `updated` — existing row, incoming was richer & merged
  skipped: number;      // API `skipped` — existing row, no change needed
  errored: number;      // batches the API rejected (validation, network, etc.)
  limitReached: boolean;
}

let currentImport: ImportSession | null = null;



async function handleStartBulkImport() {
  setImportTiming('connecting', null, Date.now());
  currentImport = { tabId: -1, imported: 0, updated: 0, skipped: 0, errored: 0, limitReached: false };
  broadcastExtendedProgress(getImportProgress, 'connecting', 'Connecting to X...');

  const runDirectImport = async (tabId: number) => {
    return directGraphQLImport(
      tabId,
      () => !!currentImport,
      (tweets) => handleBulkImportBatch(tweets),
      getImportProgress,
    );
  };

  // Step 1: Ensure we have a tab with fresh content scripts.
  // ensureXTab() navigates to x.com/i/bookmarks, which triggers the XHR
  // interceptor to capture credentials during the page load.
  const tabId = await ensureXTab();
  if (!tabId) {
    handleBulkImportError('Could not open X.com tab');
    return { error: 'Could not open X.com tab' };
  }
  currentImport.tabId = tabId;

  // Step 2: Wait for credentials (captured during page load by XHR interceptor).
  // The XHR interceptor fires when X makes the Bookmarks GraphQL request,
  // which can happen several seconds after the page starts loading (SPA bootstrap).
  // Poll storage every 500ms for up to 15 seconds.
  let session: Awaited<ReturnType<typeof getXSession>> = null;
  for (let i = 0; i < 30; i++) {
    session = await getXSession();
    if (session && isXSessionFresh(session)) break;
    session = null;
    await new Promise((r) => setTimeout(r, 500));
  }

  // Step 3: If we have fresh credentials, try direct API (fastest path)
  if (session && isXSessionFresh(session)) {
    const result = await runDirectImport(tabId);
    if (result.success && (currentImport?.imported || 0) > 0) {
      // Direct API worked and imported something — done
      handleBulkImportDone();
      return { success: true };
    }
    // Direct API found nothing or failed — fall through to scroll-based
    // (rate limit, stale pages with 0 imports, communication errors, etc.)
  }

  // Step 4: Direct API failed or no credentials — fall back to scroll-based import
  setImportTiming('scroll_intercept', 'Fast scan', Date.now());
  broadcastExtendedProgress(getImportProgress, 'scroll_intercept', 'Scanning bookmarks...');

  // Make tab visible and ensure it's on the bookmarks page
  try {
    await chrome.tabs.update(tabId, { active: true, url: 'https://x.com/i/bookmarks' });
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId) await chrome.windows.update(tab.windowId, { focused: true });
  } catch {
    const screen = await chrome.windows.getLastFocused();
    const win = await chrome.windows.create({
      url: 'https://x.com/i/bookmarks',
      width: 480, height: 600,
      left: (screen.left || 0) + (screen.width || 1200) - 500,
      top: screen.top || 0,
      type: 'normal',
    });
    const fallbackTab = win.tabs?.[0];
    if (!fallbackTab?.id) {
      handleBulkImportError('Could not open bookmarks window');
      return { error: 'Could not open bookmarks window' };
    }
    currentImport.tabId = fallbackTab.id;
  }

  await waitForTabLoad(currentImport.tabId);
  await new Promise((r) => setTimeout(r, 1000));

  chrome.tabs.sendMessage(currentImport.tabId, { type: 'START_BULK_IMPORT' }).catch(() => {});
  broadcastImportProgress();
  return { success: true };
}

async function handleBulkImportBatch(tweets: TweetData[]) {
  // Lazy-init the session for orchestrator-driven imports
  // (folder-walk-import.ts) that send batches directly without the
  // START_BULK_IMPORT bootstrap. tabId=-1 is a sentinel meaning "no
  // background-managed tab" — chrome.tabs.sendMessage on it will fail
  // silently via the existing .catch() guards on call sites.
  if (!currentImport) {
    currentImport = { tabId: -1, imported: 0, updated: 0, skipped: 0, errored: 0, limitReached: false };
  }
  // Capture reference — currentImport can be nulled by DONE/STOP during our awaits
  const session = currentImport;
  if (!session) return { error: 'No import session' };

  // The shared Zod schema marks most optional fields as `.optional()` (not
  // `.nullable()`), so we must OMIT keys when the value is missing rather
  // than passing `null`. Sending `null` triggers Invalid request errors and
  // the whole batch is rejected.
  const bookmarks = tweets.map((t) => {
    const row: Record<string, unknown> = {
      x_post_id: t.postId,
      x_author_handle: t.author,
      x_author_name: t.authorName,
      content_text: t.content,
      media_urls: t.mediaUrls,
      post_created_at: t.timestamp || new Date().toISOString(),
      bookmarked_at: new Date().toISOString(),
      possibly_sensitive: t.possiblySensitive ?? false,
      ingested_via: 'extension' as const,
    };
    if (t.avatarUrl) row.x_author_avatar_url = t.avatarUrl;
    if (t.language) row.language = t.language;
    if (t.engagement) row.engagement = t.engagement;
    if (t.conversationId) row.conversation_id = t.conversationId;
    if (t.inReplyToStatusId) row.in_reply_to_status_id = t.inReplyToStatusId;
    if (t.quotedStatusId) row.quoted_status_id = t.quotedStatusId;
    return row;
  });

  const result = await apiCall('/api/bookmarks/batch', {
    method: 'POST',
    body: JSON.stringify({ bookmarks }),
  });

  if (result.error) {
    // Stringify Zod issues so the runtime errors panel shows the failure
    // instead of `[object Object],[object Object],...` — that hid the
    // actual validation problem during the v0.4.x main-first roll-out.
    const detailsStr = Array.isArray(result.details)
      ? JSON.stringify(result.details).slice(0, 1500)
      : (result.details ?? '');
    const errorMsg = detailsStr ? `${result.error}: ${detailsStr}` : result.error;
    console.error('[BulkImport] Batch API error:', errorMsg, '\nFirst payload row:', JSON.stringify(bookmarks[0]));
    // Account the rejected batch so the overlay's accuracy invariant
    // (Found = Imported + Updated + Skipped + Errored + Queued) holds.
    session.errored += tweets.length;
    return { ...result, error: errorMsg, errored: tweets.length };
  }

  session.imported += result.imported || 0;
  session.updated += result.updated || 0;
  session.skipped += result.skipped || 0;
  session.limitReached = result.limitReached || false;

  // Update post ID cache (single read-write instead of N)
  await addBatchToPostIdCache(tweets.map((t) => t.postId));

  if (currentImport === session) {
    broadcastImportProgress();

    if (session.limitReached) {
      chrome.tabs.sendMessage(session.tabId, { type: 'STOP_BULK_IMPORT' }).catch(() => {});
    }
  }

  return { success: true, ...result };
}

function handleBulkImportDone() {
  if (!currentImport) return;
  const progress = {
    imported: currentImport.imported,
    updated: currentImport.updated,
    skipped: currentImport.skipped,
    errored: currentImport.errored,
    limitReached: currentImport.limitReached,
    done: true,
    error: null,
  };
  chrome.storage.local.set({ import_progress: progress });
  currentImport = null;
}

function handleBulkImportError(error: string) {
  const progress = {
    imported: currentImport?.imported || 0,
    updated: currentImport?.updated || 0,
    skipped: currentImport?.skipped || 0,
    errored: currentImport?.errored || 0,
    limitReached: false,
    done: true,
    error,
  };
  chrome.storage.local.set({ import_progress: progress });
  currentImport = null;
}

function broadcastImportProgress() {
  if (!currentImport) return;
  const progress = {
    imported: currentImport.imported,
    updated: currentImport.updated,
    skipped: currentImport.skipped,
    errored: currentImport.errored,
    limitReached: currentImport.limitReached,
    done: false,
    error: null,
  };
  chrome.storage.local.set({ import_progress: progress });
}

// ── Helpers for direct import integration ───────────────────

function getImportProgress() {
  return {
    imported: currentImport?.imported || 0,
    updated: currentImport?.updated || 0,
    skipped: currentImport?.skipped || 0,
    errored: currentImport?.errored || 0,
    limitReached: currentImport?.limitReached || false,
  };
}

async function fetchServerQueryId(): Promise<{ queryId: string; features: string } | null> {
  try {
    const result = await apiCall('/api/x-config');
    if (result.queryId) return { queryId: result.queryId, features: result.features || '' };
  } catch { /* best effort */ }
  return null;
}

// ── Message handlers ─────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[HelloAgain] Extension installed');
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      console.error('[HelloAgain] Message handler error:', err);
      sendResponse({ error: err?.message || 'Extension error', status: 500 });
    });
  return true; // async response
});

// Listen for messages from the web app (external messages)
chrome.runtime.onMessageExternal.addListener((message: ExternalMessage, sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN' && message.data) {
    setAuth(message.data as AuthData).then(() => {
      sendResponse({ success: true });
      if (sender.tab?.id) {
        chrome.tabs.remove(sender.tab.id);
      }
    });
    return true;
  }

  if (message.type === 'BOOKMARK_DELETED' && message.postId) {
    broadcastToXTabs({ type: 'BOOKMARK_DELETED', postId: message.postId });
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'START_BULK_IMPORT') {
    handleStartBulkImport().then(sendResponse);
    return true;
  }

  if (message.type === 'STOP_BULK_IMPORT') {
    if (currentImport) {
      chrome.tabs.sendMessage(currentImport.tabId, { type: 'STOP_BULK_IMPORT' }).catch(() => {});
      handleBulkImportDone();
    }
    sendResponse({ success: true });
    return true;
  }
});

async function handleMessage(message: ExtensionMessage) {
  switch (message.type) {
    case 'SAVE_BOOKMARK':
      return handleSaveBookmark(message.data);

    case 'DELETE_BOOKMARK':
      return handleDeleteBookmark(message.data);

    case 'GET_AUTH_STATUS':
      return getAuthStatus();

    case 'LOGIN': {
      const loginUrl = `${API_BASE}/login`;
      chrome.tabs.create({ url: loginUrl });
      return { success: true };
    }

    case 'LOGOUT':
      await clearAuth();
      await chrome.storage.local.remove('hal_post_ids');
      broadcastToXTabs({ type: 'HAL_LOGGED_OUT' });
      return { success: true };

    case 'SEARCH_BOOKMARKS':
      return handleSearch(message.query);

    case 'GET_BOOKMARKS':
      return handleGetBookmarks(message.params);

    case 'GET_TAGS':
      return apiCall('/api/tags');

    case 'GET_FOLDERS':
      return apiCall('/api/folders');

    case 'HAL_FOLDERS_IMPORT_X': {
      // Phase 3: forward the assembled { folders, assignments } payload to
      // the HAL backend with the user's auth token attached.
      const result = await apiCall('/api/folders/import-x', {
        method: 'POST',
        body: JSON.stringify(message.payload),
      });
      return { ok: !result?.error, ...result };
    }

    case 'GET_BOOKMARK_COUNT':
      return apiCall('/api/bookmarks/count');

    case 'GET_BOOKMARKED_POST_IDS':
      return apiCall('/api/bookmarks/post-ids');

    case 'START_BULK_IMPORT':
      return handleStartBulkImport();

    case 'BULK_IMPORT_BATCH':
      return handleBulkImportBatch(message.tweets);

    case 'BULK_IMPORT_DONE':
      handleBulkImportDone();
      return { success: true };

    case 'BULK_IMPORT_ERROR':
      handleBulkImportError(message.error);
      return { success: true };

    case 'BULK_IMPORT_STOP':
      if (currentImport) {
        chrome.tabs.sendMessage(currentImport.tabId, { type: 'STOP_BULK_IMPORT' }).catch(() => {});
        handleBulkImportDone();
      }
      return { success: true };

    case 'BULK_IMPORT_KEEPALIVE':
      return { type: 'BULK_IMPORT_ACK' };

    case 'GET_IMPORT_STATUS':
      return {
        running: !!currentImport,
        imported: currentImport?.imported || 0,
        skipped: currentImport?.skipped || 0,
        limitReached: currentImport?.limitReached || false,
      };

    case 'X_CREDENTIALS_CAPTURED':
      await storeXSession(message.credentials);
      // Also report query_id to server (Phase 5 — will add endpoint later)
      apiCall('/api/x-config', {
        method: 'POST',
        body: JSON.stringify({
          queryId: message.credentials.queryId,
          features: message.credentials.features,
        }),
      }).catch(() => {}); // Best-effort, don't block
      return { success: true };

    case 'X_BOOKMARKS_PAGE_RESULT':
      handleBookmarksPageResult(
        message.tweets || [],
        message.cursor || null,
        (message as unknown as { error?: string }).error || null,
      );
      return { success: true };

    case 'OPEN_IN_CURRENT_TAB': {
      const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'], populate: true });
      const activeTab = win?.tabs?.find(t => t.active);
      if (activeTab?.id !== undefined) {
        chrome.tabs.update(activeTab.id, { url: message.url });
      }
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

async function handleDeleteBookmark(data: { postId: string }) {
  const result = await apiCall(`/api/bookmarks?x_post_id=${encodeURIComponent(data.postId)}`, {
    method: 'DELETE',
  });
  if (!result.error) {
    await removeFromPostIdCache(data.postId);
    broadcastToXTabs({ type: 'BOOKMARK_DELETED', postId: data.postId });
  }
  return result;
}

async function addToPostIdCache(postId: string) {
  const result = await chrome.storage.local.get('hal_post_ids');
  const ids: string[] = result.hal_post_ids || [];
  if (!ids.includes(postId)) {
    await chrome.storage.local.set({ hal_post_ids: [...ids, postId] });
  }
}

async function addBatchToPostIdCache(postIds: string[]) {
  const result = await chrome.storage.local.get('hal_post_ids');
  const existing = new Set<string>(result.hal_post_ids || []);
  const newIds = postIds.filter((id) => !existing.has(id));
  if (newIds.length > 0) {
    await chrome.storage.local.set({ hal_post_ids: [...existing, ...newIds] });
  }
}

async function removeFromPostIdCache(postId: string) {
  const result = await chrome.storage.local.get('hal_post_ids');
  const ids: string[] = result.hal_post_ids || [];
  await chrome.storage.local.set({ hal_post_ids: ids.filter((id) => id !== postId) });
}

function broadcastToXTabs(message: TabMessage) {
  chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

async function handleSaveBookmark(data: { postId: string; author: string; authorName?: string; avatarUrl?: string; content: string; mediaUrls?: string; timestamp?: string }) {
  const result = await apiCall('/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify({
      x_post_id: data.postId,
      x_author_handle: data.author,
      x_author_name: data.authorName || '',
      x_author_avatar_url: data.avatarUrl || null,
      content_text: data.content,
      media_urls: data.mediaUrls ? JSON.parse(data.mediaUrls) : [],
      post_created_at: data.timestamp || new Date().toISOString(),
      bookmarked_at: new Date().toISOString(),
    }),
  });
  if (!result.error || result.status === 409) {
    await addToPostIdCache(data.postId);
  }
  return result;
}

async function getAuthStatus() {
  const auth = await getAuth();
  if (!auth) return { authenticated: false };
  return {
    authenticated: true,
    user: auth.user,
  };
}

async function handleSearch(query: string) {
  return apiCall(`/api/bookmarks/search?q=${encodeURIComponent(query)}`);
}

async function handleGetBookmarks(params?: Record<string, string>) {
  const qs = params
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return apiCall(`/api/bookmarks${qs}`);
}

// Open side panel on action click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
