import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { findRelatedPosts } from '@/lib/grok';
import { enforceQuota } from '@/lib/quota';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookmarkId: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json({ error: 'Related content requires Pro plan' }, { status: 403 });
  }

  const denied = await enforceQuota(ctx.serviceClient, ctx.userId, ctx.plan, 'ai_op');
  if (denied) return denied;

  try {
    const { bookmarkId } = await params;

    const { data: bookmark } = await ctx.serviceClient
      .from('bookmarks')
      .select('content_text, x_author_handle')
      .eq('id', bookmarkId)
      .eq('user_id', ctx.userId)
      .single();

    if (!bookmark) {
      return NextResponse.json({ error: 'Bookmark not found' }, { status: 404 });
    }

    // Get related search queries from Grok
    const relatedRaw = await findRelatedPosts(bookmark.content_text);
    let relatedQueries: string[] = [];
    try {
      relatedQueries = JSON.parse(relatedRaw);
    } catch {
      relatedQueries = [bookmark.content_text.slice(0, 50)];
    }

    // Find related bookmarks from user's own library using text search
    const relatedBookmarks = [];
    for (const query of relatedQueries.slice(0, 3)) {
      const { data } = await ctx.serviceClient
        .from('bookmarks')
        .select('id, content_text, x_author_handle, x_author_name, bookmarked_at')
        .eq('user_id', ctx.userId)
        .neq('id', bookmarkId)
        .textSearch('content_text', query, { type: 'websearch' })
        .limit(3);
      if (data) relatedBookmarks.push(...data);
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = relatedBookmarks.filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    }).slice(0, 5);

    return NextResponse.json({
      bookmarkId,
      relatedQueries,
      relatedBookmarks: unique,
    });
  } catch (err) {
    console.error('[Related]', err);
    return NextResponse.json({ error: 'Finding related content failed' }, { status: 500 });
  }
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
