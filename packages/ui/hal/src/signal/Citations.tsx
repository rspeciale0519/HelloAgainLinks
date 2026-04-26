// packages/ui/hal/src/signal/Citations.tsx
//
// Citation surface for HAL chat. Replaces the old monospace chip-row with
// two pieces:
//
//   <CitationBadge>  — the inline marker rendered inside HAL's prose.
//                      Looks like a small lime [N] button. Clicking it
//                      smooth-scrolls the matching SourceCard into view
//                      (Msg owns the refs + pulse state).
//
//   <SourceCard>     — the row in the SOURCES · N list under each
//                      assistant message. Shows handle, 2-line snippet,
//                      bookmarked-on date, and an OPEN ON X → anchor
//                      that opens the original post in a new tab.
//
// The exported CitationBookmark type also widens to include an optional
// bookmarked_at field — the new SourceCard footer needs it; the older
// hydration paths (Related tab, feed-page lookup) tolerate it as optional
// without a migration.

'use client';

import { forwardRef, type CSSProperties, type MouseEvent } from 'react';

export interface CitationBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  /** Truncated tweet body — used for snippet line in SourceCard. */
  content_text?: string;
  /** ISO timestamp when the user bookmarked the post. Optional for
   *  backward compat with surfaces that don't fetch it (RelatedTab). */
  bookmarked_at?: string;
}

function buildPostUrl(b: CitationBookmark): string {
  const handle = b.x_author_handle || 'i';
  return `https://x.com/${handle}/status/${b.x_post_id}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // 2026-04-12 — terminal/archive aesthetic, not a localized date.
  return d.toISOString().slice(0, 10);
}

// =====================================================================
// Inline numbered badge — appears INSIDE the assistant's prose where the
// model originally placed a [bm:<uuid>] marker. After extractCitations the
// marker is rewritten to [N], and Msg replaces it with this component.
// =====================================================================

export interface CitationBadgeProps {
  index: number;
  bookmark: CitationBookmark;
  onJump: () => void;
  style?: CSSProperties;
}

export function CitationBadge({ index, bookmark, onJump, style }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onJump}
      title={`Source ${index} — @${bookmark.x_author_handle}`}
      aria-label={`Jump to source ${index} by @${bookmark.x_author_handle}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'baseline',
        margin: '0 1px',
        padding: '0 5px',
        height: 16,
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        lineHeight: '14px',
        color: 'var(--hal-a)',
        background: 'var(--hal-a-dim)',
        border: '1px solid transparent',
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.1s',
        userSelect: 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hal-a)';
        e.currentTarget.style.color = 'var(--hal-bg-0)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--hal-a-dim)';
        e.currentTarget.style.color = 'var(--hal-a)';
      }}
    >
      [{index}]
    </button>
  );
}

// =====================================================================
// Source card — one row in the SOURCES list under an assistant message.
// forwardRef so Msg can scroll-into-view + apply the hal-cite-pulse class
// when the matching inline badge is clicked.
// =====================================================================

export interface SourceCardProps {
  index: number;
  bookmark: CitationBookmark;
  /** True while a freshly clicked inline badge is highlighting this card. */
  pulsing?: boolean;
  style?: CSSProperties;
}

export const SourceCard = forwardRef<HTMLDivElement, SourceCardProps>(function SourceCard(
  { index, bookmark, pulsing, style },
  ref,
) {
  const date = formatDate(bookmark.bookmarked_at);

  // Stop the row's hover from "swallowing" the OPEN ON X anchor's own hover
  // by giving the anchor its own hover handlers.
  const handleAnchorEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = 'var(--hal-a)';
  };
  const handleAnchorLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = 'var(--hal-text-3)';
  };

  return (
    <div
      ref={ref}
      data-source-index={index}
      className={pulsing ? 'hal-cite-pulse' : undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr',
        columnGap: 12,
        rowGap: 4,
        padding: '10px 4px 10px 0',
        borderTop: '1px solid var(--hal-line-0)',
        transition: 'background 0.12s',
        position: 'relative',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hal-bg-1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Ordinal cell */}
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 11,
          color: 'var(--hal-a)',
          letterSpacing: '0.04em',
          paddingTop: 1,
          textAlign: 'right',
          paddingRight: 2,
        }}
      >
        [{index}]
      </div>

      {/* Content cell — handle row + snippet + footer row */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10.5,
              color: 'var(--hal-text-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            @{bookmark.x_author_handle}
          </span>
        </div>

        {bookmark.content_text && (
          <div
            style={{
              fontFamily: 'var(--hal-sans)',
              fontSize: 12,
              color: 'var(--hal-text-2)',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {bookmark.content_text}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            marginTop: 2,
          }}
        >
          {date && (
            <span
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                color: 'var(--hal-text-3)',
                letterSpacing: '0.04em',
              }}
            >
              {date}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <a
            href={buildPostUrl(bookmark)}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={handleAnchorEnter}
            onMouseLeave={handleAnchorLeave}
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: 'var(--hal-text-3)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'color 0.1s',
            }}
          >
            Open on X →
          </a>
        </div>
      </div>
    </div>
  );
});
