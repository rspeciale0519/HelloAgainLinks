// packages/ui/hal/src/sidebar/NavItem.tsx
'use client';

import { Icon, type IconName } from '../primitives/Icon';
import { StatusDot } from '../primitives/StatusDot';

export interface NavItemProps {
  icon: IconName;
  label: string;
  count?: number | string;
  active: boolean;
  onClick: () => void;
  pulse?: boolean;
}

export function NavItem({ icon, label, count, active, onClick, pulse }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 10px',
        fontSize: 13,
        color: active ? 'var(--hal-text-0)' : 'var(--hal-text-1)',
        background: active ? 'var(--hal-bg-3)' : 'transparent',
        // Use longhand for all four borders so React doesn't warn about
        // mixing shorthand (`border`) with longhand (`borderLeft`) when the
        // active state changes during a rerender.
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: active ? '2px solid var(--hal-a)' : '2px solid transparent',
        paddingLeft: active ? 8 : 10,
        transition: 'all 0.1s',
        position: 'relative',
        cursor: 'pointer',
        fontFamily: 'var(--hal-sans)',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--hal-bg-2)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ color: active ? 'var(--hal-a)' : 'var(--hal-text-2)', display: 'flex' }}>
        <Icon name={icon} size={14} />
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {pulse && <StatusDot size={5} />}
      {count !== undefined && (
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            color: active ? 'var(--hal-text-1)' : 'var(--hal-text-3)',
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
