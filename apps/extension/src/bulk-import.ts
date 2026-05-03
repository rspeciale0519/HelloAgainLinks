// HelloAgain — Bulk Import: Auto-scroll scraper for x.com/i/bookmarks

import { extractTweetData, type TweetData } from './tweet-utils';

// 100 matches the server-side `batchImportSchema.max(100)` cap. Larger
// batches cut API roundtrips 4× vs the historical 25, which matters when
// a heavy X account has thousands of bookmarks to drain.
const BATCH_SIZE = 100;
const SCROLL_PX = 800;
const SCROLL_WAIT_MS = 1500;
const MAX_EMPTY_SCROLLS = 3;
const KEEPALIVE_INTERVAL_MS = 20000;

export interface BatchResult {
  imported?: number;
  skipped?: number;
}

export interface BulkImportCallbacks {
  onBatch: (tweets: TweetData[]) => Promise<BatchResult>;
  onDone: () => void;
  onError: (message: string) => void;
}

let aborted = false;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

// ── Progress overlay ─────────────────────────────────────────

function createEl(tag: string, styles: Record<string, string>, text?: string): HTMLElement {
  const el = document.createElement(tag);
  Object.assign(el.style, styles);
  if (text) el.textContent = text;
  return el;
}

function injectOverlay(): HTMLDivElement {
  removeOverlay();
  const overlay = document.createElement('div') as HTMLDivElement;
  overlay.id = 'hal-bulk-import-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '16px',
    right: '16px',
    width: '320px',
    padding: '20px',
    borderRadius: '16px',
    background: 'rgba(10,10,15,0.95)',
    border: '1px solid rgba(0,212,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    zIndex: '999999',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#f0f0f5',
  });

  // Header row
  const header = createEl('div', { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' });
  const logo = createEl('div', {
    width: '28px', height: '28px', borderRadius: '8px',
    background: 'linear-gradient(135deg,#00d4ff,#0ea5e9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: '700', color: '#0a0a0f',
  }, 'H');
  const title = createEl('div', { fontSize: '14px', fontWeight: '600' }, 'Importing Bookmarks');
  header.appendChild(logo);
  header.appendChild(title);
  overlay.appendChild(header);

  // Status area
  const status = createEl('div', { fontSize: '13px', color: '#8a8a9a', lineHeight: '1.6' }, 'Scanning bookmarks...');
  status.id = 'hal-import-status';
  overlay.appendChild(status);

  // Keep-visible notice
  const notice = createEl('div', {
    fontSize: '11px', color: '#f59e0b', marginTop: '10px', lineHeight: '1.4',
  }, 'Do not minimize this window. You can resize it and work in other windows.');
  overlay.appendChild(notice);

  // Stop button
  const btnRow = createEl('div', { marginTop: '10px', display: 'flex', gap: '8px' });
  const stopBtn = createEl('button', {
    flex: '1', padding: '8px 16px', borderRadius: '10px',
    border: '1px solid rgba(239,68,68,0.3)', background: 'transparent',
    color: '#ef4444', fontSize: '13px', fontWeight: '600',
    cursor: 'pointer', fontFamily: 'inherit',
  }, 'Stop') as HTMLButtonElement;
  stopBtn.id = 'hal-import-stop';
  stopBtn.addEventListener('click', () => stopBulkImport());
  btnRow.appendChild(stopBtn);
  overlay.appendChild(btnRow);

  document.body.appendChild(overlay);
  return overlay;
}

function updateOverlay(found: number, sent: number, skipped: number, done = false) {
  const status = document.getElementById('hal-import-status');
  if (!status) return;
  status.textContent = '';

  if (done) {
    status.appendChild(createEl('div', { marginBottom: '6px' }, 'Scan complete!'));
  }

  const line1 = createEl('div', { marginBottom: '6px' });
  line1.appendChild(document.createTextNode('Found: '));
  line1.appendChild(createEl('span', { color: '#00d4ff', fontWeight: '600' }, String(found)));
  line1.appendChild(document.createTextNode(' bookmarks'));
  status.appendChild(line1);

  const line2 = createEl('div', {});
  line2.appendChild(document.createTextNode('Imported: '));
  line2.appendChild(createEl('span', { color: '#00d4ff', fontWeight: '600' }, String(sent)));
  status.appendChild(line2);

  if (skipped > 0) {
    const line3 = createEl('div', { marginTop: '2px' });
    line3.appendChild(document.createTextNode('Skipped: '));
    line3.appendChild(createEl('span', { color: '#f59e0b', fontWeight: '600' }, String(skipped)));
    line3.appendChild(document.createTextNode(' duplicates'));
    status.appendChild(line3);
  }

  if (!done) {
    status.appendChild(createEl('div', { marginTop: '8px', fontSize: '11px', color: '#4a4a5a' }, 'Auto-scrolling page...'));
  }

  if (done) {
    const stopBtn = document.getElementById('hal-import-stop');
    if (stopBtn) {
      stopBtn.textContent = 'Close';
      (stopBtn as HTMLElement).style.borderColor = 'rgba(0,212,255,0.3)';
      (stopBtn as HTMLElement).style.color = '#00d4ff';
    }
  }
}

function showOverlayError(message: string) {
  const status = document.getElementById('hal-import-status');
  if (status) {
    status.textContent = '';
    status.appendChild(createEl('div', { color: '#ef4444' }, message));
  }
}

function removeOverlay() {
  document.getElementById('hal-bulk-import-overlay')?.remove();
}

// ── Auto-scroll + scrape loop ────────────────────────────────

export function startBulkImport(callbacks: BulkImportCallbacks) {
  if (!window.location.href.includes('/i/bookmarks')) {
    callbacks.onError('Navigate to x.com/i/bookmarks first');
    return;
  }

  aborted = false;
  injectOverlay();

  // Keep MV3 service worker alive
  keepaliveTimer = setInterval(() => {
    try {
      chrome.runtime.sendMessage({ type: 'BULK_IMPORT_KEEPALIVE' }, () => {
        void chrome.runtime.lastError;
      });
    } catch { /* ignore */ }
  }, KEEPALIVE_INTERVAL_MS);

  const buffer: TweetData[] = [];
  let totalFound = 0;
  let totalImported = 0;
  let totalSkipped = 0;
  let emptyScrolls = 0;

  async function waitForVisible(): Promise<void> {
    if (document.visibilityState === 'visible') return;
    const notice = document.getElementById('hal-import-status');
    if (notice) {
      notice.textContent = '';
      notice.appendChild(createEl('div', { color: '#f59e0b', fontWeight: '600' }, 'Paused — window is hidden'));
      notice.appendChild(createEl('div', { fontSize: '11px', color: '#8a8a9a', marginTop: '4px' },
        'Restore this window to resume importing.'));
    }
    return new Promise((resolve) => {
      function onVisible() {
        if (document.visibilityState === 'visible') {
          document.removeEventListener('visibilitychange', onVisible);
          resolve();
        }
      }
      document.addEventListener('visibilitychange', onVisible);
    });
  }

  async function scrollLoop() {
    if (aborted) {
      cleanup();
      return;
    }

    // Pause if window is minimized or hidden
    await waitForVisible();
    if (aborted) { cleanup(); return; }

    // Scrape unprocessed articles
    const articles = document.querySelectorAll(
      'article[data-testid="tweet"]:not([data-hal-scraped])'
    );

    let newThisCycle = 0;
    articles.forEach((article) => {
      article.setAttribute('data-hal-scraped', 'true');
      const data = extractTweetData(article);
      if (data.postId) {
        buffer.push(data);
        totalFound++;
        newThisCycle++;
      }
    });

    // Flush buffer when it reaches batch size
    while (buffer.length >= BATCH_SIZE) {
      const batch = buffer.splice(0, BATCH_SIZE);
      updateOverlay(totalFound, totalImported, totalSkipped);
      const result = await callbacks.onBatch(batch);
      totalImported += result.imported || 0;
      totalSkipped += result.skipped || 0;
      updateOverlay(totalFound, totalImported, totalSkipped);
    }

    updateOverlay(totalFound, totalImported, totalSkipped);

    // Track empty scrolls for end-of-list detection
    if (newThisCycle === 0) {
      emptyScrolls++;
    } else {
      emptyScrolls = 0;
    }

    if (emptyScrolls >= MAX_EMPTY_SCROLLS) {
      // Flush remaining buffer
      if (buffer.length > 0) {
        const result = await callbacks.onBatch(buffer.splice(0));
        totalImported += result.imported || 0;
        totalSkipped += result.skipped || 0;
      }
      updateOverlay(totalFound, totalImported, totalSkipped, true);
      callbacks.onDone();
      cleanupTimers();
      return;
    }

    // Scroll down and wait for new content
    window.scrollBy(0, SCROLL_PX);
    await sleep(SCROLL_WAIT_MS);

    // Continue loop
    scrollLoop();
  }

  scrollLoop();
}

export function stopBulkImport() {
  aborted = true;
  cleanup();
}

function cleanup() {
  cleanupTimers();
  removeOverlay();
  document.querySelectorAll('[data-hal-scraped]').forEach((el) => {
    el.removeAttribute('data-hal-scraped');
  });
}

function cleanupTimers() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Scroll + Intercept mode (Strategy C) ────────────────────
// Same auto-scroll approach but reads intercepted GraphQL data from the MAIN world
// interceptor instead of scraping the DOM. Much faster scroll wait (400ms vs 1500ms)
// because we don't need to wait for React to render.

const INTERCEPT_SCROLL_WAIT_MS = 400;

let interceptBuffer: TweetData[] = [];
let interceptListener: ((event: MessageEvent) => void) | null = null;
// Dedup set scoped to the lifetime of one import session. The MAIN-world
// interceptor pushes BOTH to a window cache (for late-attaching listeners)
// AND to a postMessage event, so it's normal for the same tweet to land in
// both channels — we de-dupe by postId here so the loop doesn't loop
// forever on phantom "new" data.
let seenPostIds = new Set<string>();

function pushUniqueToBuffer(tweets: TweetData[]) {
  for (const t of tweets) {
    if (!t.postId || seenPostIds.has(t.postId)) continue;
    seenPostIds.add(t.postId);
    interceptBuffer.push(t);
  }
}

function setupInterceptListener() {
  interceptBuffer = [];
  seenPostIds = new Set<string>();
  // Drain anything the MAIN-world interceptor cached before our listener
  // attached (e.g. the page's initial Bookmarks GraphQL response that
  // fires before the content script runs).
  const cache = (window as unknown as { __halXBookmarksBuffer?: TweetData[] }).__halXBookmarksBuffer;
  if (Array.isArray(cache) && cache.length > 0) {
    pushUniqueToBuffer(cache);
    cache.length = 0;
  }
  interceptListener = (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.data?.source !== 'hal-x-interceptor') return;
    if (event.data.type !== 'X_INTERCEPT_BOOKMARKS') return;

    pushUniqueToBuffer(event.data.tweets || []);
    // Also drain anything the interceptor wrote to the cache between
    // events, then clear so the cache and the live stream don't diverge.
    const c = (window as unknown as { __halXBookmarksBuffer?: TweetData[] }).__halXBookmarksBuffer;
    if (Array.isArray(c) && c.length > 0) {
      pushUniqueToBuffer(c);
      c.length = 0;
    }
  };
  window.addEventListener('message', interceptListener);
}

function teardownInterceptListener() {
  if (interceptListener) {
    window.removeEventListener('message', interceptListener);
    interceptListener = null;
  }
  interceptBuffer = [];
  seenPostIds = new Set<string>();
}

export function startScrollInterceptImport(callbacks: BulkImportCallbacks) {
  if (!window.location.href.includes('/i/bookmarks')) {
    callbacks.onError('Navigate to x.com/i/bookmarks first');
    return;
  }

  aborted = false;
  injectOverlay();
  setupInterceptListener();

  keepaliveTimer = setInterval(() => {
    try {
      chrome.runtime.sendMessage({ type: 'BULK_IMPORT_KEEPALIVE' }, () => {
        void chrome.runtime.lastError;
      });
    } catch { /* ignore */ }
  }, KEEPALIVE_INTERVAL_MS);

  let totalImported = 0;
  let totalSkipped = 0;
  let emptyScrolls = 0;
  // `seenPostIds.size` is the source of truth for unique tweets we've
  // observed; tracking the previous value lets us compute "new this
  // cycle" without re-counting leftover tweets that get unshifted back
  // into interceptBuffer when a partial batch (< BATCH_SIZE) is left.
  // The previous implementation incremented totalFound by
  // newTweets.length on every drain, which double-counted leftovers and
  // also kept resetting emptyScrolls so the loop never terminated.
  let lastSeenSize = seenPostIds.size;
  // Track if we ever received intercepted data — if not after a few scrolls, signal failure
  let receivedInterceptedData = false;

  async function scrollLoop() {
    if (aborted) { cleanup(); teardownInterceptListener(); return; }

    // Drain the intercept buffer
    const newTweets = interceptBuffer.splice(0);
    const totalFound = seenPostIds.size;
    const newThisCycle = totalFound - lastSeenSize;
    lastSeenSize = totalFound;

    if (newThisCycle > 0) {
      receivedInterceptedData = true;
    }

    // Flush in batches
    while (newTweets.length >= BATCH_SIZE) {
      const batch = newTweets.splice(0, BATCH_SIZE);
      updateOverlay(totalFound, totalImported, totalSkipped);
      const result = await callbacks.onBatch(batch);
      totalImported += result.imported || 0;
      totalSkipped += result.skipped || 0;
    }

    // Remaining tweets stay for next flush
    if (newTweets.length > 0) {
      interceptBuffer.unshift(...newTweets);
    }

    updateOverlay(totalFound, totalImported, totalSkipped);

    if (newThisCycle === 0) {
      emptyScrolls++;
    } else {
      emptyScrolls = 0;
    }

    // If we haven't received any intercepted data after 5 scrolls, signal error
    // so the orchestrator can fall back to DOM scraping
    if (!receivedInterceptedData && emptyScrolls >= 5) {
      teardownInterceptListener();
      cleanup();
      callbacks.onError('intercept_failed');
      return;
    }

    if (emptyScrolls >= MAX_EMPTY_SCROLLS && receivedInterceptedData) {
      // Flush remaining buffer (whatever was below BATCH_SIZE last cycle)
      const remaining = interceptBuffer.splice(0);
      if (remaining.length > 0) {
        const result = await callbacks.onBatch(remaining);
        totalImported += result.imported || 0;
        totalSkipped += result.skipped || 0;
      }
      updateOverlay(seenPostIds.size, totalImported, totalSkipped, true);
      teardownInterceptListener();
      callbacks.onDone();
      cleanupTimers();
      return;
    }

    window.scrollBy(0, SCROLL_PX);
    await sleep(INTERCEPT_SCROLL_WAIT_MS);
    scrollLoop();
  }

  scrollLoop();
}
