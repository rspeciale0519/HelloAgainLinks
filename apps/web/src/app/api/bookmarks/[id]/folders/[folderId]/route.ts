import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

type Params = { params: Promise<{ id: string; folderId: string }> };

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id: bookmarkId, folderId } = await params;

  const { data: bookmark } = await ctx.userClient
    .from('bookmarks')
    .select('id')
    .eq('id', bookmarkId)
    .eq('user_id', ctx.userId)
    .single();

  if (!bookmark) return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });

  const { error } = await ctx.userClient
    .from('bookmark_folders')
    .delete()
    .eq('bookmark_id', bookmarkId)
    .eq('folder_id', folderId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
