import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { batchImportSchema, PLAN_LIMITS, type BatchImportInput } from '@helloagain/shared';

type BookmarkInput = BatchImportInput['bookmarks'][number];

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const body = await req.json();
    const parsed = batchImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { bookmarks } = parsed.data;
    const limit = PLAN_LIMITS[ctx.plan].bookmarks;

    // Get current bookmark count
    const { count: currentCount } = await ctx.serviceClient
      .from('bookmarks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);

    const remaining = limit === Infinity ? Infinity : limit - (currentCount ?? 0);

    if (remaining !== Infinity && remaining <= 0) {
      return NextResponse.json({
        imported: 0,
        skipped: bookmarks.length,
        limitReached: true,
        remaining: 0,
      });
    }

    // Dedup against existing bookmarks in one query
    const postIds = bookmarks.map((b: BookmarkInput) => b.x_post_id);
    const { data: existing } = await ctx.serviceClient
      .from('bookmarks')
      .select('x_post_id')
      .eq('user_id', ctx.userId)
      .in('x_post_id', postIds);

    const existingSet = new Set((existing || []).map((e: { x_post_id: string }) => e.x_post_id));
    const newBookmarks = bookmarks.filter((b: BookmarkInput) => !existingSet.has(b.x_post_id));
    const skipped = bookmarks.length - newBookmarks.length;

    // Respect plan limit
    const canInsert =
      remaining === Infinity ? newBookmarks : newBookmarks.slice(0, remaining);
    const limitReached =
      remaining !== Infinity && newBookmarks.length > remaining;

    let imported = 0;
    if (canInsert.length > 0) {
      const rows = canInsert.map((b: BookmarkInput) => ({
        user_id: ctx.userId,
        x_post_id: b.x_post_id,
        x_author_handle: b.x_author_handle || '',
        x_author_name: b.x_author_name || '',
        content_text: b.content_text || '',
        media_urls: b.media_urls || [],
        post_created_at: b.post_created_at || new Date().toISOString(),
        bookmarked_at: b.bookmarked_at || new Date().toISOString(),
      }));

      const { error } = await ctx.serviceClient.from('bookmarks').insert(rows);
      if (error) {
        console.error('[Batch Import] Insert error:', error);
        return NextResponse.json(
          { error: 'Insert failed', details: error.message },
          { status: 500 }
        );
      }
      imported = canInsert.length;
    }

    const newRemaining =
      remaining === Infinity ? Infinity : remaining - imported;

    return NextResponse.json({
      imported,
      skipped: skipped + (newBookmarks.length - canInsert.length),
      limitReached,
      remaining: newRemaining === Infinity ? -1 : newRemaining,
    });
  } catch (err) {
    console.error('[Batch Import]', err);
    return NextResponse.json({ error: 'Batch import failed' }, { status: 500 });
  }
}
