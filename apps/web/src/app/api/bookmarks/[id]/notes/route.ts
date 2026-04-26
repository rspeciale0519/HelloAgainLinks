// apps/web/src/app/api/bookmarks/[id]/notes/route.ts
//
// Phase 5 Task 5.3: dedicated PATCH endpoint for the Spread modal's Notes tab.
// Autosave fires on every keystroke (debounced 1s client-side), so this
// endpoint stays lean — single-column update, RLS-enforced via userClient.
// Kept separate from the generic /api/bookmarks/[id] PATCH so updates here
// don't accidentally touch other columns and so the caller can rely on a
// stable, narrow contract.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

const NotesSchema = z.object({
  notes: z.string().max(20000),
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
  const parsed = NotesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.userClient
    .from('bookmarks')
    .update({ user_notes: parsed.data.notes })
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .select('id, user_notes')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  }
  return NextResponse.json(data);
}

// Required for Next.js static export compatibility (mobile build only).
export function generateStaticParams() {
  return [];
}
