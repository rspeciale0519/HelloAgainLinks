import React from 'react';

interface ConfirmDeleteModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ open, onConfirm, onCancel }: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#0f1019', border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: '14px', padding: '24px', width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>
          Remove bookmark?
        </p>
        <p style={{ fontSize: '13px', color: '#8a8a9a', lineHeight: 1.5, marginBottom: '20px' }}>
          This will permanently remove it from HAL.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#8a8a9a', fontSize: '13px', cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 14px', borderRadius: '8px', border: 'none',
              background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >Remove</button>
        </div>
      </div>
    </div>
  );
}
