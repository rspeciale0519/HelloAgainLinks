// HelloAgain — Service Worker (Background Script)

const API_BASE = 'https://helloagain-three.vercel.app';

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

  // Check if token is expired (with 5 min buffer)
  const now = Math.floor(Date.now() / 1000);
  if (auth.expires_at && auth.expires_at - now < 300) {
    // Try refresh
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
    } catch {
      // Refresh failed — return stale token and let API reject
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

// Listen for auth token from web app (external message)
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
});

async function handleMessage(message: Record<string, unknown>) {
  switch (message.type) {
    case 'SAVE_BOOKMARK':
      return handleSaveBookmark(message.data as Record<string, string>);

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
