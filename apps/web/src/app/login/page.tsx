'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
function LoginContent() {
  const searchParams = useSearchParams();
  const extensionId = searchParams.get('extension_id');
  const error = searchParams.get('error');
  const detail = searchParams.get('detail');

  const handleLogin = () => {
    const loginUrl = `/api/auth/x-login${extensionId ? `?extension_id=${extensionId}` : ''}`;
    window.location.href = loginUrl;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass"
        style={{
          padding: '48px',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
          border: '1px solid rgba(0,212,255,0.1)',
          boxShadow: '0 0 60px rgba(0,212,255,0.08)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 700,
            color: '#0a0a0f',
            margin: '0 auto 24px',
            boxShadow: '0 0 30px rgba(0,212,255,0.3)',
          }}
        >
          H
        </div>

        <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '32px' }}>
          {extensionId
            ? 'Sign in with X to connect your extension'
            : 'Sign in with your X account to continue'}
        </p>

        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444',
            fontSize: '13px',
            marginBottom: '16px',
            textAlign: 'left',
          }}>
            {error === 'user_fetch_failed'
              ? `Unable to fetch your X profile. ${detail ? `(Debug: ${detail})` : 'Please try again.'}`
              : error === 'token_failed'
                ? 'Failed to authenticate with X. Please try again.'
                : error === 'token_missing'
                  ? 'X returned an invalid token. Please try again.'
                  : error === 'no_state'
                    ? 'Session expired. Please try logging in again.'
                    : `Auth error: ${error}${detail ? ` (Debug: ${detail})` : ''}`}
          </div>
        )}

        {/* X OAuth Button */}
        <motion.button
          onClick={handleLogin}
          whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(0,212,255,0.3)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: '12px',
            border: '1px solid rgba(0,212,255,0.2)',
            background: 'rgba(0,212,255,0.05)',
            color: '#f0f0f5',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Continue with X
        </motion.button>

        <div style={{ marginTop: '24px', fontSize: '12px', color: '#4a4a5a', lineHeight: 1.6 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#00d4ff', cursor: 'pointer' }}>Terms</span> and{' '}
          <span style={{ color: '#00d4ff', cursor: 'pointer' }}>Privacy Policy</span>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Link href="/" style={{ color: '#8a8a9a', fontSize: '13px', textDecoration: 'none' }}>
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
