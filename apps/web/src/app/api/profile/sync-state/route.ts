import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/sync-state
 * Returns { lastSyncAt: string | null } where lastSyncAt is read from the
 * profiles.sync_state JSONB column (added in migration 003).
 */
export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { data, error } = await ctx.serviceClient
    .from('profiles')
    .select('sync_state')
    .eq('id', ctx.userId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const syncState = (data?.sync_state ?? null) as { lastSyncAt?: string | null } | null;
  return NextResponse.json({
    lastSyncAt: syncState?.lastSyncAt ?? null,
  });
}
