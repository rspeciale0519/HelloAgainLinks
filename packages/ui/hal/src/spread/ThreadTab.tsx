// packages/ui/hal/src/spread/ThreadTab.tsx
'use client';

import type { SpreadBookmark } from './types';
import { buildPostUrl } from './types';

export interface ThreadTabProps {
  bookmark: SpreadBookmark;
}

export function ThreadTab({ bookmark }: ThreadTabProps) {
  return (
    <div
      style={{
        fontSize: 13,
        color: 'var(--hal-text-2)',
        lineHeight: 1.5,
        maxWidth: 560,
      }}
    >
      Thread context isn&apos;t indexed yet — HAL only stores the saved post.
      Open the original on X to see the surrounding thread:{' '}
      <a
        href={buildPostUrl(bookmark)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--hal-a)',
          borderBottom: '1px solid var(--hal-a)',
          textDecoration: 'none',
        }}
      >
        view on X →
      </a>
    </div>
  );
}
