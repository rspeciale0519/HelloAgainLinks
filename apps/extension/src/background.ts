// HelloAgain — Service Worker (Background Script)

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
    if (!res.ok) return { error: data.error || 'Request failed', status: res.status };
    return data;
  } catch (err) {
    console.error('[HelloAgain] API call failed:', path, err);
    return { error: 'Network error — check your connection', status: 0 };
  }
}

// ── Bulk import session ──────────────────────────────────────

interface ImportSession {
  tabId: number;
  imported: number;
  skipped: number;
  limitReached: boolean;
}

let currentImport: ImportSession | null = null;

interface TweetData {
  content: string;
  author: string;
  authorName: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
}

async function handleStartBulkImport() {
  // Open bookmarks in a separate window so the user can keep working
  // Chrome throttles/pauses JS in inactive tabs, so a dedicated window is required
  const tabs = await chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] });
  const existingTab = tabs.find((t) => t.url?.includes('/i/bookmarks'));

  let bookmarkTab: chrome.tabs.Tab;
  if (existingTab?.id && existingTab.windowId) {
    // Focus existing tab and its window
    await chrome.tabs.update(existingTab.id, { active: true, url: 'https://x.com/i/bookmarks' });
    await chrome.windows.update(existingTab.windowId, { focused: true });
    bookmarkTab = existingTab;
  } else {
    // Create a small window that can be tucked in a corner — must stay visible (not minimized)
    const screen = await chrome.windows.getLastFocused();
    const win = await chrome.windows.create({
      url: 'https://x.com/i/bookmarks',
      width: 480,
      height: 600,
      left: (screen.left || 0) + (screen.width || 1200) - 500,
      top: screen.top || 0,
      type: 'normal',
    });
    bookmarkTab = win.tabs?.[0] || {} as chrome.tabs.Tab;
  }

  if (!bookmarkTab.id) return { error: 'Could not open bookmarks window' };

  currentImport = {
    tabId: bookmarkTab.id,
    imported: 0,
    skipped: 0,
    limitReached: false,
  };

  // Wait for tab to finish loading, then tell content script to start
  const tabId = bookmarkTab.id;
  await waitForTabLoad(tabId);

  // Small delay for content script to initialize
  await new Promise((r) => setTimeout(r, 1000));

  chrome.tabs.sendMessage(tabId, { type: 'START_BULK_IMPORT' }).catch(() => {});
  broadcastImportProgress();

  return { success: true };
}

async function handleBulkImportBatch(tweets: TweetData[]) {
  // Capture reference — currentImport can be nulled by DONE/STOP during our awaits
  const session = currentImport;
  if (!session) return { error: 'No import session' };

  const bookmarks = tweets.map((t) => ({
    x_post_id: t.postId,
    x_author_handle: t.author,
    x_author_name: t.authorName,
    content_text: t.content,
    media_urls: t.mediaUrls,
    post_created_at: t.timestamp || new Date().toISOString(),
    bookmarked_at: new Date().toISOString(),
  }));

  const result = await apiCall('/api/bookmarks/batch', {
    method: 'POST',
    body: JSON.stringify({ bookmarks }),
  });

  if (result.error) {
    console.error('[BulkImport] Batch API error:', result);
    return result;
  }

  session.imported += result.imported || 0;
  session.skipped += result.skipped || 0;
  session.limitReached = result.limitReached || false;

  // Update post ID cache
  for (const t of tweets) {
    await addToPostIdCache(t.postId);
  }

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
    skipped: currentImport.skipped,
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
    skipped: currentImport?.skipped || 0,
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
    skipped: currentImport.skipped,
    limitReached: currentImport.limitReached,
    done: false,
    error: null,
  };
  chrome.storage.local.set({ import_progress: progress });
}

function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    function check(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(check);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(check);
    // Also check if already loaded
    chrome.tabs.get(tabId, (tab) => {
      if (tab.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(check);
        resolve();
      }
    });
  });
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
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === 'AUTH_TOKEN' && message.data) {
    setAuth(message.data).then(() => {
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

async function handleMessage(message: Record<string, unknown>) {
  switch (message.type) {
    case 'SAVE_BOOKMARK':
      return handleSaveBookmark(message.data as Record<string, string>);

    case 'DELETE_BOOKMARK':
      return handleDeleteBookmark(message.data as Record<string, string>);

    case 'GET_AUTH_STATUS':
      return getAuthStatus();

    case 'LOGIN': {
      const extensionId = chrome.runtime.id;
      const loginUrl = `${API_BASE}/login?extension_id=${extensionId}`;
      chrome.tabs.create({ url: loginUrl });
      return { success: true };
    }

    case 'LOGOUT':
      await clearAuth();
      await chrome.storage.local.remove('hal_post_ids');
      broadcastToXTabs({ type: 'HAL_LOGGED_OUT' });
      return { success: true };

    case 'SEARCH_BOOKMARKS':
      return handleSearch(message.query as string);

    case 'GET_BOOKMARKS':
      return handleGetBookmarks(message.params as Record<string, string> | undefined);

    case 'GET_TAGS':
      return apiCall('/api/tags');

    case 'GET_FOLDERS':
      return apiCall('/api/folders');

    case 'GET_BOOKMARK_COUNT':
      return apiCall('/api/bookmarks/count');

    case 'GET_BOOKMARKED_POST_IDS':
      return apiCall('/api/bookmarks/post-ids');

    case 'START_BULK_IMPORT':
      return handleStartBulkImport();

    case 'BULK_IMPORT_BATCH':
      return handleBulkImportBatch(message.tweets as TweetData[]);

    case 'BULK_IMPORT_DONE':
      handleBulkImportDone();
      return { success: true };

    case 'BULK_IMPORT_ERROR':
      handleBulkImportError(message.error as string);
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

    case 'OPEN_IN_CURRENT_TAB': {
      const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'], populate: true });
      const activeTab = win?.tabs?.find(t => t.active);
      if (activeTab?.id !== undefined) {
        chrome.tabs.update(activeTab.id, { url: message.url as string });
      }
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

async function handleDeleteBookmark(data: Record<string, string>) {
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

async function removeFromPostIdCache(postId: string) {
  const result = await chrome.storage.local.get('hal_post_ids');
  const ids: string[] = result.hal_post_ids || [];
  await chrome.storage.local.set({ hal_post_ids: ids.filter((id) => id !== postId) });
}

function broadcastToXTabs(message: Record<string, unknown>) {
  chrome.tabs.query({ url: ['https://x.com/*', 'https://twitter.com/*'] }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  });
}

async function handleSaveBookmark(data: Record<string, string>) {
  const result = await apiCall('/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify({
      x_post_id: data.postId,
      x_author_handle: data.author,
      x_author_name: data.authorName || '',
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
