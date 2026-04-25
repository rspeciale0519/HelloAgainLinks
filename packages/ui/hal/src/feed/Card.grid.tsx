// packages/ui/hal/src/feed/Card.grid.tsx
'use client';

import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { Icon } from '../primitives/Icon';
import { formatRelative } from './format-date';
import type { CardBookmark } from './Card';

export interface CardGridRowProps {
  bookmark: CardBookmark;
  selected?: boolean;
  selectionMode?: boolean;
  highlight?: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onDelete: (id: string, xPostId: string) => void;
}

const iconBtn: CSSProperties = {
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--hal-text-2)',
  background: 'transparent',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  transition: 'all 0.1s',
};

function stop(e: ReactMouseEvent) {
  e.stopPropagation();
}

export function CardGridRow({
  bookmark,
  selected,
  selectionMode,
  highlight,
  onSelect,
  onOpen,
  onDelete,
}: CardGridRowProps) {
  const [hover, setHover] = useState(false);
  const aiTags = bookmark.ai_tags ?? [];
  const handle = bookmark.x_author_handle;
  const xUrl = `https://x.com/${handle}/status/${bookmark.x_post_id}`;

  const handleClick = () => {
    if (selectionMode) onSelect(bookmark.id);
    else onOpen(bookmark.id);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '20px 110px 1fr 200px 90px',
        gap: 14,
        alignItems: 'center',
        padding: '9px 18px',
        borderBottom: '1px solid var(--hal-line-0)',
        background: hover ? 'var(--hal-bg-2)' : highlight ? 'var(--hal-a-dim)' : 'transparent',
        cursor: 'pointer',
        fontSize: 12,
        transition: 'background 0.1s',
      }}
    >
      <div
        onClick={(e) => {
          stop(e);
          onSelect(bookmark.id);
        }}
        style={{
          width: 13,
          height: 13,
          border: `1px solid ${selected ? 'var(--hal-a)' : 'var(--hal-line-2)'}`,
          background: selected ? 'var(--hal-a)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: selectionMode || hover || selected ? 1 : 0,
          transition: 'opacity 0.15s',
          cursor: 'pointer',
        }}
      >
        {selected && <Icon name="check" size={9} stroke={2} style={{ color: 'var(--hal-bg-0)' }} />}
      </div>
      <span
        style={{
          color: 'var(--hal-text-3)',
          fontFamily: 'var(--hal-mono)',
          fontSize: 11,
        }}
      >
        {formatRelative(bookmark.bookmarked_at)}
      </span>
      <span
        style={{
          color: 'var(--hal-text-0)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--hal-text-2)', marginRight: 8 }}>@{handle}</span>
        {bookmark.content_text}
      </span>
      <div style={{ display: 'flex', gap: 5, overflow: 'hidden' }}>
        {aiTags.slice(0, 2).map((t, i) => (
          <span
            key={`${t.label}-${i}`}
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              padding: '1px 6px',
              color: 'var(--hal-a)',
              background: 'var(--hal-a-dim)',
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 4,
          justifyContent: 'flex-end',
          opacity: hover ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          style={iconBtn}
          title="View on X"
        >
          <Icon name="external" size={12} />
        </a>
        <button
          type="button"
          style={iconBtn}
          title="Delete"
          onClick={(e) => {
            stop(e);
            onDelete(bookmark.id, bookmark.x_post_id);
          }}
        >
          <Icon name="trash" size={12} />
        </button>
      </div>
    </div>
  );
}
