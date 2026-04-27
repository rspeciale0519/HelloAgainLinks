'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * Shared chrome for non-bookmarks dashboard pages. Gives every page the same
 * HAL header treatment — mono-caps eyebrow, large sans title, optional sub
 * line, optional right-aligned action slot — wrapped in a max-width column
 * with consistent padding. Pages render their own sections beneath.
 *
 * The bookmarks route (which has its own search + feed chrome) doesn't use
 * this shell; everything else does.
 */

export interface PageShellProps {
  /** Mono-caps eyebrow rendered above the title (e.g. "DASHBOARD"). */
  eyebrow?: string;
  /** Page title — the only sans-serif large-type element. */
  title: string;
  /** Optional one-line subtitle beneath the title. */
  subtitle?: ReactNode;
  /** Right-aligned slot in the header row (e.g. primary action button). */
  action?: ReactNode;
  children: ReactNode;
}

export function PageShell({ eyebrow, title, subtitle, action, children }: PageShellProps) {
  return (
    <div
      style={{
        maxWidth: 980,
        margin: '0 auto',
        padding: '32px 28px 48px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
          marginBottom: 28,
          paddingBottom: 18,
          borderBottom: '1px solid var(--hal-line-1)',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                letterSpacing: '0.18em',
                color: 'var(--hal-text-3)',
                marginBottom: 8,
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--hal-text-0)',
              fontFamily: 'var(--hal-sans)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              style={{
                fontSize: 13,
                color: 'var(--hal-text-2)',
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </header>

      {children}
    </div>
  );
}

/** Mono-caps section header used inside PageShell sections. */
export function SectionLabel({
  children,
  count,
  style,
}: {
  children: ReactNode;
  count?: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--hal-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--hal-text-3)',
        margin: '24px 0 12px',
        ...style,
      }}
    >
      <span>{children}</span>
      {count !== undefined && (
        <span style={{ color: 'var(--hal-a)' }}>· {count}</span>
      )}
      <div style={{ flex: 1, height: 1, background: 'var(--hal-line-1)' }} />
    </div>
  );
}

/**
 * Sharp-cornered HAL card. Uses bg-1 for the surface and line-1 for the rule
 * — the same treatment cards on the feed get. Deliberately not a pill or
 * rounded-rectangle.
 */
export function HalPanel({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: CSSProperties;
  /** When true, the panel gets a 2px lime left rule (used for primary CTAs). */
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-1)',
        borderLeft: accent ? '2px solid var(--hal-a)' : '1px solid var(--hal-line-1)',
        borderRadius: 4,
        padding: 22,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Lime primary button with the HAL accent treatment. */
export function HalPrimaryButton({
  children,
  onClick,
  disabled,
  style,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        background: 'var(--hal-a)',
        color: 'var(--hal-bg-0)',
        border: 'none',
        borderRadius: 3,
        fontFamily: 'var(--hal-mono)',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        textTransform: 'uppercase',
        transition: 'background 0.1s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'var(--hal-a-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--hal-a)';
      }}
    >
      {children}
    </button>
  );
}

/** Outline button — secondary action sibling to HalPrimaryButton. */
export function HalGhostButton({
  children,
  onClick,
  disabled,
  style,
  danger,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  danger?: boolean;
}) {
  const fg = danger ? '#ef4444' : 'var(--hal-text-1)';
  const border = danger ? 'rgba(239, 68, 68, 0.4)' : 'var(--hal-line-2)';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        background: 'transparent',
        color: fg,
        border: `1px solid ${border}`,
        borderRadius: 3,
        fontFamily: 'var(--hal-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.08em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        textTransform: 'uppercase',
        transition: 'border-color 0.1s, color 0.1s',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = danger ? '#ef4444' : 'var(--hal-a)';
        e.currentTarget.style.color = danger ? '#ef4444' : 'var(--hal-a)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = border;
        e.currentTarget.style.color = fg;
      }}
    >
      {children}
    </button>
  );
}

/** HAL-styled text input. */
export function HalInput({
  value,
  onChange,
  placeholder,
  onKeyDown,
  style,
  type = 'text',
  readOnly,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  style?: CSSProperties;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      readOnly={readOnly}
      style={{
        padding: '9px 12px',
        background: 'var(--hal-bg-2)',
        color: 'var(--hal-text-0)',
        border: '1px solid var(--hal-line-1)',
        borderRadius: 3,
        fontSize: 13,
        fontFamily: 'var(--hal-sans)',
        outline: 'none',
        transition: 'border-color 0.1s',
        ...style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--hal-a)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--hal-line-1)';
      }}
    />
  );
}
