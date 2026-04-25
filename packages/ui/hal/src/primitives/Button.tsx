// packages/ui/hal/src/primitives/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'icon' | 'danger';
type Size = 'sm' | 'md';

export interface HalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function HalButton({ variant = 'ghost', size = 'md', children, style, ...rest }: HalButtonProps) {
  const byVariant: Record<Variant, React.CSSProperties> = {
    primary: { color: 'var(--hal-bg-0)',   background: 'var(--hal-a)',     border: '1px solid var(--hal-a)' },
    ghost:   { color: 'var(--hal-text-1)', background: 'transparent',      border: '1px solid var(--hal-line-1)' },
    icon:    { color: 'var(--hal-text-2)', background: 'transparent',      border: 'none' },
    danger:  { color: '#ef4444',           background: 'transparent',      border: '1px solid rgba(239, 68, 68, 0.3)' },
  };

  const bySize: Record<Size, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: 11 },
    md: { padding: '6px 12px', fontSize: 13 },
  };

  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 3,
        fontFamily: 'var(--hal-sans)',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.1s',
        ...bySize[size],
        ...byVariant[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
