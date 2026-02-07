// HelloAgain — Content Script for x.com

console.log('[HelloAgain] Content script loaded on', window.location.href);

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

// ── Tweet data extraction ────────────────────────────────────

function extractTweetData(article: Element) {
  const contentEl = article.querySelector('[data-testid="tweetText"]');
  const content = contentEl?.textContent || '';

  // Author handle
  const authorLink = article.querySelector('a[role="link"][href^="/"]');
  const authorHref = authorLink?.getAttribute('href') || '';
  const author = authorHref.replace('/', '').split('/')[0] || '';

  // Author name
  const nameEl = article.querySelector('[data-testid="User-Name"]');
  const authorName = nameEl?.querySelector('span')?.textContent || '';

  // Post ID from permalink
  const timeLink = article.querySelector('a[href*="/status/"] time')?.parentElement;
  const statusHref = timeLink?.getAttribute('href') || '';
  const postIdMatch = statusHref.match(/\/status\/(\d+)/);
  const postId = postIdMatch ? postIdMatch[1] : '';

  // Timestamp
  const timeEl = article.querySelector('time');
  const timestamp = timeEl?.getAttribute('datetime') || '';

  // Media URLs
  const mediaEls = article.querySelectorAll('img[src*="pbs.twimg.com/media"]');
  const mediaUrls = Array.from(mediaEls).map((img) => (img as HTMLImageElement).src);

  return { content, author, authorName, postId, timestamp, mediaUrls };
}

// ── HelloAgain save button ───────────────────────────────────

function createSaveButton(article: Element) {
  const data = extractTweetData(article);
  if (!data.postId) return null;

  const btn = document.createElement('button');
  btn.className = 'helloagain-save-btn';
  btn.title = 'Save to HAL';
  btn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  `;
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

  btn.addEventListener('mouseenter', () => {
    btn.style.color = '#00d4ff';
    btn.style.background = 'rgba(0,212,255,0.1)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.color = '#71767b';
    btn.style.background = 'none';
  });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    btn.style.color = '#00d4ff';
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
        if (response?.error) {
          if (response.status === 409) {
            showToast('Already saved ✓', 'success');
          } else if (response.status === 401) {
            showToast('Sign in to Hello Again Links first', 'error');
          } else {
            showToast(response.error, 'error');
          }
        } else {
          showToast('Saved to HAL ✓');
          btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#00d4ff" stroke="#00d4ff" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          `;
        }
      }
    );
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
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.appendChild(saveBtn);
      actionBar.appendChild(wrapper);
    }

    // Also intercept native bookmark click
    const nativeBookmarkBtn = article.querySelector('[data-testid="bookmark"]');
    if (nativeBookmarkBtn) {
      nativeBookmarkBtn.addEventListener('click', () => {
        const data = extractTweetData(article);
        if (data.postId) {
          chrome.runtime.sendMessage({
            type: 'SAVE_BOOKMARK',
            data: {
              postId: data.postId,
              content: data.content,
              author: data.author,
              authorName: data.authorName,
              timestamp: data.timestamp,
              mediaUrls: JSON.stringify(data.mediaUrls),
            },
          });
        }
      });
    }
  });
}

// ── Timeline observer ────────────────────────────────────────

function observeTimeline() {
  // Initial pass
  enhanceBookmarkButtons(document.body as HTMLElement);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          enhanceBookmarkButtons(node);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeTimeline);
} else {
  observeTimeline();
}
