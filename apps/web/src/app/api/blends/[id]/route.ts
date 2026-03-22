import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

// Get blend details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  const { data: blend, error } = await ctx.serviceClient
    .from('blends')
    .select('*')
    .eq('id', id)
    .or(`user_a_id.eq.${ctx.userId},user_b_id.eq.${ctx.userId}`)
    .single();

  if (error || !blend) {
    return NextResponse.json({ error: 'Blend not found' }, { status: 404 });
  }

  // Get both users' profiles
  const [{ data: profileA }, { data: profileB }] = await Promise.all([
    ctx.serviceClient.from('profiles').select('display_name, x_handle, avatar_url').eq('id', blend.user_a_id).single(),
    blend.user_b_id
      ? ctx.serviceClient.from('profiles').select('display_name, x_handle, avatar_url').eq('id', blend.user_b_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    blend,
    userA: profileA,
    userB: profileB,
  });
}

// Delete blend
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  const { error } = await ctx.serviceClient
    .from('blends')
    .delete()
    .eq('id', id)
    .or(`user_a_id.eq.${ctx.userId},user_b_id.eq.${ctx.userId}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
