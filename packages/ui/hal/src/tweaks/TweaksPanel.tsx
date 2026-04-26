// packages/ui/hal/src/tweaks/TweaksPanel.tsx
//
// Phase 5 Task 5.6: slide-in tweaks panel for the three runtime axes the
// host app persists via useTweaks() — density (feed layout), layout (3pane
// vs 2pane), and pulse (live indicator animation, also degrades for
// prefers-reduced-motion). The plan keeps this deliberately minimal; the
// six-axis design from the reference is out of scope for this phase.

'use client';

import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../primitives/Icon';

export type TweaksDensity = 'comfortable' | 'compact' | 'grid';
export type TweaksLayout = '2pane' | '3pane';
export type TweaksPulse = 'on' | 'off';

export interface TweaksValue {
  density: TweaksDensity;
  layout: TweaksLayout;
  pulse: TweaksPulse;
}

export interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
  value: TweaksValue;
  onChange: (next: TweaksValue) => void;
}

export function TweaksPanel({ open, onClose, value, onChange }: TweaksPanelProps) {
  // Esc closes when open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof TweaksValue>(key: K, v: TweaksValue[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Tweaks"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 300,
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-2)',
        borderRadius: 6,
        boxShadow:
          '0 24px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--hal-a-rgb), 0.1)',
        zIndex: 55,
        animation: 'hal-slide-in-x 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        fontFamily: 'var(--hal-sans)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 14px',
          borderBottom: '1px solid var(--hal-line-1)',
        }}
      >
        <Icon name="sliders" size={13} style={{ color: 'var(--hal-a)' }} />
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--hal-text-1)',
          }}
        >
          TWEAKS
        </span>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tweaks"
          style={{
            color: 'var(--hal-text-3)',
            padding: 2,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div
        style={{
          padding: '14px 14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <Row label="Density">
          <Seg
            value={value.density}
            onChange={(v) => set('density', v)}
            options={[
              { v: 'comfortable', label: 'Comfort' },
              { v: 'compact', label: 'Compact' },
              { v: 'grid', label: 'Grid' },
            ]}
          />
        </Row>

        <Row label="Layout">
          <Seg
            value={value.layout}
            onChange={(v) => set('layout', v)}
            options={[
              { v: '2pane', label: '2 pane' },
              { v: '3pane', label: '3 pane' },
            ]}
          />
        </Row>

        <Row label="Live pulse">
          <Seg
            value={value.pulse}
            onChange={(v) => set('pulse', v)}
            options={[
              { v: 'on', label: 'On' },
              { v: 'off', label: 'Off' },
            ]}
          />
        </Row>
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--hal-line-1)',
          background: 'var(--hal-bg-2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          className="hal-pulse-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--hal-a)',
            boxShadow: '0 0 8px var(--hal-a-glow)',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            color: 'var(--hal-text-2)',
            letterSpacing: '0.08em',
          }}
        >
          APPLIED LIVE · PERSISTED
        </span>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--hal-text-3)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

interface SegProps<V extends string> {
  value: V;
  onChange: (next: V) => void;
  options: ReadonlyArray<{ v: V; label: string }>;
}

function Seg<V extends string>({ value, onChange, options }: SegProps<V>) {
  return (
    <div
      role="radiogroup"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        border: '1px solid var(--hal-line-1)',
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      {options.map((o, i) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.v)}
            style={{
              padding: '7px 6px',
              fontSize: 11,
              color: active ? 'var(--hal-bg-0)' : 'var(--hal-text-1)',
              background: active ? 'var(--hal-a)' : 'var(--hal-bg-2)',
              fontWeight: active ? 600 : 400,
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              borderLeft: i > 0 ? '1px solid var(--hal-line-1)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.1s',
              fontFamily: 'var(--hal-sans)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// =====================================================================
// Floating gear trigger — convenience component the host page can drop
// in next to the panel. The plan's "floating gear button bottom-right"
// affordance, with a subtle hover lift.
// =====================================================================

export interface TweaksTriggerProps {
  open: boolean;
  onToggle: () => void;
  style?: CSSProperties;
}

export function TweaksTrigger({ open, onToggle, style }: TweaksTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? 'Close tweaks' : 'Open tweaks'}
      title="Tweaks"
      style={{
        position: 'fixed',
        bottom: 22,
        right: 22,
        width: 38,
        height: 38,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: open ? 'var(--hal-a)' : 'var(--hal-bg-2)',
        border: `1px solid ${open ? 'var(--hal-a)' : 'var(--hal-line-2)'}`,
        borderRadius: 4,
        color: open ? 'var(--hal-bg-0)' : 'var(--hal-text-1)',
        cursor: 'pointer',
        zIndex: 54,
        boxShadow: open
          ? '0 0 0 1px var(--hal-a), 0 8px 24px rgba(0,0,0,0.35)'
          : '0 4px 14px rgba(0,0,0,0.4)',
        transition: 'all 0.12s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!open) {
          e.currentTarget.style.borderColor = 'var(--hal-a)';
          e.currentTarget.style.color = 'var(--hal-a)';
        }
      }}
      onMouseLeave={(e) => {
        if (!open) {
          e.currentTarget.style.borderColor = 'var(--hal-line-2)';
          e.currentTarget.style.color = 'var(--hal-text-1)';
        }
      }}
    >
      <Icon name="sliders" size={15} />
    </button>
  );
}
