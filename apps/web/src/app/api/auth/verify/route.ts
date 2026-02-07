import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as 'magiclink';
  const extensionId = url.searchParams.get('extension_id');

  if (!tokenHash) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_token`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type || 'magiclink',
  });

  if (error || !data.session) {
    console.error('[Verify] OTP verification failed:', error);
    return NextResponse.redirect(`${APP_URL}/login?error=verify_failed`);
  }

  // If from extension, redirect to extension callback page
  if (extensionId) {
    const tokenPayload = encodeURIComponent(
      JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        user: {
          id: data.session.user.id,
          handle: data.session.user.user_metadata?.preferred_username || '',
          name: data.session.user.user_metadata?.full_name || '',
          avatar: data.session.user.user_metadata?.avatar_url || '',
        },
      })
    );
    return NextResponse.redirect(
      `${APP_URL}/auth/extension-callback?token=${tokenPayload}&extension_id=${extensionId}`
    );
  }

  // Set session cookies
  const response = NextResponse.redirect(`${APP_URL}/dashboard`);
  response.cookies.set('ha-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  });
  response.cookies.set('ha-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return response;
}
