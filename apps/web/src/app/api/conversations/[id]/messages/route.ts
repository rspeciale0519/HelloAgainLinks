// apps/web/src/app/api/conversations/[id]/messages/route.ts
//
// Phase 4 (HAL redesign): streaming Grok responses for the Signal-rail Ask
// tab. POST persists the user message, opens a streaming chat completion,
// forwards chunks as SSE, then persists the assembled assistant message
// (with extracted citations) and bumps the conversation's updated_at.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';
import {
  buildBookmarkContext,
  buildSystemPrompt,
  extractCitations,
  iterateGrokStream,
  streamGrokChat,
  type GrokMessage,
} from '@/lib/grok-conversation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Params = { params: Promise<{ id: string }> };

const SendMessageSchema = z.object({
  content: z.string().trim().min(1).max(8000),
});

interface MessageHistoryRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const HISTORY_LIMIT = 12;
const ENCODER = new TextEncoder();

function sseEvent(payload: unknown): Uint8Array {
  return ENCODER.encode(`data: ${JSON.stringify(payload)}\n\n`);
}

function sseDone(): Uint8Array {
  return ENCODER.encode('data: [DONE]\n\n');
}

export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;
  const { id } = await params;

  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'AI assistant requires a Pro plan.', code: 'plan_required' },
      { status: 402 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }
  const userContent = parsed.data.content;

  // Verify conversation ownership.
  const { data: conversation, error: convErr } = await ctx.userClient
    .from('conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', ctx.userId)
    .maybeSingle();
  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Persist the user message immediately so it's visible if the stream fails.
  const { error: insertUserErr } = await ctx.userClient.from('messages').insert({
    conversation_id: id,
    role: 'user',
    content: userContent,
  });
  if (insertUserErr) {
    return NextResponse.json({ error: insertUserErr.message }, { status: 500 });
  }

  // Pull recent message history (post-insert so the new user msg is included).
  const { data: history } = await ctx.userClient
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT);
  const orderedHistory = ((history ?? []) as MessageHistoryRow[]).slice().reverse();

  // Build the system prompt with bookmark context + citation contract. The
  // context is query-aware: it ranks the top matches for the user's latest
  // message across ALL bookmarks via the search_vector tsvector RPC, then
  // appends a small slice of the most recent bookmarks for "what did I save
  // lately?" prompts.
  const { contextText, recentIds } = await buildBookmarkContext(
    ctx.serviceClient,
    ctx.userId,
    userContent,
  );
  const systemPrompt = buildSystemPrompt(contextText);

  const grokMessages: GrokMessage[] = [
    { role: 'system', content: systemPrompt },
    ...orderedHistory.map((m) => ({ role: m.role, content: m.content })),
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assembled = '';
      let upstream: Response | null = null;
      try {
        upstream = await streamGrokChat(grokMessages);
        for await (const delta of iterateGrokStream(upstream)) {
          assembled += delta;
          controller.enqueue(sseEvent({ type: 'chunk', text: delta }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        console.error('[messages SSE] upstream failure:', message);
        controller.enqueue(sseEvent({ type: 'error', error: message }));
        controller.enqueue(sseDone());
        controller.close();
        return;
      }

      const { cleanedText, citedIds } = extractCitations(assembled, recentIds);

      const { data: assistantRow, error: insertAsstErr } = await ctx.userClient
        .from('messages')
        .insert({
          conversation_id: id,
          role: 'assistant',
          content: cleanedText,
          cited_bookmark_ids: citedIds.length > 0 ? citedIds : null,
        })
        .select('id')
        .single();

      if (insertAsstErr || !assistantRow) {
        controller.enqueue(
          sseEvent({
            type: 'error',
            error: insertAsstErr?.message ?? 'Failed to persist assistant message',
          }),
        );
        controller.enqueue(sseDone());
        controller.close();
        return;
      }

      // Hydrate the cited bookmarks so the client can render chips even when
      // those bookmarks aren't on the user's current feed page. We send
      // (id, x_post_id, x_author_handle, content_text) — enough for the chip
      // to build an X URL and show the author handle.
      let citedBookmarks: Array<{
        id: string;
        x_post_id: string;
        x_author_handle: string;
        content_text: string;
      }> = [];
      if (citedIds.length > 0) {
        const { data: cited } = await ctx.serviceClient
          .from('bookmarks')
          .select('id, x_post_id, x_author_handle, content_text')
          .eq('user_id', ctx.userId)
          .in('id', citedIds);
        citedBookmarks = (cited ?? []) as typeof citedBookmarks;
      }

      // Auto-title from the first user prompt if the conversation is still
      // using the default title. Bumps updated_at as well.
      const tentativeTitle = userContent.slice(0, 80);
      await ctx.userClient
        .from('conversations')
        .update({
          title: tentativeTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', ctx.userId)
        .eq('title', 'New conversation');

      // Always bump updated_at even if the title was already custom.
      await ctx.userClient
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ctx.userId);

      controller.enqueue(
        sseEvent({
          type: 'done',
          message_id: assistantRow.id,
          cited_bookmark_ids: citedIds,
          cited_bookmarks: citedBookmarks,
          content: cleanedText,
        }),
      );
      controller.enqueue(sseDone());
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Required for Next.js static export compatibility (mobile build only).
export function generateStaticParams() {
  return [];
}
