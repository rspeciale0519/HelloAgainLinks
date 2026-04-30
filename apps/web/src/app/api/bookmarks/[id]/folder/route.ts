// apps/web/src/app/api/bookmarks/[id]/folder/route.ts
//
// Phase 3 (HAL redesign): single-folder assignment per bookmark
// (matches X.com's "a bookmark lives in one folder" semantics).
//
// PATCH body: { folder_id: string | null }
//   - null: unfile the bookmark
//   - string: must be a UUID; the folder must belong to the user (we check
//     defensively in addition to RLS so we can return a useful 404).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const AssignSchema = z.object({
  folder_id: z.string().uuid().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id: bookmarkId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = AssignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { folder_id } = parsed.data;

  if (folder_id) {
    const { data: folder } = await ctx.userClient
      .from('folders')
      .select('id')
      .eq('id', folder_id)
      .eq('user_id', ctx.userId)
      .maybeSingle();
    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }
  }

  const { data, error } = await ctx.userClient
    .from('bookmarks')
    .update({ folder_id })
    .eq('id', bookmarkId)
    .eq('user_id', ctx.userId)
    .select('id, folder_id')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, bookmark: data });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() {
  return [];
}
