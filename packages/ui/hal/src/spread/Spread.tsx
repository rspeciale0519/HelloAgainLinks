// packages/ui/hal/src/spread/Spread.tsx
//
// Phase 5 Task 5.2: bookmark detail modal. Two-column grid — main content
// area on the left with a tab strip (Content / HAL analysis / My notes /
// Thread), and a Related sidebar on the right that wraps the existing
// /api/bookmarks/[id]/related RPC.
//
// Centering uses a flex-centered backdrop wrapper for the same reason the
// Palette does: the slide-up keyframe overrides any transform-based X
// translation, leaving the modal off-center for the duration of the
// animation. Layout owns positioning, the keyframe owns motion.

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Icon } from '../primitives/Icon';
import { formatDate } from '../feed/format-date';
import type { AuthFetch } from '../signal/AskTab';
import { ContentTab } from './ContentTab';
import { AnalysisTab } from './AnalysisTab';
import { NotesTab } from './NotesTab';
import { ThreadTab } from './ThreadTab';
import { RelatedSidebar } from './RelatedSidebar';
import { buildPostUrl, type SpreadBookmark, type SpreadTab } from './types';

export interface SpreadProps {
  /** When non-null, the modal is open and rendering for this bookmark. */
  bookmark: SpreadBookmark | null;
  onClose: () => void;
  authFetch: AuthFetch;
  /** Click a Related row → swap the modal to that bookmark. The host
   *  resolves the id to a bookmark and updates the `bookmark` prop. */
  onJumpTo: (bookmarkId: string) => void;
  /** "Ask HAL about this" footer button. Typically opens the Signal rail
   *  with a prefilled question that references the active bookmark. */
  onAskAbout?: (bookmark: SpreadBookmark) => void;
  /** Called after a successful notes autosave so the host can refresh its
   *  cached bookmark row. */
  onNotesSaved?: (bookmarkId: string, notes: string) => void;
}

const TABS: { id: SpreadTab; label: string }[] = [
  { id: 'content', label: 'Content' },
  { id: 'analysis', label: 'HAL analysis' },
  { id: 'notes', label: 'My notes' },
  { id: 'thread', label: 'Thread' },
];

export function Spread({
  bookmark,
  onClose,
  authFetch,
  onJumpTo,
  onAskAbout,
  onNotesSaved,
}: SpreadProps) {
  const [tab, setTab] = useState<SpreadTab>('content');
  const modalRef = useRef<HTMLDivElement>(null);
  // Reset to Content tab whenever the modal swaps to a different bookmark.
  const lastBookmarkIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bookmark) {
      lastBookmarkIdRef.current = null;
      return;
    }
    if (bookmark.id !== lastBookmarkIdRef.current) {
      lastBookmarkIdRef.current = bookmark.id;
      setTab('content');
    }
  }, [bookmark]);

  // Esc closes the modal. Bound globally so it works whether or not the
  // modal has focus inside it.
  useEffect(() => {
    if (!bookmark) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bookmark, onClose]);

  if (!bookmark) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '4vh 2vw',
        animation: 'hal-fade-in 0.15s',
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Bookmark detail"
        style={{
          width: 1040,
          maxWidth: '100%',
          height: '92vh',
          maxHeight: 920,
          background: 'var(--hal-bg-1)',
          border: '1px solid var(--hal-line-2)',
          borderRadius: 8,
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          overflow: 'hidden',
          animation: 'hal-slide-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        {/* Main column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRight: '1px solid var(--hal-line-1)',
          }}
        >
          <SpreadHeader bookmark={bookmark} onClose={onClose} />
          <SpreadTabs current={tab} onChange={setTab} />
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {tab === 'content' && <ContentTab bookmark={bookmark} />}
            {tab === 'analysis' && <AnalysisTab bookmark={bookmark} />}
            {tab === 'notes' && (
              <NotesTab
                bookmark={bookmark}
                authFetch={authFetch}
                onNotesSaved={onNotesSaved}
              />
            )}
            {tab === 'thread' && <ThreadTab bookmark={bookmark} />}
          </div>
        </div>

        {/* Related sidebar */}
        <RelatedSidebar
          bookmarkId={bookmark.id}
          authFetch={authFetch}
          onJumpTo={onJumpTo}
          onAskAbout={onAskAbout ? () => onAskAbout(bookmark) : undefined}
        />
      </div>
    </div>
  );
}

function SpreadHeader({
  bookmark,
  onClose,
}: {
  bookmark: SpreadBookmark;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 20px',
        borderBottom: '1px solid var(--hal-line-1)',
        background: 'var(--hal-bg-2)',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-a)',
          letterSpacing: '0.1em',
        }}
        title={bookmark.id}
      >
        #{bookmark.id.slice(0, 6).toUpperCase()}
      </span>
      <span style={{ color: 'var(--hal-text-4)' }}>·</span>
      <span
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
        }}
      >
        SAVED {formatDate(bookmark.bookmarked_at)}
      </span>
      <span style={{ color: 'var(--hal-text-4)' }}>·</span>
      <span
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Icon name="at" size={10} /> {bookmark.x_author_handle}
      </span>
      <div style={{ flex: 1 }} />
      <a
        href={buildPostUrl(bookmark)}
        target="_blank"
        rel="noopener noreferrer"
        style={actBtnStyle}
        onMouseEnter={hoverActBtn}
        onMouseLeave={resetActBtn}
      >
        <Icon name="external" size={13} /> Open on X
      </a>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{ ...actBtnStyle, color: 'var(--hal-text-2)' }}
        onMouseEnter={hoverActBtn}
        onMouseLeave={resetActBtn}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

function SpreadTabs({
  current,
  onChange,
}: {
  current: SpreadTab;
  onChange: (t: SpreadTab) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '0 16px',
        borderBottom: '1px solid var(--hal-line-1)',
        flexShrink: 0,
      }}
      role="tablist"
    >
      {TABS.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            style={{
              padding: '10px 12px',
              fontSize: 12,
              fontFamily: 'var(--hal-sans)',
              color: active ? 'var(--hal-text-0)' : 'var(--hal-text-2)',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${active ? 'var(--hal-a)' : 'transparent'}`,
              marginBottom: -1,
              cursor: 'pointer',
              transition: 'color 0.1s',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const actBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 9px',
  fontSize: 12,
  color: 'var(--hal-text-1)',
  background: 'transparent',
  border: 'none',
  borderRadius: 3,
  textDecoration: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--hal-sans)',
  transition: 'all 0.1s',
};

function hoverActBtn(e: React.MouseEvent<HTMLElement>): void {
  e.currentTarget.style.background = 'var(--hal-bg-3)';
  e.currentTarget.style.color = 'var(--hal-text-0)';
}
function resetActBtn(e: React.MouseEvent<HTMLElement>): void {
  e.currentTarget.style.background = 'transparent';
  e.currentTarget.style.color = 'var(--hal-text-1)';
}

// Re-exports so consumers can pull both the modal and the type from one path.
export type { SpreadBookmark, SpreadTab } from './types';
