// apps/web/src/app/api/conversations/route.ts
//
// Phase 4 (HAL redesign): list + create persistent HAL conversations.
// `GET /api/conversations` returns the user's conversations ordered by
// `updated_at DESC`. `POST /api/conversations` creates a new conversation
// (default title "New conversation") and returns the row.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const CreateConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { data, error } = await ctx.userClient
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', ctx.userId)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ conversations: (data ?? []) as ConversationRow[] });
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  let body: unknown = {};
  if (req.headers.get('content-length') !== '0') {
    try {
      body = await req.json();
    } catch {
      // Allow empty body — POST without payload should still create.
      body = {};
    }
  }

  const parsed = CreateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.userClient
    .from('conversations')
    .insert({
      user_id: ctx.userId,
      title: parsed.data.title ?? 'New conversation',
    })
    .select('id, title, created_at, updated_at')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to create conversation' },
      { status: 500 },
    );
  }

  return NextResponse.json({ conversation: data as ConversationRow }, { status: 201 });
}
