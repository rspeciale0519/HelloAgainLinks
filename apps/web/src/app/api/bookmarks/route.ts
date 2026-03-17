import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { createBookmarkSchema, listBookmarksSchema, PLAN_LIMITS } from '@helloagain/shared';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const body = await req.json();
    const parsed = createBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    // Check plan limits
    const limit = PLAN_LIMITS[ctx.plan].bookmarks;
    if (limit !== Infinity) {
      const { count } = await ctx.userClient
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.userId);
      if ((count ?? 0) >= limit) {
        return NextResponse.json({ error: `Bookmark limit reached (${limit}). Upgrade to Pro for unlimited.` }, { status: 403 });
      }
    }

    // Check dedup
    const { data: existing } = await ctx.userClient
      .from('bookmarks')
      .select('id')
      .eq('user_id', ctx.userId)
      .eq('x_post_id', parsed.data.x_post_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Bookmark already exists', id: existing.id }, { status: 409 });
    }

    const { data, error } = await ctx.userClient
      .from('bookmarks')
      .insert({ ...parsed.data, user_id: ctx.userId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const x_post_id = req.nextUrl.searchParams.get('x_post_id');
  if (!x_post_id) return NextResponse.json({ error: 'x_post_id is required' }, { status: 400 });

  const { error } = await ctx.userClient
    .from('bookmarks')
    .delete()
    .eq('user_id', ctx.userId)
    .eq('x_post_id', x_post_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = listBookmarksSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
  }

  const { page, pageSize, sort, order, author, folder_id, tag_id } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = ctx.userClient
    .from('bookmarks')
    .select('*, bookmark_tags(tag_id, tags(*)), bookmark_folders(folder_id, folders(*))', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .order(sort, { ascending: order === 'asc' })
    .range(from, to);

  if (author) query = query.eq('x_author_handle', author);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Post-filter by folder_id or tag_id if needed (join filtering)
  let filtered = data ?? [];
  if (tag_id) {
    filtered = filtered.filter((b: Record<string, unknown>) =>
      (b.bookmark_tags as Array<Record<string, unknown>>)?.some((bt) => bt.tag_id === tag_id)
    );
  }
  if (folder_id) {
    filtered = filtered.filter((b: Record<string, unknown>) =>
      (b.bookmark_folders as Array<Record<string, unknown>>)?.some((bf) => bf.folder_id === folder_id)
    );
  }

  return NextResponse.json({
    data: filtered,
    count: count ?? 0,
    page,
    pageSize,
    hasMore: (count ?? 0) > from + pageSize,
  });
}
