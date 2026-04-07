import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as 'magiclink';

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

  // Redirect to client-side page that sets Supabase session in browser.
  // Use the fragment so tokens do not end up in server logs or referrers.
  const sessionUrl = new URL(`${APP_URL}/auth/set-session`);
  sessionUrl.hash = new URLSearchParams({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  }).toString();

  return NextResponse.redirect(sessionUrl.toString());
}
