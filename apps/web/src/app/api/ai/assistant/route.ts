import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { assistantChat } from '@/lib/grok';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const { message, history } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch user's bookmark context for the assistant
    const { data: recentBookmarks } = await ctx.serviceClient
      .from('bookmarks')
      .select('content_text, x_author_handle, x_author_name, bookmarked_at')
      .eq('user_id', ctx.userId)
      .order('bookmarked_at', { ascending: false })
      .limit(30);

    const { data: tags } = await ctx.serviceClient
      .from('tags')
      .select('name')
      .eq('user_id', ctx.userId);

    const { data: folders } = await ctx.serviceClient
      .from('folders')
      .select('name')
      .eq('user_id', ctx.userId);

    const { data: countData } = await ctx.serviceClient
      .from('bookmarks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);

    // Build context string
    const bookmarkContext = [
      `Total bookmarks: ${countData?.length || 0}`,
      `Tags: ${(tags || []).map((t: { name: string }) => t.name).join(', ') || 'None'}`,
      `Folders: ${(folders || []).map((f: { name: string }) => f.name).join(', ') || 'None'}`,
      '',
      'Recent bookmarks:',
      ...(recentBookmarks || []).map(
        (b: { x_author_handle: string; content_text: string; bookmarked_at: string }) =>
          `- @${b.x_author_handle} (${new Date(b.bookmarked_at).toLocaleDateString()}): ${b.content_text.slice(0, 150)}`
      ),
    ].join('\n');

    // Convert history to message format
    const chatHistory = (history || []).map((h: { role: string; content: string }) => ({
      role: h.role as 'user' | 'assistant',
      content: h.content,
    }));

    const response = await assistantChat(message, bookmarkContext, chatHistory);

    return NextResponse.json({ response });
  } catch (err) {
    console.error('[AI Assistant]', err);
    return NextResponse.json({ error: 'Assistant failed' }, { status: 500 });
  }
}
