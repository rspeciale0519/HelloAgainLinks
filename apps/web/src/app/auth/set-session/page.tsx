'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type ExtensionAuthPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: {
    id: string;
    handle: string;
    name: string;
    avatar: string;
  };
};

function getTokenParams(searchParams: { get(name: string): string | null }) {
  if (typeof window === 'undefined') {
    return { accessToken: null, refreshToken: null };
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    accessToken: hashParams.get('access_token') ?? searchParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token') ?? searchParams.get('refresh_token'),
  };
}

function clearTokenUrl() {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', '/auth/set-session');
}

/** True when the extension opened this tab solely to complete OAuth. */
function isExtensionInitiatedLogin(): boolean {
  try {
    return sessionStorage.getItem('hal_login_src') === 'extension';
  } catch {
    return false;
  }
}

async function sendAuthToExtension(
  payload: ExtensionAuthPayload,
  closeTab: boolean,
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const extensionId = localStorage.getItem('hal_extension_id');
  if (!extensionId) return false;

  const w = window as unknown as Record<string, unknown>;
  const cr = w.chrome as Record<string, unknown> | undefined;
  const rt = cr?.runtime as {
    sendMessage?: (
      id: string,
      msg: unknown,
      cb: (response: unknown) => void
    ) => void;
  } | undefined;

  const sendMessage = rt?.sendMessage;
  if (!sendMessage) return false;

  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, 1500);

    sendMessage(extensionId, { type: 'AUTH_TOKEN', data: payload, closeTab }, (response: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      const res = response as { success?: boolean } | null;
      resolve(Boolean(res?.success));
    });
  });
}

function SetSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    // Run exactly once per mount. clearTokenUrl() wipes the hash, so a second
    // invocation (StrictMode double-invoke, or any re-render of this effect)
    // finds no tokens and would bounce a successfully-authenticated user to
    // /login?error=no_tokens — the "auth flash" that was previously masked
    // because the extension closed the tab before anyone saw it.
    if (startedRef.current) return;
    startedRef.current = true;

    const { accessToken, refreshToken } = getTokenParams(searchParams);

    if (!accessToken || !refreshToken) {
      router.push('/login?error=no_tokens');
      return;
    }
    clearTokenUrl();

    const supabase = getSupabaseBrowserClient();
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    }).then(async ({ error, data }) => {
      if (error) {
        console.error('Failed to set session:', error);
        router.push('/login?error=session_failed');
        return;
      }

      if (data.session) {
        const profile = data.user?.user_metadata;
        const tokenData: ExtensionAuthPayload = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: data.user?.id || '',
            handle: profile?.preferred_username || '',
            name: profile?.full_name || '',
            avatar: profile?.avatar_url || '',
          },
        };

        // Always hand the token to the extension when one is installed, so it
        // stays signed in. But only STOP here when the extension opened this
        // tab for OAuth — it will close the tab itself. An ordinary web login
        // must carry on to the dashboard; returning unconditionally is what
        // stranded web users (the extension closed the tab out from under them).
        const extensionLogin = isExtensionInitiatedLogin();
        const delivered = await sendAuthToExtension(tokenData, extensionLogin);
        if (delivered && extensionLogin) {
          try {
            sessionStorage.removeItem('hal_login_src');
          } catch {
            // non-fatal — the flag is scoped to this tab anyway
          }
          return;
        }
      }

      // Check if first-time user (no bookmarks = new user)
      if (data.session) {
        try {
          const bmRes = await fetch('/api/bookmarks?pageSize=1', {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
          });
          if (bmRes.ok) {
            const bmData = await bmRes.json();
            if ((bmData.total || 0) === 0) {
              router.push('/welcome');
              return;
            }
          }
        } catch {
          // If check fails, just go to dashboard
        }
      }

      router.push('/dashboard');
    });
  }, [searchParams, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00d4ff',
        fontSize: '16px',
      }}
    >
      Signing you in...
    </div>
  );
}

export default function SetSessionPage() {
  return (
    <Suspense>
      <SetSessionContent />
    </Suspense>
  );
}
