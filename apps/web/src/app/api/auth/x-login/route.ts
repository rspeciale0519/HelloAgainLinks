import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const extensionId = url.searchParams.get('extension_id');

  // Generate PKCE challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Short state (under 500 chars)
  const state = crypto.randomBytes(16).toString('hex');

  // Build callback URL
  const callbackUrl = `${APP_URL}/api/auth/x-callback`;

  // Store verifier + state in cookie
  const stateData = JSON.stringify({
    codeVerifier,
    state,
    extensionId: extensionId || null,
  });

  const xAuthUrl = new URL('https://x.com/i/oauth2/authorize');
  xAuthUrl.searchParams.set('response_type', 'code');
  xAuthUrl.searchParams.set('client_id', X_CLIENT_ID);
  xAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  xAuthUrl.searchParams.set('scope', 'tweet.read users.read bookmark.read offline.access');
  xAuthUrl.searchParams.set('state', state);
  xAuthUrl.searchParams.set('code_challenge', codeChallenge);
  xAuthUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(xAuthUrl.toString());
  response.cookies.set('x-oauth-state', stateData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}
