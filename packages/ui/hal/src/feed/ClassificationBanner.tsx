// packages/ui/hal/src/feed/ClassificationBanner.tsx
'use client';

import { HalButton } from '../primitives/Button';
import { Icon } from '../primitives/Icon';

export interface ClassificationBannerProps {
  unclassifiedCount: number;
  classifying: boolean;
  onClassify: () => void;
  onDismiss?: () => void;
}

/**
 * Lime-accented banner that surfaces "N bookmark(s) can be AI-classified" with
 * a primary action button. Renders nothing when there is nothing to classify.
 */
export function ClassificationBanner({
  unclassifiedCount,
  classifying,
  onClassify,
  onDismiss,
}: ClassificationBannerProps) {
  if (unclassifiedCount === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        background: 'var(--hal-a-dim)',
        border: '1px solid rgba(var(--hal-a-rgb), 0.25)',
        borderLeft: '2px solid var(--hal-a)',
        borderRadius: 3,
        fontSize: 12,
      }}
    >
      <span
        style={{
          color: 'var(--hal-a)',
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.1em',
        }}
      >
        HAL
      </span>
      <span style={{ flex: 1, color: 'var(--hal-text-1)' }}>
        {unclassifiedCount} bookmark{unclassifiedCount !== 1 ? 's' : ''} can be AI-classified
      </span>
      <HalButton variant="primary" size="sm" onClick={onClassify} disabled={classifying}>
        {classifying ? 'Classifying…' : 'Classify'}
      </HalButton>
      {onDismiss && (
        <HalButton variant="icon" size="sm" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={13} />
        </HalButton>
      )}
    </div>
  );
}
