// apps/web/src/app/api/conversations/[id]/route.ts
//
// Phase 4 (HAL redesign): fetch a single conversation with its messages,
// or delete it. RLS enforces ownership; the route also adds a defensive
// owner check on DELETE for parity with /api/folders/[id].

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cited_bookmark_ids: string[] | null;
  created_at: string;
}

export async function GET(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  const { data: conversation, error: convErr } = await ctx.userClient
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { data: messages, error: msgErr } = await ctx.userClient
    .from('messages')
    .select('id, role, content, cited_bookmark_ids, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // Hydrate the unique set of cited bookmarks across every message so the
  // client can render citation chips for posts the user hasn't paginated to
  // in the feed yet. This is the same shape AskTab gets in the SSE 'done'
  // event — keeping them aligned avoids two render paths.
  const citedIdSet = new Set<string>();
  for (const m of (messages ?? []) as MessageRow[]) {
    for (const cid of m.cited_bookmark_ids ?? []) citedIdSet.add(cid);
  }
  let citedBookmarks: Array<{
    id: string;
    x_post_id: string;
    x_author_handle: string;
    content_text: string;
  }> = [];
  if (citedIdSet.size > 0) {
    const { data: cited } = await ctx.userClient
      .from('bookmarks')
      .select('id, x_post_id, x_author_handle, content_text')
      .in('id', Array.from(citedIdSet));
    citedBookmarks = (cited ?? []) as typeof citedBookmarks;
  }

  return NextResponse.json({
    conversation: conversation as ConversationRow,
    messages: (messages ?? []) as MessageRow[],
    cited_bookmarks: citedBookmarks,
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  // Defensive ownership check before deletion.
  const { data: existing, error: lookupErr } = await ctx.userClient
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (lookupErr) {
    return NextResponse.json({ error: lookupErr.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const { error } = await ctx.userClient
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}

// Required for Next.js static export compatibility (mobile build only).
export function generateStaticParams() {
  return [];
}
