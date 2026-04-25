// apps/web/src/app/api/folders/[id]/route.ts
//
// Phase 3 (HAL redesign): rename + delete a folder.
// PATCH body: { name: string } — rename. RLS enforces ownership;
// the route also adds a defensive user_id filter.
// DELETE: removes the folder. The bookmarks.folder_id FK uses
// ON DELETE SET NULL (migration 005), so bookmarks become "Unfiled".

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const RenameSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RenameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.userClient
    .from('folders')
    .update({ name: parsed.data.name })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select('id, name, x_folder_id, created_at, updated_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
  }
  return NextResponse.json({ folder: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  const { error } = await ctx.userClient
    .from('folders')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() {
  return [];
}
