import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient, getUserClient } from './supabase-server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Plan } from '@helloagain/shared';

export interface AuthContext {
  userId: string;
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
  plan: Plan;
}

/**
 * Extract and verify auth from request.
 * Returns AuthContext or a NextResponse error.
 */
export async function getAuthContext(
  req: NextRequest
): Promise<AuthContext | NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const serviceClient = getServiceClient();

  const { data: { user }, error } = await serviceClient.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // Get user plan
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const userClient = getUserClient(token);

  return {
    userId: user.id,
    userClient,
    serviceClient,
    plan: (profile?.plan as Plan) || 'free',
  };
}

export function isAuthError(ctx: AuthContext | NextResponse): ctx is NextResponse {
  return ctx instanceof NextResponse;
}
