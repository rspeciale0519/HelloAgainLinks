// packages/ui/hal/src/signal/Msg.tsx
'use client';

import type { CSSProperties } from 'react';
import { CitationChip, type CitationBookmark } from './CitationChip';

export type MsgRole = 'user' | 'assistant';

export interface MsgItem {
  /** Stable client-side key. Use the persisted db id once available, otherwise a temp local id. */
  key: string;
  role: MsgRole;
  text: string;
  citedIds?: string[];
  /** True while assistant text is still streaming — adds the blinking cursor. */
  streaming?: boolean;
  /** Surface upstream errors inline (assistant role only). */
  error?: string | null;
}

export interface MsgProps {
  m: MsgItem;
  bookmarkLookup: Record<string, CitationBookmark>;
  /**
   * When provided, an assistant message with citations renders a "Pin N to feed"
   * pill below the chips. Clicking pipes the cited ids into the bookmarks feed
   * so the user can browse them like a search result set.
   */
  onPinToFeed?: (bookmarkIds: string[]) => void;
  style?: CSSProperties;
}

export function Msg({ m, bookmarkLookup, onPinToFeed, style }: MsgProps) {
  if (m.role === 'user') {
    return (
      <div
        style={{
          padding: '8px 12px',
          background: 'var(--hal-bg-3)',
          borderRadius: 4,
          fontSize: 13,
          color: 'var(--hal-text-0)',
          alignSelf: 'flex-end',
          maxWidth: '90%',
          marginLeft: 'auto',
          whiteSpace: 'pre-wrap',
          ...style,
        }}
      >
        {m.text}
      </div>
    );
  }

  const validCites = (m.citedIds ?? [])
    .map((id) => bookmarkLookup[id])
    .filter((bm): bm is CitationBookmark => Boolean(bm));

  return (
    <div style={{ display: 'flex', gap: 8, ...style }}>
      <span
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-a)',
          letterSpacing: '0.1em',
          paddingTop: 2,
          flexShrink: 0,
        }}
      >
        HAL
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: m.error ? '#ef4444' : 'var(--hal-text-1)',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {m.error ? `Error: ${m.error}` : m.text}
          {m.streaming && (
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 6,
                height: 13,
                background: 'var(--hal-a)',
                marginLeft: 2,
                verticalAlign: 'middle',
                animation: 'hal-blink 0.8s infinite',
              }}
            />
          )}
        </div>
        {validCites.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            {validCites.map((bm) => (
              <CitationChip key={bm.id} bookmark={bm} />
            ))}
          </div>
        )}
        {validCites.length > 0 && onPinToFeed && (
          <button
            type="button"
            onClick={() => onPinToFeed(validCites.map((bm) => bm.id))}
            style={{
              marginTop: 6,
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              letterSpacing: '0.08em',
              color: 'var(--hal-a)',
              background: 'transparent',
              border: '1px solid var(--hal-a)',
              borderRadius: 2,
              padding: '2px 8px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hal-a-dim)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            VIEW {validCites.length} IN FEED →
          </button>
        )}
      </div>
    </div>
  );
}
