import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
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

    // Check current bookmark count for plan limit
    const limit = PLAN_LIMITS[ctx.plan].bookmarks;
    const { count: currentCount } = await ctx.userClient
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);

    let totalImported = 0;
    let totalSkipped = 0;
    let paginationToken: string | undefined;
    const remaining = limit === Infinity ? Infinity : limit - (currentCount ?? 0);

    do {
      // Fetch bookmarks from X API v2
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

      // Prepare rows
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
        };
      });

      // Deduplicate against existing
      const postIds = rows.map((r) => r.x_post_id);
      const { data: existing } = await ctx.userClient
        .from('bookmarks')
        .select('x_post_id')
        .eq('user_id', ctx.userId)
        .in('x_post_id', postIds);

      const existingSet = new Set((existing || []).map((e) => e.x_post_id));
      const newRows = rows.filter((r) => !existingSet.has(r.x_post_id));
      totalSkipped += rows.length - newRows.length;

      // Respect plan limit
      const canInsert = remaining === Infinity ? newRows : newRows.slice(0, remaining - totalImported);

      if (canInsert.length > 0) {
        const { error } = await ctx.userClient.from('bookmarks').insert(canInsert);
        if (error) {
          console.error('[Import] Insert error:', error);
        } else {
          totalImported += canInsert.length;
        }
      }

      paginationToken = xData.meta?.next_token;

      // Stop if at limit
      if (remaining !== Infinity && totalImported >= remaining) break;
    } while (paginationToken);

    return NextResponse.json({
      imported: totalImported,
      skipped: totalSkipped,
      limitReached: remaining !== Infinity && totalImported >= remaining,
    });
  } catch (err) {
    console.error('[Import]', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
