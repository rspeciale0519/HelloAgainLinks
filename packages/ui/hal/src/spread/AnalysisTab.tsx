// packages/ui/hal/src/spread/AnalysisTab.tsx
'use client';

import type { CSSProperties } from 'react';
import type { SpreadBookmark } from './types';

export interface AnalysisTabProps {
  bookmark: SpreadBookmark;
}

const lblStyle: CSSProperties = {
  fontFamily: 'var(--hal-mono)',
  fontSize: 10,
  color: 'var(--hal-text-3)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 10,
};

export function AnalysisTab({ bookmark }: AnalysisTabProps) {
  const summary = bookmark.ai_summary;
  const tags = bookmark.ai_tags ?? [];

  if (!summary && tags.length === 0) {
    return (
      <div
        style={{
          padding: '32px 0',
          fontSize: 13,
          color: 'var(--hal-text-2)',
          lineHeight: 1.5,
        }}
      >
        HAL hasn&apos;t classified this bookmark yet. Run a classify pass from the
        bookmarks page to populate the summary and tags.
      </div>
    );
  }

  return (
    <div>
      {summary && (
        <>
          <div style={lblStyle}>Summary</div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--hal-text-1)',
              lineHeight: 1.6,
              marginBottom: 24,
              fontFamily: 'var(--hal-sans)',
            }}
          >
            {summary}
          </div>
        </>
      )}

      {tags.length > 0 && (
        <>
          <div style={lblStyle}>Tags · confidence</div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 8,
            }}
          >
            {tags.map((t, i) => (
              <div
                key={`${t.label}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--hal-mono)',
                    padding: '3px 8px',
                    color: 'var(--hal-a)',
                    background: 'var(--hal-a-dim)',
                    borderRadius: 2,
                    width: 160,
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  title={t.label}
                >
                  {t.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: 'var(--hal-line-1)',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(1, t.confidence)) * 100}%`,
                      height: '100%',
                      background: 'var(--hal-a)',
                      boxShadow: '0 0 8px var(--hal-a-glow)',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: 'var(--hal-mono)',
                    color: 'var(--hal-text-2)',
                    width: 40,
                    textAlign: 'right',
                    fontSize: 11,
                  }}
                >
                  {(Math.max(0, Math.min(1, t.confidence)) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
