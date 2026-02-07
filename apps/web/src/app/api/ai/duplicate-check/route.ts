import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { checkDuplicate } from '@/lib/grok';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const { content } = await req.json();
    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get recent bookmarks to check against
    const { data: existing } = await ctx.serviceClient
      .from('bookmarks')
      .select('id, content_text')
      .eq('user_id', ctx.userId)
      .order('bookmarked_at', { ascending: false })
      .limit(50);

    if (!existing || existing.length === 0) {
      return NextResponse.json({ isDuplicate: false });
    }

    const result = await checkDuplicate(
      content,
      existing.map((b: { id: string; content_text: string }) => ({
        id: b.id,
        content: b.content_text,
      }))
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('[Duplicate Check]', err);
    return NextResponse.json({ error: 'Duplicate check failed' }, { status: 500 });
  }
}
