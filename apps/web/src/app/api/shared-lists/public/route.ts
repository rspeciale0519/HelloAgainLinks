import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';
import { sanitizePostgrestSearchTerm } from '@/lib/postgrest-search';

// Browse public shared lists (no auth required)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(url.searchParams.get('pageSize') || '20'), 50);
  const sort = url.searchParams.get('sort') || 'bookmark_count';
  const search = url.searchParams.get('q');
  const offset = (page - 1) * pageSize;

  const serviceClient = getServiceClient();

  let query = serviceClient
    .from('shared_lists')
    .select(`
      id, name, description, slug, bookmark_count, member_count, created_at,
      profiles:owner_id ( display_name, x_handle, avatar_url )
    `, { count: 'exact' })
    .eq('visibility', 'public');

  if (search) {
    const safeSearch = sanitizePostgrestSearchTerm(search);
    if (!safeSearch) {
      return NextResponse.json({ error: 'Search query contains no searchable text' }, { status: 400 });
    }

    query = query.or(`name.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
  }

  const sortCol = ['bookmark_count', 'member_count', 'created_at'].includes(sort)
    ? sort : 'bookmark_count';
  query = query.order(sortCol, { ascending: false });

  const { data, error, count } = await query.range(offset, offset + pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    lists: data || [],
    total: count || 0,
    page,
    pageSize,
  });
}
