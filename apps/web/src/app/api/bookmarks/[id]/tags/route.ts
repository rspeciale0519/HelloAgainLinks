import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { addTagsSchema } from '@helloagain/shared';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id: bookmarkId } = await params;

  // Verify bookmark belongs to user
  const { data: bookmark } = await ctx.userClient
    .from('bookmarks')
    .select('id')
    .eq('id', bookmarkId)
    .eq('user_id', ctx.userId)
    .single();

  if (!bookmark) return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = addTagsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    const rows = parsed.data.tag_ids.map((tag_id) => ({ bookmark_id: bookmarkId, tag_id }));
    const { error } = await ctx.userClient
      .from('bookmark_tags')
      .upsert(rows, { onConflict: 'bookmark_id,tag_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
