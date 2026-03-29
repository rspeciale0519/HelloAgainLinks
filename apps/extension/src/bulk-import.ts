// HelloAgain — Bulk Import: Auto-scroll scraper for x.com/i/bookmarks

import { extractTweetData, type TweetData } from './tweet-utils';

const BATCH_SIZE = 25;
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

function updateOverlay(found: number, sent: number, skipped: number) {
  const status = document.getElementById('hal-import-status');
  if (!status) return;
  status.textContent = '';

  const line1 = createEl('div', { marginBottom: '6px' });
  line1.appendChild(document.createTextNode('Found: '));
  line1.appendChild(createEl('span', { color: '#00d4ff', fontWeight: '600' }, String(found)));
  line1.appendChild(document.createTextNode(' bookmarks'));
  status.appendChild(line1);

  const line2 = createEl('div', {});
  line2.appendChild(document.createTextNode('Sent to HAL: '));
  line2.appendChild(createEl('span', { color: '#00d4ff', fontWeight: '600' }, String(sent)));
  status.appendChild(line2);

  if (skipped > 0) {
    const line3 = createEl('div', { marginTop: '2px' });
    line3.appendChild(document.createTextNode('Skipped: '));
    line3.appendChild(createEl('span', { color: '#f59e0b', fontWeight: '600' }, String(skipped)));
    line3.appendChild(document.createTextNode(' duplicates'));
    status.appendChild(line3);
  }

  const scrollNote = createEl('div', { marginTop: '8px', fontSize: '11px', color: '#4a4a5a' }, 'Auto-scrolling page...');
  status.appendChild(scrollNote);
}

function showOverlayDone(found: number, sent: number, skipped: number) {
  const status = document.getElementById('hal-import-status');
  if (status) {
    status.textContent = '';
    status.appendChild(createEl('div', { marginBottom: '6px' }, 'Scan complete!'));
    const line1 = createEl('div', {});
    line1.appendChild(document.createTextNode('Found: '));
    line1.appendChild(createEl('span', { color: '#00d4ff', fontWeight: '600' }, String(found)));
    line1.appendChild(document.createTextNode(' bookmarks'));
    status.appendChild(line1);
    const line2 = createEl('div', {});
    line2.appendChild(document.createTextNode('Sent to HAL: '));
    line2.appendChild(createEl('span', { color: '#00d4ff', fontWeight: '600' }, String(sent)));
    status.appendChild(line2);
    if (skipped > 0) {
      const line3 = createEl('div', { marginTop: '2px' });
      line3.appendChild(document.createTextNode('Skipped: '));
      line3.appendChild(createEl('span', { color: '#f59e0b', fontWeight: '600' }, String(skipped)));
      line3.appendChild(document.createTextNode(' duplicates'));
      status.appendChild(line3);
    }
  }
  const stopBtn = document.getElementById('hal-import-stop');
  if (stopBtn) {
    stopBtn.textContent = 'Close';
    (stopBtn as HTMLElement).style.borderColor = 'rgba(0,212,255,0.3)';
    (stopBtn as HTMLElement).style.color = '#00d4ff';
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
  let totalSent = 0;
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
      totalSent += batch.length;
      updateOverlay(totalFound, totalSent, totalSkipped);
      const result = await callbacks.onBatch(batch);
      totalSkipped += result.skipped || 0;
      updateOverlay(totalFound, totalSent, totalSkipped);
    }

    updateOverlay(totalFound, totalSent, totalSkipped);

    // Track empty scrolls for end-of-list detection
    if (newThisCycle === 0) {
      emptyScrolls++;
    } else {
      emptyScrolls = 0;
    }

    if (emptyScrolls >= MAX_EMPTY_SCROLLS) {
      // Flush remaining buffer
      if (buffer.length > 0) {
        totalSent += buffer.length;
        const result = await callbacks.onBatch(buffer.splice(0));
        totalSkipped += result.skipped || 0;
      }
      showOverlayDone(totalFound, totalSent, totalSkipped);
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
