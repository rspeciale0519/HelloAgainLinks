import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase-server';
import { mergeUpsertBookmarks } from '@/lib/bookmark-upsert';
import { autoTagBookmark } from '@/lib/grok';
import { refreshXToken } from '@/lib/x-auth';
import { createSyncGuards } from '@helloagain/shared';

const CRON_SECRET = process.env.BOOKMARK_SYNC_SECRET;
const SYNC_TIMEOUT_MS = Number(process.env.SYNC_TIMEOUT_MS) || 55_000;

interface SyncResult {
  imported: number;
  skipped: number;
  stopReason: string | null;
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
    return { imported: 0, skipped: 0, stopReason: null };
  }

  let accessToken = profile.x_access_token;
  if (profile.x_token_expires_at && Date.now() > new Date(profile.x_token_expires_at).getTime() - 60000) {
    if (!profile.x_refresh_token) return { imported: 0, skipped: 0, stopReason: null };
    const refreshed = await refreshXToken(profile.x_refresh_token);
    if (!refreshed) return { imported: 0, skipped: 0, stopReason: null };
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

  let imported = 0;
  let skipped = 0;
  let paginationToken: string | undefined;
  let firstPageFirstId: string | null = null;
  let caughtUp = false;
  const allInsertedRows: { id: string; content_text?: string }[] = [];

  do {
    const url = new URL(`https://api.x.com/2/users/${profile.x_user_id}/bookmarks`);
    url.searchParams.set('max_results', '100');
    url.searchParams.set('tweet.fields', 'created_at,author_id,text');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'username,name');
    if (paginationToken) url.searchParams.set('pagination_token', paginationToken);

    const xRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!xRes.ok) break;

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
        bookmarked_at: new Date().toISOString(),
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

  // Auto-tag newly created bookmarks
  for (const bm of allInsertedRows) {
    const tags = await autoTagBookmark(bm.content_text || '');
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

  return { imported, skipped, stopReason: guards.state.stopReason || (caughtUp ? 'caught_up' : null) };
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

  const result = await syncUser(ctx.serviceClient, ctx.userId);
  return NextResponse.json({ mode: 'user', userId: ctx.userId, ...result });
}
