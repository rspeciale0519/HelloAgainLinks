import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Paginate to avoid Supabase's default 1000-row limit
  const allIds: string[] = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await ctx.serviceClient
      .from('bookmarks')
      .select('x_post_id')
      .eq('user_id', ctx.userId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    allIds.push(...rows.map((b) => b.x_post_id));
    hasMore = rows.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return NextResponse.json({ post_ids: allIds });
}
