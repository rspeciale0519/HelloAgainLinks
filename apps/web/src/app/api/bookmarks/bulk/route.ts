// apps/web/src/app/api/bookmarks/bulk/route.ts
//
// Phase 6 Task 6.2: bulk bookmark operations. The selection-mode bar in the
// feed dispatches three actions over the same endpoint — tag, move-folder,
// and delete — each operating on a list of bookmark ids. RLS enforces
// per-user ownership; the route also guards by user_id explicitly so a
// caller passing somebody else's id silently no-ops rather than mutating.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const BASE = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
});

const TagSchema = BASE.extend({
  action: z.literal('tag'),
  payload: z.object({
    tag_id: z.string().uuid(),
  }),
});

const MoveFolderSchema = BASE.extend({
  action: z.literal('move-folder'),
  // folder_id null moves the bookmarks back to the unfiled (All) bucket.
  payload: z.object({
    folder_id: z.string().uuid().nullable(),
  }),
});

const DeleteSchema = BASE.extend({
  action: z.literal('delete'),
});

const BulkSchema = z.discriminatedUnion('action', [
  TagSchema,
  MoveFolderSchema,
  DeleteSchema,
]);

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = BulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const { ids } = parsed.data;

  // Defensive ownership check — only operate on bookmarks the caller actually
  // owns. Returns the subset of ids we should touch.
  const { data: owned, error: ownErr } = await ctx.userClient
    .from('bookmarks')
    .select('id')
    .eq('user_id', ctx.userId)
    .in('id', ids);
  if (ownErr) {
    return NextResponse.json({ error: ownErr.message }, { status: 500 });
  }
  const ownedIds = (owned ?? []).map((r) => r.id);
  const ownedSet = new Set(ownedIds);
  const failed = ids.filter((id) => !ownedSet.has(id));

  if (ownedIds.length === 0) {
    return NextResponse.json({ updated: 0, failed }, { status: 200 });
  }

  if (parsed.data.action === 'delete') {
    const { error } = await ctx.userClient
      .from('bookmarks')
      .delete()
      .eq('user_id', ctx.userId)
      .in('id', ownedIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: ownedIds.length, failed });
  }

  if (parsed.data.action === 'move-folder') {
    const { error } = await ctx.userClient
      .from('bookmarks')
      .update({ folder_id: parsed.data.payload.folder_id })
      .eq('user_id', ctx.userId)
      .in('id', ownedIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: ownedIds.length, failed });
  }

  // action === 'tag' — confirm the tag belongs to this user, then upsert
  // bookmark_tags rows for every owned bookmark id.
  const { tag_id } = parsed.data.payload;
  const { data: tag, error: tagErr } = await ctx.userClient
    .from('tags')
    .select('id')
    .eq('id', tag_id)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (tagErr) return NextResponse.json({ error: tagErr.message }, { status: 500 });
  if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });

  const rows = ownedIds.map((bookmark_id) => ({ bookmark_id, tag_id }));
  const { error: upsertErr } = await ctx.userClient
    .from('bookmark_tags')
    .upsert(rows, { onConflict: 'bookmark_id,tag_id' });
  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  }
  return NextResponse.json({ updated: ownedIds.length, failed });
}
