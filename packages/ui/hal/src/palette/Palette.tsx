// packages/ui/hal/src/palette/Palette.tsx
//
// Phase 5 ⌘K command palette. Combines a single search box with three slot
// types of results:
//   1. Actions   — toggle Signal, change density, ask HAL with the literal query
//   2. Folders   — jump the feed to a folder (passed in via props from sidebar state)
//   3. Bookmarks — server-side full-text search via /api/bookmarks/search,
//                  debounced 150ms (faster than the feed's 300ms because the
//                  palette is keystroke-responsive)
//
// The host page (apps/web/src/app/dashboard/bookmarks/page.tsx) owns the
// open/close state and supplies callbacks for what each result actually does
// — the palette is purely a search/select surface.

'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from '../primitives/Icon';
import type { AuthFetch } from '../signal/AskTab';

export type PaletteDensity = 'comfortable' | 'compact' | 'grid';

export interface PaletteFolder {
  id: string;
  name: string;
}

interface PaletteBookmark {
  id: string;
  x_author_handle: string;
  content_text: string;
}

export interface PaletteProps {
  open: boolean;
  onClose: () => void;
  authFetch: AuthFetch;
  /** Folder list — typically the sidebar's current set, minus virtuals. */
  folders: PaletteFolder[];
  /** Jump the feed view to a folder. */
  onSelectFolder: (folderId: string) => void;
  /** Open a single bookmark — Phase 5 will wire this to the Spread modal. */
  onOpenBookmark: (bookmarkId: string) => void;
  /** Compose a new conversation with the typed query as the first message. */
  onAskHal: (query: string) => void;
  /** Toggle the Signal rail visibility. */
  onToggleSignal: () => void;
  /** Change the feed's density mode. */
  onSetDensity: (d: PaletteDensity) => void;
}

interface ActionCommand {
  id: string;
  label: string;
  icon: IconName;
  shortcut?: string;
  onRun: () => void;
}

type FlatRow =
  | { type: 'ask'; query: string }
  | { type: 'cmd'; cmd: ActionCommand }
  | { type: 'folder'; folder: PaletteFolder }
  | { type: 'bm'; bm: PaletteBookmark };

const SEARCH_DEBOUNCE_MS = 150;
const BOOKMARK_RESULT_LIMIT = 8;
const FOLDER_RESULT_LIMIT = 5;

export function Palette({
  open,
  onClose,
  authFetch,
  folders,
  onSelectFolder,
  onOpenBookmark,
  onAskHal,
  onToggleSignal,
  onSetDensity,
}: PaletteProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [bmResults, setBmResults] = useState<PaletteBookmark[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Timestamp of the last keyboard navigation. Mouse-move events ignore
  // hover-to-select for a short window after this so the cursor sitting
  // anywhere over the panel doesn't yank selection from under the user
  // while they're stepping with arrow keys.
  const keyboardNavAtRef = useRef(0);

  // Reset state on open and focus the input.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setDebouncedQuery('');
    setSelectedIdx(0);
    setBmResults([]);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  // Debounce the search query.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Reset selection whenever the visible-results set shifts.
  useEffect(() => {
    setSelectedIdx(0);
  }, [debouncedQuery]);

  // Bookmark search round-trip.
  useEffect(() => {
    if (!open) return;
    if (!debouncedQuery) {
      setBmResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({
        q: debouncedQuery,
        page: '1',
        pageSize: String(BOOKMARK_RESULT_LIMIT),
      });
      const res = await authFetch(`/api/bookmarks/search?${params}`);
      if (cancelled || !res?.ok) return;
      const json = (await res.json()) as { data?: PaletteBookmark[] };
      if (!cancelled) setBmResults(json.data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, authFetch]);

  const actionCommands = useMemo<ActionCommand[]>(
    () => [
      {
        id: 'sig',
        label: 'Toggle Signal rail',
        icon: 'signal',
        shortcut: '⌘J',
        onRun: () => {
          onToggleSignal();
          onClose();
        },
      },
      {
        id: 'cmfy',
        label: 'Density: comfortable',
        icon: 'list',
        onRun: () => {
          onSetDensity('comfortable');
          onClose();
        },
      },
      {
        id: 'cmpct',
        label: 'Density: compact',
        icon: 'menu',
        onRun: () => {
          onSetDensity('compact');
          onClose();
        },
      },
      {
        id: 'grid',
        label: 'Density: data-grid',
        icon: 'grid',
        onRun: () => {
          onSetDensity('grid');
          onClose();
        },
      },
    ],
    [onSetDensity, onToggleSignal, onClose],
  );

  // Folder filter — substring match on name.
  const filteredFolders = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return folders.slice(0, FOLDER_RESULT_LIMIT);
    return folders
      .filter((f) => f.name.toLowerCase().includes(q))
      .slice(0, FOLDER_RESULT_LIMIT);
  }, [folders, debouncedQuery]);

  // Action filter — substring match on label.
  const filteredActions = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return actionCommands;
    return actionCommands.filter((c) => c.label.toLowerCase().includes(q));
  }, [actionCommands, debouncedQuery]);

  // Flatten everything into a single keyboard-navigable array.
  // Order: Ask HAL (only when there's a query) → Actions → Folders → Bookmarks.
  const flat = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    if (debouncedQuery) {
      out.push({ type: 'ask', query: debouncedQuery });
    }
    for (const c of filteredActions) out.push({ type: 'cmd', cmd: c });
    for (const f of filteredFolders) out.push({ type: 'folder', folder: f });
    for (const b of bmResults) out.push({ type: 'bm', bm: b });
    return out;
  }, [debouncedQuery, filteredActions, filteredFolders, bmResults]);

  const runRow = (row: FlatRow | undefined) => {
    if (!row) return;
    if (row.type === 'ask') {
      onAskHal(row.query);
      onClose();
    } else if (row.type === 'cmd') {
      row.cmd.onRun();
    } else if (row.type === 'folder') {
      onSelectFolder(row.folder.id);
      onClose();
    } else if (row.type === 'bm') {
      onOpenBookmark(row.bm.id);
      onClose();
    }
  };

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        keyboardNavAtRef.current = Date.now();
        setSelectedIdx((i) => Math.min(flat.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        keyboardNavAtRef.current = Date.now();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        runRow(flat[selectedIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, selectedIdx, onClose]);

  // Scroll the active row into view as the user steps through with arrow keys
  // or as the result set shifts. `block: 'nearest'` avoids ping-ponging the
  // scroll position when an entire short list already fits.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(`[data-palette-idx="${selectedIdx}"]`);
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [open, selectedIdx, flat.length]);

  if (!open) return null;

  // Track visual row index across sections so keyboard selection lines up.
  let visualIdx = -1;
  const renderRow = (row: FlatRow, content: ReactNode) => {
    visualIdx += 1;
    const idx = visualIdx;
    const active = idx === selectedIdx;
    return (
      <button
        key={`${row.type}-${idx}`}
        type="button"
        data-palette-idx={idx}
        onMouseMove={() => {
          // Suppress hover-to-select for ~120ms after a keyboard nav so the
          // user's stationary cursor doesn't yank selection while they step
          // with arrow keys.
          if (Date.now() - keyboardNavAtRef.current < 120) return;
          if (idx !== selectedIdx) setSelectedIdx(idx);
        }}
        onClick={() => runRow(row)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '9px 16px',
          paddingLeft: active ? 14 : 16,
          fontSize: 13,
          color: active ? 'var(--hal-text-0)' : 'var(--hal-text-1)',
          background: active ? 'var(--hal-bg-3)' : 'transparent',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          borderLeft: active ? '2px solid var(--hal-a)' : '2px solid transparent',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'var(--hal-sans)',
          transition: 'background 0.05s',
        }}
      >
        {content}
      </button>
    );
  };

  const askRow = flat.find((r) => r.type === 'ask');

  return (
    <div
      // Backdrop + flex-centered wrapper. Doubling up keeps the modal off any
      // transform-based centering — the slide-up keyframe overrides the
      // transform property, which used to leave the modal sitting half-width
      // to the right of center for the entire 0.2s animation. Flex centering
      // owns layout; the keyframe owns motion. Click-outside-to-close fires
      // only when the click target IS the wrapper (not a descendant).
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '15vh',
        animation: 'hal-fade-in 0.15s',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: 620,
          maxWidth: '92vw',
          maxHeight: '70vh',
          background: 'var(--hal-bg-1)',
          border: '1px solid var(--hal-line-2)',
          borderRadius: 8,
          boxShadow:
            '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(var(--hal-a-rgb), 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'hal-slide-up 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--hal-line-1)',
          }}
        >
          <Icon name="command" size={15} style={{ color: 'var(--hal-a)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, navigate, or ask…"
            style={{
              flex: 1,
              fontSize: 15,
              color: 'var(--hal-text-0)',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--hal-sans)',
            }}
            aria-label="Command palette search"
          />
          <span style={kbdStyle}>ESC</span>
        </div>

        <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {askRow && (
            <>
              <Section>Ask HAL</Section>
              {renderRow(askRow, (
                <>
                  <Icon name="sparkle" size={14} style={{ color: 'var(--hal-a)' }} />
                  <span style={{ flex: 1 }}>
                    Ask HAL:{' '}
                    <span style={{ color: 'var(--hal-a)', fontStyle: 'italic' }}>
                      &ldquo;{askRow.query}&rdquo;
                    </span>
                  </span>
                  <span style={kbdStyle}>↵</span>
                </>
              ))}
            </>
          )}

          {filteredActions.length > 0 && (
            <>
              <Section>Actions</Section>
              {filteredActions.map((c) =>
                renderRow({ type: 'cmd', cmd: c }, (
                  <>
                    <Icon name={c.icon} size={14} style={{ color: 'var(--hal-text-2)' }} />
                    <span style={{ flex: 1 }}>{c.label}</span>
                    {c.shortcut && <span style={kbdStyle}>{c.shortcut}</span>}
                  </>
                )),
              )}
            </>
          )}

          {filteredFolders.length > 0 && (
            <>
              <Section>Folders</Section>
              {filteredFolders.map((f) =>
                renderRow({ type: 'folder', folder: f }, (
                  <>
                    <Icon name="folder" size={14} style={{ color: 'var(--hal-text-2)' }} />
                    <span style={{ flex: 1 }}>{f.name}</span>
                    <span style={mutedKbdStyle}>jump</span>
                  </>
                )),
              )}
            </>
          )}

          {bmResults.length > 0 && (
            <>
              <Section>
                Bookmarks
                {debouncedQuery ? ` · ${bmResults.length} match` : ''}
              </Section>
              {bmResults.map((b) =>
                renderRow({ type: 'bm', bm: b }, (
                  <>
                    <span
                      style={{
                        fontFamily: 'var(--hal-mono)',
                        fontSize: 10,
                        color: 'var(--hal-text-3)',
                        width: 50,
                        flexShrink: 0,
                      }}
                    >
                      #{b.id.slice(0, 6)}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: 'var(--hal-text-2)', marginRight: 6 }}>
                        @{b.x_author_handle}
                      </span>
                      {b.content_text}
                    </span>
                    <span style={mutedKbdStyle}>open</span>
                  </>
                )),
              )}
            </>
          )}

          {flat.length === 0 && (
            <div
              style={{
                padding: 30,
                textAlign: 'center',
                color: 'var(--hal-text-2)',
                fontSize: 13,
              }}
            >
              No matches. Press{' '}
              <span style={{ fontFamily: 'var(--hal-mono)', color: 'var(--hal-a)' }}>↵</span>{' '}
              to ask HAL instead.
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            padding: '8px 16px',
            borderTop: '1px solid var(--hal-line-1)',
            background: 'var(--hal-bg-2)',
            fontSize: 10,
            color: 'var(--hal-text-3)',
            fontFamily: 'var(--hal-mono)',
            letterSpacing: '0.05em',
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--hal-a)' }}>● online</span>
        </div>
      </div>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '8px 16px 4px',
        fontFamily: 'var(--hal-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--hal-text-3)',
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

const kbdStyle: CSSProperties = {
  fontFamily: 'var(--hal-mono)',
  fontSize: 10,
  color: 'var(--hal-text-3)',
  border: '1px solid var(--hal-line-1)',
  padding: '2px 6px',
  borderRadius: 3,
};

const mutedKbdStyle: CSSProperties = {
  fontFamily: 'var(--hal-mono)',
  fontSize: 10,
  color: 'var(--hal-text-3)',
};
