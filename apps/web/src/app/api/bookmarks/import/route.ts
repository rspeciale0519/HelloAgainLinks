import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { mergeUpsertBookmarks } from '@/lib/bookmark-upsert';
import { PLAN_LIMITS } from '@helloagain/shared';

interface XBookmark {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  attachments?: {
    media_keys?: string[];
  };
}

interface XUser {
  id: string;
  username: string;
  name: string;
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const { x_access_token, x_user_id } = (await req.json()) as {
      x_access_token: string;
      x_user_id: string;
    };

    if (!x_access_token || !x_user_id) {
      return NextResponse.json({ error: 'Missing x_access_token or x_user_id' }, { status: 400 });
    }

    const limit = PLAN_LIMITS[ctx.plan].bookmarks;
    const { count: currentCount } = await ctx.serviceClient
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);

    let totalImported = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let paginationToken: string | undefined;
    const remaining = limit === Infinity ? Infinity : limit - (currentCount ?? 0);

    do {
      const url = new URL(`https://api.x.com/2/users/${x_user_id}/bookmarks`);
      url.searchParams.set('max_results', '100');
      url.searchParams.set('tweet.fields', 'created_at,author_id,attachments');
      url.searchParams.set('expansions', 'author_id');
      url.searchParams.set('user.fields', 'username,name');
      if (paginationToken) url.searchParams.set('pagination_token', paginationToken);

      const xRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${x_access_token}` },
      });

      if (!xRes.ok) {
        const err = await xRes.json().catch(() => ({}));
        return NextResponse.json(
          {
            error: 'X API error',
            details: err,
            imported: totalImported,
            skipped: totalSkipped,
          },
          { status: xRes.status === 429 ? 429 : 502 }
        );
      }

      const xData = await xRes.json();
      const tweets: XBookmark[] = xData.data || [];
      const users: XUser[] = xData.includes?.users || [];
      const userMap = new Map(users.map((u) => [u.id, u]));

      const rows = tweets.map((tweet) => {
        const author = userMap.get(tweet.author_id || '');
        return {
          user_id: ctx.userId,
          x_post_id: tweet.id,
          x_author_handle: author?.username || '',
          x_author_name: author?.name || '',
          content_text: tweet.text || '',
          media_urls: [] as string[],
          post_created_at: tweet.created_at || new Date().toISOString(),
          bookmarked_at: new Date().toISOString(),
          ingested_via: 'api' as const,
        };
      });

      // Respect plan limit — cap rows before merge
      const canAttempt = remaining === Infinity
        ? rows
        : rows.slice(0, remaining - totalImported);

      const result = await mergeUpsertBookmarks(ctx.serviceClient, ctx.userId, canAttempt);
      totalImported += result.inserted;
      totalUpdated += result.updated;
      totalSkipped += result.skipped + (rows.length - canAttempt.length);

      paginationToken = xData.meta?.next_token;

      if (remaining !== Infinity && totalImported >= remaining) break;
    } while (paginationToken);

    return NextResponse.json({
      imported: totalImported,
      updated: totalUpdated,
      skipped: totalSkipped,
      limitReached: remaining !== Infinity && totalImported >= remaining,
    });
  } catch (err) {
    console.error('[Import]', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
