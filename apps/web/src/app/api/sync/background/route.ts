import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase-server';
import { autoTagBookmark } from '@/lib/grok';

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const CRON_SECRET = process.env.BOOKMARK_SYNC_SECRET;

async function refreshXToken(refreshToken: string) {
  const basicAuth = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  return await res.json();
}

async function syncUser(serviceClient: ReturnType<typeof getServiceClient>, userId: string) {
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('x_user_id, x_access_token, x_refresh_token, x_token_expires_at')
    .eq('id', userId)
    .single();

  if (!profile?.x_access_token || !profile?.x_user_id) return { imported: 0, skipped: 0 };

  let accessToken = profile.x_access_token;
  if (profile.x_token_expires_at && Date.now() > new Date(profile.x_token_expires_at).getTime() - 60000) {
    if (!profile.x_refresh_token) return { imported: 0, skipped: 0 };
    const refreshed = await refreshXToken(profile.x_refresh_token);
    if (!refreshed) return { imported: 0, skipped: 0 };
    accessToken = refreshed.access_token;
    await serviceClient.from('profiles').update({
      x_access_token: refreshed.access_token,
      x_refresh_token: refreshed.refresh_token || profile.x_refresh_token,
      x_token_expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
    }).eq('id', userId);
  }

  let imported = 0;
  let skipped = 0;

  const url = `https://api.x.com/2/users/${profile.x_user_id}/bookmarks?max_results=100&tweet.fields=created_at,author_id,text&expansions=author_id&user.fields=username,name`;
  const xRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!xRes.ok) return { imported, skipped };

  const data = await xRes.json();
  const tweets = data.data || [];
  const users = data.includes?.users || [];
  const userMap = new Map<string, { username: string; name: string }>();
  for (const u of users) userMap.set(u.id, { username: u.username, name: u.name });

  for (const tweet of tweets) {
    const author = userMap.get(tweet.author_id) || { username: 'unknown', name: '' };
    const { data: created, error } = await serviceClient
      .from('bookmarks')
      .insert({
        user_id: userId,
        x_post_id: tweet.id,
        x_author_handle: author.username,
        x_author_name: author.name,
        content_text: tweet.text || '',
        media_urls: [],
        post_created_at: tweet.created_at || new Date().toISOString(),
        bookmarked_at: new Date().toISOString(),
      })
      .select('id, content_text')
      .single();

    if (error || !created) {
      skipped++;
      continue;
    }
    imported++;

    const tags = await autoTagBookmark(created.content_text || '');
    for (const tagName of tags) {
      const { data: tag } = await serviceClient
        .from('tags')
        .upsert({ user_id: userId, name: tagName, color: '#00d4ff' }, { onConflict: 'user_id,name' })
        .select('id')
        .single();
      if (tag) {
        await serviceClient.from('bookmark_tags').upsert({ bookmark_id: created.id, tag_id: tag.id }, { onConflict: 'bookmark_id,tag_id' });
      }
    }
  }

  return { imported, skipped };
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
