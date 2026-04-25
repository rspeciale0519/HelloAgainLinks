'use client';

export interface HalSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Top-of-feed search input styled with HAL tokens. Caller debounces.
 */
export function HalSearchBar({ value, onChange, placeholder = 'Search bookmarks…' }: HalSearchBarProps) {
  return (
    <div style={{ padding: '12px 22px 0', position: 'relative', zIndex: 1 }}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 420,
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
