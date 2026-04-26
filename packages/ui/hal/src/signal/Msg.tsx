// packages/ui/hal/src/signal/Msg.tsx
'use client';

import {
  Fragment,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { buildPostUrl, type CitationBookmark } from './Citations';

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
   * When provided, an assistant message with citations renders a "VIEW N IN
   * FEED →" pill above the prose. Clicking pipes the cited ids into the
   * bookmarks feed so the user can browse them like a search result set.
   */
  onPinToFeed?: (bookmarkIds: string[]) => void;
  style?: CSSProperties;
}

// Match in-prose [N] markers minted by extractCitations.
const ORDINAL_MARKER_RE = /\[(\d+)\]/g;
// Strip raw [bm:<uuid>] fragments visually during streaming. The server's
// `done` event delivers the cleaned text where these are rewritten to [N],
// but mid-stream the chunks haven't passed through the rewriter yet.
const RAW_BM_MARKER_RE = /\[bm:[0-9a-f-]{6,}\]/gi;

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

  // Assistant role.
  const citedIds = m.citedIds ?? [];
  // Map ordinal → bookmark for O(1) lookup while walking lines.
  const sourceByIndex = new Map<number, CitationBookmark>();
  for (let i = 0; i < citedIds.length; i += 1) {
    const bm = bookmarkLookup[citedIds[i]];
    if (bm) sourceByIndex.set(i + 1, bm);
  }

  // Total cited bookmarks that we actually have hydration for — drives the
  // VIEW N IN FEED pill count and the gate on rendering it at all.
  const pinIds: string[] = [];
  for (let i = 1; i <= citedIds.length; i += 1) {
    if (sourceByIndex.has(i)) pinIds.push(citedIds[i - 1]);
  }

  const renderText = m.error ? `Error: ${m.error}` : m.text;
  const lineNodes = renderProseLines(renderText, sourceByIndex);

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
        {pinIds.length > 0 && onPinToFeed && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => onPinToFeed(pinIds)}
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--hal-a)',
                background: 'transparent',
                border: '1px solid var(--hal-a)',
                borderRadius: 2,
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hal-a-dim)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              VIEW {pinIds.length} IN FEED →
            </button>
          </div>
        )}

        <div
          style={{
            fontSize: 13,
            color: m.error ? '#ef4444' : 'var(--hal-text-1)',
            lineHeight: 1.5,
          }}
        >
          {lineNodes}
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
      </div>
    </div>
  );
}

function ViewOnXLink({ bookmark }: { bookmark: CitationBookmark }) {
  const handleEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = 'var(--hal-a)';
  };
  const handleLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = 'var(--hal-text-3)';
  };
  return (
    <a
      href={buildPostUrl(bookmark)}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        display: 'inline-block',
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--hal-text-3)',
        textDecoration: 'none',
        transition: 'color 0.1s',
        padding: '1px 0',
      }}
    >
      View post by{' '}
      <span style={{ textTransform: 'none' }}>@{bookmark.x_author_handle}</span>{' '}
      on X →
    </a>
  );
}

/**
 * Walk the assistant text line-by-line. For every line that contains valid
 * [N] markers, strip the markers from the text and emit one
 * "View this post on X →" link per marker on its own line directly below.
 * Out-of-range numbers (e.g. a tweet quoting "[42]") stay as literal text —
 * a false-positive guard since the model can't know the user's ordinal cap.
 * Raw [bm:<uuid>] fragments — possible mid-stream before the server
 * rewriter has run — are stripped visually.
 */
function renderProseLines(
  text: string,
  sourceByIndex: Map<number, CitationBookmark>,
): ReactNode[] {
  const sanitized = text.replace(RAW_BM_MARKER_RE, '');
  const rawLines = sanitized.split('\n');
  const out: ReactNode[] = [];

  rawLines.forEach((line, lineIdx) => {
    const matches = Array.from(line.matchAll(ORDINAL_MARKER_RE));

    // Collect bookmarks for valid markers in this line, in appearance order.
    const linkBookmarks: CitationBookmark[] = [];
    let cleaned = line;
    for (const match of matches) {
      const ordinal = Number.parseInt(match[1], 10);
      const bm = sourceByIndex.get(ordinal);
      if (!bm) continue; // out-of-range — leave literal text in `cleaned`
      linkBookmarks.push(bm);
      cleaned = cleaned.replace(match[0], '');
    }

    // Tidy whitespace + orphan punctuation from removed markers.
    cleaned = cleaned
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/[ \t]+$/g, '');

    // Render the line itself if it has content. Empty lines become single
    // empty <div>s so paragraph breaks in the model output survive.
    out.push(
      <div
        key={`l-${lineIdx}`}
        style={{ whiteSpace: 'pre-wrap', minHeight: cleaned.length === 0 ? '1.5em' : undefined }}
      >
        {cleaned.length > 0 ? cleaned : ' '}
      </div>,
    );

    if (linkBookmarks.length > 0) {
      out.push(
        <div
          key={`links-${lineIdx}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            margin: '4px 0 10px 0',
          }}
        >
          {linkBookmarks.map((bm, i) => (
            <Fragment key={`${bm.id}-${i}`}>
              <ViewOnXLink bookmark={bm} />
            </Fragment>
          ))}
        </div>,
      );
    }
  });

  return out;
}
