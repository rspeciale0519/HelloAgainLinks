'use client';
import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}

export function Badge({ children, color = '#00d4ff', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '100px',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: "'Inter', sans-serif",
        color,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
