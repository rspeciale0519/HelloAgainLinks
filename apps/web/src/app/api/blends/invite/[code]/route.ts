import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Get invite details (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const serviceClient = getServiceClient();

  const { data: invite } = await serviceClient
    .from('blend_invites')
    .select('id, invite_code, status, created_at, inviter_id')
    .eq('invite_code', code)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  // Get inviter's display name
  const { data: inviter } = await serviceClient
    .from('profiles')
    .select('display_name, x_handle, avatar_url')
    .eq('id', invite.inviter_id)
    .single();

  return NextResponse.json({
    invite: {
      code: invite.invite_code,
      status: invite.status,
      createdAt: invite.created_at,
    },
    inviter: inviter ? {
      name: inviter.display_name,
      handle: inviter.x_handle,
      avatar: inviter.avatar_url,
    } : null,
  });
}

// Accept invite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { code } = await params;

  const { data: invite } = await ctx.serviceClient
    .from('blend_invites')
    .select('*')
    .eq('invite_code', code)
    .eq('status', 'pending')
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found or already used' }, { status: 404 });
  }

  if (invite.inviter_id === ctx.userId) {
    return NextResponse.json({ error: 'Cannot blend with yourself' }, { status: 400 });
  }

  // Accept invite
  await ctx.serviceClient
    .from('blend_invites')
    .update({ invitee_id: ctx.userId, status: 'accepted' })
    .eq('id', invite.id);

  // Create the blend (analysis will be triggered separately)
  const { data: blend, error } = await ctx.serviceClient
    .from('blends')
    .insert({
      user_a_id: invite.inviter_id,
      user_b_id: ctx.userId,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Trigger blend analysis asynchronously
  // In production, this would be a background job
  // For now, we'll do it inline
  try {
    const { generateBlendAnalysis } = await import('@/lib/blend-engine');
    await generateBlendAnalysis(blend.id, invite.inviter_id, ctx.userId, ctx.serviceClient);
  } catch (err) {
    console.error('[Blend] Analysis failed, blend saved without analysis:', err);
  }

  return NextResponse.json({ blend });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
