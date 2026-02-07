'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';

function ExtensionCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'sending' | 'success' | 'error'>('sending');

  useEffect(() => {
    const token = searchParams.get('token');
    const extensionId = searchParams.get('extension_id');

    if (!token || !extensionId) {
      setStatus('error');
      return;
    }

    try {
      const data = JSON.parse(decodeURIComponent(token));
      // Send token to extension via chrome.runtime.sendMessage
      const w = window as unknown as Record<string, unknown>;
      const cr = (w.chrome as Record<string, unknown> | undefined);
      const rt = cr?.runtime as { sendMessage?: (id: string, msg: unknown, cb: (r: unknown) => void) => void } | undefined;
      if (rt?.sendMessage) {
        rt.sendMessage(extensionId, { type: 'AUTH_TOKEN', data }, (response: unknown) => {
          const res = response as { success?: boolean } | null;
          if (res?.success) {
            setStatus('success');
            setTimeout(() => window.close(), 1500);
          } else {
            localStorage.setItem('helloagain_auth_token', JSON.stringify(data));
            setStatus('success');
            setTimeout(() => window.close(), 1500);
          }
        });
      } else {
        localStorage.setItem('helloagain_auth_token', JSON.stringify(data));
        setStatus('success');
      }
    } catch {
      setStatus('error');
    }
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
            <p style={{ color: '#00d4ff', fontWeight: 600 }}>Connected! This window will close.</p>
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
