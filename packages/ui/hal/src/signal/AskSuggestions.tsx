// packages/ui/hal/src/signal/AskSuggestions.tsx
'use client';

import type { CSSProperties } from 'react';

const SUGGESTED_PROMPTS = [
  'What are my saves about?',
  'Find contradictions in my archive',
  "Summarize this week's saves",
  'What should I re-read?',
];

export interface AskSuggestionsProps {
  onPick: (prompt: string) => void;
}

export function AskSuggestions({ onPick }: AskSuggestionsProps) {
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Try
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            style={btnStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--hal-a)';
              e.currentTarget.style.color = 'var(--hal-a)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--hal-line-1)';
              e.currentTarget.style.color = 'var(--hal-text-1)';
            }}
          >
            <span
              style={{
                color: 'var(--hal-text-3)',
                marginRight: 8,
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
              }}
            >
              {'›'}
            </span>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AskLocked() {
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Locked
      </div>
      <div style={{ fontSize: 13, color: 'var(--hal-text-1)', lineHeight: 1.55 }}>
        The HAL assistant is a Pro feature. Upgrade to chat with your archive,
        get summaries, and find patterns across saved posts.
      </div>
      <a
        href="/dashboard/settings"
        style={{
          padding: '6px 12px',
          fontSize: 12,
          color: 'var(--hal-bg-0)',
          background: 'var(--hal-a)',
          border: '1px solid var(--hal-a)',
          borderRadius: 3,
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        Upgrade to Pro
      </a>
    </div>
  );
}

const btnStyle: CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--hal-text-1)',
  background: 'var(--hal-bg-2)',
  border: '1px solid var(--hal-line-1)',
  borderRadius: 4,
  textAlign: 'left',
  transition: 'all 0.12s',
  fontFamily: 'var(--hal-sans)',
  cursor: 'pointer',
};
