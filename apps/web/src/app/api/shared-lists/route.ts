import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// List user's shared lists (owned + member of)
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  // Get lists where user is a member
  const { data: memberships } = await ctx.serviceClient
    .from('shared_list_members')
    .select('list_id, role')
    .eq('user_id', ctx.userId);

  const listIds = (memberships || []).map((m: { list_id: string }) => m.list_id);

  if (listIds.length === 0) {
    return NextResponse.json({ lists: [] });
  }

  const { data: lists, error } = await ctx.serviceClient
    .from('shared_lists')
    .select('*')
    .in('id', listIds)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach user's role to each list
  const roleMap = Object.fromEntries(
    (memberships || []).map((m: { list_id: string; role: string }) => [m.list_id, m.role])
  );
  const enriched = (lists || []).map((l: { id: string }) => ({
    ...l,
    userRole: roleMap[l.id] || 'viewer',
  }));

  return NextResponse.json({ lists: enriched });
}

// Create a new shared list
export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  if (ctx.plan === 'free') {
    return NextResponse.json(
      { error: 'Shared Lists require a Pro plan.' },
      { status: 403 }
    );
  }

  const { name, description, visibility } = await req.json();

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'List name is required' }, { status: 400 });
  }

  const inviteCode = randomBytes(8).toString('hex');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
    + '-' + randomBytes(3).toString('hex');

  const { data: list, error } = await ctx.serviceClient
    .from('shared_lists')
    .insert({
      owner_id: ctx.userId,
      name: name.trim(),
      description: description?.trim() || null,
      visibility: visibility === 'public' ? 'public' : 'private',
      slug,
      invite_code: inviteCode,
      member_count: 1,
      bookmark_count: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add owner as member
  await ctx.serviceClient
    .from('shared_list_members')
    .insert({ list_id: list.id, user_id: ctx.userId, role: 'owner' });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.json({
    list,
    inviteUrl: `${appUrl}/lists/join/${inviteCode}`,
    publicUrl: visibility === 'public' ? `${appUrl}/lists/${slug}` : null,
  });
}
