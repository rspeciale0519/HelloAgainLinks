// packages/ui/hal/src/spread/NotesTab.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { AuthFetch } from '../signal/AskTab';
import type { SpreadBookmark } from './types';

const AUTOSAVE_DEBOUNCE_MS = 1000;

export interface NotesTabProps {
  bookmark: SpreadBookmark;
  authFetch: AuthFetch;
  /** Called after a successful save with the persisted notes value, so the
   *  host can refresh its cached bookmark row. */
  onNotesSaved?: (bookmarkId: string, notes: string) => void;
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export function NotesTab({ bookmark, authFetch, onNotesSaved }: NotesTabProps) {
  const [value, setValue] = useState<string>(bookmark.user_notes ?? '');
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  // Latest committed value, so we can skip no-op saves and avoid clobbering
  // the textarea when the bookmark prop refreshes from a server round-trip.
  const lastCommittedRef = useRef<string>(bookmark.user_notes ?? '');
  // Track the bookmark id this tab is bound to — when the user opens a
  // different bookmark, reset state to its notes.
  const boundIdRef = useRef<string>(bookmark.id);

  // When the user navigates Spread to a different bookmark, swap the buffer.
  useEffect(() => {
    if (bookmark.id === boundIdRef.current) return;
    boundIdRef.current = bookmark.id;
    const next = bookmark.user_notes ?? '';
    setValue(next);
    lastCommittedRef.current = next;
    setStatus('idle');
    setSavedAt(null);
  }, [bookmark.id, bookmark.user_notes]);

  // Debounced autosave — fires AUTOSAVE_DEBOUNCE_MS after the user stops typing.
  useEffect(() => {
    if (status === 'idle') return;
    if (value === lastCommittedRef.current) {
      setStatus('idle');
      return;
    }
    const t = setTimeout(async () => {
      setStatus('saving');
      const res = await authFetch(`/api/bookmarks/${bookmark.id}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      });
      if (!res || !res.ok) {
        setStatus('error');
        return;
      }
      lastCommittedRef.current = value;
      setStatus('saved');
      setSavedAt(Date.now());
      onNotesSaved?.(bookmark.id, value);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value, status, authFetch, bookmark.id, onNotesSaved]);

  // Tick once a second while showing the "saved Xs ago" label so it stays
  // accurate. Runs in both 'saved' and 'idle' (with a savedAt) since the
  // status settles back to 'idle' after each successful save.
  useEffect(() => {
    if (savedAt == null) return;
    if (status !== 'saved' && status !== 'idle') return;
    const t = setInterval(() => setTick((k) => k + 1), 1000);
    return () => clearInterval(t);
  }, [status, savedAt]);

  // Reference `tick` so the linter doesn't strip it; the re-render is the side
  // effect we want.
  void tick;

  return (
    <div>
      <textarea
        value={value}
        placeholder="Your notes on this bookmark…"
        onChange={(e) => {
          setValue(e.target.value);
          setStatus('pending');
        }}
        style={{
          width: '100%',
          minHeight: 320,
          background: 'var(--hal-bg-2)',
          border: '1px solid var(--hal-line-1)',
          borderRadius: 4,
          padding: 14,
          fontSize: 14,
          lineHeight: 1.6,
          color: 'var(--hal-text-0)',
          fontFamily: 'var(--hal-sans)',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color 0.1s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--hal-a)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--hal-line-1)';
        }}
      />
      <div
        style={{
          marginTop: 10,
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: status === 'error' ? '#ef4444' : 'var(--hal-text-3)',
        }}
      >
        {renderStatus(status, savedAt)}
      </div>
    </div>
  );
}

function renderStatus(status: SaveStatus, savedAt: number | null): string {
  if (status === 'pending') return 'EDITING…';
  if (status === 'saving') return 'SAVING…';
  if (status === 'error') return 'SAVE FAILED — RETRY ON NEXT EDIT';
  // Both 'saved' (just-completed) and 'idle' (settled after save) show the
  // AUTOSAVED · Xs AGO label as long as we have a savedAt timestamp.
  if (savedAt) {
    const seconds = Math.floor((Date.now() - savedAt) / 1000);
    if (seconds < 1) return 'AUTOSAVED · JUST NOW';
    if (seconds < 60) return `AUTOSAVED · ${seconds}S AGO`;
    const minutes = Math.floor(seconds / 60);
    return `AUTOSAVED · ${minutes}M AGO`;
  }
  return 'AUTOSAVES AS YOU TYPE';
}
