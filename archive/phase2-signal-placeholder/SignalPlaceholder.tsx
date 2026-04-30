'use client';

/**
 * Phase 2 stub for the right-pane Signal rail. Replaced in Phase 4 by the real
 * SignalRail with grouped insights.
 */
export function SignalPlaceholder() {
  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid var(--hal-line-1)',
        background: 'var(--hal-bg-1)',
        padding: '20px 18px',
        fontFamily: 'var(--hal-sans)',
        color: 'var(--hal-text-2)',
        fontSize: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: 'var(--hal-text-3)',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Signal
      </div>
      <div style={{ color: 'var(--hal-text-2)', fontSize: 12, lineHeight: 1.5 }}>
        {/* TODO Phase 4: SignalRail with grouped insights */}
        The Signal rail will surface trending tags, related bookmarks, and HAL insights here.
      </div>
    </aside>
  );
}
