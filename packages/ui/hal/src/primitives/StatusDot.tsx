// packages/ui/hal/src/primitives/StatusDot.tsx
import type { CSSProperties } from 'react';

export interface StatusDotProps {
  /** Pixel size of the dot. Default 6. */
  size?: number;
  /** Color. Defaults to accent. */
  color?: string;
  /** Glow color. Defaults to accent glow. */
  glow?: string;
  /** Pulse animation. Respects prefers-reduced-motion via --hal-pulse-on. */
  pulse?: boolean;
  style?: CSSProperties;
}

export function StatusDot({ size = 6, color = 'var(--hal-a)', glow = 'var(--hal-a-glow)', pulse = true, style }: StatusDotProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 ${size}px ${glow}`,
        animation: pulse ? 'hal-pulse calc(2s / var(--hal-pulse-on, 1)) ease-in-out infinite' : 'none',
        ...style,
      }}
    />
  );
}
