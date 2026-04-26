// packages/ui/hal/src/signal/CitationChip.tsx
'use client';

import type { CSSProperties } from 'react';

export interface CitationBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  content_text?: string;
}

export interface CitationChipProps {
  bookmark: CitationBookmark;
  style?: CSSProperties;
}

function buildPostUrl(b: CitationBookmark): string {
  const handle = b.x_author_handle || 'i';
  return `https://x.com/${handle}/status/${b.x_post_id}`;
}

/**
 * Pill-shaped citation chip rendered after assistant messages.
 * Format: "#<id-prefix> @<author>". Click opens the original X post in a
 * new tab. Phase 5 may wrap this with a click handler that opens a Spread
 * modal instead — for now the anchor is the whole interaction.
 */
export function CitationChip({ bookmark, style }: CitationChipProps) {
  const idPrefix = `#${bookmark.id.slice(0, 6)}`;
  return (
    <a
      href={buildPostUrl(bookmark)}
      target="_blank"
      rel="noopener noreferrer"
      title={bookmark.content_text ?? `Open post by @${bookmark.x_author_handle} on X`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 7px',
        fontSize: 11,
        fontFamily: 'var(--hal-mono)',
        color: 'var(--hal-text-1)',
        background: 'var(--hal-bg-2)',
        border: '1px solid var(--hal-line-1)',
        borderRadius: 3,
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'all 0.1s',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--hal-a)';
        e.currentTarget.style.color = 'var(--hal-a)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--hal-line-1)';
        e.currentTarget.style.color = 'var(--hal-text-1)';
      }}
    >
      <span style={{ color: 'var(--hal-text-3)' }}>{idPrefix}</span>
      <span
        style={{
          maxWidth: 140,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        @{bookmark.x_author_handle}
      </span>
    </a>
  );
}
