// packages/ui/hal/src/feed/BulkActionBar.tsx
//
// Phase 6 Task 6.1: floating bulk-action bar pinned to the bottom-center of
// the viewport when one or more bookmarks are selected. Three primary actions
// (Tag · Move to folder · Delete) plus a clear-selection close. The host
// page owns the actual action callbacks — the bar is purely a control
// surface.

'use client';

import { forwardRef, type CSSProperties } from 'react';
import { Icon } from '../primitives/Icon';

export interface BulkActionBarProps {
  count: number;
  onTag: () => void;
  onMoveFolder: () => void;
  onDelete: () => void;
  onClear: () => void;
  /** Optional refs the host can attach to anchor popovers (Tag picker, Move
   *  folder picker) directly to the relevant button. */
  tagButtonRef?: React.Ref<HTMLButtonElement>;
  moveButtonRef?: React.Ref<HTMLButtonElement>;
}

export function BulkActionBar({
  count,
  onTag,
  onMoveFolder,
  onDelete,
  onClear,
  tagButtonRef,
  moveButtonRef,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk bookmark actions"
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px 8px 16px',
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-a)',
        borderRadius: 6,
        boxShadow:
          '0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--hal-a-rgb), 0.15)',
        zIndex: 53,
        animation: 'hal-slide-up 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
        fontFamily: 'var(--hal-sans)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 11,
          letterSpacing: '0.08em',
          color: 'var(--hal-a)',
          padding: '0 6px 0 0',
        }}
      >
        {count} SELECTED
      </span>
      <div
        style={{
          width: 1,
          height: 18,
          background: 'var(--hal-line-2)',
          marginRight: 2,
        }}
      />

      <ActionButton ref={tagButtonRef} onClick={onTag} icon="tag" label="Tag" />
      <ActionButton ref={moveButtonRef} onClick={onMoveFolder} icon="folder" label="Move" />
      <ActionButton onClick={onDelete} icon="trash" label="Delete" danger />

      <div
        style={{
          width: 1,
          height: 18,
          background: 'var(--hal-line-2)',
          margin: '0 2px',
        }}
      />
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        title="Clear selection (Esc)"
        style={{
          ...iconBtnStyle,
          color: 'var(--hal-text-2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--hal-bg-3)';
          e.currentTarget.style.color = 'var(--hal-text-0)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--hal-text-2)';
        }}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon: 'tag' | 'folder' | 'trash';
  label: string;
  danger?: boolean;
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  function ActionButton({ onClick, icon, label, danger }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          fontSize: 12,
          fontFamily: 'var(--hal-sans)',
          color: danger ? '#ef4444' : 'var(--hal-text-1)',
          background: 'transparent',
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer',
          transition: 'all 0.1s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = danger
            ? 'rgba(239, 68, 68, 0.12)'
            : 'var(--hal-bg-3)';
          e.currentTarget.style.color = danger ? '#fca5a5' : 'var(--hal-text-0)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = danger ? '#ef4444' : 'var(--hal-text-1)';
        }}
      >
        <Icon name={icon} size={13} />
        {label}
      </button>
    );
  },
);

const iconBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 6,
  background: 'transparent',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  transition: 'all 0.1s',
};
