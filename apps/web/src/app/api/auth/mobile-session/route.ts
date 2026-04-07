import { NextRequest, NextResponse } from 'next/server';
import {
  consumeMobileAuthHandoff,
  isExpiredMobileAuthHandoff,
  isValidMobileAuthNonce,
  matchesMobileAuthNonceHash,
  parseMobileAuthHandoff,
} from '@/lib/mobile-auth-handoff';

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

    if (!consumeMobileAuthHandoff(handoff, payload.expiresAt)) {
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
