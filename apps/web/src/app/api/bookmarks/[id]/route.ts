import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { updateBookmarkSchema } from '@helloagain/shared';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  const { data, error } = await ctx.userClient
    .from('bookmarks')
    .select('*, bookmark_tags(tag_id, tags(*)), bookmark_folders(folder_id, folders(*))')
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateBookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const { data, error } = await ctx.userClient
      .from('bookmarks')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', ctx.userId)
      .select()
      .single();

    if (error || !data) return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  const { error } = await ctx.userClient
    .from('bookmarks')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
