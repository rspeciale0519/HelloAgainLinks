// HelloAgain — Content Script for x.com

console.log('[HelloAgain] Content script loaded on', window.location.href);

// Watch for bookmark button clicks on X timeline
function observeTimeline() {
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

function enhanceBookmarkButtons(root: HTMLElement) {
  // Find tweet articles and attach HelloAgain save button
  const articles = root.querySelectorAll('article[data-testid="tweet"]');
  articles.forEach((article) => {
    if (article.getAttribute('data-helloagain-enhanced')) return;
    article.setAttribute('data-helloagain-enhanced', 'true');

    // Extract tweet data
    const contentEl = article.querySelector('[data-testid="tweetText"]');
    const authorEl = article.querySelector('[data-testid="User-Name"] a');
    const content = contentEl?.textContent || '';
    const author = authorEl?.getAttribute('href')?.replace('/', '') || '';

    // Listen for native bookmark click
    const bookmarkBtn = article.querySelector('[data-testid="bookmark"]');
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        // Send to background
        chrome.runtime.sendMessage({
          type: 'SAVE_BOOKMARK',
          data: { content, author, postId: '' },
        });
      });
    }
  });
}

// Start observing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeTimeline);
} else {
  observeTimeline();
}
