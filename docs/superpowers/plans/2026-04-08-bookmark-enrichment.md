# Bookmark Enrichment & Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate bookmark enrichment fields (engagement, avatar, language, category, domain) by extracting data the extension already receives and classifying content at import time.

**Architecture:** Three layers — (1) extension GraphQL parser extracts rich fields and sends them to the batch API, (2) server-side `mergeUpsertBookmarks` runs regex classification on newly inserted rows, (3) a new plan-gated `/api/bookmarks/classify` endpoint lets Pro/Lifetime users trigger LLM classification on demand.

**Tech Stack:** TypeScript, Next.js App Router, Supabase PostgreSQL, Chrome Extension (Manifest V3), Grok API (xAI)

**Spec:** `docs/superpowers/specs/2026-04-08-bookmark-enrichment-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/extension/src/message-types.ts` | Modify | Add optional enrichment fields to TweetData |
| `apps/extension/src/graphql-parser.ts` | Modify | Extract engagement/avatar/language from GraphQL response |
| `apps/extension/src/background.ts` | Modify | Map new TweetData fields into batch API payload |
| `apps/extension/public/manifest.json` | Modify | Bump version to 0.3.3 |
| `apps/web/src/lib/bookmark-upsert.ts` | Modify | Add regex classification after insert |
| `apps/web/src/app/api/bookmarks/classify/route.ts` | Create | LLM classification endpoint (Pro/Lifetime gated) |
| `apps/web/src/app/dashboard/bookmarks/page.tsx` | Modify | Add classification banner + button |

---

### Task 1: Extend TweetData with Enrichment Fields

**Files:**
- Modify: `apps/extension/src/message-types.ts:1-8`

- [ ] **Step 1: Update TweetData interface**

In `apps/extension/src/message-types.ts`, replace the existing `TweetData` interface:

```typescript
export interface TweetData {
  content: string;
  author: string;
  authorName: string;
  postId: string;
  timestamp: string;
  mediaUrls: string[];
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

- [ ] **Step 2: Type-check the extension**

Run: `npx tsc --noEmit -p apps/extension/tsconfig.json`
Expected: No errors (new fields are all optional, so no downstream breakage)

- [ ] **Step 3: Commit**

```bash
git add apps/extension/src/message-types.ts
git commit -m "feat(extension): add enrichment fields to TweetData interface"
```

---

### Task 2: Extract Enrichment Data in GraphQL Parser

**Files:**
- Modify: `apps/extension/src/graphql-parser.ts:24-64`

- [ ] **Step 1: Update extractTweetFromResult to capture enrichment fields**

In `apps/extension/src/graphql-parser.ts`, replace the `extractTweetFromResult` function:

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/extension/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/extension/src/graphql-parser.ts
git commit -m "feat(extension): extract engagement/avatar/language from GraphQL response"
```

---

### Task 3: Map Enrichment Fields in Batch Handler

**Files:**
- Modify: `apps/extension/src/background.ts:208-216`

- [ ] **Step 1: Update handleBulkImportBatch to include enrichment fields**

In `apps/extension/src/background.ts`, replace the `bookmarks` mapping inside `handleBulkImportBatch` (lines 208-216):

```typescript
  const bookmarks = tweets.map((t) => ({
    x_post_id: t.postId,
    x_author_handle: t.author,
    x_author_name: t.authorName,
    content_text: t.content,
    media_urls: t.mediaUrls,
    post_created_at: t.timestamp || new Date().toISOString(),
    bookmarked_at: new Date().toISOString(),
    x_author_avatar_url: t.avatarUrl || null,
    language: t.language || null,
    engagement: t.engagement || null,
    conversation_id: t.conversationId || null,
    in_reply_to_status_id: t.inReplyToStatusId || null,
    quoted_status_id: t.quotedStatusId || null,
    possibly_sensitive: t.possiblySensitive ?? false,
    ingested_via: 'extension' as const,
  }));
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/extension/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Bump extension version**

In `apps/extension/public/manifest.json`, change `"version": "0.3.2"` to `"version": "0.3.3"`.

- [ ] **Step 4: Commit**

```bash
git add apps/extension/src/background.ts apps/extension/public/manifest.json
git commit -m "feat(extension): send enrichment fields to batch API, bump to 0.3.3"
```

---

### Task 4: Add Regex Classification to Bookmark Upsert

**Files:**
- Modify: `apps/web/src/lib/bookmark-upsert.ts`

- [ ] **Step 1: Add classifyByRegex import and post-insert classification**

In `apps/web/src/lib/bookmark-upsert.ts`, add the import at the top:

```typescript
import { scoreBookmarkRecord, mergeBookmarkRecords, classifyByRegex } from '@helloagain/shared';
```

Then, after the insert block (after `insertedRows = data ?? [];` on line 82), add regex classification for newly inserted rows:

```typescript
    // Regex-classify newly inserted bookmarks (instant, free)
    for (const row of insertedRows) {
      const contentText = (row as Record<string, unknown>).content_text as string || '';
      const { category, domain } = classifyByRegex(contentText);
      if (category || domain) {
        await serviceClient
          .from('bookmarks')
          .update({
            ...(category ? { primary_category: category } : {}),
            ...(domain ? { primary_domain: domain } : {}),
          })
          .eq('id', row.id);
      }
    }
```

- [ ] **Step 2: Update insertedRows select to include content_text**

The current insert select is `.select('id, content_text')` — this already includes `content_text`, so no change is needed. Verify this at line 78.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/bookmark-upsert.ts
git commit -m "feat(web): add regex classification to bookmark upsert path"
```

---

### Task 5: One-Time Regex Backfill via SQL

**Files:**
- None (executed via Supabase MCP)

- [ ] **Step 1: Run regex backfill SQL**

Execute via `mcp__supabase__execute_sql`. This applies the most impactful regex patterns from `classify-regex.ts` as a SQL UPDATE:

```sql
-- Backfill primary_domain from text patterns
UPDATE bookmarks SET primary_domain = CASE
  WHEN content_text ~* '\b(LLM|GPT|transformer|diffusion|neural|fine[- ]tun(e|ing)|embedding|RAG|Claude|Gemini|OpenAI|Anthropic)\b' THEN 'ai'
  WHEN content_text ~* '\b(bitcoin|ethereum|solana|defi|NFT|web3|blockchain|airdrop|onchain|XRP|Ripple|crypto)\b' THEN 'crypto'
  WHEN content_text ~* '\b(stock|portfolio|S&P|NASDAQ|dividend|hedge fund|valuation|IPO)\b' THEN 'finance'
  WHEN content_text ~* '\b(kubernetes|docker|terraform|CI/CD|deploy|infrastructure)\b' THEN 'devops'
  ELSE primary_domain
END
WHERE primary_domain IS NULL;

-- Backfill primary_category from text patterns
UPDATE bookmarks SET primary_category = CASE
  WHEN content_text ~* 'CVE-\d{4}-\d+' THEN 'security'
  WHEN content_text ~* '\b(vulnerability|exploit|zero[- ]day|RCE|XSS|breach)\b' THEN 'security'
  WHEN content_text ~* '\b(npm install|pip install|cargo add|brew install|open[- ]source|CLI tool|self[- ]hosted)\b' THEN 'tool'
  WHEN content_text ~* '\b(how (I|we|to)|tutorial|step[- ]by[- ]step|deep dive|under the hood|TIL|pro tip)\b' THEN 'technique'
  WHEN content_text ~* '\b(just (launched|shipped|released)|announcing|now available|v\d+\.\d+)\b' THEN 'launch'
  WHEN content_text ~* '\b(paper|study (finds|shows)|preprint|state[- ]of[- ]the[- ]art|benchmark)\b' THEN 'research'
  WHEN content_text ~* '\b(unpopular opinion|hot take|controversial|lessons learned)\b' THEN 'opinion'
  ELSE primary_category
END
WHERE primary_category IS NULL;
```

- [ ] **Step 2: Verify backfill results**

```sql
SELECT
  COUNT(*) as total,
  COUNT(primary_category) as with_category,
  COUNT(primary_domain) as with_domain
FROM bookmarks;
```

Expected: `with_category` and `with_domain` should both be > 0.

- [ ] **Step 3: No commit needed** (data-only change, no code)

---

### Task 6: Create LLM Classification Endpoint

**Files:**
- Create: `apps/web/src/app/api/bookmarks/classify/route.ts`

- [ ] **Step 1: Create the classify route**

Create `apps/web/src/app/api/bookmarks/classify/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { classifyBookmark } from '@/lib/grok';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Plan gate: Pro and Lifetime only
  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'AI classification is available on Pro and Lifetime plans' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

  // Find unclassified bookmarks
  const { data: unclassified, error: fetchError } = await ctx.serviceClient
    .from('bookmarks')
    .select('id, content_text')
    .eq('user_id', ctx.userId)
    .is('primary_category', null)
    .is('primary_domain', null)
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!unclassified || unclassified.length === 0) {
    return NextResponse.json({ classified: 0, remaining: 0 });
  }

  // Get total remaining count
  const { count: totalRemaining } = await ctx.serviceClient
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .is('primary_category', null)
    .is('primary_domain', null);

  // Process in batches of 5
  let classified = 0;
  const batchSize = 5;

  for (let i = 0; i < unclassified.length; i += batchSize) {
    const batch = unclassified.slice(i, i + batchSize);
    const promises = batch.map(async (bm) => {
      const { tags, category, domain } = await classifyBookmark(bm.content_text || '');

      // Update classification
      if (category || domain) {
        await ctx.serviceClient
          .from('bookmarks')
          .update({
            ...(category ? { primary_category: category } : {}),
            ...(domain ? { primary_domain: domain } : {}),
          })
          .eq('id', bm.id);
      }

      // Auto-create and link tags
      for (const tagName of tags) {
        const { data: tag } = await ctx.serviceClient
          .from('tags')
          .upsert(
            { user_id: ctx.userId, name: tagName, color: '#00d4ff' },
            { onConflict: 'user_id,name' },
          )
          .select('id')
          .single();
        if (tag) {
          await ctx.serviceClient
            .from('bookmark_tags')
            .upsert(
              { bookmark_id: bm.id, tag_id: tag.id },
              { onConflict: 'bookmark_id,tag_id' },
            );
        }
      }

      classified++;
    });
    await Promise.all(promises);
  }

  return NextResponse.json({
    classified,
    remaining: Math.max(0, (totalRemaining ?? 0) - classified),
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/bookmarks/classify/route.ts
git commit -m "feat(web): add plan-gated LLM classification endpoint"
```

---

### Task 7: Add Classification Banner to Bookmarks Page

**Files:**
- Modify: `apps/web/src/app/dashboard/bookmarks/page.tsx`

- [ ] **Step 1: Add state and fetch for unclassified count and user plan**

In `apps/web/src/app/dashboard/bookmarks/page.tsx`, add new state variables after the existing state declarations (around line 20):

```typescript
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [classifying, setClassifying] = useState(false);
```

Add a GET handler to the classify route (Task 6) that returns the unclassified count and user plan without triggering classification. Then fetch it on the bookmarks page:

```typescript
  const fetchClassifyInfo = useCallback(async () => {
    const res = await authFetch('/api/bookmarks/classify');
    if (res?.ok) {
      const data = await res.json();
      setUnclassifiedCount(data.unclassified || 0);
      setUserPlan(data.plan || 'free');
    }
  }, []);
```

Add the effect trigger:

```typescript
  useEffect(() => { fetchClassifyInfo(); }, [fetchClassifyInfo]);
```

- [ ] **Step 2: Add the classify handler and banner UI**

Add the classify button handler:

```typescript
  const handleClassify = useCallback(async () => {
    setClassifying(true);
    const res = await authFetch('/api/bookmarks/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    });
    if (res?.ok) {
      const data = await res.json();
      setUnclassifiedCount(data.remaining || 0);
      fetchBookmarks();
    }
    setClassifying(false);
  }, [fetchBookmarks]);
```

Add the banner JSX right after the search input `</div>` (after line 160), before the bookmarks list:

```tsx
      {/* Classification banner */}
      {unclassifiedCount > 0 && userPlan !== 'free' && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid rgba(0,212,255,0.15)',
          background: 'rgba(0,212,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#8a8a9a', fontSize: '13px' }}>
            {unclassifiedCount} bookmark{unclassifiedCount !== 1 ? 's' : ''} can be AI-classified
          </span>
          <button
            onClick={handleClassify}
            disabled={classifying}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)',
              background: classifying ? 'rgba(0,212,255,0.1)' : 'rgba(0,212,255,0.15)',
              color: '#00d4ff',
              fontSize: '13px',
              cursor: classifying ? 'default' : 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {classifying ? 'Classifying...' : 'Classify'}
          </button>
        </div>
      )}
```

- [ ] **Step 3: Add GET handler to classify route**

In `apps/web/src/app/api/bookmarks/classify/route.ts`, add the GET handler (shown in Step 1 above) before the existing POST handler.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/dashboard/bookmarks/page.tsx apps/web/src/app/api/bookmarks/classify/route.ts
git commit -m "feat(web): add AI classification banner on bookmarks page"
```

---

### Task 8: Build Extension and Final Verification

- [ ] **Step 1: Build the extension**

Run: `cd apps/extension && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Type-check all workspaces**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json && npx tsc --noEmit -p apps/extension/tsconfig.json`
Expected: No errors in either

- [ ] **Step 3: Push and verify Vercel deployment**

```bash
git push origin main
```

Wait for Vercel production deployment to reach READY state.

- [ ] **Step 4: Run the regex backfill SQL (Task 5)**

Execute the SQL from Task 5 via Supabase MCP.

- [ ] **Step 5: Test end-to-end**

1. Reload extension in Chrome (`chrome://extensions`)
2. Trigger an import — verify enrichment fields (engagement, avatar) are populated in Supabase
3. Search for bookmarks — verify results still work
4. Check the classification banner appears on the bookmarks page
5. If Pro/Lifetime: click Classify and verify bookmarks get `primary_category`/`primary_domain` populated

- [ ] **Step 6: Final commit (sync develop)**

```bash
git checkout develop && git merge main --ff-only && git push origin develop && git checkout main
```
