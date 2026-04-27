// packages/ui/hal/src/spread/ContentTab.tsx
'use client';

import { Avatar } from '../primitives/Avatar';
import { formatDate } from '../feed/format-date';
import type { SpreadBookmark } from './types';

export interface ContentTabProps {
  bookmark: SpreadBookmark;
}

export function ContentTab({ bookmark }: ContentTabProps) {
  const media = bookmark.media_urls ?? [];
  const postedAt = bookmark.post_created_at ? formatDate(bookmark.post_created_at) : null;
  const savedAt = formatDate(bookmark.bookmarked_at);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Avatar
          avatarUrl={bookmark.x_author_avatar_url}
          name={bookmark.x_author_name || bookmark.x_author_handle}
          handle={bookmark.x_author_handle}
          size={44}
        />
        <div style={{ lineHeight: 1.2, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              color: 'var(--hal-text-0)',
              fontWeight: 500,
              fontFamily: 'var(--hal-sans)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bookmark.x_author_name || bookmark.x_author_handle}
          </div>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 11,
              color: 'var(--hal-text-3)',
            }}
          >
            @{bookmark.x_author_handle}
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: 18,
          color: 'var(--hal-text-0)',
          lineHeight: 1.5,
          marginBottom: 20,
          letterSpacing: '-0.01em',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'var(--hal-sans)',
        }}
      >
        {bookmark.content_text}
      </div>

      {media.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 20,
          }}
        >
          {media.map((url, i) => (
            <a
              key={`${url}-${i}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '14px 16px',
                background: 'var(--hal-bg-2)',
                border: '1px dashed var(--hal-line-2)',
                borderRadius: 4,
                fontFamily: 'var(--hal-mono)',
                fontSize: 11,
                color: 'var(--hal-text-2)',
                letterSpacing: '0.05em',
                textDecoration: 'none',
                wordBreak: 'break-all',
                transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--hal-a)';
                e.currentTarget.style.borderColor = 'var(--hal-a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--hal-text-2)';
                e.currentTarget.style.borderColor = 'var(--hal-line-2)';
              }}
            >
              MEDIA · {url}
            </a>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 18,
          fontSize: 11,
          color: 'var(--hal-text-3)',
          fontFamily: 'var(--hal-mono)',
          letterSpacing: '0.05em',
        }}
      >
        {postedAt && <span>POSTED · {postedAt}</span>}
        <span>SAVED · {savedAt}</span>
      </div>
    </div>
  );
}
