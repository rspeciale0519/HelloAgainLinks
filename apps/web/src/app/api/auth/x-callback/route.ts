import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const X_CLIENT_ID = process.env.X_CLIENT_ID!;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
    // Exchange code for tokens
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

    // Get user info from X
    const userRes = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${APP_URL}/login?error=user_fetch_failed`);
    }

    const { data: xUser } = await userRes.json();

    // Create/update Supabase user via admin API
    const serviceClient = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user exists by x_user_id
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('x_user_id', xUser.id)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
      // Update profile
      await serviceClient.from('profiles').update({
        x_handle: xUser.username,
        display_name: xUser.name,
        avatar_url: xUser.profile_image_url || null,
      }).eq('id', userId);
    } else {
      // Create new Supabase user
      const email = `${xUser.id}@x.helloagain.app`;
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

      if (createErr || !newUser.user) {
        console.error('[X OAuth] User creation failed:', createErr);
        return NextResponse.redirect(`${APP_URL}/login?error=user_create_failed`);
      }

      userId = newUser.user.id;

      // Create profile
      await serviceClient.from('profiles').upsert({
        id: userId,
        x_user_id: xUser.id,
        x_handle: xUser.username,
        display_name: xUser.name,
        avatar_url: xUser.profile_image_url || null,
      }, { onConflict: 'id' });
    }

    // Generate a Supabase session for this user
    const { data: session, error: sessionErr } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: `${xUser.id}@x.helloagain.app`,
    });

    if (sessionErr || !session) {
      console.error('[X OAuth] Session generation failed:', sessionErr);
      return NextResponse.redirect(`${APP_URL}/login?error=session_failed`);
    }

    // Use the token hash to create a session via verify OTP
    const tokenHash = new URL(session.properties?.action_link || '').searchParams.get('token_hash');

    if (!tokenHash) {
      return NextResponse.redirect(`${APP_URL}/login?error=no_token_hash`);
    }

    // Redirect to a page that verifies the OTP and sets the session
    const verifyUrl = new URL(`${APP_URL}/api/auth/verify`);
    verifyUrl.searchParams.set('token_hash', tokenHash);
    verifyUrl.searchParams.set('type', 'magiclink');
    if (stateData.extensionId) {
      verifyUrl.searchParams.set('extension_id', stateData.extensionId);
    }

    const response = NextResponse.redirect(verifyUrl.toString());
    // Clear the state cookie
    response.cookies.delete('x-oauth-state');

    return response;
  } catch (err) {
    console.error('[X OAuth] Unexpected error:', err);
    return NextResponse.redirect(`${APP_URL}/login?error=unexpected`);
  }
}
