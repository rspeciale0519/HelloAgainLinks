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

  // Decode JWT payload to get user ID for parallel profile fetch
  const payloadB64 = token.split('.')[1];
  const userId = payloadB64 ? JSON.parse(Buffer.from(payloadB64, 'base64').toString()).sub as string : null;

  // Run auth verification and profile fetch in parallel
  const [authResult, profileResult] = await Promise.all([
    serviceClient.auth.getUser(token),
    userId
      ? serviceClient.from('profiles').select('plan').eq('id', userId).single()
      : Promise.resolve({ data: null }),
  ]);

  const { data: { user }, error } = authResult;
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const userClient = getUserClient(token);

  return {
    userId: user.id,
    userClient,
    serviceClient,
    plan: (profileResult.data?.plan as Plan) || 'free',
  };
}

export function isAuthError(ctx: AuthContext | NextResponse): ctx is NextResponse {
  return ctx instanceof NextResponse;
}
