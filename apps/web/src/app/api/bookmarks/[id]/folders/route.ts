import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { addFoldersSchema } from '@helloagain/shared';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id: bookmarkId } = await params;

  const { data: bookmark } = await ctx.userClient
    .from('bookmarks')
    .select('id')
    .eq('id', bookmarkId)
    .eq('user_id', ctx.userId)
    .single();

  if (!bookmark) return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = addFoldersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const rows = parsed.data.folder_ids.map((folder_id) => ({ bookmark_id: bookmarkId, folder_id }));
    const { error } = await ctx.userClient
      .from('bookmark_folders')
      .upsert(rows, { onConflict: 'bookmark_id,folder_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
