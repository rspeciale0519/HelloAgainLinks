import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { parseSearchIntent } from '@/lib/grok';

// AI-powered natural language search
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json({ error: 'AI search requires Pro plan' }, { status: 403 });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Parse natural language into structured intent
    const intent = await parseSearchIntent(query);

    // Build Supabase query from intent
    let dbQuery = ctx.serviceClient
      .from('bookmarks')
      .select('*, bookmark_tags(tag_id, tags(name, color))')
      .eq('user_id', ctx.userId)
      .order('bookmarked_at', { ascending: false })
      .limit(20);

    // Apply keyword search
    if (intent.keywords.length > 0) {
      const searchTerm = intent.keywords.join(' & ');
      dbQuery = dbQuery.textSearch('content_text', searchTerm, { type: 'websearch' });
    }

    // Apply author filter
    if (intent.author) {
      dbQuery = dbQuery.ilike('x_author_handle', `%${intent.author}%`);
    }

    // Apply date filter
    if (intent.dateHint) {
      const now = new Date();
      let since: Date | null = null;

      if (intent.dateHint.includes('today')) {
        since = new Date(now.setHours(0, 0, 0, 0));
      } else if (intent.dateHint.includes('yesterday')) {
        since = new Date(now.setDate(now.getDate() - 1));
      } else if (intent.dateHint.includes('last week') || intent.dateHint.includes('past week')) {
        since = new Date(now.setDate(now.getDate() - 7));
      } else if (intent.dateHint.includes('last month') || intent.dateHint.includes('past month')) {
        since = new Date(now.setMonth(now.getMonth() - 1));
      } else {
        // Try to parse month names
        const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const monthMatch = months.find(m => intent.dateHint!.toLowerCase().includes(m));
        if (monthMatch) {
          const monthIdx = months.indexOf(monthMatch);
          since = new Date(now.getFullYear(), monthIdx, 1);
        }
      }

      if (since) {
        dbQuery = dbQuery.gte('bookmarked_at', since.toISOString());
      }
    }

    const { data: bookmarks, error } = await dbQuery;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      query,
      intent,
      bookmarks: bookmarks || [],
      count: bookmarks?.length || 0,
    });
  } catch (err) {
    console.error('[AI Search]', err);
    return NextResponse.json({ error: 'AI search failed' }, { status: 500 });
  }
}
