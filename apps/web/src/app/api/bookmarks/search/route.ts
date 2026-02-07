import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { searchBookmarksSchema } from '@helloagain/shared';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = searchBookmarksSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
  }

  const { q, page, pageSize, author, date_from, date_to } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Use Supabase full-text search via textSearch
  let query = ctx.userClient
    .from('bookmarks')
    .select('*, bookmark_tags(tag_id, tags(*)), bookmark_folders(folder_id, folders(*))', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .textSearch('content_text', q, { type: 'websearch' })
    .range(from, to)
    .order('bookmarked_at', { ascending: false });

  if (author) query = query.eq('x_author_handle', author);
  if (date_from) query = query.gte('bookmarked_at', date_from);
  if (date_to) query = query.lte('bookmarked_at', date_to);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    count: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > from + pageSize,
  });
}
