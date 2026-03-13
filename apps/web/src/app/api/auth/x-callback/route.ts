import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const X_API_DOMAINS = ['https://api.x.com', 'https://api.twitter.com'];
const USER_FIELDS = 'profile_image_url,name,username';

interface XUserData {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
}

async function fetchXUser(accessToken: string): Promise<XUserData | null> {
  for (const domain of X_API_DOMAINS) {
    try {
      const res = await fetch(
        `${domain}/2/users/me?user.fields=${USER_FIELDS}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.data) return json.data as XUserData;
        console.error(`[X OAuth] ${domain} returned OK but no data:`, JSON.stringify(json));
        continue;
      }

      const errBody = await res.text().catch(() => 'no body');
      console.error(`[X OAuth] ${domain}/2/users/me failed: status=${res.status} body=${errBody}`);
    } catch (err) {
      console.error(`[X OAuth] ${domain}/2/users/me threw:`, err);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${APP_URL}/login?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_params`);
  }

  // Get stored state from cookie
  const stateCookie = req.cookies.get('x-oauth-state')?.value;
  if (!stateCookie) {
    return NextResponse.redirect(`${APP_URL}/login?error=no_state`);
  }

  let stateData: { codeVerifier: string; state: string; extensionId: string | null };
  try {
    stateData = JSON.parse(stateCookie);
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`);
  }

  if (state !== stateData.state) {
    return NextResponse.redirect(`${APP_URL}/login?error=state_mismatch`);
  }

  try {
    // Exchange code for X tokens
    const callbackUrl = `${APP_URL}/api/auth/x-callback`;
    const basicAuth = Buffer.from(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
        code_verifier: stateData.codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[X OAuth] Token exchange failed:', err);
      return NextResponse.redirect(`${APP_URL}/login?error=token_failed`);
    }

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      console.error('[X OAuth] Token response missing access_token:', JSON.stringify(tokens));
      return NextResponse.redirect(`${APP_URL}/login?error=token_missing`);
    }

    // Get user info from X — try both API domains (X has intermittent domain issues)
    const xUser = await fetchXUser(tokens.access_token);
    if (!xUser) {
      return NextResponse.redirect(`${APP_URL}/login?error=user_fetch_failed`);
    }

    // Create/update Supabase user via admin API
    const serviceClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const email = `${xUser.id}@x.helloagain.app`;

    // Upsert user — createUser will fail if exists, that's fine
    const { data: newUser, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        provider_id: xUser.id,
        preferred_username: xUser.username,
        full_name: xUser.name,
        avatar_url: xUser.profile_image_url,
      },
    });

    let userId: string;
    if (createErr) {
      // User already exists — look up by email
      const { data: { users } } = await serviceClient.auth.admin.listUsers();
      const matchedUsers = users?.filter((u: { email?: string }) => u.email === email);
      if (!matchedUsers?.length) {
        console.error('[X OAuth] User not found after create fail:', createErr);
        return NextResponse.redirect(`${APP_URL}/login?error=user_not_found`);
      }
      userId = matchedUsers[0].id;
    } else {
      userId = newUser.user!.id;
    }

    // Upsert profile with X tokens for bookmark import
    await serviceClient.from('profiles').upsert({
      id: userId,
      x_user_id: xUser.id,
      x_handle: xUser.username,
      display_name: xUser.name,
      avatar_url: xUser.profile_image_url || null,
      x_access_token: tokens.access_token,
      x_refresh_token: tokens.refresh_token || null,
      x_token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    }, { onConflict: 'id' });

    // Generate magic link — use hashed_token directly
    const { data: linkData, error: linkErr } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkErr || !linkData) {
      console.error('[X OAuth] Link generation failed:', linkErr);
      return NextResponse.redirect(`${APP_URL}/login?error=link_failed`);
    }

    // Get the token from properties
    const hashedToken = linkData.properties?.hashed_token;
    if (!hashedToken) {
      // Fallback: parse from action_link
      const actionUrl = new URL(linkData.properties?.action_link || 'http://x');
      const fallbackToken = actionUrl.searchParams.get('token');
      if (!fallbackToken) {
        console.error('[X OAuth] No token found. Properties:', JSON.stringify(linkData.properties));
        return NextResponse.redirect(`${APP_URL}/login?error=no_token`);
      }
    }

    const tokenForVerify = hashedToken || (() => {
      const u = new URL(linkData.properties?.action_link || 'http://x');
      return u.searchParams.get('token');
    })();

    // Verify OTP server-side to get session tokens
    const anonClient = createClient(
      SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: verifyData, error: verifyErr } = await anonClient.auth.verifyOtp({
      token_hash: tokenForVerify!,
      type: 'magiclink',
    });

    if (verifyErr || !verifyData.session) {
      console.error('[X OAuth] OTP verify failed:', verifyErr);
      return NextResponse.redirect(`${APP_URL}/login?error=verify_failed`);
    }

    // Redirect to client page with real session tokens
    const sessionUrl = new URL(`${APP_URL}/auth/set-session`);
    sessionUrl.searchParams.set('access_token', verifyData.session.access_token);
    sessionUrl.searchParams.set('refresh_token', verifyData.session.refresh_token);
    if (stateData.extensionId) {
      sessionUrl.searchParams.set('extension_id', stateData.extensionId);
    }

    const response = NextResponse.redirect(sessionUrl.toString());
    response.cookies.delete('x-oauth-state');
    return response;
  } catch (err) {
    console.error('[X OAuth] Unexpected error:', err);
    return NextResponse.redirect(`${APP_URL}/login?error=unexpected`);
  }
}
