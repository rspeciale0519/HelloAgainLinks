import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase-server';
import { mergeUpsertBookmarks } from '@/lib/bookmark-upsert';
import { classifyBookmark } from '@/lib/grok';
import { refreshXToken } from '@/lib/x-auth';
import { enforceQuota } from '@/lib/quota';
import { createSyncGuards } from '@helloagain/shared';

const CRON_SECRET = process.env.BOOKMARK_SYNC_SECRET;
const SYNC_TIMEOUT_MS = Number(process.env.SYNC_TIMEOUT_MS) || 55_000;

// X bills owned reads (GET /2/users/{id}/bookmarks) PER RESOURCE RETURNED —
// $0.001 each — so page size is a direct cost lever, not just a perf knob.
// A caught-up incremental sync used to pull a full 100 bookmarks just to learn
// that 0 were new (~$0.10 a run, on a 2-minute auto-sync throttle). Pull a small
// page instead: the guard loop already paginates when there genuinely IS new
// data, so a burst of new saves still syncs fully — it just costs in proportion
// to what actually changed. Backfill (no known cursor) keeps the big page.
const BACKFILL_PAGE_SIZE = 100;
const INCREMENTAL_PAGE_SIZE = Number(process.env.SYNC_INCREMENTAL_PAGE_SIZE) || 10;

// Asking X to expand author_id returns a user object per author, which appears
// to bill separately from the bookmark itself (a 4-request sync cost $0.30 when
// the bookmarks alone should have been ~$0.04). Set
// SYNC_INCLUDE_AUTHOR_EXPANSION=false to drop the expansion and compare cost.
// Safe to leave off: we already store x_author_handle/x_author_name, and any row
// imported without author data is healed by the merge scoring on a later sync
// that does include it.
const INCLUDE_AUTHOR_EXPANSION = process.env.SYNC_INCLUDE_AUTHOR_EXPANSION !== 'false';

/**
 * Why a sync could not run at all, as opposed to running and finding nothing.
 * These used to return imported: 0 silently, which the UI rendered as
 * "Up to date — no new bookmarks" — i.e. a broken X connection was reported to
 * the user as success, and nothing was logged server-side either.
 */
export type SyncBlocker = 'x_not_connected' | 'x_reauth_required';

interface SyncResult {
  imported: number;
  skipped: number;
  stopReason: string | null;
  xApiError?: { status: number } | null;
  blocker?: SyncBlocker | null;
}

async function syncUser(
  serviceClient: ReturnType<typeof getServiceClient>,
  userId: string,
): Promise<SyncResult> {
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('x_user_id, x_access_token, x_refresh_token, x_token_expires_at, sync_state')
    .eq('id', userId)
    .single();

  if (!profile?.x_access_token || !profile?.x_user_id) {
    console.error(`[Sync] user ${userId}: no X account connected`);
    return { imported: 0, skipped: 0, stopReason: null, blocker: 'x_not_connected' };
  }

  let accessToken = profile.x_access_token;
  if (profile.x_token_expires_at && Date.now() > new Date(profile.x_token_expires_at).getTime() - 60000) {
    if (!profile.x_refresh_token) {
      console.error(`[Sync] user ${userId}: X token expired and no refresh token stored`);
      return { imported: 0, skipped: 0, stopReason: null, blocker: 'x_reauth_required' };
    }
    const refreshed = await refreshXToken(profile.x_refresh_token);
    if (!refreshed) {
      console.error(`[Sync] user ${userId}: X token refresh failed`);
      return { imported: 0, skipped: 0, stopReason: null, blocker: 'x_reauth_required' };
    }
    accessToken = refreshed.access_token;
    await serviceClient.from('profiles').update({
      x_access_token: refreshed.access_token,
      x_refresh_token: refreshed.refresh_token || profile.x_refresh_token,
      x_token_expires_at: refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
        : null,
    }).eq('id', userId);
  }

  const guards = createSyncGuards({
    maxStalePages: 3,
    maxDurationMs: SYNC_TIMEOUT_MS,
  });

  const syncState = profile.sync_state as Record<string, unknown> | null;
  const newestKnownId = (syncState?.newestKnownPostId as string) || null;

  // Known cursor => incremental catch-up (cheap pages). No cursor => first-run
  // backfill, where large pages are the efficient choice.
  const pageSize = newestKnownId ? INCREMENTAL_PAGE_SIZE : BACKFILL_PAGE_SIZE;

  let imported = 0;
  let skipped = 0;
  let paginationToken: string | undefined;
  let firstPageFirstId: string | null = null;
  let caughtUp = false;
  let xApiError: { status: number } | null = null;
  const allInsertedRows: { id: string; content_text?: string }[] = [];

  // X returns bookmarks newest-saved-first, and that ordering is the ONLY signal
  // of when the user saved something — the API never reports a bookmark time.
  // Stamping every row with new Date() threw it away and tied whole batches to a
  // single timestamp (296 rows share one today), which is why "Recent" showed
  // arbitrary posts. Walking a cursor backwards preserves the received order.
  const syncStartedMs = Date.now();
  let ingestOffset = 0;

  do {
    const url = new URL(`https://api.x.com/2/users/${profile.x_user_id}/bookmarks`);
    url.searchParams.set('max_results', String(pageSize));
    url.searchParams.set('tweet.fields', 'created_at,author_id,text');
    if (INCLUDE_AUTHOR_EXPANSION) {
      url.searchParams.set('expansions', 'author_id');
      url.searchParams.set('user.fields', 'username,name');
    }
    if (paginationToken) url.searchParams.set('pagination_token', paginationToken);

    const xRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!xRes.ok) {
      console.error(`[Sync] X API error ${xRes.status}:`, await xRes.text().catch(() => ''));
      xApiError = { status: xRes.status };
      break;
    }

    const data = await xRes.json();
    const tweets: Record<string, string>[] = data.data || [];
    const users: { id: string; username: string; name: string }[] = data.includes?.users || [];
    const userMap = new Map(users.map((u) => [u.id, { username: u.username, name: u.name }]));

    if (!firstPageFirstId && tweets.length > 0) {
      firstPageFirstId = tweets[0].id;
    }

    // Guard 5: Caught-up detection
    if (newestKnownId && tweets.some((t) => t.id === newestKnownId)) {
      caughtUp = true;
    }

    const rows = tweets.map((tweet) => {
      const author = userMap.get(tweet.author_id) || { username: 'unknown', name: '' };
      return {
        user_id: userId,
        x_post_id: tweet.id,
        x_author_handle: author.username,
        x_author_name: author.name,
        content_text: tweet.text || '',
        media_urls: [] as string[],
        post_created_at: tweet.created_at || new Date().toISOString(),
        // Descending by position, so the first item X returned stays the newest.
        bookmarked_at: new Date(syncStartedMs - ingestOffset++ * 1000).toISOString(),
        ingested_via: 'api' as const,
      };
    });

    const result = await mergeUpsertBookmarks(serviceClient, userId, rows);
    imported += result.inserted;
    skipped += result.skipped;
    allInsertedRows.push(...result.insertedRows);

    paginationToken = data.meta?.next_token;

    const stopReason = guards.check(result.inserted, !!paginationToken);
    if (stopReason || caughtUp) break;
  } while (true);

  // Save checkpoint
  await serviceClient.from('profiles').update({
    sync_state: {
      lastSyncAt: new Date().toISOString(),
      lastCursor: paginationToken || null,
      stopReason: guards.state.stopReason || (caughtUp ? 'caught_up' : 'end_of_data'),
      totalSynced: imported,
      newestKnownPostId: firstPageFirstId || newestKnownId,
    },
  }).eq('id', userId);

  // Two-tier classify + auto-tag newly created bookmarks
  for (const bm of allInsertedRows) {
    const { tags, category, domain, ai_summary, ai_tags } = await classifyBookmark(
      bm.content_text || ''
    );

    // Write all four enrichment columns, like /api/bookmarks/classify does —
    // dropping ai_summary/ai_tags here left sync-imported rows without the
    // Spread analysis surface (2026-07-31 audit defect #7).
    if (category || domain || ai_summary || ai_tags) {
      await serviceClient
        .from('bookmarks')
        .update({
          ...(category ? { primary_category: category } : {}),
          ...(domain ? { primary_domain: domain } : {}),
          ...(ai_summary ? { ai_summary } : {}),
          ...(ai_tags ? { ai_tags } : {}),
        })
        .eq('id', bm.id);
    }

    for (const tagName of tags) {
      const { data: tag } = await serviceClient
        .from('tags')
        .upsert({ user_id: userId, name: tagName, color: '#00d4ff' }, { onConflict: 'user_id,name' })
        .select('id')
        .single();
      if (tag) {
        await serviceClient
          .from('bookmark_tags')
          .upsert({ bookmark_id: bm.id, tag_id: tag.id }, { onConflict: 'bookmark_id,tag_id' });
      }
    }
  }

  return { imported, skipped, stopReason: guards.state.stopReason || (caughtUp ? 'caught_up' : null), xApiError };
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('x-bookmark-sync-secret');

  // Cron mode (sync all connected users)
  if (CRON_SECRET && authHeader === CRON_SECRET) {
    const serviceClient = getServiceClient();
    const { data: users } = await serviceClient
      .from('profiles')
      .select('id')
      .not('x_access_token', 'is', null)
      .limit(100);

    const summary = [];
    for (const u of users || []) {
      const res = await syncUser(serviceClient, u.id);
      summary.push({ userId: u.id, ...res });
    }

    return NextResponse.json({ mode: 'cron', syncedUsers: summary.length, summary });
  }

  // User-triggered mode (sync current authenticated user)
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Each sync spends X API credits (owned reads bill per resource returned) and
  // draws on the shared 2M-reads/month platform cap. The client-side throttle in
  // use-auto-sync.ts is bypassable by calling this route directly, so the quota
  // here is the real control.
  const denied = await enforceQuota(ctx.serviceClient, ctx.userId, ctx.plan, 'sync');
  if (denied) return denied;

  const result = await syncUser(ctx.serviceClient, ctx.userId);
  return NextResponse.json({ mode: 'user', userId: ctx.userId, ...result });
}
