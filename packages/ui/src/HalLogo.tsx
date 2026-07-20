'use client';
import React from 'react';

export interface HalLogoProps {
  size?: number;
  style?: React.CSSProperties;
}

export function HalLogo({ size = 32, style }: HalLogoProps) {
  const borderRadius = Math.round(size * 0.25);
  const fontSize = Math.round(size * 0.47);
  const glowSpread = Math.round(size * 0.45);
  const glowOpacity = size >= 56 ? 0.4 : 0.3;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: 'linear-gradient(135deg, #a1fc2a, #86d91f)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#0a0a0f',
        boxShadow: `0 0 ${glowSpread}px rgba(161,252,42,${glowOpacity})`,
        flexShrink: 0,
        ...style,
      }}
    >
      H
    </div>
  );
}
