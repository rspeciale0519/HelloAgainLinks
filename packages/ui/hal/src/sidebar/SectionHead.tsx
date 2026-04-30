// packages/ui/hal/src/sidebar/SectionHead.tsx
'use client';

import type { ReactNode } from 'react';

export interface SectionHeadProps {
  label: string;
  right?: ReactNode;
}

export function SectionHead({ label, right }: SectionHeadProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 10px 6px',
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--hal-text-3)',
        fontWeight: 500,
      }}
    >
      <span style={{ flex: 1 }}>{label}</span>
      {right}
    </div>
  );
}
