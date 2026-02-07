import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;

// Start import of X bookmarks
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Get user's X tokens from profile
  const { data: profile } = await ctx.serviceClient
    .from('profiles')
    .select('x_user_id, x_access_token, x_refresh_token, x_token_expires_at')
    .eq('id', ctx.userId)
    .single();

  if (!profile?.x_access_token) {
    return NextResponse.json(
      { error: 'No X connection found. Please sign out and sign in again.' },
      { status: 400 }
    );
  }

  let accessToken = profile.x_access_token;

  // Check if token is expired and refresh if needed
  if (profile.x_token_expires_at) {
    const expiresAt = new Date(profile.x_token_expires_at).getTime();
    if (Date.now() > expiresAt - 60000) {
      // Token expired or expiring soon — try refresh
      if (profile.x_refresh_token) {
        const refreshed = await refreshXToken(profile.x_refresh_token);
        if (refreshed) {
          accessToken = refreshed.access_token;
          // Update stored tokens
          await ctx.serviceClient.from('profiles').update({
            x_access_token: refreshed.access_token,
            x_refresh_token: refreshed.refresh_token || profile.x_refresh_token,
            x_token_expires_at: refreshed.expires_in
              ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
              : null,
          }).eq('id', ctx.userId);
        } else {
          return NextResponse.json(
            { error: 'X token expired. Please sign out and sign in again.' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'X token expired. Please sign out and sign in again.' },
          { status: 401 }
        );
      }
    }
  }

  // Mark import as in progress
  await ctx.serviceClient.from('profiles').update({
    import_status: 'importing',
    import_count: 0,
  }).eq('id', ctx.userId);

  try {
    let imported = 0;
    let skipped = 0;
    let paginationToken: string | null = null;
    let hasMore = true;

    while (hasMore) {
      // Fetch bookmarks from X API
      let url = `https://api.x.com/2/users/${profile.x_user_id}/bookmarks?max_results=100&tweet.fields=created_at,author_id,text&expansions=author_id&user.fields=username,name,profile_image_url`;
      if (paginationToken) url += `&pagination_token=${paginationToken}`;

      const xRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!xRes.ok) {
        const errBody = await xRes.text();
        console.error('[Import] X API error:', xRes.status, errBody);

        if (xRes.status === 429) {
          // Rate limited — save progress and tell user
          await ctx.serviceClient.from('profiles').update({
            import_status: 'rate_limited',
            import_count: imported,
          }).eq('id', ctx.userId);

          return NextResponse.json({
            status: 'rate_limited',
            imported,
            skipped,
            message: `Imported ${imported} bookmarks. Hit X rate limit — try again in 15 minutes for the rest.`,
          });
        }

        break;
      }

      const data = await xRes.json();
      const tweets = data.data || [];
      const users = data.includes?.users || [];

      if (tweets.length === 0) {
        hasMore = false;
        break;
      }

      // Build user lookup
      const userMap = new Map<string, { username: string; name: string }>();
      for (const u of users) {
        userMap.set(u.id, { username: u.username, name: u.name });
      }

      // Insert bookmarks (skip duplicates)
      for (const tweet of tweets) {
        const author = userMap.get(tweet.author_id) || { username: 'unknown', name: '' };

        const { error: insertErr } = await ctx.serviceClient
          .from('bookmarks')
          .insert({
            user_id: ctx.userId,
            x_post_id: tweet.id,
            x_author_handle: author.username,
            x_author_name: author.name,
            content_text: tweet.text || '',
            media_urls: [],
            post_created_at: tweet.created_at || new Date().toISOString(),
            bookmarked_at: new Date().toISOString(),
          });

        if (insertErr) {
          // Likely duplicate (unique constraint on x_post_id + user_id)
          skipped++;
        } else {
          imported++;
        }
      }

      // Update progress
      await ctx.serviceClient.from('profiles').update({
        import_count: imported,
      }).eq('id', ctx.userId);

      // Check for more pages
      paginationToken = data.meta?.next_token || null;
      hasMore = !!paginationToken;

      // Small delay to be respectful of rate limits
      if (hasMore) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    // Mark complete
    await ctx.serviceClient.from('profiles').update({
      import_status: 'complete',
      import_count: imported,
    }).eq('id', ctx.userId);

    return NextResponse.json({
      status: 'complete',
      imported,
      skipped,
      message: `Done! Imported ${imported} bookmarks${skipped > 0 ? ` (${skipped} already existed)` : ''}.`,
    });
  } catch (err) {
    console.error('[Import] Error:', err);
    await ctx.serviceClient.from('profiles').update({
      import_status: 'error',
    }).eq('id', ctx.userId);

    return NextResponse.json({ error: 'Import failed unexpectedly' }, { status: 500 });
  }
}

// Get import status
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { data: profile } = await ctx.serviceClient
    .from('profiles')
    .select('import_status, import_count')
    .eq('id', ctx.userId)
    .single();

  return NextResponse.json({
    status: profile?.import_status || null,
    count: profile?.import_count || 0,
  });
}

async function refreshXToken(refreshToken: string) {
  try {
    const basicAuth = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
    const res = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
