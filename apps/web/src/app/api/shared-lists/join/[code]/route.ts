import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { getServiceClient } from '@/lib/supabase-server';

// Get invite details (authenticated but no Pro requirement to VIEW)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const serviceClient = getServiceClient();

  const { data: list } = await serviceClient
    .from('shared_lists')
    .select('id, name, description, visibility, bookmark_count, member_count, owner_id')
    .eq('invite_code', code)
    .single();

  if (!list) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  const { data: owner } = await serviceClient
    .from('profiles')
    .select('display_name, x_handle, avatar_url')
    .eq('id', list.owner_id)
    .single();

  return NextResponse.json({
    list: {
      name: list.name,
      description: list.description,
      bookmarkCount: list.bookmark_count,
      memberCount: list.member_count,
    },
    owner: owner ? {
      name: owner.display_name,
      handle: owner.x_handle,
      avatar: owner.avatar_url,
    } : null,
  });
}

// Join a shared list via invite code
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'Shared Lists require a Pro plan to join.' },
      { status: 403 }
    );
  }

  const { code } = await params;
  const { role } = await req.json().catch(() => ({ role: undefined }));

  const { data: list } = await ctx.serviceClient
    .from('shared_lists')
    .select('id, owner_id')
    .eq('invite_code', code)
    .single();

  if (!list) return NextResponse.json({ error: 'Invite not found' }, { status: 404 });

  if (list.owner_id === ctx.userId) {
    return NextResponse.json({ error: 'You own this list' }, { status: 400 });
  }

  // Check if already a member
  const { data: existing } = await ctx.serviceClient
    .from('shared_list_members')
    .select('id')
    .eq('list_id', list.id)
    .eq('user_id', ctx.userId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already a member', listId: list.id }, { status: 409 });
  }

  // Default role is viewer unless owner specifies editor in invite
  const joinRole = role === 'editor' ? 'editor' : 'viewer';

  const { error } = await ctx.serviceClient
    .from('shared_list_members')
    .insert({ list_id: list.id, user_id: ctx.userId, role: joinRole });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update member count
  const { count } = await ctx.serviceClient
    .from('shared_list_members')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', list.id);

  await ctx.serviceClient
    .from('shared_lists')
    .update({ member_count: count || 1 })
    .eq('id', list.id);

  return NextResponse.json({ success: true, listId: list.id, role: joinRole });
}
