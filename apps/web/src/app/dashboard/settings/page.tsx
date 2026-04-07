'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { authFetch, authPost } from '@/lib/auth-fetch';
import { useRouter } from 'next/navigation';
import { usePlan } from '@/lib/use-plan';

function ImportSection() {
  const [hasExtension, setHasExtension] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // API-based import (feature-flagged)
  const apiImportEnabled = process.env.NEXT_PUBLIC_API_IMPORT_ENABLED === 'true';
  const [apiImporting, setApiImporting] = useState(false);
  const [apiResult, setApiResult] = useState<{ message: string; status: string } | null>(null);

  useEffect(() => {
    // Check for extension
    const extId = localStorage.getItem('hal_extension_id');
    setHasExtension(!!extId);

    // Listen for import progress from extension via dashboard.ts
    function handleMessage(event: MessageEvent) {
      if (event.data?.source !== 'hal-extension') return;
      if (event.data.type === 'BULK_IMPORT_PROGRESS') {
        setImportState('running');
        setImported(event.data.imported || 0);
        setSkipped(event.data.skipped || 0);
        setLimitReached(event.data.limitReached || false);
      } else if (event.data.type === 'BULK_IMPORT_DONE') {
        setImportState('done');
        setImported(event.data.imported || 0);
        setSkipped(event.data.skipped || 0);
        setLimitReached(event.data.limitReached || false);
      } else if (event.data.type === 'BULK_IMPORT_ERROR') {
        setImportState('error');
        setErrorMsg(event.data.error || 'Import failed');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleExtensionImport = () => {
    setImportState('running');
    setImported(0);
    setSkipped(0);
    setLimitReached(false);
    window.postMessage({ source: 'hal-dashboard', type: 'START_BULK_IMPORT' }, '*');
  };

  const handleStopImport = () => {
    window.postMessage({ source: 'hal-dashboard', type: 'STOP_BULK_IMPORT' }, '*');
    setImportState('done');
  };

  const handleApiImport = async () => {
    setApiImporting(true);
    setApiResult(null);

    const res = await authFetch('/api/import', { method: 'POST' });
    if (!res) return;

    const data = await res.json();
    setApiResult({ message: data.message || data.error || 'Done', status: res.ok ? 'success' : 'error' });
    setApiImporting(false);
  };

  return (
    <>
      {/* Extension-based import (always shown) */}
      <div className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Import X Bookmarks</h2>
        <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
          Import all your bookmarks from X/Twitter using the HAL Chrome extension. Duplicates are automatically skipped.
        </div>

        {!hasExtension ? (
          <div style={{
            padding: '14px', borderRadius: '10px', fontSize: '13px',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
            color: '#f59e0b', lineHeight: 1.6,
          }}>
            Install the <strong>HAL Chrome extension</strong> to import your bookmarks.
            The extension reads your bookmarks page directly — no API fees required.
          </div>
        ) : importState === 'idle' ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExtensionImport}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Import from X
          </motion.button>
        ) : importState === 'running' ? (
          <div>
            <div style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '12px' }}>
              Importing... <span style={{ color: '#00d4ff', fontWeight: 600 }}>{imported}</span> saved
              {skipped > 0 && <span style={{ color: '#4a4a5a' }}> ({skipped} skipped)</span>}
            </div>
            <button
              onClick={handleStopImport}
              style={{
                padding: '8px 20px', borderRadius: '10px',
                border: '1px solid rgba(239,68,68,0.2)', background: 'transparent',
                color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Stop Import
            </button>
          </div>
        ) : importState === 'done' ? (
          <div>
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
              background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)', color: '#00d4ff',
            }}>
              Imported <strong>{imported}</strong> bookmarks{skipped > 0 ? ` (${skipped} skipped)` : ''}
            </div>
            {limitReached && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b',
              }}>
                Plan limit reached — upgrade to Pro for unlimited bookmarks
              </div>
            )}
            <button
              onClick={() => setImportState('idle')}
              style={{
                background: 'none', border: 'none', color: '#00d4ff',
                fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Import again
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444',
            }}>
              {errorMsg || 'Import failed'}
            </div>
            <button
              onClick={() => setImportState('idle')}
              style={{
                background: 'none', border: 'none', color: '#00d4ff',
                fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* API-based import (feature-flagged for future use) */}
      {apiImportEnabled && (
        <div className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>API Import</h2>
          <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
            Import bookmarks directly via the X API. Requires API access.
          </div>
          {apiResult && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
              background: apiResult.status === 'success' ? 'rgba(0,212,255,0.08)' : 'rgba(239,68,68,0.08)',
              color: apiResult.status === 'success' ? '#00d4ff' : '#ef4444',
              border: `1px solid ${apiResult.status === 'success' ? 'rgba(0,212,255,0.15)' : 'rgba(239,68,68,0.15)'}`,
            }}>
              {apiResult.message}
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleApiImport}
            disabled={apiImporting}
            style={{
              padding: '10px 24px', borderRadius: '10px', border: '1px solid rgba(0,212,255,0.15)',
              background: apiImporting ? 'rgba(0,212,255,0.05)' : 'transparent',
              color: '#00d4ff', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              opacity: apiImporting ? 0.6 : 1,
            }}
          >
            {apiImporting ? 'Importing...' : 'Import via API'}
          </motion.button>
        </div>
      )}
    </>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; handle: string; avatar: string; email: string } | null>(null);
  const plan = usePlan(user?.id);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const meta = session.user.user_metadata || {};
        setUser({
          id: session.user.id,
          name: meta.full_name || meta.name || '',
          handle: meta.preferred_username || meta.user_name || '',
          avatar: meta.avatar_url || meta.picture || '',
          email: session.user.email || '',
        });
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleUpgrade = async () => {
    const res = await authPost('/api/stripe/checkout', { priceId: 'pro_monthly' });

    if (res?.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  };

  const handleManageBilling = async () => {
    const res = await authFetch('/api/stripe/portal', { method: 'POST' });

    if (res?.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  };

  if (loading) {
    return <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px' }}>Loading...</div>;
  }

  const sectionStyle = {
    padding: '24px',
    borderRadius: '14px',
    marginBottom: '20px',
  };

  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>Settings</h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>Manage your account and subscription.</p>
      </div>

      {/* Profile */}
      <div className="glass glow-border" style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Profile</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt=""
              width={56}
              height={56}
              unoptimized
              style={{ borderRadius: '50%', border: '2px solid rgba(0,212,255,0.2)' }}
            />
          ) : (
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,212,255,0.1)', border: '2px solid rgba(0,212,255,0.2)' }} />
          )}
          <div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: '14px', color: '#00d4ff' }}>@{user?.handle || 'unknown'}</div>
            <div style={{ fontSize: '12px', color: '#4a4a5a', marginTop: '2px' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Subscription */}
      <div className="glass glow-border" style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Subscription</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <span style={{
            padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
            background: plan === 'free' ? 'rgba(0,212,255,0.08)' : 'rgba(34,197,94,0.1)',
            color: plan === 'free' ? '#00d4ff' : '#22c55e',
            border: `1px solid ${plan === 'free' ? 'rgba(0,212,255,0.15)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            {plan === 'free' ? 'Free Plan' : plan === 'lifetime' ? '⭐ Lifetime' : '✦ Pro Plan'}
          </span>
        </div>
        {plan === 'free' ? (
          <>
            <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
              Upgrade to Pro for AI auto-tagging, smart search, unlimited Blends, shared lists, and the AI assistant.
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpgrade}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
                  fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Upgrade to Pro — $9.99/mo
              </motion.button>
              <button
                onClick={handleManageBilling}
                style={{
                  padding: '10px 24px', borderRadius: '10px',
                  border: '1px solid rgba(0,212,255,0.15)', background: 'transparent',
                  color: '#8a8a9a', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Manage Billing
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
              You have full access to all Pro features — AI tagging, smart search, shared lists, and the AI assistant.
            </div>
            <button
              onClick={handleManageBilling}
              style={{
                padding: '10px 24px', borderRadius: '10px',
                border: '1px solid rgba(0,212,255,0.15)', background: 'transparent',
                color: '#8a8a9a', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Manage Billing
            </button>
          </>
        )}
      </div>

      {/* Import Bookmarks */}
      <ImportSection />

      {/* Chrome Extension */}
      <div className="glass glow-border" style={sectionStyle}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Chrome Extension</h2>
        <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6, marginBottom: '16px' }}>
          Save bookmarks directly from X/Twitter with one click. The extension adds a HAL button to every tweet.
        </div>
        <button
          onClick={() => window.open('https://github.com/rspeciale0519/HelloAgain/tree/main/apps/extension', '_blank')}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.15)', background: 'transparent',
            color: '#00d4ff', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Install Extension →
        </button>
      </div>

      {/* Danger zone */}
      <div className="glass" style={{ ...sectionStyle, border: '1px solid rgba(239,68,68,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444', marginBottom: '16px' }}>Account</h2>
        <button
          onClick={handleLogout}
          style={{
            padding: '10px 24px', borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)',
            color: '#ef4444', fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
