// HelloAgain — MAIN World Fetch Interceptor for x.com.
// Runs in the page's MAIN world so it can patch fetch/XHR and capture
// session credentials. Relays intercepted data via window.postMessage.
// Self-contained — MAIN-world scripts can't import extension modules.

interface FolderContext {
  x_folder_id: string;
  folder_name: string | null;
}

interface TweetData {
  content: string;
  author: string;
  authorName: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
  folder_context?: FolderContext;
}

interface ParsedBookmarksPage {
  tweets: TweetData[];
  cursor: string | null;
  folderContext?: FolderContext;
}

const FOLDER_URL_PATTERN = /\/i\/bookmarks\/([^/?#]+)/;

// Phase 3: extract { x_folder_id, folder_name? } from a folder-scoped URL.
// folder_name is a defensive DOM scrape — TODO(user): validate selector.
function extractFolderContext(url: string): FolderContext | null {
  const match = url.match(FOLDER_URL_PATTERN);
  if (!match) return null;
  const folderId = decodeURIComponent(match[1] ?? '');
  if (!folderId) return null;
  let folderName: string | null = null;
  try {
    const el =
      document.querySelector('[data-testid="primaryColumn"] h2[role="heading"] span') ||
      document.querySelector('[data-testid="primaryColumn"] h2 span') ||
      document.querySelector('header h2 span');
    const txt = el?.textContent?.trim();
    if (txt && txt.length > 0 && txt.length <= 200) folderName = txt;
  } catch { /* ignore */ }
  return { x_folder_id: folderId, folder_name: folderName };
}

interface CapturedCredentials {
  bearerToken: string;
  csrfToken: string;
  queryId: string;
  features: string;
  capturedAt: number;
}

// Matches both `/Bookmarks` (root) and `/BookmarkFolderTimeline` (folder-scoped)
// GraphQL operations. The first capture group is the queryId.
const BOOKMARKS_PATTERN = /\/i\/api\/graphql\/([^/]+)\/(Bookmarks|BookmarkFolderTimeline)/;
// Phase 3: separate operation that returns the user's bookmark folders.
// Operation name varies across X clients; we match on the path suffix only.
// TODO(user): validate the operation name against your live X session.
const FOLDERS_LIST_PATTERN = /\/i\/api\/graphql\/[^/]+\/BookmarkFoldersSlice/;

// ── Inline GraphQL parser ────────────────────────────────────

function parseXTimestamp(raw: string): string {
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toISOString();
  } catch {
    return '';
  }
}

function extractTweetFromResult(result: Record<string, unknown>): TweetData | null {
  if (!result) return null;

  let tweet = result;
  if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
    tweet = result.tweet as Record<string, unknown>;
  }
  if (tweet.__typename !== 'Tweet') return null;

  const postId = (tweet.rest_id as string) || '';
  if (!postId) return null;

  const core = tweet.core as Record<string, unknown> | undefined;
  const userResults = core?.user_results as Record<string, unknown> | undefined;
  const userResult = userResults?.result as Record<string, unknown> | undefined;
  // X moved screen_name/name from user.legacy to user.core — check both
  const userCore = userResult?.core as Record<string, unknown> | undefined;
  const userLegacy = userResult?.legacy as Record<string, unknown> | undefined;
  const author = (userCore?.screen_name as string) || (userLegacy?.screen_name as string) || '';
  const authorName = (userCore?.name as string) || (userLegacy?.name as string) || '';

  const legacy = tweet.legacy as Record<string, unknown> | undefined;
  const content = (legacy?.full_text as string) || '';
  const rawTimestamp = (legacy?.created_at as string) || '';
  const timestamp = parseXTimestamp(rawTimestamp);

  const entities = legacy?.entities as Record<string, unknown> | undefined;
  const mediaArray = (entities?.media as Array<Record<string, unknown>>) || [];
  const mediaUrls = mediaArray
    .map((m) => (m.media_url_https as string) || '')
    .filter(Boolean);

  return { content, author, authorName, postId, timestamp, mediaUrls };
}

function parseBookmarksResponse(json: unknown): ParsedBookmarksPage {
  const empty: ParsedBookmarksPage = { tweets: [], cursor: null };
  if (!json || typeof json !== 'object') return empty;

  const data = (json as Record<string, unknown>).data as Record<string, unknown> | undefined;
  if (!data) return empty;

  // Phase 3: support both Bookmarks (root) and BookmarkFolderTimeline (folder-scoped)
  // operations. They share the same nested timeline shape.
  const timelineRoot =
    (data.bookmark_timeline_v2 as Record<string, unknown> | undefined) ??
    (data.bookmark_collection_timeline_v2 as Record<string, unknown> | undefined);
  if (!timelineRoot) return empty;

  const timeline = timelineRoot.timeline as Record<string, unknown> | undefined;
  if (!timeline) return empty;

  const instructions = timeline.instructions as Array<Record<string, unknown>> | undefined;
  if (!instructions?.length) return empty;

  const tweets: TweetData[] = [];
  let cursor: string | null = null;

  for (const instruction of instructions) {
    const type = instruction.type as string;
    if (type !== 'TimelineAddEntries') continue;

    const entries = instruction.entries as Array<Record<string, unknown>> | undefined;
    if (!entries) continue;

    for (const entry of entries) {
      const entryId = (entry.entryId as string) || '';
      const entryContent = entry.content as Record<string, unknown> | undefined;
      if (!entryContent) continue;

      if (entryId.startsWith('cursor-bottom-')) {
        cursor = (entryContent.value as string) || null;
        continue;
      }

      const itemContent = entryContent.itemContent as Record<string, unknown> | undefined;
      if (!itemContent) continue;

      const tweetResults = itemContent.tweet_results as Record<string, unknown> | undefined;
      if (!tweetResults) continue;

      const result = tweetResults.result as Record<string, unknown> | undefined;
      if (!result) continue;

      const tweet = extractTweetFromResult(result);
      if (tweet) tweets.push(tweet);
    }
  }

  return { tweets, cursor };
}

// ── Credential extraction from request ───────────────────────

function extractCredentials(url: string, init?: RequestInit): CapturedCredentials | null {
  const match = url.match(BOOKMARKS_PATTERN);
  if (!match) return null;

  const queryId = match[1];
  const headers = init?.headers;
  if (!headers) return null;

  let bearerToken = '';
  let csrfToken = '';

  if (headers instanceof Headers) {
    bearerToken = headers.get('authorization') || '';
    csrfToken = headers.get('x-csrf-token') || '';
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      if (key.toLowerCase() === 'authorization') bearerToken = value;
      if (key.toLowerCase() === 'x-csrf-token') csrfToken = value;
    }
  } else {
    bearerToken = (headers as Record<string, string>)['authorization'] || '';
    csrfToken = (headers as Record<string, string>)['x-csrf-token'] || '';
  }

  // Extract features from URL query params
  const urlObj = new URL(url, window.location.origin);
  const variables = urlObj.searchParams.get('variables') || '';
  const features = urlObj.searchParams.get('features') || '';

  if (!bearerToken || !csrfToken || !queryId) return null;

  return {
    bearerToken,
    csrfToken,
    queryId,
    features,
    capturedAt: Date.now(),
  };
}

// ── Stored credentials (for Phase 2 relay requests) ──────────

let storedCredentials: CapturedCredentials | null = null;

// Save original fetch for Phase 2 relay (our own direct API calls use fetch)
const originalFetch = window.fetch.bind(window);

// ── Monkey-patch XMLHttpRequest ─────────────────────────────
// X.com uses XHR (not fetch) for GraphQL calls. We intercept
// open() to capture the URL + headers and onload to read the response.

const origXhrOpen = XMLHttpRequest.prototype.open;
const origXhrSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
const origXhrSend = XMLHttpRequest.prototype.send;

interface XhrMeta {
  url: string;
  headers: Record<string, string>;
}

const xhrMetaMap = new WeakMap<XMLHttpRequest, XhrMeta>();

XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
  const urlStr = typeof url === 'string' ? url : url.href;
  if (BOOKMARKS_PATTERN.test(urlStr)) {
    xhrMetaMap.set(this, { url: urlStr, headers: {} });
  } else if (FOLDERS_LIST_PATTERN.test(urlStr)) {
    // Phase 3: piggyback the folder-list response back to the orchestrator.
    this.addEventListener('load', () => {
      try {
        const json = JSON.parse((this as XMLHttpRequest).responseText);
        const folders = parseFoldersListResponse(json);
        if (folders.length > 0) {
          window.postMessage({
            source: 'hal-x-interceptor',
            type: 'X_INTERCEPT_FOLDERS_LIST',
            folders,
          }, '*');
        }
      } catch {
        // ignore — folder-walk falls back to DOM scrape if needed
      }
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return origXhrOpen.call(this, method, urlStr, ...(rest as [any, any, any]));
};

interface XFolderEntry { x_folder_id: string; folder_name: string }

// Phase 3: defensive parser for X's folder-list GraphQL responses.
// X's exact shape varies; we walk the tree and extract any object with
// { rest_id|id, name }. TODO(user): tighten after observing live shape.
function parseFoldersListResponse(json: unknown): XFolderEntry[] {
  const out: XFolderEntry[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const c of node) walk(c); return; }
    const obj = node as Record<string, unknown>;
    const id = (obj.rest_id as string) || (obj.id as string) || (obj.fldid as string) || '';
    const name = (obj.name as string) || (obj.folder_name as string) || '';
    if (typeof id === 'string' && typeof name === 'string' && id && name) {
      out.push({ x_folder_id: id, folder_name: name });
    }
    for (const k of Object.keys(obj)) if (k !== '__typename') walk(obj[k]);
  }
  walk(json);
  const seen = new Set<string>();
  return out.filter((f) => (seen.has(f.x_folder_id) ? false : (seen.add(f.x_folder_id), true)));
}

XMLHttpRequest.prototype.setRequestHeader = function (name: string, value: string) {
  const meta = xhrMetaMap.get(this);
  if (meta) {
    meta.headers[name.toLowerCase()] = value;
  }
  return origXhrSetRequestHeader.call(this, name, value);
};

XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
  const meta = xhrMetaMap.get(this);
  if (meta) {
    // Extract credentials from captured headers
    const match = meta.url.match(BOOKMARKS_PATTERN);
    const queryId = match ? match[1] : '';
    const bearerToken = meta.headers['authorization'] || '';
    const csrfToken = meta.headers['x-csrf-token'] || '';

    const urlObj = new URL(meta.url, window.location.origin);
    const features = urlObj.searchParams.get('features') || '';

    if (bearerToken && csrfToken && queryId) {
      const creds: CapturedCredentials = {
        bearerToken, csrfToken, queryId, features, capturedAt: Date.now(),
      };
      storedCredentials = creds;
      window.postMessage({
        source: 'hal-x-interceptor',
        type: 'X_CREDENTIALS_CAPTURED',
        credentials: creds,
      }, '*');
    }

    // Listen for the response
    const requestUrl = meta.url;
    this.addEventListener('load', function () {
      try {
        const json = JSON.parse(this.responseText);
        const parsed = parseBookmarksResponse(json);
        if (parsed.tweets.length > 0) {
          // Phase 3: when the request was to the folder-scoped operation,
          // tag every tweet with the folder context so the orchestrator
          // can build the bookmark→folder assignment list.
          const folderCtx = extractFolderContext(requestUrl) ?? extractFolderContext(window.location.href);
          const tweetsWithCtx = folderCtx
            ? parsed.tweets.map((t) => ({ ...t, folder_context: folderCtx }))
            : parsed.tweets;
          window.postMessage({
            source: 'hal-x-interceptor',
            type: 'X_INTERCEPT_BOOKMARKS',
            tweets: tweetsWithCtx,
            cursor: parsed.cursor,
            folderContext: folderCtx ?? null,
          }, '*');
        }
      } catch {
        // Response parsing failed — don't break X's page
      }
    });
  }

  return origXhrSend.call(this, body);
};

// ── Phase 2: Handle relay requests from content script ───────
// Background → content.ts → window.postMessage → here
// We make the actual fetch (with cookies) and post the result back

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'hal-content') return;

  if (event.data.type === 'FETCH_BOOKMARKS_PAGE') {
    const cursor: string | null = event.data.cursor || null;
    await fetchBookmarksPage(cursor);
  }
});

function postPageResult(
  tweets: TweetData[],
  cursor: string | null,
  error: string | null,
  folderContext?: FolderContext | null,
): void {
  window.postMessage({
    source: 'hal-x-interceptor',
    type: 'X_BOOKMARKS_PAGE_RESULT',
    tweets, cursor, error,
    folderContext: folderContext ?? null,
  }, '*');
}

async function fetchBookmarksPage(cursor: string | null): Promise<void> {
  if (!storedCredentials) { postPageResult([], null, 'No credentials available'); return; }

  const { bearerToken, csrfToken, queryId, features } = storedCredentials;
  const variables: Record<string, unknown> = { count: 100 };
  if (cursor) variables.cursor = cursor;
  const params = new URLSearchParams({ variables: JSON.stringify(variables), features });
  const url = `https://x.com/i/api/graphql/${queryId}/Bookmarks?${params.toString()}`;

  try {
    const response = await originalFetch(url, {
      method: 'GET', credentials: 'include',
      headers: {
        'authorization': bearerToken, 'x-csrf-token': csrfToken,
        'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session',
        'x-twitter-client-language': 'en', 'content-type': 'application/json',
      },
    });

    if (response.status === 429) { postPageResult([], null, 'rate_limited'); return; }
    if (response.status === 401 || response.status === 403) {
      postPageResult([], null, 'auth_expired'); return;
    }
    if (!response.ok) { postPageResult([], null, `HTTP ${response.status}`); return; }

    const json = await response.json();
    const parsed = parseBookmarksResponse(json);
    // Phase 3: attach folder context if the URL is folder-scoped.
    const folderCtx = extractFolderContext(url) ?? extractFolderContext(window.location.href);
    const tweetsWithCtx = folderCtx
      ? parsed.tweets.map((t) => ({ ...t, folder_context: folderCtx }))
      : parsed.tweets;
    postPageResult(tweetsWithCtx, parsed.cursor, null, folderCtx);
  } catch (err) {
    postPageResult([], null, (err as Error).message || 'Fetch failed');
  }
}
