// HelloAgain — Content Script for x.com

import { extractTweetData } from './tweet-utils';
import { startBulkImport, stopBulkImport } from './bulk-import';

console.log('[HelloAgain] Content script loaded on', window.location.href);

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
            resolve({ imported: response?.imported || 0, skipped: response?.skipped || 0 });
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
});

// Start — load settings first, then HAL post IDs + observe timeline
chrome.storage.sync.get({ showHalButton: true }, (result) => {
  showHalButton = result.showHalButton;

  const init = () => { syncHalPostIds(); observeTimeline(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
});
