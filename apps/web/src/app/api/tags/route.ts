import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { createTagSchema, PLAN_LIMITS } from '@helloagain/shared';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const body = await req.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    // Check plan limits
    const limit = PLAN_LIMITS[ctx.plan].tags;
    if (limit !== Infinity) {
      const { count } = await ctx.userClient
        .from('tags')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.userId);
      if ((count ?? 0) >= limit) {
        return NextResponse.json({ error: `Tag limit reached (${limit}). Upgrade to Pro.` }, { status: 403 });
      }
    }

    const { data, error } = await ctx.userClient
      .from('tags')
      .insert({ ...parsed.data, user_id: ctx.userId })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Get tags with bookmark counts
  const { data: tags, error } = await ctx.userClient
    .from('tags')
    .select('*, bookmark_tags(bookmark_id)')
    .eq('user_id', ctx.userId)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (tags ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    bookmark_count: (t.bookmark_tags as Array<unknown>)?.length ?? 0,
    bookmark_tags: undefined,
  }));

  return NextResponse.json(result);
}
