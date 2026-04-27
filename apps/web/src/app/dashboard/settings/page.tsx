'use client';

import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { authFetch, authPost } from '@/lib/auth-fetch';
import { useRouter } from 'next/navigation';
import { usePlan } from '@/lib/use-plan';
import {
  PageShell,
  SectionLabel,
  HalPanel,
  HalPrimaryButton,
  HalGhostButton,
} from '@/components/hal/PageShell';

interface SettingsUser {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  email: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SettingsUser | null>(null);
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
    return (
      <PageShell eyebrow="DASHBOARD · SETTINGS" title="Settings">
        <div
          style={{
            padding: '36px 0',
            textAlign: 'center',
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--hal-text-3)',
          }}
        >
          QUERYING…
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="DASHBOARD · SETTINGS"
      title="Settings"
      subtitle="Account, subscription, import. Everything you can configure for HAL."
    >
      <SectionLabel>PROFILE</SectionLabel>
      <HalPanel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt=""
              width={56}
              height={56}
              unoptimized
              style={{
                borderRadius: '50%',
                border: '1px solid var(--hal-line-2)',
              }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--hal-a-dim)',
                border: '1px solid var(--hal-line-2)',
              }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: 'var(--hal-text-0)',
                fontFamily: 'var(--hal-sans)',
              }}
            >
              {user?.name || 'User'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--hal-a)',
                fontFamily: 'var(--hal-mono)',
                marginTop: 3,
              }}
            >
              @{user?.handle || 'unknown'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--hal-text-3)',
                fontFamily: 'var(--hal-mono)',
                marginTop: 3,
              }}
            >
              {user?.email}
            </div>
          </div>
        </div>
      </HalPanel>

      <SectionLabel>SUBSCRIPTION</SectionLabel>
      <HalPanel accent={plan !== 'free'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <PlanBadge plan={plan} />
        </div>
        {plan === 'free' ? (
          <>
            <div
              style={{
                fontSize: 13,
                color: 'var(--hal-text-1)',
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Pro unlocks AI auto-tagging, smart search, unlimited Blends, shared
              lists, and the AI assistant.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <HalPrimaryButton onClick={handleUpgrade}>
                UPGRADE — $9.99/MO
              </HalPrimaryButton>
              <HalGhostButton onClick={handleManageBilling}>
                MANAGE BILLING
              </HalGhostButton>
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontSize: 13,
                color: 'var(--hal-text-1)',
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Full access to all Pro features — AI tagging, smart search, shared
              lists, AI assistant.
            </div>
            <HalGhostButton onClick={handleManageBilling}>
              MANAGE BILLING
            </HalGhostButton>
          </>
        )}
      </HalPanel>

      <ImportSection />

      <SectionLabel>EXTENSION</SectionLabel>
      <HalPanel>
        <div
          style={{
            fontSize: 13,
            color: 'var(--hal-text-1)',
            lineHeight: 1.55,
            marginBottom: 14,
          }}
        >
          The HAL Chrome extension adds a save button to every X post and powers
          the bulk-import path used by the bookmarks page.
        </div>
        <HalGhostButton
          onClick={() =>
            window.open(
              'https://github.com/rspeciale0519/HelloAgain/tree/main/apps/extension',
              '_blank',
            )
          }
        >
          INSTALL EXTENSION →
        </HalGhostButton>
      </HalPanel>

      <SectionLabel>ACCOUNT</SectionLabel>
      <div
        style={{
          background: 'var(--hal-bg-1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 4,
          padding: 22,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: '#ef4444',
            marginBottom: 12,
          }}
        >
          DESTRUCTIVE
        </div>
        <HalGhostButton onClick={handleLogout} danger>
          SIGN OUT
        </HalGhostButton>
      </div>
    </PageShell>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const label =
    plan === 'free' ? 'FREE PLAN' : plan === 'lifetime' ? 'LIFETIME' : 'PRO PLAN';
  const accent = plan !== 'free';
  return (
    <span
      style={{
        padding: '3px 10px',
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        color: accent ? 'var(--hal-a)' : 'var(--hal-text-2)',
        background: accent ? 'var(--hal-a-dim)' : 'var(--hal-bg-2)',
        border: `1px solid ${accent ? 'rgba(var(--hal-a-rgb), 0.3)' : 'var(--hal-line-1)'}`,
        borderRadius: 2,
      }}
    >
      {label}
    </span>
  );
}

function ImportSection() {
  const [hasExtension, setHasExtension] = useState(false);
  const [importState, setImportState] = useState<'idle' | 'running' | 'done' | 'error'>(
    'idle',
  );
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const apiImportEnabled = process.env.NEXT_PUBLIC_API_IMPORT_ENABLED === 'true';
  const [apiImporting, setApiImporting] = useState(false);
  const [apiResult, setApiResult] = useState<{ message: string; status: string } | null>(
    null,
  );

  useEffect(() => {
    const extId = localStorage.getItem('hal_extension_id');
    setHasExtension(!!extId);

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
    setApiResult({
      message: data.message || data.error || 'Done',
      status: res.ok ? 'success' : 'error',
    });
    setApiImporting(false);
  };

  return (
    <>
      <SectionLabel>IMPORT FROM X</SectionLabel>
      <HalPanel>
        <div
          style={{
            fontSize: 13,
            color: 'var(--hal-text-1)',
            lineHeight: 1.55,
            marginBottom: 14,
          }}
        >
          Bulk-import every existing bookmark from X via the Chrome extension.
          Duplicates skip automatically. Stop and resume any time.
        </div>

        {!hasExtension ? (
          <NoticeBox tone="warn">
            Install the HAL Chrome extension first. The extension reads your
            bookmarks page directly — no API fees required.
          </NoticeBox>
        ) : importState === 'idle' ? (
          <HalPrimaryButton onClick={handleExtensionImport}>
            IMPORT FROM X
          </HalPrimaryButton>
        ) : importState === 'running' ? (
          <div>
            <div
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 11,
                letterSpacing: '0.08em',
                color: 'var(--hal-text-2)',
                marginBottom: 10,
              }}
            >
              IMPORTING ·{' '}
              <span style={{ color: 'var(--hal-a)' }}>{imported} SAVED</span>
              {skipped > 0 && (
                <span style={{ color: 'var(--hal-text-3)' }}> · {skipped} SKIPPED</span>
              )}
            </div>
            <HalGhostButton onClick={handleStopImport} danger>
              STOP IMPORT
            </HalGhostButton>
          </div>
        ) : importState === 'done' ? (
          <div>
            <NoticeBox tone="success">
              Imported <strong>{imported}</strong> bookmark
              {imported === 1 ? '' : 's'}
              {skipped > 0 ? ` (${skipped} skipped)` : ''}.
            </NoticeBox>
            {limitReached && (
              <div style={{ marginTop: 8 }}>
                <NoticeBox tone="warn">
                  Plan limit reached — upgrade to Pro for unlimited bookmarks.
                </NoticeBox>
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <HalGhostButton onClick={() => setImportState('idle')}>
                IMPORT AGAIN
              </HalGhostButton>
            </div>
          </div>
        ) : (
          <div>
            <NoticeBox tone="error">{errorMsg || 'Import failed'}</NoticeBox>
            <div style={{ marginTop: 10 }}>
              <HalGhostButton onClick={() => setImportState('idle')}>
                TRY AGAIN
              </HalGhostButton>
            </div>
          </div>
        )}
      </HalPanel>

      {apiImportEnabled && (
        <>
          <SectionLabel>IMPORT VIA X API</SectionLabel>
          <HalPanel>
            <div
              style={{
                fontSize: 13,
                color: 'var(--hal-text-1)',
                lineHeight: 1.55,
                marginBottom: 14,
              }}
            >
              Import directly from the X API. Requires API access on your account.
            </div>
            {apiResult && (
              <div style={{ marginBottom: 12 }}>
                <NoticeBox tone={apiResult.status === 'success' ? 'success' : 'error'}>
                  {apiResult.message}
                </NoticeBox>
              </div>
            )}
            <HalGhostButton onClick={handleApiImport} disabled={apiImporting}>
              {apiImporting ? 'IMPORTING…' : 'IMPORT VIA API'}
            </HalGhostButton>
          </HalPanel>
        </>
      )}
    </>
  );
}

function NoticeBox({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'warn' | 'error';
}) {
  const palette: Record<string, { color: string; bg: string; border: string; label: string }> = {
    success: {
      color: 'var(--hal-a)',
      bg: 'var(--hal-a-dim)',
      border: 'rgba(var(--hal-a-rgb), 0.3)',
      label: 'OK',
    },
    warn: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.3)',
      label: 'NOTICE',
    },
    error: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.3)',
      label: 'ERROR',
    },
  };
  const p = palette[tone];
  return (
    <div
      style={{
        padding: '10px 12px',
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: 3,
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 9,
          letterSpacing: '0.16em',
          color: p.color,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        {p.label}
      </span>
      <span style={{ fontSize: 12.5, color: 'var(--hal-text-1)', lineHeight: 1.5 }}>
        {children}
      </span>
    </div>
  );
}
