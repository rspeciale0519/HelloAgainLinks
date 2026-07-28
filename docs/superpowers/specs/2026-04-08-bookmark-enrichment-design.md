# Bookmark Enrichment & Classification Design

**Date:** 2026-04-08
**Status:** Draft
**Approach:** A — Extension-side enrichment + server-side classification

## Problem

HAL has 1,122+ bookmarks with zero enrichment data. The fields `engagement`, `x_author_avatar_url`, `language`, `primary_category`, and `primary_domain` are all NULL despite the database columns existing. This is because:

1. The extension's GraphQL parser discards engagement/avatar/language data that X's API already returns
2. Regex classification is never called during extension imports
3. LLM classification only runs in the background sync route, which requires a paid X API tier ($100/month) that isn't viable

## Solution Overview

Three changes, layered:

1. **Extension GraphQL enrichment** — Extract engagement, avatar, language from X's GraphQL response (data we already receive but throw away)
2. **Regex classification at import time** — Run `classifyByRegex()` on newly inserted bookmarks in the batch upsert path (instant, free)
3. **LLM classification endpoint** — User-triggered, Pro/Lifetime only, processes bookmarks that regex couldn't classify

## Section 1: Extension GraphQL Enrichment

### TweetData Interface Changes

Add optional fields to `TweetData` in `message-types.ts`:

```typescript
export interface TweetData {
  content: string;
  author: string;
  authorName: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
  // New enrichment fields
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
}
```

### GraphQL Parser Changes

In `graphql-parser.ts` `extractTweetFromResult()`, extract from the `legacy` object:

- `legacy.favorite_count` → `engagement.like_count`
- `legacy.retweet_count` → `engagement.retweet_count`
- `legacy.reply_count` → `engagement.reply_count`
- `legacy.quote_count` → `engagement.quote_count`
- `legacy.bookmark_count` → `engagement.bookmark_count`
- `views.count` → `engagement.view_count` (from `tweet.views.count`)
- `legacy.lang` → `language`
- `legacy.conversation_id_str` → `conversationId`
- `legacy.in_reply_to_status_id_str` → `inReplyToStatusId`
- `legacy.quoted_status_id_str` → `quotedStatusId`
- `legacy.possibly_sensitive` → `possiblySensitive`
- `userResult.legacy.profile_image_url_https` or `userResult.core.profile_image_url_https` → `avatarUrl`

### Background.ts Batch Handler Changes

In `handleBulkImportBatch()`, map new `TweetData` fields into the batch API payload. The `createBookmarkSchema` already accepts these fields — they just need to be included in the mapped object.

### Extension Version

Bump manifest to 0.3.3.

## Section 2: Regex Classification at Import Time

### Where It Runs

Inside `mergeUpsertBookmarks()` in `bookmark-upsert.ts`, after the insert step. Only processes newly inserted rows (not updates or skips).

For each inserted row:
1. Call `classifyByRegex(content_text, media_urls)` from `@helloagain/shared`
2. If category or domain is non-null, update the row with `primary_category` and/or `primary_domain`

This adds negligible latency (regex is synchronous, <1ms per bookmark) and zero external API cost.

### One-Time Backfill

A SQL script applies regex classification rules to existing bookmarks where `primary_category IS NULL`. Uses PostgreSQL regex (`~*`) to match the same patterns as the TypeScript classifier:

- URL patterns: github.com → tool/web-dev, arxiv.org → research/ai, etc.
- Text patterns: CVE → security, "npm install" → tool, LLM/GPT → ai domain, bitcoin/XRP → crypto domain, etc.

This is a one-time script executed via Supabase MCP `execute_sql`, not a numbered migration file (since it's data manipulation, not schema change).

## Section 3: LLM Classification Endpoint

### Route

`POST /api/bookmarks/classify`

### Access Control

- **Free plan:** Returns 403 with message "AI classification is available on Pro and Lifetime plans"
- **Pro/Lifetime:** Processes unclassified bookmarks

### Behavior

1. Query bookmarks where `primary_category IS NULL AND primary_domain IS NULL` for the current user
2. Accept optional `limit` param (default 50, max 200)
3. Process in parallel batches of 5 (matching existing Grok rate limit pattern)
4. For each bookmark: call `classifyBookmark()` (regex first, then LLM fallback)
5. Write `primary_category`, `primary_domain` to the bookmark row
6. Auto-create tags via `autoTagBookmark()` and link via `bookmark_tags` junction
7. Return `{ classified: number; remaining: number }`

### Frontend

On the bookmarks page:
- If unclassified bookmarks exist and user is Pro/Lifetime: show banner "N bookmarks can be AI-classified" with a "Classify" button
- Button calls endpoint with default limit, shows progress, refreshes on completion
- Free users see nothing (or optionally an upgrade prompt)

## Section 4: Scope Boundaries

**Not in scope:**
- No cron job for LLM classification
- No background sync changes (X API v2 paid tier issue is separate)
- No new database migrations (all columns exist)
- No new shared package exports (classifyByRegex already exported)
- No frontend redesign beyond the classification banner
- No enrichment for scroll-based fallback imports (DOM scraper has less data; regex still classifies the text)

## Files Modified

| File | Change |
|------|--------|
| `apps/extension/src/message-types.ts` | Add optional fields to TweetData |
| `apps/extension/src/graphql-parser.ts` | Extract engagement/avatar/language from GraphQL response |
| `apps/extension/src/background.ts` | Map new fields in handleBulkImportBatch |
| `apps/extension/public/manifest.json` | Bump to 0.3.3 |
| `apps/web/src/lib/bookmark-upsert.ts` | Add regex classification after insert |
| `apps/web/src/app/api/bookmarks/classify/route.ts` | New: LLM classification endpoint |
| `apps/web/src/app/dashboard/bookmarks/page.tsx` | Add classification banner + button |
| `supabase/migrations/` | One-time regex backfill SQL |
