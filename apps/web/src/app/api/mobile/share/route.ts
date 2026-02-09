import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { autoTagBookmark } from '@/lib/grok';

function extractPostId(url: string): string | null {
  const match = url.match(/status\/(\d+)/i);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing shared URL' }, { status: 400 });
    }

    const xPostId = extractPostId(url);
    if (!xPostId) {
      return NextResponse.json({ error: 'Invalid X/Twitter URL' }, { status: 400 });
    }

    const { data: existing } = await ctx.serviceClient
      .from('bookmarks')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('x_post_id', xPostId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ status: 'exists', id: existing.id });
    }

    const { data: created, error } = await ctx.serviceClient
      .from('bookmarks')
      .insert({
        user_id: ctx.userId,
        x_post_id: xPostId,
        x_author_handle: 'unknown',
        x_author_name: '',
        content_text: url,
        media_urls: [],
        bookmarked_at: new Date().toISOString(),
      })
      .select('id, content_text')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Failed to save bookmark' }, { status: 500 });
    }

    // Trigger AI auto-tag immediately using existing tagging stack
    const tags = await autoTagBookmark(created.content_text || url);
    for (const tagName of tags) {
      const { data: tag } = await ctx.serviceClient
        .from('tags')
        .upsert({ user_id: ctx.userId, name: tagName, color: '#00d4ff' }, { onConflict: 'user_id,name' })
        .select('id')
        .single();

      if (tag) {
        await ctx.serviceClient
          .from('bookmark_tags')
          .upsert({ bookmark_id: created.id, tag_id: tag.id }, { onConflict: 'bookmark_id,tag_id' });
      }
    }

    return NextResponse.json({ status: 'saved', id: created.id, tags });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
