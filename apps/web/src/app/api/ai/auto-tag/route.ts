import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { autoTagBookmark, autoTagBatch } from '@/lib/grok';
import { enforceQuota } from '@/lib/quota';

// Auto-tag a single bookmark or batch
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json({ error: 'Auto-tagging requires Pro plan' }, { status: 403 });
  }

  const denied = await enforceQuota(ctx.serviceClient, ctx.userId, ctx.plan, 'ai_op');
  if (denied) return denied;

  try {
    const body = await req.json();

    // Get user's custom tags for personalized tagging
    const { data: userTags } = await ctx.serviceClient
      .from('tags')
      .select('name')
      .eq('user_id', ctx.userId);
    const customTags = (userTags || []).map((t: { name: string }) => t.name);

    // Single bookmark
    if (body.bookmarkId) {
      const { data: bookmark } = await ctx.serviceClient
        .from('bookmarks')
        .select('content_text')
        .eq('id', body.bookmarkId)
        .eq('user_id', ctx.userId)
        .single();

      if (!bookmark) {
        return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
      }

      const tags = await autoTagBookmark(bookmark.content_text, customTags);

      // Create tags that don't exist and link them
      for (const tagName of tags) {
        // Upsert tag
        const { data: tag } = await ctx.serviceClient
          .from('tags')
          .upsert(
            { user_id: ctx.userId, name: tagName, color: '#00d4ff' },
            { onConflict: 'user_id,name' }
          )
          .select('id')
          .single();

        if (tag) {
          await ctx.serviceClient
            .from('bookmark_tags')
            .upsert(
              { bookmark_id: body.bookmarkId, tag_id: tag.id },
              { onConflict: 'bookmark_id,tag_id' }
            );
        }
      }

      return NextResponse.json({ tags, bookmarkId: body.bookmarkId });
    }

    // Batch: auto-tag multiple bookmarks
    if (body.bookmarkIds && Array.isArray(body.bookmarkIds)) {
      const { data: bookmarks } = await ctx.serviceClient
        .from('bookmarks')
        .select('id, content_text')
        .in('id', body.bookmarkIds)
        .eq('user_id', ctx.userId);

      if (!bookmarks || bookmarks.length === 0) {
        return NextResponse.json({ error: 'No bookmarks found' }, { status: 404 });
      }

      const tagMap = await autoTagBatch(
        bookmarks.map((b: { id: string; content_text: string }) => ({
          id: b.id,
          content: b.content_text,
        })),
        customTags
      );

      // Apply tags to each bookmark
      const results: Record<string, string[]> = {};
      for (const [bookmarkId, tags] of tagMap) {
        results[bookmarkId] = tags;
        for (const tagName of tags) {
          const { data: tag } = await ctx.serviceClient
            .from('tags')
            .upsert(
              { user_id: ctx.userId, name: tagName, color: '#00d4ff' },
              { onConflict: 'user_id,name' }
            )
            .select('id')
            .single();

          if (tag) {
            await ctx.serviceClient
              .from('bookmark_tags')
              .upsert(
                { bookmark_id: bookmarkId, tag_id: tag.id },
                { onConflict: 'bookmark_id,tag_id' }
              );
          }
        }
      }

      return NextResponse.json({ results, count: Object.keys(results).length });
    }

    return NextResponse.json({ error: 'Provide bookmarkId or bookmarkIds' }, { status: 400 });
  } catch (err) {
    console.error('[Auto-tag]', err);
    return NextResponse.json({ error: 'Auto-tagging failed' }, { status: 500 });
  }
}
