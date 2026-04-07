import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { mergeUpsertBookmarks } from '@/lib/bookmark-upsert';
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

    const toAttempt =
      remaining === Infinity ? bookmarks : bookmarks.slice(0, remaining);
    const droppedByLimit = bookmarks.length - toAttempt.length;

    const rows = toAttempt.map((b: BookmarkInput) => ({
      user_id: ctx.userId,
      x_post_id: b.x_post_id,
      x_author_handle: b.x_author_handle || '',
      x_author_name: b.x_author_name || '',
      content_text: b.content_text || '',
      media_urls: b.media_urls || [],
      post_created_at: b.post_created_at || new Date().toISOString(),
      bookmarked_at: b.bookmarked_at || new Date().toISOString(),
      x_author_avatar_url: b.x_author_avatar_url || null,
      engagement: b.engagement || null,
      language: b.language || null,
      conversation_id: b.conversation_id || null,
      in_reply_to_status_id: b.in_reply_to_status_id || null,
      quoted_status_id: b.quoted_status_id || null,
      possibly_sensitive: b.possibly_sensitive ?? false,
      ingested_via: b.ingested_via || 'extension',
    }));

    const result = await mergeUpsertBookmarks(ctx.serviceClient, ctx.userId, rows);

    const totalProcessed = result.inserted + result.updated;
    const limitReached = remaining !== Infinity && (totalProcessed >= remaining || droppedByLimit > 0);
    const newRemaining =
      remaining === Infinity ? Infinity : remaining - result.inserted;

    return NextResponse.json({
      imported: result.inserted,
      updated: result.updated,
      skipped: result.skipped + droppedByLimit,
      limitReached,
      remaining: newRemaining === Infinity ? -1 : Math.max(0, newRemaining),
    });
  } catch (err) {
    console.error('[Batch Import]', err);
    return NextResponse.json({ error: 'Batch import failed' }, { status: 500 });
  }
}
