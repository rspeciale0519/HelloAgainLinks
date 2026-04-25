import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { sanitizeFtsQuery } from '@/lib/postgrest-search';
import { searchBookmarksSchema } from '@helloagain/shared';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = searchBookmarksSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
  }

  const { q, page, pageSize, author, date_from, date_to } = parsed.data;
  const safeQuery = sanitizeFtsQuery(q);
  if (!safeQuery) {
    return NextResponse.json({ error: 'Search query contains no searchable text' }, { status: 400 });
  }

  const from = (page - 1) * pageSize;

  // Step 1: Ranked search via RPC (SECURITY DEFINER — bypasses RLS, filters by user_id)
  const { data: ranked, error: rpcError } = await ctx.serviceClient.rpc('search_bookmarks', {
    p_user_id: ctx.userId,
    p_query: safeQuery,
    p_limit: pageSize,
    p_offset: from,
    p_author: author || null,
    p_date_from: date_from || null,
    p_date_to: date_to || null,
  });

  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });

  const results = (ranked ?? []) as { id: string; rank: number; total_count: number }[];
  if (results.length === 0) {
    return NextResponse.json({ data: [], count: 0, page, pageSize, hasMore: false });
  }

  const totalCount = Number(results[0].total_count);
  const ids = results.map((r) => r.id);

  // Step 2: Hydrate full bookmark rows with tags/folders via RLS-enforced client
  const { data, error } = await ctx.userClient
    .from('bookmarks')
    .select('*, bookmark_tags(tag_id, tags(*))')
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Re-sort by rank (the .in() query doesn't preserve RPC ordering)
  const rankMap = new Map(results.map((r) => [r.id, r.rank]));
  const sorted = (data ?? []).sort((a, b) => (rankMap.get(b.id) ?? 0) - (rankMap.get(a.id) ?? 0));

  return NextResponse.json({
    data: sorted,
    count: totalCount,
    page,
    pageSize,
    hasMore: totalCount > from + pageSize,
  });
}
