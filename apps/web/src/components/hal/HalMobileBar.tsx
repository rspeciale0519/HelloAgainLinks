'use client';

import { ImpactStyle } from '@capacitor/haptics';
import { triggerHaptic } from '@/lib/mobile';

export interface HalMobileBarProps {
  syncLabel: string;
  onOpenDrawer: () => void;
}

/**
 * Top bar shown on mobile breakpoints with a hamburger that opens the Index
 * drawer + a sync-status pill on the right.
 */
export function HalMobileBar({ syncLabel, onOpenDrawer }: HalMobileBarProps) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid var(--hal-line-1)',
        background: 'var(--hal-bg-1)',
      }}
    >
      <button
        type="button"
        aria-label="Open menu"
        onClick={async () => {
          await triggerHaptic(ImpactStyle.Light);
          onOpenDrawer();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--hal-a)',
          fontSize: 22,
          cursor: 'pointer',
          padding: '2px 8px 2px 0',
          lineHeight: 1,
        }}
      >
        ☰
      </button>
      <span style={{ fontSize: 14, color: 'var(--hal-text-0)', fontFamily: 'var(--hal-sans)' }}>
        HAL
      </span>
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
          letterSpacing: '0.08em',
        }}
      >
        {syncLabel}
      </span>
    </div>
  );
}
