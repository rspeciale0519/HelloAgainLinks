'use client';

import { useEffect } from 'react';

export interface DeleteConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Lime-on-obsidian styled bookmark removal confirmation. Caller manages
 * open/close state.
 */
export function DeleteConfirmModal({ open, onCancel, onConfirm }: DeleteConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--hal-bg-2)',
          border: '1px solid var(--hal-line-2)',
          borderRadius: 6,
          padding: 28,
          maxWidth: 360,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h3
          style={{
            fontSize: 17,
            fontWeight: 500,
            color: 'var(--hal-text-0)',
            marginBottom: 10,
            fontFamily: 'var(--hal-sans)',
            letterSpacing: '-0.02em',
          }}
        >
          Remove bookmark?
        </h3>
        <p
          style={{
            fontSize: 13,
            color: 'var(--hal-text-2)',
            lineHeight: 1.5,
            marginBottom: 24,
          }}
        >
          This will permanently remove this bookmark from HAL. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 3,
              border: '1px solid var(--hal-line-1)',
              background: 'transparent',
              color: 'var(--hal-text-2)',
              fontSize: 13,
              cursor: 'pointer',
              fontFamily: 'var(--hal-sans)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: 3,
              border: '1px solid #ef4444',
              background: '#ef4444',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--hal-sans)',
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
