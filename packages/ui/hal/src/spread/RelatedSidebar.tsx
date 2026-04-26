// packages/ui/hal/src/spread/RelatedSidebar.tsx
'use client';

import { useEffect, useState } from 'react';
import { Icon } from '../primitives/Icon';
import type { AuthFetch } from '../signal/AskTab';

export interface RelatedRow {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  primary_category?: string | null;
  ai_tags?: Array<{ label: string; confidence: number }> | null;
  strength: number;
}

export interface RelatedSidebarProps {
  bookmarkId: string;
  authFetch: AuthFetch;
  onJumpTo: (bookmarkId: string) => void;
  /** Click "Ask HAL about this" — typically opens the Signal rail with a
   *  prefilled question about the active bookmark. */
  onAskAbout?: () => void;
}

export function RelatedSidebar({
  bookmarkId,
  authFetch,
  onJumpTo,
  onAskAbout,
}: RelatedSidebarProps) {
  const [items, setItems] = useState<RelatedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems([]);
    setError(null);
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await authFetch(`/api/bookmarks/${bookmarkId}/related`);
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
      const data = (await res.json()) as { related: RelatedRow[] };
      if (cancelled) return;
      setItems(data.related ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookmarkId, authFetch]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--hal-bg-0)',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--hal-line-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <Icon name="signal" size={13} style={{ color: 'var(--hal-a)' }} />
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            color: 'var(--hal-text-2)',
            letterSpacing: '0.12em',
          }}
        >
          RELATED
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            color: 'var(--hal-a)',
          }}
        >
          {loading ? '…' : items.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div
            style={{
              padding: 20,
              fontSize: 12,
              color: 'var(--hal-text-3)',
              textAlign: 'center',
              fontFamily: 'var(--hal-mono)',
              letterSpacing: '0.08em',
            }}
          >
            CLUSTERING…
          </div>
        )}
        {error && !loading && (
          <div
            style={{
              padding: 20,
              fontSize: 12,
              color: '#ef4444',
              textAlign: 'center',
            }}
          >
            Error: {error}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div
            style={{
              padding: 20,
              fontSize: 12,
              color: 'var(--hal-text-3)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            No related bookmarks indexed yet.
          </div>
        )}
        {items.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onJumpTo(b.id)}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--hal-line-0)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.1s',
              fontFamily: 'var(--hal-sans)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hal-bg-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 10,
                  color: 'var(--hal-text-3)',
                }}
              >
                #{b.id.slice(0, 6)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--hal-text-0)' }}>
                {b.x_author_name || b.x_author_handle}
              </span>
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 10,
                  color: 'var(--hal-text-3)',
                }}
              >
                @{b.x_author_handle}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--hal-text-2)',
                lineHeight: 1.4,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {b.content_text}
            </div>
            {b.ai_tags && b.ai_tags.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {b.ai_tags.slice(0, 2).map((t, i) => (
                  <span
                    key={`${t.label}-${i}`}
                    style={{
                      fontFamily: 'var(--hal-mono)',
                      fontSize: 9,
                      padding: '1px 5px',
                      color: 'var(--hal-a)',
                      background: 'var(--hal-a-dim)',
                      borderRadius: 2,
                    }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {onAskAbout && (
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--hal-line-1)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onAskAbout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              background: 'var(--hal-a-dim)',
              border: '1px solid var(--hal-a)',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--hal-a)',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--hal-sans)',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(var(--hal-a-rgb), 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--hal-a-dim)';
            }}
          >
            <Icon name="sparkle" size={13} />
            <span style={{ flex: 1, textAlign: 'left' }}>Ask HAL about this</span>
          </button>
        </div>
      )}
    </div>
  );
}
