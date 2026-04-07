'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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

function ExtensionCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'sending' | 'success' | 'error'>('sending');
  const [cannotClose, setCannotClose] = useState(false);

  useEffect(() => {
    const extensionId = localStorage.getItem('hal_extension_id');
    if (!extensionId) {
      setStatus('error');
      return;
    }

    const sendToExtension = (data: ExtensionAuthPayload) => {
      const w = window as unknown as Record<string, unknown>;
      const cr = w.chrome as Record<string, unknown> | undefined;
      const rt = cr?.runtime as {
        sendMessage?: (id: string, msg: unknown, cb: (response: unknown) => void) => void;
      } | undefined;

      if (!rt?.sendMessage) {
        setStatus('error');
        return;
      }

      rt.sendMessage(extensionId, { type: 'AUTH_TOKEN', data }, (response: unknown) => {
        const res = response as { success?: boolean } | null;
        if (!res?.success) {
          setStatus('error');
          return;
        }

        setStatus('success');
        setTimeout(() => {
          window.close();
          setTimeout(() => setCannotClose(true), 500);
        }, 1500);
      });
    };

    const legacyToken = searchParams.get('token');
    if (legacyToken) {
      try {
        window.history.replaceState({}, '', '/auth/extension-callback');
        const data = JSON.parse(decodeURIComponent(legacyToken)) as ExtensionAuthPayload;
        sendToExtension(data);
        return;
      } catch {
        setStatus('error');
        return;
      }
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setStatus('error');
        return;
      }

      const profile = session.user.user_metadata;
      sendToExtension({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || Math.floor(Date.now() / 1000) + 3600,
        user: {
          id: session.user.id,
          handle: profile?.preferred_username || '',
          name: profile?.full_name || '',
          avatar: profile?.avatar_url || '',
        },
      });
    }).catch(() => {
      setStatus('error');
    });
  }, [searchParams]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div>
        {status === 'sending' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔗</div>
            <p style={{ color: '#8a8a9a' }}>Connecting to extension...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✅</div>
            <p style={{ color: '#00d4ff', fontWeight: 600 }}>
              {cannotClose ? 'Connected! You can close this tab.' : 'Connected! This window will close.'}
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>❌</div>
            <p style={{ color: '#ef4444' }}>Failed to connect. Please try again.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ExtensionCallbackPage() {
  return (
    <Suspense>
      <ExtensionCallbackContent />
    </Suspense>
  );
}
