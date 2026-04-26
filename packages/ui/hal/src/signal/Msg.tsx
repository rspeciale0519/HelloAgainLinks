// packages/ui/hal/src/signal/Msg.tsx
'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  CitationBadge,
  SourceCard,
  type CitationBookmark,
} from './Citations';

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
   * FEED →" pill below the source list. Clicking pipes the cited ids into
   * the bookmarks feed so the user can browse them like a search result set.
   */
  onPinToFeed?: (bookmarkIds: string[]) => void;
  style?: CSSProperties;
}

// Match in-prose [N] markers minted by extractCitations.
const ORDINAL_MARKER_RE = /\[(\d+)\]/g;
// Strip raw [bm:<uuid>] fragments visually during streaming. The server's
// `done` event delivers the cleaned text where these are rewritten to [N],
// but mid-stream the chunks haven't passed through the rewriter yet, so the
// user would briefly see the raw uuid form. Hide it.
const RAW_BM_MARKER_RE = /\[bm:[0-9a-f-]{6,}\]/gi;

const PULSE_MS = 1500;

export function Msg({ m, bookmarkLookup, onPinToFeed, style }: MsgProps) {
  // ---- All hooks declared before any conditional return so hook order
  //      stays stable across user/assistant role switches. ----
  const sourceRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [pulsingIndex, setPulsingIndex] = useState<number | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimeoutRef.current) {
        clearTimeout(pulseTimeoutRef.current);
      }
    };
  }, []);

  const handleJump = useCallback((index: number) => {
    const node = sourceRefs.current.get(index);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    setPulsingIndex(index);
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
    pulseTimeoutRef.current = setTimeout(() => setPulsingIndex(null), PULSE_MS);
  }, []);

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
  const sources: Array<{ index: number; bookmark: CitationBookmark }> = [];
  for (let i = 0; i < citedIds.length; i += 1) {
    const bm = bookmarkLookup[citedIds[i]];
    if (bm) sources.push({ index: i + 1, bookmark: bm });
  }
  const sourceByIndex = new Map(sources.map((s) => [s.index, s.bookmark]));
  const renderText = m.error ? `Error: ${m.error}` : m.text;
  const renderedNodes = renderTextWithBadges(renderText, sourceByIndex, handleJump);

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
          {renderedNodes}
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

        {sources.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <SectionDivider count={sources.length} />

            {onPinToFeed && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginTop: 8,
                  marginBottom: 6,
                }}
              >
                <button
                  type="button"
                  onClick={() => onPinToFeed(sources.map((s) => s.bookmark.id))}
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
                  VIEW {sources.length} IN FEED →
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sources.map(({ index, bookmark }) => (
                <SourceCard
                  key={bookmark.id}
                  ref={(node) => {
                    if (node) sourceRefs.current.set(index, node);
                    else sourceRefs.current.delete(index);
                  }}
                  index={index}
                  bookmark={bookmark}
                  pulsing={pulsingIndex === index}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionDivider({ count }: { count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--hal-text-3)',
      }}
    >
      <span>SOURCES · {count}</span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'var(--hal-line-1)',
        }}
      />
    </div>
  );
}

/**
 * Walk the assistant text and replace each in-range [N] marker with a
 * <CitationBadge>. Out-of-range numbers (e.g. a tweet quoting "[42]") stay
 * as literal text. Raw [bm:<uuid>] fragments — possible mid-stream before
 * the server rewriter has run — are stripped visually.
 */
function renderTextWithBadges(
  text: string,
  sourceByIndex: Map<number, CitationBookmark>,
  onJump: (index: number) => void,
): ReactNode[] {
  // Strip mid-stream raw markers so they never flash on screen.
  const sanitized = text.replace(RAW_BM_MARKER_RE, '');

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let nodeKey = 0;
  const matches = Array.from(sanitized.matchAll(ORDINAL_MARKER_RE));

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      nodes.push(
        <Fragment key={`t-${nodeKey++}`}>{sanitized.slice(cursor, matchIndex)}</Fragment>,
      );
    }
    const ordinal = Number.parseInt(match[1], 10);
    const bookmark = sourceByIndex.get(ordinal);
    if (bookmark) {
      nodes.push(
        <CitationBadge
          key={`b-${nodeKey++}-${ordinal}`}
          index={ordinal}
          bookmark={bookmark}
          onJump={() => onJump(ordinal)}
        />,
      );
    } else {
      // Out-of-range — leave the literal text alone (false-positive guard
      // for tweet content that happens to contain [N]).
      nodes.push(<Fragment key={`t-${nodeKey++}`}>{match[0]}</Fragment>);
    }
    cursor = matchIndex + match[0].length;
  }

  if (cursor < sanitized.length) {
    nodes.push(<Fragment key={`t-${nodeKey++}`}>{sanitized.slice(cursor)}</Fragment>);
  }

  // If the message has no citations at all, return the sanitized string
  // wrapped in a fragment so React renders it identically to the previous
  // implementation.
  if (nodes.length === 0) {
    return [<Fragment key="t-0">{sanitized}</Fragment>];
  }

  return nodes;
}
