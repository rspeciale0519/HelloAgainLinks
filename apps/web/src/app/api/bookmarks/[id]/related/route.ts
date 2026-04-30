// apps/web/src/app/api/bookmarks/[id]/related/route.ts
//
// Phase 4 (HAL redesign): related-bookmark clustering. Wraps the
// `get_related_bookmarks` RPC (migration 007), then hydrates the returned
// id list with full bookmark rows so the Signal rail and Spread Related
// sidebar can render them without extra round-trips.

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

interface RelatedRow {
  id: string;
  strength: number;
}

const BOOKMARK_FIELDS = [
  'id',
  'x_post_id',
  'x_author_handle',
  'x_author_name',
  'content_text',
  'media_urls',
  'bookmarked_at',
  'post_created_at',
  'primary_category',
  'primary_domain',
  'ai_summary',
  'ai_tags',
  'folder_id',
].join(', ');

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  // Defensive: confirm the source bookmark belongs to this user before
  // returning anything from the clustering RPC.
  const { data: source, error: srcErr } = await ctx.userClient
    .from('bookmarks')
    .select('id')
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (srcErr) return NextResponse.json({ error: srcErr.message }, { status: 500 });
  if (!source) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  const { data: relatedRows, error: rpcErr } = await ctx.userClient.rpc(
    'get_related_bookmarks',
    { p_user_id: ctx.userId, p_bookmark_id: id },
  );
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 });

  const related = (relatedRows ?? []) as RelatedRow[];
  if (related.length === 0) {
    return NextResponse.json({ related: [] });
  }

  const ids = related.map((r) => r.id);
  const { data: bookmarks, error: bmErr } = await ctx.userClient
    .from('bookmarks')
    .select(BOOKMARK_FIELDS)
    .eq('user_id', ctx.userId)
    .in('id', ids);
  if (bmErr) return NextResponse.json({ error: bmErr.message }, { status: 500 });

  const strengthById = new Map(related.map((r) => [r.id, Number(r.strength)]));
  const rows = (bookmarks ?? []) as unknown as Array<Record<string, unknown> & { id: string }>;
  const hydrated = rows.map((b) => ({
    ...b,
    strength: strengthById.get(b.id) ?? 0,
  }));
  hydrated.sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));

  return NextResponse.json({ related: hydrated });
}

// Required for Next.js static export compatibility (mobile build only).
export function generateStaticParams() {
  return [];
}
