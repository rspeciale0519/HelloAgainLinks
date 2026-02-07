import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { PLAN_LIMITS } from '@helloagain/shared';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { count, error } = await ctx.userClient
    .from('bookmarks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const limit = PLAN_LIMITS[ctx.plan].bookmarks;
  return NextResponse.json({
    count: count ?? 0,
    limit: limit === Infinity ? null : limit,
    plan: ctx.plan,
  });
}
