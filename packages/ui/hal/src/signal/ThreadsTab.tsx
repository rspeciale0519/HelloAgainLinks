// packages/ui/hal/src/signal/ThreadsTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../primitives/Icon';
import type { AuthFetch } from './AskTab';

export interface ThreadRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ThreadsTabProps {
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  authFetch: AuthFetch;
  /** Bumps when a new conversation is created to force a refresh. */
  refreshKey?: number;
}

export function ThreadsTab({
  onSelectConversation,
  onNewConversation,
  authFetch,
  refreshKey = 0,
}: ThreadsTabProps) {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      const res = await authFetch('/api/conversations');
      if (cancelled) return;
      if (!res) {
        setError('No active session');
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError((err as { error?: string }).error ?? `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { conversations: ThreadRow[] };
      if (cancelled) return;
      setThreads(data.conversations);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, refreshKey]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            color: 'var(--hal-text-3)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Saved conversations
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onNewConversation}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: 'var(--hal-a)',
            background: 'transparent',
            border: '1px solid var(--hal-line-1)',
            borderRadius: 3,
            cursor: 'pointer',
            fontFamily: 'var(--hal-sans)',
          }}
        >
          <Icon name="plus" size={11} />
          New
        </button>
      </div>

      {loading && (
        <div
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 11,
            color: 'var(--hal-text-3)',
            letterSpacing: '0.1em',
          }}
        >
          LOADING…
        </div>
      )}
      {error && (
        <div style={{ fontSize: 12, color: '#ef4444' }}>Error: {error}</div>
      )}
      {!loading && !error && threads.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--hal-text-3)', lineHeight: 1.5 }}>
          No conversations yet. Ask HAL anything in the Ask tab to start one.
        </div>
      )}

      {threads.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelectConversation(t.id)}
          style={{
            padding: '10px 12px',
            background: 'var(--hal-bg-2)',
            border: '1px solid var(--hal-line-1)',
            borderRadius: 4,
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'border-color 0.1s',
            fontFamily: 'var(--hal-sans)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--hal-a)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--hal-line-1)';
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: 'var(--hal-text-0)',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.title || 'Untitled conversation'}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              fontSize: 11,
              fontFamily: 'var(--hal-mono)',
            }}
          >
            <span style={{ color: 'var(--hal-text-3)' }}>
              {formatRelativeTime(t.updated_at)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}
