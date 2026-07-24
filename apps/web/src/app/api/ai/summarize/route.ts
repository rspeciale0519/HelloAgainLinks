import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { summarizeBookmark, summarizeCollection } from '@/lib/grok';
import { enforceQuota } from '@/lib/quota';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json({ error: 'Summaries require Pro plan' }, { status: 403 });
  }

  const denied = await enforceQuota(ctx.serviceClient, ctx.userId, ctx.plan, 'ai_op');
  if (denied) return denied;

  try {
    const body = await req.json();

    // Single bookmark summary
    if (body.bookmarkId) {
      const { data: bookmark } = await ctx.serviceClient
        .from('bookmarks')
        .select('content_text')
        .eq('id', body.bookmarkId)
        .eq('user_id', ctx.userId)
        .single();

      if (!bookmark) {
        return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
      }

      const summary = await summarizeBookmark(bookmark.content_text);
      return NextResponse.json({ summary, bookmarkId: body.bookmarkId });
    }

    // Collection summary (by tag or folder)
    if (body.tagId || body.folderId) {
      let query = ctx.serviceClient
        .from('bookmarks')
        .select('content_text, x_author_handle')
        .eq('user_id', ctx.userId)
        .order('bookmarked_at', { ascending: false })
        .limit(20);

      if (body.tagId) {
        const { data: taggedIds } = await ctx.serviceClient
          .from('bookmark_tags')
          .select('bookmark_id')
          .eq('tag_id', body.tagId);
        const ids = (taggedIds || []).map((t: { bookmark_id: string }) => t.bookmark_id);
        if (ids.length === 0) {
          return NextResponse.json({ summary: 'No bookmarks in this collection.' });
        }
        query = query.in('id', ids);
      }

      if (body.folderId) {
        const { data: folderIds } = await ctx.serviceClient
          .from('bookmark_folders')
          .select('bookmark_id')
          .eq('folder_id', body.folderId);
        const ids = (folderIds || []).map((f: { bookmark_id: string }) => f.bookmark_id);
        if (ids.length === 0) {
          return NextResponse.json({ summary: 'No bookmarks in this folder.' });
        }
        query = query.in('id', ids);
      }

      const { data: bookmarks } = await query;
      if (!bookmarks || bookmarks.length === 0) {
        return NextResponse.json({ summary: 'No bookmarks found.' });
      }

      const summary = await summarizeCollection(
        bookmarks.map((b: { content_text: string; x_author_handle: string }) => ({
          content: b.content_text,
          author: b.x_author_handle,
        }))
      );
      return NextResponse.json({ summary, bookmarkCount: bookmarks.length });
    }

    return NextResponse.json({ error: 'Provide bookmarkId, tagId, or folderId' }, { status: 400 });
  } catch (err) {
    console.error('[Summarize]', err);
    return NextResponse.json({ error: 'Summarization failed' }, { status: 500 });
  }
}
