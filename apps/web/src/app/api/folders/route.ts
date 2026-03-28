import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { createFolderSchema, PLAN_LIMITS } from '@helloagain/shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  try {
    const body = await req.json();
    const parsed = createFolderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.issues }, { status: 400 });
    }

    // Check plan limits
    const limit = PLAN_LIMITS[ctx.plan].folders;
    if (limit !== Infinity) {
      const { count } = await ctx.userClient
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ctx.userId);
      if ((count ?? 0) >= limit) {
        return NextResponse.json({ error: `Folder limit reached (${limit}). Upgrade to Pro.` }, { status: 403 });
      }
    }

    const { data, error } = await ctx.userClient
      .from('folders')
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

  const { data: folders, error } = await ctx.userClient
    .from('folders')
    .select('*, bookmark_folders(bookmark_id)')
    .eq('user_id', ctx.userId)
    .order('sort_order')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (folders ?? []).map((f: Record<string, unknown>) => ({
    ...f,
    bookmark_count: (f.bookmark_folders as Array<unknown>)?.length ?? 0,
    bookmark_folders: undefined,
  }));

  return NextResponse.json(result);
}
