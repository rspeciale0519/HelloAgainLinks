import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { randomBytes } from 'crypto';

// List user's blends
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { data, error } = await ctx.serviceClient
    .from('blends')
    .select('*')
    .or(`user_a_id.eq.${ctx.userId},user_b_id.eq.${ctx.userId}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blends: data || [] });
}

// Create blend invite
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Check free tier limit (1 blend per month)
  if (ctx.plan === 'free') {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const { count } = await ctx.serviceClient
      .from('blends')
      .select('id', { count: 'exact', head: true })
      .eq('user_a_id', ctx.userId)
      .gte('created_at', monthAgo.toISOString());
    if ((count || 0) >= 1) {
      return NextResponse.json(
        { error: 'Free plan allows 1 Blend per month. Upgrade to Pro for unlimited.' },
        { status: 403 }
      );
    }
  }

  const inviteCode = randomBytes(8).toString('hex');

  const { data, error } = await ctx.serviceClient
    .from('blend_invites')
    .insert({ inviter_id: ctx.userId, invite_code: inviteCode })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.json({
    invite: data,
    inviteUrl: `${appUrl}/blend/invite/${inviteCode}`,
  });
}
