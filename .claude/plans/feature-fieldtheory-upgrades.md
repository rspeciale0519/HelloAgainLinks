# Plan: Implement Fieldtheory-Inspired Upgrades

## Context
HAL's backend has four weaknesses identified by studying fieldtheory-cli: (1) duplicate records silently discard richer data, (2) search uses slow ILIKE with no ranking, (3) sync is single-page with no guards, (4) every bookmark hits the LLM for classification. This plan implements all four upgrades in dependency order. The detailed spec is in `docs/dev-docs/fieldtheory-inspired-upgrades.md`.

## Pre-work: Commit Pending Doc Changes
Three documentation files have uncommitted cross-reference edits from the previous session. Commit these before starting any new work.

---

## Phase 1: Record Merge Scoring

Replace `ignoreDuplicates: true` across 3 ingest routes with a score-and-merge pattern that preserves the richest data.

### Steps

1. **SQL migration** — `supabase/migrations/001_add_bookmark_enrichment_columns.sql`
   - Add columns: `x_author_avatar_url`, `engagement` (jsonb), `language`, `conversation_id`, `in_reply_to_status_id`, `quoted_status_id`, `possibly_sensitive`, `ingested_via`, `updated_at`

2. **Update Bookmark type** — `packages/shared/src/types.ts`
   - Add new optional fields to the `Bookmark` interface

3. **Update schemas** — `packages/shared/src/schemas.ts`
   - Add new optional fields to `createBookmarkSchema` (which feeds `batchImportSchema`)

4. **Create merge utility** — `packages/shared/src/bookmark-merge.ts` (NEW)
   - `scoreBookmarkRecord()` — score richness by counting populated fields
   - `mergeBookmarkRecords()` — spread-operator merge, winner's fields take priority
   - `stripNulls()` — remove null/undefined/empty-string keys

5. **Re-export** — `packages/shared/src/index.ts`
   - Add `export * from './bookmark-merge'`

6. **Create upsert helper** — `apps/web/src/lib/bookmark-upsert.ts` (NEW)
   - `mergeUpsertBookmarks(serviceClient, userId, rows)` — DRY helper used by all 3 routes
   - Fetches existing by x_post_id, partitions into insert vs update, merges, returns counts

7. **Update batch route** — `apps/web/src/app/api/bookmarks/batch/route.ts`
   - Replace `upsert(..., { ignoreDuplicates: true })` with `mergeUpsertBookmarks()`
   - Add `ingested_via: 'extension'` to rows

8. **Update background sync** — `apps/web/src/app/api/sync/background/route.ts`
   - Replace `upsert(..., { ignoreDuplicates: true })` with `mergeUpsertBookmarks()`
   - Add `ingested_via: 'api'` to rows

9. **Update import route** — `apps/web/src/app/api/bookmarks/import/route.ts`
   - Replace manual dedup + insert with `mergeUpsertBookmarks()`
   - Add `ingested_via: 'api'` to rows

### Files
| File | Action |
|------|--------|
| `supabase/migrations/001_add_bookmark_enrichment_columns.sql` | Create |
| `packages/shared/src/types.ts` | Edit |
| `packages/shared/src/schemas.ts` | Edit |
| `packages/shared/src/bookmark-merge.ts` | Create |
| `packages/shared/src/index.ts` | Edit |
| `apps/web/src/lib/bookmark-upsert.ts` | Create |
| `apps/web/src/app/api/bookmarks/batch/route.ts` | Edit |
| `apps/web/src/app/api/sync/background/route.ts` | Edit |
| `apps/web/src/app/api/bookmarks/import/route.ts` | Edit |

---

## Phase 2: Postgres Full-Text Search

Replace ILIKE with PostgreSQL tsvector/tsquery + GIN index + RPC function for ranked search.

### Steps

1. **SQL migration** — `supabase/migrations/002_add_search_vector_and_rpc.sql`
   - Generated `search_vector` tsvector column (content_text weight A, handle/name weight B)
   - GIN index on `search_vector`
   - `search_bookmarks()` RPC: returns `(id, rank, total_count)` — lightweight return, hydration done via userClient
   - Uses `websearch_to_tsquery('english', ...)` for natural language input
   - `SECURITY DEFINER` with explicit `user_id` filter (bypasses RLS for ranking)

2. **Update search sanitizer** — `apps/web/src/lib/postgrest-search.ts`
   - Add `sanitizeFtsQuery()` — similar to existing but allows quotes and max 200 chars
   - Keep existing `sanitizePostgrestSearchTerm()` (other code may use it)

3. **Update search route** — `apps/web/src/app/api/bookmarks/search/route.ts`
   - Replace ILIKE query with `ctx.serviceClient.rpc('search_bookmarks', {...})`
   - Hydrate results via `ctx.userClient.from('bookmarks').select('*, bookmark_tags(...), bookmark_folders(...)').in('id', ids)`
   - Re-sort by rank (`.in()` doesn't preserve RPC order)
   - Use `total_count` from RPC for pagination metadata

### Files
| File | Action |
|------|--------|
| `supabase/migrations/002_add_search_vector_and_rpc.sql` | Create |
| `apps/web/src/lib/postgrest-search.ts` | Edit |
| `apps/web/src/app/api/bookmarks/search/route.ts` | Edit |

---

## Phase 3: Multi-Stop-Condition Sync

Add 5 sync guards + checkpoint/resume across all sync paths.

### Steps

1. **SQL migration** — `supabase/migrations/003_add_sync_state_to_profiles.sql`
   - Add `sync_state` jsonb column to `profiles` table

2. **Create sync guard utility** — `packages/shared/src/sync-guards.ts` (NEW)
   - `createSyncGuards(config)` — factory returning `{ state, check }` 
   - 4 guards: end_of_data, stale_pages, target_reached, time_limit
   - 5th guard (caught-up) lives in each route's loop body (requires DB access)

3. **Re-export** — `packages/shared/src/index.ts`
   - Add `export * from './sync-guards'`

4. **Upgrade background sync** — `apps/web/src/app/api/sync/background/route.ts`
   - Add full pagination loop (currently single-page)
   - Wrap with `createSyncGuards({ maxStalePages: 3, maxDurationMs: 55000 })`
   - Add caught-up detection using `sync_state.newestKnownPostId` from profiles
   - Save checkpoint after sync completes
   - Keep auto-tag logic (will be upgraded in Phase 4)

5. **Upgrade import route** — `apps/web/src/app/api/bookmarks/import/route.ts`
   - Wrap existing loop with `createSyncGuards()`
   - Add caught-up detection
   - Return `stopReason` in response

6. **Upgrade extension direct-import** — `apps/extension/src/direct-import.ts`
   - Import `createSyncGuards` from `@helloagain/shared` (Vite bundles it)
   - Add stale-page tracking (3 consecutive pages with 0 new from onBatch)
   - Add timeout guard (5 minutes max)

### Files
| File | Action |
|------|--------|
| `supabase/migrations/003_add_sync_state_to_profiles.sql` | Create |
| `packages/shared/src/sync-guards.ts` | Create |
| `packages/shared/src/index.ts` | Edit |
| `apps/web/src/app/api/sync/background/route.ts` | Edit |
| `apps/web/src/app/api/bookmarks/import/route.ts` | Edit |
| `apps/extension/src/direct-import.ts` | Edit |

---

## Phase 4: Two-Tier Auto-Classification

Regex classifier runs first (instant, free) for obvious patterns; LLM handles remaining.

### Steps

1. **SQL migration** — `supabase/migrations/004_add_classification_columns.sql`
   - Add `primary_category`, `primary_domain` text columns to bookmarks
   - Add indexes on both columns

2. **Create regex classifier** — `packages/shared/src/classify-regex.ts` (NEW)
   - URL domain rules (github->tool/web-dev, arxiv->research/ai, etc.)
   - Text pattern rules (CVE->security, "npm install"->tool, etc.)
   - `classifyByRegex(contentText, urls)` returns `{ category, domain, confidence }`

3. **Re-export** — `packages/shared/src/index.ts`
   - Add `export * from './classify-regex'`

4. **Update grok.ts** — `apps/web/src/lib/grok.ts`
   - Add `sanitizeForLLM(text)` — strip prompt injection patterns, cap at 500 chars
   - Add `classifyBookmark(content, urls, customTags)` — tries regex first, then LLM
   - Apply `sanitizeForLLM()` to content before sending to autoTagBookmark

5. **Update background sync** — `apps/web/src/app/api/sync/background/route.ts`
   - Replace `autoTagBookmark()` with `classifyBookmark()`
   - Write `primary_category` + `primary_domain` to bookmark row after insert

### Files
| File | Action |
|------|--------|
| `supabase/migrations/004_add_classification_columns.sql` | Create |
| `packages/shared/src/classify-regex.ts` | Create |
| `packages/shared/src/index.ts` | Edit |
| `apps/web/src/lib/grok.ts` | Edit |
| `apps/web/src/app/api/sync/background/route.ts` | Edit |

---

## Key Design Decisions

1. **DRY upsert helper** — `apps/web/src/lib/bookmark-upsert.ts` centralizes the check-existing/partition/merge/insert/update pattern so all 3 routes stay lean.

2. **FTS RPC returns only (id, rank, total_count)** — Hydration happens via userClient with full tag/folder joins. This keeps the RPC simple and lets RLS handle the hydration query.

3. **Caught-up detection is NOT in the shared guard** — It requires DB access (`newestKnownPostId`), so it stays in each route's loop body. The shared `createSyncGuards` handles the other 4 guards.

4. **Extension can use `@helloagain/shared`** — Confirmed via `package.json` dep + existing imports in Popup/SidePanel. Vite bundles it.

5. **450 LOC limit** — The background sync route will grow the most (all 4 phases touch it). If it exceeds ~400 LOC after Phase 4, extract the sync loop into a separate helper file.

6. **Extension TweetData enrichment deferred** — The GraphQL parser could extract engagement/avatar/language but updating it requires an extension republish. The merge system works without it (lower-score records from extension just don't trigger updates until the parser is updated).

## Verification

After each phase, run:
```bash
cd packages/shared && npx tsc --noEmit    # Type-check shared package
cd apps/web && npx tsc --noEmit           # Type-check web app
cd apps/extension && npx tsc --noEmit     # Type-check extension
```

Phase-specific verification:
- **Phase 1**: Import a bookmark via batch API, re-import with richer data → verify DB row has merged fields
- **Phase 2**: Run SQL migration, search for a term → verify ranked results with GIN index
- **Phase 3**: Sync twice → second sync should stop early (caught_up or stale_pages)
- **Phase 4**: Import a github.com bookmark → verify instant category/domain without LLM call
