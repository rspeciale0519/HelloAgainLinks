// HelloAgain — Content Script for x.com

import { extractTweetData } from './tweet-utils';
import { startBulkImport, startScrollInterceptImport, stopBulkImport } from './bulk-import';
import { startMainFirstImport, maybeResumeFolderWalk } from './folder-walk-import';
import type { XSessionCredentials, TweetData } from './message-types';

console.log('[HelloAgain] Content script loaded on', window.location.href);

// ── MAIN world ↔ content script bridge ──────────────────────
// The x-interceptor.ts runs in the MAIN world and communicates via postMessage.
// We relay messages between it and the background service worker.

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'hal-x-interceptor') return;

  const { type } = event.data;

  if (type === 'X_CREDENTIALS_CAPTURED') {
    const credentials: XSessionCredentials = event.data.credentials;
    chrome.runtime.sendMessage({ type: 'X_CREDENTIALS_CAPTURED', credentials }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }

  if (type === 'X_INTERCEPT_BOOKMARKS') {
    const tweets: TweetData[] = event.data.tweets;
    const cursor: string | null = event.data.cursor;
    chrome.runtime.sendMessage({ type: 'X_BOOKMARKS_PAGE_RESULT', tweets, cursor }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }

  if (type === 'X_BOOKMARKS_PAGE_RESULT') {
    // Phase 2 relay result: MAIN world → content → background
    chrome.runtime.sendMessage({
      type: 'X_BOOKMARKS_PAGE_RESULT',
      tweets: event.data.tweets || [],
      cursor: event.data.cursor || null,
      error: event.data.error || null,
    }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }

  if (type === 'X_FOLDER_PAGE_RESULT') {
    // Phase 4 relay result: MAIN world → content → background
    chrome.runtime.sendMessage({
      type: 'X_FOLDER_PAGE_RESULT',
      folderId: event.data.folderId,
      tweets: event.data.tweets || [],
      cursor: event.data.cursor || null,
      error: event.data.error || null,
    }, () => {
      void chrome.runtime.lastError;
    });
    return;
  }
});

// ── HAL bookmarked post IDs cache ────────────────────────────

let halPostIds = new Set<string>();

function loadHalPostIds() {
  chrome.storage.local.get('hal_post_ids', (result) => {
    halPostIds = new Set<string>(result.hal_post_ids || []);
    // Refresh button states for any already-enhanced tweets
    document.querySelectorAll('article[data-testid="tweet"]').forEach((article) => {
      const halBtn = article.querySelector('.helloagain-save-btn') as HTMLButtonElement | null;
      if (!halBtn) return;
      const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
      const postIdMatch = (timeLink?.getAttribute('href') || '').match(/\/status\/(\d+)/);
      if (postIdMatch?.[1]) {
        halPostIds.has(postIdMatch[1]) ? setHalButtonActive(halBtn) : setHalButtonInactive(halBtn);
      }
    });
  });
}

// Fetch fresh from HAL API with 5-minute TTL to avoid hitting the API on every navigation
const SYNC_TTL_MS = 5 * 60 * 1000;

function syncHalPostIds() {
  chrome.storage.local.get('hal_post_ids_synced_at', (result) => {
    const lastSync = result.hal_post_ids_synced_at || 0;
    if (Date.now() - lastSync < SYNC_TTL_MS) {
      loadHalPostIds(); // cache is fresh enough
      return;
    }
    try {
      chrome.runtime.sendMessage({ type: 'GET_BOOKMARKED_POST_IDS' }, (response) => {
        void chrome.runtime.lastError;
        if (response?.post_ids) {
          chrome.storage.local.set(
            { hal_post_ids: response.post_ids, hal_post_ids_synced_at: Date.now() },
            loadHalPostIds
          );
        } else {
          loadHalPostIds();
        }
      });
    } catch {
      loadHalPostIds();
    }
  });
}

// ── Settings ─────────────────────────────────────────────────

let showHalButton = true;

// Listen for setting changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;
  if (changes.showHalButton) {
    showHalButton = changes.showHalButton.newValue;
    // Toggle visibility of all existing HAL buttons
    document.querySelectorAll('.helloagain-save-wrapper').forEach((el) => {
      (el as HTMLElement).style.display = showHalButton ? 'flex' : 'none';
    });
  }
});

// ── Toast notification ───────────────────────────────────────

function showToast(message: string, type: 'success' | 'error' = 'success') {
  // Remove existing toast
  const existing = document.getElementById('helloagain-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'helloagain-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 20px',
    borderRadius: '12px',
    background: type === 'success' ? 'rgba(0,212,255,0.95)' : 'rgba(239,68,68,0.95)',
    color: type === 'success' ? '#0a0a0f' : '#fff',
    fontWeight: '600',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    zIndex: '999999',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    transition: 'opacity 0.3s, transform 0.3s',
    opacity: '0',
    transform: 'translateY(10px)',
  });

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Animate out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── HAL button state helpers ─────────────────────────────────

function setHalButtonActive(btn: HTMLButtonElement) {
  btn.setAttribute('data-hal-active', 'true');
  btn.style.color = '#00d4ff';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#00d4ff" stroke="#00d4ff" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  `;
}

function setHalButtonInactive(btn: HTMLButtonElement) {
  btn.removeAttribute('data-hal-active');
  btn.style.color = '#71767b';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  `;
}

// ── HelloAgain save button ───────────────────────────────────

function createSaveButton(article: Element) {
  const data = extractTweetData(article);
  if (!data.postId) return null;

  const btn = document.createElement('button');
  btn.className = 'helloagain-save-btn';
  btn.title = 'Save to HAL';
  Object.assign(btn.style, {
    background: 'none',
    border: 'none',
    color: '#71767b',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  });

  // Set initial state from HAL cache (not native X state — they can be out of sync)
  if (halPostIds.has(data.postId)) {
    setHalButtonActive(btn);
  } else {
    setHalButtonInactive(btn);
  }

  btn.addEventListener('mouseenter', () => {
    btn.style.background = 'rgba(0,212,255,0.1)';
    if (!btn.getAttribute('data-hal-active')) btn.style.color = '#00d4ff';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'none';
    btn.style.color = btn.getAttribute('data-hal-active') ? '#00d4ff' : '#71767b';
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle: if already saved, remove from HAL
    if (btn.getAttribute('data-hal-active')) {
      try {
        chrome.runtime.sendMessage(
          { type: 'DELETE_BOOKMARK', data: { postId: data.postId } },
          (response) => {
            if (chrome.runtime.lastError) {
              showToast('HAL connection lost — reload the page', 'error');
              return;
            }
            if (!response?.error) {
              showToast('Removed from HAL');
              halPostIds.delete(data.postId);
              setHalButtonInactive(btn);
            }
          }
        );
      } catch {
        showToast('HAL connection lost — reload the page', 'error');
      }
      return;
    }

    try {
      chrome.runtime.sendMessage(
        {
          type: 'SAVE_BOOKMARK',
          data: {
            postId: data.postId,
            content: data.content,
            author: data.author,
            authorName: data.authorName,
            avatarUrl: data.avatarUrl,
            timestamp: data.timestamp,
            mediaUrls: JSON.stringify(data.mediaUrls),
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[HelloAgain]', chrome.runtime.lastError.message);
            showToast('HAL connection lost — reload the page', 'error');
            return;
          }
          if (response?.error) {
            if (response.status === 409) {
              showToast('Already saved ✓', 'success');
              halPostIds.add(data.postId);
              setHalButtonActive(btn);
            } else if (response.status === 401) {
              showToast('Sign in to Hello Again Links first', 'error');
            } else {
              showToast(response.error, 'error');
            }
          } else {
            showToast('Saved to HAL ✓');
            halPostIds.add(data.postId);
            setHalButtonActive(btn);
          }
        }
      );
    } catch {
      showToast('HAL connection lost — reload the page', 'error');
    }
  });

  return btn;
}

// ── Enhance tweets ───────────────────────────────────────────

function enhanceBookmarkButtons(root: HTMLElement) {
  const articles = root.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach((article) => {
    if (article.getAttribute('data-helloagain-enhanced')) return;
    article.setAttribute('data-helloagain-enhanced', 'true');

    // Find the action bar (reply, retweet, like, etc.)
    const actionBar = article.querySelector('[role="group"]');
    if (!actionBar) return;

    const saveBtn = createSaveButton(article);
    if (saveBtn) {
      const wrapper = document.createElement('div');
      wrapper.className = 'helloagain-save-wrapper';
      wrapper.style.display = showHalButton ? 'flex' : 'none';
      wrapper.style.alignItems = 'center';
      wrapper.appendChild(saveBtn);
      actionBar.appendChild(wrapper);
    }

  });
}

// ── Timeline observer ────────────────────────────────────────

function observeTimeline() {
  // Initial pass
  enhanceBookmarkButtons(document.body as HTMLElement);

  let rafPending = false;
  const observer = new MutationObserver((mutations) => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            enhanceBookmarkButtons(node);
          }
        }
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ── Native bookmark mirroring (document-level delegation) ────
// Attaching per-element listeners breaks when X's React replaces the button DOM node.
// A single capture-phase listener on the document survives re-renders.

document.addEventListener(
  'click',
  (e) => {
    const target = e.target as Element;
    const bookmarkBtn = target.closest('[data-testid="bookmark"]');
    if (!bookmarkBtn) return;

    const article = bookmarkBtn.closest('article[data-testid="tweet"]');
    if (!article) return;

    const tweetData = extractTweetData(article);
    if (!tweetData.postId) return;

    try {
      chrome.runtime.sendMessage(
        {
          type: 'SAVE_BOOKMARK',
          data: {
            postId: tweetData.postId,
            content: tweetData.content,
            author: tweetData.author,
            authorName: tweetData.authorName,
            avatarUrl: tweetData.avatarUrl,
            timestamp: tweetData.timestamp,
            mediaUrls: JSON.stringify(tweetData.mediaUrls),
          },
        },
        (response) => {
          void chrome.runtime.lastError;
          if (response && !response.error) {
            showToast('Also saved to HAL ✓');
            halPostIds.add(tweetData.postId);
            const halBtn = article.querySelector('.helloagain-save-btn') as HTMLButtonElement | null;
            if (halBtn) setHalButtonActive(halBtn);
          }
          // Silently ignore errors — don't disrupt native bookmark flow
        }
      );
    } catch {
      // Silently ignore — don't disrupt native bookmark flow
    }
  },
  true // capture phase so we see the click before X's handlers
);

// Mirror native un-bookmark → delete from HAL
document.addEventListener(
  'click',
  (e) => {
    const target = e.target as Element;
    const removeBtn = target.closest('[data-testid="removeBookmark"]');
    if (!removeBtn) return;

    const article = removeBtn.closest('article[data-testid="tweet"]');
    if (!article) return;

    const tweetData = extractTweetData(article);
    if (!tweetData.postId) return;

    try {
      chrome.runtime.sendMessage(
        { type: 'DELETE_BOOKMARK', data: { postId: tweetData.postId } },
        () => {
          void chrome.runtime.lastError;
          const halBtn = article.querySelector('.helloagain-save-btn') as HTMLButtonElement | null;
          if (halBtn) setHalButtonInactive(halBtn);
        }
      );
    } catch {
      // Silently ignore — don't disrupt native un-bookmark flow
    }
  },
  true
);

// Deactivate HAL button when bookmark is deleted from dashboard or side panel
// Also handle bulk import start/stop commands from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'BOOKMARK_DELETED' && message.postId) {
    halPostIds.delete(message.postId);
    document.querySelectorAll('article[data-testid="tweet"]').forEach((article) => {
      const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
      const postIdMatch = (timeLink?.getAttribute('href') || '').match(/\/status\/(\d+)/);
      if (postIdMatch?.[1] === message.postId) {
        const halBtn = article.querySelector('.helloagain-save-btn') as HTMLButtonElement | null;
        if (halBtn) setHalButtonInactive(halBtn);
      }
    });
    return;
  }

  if (message.type === 'HAL_LOGGED_OUT') {
    halPostIds.clear();
    document.querySelectorAll('.helloagain-save-wrapper').forEach((el) => el.remove());
    document.querySelectorAll('[data-helloagain-enhanced]').forEach((el) => {
      el.removeAttribute('data-helloagain-enhanced');
    });
    return;
  }

  if (message.type === 'START_BULK_IMPORT') {
    startBulkImport({
      onBatch: (tweets) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'BULK_IMPORT_BATCH', tweets }, (response) => {
            void chrome.runtime.lastError;
            // Forward all four buckets for the overlay's accuracy invariant.
            resolve({
              imported: response?.imported || 0,
              updated:  response?.updated  || 0,
              skipped:  response?.skipped  || 0,
              errored:  response?.errored  || 0,
            });
          });
        });
      },
      onDone: () => {
        chrome.runtime.sendMessage({ type: 'BULK_IMPORT_DONE' });
      },
      onError: (msg) => {
        chrome.runtime.sendMessage({ type: 'BULK_IMPORT_ERROR', error: msg });
      },
    });
    return;
  }

  if (message.type === 'STOP_BULK_IMPORT') {
    stopBulkImport();
    return;
  }

  // Strategy C: Scroll + intercept mode
  if (message.type === 'START_SCROLL_INTERCEPT_IMPORT') {
    startScrollInterceptImport({
      onBatch: (tweets) => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'BULK_IMPORT_BATCH', tweets }, (response) => {
            void chrome.runtime.lastError;
            // Forward all four buckets for the overlay's accuracy invariant.
            resolve({
              imported: response?.imported || 0,
              updated:  response?.updated  || 0,
              skipped:  response?.skipped  || 0,
              errored:  response?.errored  || 0,
            });
          });
        });
      },
      onDone: () => {
        chrome.runtime.sendMessage({ type: 'BULK_IMPORT_DONE' });
      },
      onError: (msg) => {
        chrome.runtime.sendMessage({ type: 'BULK_IMPORT_ERROR', error: msg });
      },
    });
    return;
  }

  // Phase 2 relay: background → content → MAIN world (for direct API fetch)
  if (message.type === 'FETCH_BOOKMARKS_PAGE') {
    window.postMessage({
      source: 'hal-content',
      type: 'FETCH_BOOKMARKS_PAGE',
      cursor: message.cursor || null,
    }, '*');
    return;
  }

  // Phase 4 relay: background → content → MAIN world (folder direct fetch)
  if (message.type === 'FETCH_FOLDER_PAGE') {
    window.postMessage({
      source: 'hal-content',
      type: 'FETCH_FOLDER_PAGE',
      folderId: message.folderId,
      cursor: message.cursor || null,
    }, '*');
    return;
  }
});

// Phase 3: bridge from the HAL web app — when the user clicks the
// "Import X folders" button on the dashboard, that page posts a
// HAL_START_FOLDER_WALK_IMPORT message via window.postMessage. The
// extension content script (this file) is loaded on x.com only, so the
// dashboard message reaches us only if the user already has x.com
// open. To handle the typical case (user is on the dashboard, not on
// x.com), the dashboard layout will detect "no extension answered" and
// fall back to a tab-open redirect — that path is wired in a future
// task. For now we capture the message when it does arrive on x.com.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.source !== 'hal-app') return;
  if (event.data.type !== 'HAL_START_FOLDER_WALK_IMPORT') return;
  void startMainFirstImport();
});

// Phase 3: when this script loads on /i/bookmarks/* due to a folder-walk
// navigation, resume from chrome.storage state. If the URL also carries
// ?hal_folder_walk=1, kick off a fresh walk (this is the path used when
// the user clicks "Import X folders" from the HAL dashboard which then
// opens x.com/i/bookmarks?hal_folder_walk=1 in a new tab).
function maybeResumeOnLoad() {
  if (!/^\/i\/bookmarks(\/|$)/.test(window.location.pathname)) return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('hal_folder_walk') === '1') {
    void startMainFirstImport();
    return;
  }
  void maybeResumeFolderWalk();
}

// Start — load settings first, then HAL post IDs + observe timeline
chrome.storage.sync.get({ showHalButton: true }, (result) => {
  showHalButton = result.showHalButton;

  const init = () => { syncHalPostIds(); observeTimeline(); maybeResumeOnLoad(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});
