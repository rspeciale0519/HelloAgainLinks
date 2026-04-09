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
    .is('primary_category', null)
    .is('primary_domain', null);

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

  // Find unclassified bookmarks
  const { data: unclassified, error: fetchError } = await ctx.serviceClient
    .from('bookmarks')
    .select('id, content_text')
    .eq('user_id', ctx.userId)
    .is('primary_category', null)
    .is('primary_domain', null)
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!unclassified || unclassified.length === 0) {
    return NextResponse.json({ classified: 0, remaining: 0 });
  }

  // Get total remaining count
  const { count: totalRemaining } = await ctx.serviceClient
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .is('primary_category', null)
    .is('primary_domain', null);

  // Process in batches of 5
  let classified = 0;
  const batchSize = 5;

  for (let i = 0; i < unclassified.length; i += batchSize) {
    const batch = unclassified.slice(i, i + batchSize);
    const promises = batch.map(async (bm) => {
      const { tags, category, domain } = await classifyBookmark(bm.content_text || '');

      // Update classification
      if (category || domain) {
        await ctx.serviceClient
          .from('bookmarks')
          .update({
            ...(category ? { primary_category: category } : {}),
            ...(domain ? { primary_domain: domain } : {}),
          })
          .eq('id', bm.id);
      }

      // Auto-create and link tags
      for (const tagName of tags) {
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
