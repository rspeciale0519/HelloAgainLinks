// packages/ui/hal/src/feed/Card.tsx
'use client';

import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import { Icon } from '../primitives/Icon';
import { formatDate, formatRelative, hashHue } from './format-date';
import { CardGridRow } from './Card.grid';

type Density_ = 'comfortable' | 'compact' | 'grid';

export interface AiTag {
  label: string;
  confidence: number;
}

export interface BookmarkTagRef {
  tag_id: string;
  tags: { id: string; name: string; color: string };
}

export interface CardBookmark {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[];
  bookmarked_at: string;
  post_created_at?: string | null;
  bookmark_tags?: BookmarkTagRef[];
  ai_summary?: string | null;
  ai_tags?: AiTag[] | null;
  folder_id?: string | null;
}

export interface CardProps {
  bookmark: CardBookmark;
  density: Density_;
  selected?: boolean;
  selectionMode?: boolean;
  highlight?: boolean;
  index: number;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onTagClick: (tagName: string) => void;
  onDelete: (id: string, xPostId: string) => void;
  onOpenTagEditor: (id: string, anchor: HTMLElement) => void;
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

export function Card({
  bookmark,
  density,
  selected,
  selectionMode,
  highlight,
  onSelect,
  onOpen,
  onTagClick,
  onDelete,
  onOpenTagEditor,
}: CardProps) {
  const [hover, setHover] = useState(false);

  if (density === 'grid') {
    return (
      <CardGridRow
        bookmark={bookmark}
        selected={selected}
        selectionMode={selectionMode}
        highlight={highlight}
        onSelect={onSelect}
        onOpen={onOpen}
        onDelete={onDelete}
      />
    );
  }

  const aiTags = bookmark.ai_tags ?? [];
  const tagRefs = bookmark.bookmark_tags ?? [];
  const handle = bookmark.x_author_handle;
  const author = bookmark.x_author_name || handle;
  const xUrl = `https://x.com/${handle}/status/${bookmark.x_post_id}`;
  const initial = (author?.[0] ?? handle?.[0] ?? '?').toUpperCase();
  const compact = density === 'compact';
  const pad = compact ? 14 : 18;
  const gap = compact ? 10 : 14;
  const avatarHue = hashHue(handle || bookmark.id);

  const handleCardClick = () => {
    if (selectionMode) onSelect(bookmark.id);
    else onOpen(bookmark.id);
  };

  return (
    <article
      onClick={handleCardClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1fr',
        gap,
        padding: `${pad}px 20px`,
        borderBottom: '1px solid var(--hal-line-1)',
        background: highlight ? 'var(--hal-a-dim)' : hover ? 'var(--hal-bg-1)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
        position: 'relative',
      }}
    >
      {/* Left column: avatar OR selection checkbox */}
      <div style={{ position: 'relative' }}>
        {selectionMode || hover || selected ? (
          <button
            type="button"
            onClick={(e) => {
              stop(e);
              onSelect(bookmark.id);
            }}
            style={{
              width: 20,
              height: 20,
              border: `1.5px solid ${selected ? 'var(--hal-a)' : 'var(--hal-line-2)'}`,
              background: selected ? 'var(--hal-a)' : 'var(--hal-bg-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              cursor: 'pointer',
            }}
            aria-label={selected ? 'Deselect bookmark' : 'Select bookmark'}
          >
            {selected && <Icon name="check" size={11} stroke={2.5} style={{ color: 'var(--hal-bg-0)' }} />}
          </button>
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: `hsl(${avatarHue}, 55%, 55%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--hal-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--hal-bg-0)',
              letterSpacing: '-0.02em',
            }}
            aria-hidden
          >
            {initial}
          </div>
        )}
      </div>

      {/* Right: content */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            fontSize: 12,
            marginBottom: compact ? 4 : 6,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: 'var(--hal-text-0)', fontWeight: 500, fontSize: 13 }}>{author}</span>
          <span style={{ color: 'var(--hal-text-3)', fontFamily: 'var(--hal-mono)', fontSize: 11 }}>
            @{handle}
          </span>
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stop}
            title="View on X"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--hal-text-3)',
              transition: 'color 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--hal-a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--hal-text-3)';
            }}
          >
            <Icon name="external" size={11} />
          </a>
          <div style={{ flex: 1, minWidth: 0 }} />
          <span
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: 'var(--hal-text-3)',
              letterSpacing: '0.04em',
              display: 'flex',
              gap: 8,
            }}
          >
            {bookmark.post_created_at && <span>Posted {formatDate(bookmark.post_created_at)}</span>}
            <span>Saved {formatRelative(bookmark.bookmarked_at)}</span>
          </span>
        </div>

        <div
          style={{
            fontSize: compact ? 14 : 15,
            color: 'var(--hal-text-0)',
            lineHeight: 1.5,
            marginBottom: compact ? 6 : 10,
          }}
        >
          {bookmark.content_text}
        </div>

        {bookmark.ai_summary && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: compact ? '6px 10px' : '8px 12px',
              background: 'var(--hal-bg-2)',
              border: '1px solid var(--hal-line-0)',
              borderLeft: '2px solid var(--hal-a)',
              borderRadius: 3,
              marginBottom: compact ? 6 : 10,
              fontSize: 12,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--hal-mono)',
                color: 'var(--hal-a)',
                fontSize: 10,
                letterSpacing: '0.1em',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              HAL
            </span>
            <span style={{ flex: 1, color: 'var(--hal-text-1)', lineHeight: 1.4 }}>
              {bookmark.ai_summary}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {aiTags.slice(0, 3).map((t, i) => (
            <button
              key={`ai-${t.label}-${i}`}
              type="button"
              onClick={(e) => {
                stop(e);
                onTagClick(t.label);
              }}
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                padding: '2px 7px',
                color: 'var(--hal-a)',
                background: 'var(--hal-a-dim)',
                border: '1px solid rgba(var(--hal-a-rgb), 0.25)',
                borderRadius: 2,
                letterSpacing: '0.02em',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
          {tagRefs.slice(0, 4).map((bt) => (
            <button
              key={bt.tag_id}
              type="button"
              onClick={(e) => {
                stop(e);
                onTagClick(bt.tags.name);
              }}
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                padding: '2px 7px',
                color: 'var(--hal-text-2)',
                background: 'transparent',
                border: '1px solid var(--hal-line-1)',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              #{bt.tags.name}
            </button>
          ))}
        </div>
      </div>

      {/* hover actions */}
      <div
        style={{
          position: 'absolute',
          top: pad,
          right: 20,
          display: 'flex',
          gap: 2,
          opacity: hover ? 1 : 0,
          transition: 'opacity 0.15s',
        }}
      >
        <button
          type="button"
          style={iconBtn}
          title="Manage tags"
          onClick={(e) => {
            stop(e);
            onOpenTagEditor(bookmark.id, e.currentTarget);
          }}
        >
          <Icon name="tag" size={13} />
        </button>
        <button
          type="button"
          style={{ ...iconBtn, color: 'var(--hal-text-2)' }}
          title="Delete"
          onClick={(e) => {
            stop(e);
            onDelete(bookmark.id, bookmark.x_post_id);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--hal-text-2)';
          }}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>
    </article>
  );
}
