import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { createBookmarkSchema, listBookmarksSchema, PLAN_LIMITS } from '@helloagain/shared';

export const dynamic = 'force-dynamic';

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

  const { page, pageSize, sort, order, author, folder_id, tag_id, ids } = parsed.data;

  // "Pin to feed" mode: when ids are provided, ignore pagination/folder/tag
  // filters and just hydrate the requested rows. Used by the chat surface to
  // show cited bookmarks in the feed regardless of the user's current page.
  if (ids) {
    const idList = ids
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 100);
    if (idList.length === 0) {
      return NextResponse.json({ data: [], count: 0, page: 1, pageSize: 0, hasMore: false });
    }
    const { data, error } = await ctx.serviceClient
      .from('bookmarks')
      .select('*, bookmark_tags(tag_id, tags(*))')
      .eq('user_id', ctx.userId)
      .in('id', idList);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Preserve the request order so the most-relevant citation lands first.
    const rankMap = new Map(idList.map((id, i) => [id, i]));
    const sorted = (data ?? [])
      .slice()
      .sort((a, b) => (rankMap.get(a.id) ?? 0) - (rankMap.get(b.id) ?? 0));
    return NextResponse.json({
      data: sorted,
      count: sorted.length,
      page: 1,
      pageSize: sorted.length,
      hasMore: false,
    });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = ctx.serviceClient
    .from('bookmarks')
    .select('*, bookmark_tags(tag_id, tags(*))', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .order(sort, { ascending: order === 'asc' })
    .range(from, to);

  if (author) query = query.eq('x_author_handle', author);
  if (tag_id) query = query.eq('bookmark_tags.tag_id', tag_id);
  // Phase 3: single-folder semantics — bookmarks.folder_id is the source of truth
  if (folder_id) query = query.eq('folder_id', folder_id);

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
