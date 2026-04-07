'use client';

import { useEffect } from 'react';
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

async function sendAuthToExtension(payload: ExtensionAuthPayload): Promise<boolean> {
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

    sendMessage(extensionId, { type: 'AUTH_TOKEN', data: payload }, (response: unknown) => {
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

  useEffect(() => {
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

        const delivered = await sendAuthToExtension(tokenData);
        if (delivered) return;
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
