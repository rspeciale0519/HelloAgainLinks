// packages/ui/hal/src/signal/RelatedTab.tsx
'use client';

import { useEffect, useState } from 'react';
import type { AuthFetch } from './AskTab';
import type { CitationBookmark } from './Citations';

export interface RelatedBookmark extends CitationBookmark {
  primary_category?: string | null;
  strength: number;
}

export interface RelatedTabProps {
  activeBookmarkId: string | null;
  onJumpTo: (bookmarkId: string) => void;
  bookmarkLookup: Record<string, CitationBookmark>;
  authFetch: AuthFetch;
}

interface Cluster {
  name: string;
  items: RelatedBookmark[];
  strength: number;
}

export function RelatedTab({
  activeBookmarkId,
  onJumpTo,
  bookmarkLookup,
  authFetch,
}: RelatedTabProps) {
  const [items, setItems] = useState<RelatedBookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems([]);
    setError(null);
    if (!activeBookmarkId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await authFetch(`/api/bookmarks/${activeBookmarkId}/related`);
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
      const data = (await res.json()) as { related: RelatedBookmark[] };
      if (cancelled) return;
      setItems(data.related);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBookmarkId, authFetch]);

  if (!activeBookmarkId) {
    return (
      <div style={{ fontSize: 12, color: 'var(--hal-text-3)', lineHeight: 1.5 }}>
        Open a bookmark to see related entries.
      </div>
    );
  }
  if (loading) {
    return (
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 11,
          color: 'var(--hal-text-3)',
          letterSpacing: '0.1em',
        }}
      >
        CLUSTERING…
      </div>
    );
  }
  if (error) return <div style={{ fontSize: 12, color: '#ef4444' }}>Error: {error}</div>;
  if (items.length === 0) {
    return (
      <div style={{ fontSize: 12, color: 'var(--hal-text-3)', lineHeight: 1.5 }}>
        No related bookmarks. Add tags or wait for classification to surface
        connections.
      </div>
    );
  }

  const clusters = groupByCategory(items);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Detected clusters
      </div>
      {clusters.map((c) => (
        <div key={c.name}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontSize: 13,
              color: 'var(--hal-text-0)',
              marginBottom: 6,
            }}
          >
            <span style={{ fontWeight: 500 }}>{c.name}</span>
            <span
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                color: 'var(--hal-text-3)',
              }}
            >
              {c.items.length} doc{c.items.length === 1 ? '' : 's'}
            </span>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                color: 'var(--hal-a)',
              }}
            >
              {(c.strength * 100).toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: 2,
              background: 'var(--hal-line-1)',
              marginBottom: 8,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${c.strength * 100}%`,
                background: 'var(--hal-a)',
                boxShadow: '0 0 8px var(--hal-a-glow)',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {c.items.map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => onJumpTo(bm.id)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '6px 8px',
                  fontSize: 12,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  fontFamily: 'var(--hal-sans)',
                  color: 'var(--hal-text-1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hal-bg-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--hal-mono)',
                    fontSize: 10,
                    color: 'var(--hal-text-3)',
                    flexShrink: 0,
                  }}
                >
                  #{bm.id.slice(0, 6)}
                </span>
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  @{bm.x_author_handle}
                  {bm.content_text ? `: ${bm.content_text.slice(0, 40)}…` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {/* `bookmarkLookup` is used for parity with AskTab citation chips; the
         clustering API already returns hydrated rows so we don't depend on it
         here, but accepting the prop keeps the SignalRail surface consistent. */}
      {void bookmarkLookup}
    </div>
  );
}

function groupByCategory(items: RelatedBookmark[]): Cluster[] {
  const buckets = new Map<string, RelatedBookmark[]>();
  for (const bm of items) {
    const key = bm.primary_category && bm.primary_category.trim().length > 0
      ? bm.primary_category
      : 'Uncategorized';
    const arr = buckets.get(key) ?? [];
    arr.push(bm);
    buckets.set(key, arr);
  }
  const out: Cluster[] = [];
  for (const [name, list] of buckets) {
    const total = list.reduce((acc, b) => acc + (b.strength ?? 0), 0);
    const avg = list.length > 0 ? total / list.length : 0;
    out.push({ name: humanize(name), items: list, strength: clamp01(avg) });
  }
  out.sort((a, b) => b.strength - a.strength);
  return out;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function humanize(slug: string): string {
  if (slug === 'Uncategorized') return slug;
  return slug
    .split(/[-_\s]+/)
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join(' ');
}
