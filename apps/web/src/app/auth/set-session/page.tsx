'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

function SetSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      router.push('/login?error=no_tokens');
      return;
    }

    const extensionId = searchParams.get('extension_id');

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

      // If login was triggered from the Chrome extension, send auth back to it
      if (extensionId && data.session) {
        const profile = data.user?.user_metadata;
        const tokenData = encodeURIComponent(JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: data.user?.id || '',
            handle: profile?.preferred_username || '',
            name: profile?.full_name || '',
            avatar: profile?.avatar_url || '',
          },
        }));
        router.push(`/auth/extension-callback?token=${tokenData}&extension_id=${extensionId}`);
        return;
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
