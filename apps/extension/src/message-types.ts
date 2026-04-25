export interface FolderContext {
  /** X.com's folder id from the /i/bookmarks/:folderId URL. */
  x_folder_id: string;
  /**
   * Best-effort folder name (DOM scrape from X's page header). Null when
   * we couldn't read it, in which case the HAL backend will fall back to
   * the folder id while showing the folder in the sidebar.
   */
  folder_name: string | null;
}

export interface TweetData {
  content: string;
  author: string;
  authorName: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
  avatarUrl?: string;
  language?: string;
  engagement?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
    bookmark_count?: number;
    view_count?: number;
  };
  conversationId?: string;
  inReplyToStatusId?: string;
  quotedStatusId?: string;
  possiblySensitive?: boolean;
  /** Phase 3: folder this tweet was scraped from (only present during folder-walk import). */
  folder_context?: FolderContext;
}

// X.com session credentials captured by the MAIN world interceptor
export interface XSessionCredentials {
  bearerToken: string;   // X's public app bearer token
  csrfToken: string;     // ct0 cookie value (from x-csrf-token header)
  queryId: string;       // Current Bookmarks GraphQL query_id
  features: string;      // Feature flags JSON string
  capturedAt: number;    // Timestamp for staleness checks
}

// Import strategy phases for UI display
export type ImportPhase =
  | 'connecting'
  | 'direct_api'
  | 'credential_capture'
  | 'scroll_intercept'
  | 'dom_scrape'
  | 'done'
  | 'error';

// Import strategy labels for UI
export type ImportStrategy = 'Direct API' | 'Fast scan' | 'Standard scan';

// Extended progress state broadcasted via chrome.storage.local
export interface ImportProgress {
  imported: number;
  skipped: number;
  limitReached: boolean;
  done: boolean;
  error: string | null;
  phase: ImportPhase;
  phaseMessage: string;
  startedAt: number;
  strategy: ImportStrategy | null;
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
  | { type: 'OPEN_IN_CURRENT_TAB'; url: string }
  // New: MAIN world interceptor messages (relayed by content script)
  | { type: 'X_CREDENTIALS_CAPTURED'; credentials: XSessionCredentials }
  | { type: 'X_BOOKMARKS_PAGE_RESULT'; tweets: TweetData[]; cursor: string | null };

// Messages sent FROM the background script (to content scripts / tabs)
export type TabMessage =
  | { type: 'START_BULK_IMPORT' }
  | { type: 'STOP_BULK_IMPORT' }
  | { type: 'BOOKMARK_DELETED'; postId: string }
  | { type: 'HAL_LOGGED_OUT' }
  // New: Direct API relay (background → content → MAIN world)
  | { type: 'FETCH_BOOKMARKS_PAGE'; cursor: string | null }
  | { type: 'START_SCROLL_INTERCEPT_IMPORT' };

// Messages sent from the web app (via chrome.runtime.sendMessage with extension ID)
export type ExternalMessage =
  | { type: 'AUTH_TOKEN'; data: unknown }
  | { type: 'BOOKMARK_DELETED'; postId: string }
  | { type: 'START_BULK_IMPORT' }
  | { type: 'STOP_BULK_IMPORT' };
