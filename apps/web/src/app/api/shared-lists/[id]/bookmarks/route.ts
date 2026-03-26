import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Get bookmarks in a shared list
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  // Check access (member or public list)
  const { data: member } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .single();

  if (!member) {
    const { data: list } = await ctx.serviceClient
      .from('shared_lists')
      .select('visibility')
      .eq('id', id)
      .single();
    if (!list || list.visibility !== 'public') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 50);
  const offset = (page - 1) * pageSize;

  const { data, error, count } = await ctx.serviceClient
    .from('shared_list_bookmarks')
    .select(`
      id, added_at, added_by,
      bookmarks:bookmark_id (
        id, x_post_id, x_author_handle, x_author_name, content_text,
        media_urls, bookmarked_at
      ),
      profiles:added_by ( display_name, x_handle )
    `, { count: 'exact' })
    .eq('list_id', id)
    .order('added_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    bookmarks: data || [],
    total: count || 0,
    page,
    pageSize,
  });
}

// Add a bookmark to a shared list (editor or owner)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json({ error: 'Shared Lists require a Pro plan.' }, { status: 403 });
  }

  const { id } = await params;

  // Check editor/owner role
  const { data: member } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .single();

  if (!member || member.role === 'viewer') {
    return NextResponse.json({ error: 'You need editor permissions to add bookmarks' }, { status: 403 });
  }

  const { bookmark_id } = await req.json();
  if (!bookmark_id) {
    return NextResponse.json({ error: 'bookmark_id is required' }, { status: 400 });
  }

  // Verify bookmark exists and belongs to user
  const { data: bookmark } = await ctx.serviceClient
    .from('bookmarks')
    .select('id')
    .eq('id', bookmark_id)
    .eq('user_id', ctx.userId)
    .single();

  if (!bookmark) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  const { data, error } = await ctx.serviceClient
    .from('shared_list_bookmarks')
    .insert({ list_id: id, bookmark_id, added_by: ctx.userId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Bookmark already in this list' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update bookmark count
  const { count: bmCount } = await ctx.serviceClient
    .from('shared_list_bookmarks')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', id);

  await ctx.serviceClient.from('shared_lists').update({
    bookmark_count: bmCount || 0,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  return NextResponse.json({ entry: data });
}

// Remove a bookmark from a shared list (editor/owner, or the person who added it)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;
  const { bookmark_id } = await req.json();

  const { data: member } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .single();

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  // Viewers can't remove. Editors can remove their own. Owners can remove any.
  if (member.role === 'viewer') {
    return NextResponse.json({ error: 'Viewers cannot remove bookmarks' }, { status: 403 });
  }

  let query = ctx.serviceClient
    .from('shared_list_bookmarks')
    .delete()
    .eq('list_id', id)
    .eq('bookmark_id', bookmark_id);

  if (member.role === 'editor') {
    query = query.eq('added_by', ctx.userId);
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
