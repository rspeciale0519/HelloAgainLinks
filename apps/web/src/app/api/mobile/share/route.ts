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
      // 409 — the shipped MobileShareSheet binary distinguishes duplicates by
      // HTTP status (a 200 body rendered as a fresh save; 2026-07-31 audit
      // defect #5). `status: 'exists'` kept for any body-reading consumer.
      return NextResponse.json(
        { status: 'exists', id: existing.id, error: 'duplicate' },
        { status: 409 },
      );
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
      .select('id, content_text, x_author_handle')
      .single();

    if (error || !created) {
      return NextResponse.json({ error: error?.message || 'Failed to save bookmark' }, { status: 500 });
    }

    // Trigger AI auto-tag immediately using existing tagging stack
    const tags = await autoTagBookmark(created.content_text || url);
    const appliedTags: { name: string; color: string }[] = [];
    for (const tagName of tags) {
      const { data: tag } = await ctx.serviceClient
        .from('tags')
        .upsert({ user_id: ctx.userId, name: tagName, color: '#00d4ff' }, { onConflict: 'user_id,name' })
        .select('id, name, color')
        .single();

      if (tag) {
        await ctx.serviceClient
          .from('bookmark_tags')
          .upsert({ bookmark_id: created.id, tag_id: tag.id }, { onConflict: 'bookmark_id,tag_id' });
        appliedTags.push({ name: tag.name, color: tag.color });
      }
    }

    // `bookmark` is the shape the shipped MobileShareSheet reads (it was
    // previously absent, so shared saves always rendered without tags).
    return NextResponse.json({
      status: 'saved',
      id: created.id,
      tags,
      bookmark: {
        id: created.id,
        content_text: created.content_text,
        x_author_handle: created.x_author_handle,
        bookmark_tags: appliedTags.map((t) => ({ tags: t })),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
