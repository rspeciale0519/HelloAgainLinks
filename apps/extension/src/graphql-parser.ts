// HelloAgain — X.com GraphQL Bookmarks Response Parser
//
// Parses the internal GraphQL Bookmarks endpoint response into TweetData[].
// Response shape: data.bookmark_timeline_v2.timeline.instructions[].entries[]
// Each entry is either a tweet item or a cursor for pagination.

import type { TweetData, FolderContext } from './message-types';

export interface ParsedBookmarksPage {
  tweets: TweetData[];
  cursor: string | null;
  /** Phase 3: derived from the request URL when scraping a specific folder. */
  folderContext?: FolderContext;
}

const FOLDER_URL_PATTERN = /\/i\/bookmarks\/([^/?#]+)/;

/**
 * Phase 3: extract `x_folder_id` from the page URL when the user is
 * inside a specific folder. Returns null if the URL doesn't match a
 * folder path. The folder name is best-effort: X renders it in the
 * page header but the DOM markup is volatile — we tolerate missing.
 *
 * TODO(user): validate the folder-name DOM selector against live X.com
 *   when running the first folder-walk import. The current best
 *   guesses are <h2> under [data-testid="primaryColumn"].
 */
export function extractFolderContext(url: string, doc?: Document): FolderContext | null {
  const match = url.match(FOLDER_URL_PATTERN);
  if (!match) return null;
  const folderId = decodeURIComponent(match[1] ?? '');
  if (!folderId) return null;

  let folderName: string | null = null;
  if (doc) {
    const heading =
      doc.querySelector('[data-testid="primaryColumn"] h2[role="heading"] span') ||
      doc.querySelector('[data-testid="primaryColumn"] h2 span') ||
      doc.querySelector('header h2 span');
    const text = heading?.textContent?.trim();
    if (text && text.length > 0 && text.length <= 200) folderName = text;
  }

  return { x_folder_id: folderId, folder_name: folderName };
}

// X uses "Mon Jan 01 00:00:00 +0000 2024" format
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

  // Handle TweetWithVisibilityResults wrapper
  let tweet = result;
  if (result.__typename === 'TweetWithVisibilityResults' && result.tweet) {
    tweet = result.tweet as Record<string, unknown>;
  }

  // Skip non-tweet results (e.g. tombstones, unavailable tweets)
  if (tweet.__typename !== 'Tweet') return null;

  const postId = (tweet.rest_id as string) || '';
  if (!postId) return null;

  // Author info: core.user_results.result.legacy
  const core = tweet.core as Record<string, unknown> | undefined;
  const userResults = core?.user_results as Record<string, unknown> | undefined;
  const userResult = userResults?.result as Record<string, unknown> | undefined;
  const userCore = userResult?.core as Record<string, unknown> | undefined;
  const userLegacy = userResult?.legacy as Record<string, unknown> | undefined;
  const author = (userCore?.screen_name as string) || (userLegacy?.screen_name as string) || '';
  const authorName = (userCore?.name as string) || (userLegacy?.name as string) || '';

  // Avatar URL
  const avatarUrl =
    (userCore?.profile_image_url_https as string) ||
    (userLegacy?.profile_image_url_https as string) ||
    undefined;

  // Tweet content: legacy.full_text
  const legacy = tweet.legacy as Record<string, unknown> | undefined;
  const content = (legacy?.full_text as string) || '';

  // Timestamp: legacy.created_at
  const rawTimestamp = (legacy?.created_at as string) || '';
  const timestamp = parseXTimestamp(rawTimestamp);

  // Media: legacy.entities.media[].media_url_https
  const entities = legacy?.entities as Record<string, unknown> | undefined;
  const mediaArray = (entities?.media as Array<Record<string, unknown>>) || [];
  const mediaUrls = mediaArray
    .map((m) => (m.media_url_https as string) || '')
    .filter(Boolean);

  // Language
  const language = (legacy?.lang as string) || undefined;

  // Engagement metrics
  const views = tweet.views as Record<string, unknown> | undefined;
  const engagement = {
    like_count: (legacy?.favorite_count as number) || undefined,
    retweet_count: (legacy?.retweet_count as number) || undefined,
    reply_count: (legacy?.reply_count as number) || undefined,
    quote_count: (legacy?.quote_count as number) || undefined,
    bookmark_count: (legacy?.bookmark_count as number) || undefined,
    view_count: views?.count != null ? Number(views.count) : undefined,
  };
  const hasEngagement = Object.values(engagement).some((v) => v !== undefined);

  // Conversation/reply/quote metadata
  const conversationId = (legacy?.conversation_id_str as string) || undefined;
  const inReplyToStatusId = (legacy?.in_reply_to_status_id_str as string) || undefined;
  const quotedStatusId = (legacy?.quoted_status_id_str as string) || undefined;
  const possiblySensitive = legacy?.possibly_sensitive === true ? true : undefined;

  return {
    content, author, authorName, postId, timestamp, mediaUrls,
    avatarUrl,
    language,
    engagement: hasEngagement ? engagement : undefined,
    conversationId,
    inReplyToStatusId,
    quotedStatusId,
    possiblySensitive,
  };
}

export function parseBookmarksResponse(json: unknown): ParsedBookmarksPage {
  const empty: ParsedBookmarksPage = { tweets: [], cursor: null };

  if (!json || typeof json !== 'object') return empty;

  // Navigate to the entries array. X uses two distinct GraphQL operations:
  //   - `Bookmarks` → data.bookmark_timeline_v2.timeline (root /i/bookmarks)
  //   - `BookmarkFolderTimeline` → data.bookmark_collection_timeline_v2.timeline
  //     (folder-scoped /i/bookmarks/:folderId)
  // Both share the same { instructions: [{ entries }] } shape inside `timeline`.
  const data = (json as Record<string, unknown>).data as Record<string, unknown> | undefined;
  if (!data) return empty;

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
    // We want "TimelineAddEntries" instructions
    const type = instruction.type as string;
    if (type !== 'TimelineAddEntries') continue;

    const entries = instruction.entries as Array<Record<string, unknown>> | undefined;
    if (!entries) continue;

    for (const entry of entries) {
      const entryId = (entry.entryId as string) || '';
      const content = entry.content as Record<string, unknown> | undefined;
      if (!content) continue;

      // Cursor entries (for pagination)
      if (entryId.startsWith('cursor-bottom-')) {
        cursor = (content.value as string) || null;
        continue;
      }

      // Tweet entries
      const itemContent = content.itemContent as Record<string, unknown> | undefined;
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
