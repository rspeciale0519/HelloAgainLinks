// apps/web/src/components/hal/FolderPickerAnchored.tsx
//
// Phase 6 Task 6.3: tiny popover used by the bulk-action bar's "Move"
// button. Shows the user's folders + an "Unfile" option that moves the
// selected bookmarks back to the All bucket. Click a row → callback fires
// and the popover closes.

'use client';

import { useEffect, useRef } from 'react';

export interface FolderPickerOption {
  id: string;
  name: string;
}

export interface FolderPickerAnchoredProps {
  rect: { top: number; left: number; right: number; bottom: number };
  folders: FolderPickerOption[];
  onPick: (folderId: string | null) => void;
  onClose: () => void;
}

export function FolderPickerAnchored({
  rect,
  folders,
  onPick,
  onClose,
}: FolderPickerAnchoredProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Click outside closes.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Esc closes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Position above the anchor button (the bar sits at the bottom of the
  // viewport, so dropping below would clip).
  const popoverHeight = Math.min(280, 38 + folders.length * 30 + 38);
  const top = Math.max(8, rect.top - popoverHeight - 8);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 220));

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Move to folder"
      style={{
        position: 'fixed',
        top,
        left,
        width: 220,
        maxHeight: popoverHeight,
        overflowY: 'auto',
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-2)',
        borderRadius: 4,
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        zIndex: 70,
        fontFamily: 'var(--hal-sans)',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid var(--hal-line-1)',
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--hal-text-3)',
          textTransform: 'uppercase',
        }}
      >
        Move to folder
      </div>
      <div>
        <Row label="Unfile (no folder)" muted onClick={() => onPick(null)} />
        {folders.map((f) => (
          <Row key={f.id} label={f.name} onClick={() => onPick(f.id)} />
        ))}
        {folders.length === 0 && (
          <div
            style={{
              padding: 14,
              fontSize: 12,
              color: 'var(--hal-text-3)',
              lineHeight: 1.5,
            }}
          >
            No folders yet. Create one from the sidebar first.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  muted,
  onClick,
}: {
  label: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '8px 12px',
        fontSize: 13,
        color: muted ? 'var(--hal-text-3)' : 'var(--hal-text-1)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--hal-sans)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hal-bg-2)';
        e.currentTarget.style.color = 'var(--hal-text-0)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = muted ? 'var(--hal-text-3)' : 'var(--hal-text-1)';
      }}
    >
      {label}
    </button>
  );
}
