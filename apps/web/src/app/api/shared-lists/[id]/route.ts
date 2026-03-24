import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Get list details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  // Check membership
  const { data: member } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .single();

  // If not a member, check if public
  if (!member) {
    const { data: list } = await ctx.serviceClient
      .from('shared_lists')
      .select('*')
      .eq('id', id)
      .eq('visibility', 'public')
      .single();

    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });
    return NextResponse.json({ list, userRole: 'viewer', isMember: false });
  }

  const { data: list } = await ctx.serviceClient
    .from('shared_lists')
    .select('*')
    .eq('id', id)
    .single();

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 });

  return NextResponse.json({ list, userRole: member.role, isMember: true });
}

// Update list (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  // Verify owner
  const { data: member } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .eq('role', 'owner')
    .single();

  if (!member) return NextResponse.json({ error: 'Only the owner can edit this list' }, { status: 403 });

  const body = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.visibility) updates.visibility = body.visibility === 'public' ? 'public' : 'private';

  const { data, error } = await ctx.serviceClient
    .from('shared_lists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ list: data });
}

// Delete list (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  const { data: member } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .eq('role', 'owner')
    .single();

  if (!member) return NextResponse.json({ error: 'Only the owner can delete this list' }, { status: 403 });

  await ctx.serviceClient.from('shared_lists').delete().eq('id', id);
  return NextResponse.json({ success: true });
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() { return []; }
