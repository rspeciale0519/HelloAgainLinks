'use client';

import type { ReactNode } from 'react';

export interface HalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional slot rendered after the input on the same row (e.g. Tweaks gear). */
  rightSlot?: ReactNode;
}

/**
 * Top-of-feed search input styled with HAL tokens. The input fills the
 * available horizontal space; an optional rightSlot sits flush against
 * the right edge (typically a small icon button like the Tweaks gear).
 * Caller debounces.
 */
export function HalSearchBar({
  value,
  onChange,
  placeholder = 'Search bookmarks…',
  rightSlot,
}: HalSearchBarProps) {
  return (
    <div
      style={{
        padding: '12px 22px 0',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '8px 12px',
          borderRadius: 3,
          border: '1px solid var(--hal-line-1)',
          background: 'var(--hal-bg-2)',
          color: 'var(--hal-text-0)',
          fontSize: 13,
          fontFamily: 'var(--hal-sans)',
          outline: 'none',
        }}
      />
      {rightSlot}
    </div>
  );
}

export interface PullIndicatorProps {
  visible: boolean;
  pullDistance: number;
}

export function PullIndicator({ visible, pullDistance }: PullIndicatorProps) {
  if (!visible) return null;
  return (
    <div
      style={{
        color: 'var(--hal-text-2)',
        fontSize: 11,
        padding: '6px 16px',
        fontFamily: 'var(--hal-mono)',
        letterSpacing: '0.08em',
      }}
    >
      {pullDistance > 60 ? 'RELEASE TO REFRESH' : 'PULL TO REFRESH'}
    </div>
  );
}
