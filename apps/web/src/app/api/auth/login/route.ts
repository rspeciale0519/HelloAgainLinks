import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { safeInternalPath } from '@/lib/safe-redirect';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const redirect = url.searchParams.get('redirect');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const redirectTo = new URL(`${APP_URL}/api/auth/callback`);
  // Only forward the redirect param when it is a safe same-origin path; drop
  // host-changing values before they enter the OAuth round-trip.
  const safeRedirect = safeInternalPath(redirect, '');
  if (safeRedirect) redirectTo.searchParams.set('redirect', safeRedirect);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'twitter',
    options: {
      redirectTo: redirectTo.toString(),
      scopes: 'tweet.read users.read bookmark.read',
    },
  });

  if (error || !data.url) {
    return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 });
  }

  return NextResponse.redirect(data.url);
}
