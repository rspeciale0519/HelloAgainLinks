// HelloAgain — Shared tweet data extraction utilities

export interface TweetData {
  content: string;
  author: string;
  authorName: string;
  avatarUrl: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
}

export function extractTweetData(article: Element): TweetData {
  const contentEl = article.querySelector('[data-testid="tweetText"]');
  const content = contentEl?.textContent || '';

  // Author handle
  const authorLink = article.querySelector('a[role="link"][href^="/"]');
  const authorHref = authorLink?.getAttribute('href') || '';
  const author = authorHref.replace('/', '').split('/')[0] || '';

  // Author name
  const nameEl = article.querySelector('[data-testid="User-Name"]');
  const authorName = nameEl?.querySelector('span')?.textContent || '';

  // Author avatar — X renders the profile pic inside Tweet-User-Avatar with
  // an <img src="https://pbs.twimg.com/profile_images/...">. Fall back to
  // empty string when the DOM doesn't expose it (rare; e.g., placeholder
  // before image hydrates) and let the UI substitute the lettered circle.
  const avatarContainer = article.querySelector('[data-testid="Tweet-User-Avatar"]');
  const avatarImg = avatarContainer?.querySelector('img[src*="profile_images"]') as HTMLImageElement | null;
  const avatarUrl = avatarImg?.src || '';

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

  return { content, author, authorName, avatarUrl, postId, timestamp, mediaUrls };
}
