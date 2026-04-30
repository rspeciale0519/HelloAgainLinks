// packages/ui/hal/src/primitives/Chip.tsx
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
  /** 'accent' = lime (filter active / AI tag); 'neutral' = muted; 'active' = solid lime */
  variant?: 'accent' | 'neutral' | 'active';
  size?: 'xs' | 'sm';
  onClick?: (e: MouseEvent) => void;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function Chip({ children, variant = 'neutral', size = 'sm', onClick, title, className, style }: ChipProps) {
  const padding = size === 'xs' ? '1px 5px' : '2px 7px';
  const fontSize = size === 'xs' ? 10 : 11;

  const palette = {
    accent:  { color: 'var(--hal-a)',       bg: 'var(--hal-a-dim)', border: 'rgba(var(--hal-a-rgb), 0.25)' },
    neutral: { color: 'var(--hal-text-2)',  bg: 'transparent',       border: 'var(--hal-line-1)' },
    active:  { color: 'var(--hal-bg-0)',    bg: 'var(--hal-a)',      border: 'var(--hal-a)' },
  }[variant];

  const Tag = onClick ? 'button' : 'span';

  return (
    <Tag
      onClick={onClick}
      title={title}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding,
        fontSize,
        fontFamily: 'var(--hal-mono)',
        color: palette.color,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 2,
        letterSpacing: '0.02em',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
