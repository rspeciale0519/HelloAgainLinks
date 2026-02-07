// HelloAgain — Service Worker (Background Script)

chrome.runtime.onInstalled.addListener(() => {
  console.log('[HelloAgain] Extension installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SAVE_BOOKMARK':
      handleSaveBookmark(message.data).then(sendResponse);
      return true; // async response

    case 'GET_AUTH_STATUS':
      getAuthStatus().then(sendResponse);
      return true;

    case 'SEARCH_BOOKMARKS':
      handleSearch(message.query).then(sendResponse);
      return true;

    default:
      console.log('[HelloAgain] Unknown message type:', message.type);
  }
});

async function handleSaveBookmark(data: { postId: string; content: string; author: string }) {
  try {
    const token = await chrome.storage.local.get('auth_token');
    if (!token.auth_token) {
      return { success: false, error: 'Not authenticated' };
    }
    // TODO: Send to API
    console.log('[HelloAgain] Saving bookmark:', data);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function getAuthStatus() {
  const result = await chrome.storage.local.get('auth_token');
  return { authenticated: !!result.auth_token };
}

async function handleSearch(query: string) {
  // TODO: Implement search via API
  console.log('[HelloAgain] Searching:', query);
  return { results: [] };
}

// Open side panel on action click
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
