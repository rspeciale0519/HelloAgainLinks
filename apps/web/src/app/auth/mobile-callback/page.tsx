'use client';

import { useEffect, useMemo, useState } from 'react';

function getHandoffFromLocation() {
  const hashParams = new URLSearchParams(window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash);
  return hashParams.get('handoff');
}

export default function MobileAuthCallbackPage() {
  const [handoff, setHandoff] = useState<string | null>(null);
  const [attemptedOpen, setAttemptedOpen] = useState(false);

  useEffect(() => {
    setHandoff(getHandoffFromLocation());
  }, []);

  const fallbackUrl = useMemo(() => {
    if (!handoff) return null;
    const callbackUrl = new URL('helloagainlinks://auth/callback');
    callbackUrl.hash = new URLSearchParams({ handoff }).toString();
    return callbackUrl.toString();
  }, [handoff]);

  const openApp = () => {
    if (!fallbackUrl) return;
    setAttemptedOpen(true);
    window.location.href = fallbackUrl;
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#0a0a0f',
        color: '#f0f0f5',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', lineHeight: 1.2 }}>
          Finish signing in on your phone
        </h1>
        <p style={{ margin: '12px 0 0', color: '#b6b6c3', lineHeight: 1.6 }}>
          Hello Again Links should open automatically through its verified mobile link.
          If it does not, use the button below to return to the app and finish sign in.
        </p>
        <button
          onClick={openApp}
          disabled={!fallbackUrl}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '14px 16px',
            borderRadius: '14px',
            border: 'none',
            background: fallbackUrl ? 'linear-gradient(135deg, #00d4ff, #0ea5e9)' : '#30303a',
            color: '#0a0a0f',
            fontWeight: 700,
            cursor: fallbackUrl ? 'pointer' : 'not-allowed',
          }}
        >
          Open Hello Again Links
        </button>
        {attemptedOpen ? (
          <p style={{ margin: '14px 0 0', color: '#8a8a9a', fontSize: '13px', lineHeight: 1.5 }}>
            If nothing happens, reopen the Hello Again Links app manually and try signing in again.
          </p>
        ) : null}
      </section>
    </main>
  );
}
