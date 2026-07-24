import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeInternalPath } from '@/lib/safe-redirect';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const redirect = url.searchParams.get('redirect');

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_code`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${APP_URL}/login?error=auth_failed`);
  }

  // Ensure profile exists
  const serviceClient = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const user = data.session.user;
  const meta = user.user_metadata || {};

  await serviceClient.from('profiles').upsert(
    {
      id: user.id,
      x_user_id: meta.provider_id || meta.sub || '',
      x_handle: meta.preferred_username || meta.user_name || '',
      display_name: meta.full_name || meta.name || '',
      avatar_url: meta.avatar_url || meta.picture || null,
    },
    { onConflict: 'id' }
  );

  // Normal web login — set cookies and redirect. The redirect target is
  // constrained to a same-origin relative path so a crafted `redirect` param
  // cannot escape to an attacker-controlled host.
  const response = NextResponse.redirect(`${APP_URL}${safeInternalPath(redirect)}`);
  response.cookies.set('ha-access-token', data.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  });
  response.cookies.set('ha-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  return response;
}
