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

    // Get current bookmark count (atomic snapshot)
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

    // Respect plan limit — only attempt to insert up to `remaining`
    const toAttempt =
      remaining === Infinity ? bookmarks : bookmarks.slice(0, remaining);
    const droppedByLimit = bookmarks.length - toAttempt.length;

    // Build rows for insert
    const rows = toAttempt.map((b: BookmarkInput) => ({
      user_id: ctx.userId,
      x_post_id: b.x_post_id,
      x_author_handle: b.x_author_handle || '',
      x_author_name: b.x_author_name || '',
      content_text: b.content_text || '',
      media_urls: b.media_urls || [],
      post_created_at: b.post_created_at || new Date().toISOString(),
      bookmarked_at: b.bookmarked_at || new Date().toISOString(),
    }));

    // Atomic upsert with ignoreDuplicates — DB handles dedup via unique constraint.
    // .select('id') returns ONLY the rows that were actually inserted (not skipped dupes).
    // Note: with ignoreDuplicates, Supabase returns only newly inserted rows.
    const { data: inserted, error } = await ctx.serviceClient
      .from('bookmarks')
      .upsert(rows, { onConflict: 'user_id,x_post_id', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error('[Batch Import] Upsert error:', error);
      return NextResponse.json(
        { error: 'Insert failed', details: error.message },
        { status: 500 }
      );
    }

    // Count actual inserts from DB response
    const imported = inserted?.length ?? 0;
    const duplicates = toAttempt.length - imported;
    const limitReached = remaining !== Infinity && (imported >= remaining || droppedByLimit > 0);

    const newRemaining =
      remaining === Infinity ? Infinity : remaining - imported;

    return NextResponse.json({
      imported,
      skipped: duplicates + droppedByLimit,
      limitReached,
      remaining: newRemaining === Infinity ? -1 : Math.max(0, newRemaining),
    });
  } catch (err) {
    console.error('[Batch Import]', err);
    return NextResponse.json({ error: 'Batch import failed' }, { status: 500 });
  }
}
