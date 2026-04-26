import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { classifyBookmark } from '@/lib/grok';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { count } = await ctx.serviceClient
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .or('primary_category.is.null,ai_summary.is.null');

  return NextResponse.json({ unclassified: count ?? 0, plan: ctx.plan });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Plan gate: Pro and Lifetime only
  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'AI classification is available on Pro and Lifetime plans' },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200);

  // Find unclassified bookmarks. Treat a row as "unclassified" if it has
  // neither category/domain nor ai_summary — Phase 5 widens the definition
  // so older rows that got the regex tier but never the LLM enrichment also
  // come through to backfill.
  const { data: unclassified, error: fetchError } = await ctx.serviceClient
    .from('bookmarks')
    .select('id, content_text')
    .eq('user_id', ctx.userId)
    .or('primary_category.is.null,ai_summary.is.null')
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!unclassified || unclassified.length === 0) {
    return NextResponse.json({ classified: 0, remaining: 0 });
  }

  // Get total remaining count using the same widened definition.
  const { count: totalRemaining } = await ctx.serviceClient
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .or('primary_category.is.null,ai_summary.is.null');

  // Process in batches of 5.
  let classified = 0;
  const batchSize = 5;

  for (let i = 0; i < unclassified.length; i += batchSize) {
    const batch = unclassified.slice(i, i + batchSize);
    const promises = batch.map(async (bm) => {
      const result = await classifyBookmark(bm.content_text || '');

      // Single update — write all four enrichment columns at once. Use
      // explicit checks so we don't overwrite a previously-populated field
      // with null when the LLM tier fails for this specific bookmark.
      const update: Record<string, unknown> = {};
      if (result.category) update.primary_category = result.category;
      if (result.domain) update.primary_domain = result.domain;
      if (result.ai_summary) update.ai_summary = result.ai_summary;
      if (result.ai_tags) update.ai_tags = result.ai_tags;
      if (Object.keys(update).length > 0) {
        await ctx.serviceClient.from('bookmarks').update(update).eq('id', bm.id);
      }

      // Auto-create and link tags from the high-confidence ai_tags subset.
      for (const tagName of result.tags) {
        const { data: tag } = await ctx.serviceClient
          .from('tags')
          .upsert(
            { user_id: ctx.userId, name: tagName, color: '#00d4ff' },
            { onConflict: 'user_id,name' },
          )
          .select('id')
          .single();
        if (tag) {
          await ctx.serviceClient
            .from('bookmark_tags')
            .upsert(
              { bookmark_id: bm.id, tag_id: tag.id },
              { onConflict: 'bookmark_id,tag_id' },
            );
        }
      }

      classified++;
    });
    await Promise.all(promises);
  }

  return NextResponse.json({
    classified,
    remaining: Math.max(0, (totalRemaining ?? 0) - classified),
  });
}
