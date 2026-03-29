export interface TweetData {
  content: string;
  author: string;
  authorName: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
}

// Messages sent TO the background script (from popup, sidepanel, content)
export type ExtensionMessage =
  | { type: 'SAVE_BOOKMARK'; data: { postId: string; author: string; authorName?: string; content: string; mediaUrls?: string; timestamp?: string } }
  | { type: 'DELETE_BOOKMARK'; data: { postId: string } }
  | { type: 'GET_AUTH_STATUS' }
  | { type: 'LOGIN' }
  | { type: 'LOGOUT' }
  | { type: 'SEARCH_BOOKMARKS'; query: string }
  | { type: 'GET_BOOKMARKS'; params?: Record<string, string> }
  | { type: 'GET_TAGS' }
  | { type: 'GET_FOLDERS' }
  | { type: 'GET_BOOKMARK_COUNT' }
  | { type: 'GET_BOOKMARKED_POST_IDS' }
  | { type: 'START_BULK_IMPORT' }
  | { type: 'BULK_IMPORT_BATCH'; tweets: TweetData[] }
  | { type: 'BULK_IMPORT_DONE' }
  | { type: 'BULK_IMPORT_ERROR'; error: string }
  | { type: 'BULK_IMPORT_STOP' }
  | { type: 'BULK_IMPORT_KEEPALIVE' }
  | { type: 'GET_IMPORT_STATUS' }
  | { type: 'OPEN_IN_CURRENT_TAB'; url: string };

// Messages sent FROM the background script (to content scripts / tabs)
export type TabMessage =
  | { type: 'START_BULK_IMPORT' }
  | { type: 'STOP_BULK_IMPORT' }
  | { type: 'BOOKMARK_DELETED'; postId: string }
  | { type: 'HAL_LOGGED_OUT' };

// Messages sent from the web app (via chrome.runtime.sendMessage with extension ID)
export type ExternalMessage =
  | { type: 'AUTH_TOKEN'; data: unknown }
  | { type: 'BOOKMARK_DELETED'; postId: string }
  | { type: 'START_BULK_IMPORT' }
  | { type: 'STOP_BULK_IMPORT' };
