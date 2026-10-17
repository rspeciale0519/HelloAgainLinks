import { NextRequest, NextResponse } from 'next/server';
import {
  consumeMobileAuthHandoff,
  hashHandoffValue,
  isExpiredMobileAuthHandoff,
  isValidMobileAuthNonce,
  matchesMobileAuthNonceHash,
  parseMobileAuthHandoff,
} from '@/lib/mobile-auth-handoff';
import { getServiceClient } from '@/lib/supabase-server';

async function consumeHandoffOnce(handoff: string, expiresAt: number): Promise<boolean> {
  try {
    const { error } = await getServiceClient()
      .from('mobile_auth_handoff_replays')
      .insert({
        handoff_hash: hashHandoffValue(handoff),
        expires_at: new Date(expiresAt * 1000).toISOString(),
      });
    if (!error) return true;
    if (error.code === '23505') return false;
  } catch {
    // Table missing until migration 013 — fall back to in-process store.
  }
  return consumeMobileAuthHandoff(handoff, expiresAt);
}

export async function POST(req: NextRequest) {
  try {
    const { handoff, nonce } = await req.json();

    if (typeof handoff !== 'string' || !isValidMobileAuthNonce(nonce)) {
      return NextResponse.json(
        { error: 'Invalid mobile auth handoff request' },
        { status: 400 }
      );
    }

    const payload = parseMobileAuthHandoff(handoff);
    if (isExpiredMobileAuthHandoff(payload)) {
      return NextResponse.json(
        { error: 'Mobile auth handoff expired' },
        { status: 410 }
      );
    }

    if (!matchesMobileAuthNonceHash(payload.nonceHash, nonce)) {
      return NextResponse.json(
        { error: 'Mobile auth handoff rejected' },
        { status: 401 }
      );
    }

    if (!(await consumeHandoffOnce(handoff, payload.expiresAt))) {
      return NextResponse.json(
        { error: 'Mobile auth handoff already used' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        access_token: payload.accessToken,
        refresh_token: payload.refreshToken,
        expires_at: payload.sessionExpiresAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('[Mobile auth] Session exchange failed:', error);
    return NextResponse.json(
      { error: 'Mobile auth handoff invalid' },
      { status: 400 }
    );
  }
}
