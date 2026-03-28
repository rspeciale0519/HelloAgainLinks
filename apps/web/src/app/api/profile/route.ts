import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { data: profile } = await ctx.serviceClient
    .from('profiles')
    .select('plan, display_name, x_handle, avatar_url')
    .eq('id', ctx.userId)
    .single();

  return NextResponse.json({
    plan: profile?.plan ?? 'free',
    display_name: profile?.display_name ?? '',
    x_handle: profile?.x_handle ?? '',
    avatar_url: profile?.avatar_url ?? '',
  });
}
