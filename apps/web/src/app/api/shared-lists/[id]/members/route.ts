import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

// Get members of a shared list
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

  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const { data, error } = await ctx.serviceClient
    .from('shared_list_members')
    .select(`
      id, role, joined_at,
      profiles:user_id ( id, display_name, x_handle, avatar_url )
    `)
    .eq('list_id', id)
    .order('joined_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [] });
}

// Update a member's role (owner only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;

  // Verify owner
  const { data: owner } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .eq('role', 'owner')
    .single();

  if (!owner) return NextResponse.json({ error: 'Only the owner can change roles' }, { status: 403 });

  const { user_id, role } = await req.json();
  if (!user_id || !['editor', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Valid user_id and role (editor/viewer) required' }, { status: 400 });
  }

  // Can't change own role
  if (user_id === ctx.userId) {
    return NextResponse.json({ error: "Can't change your own role" }, { status: 400 });
  }

  const { error } = await ctx.serviceClient
    .from('shared_list_members')
    .update({ role })
    .eq('list_id', id)
    .eq('user_id', user_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Remove a member (owner only) or leave list (self)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { id } = await params;
  const { user_id } = await req.json();
  const targetId = user_id || ctx.userId;

  // If removing self (leaving)
  if (targetId === ctx.userId) {
    // Can't leave if owner
    const { data: self } = await ctx.serviceClient
      .from('shared_list_members')
      .select('role')
      .eq('list_id', id)
      .eq('user_id', ctx.userId)
      .single();

    if (self?.role === 'owner') {
      return NextResponse.json({ error: 'Owner cannot leave. Transfer ownership or delete the list.' }, { status: 400 });
    }

    await ctx.serviceClient
      .from('shared_list_members')
      .delete()
      .eq('list_id', id)
      .eq('user_id', ctx.userId);

    return NextResponse.json({ success: true });
  }

  // Removing someone else — owner only
  const { data: owner } = await ctx.serviceClient
    .from('shared_list_members')
    .select('role')
    .eq('list_id', id)
    .eq('user_id', ctx.userId)
    .eq('role', 'owner')
    .single();

  if (!owner) return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 });

  await ctx.serviceClient
    .from('shared_list_members')
    .delete()
    .eq('list_id', id)
    .eq('user_id', targetId);

  return NextResponse.json({ success: true });
}
