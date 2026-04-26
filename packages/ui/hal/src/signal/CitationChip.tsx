// packages/ui/hal/src/signal/CitationChip.tsx
'use client';

import type { CSSProperties } from 'react';

export interface CitationBookmark {
  id: string;
  x_author_handle: string;
  content_text?: string;
}

export interface CitationChipProps {
  bookmark: CitationBookmark;
  onJumpTo: (bookmarkId: string) => void;
  style?: CSSProperties;
}

/**
 * Pill-shaped citation chip rendered after assistant messages.
 * Format: "#<id-prefix> @<author>". Click jumps to the bookmark in Spread.
 */
export function CitationChip({ bookmark, onJumpTo, style }: CitationChipProps) {
  const idPrefix = `#${bookmark.id.slice(0, 6)}`;
  return (
    <button
      type="button"
      onClick={() => onJumpTo(bookmark.id)}
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
    </button>
  );
}
