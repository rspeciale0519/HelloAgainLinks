// packages/ui/hal/src/feed/FeedHeader.tsx
'use client';

import type { CSSProperties } from 'react';
import { Icon, type IconName } from '../primitives/Icon';
import { StatusDot } from '../primitives/StatusDot';

export type Density_ = 'comfortable' | 'compact' | 'grid';

export interface FeedHeaderProps {
  folderName: string;
  filteredCount: number;
  totalCount: number;
  filterCount: number;
  onClearFilters: () => void;
  /**
   * When non-zero, the feed is in "pinned" mode (e.g. cited bookmarks from
   * chat). Renders a distinct pill that calls onClearPinned when dismissed.
   * Pinning suppresses normal pagination/folder/tag UI.
   */
  pinnedCount?: number;
  onClearPinned?: () => void;
  density: Density_;
  onDensityChange: (d: Density_) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  layout: '2pane' | '3pane';
  signalOpen: boolean;
  onToggleSignal: () => void;
  /** Pre-formatted sync label, e.g. "SYNCED 2s ago" */
  syncLabel: string;
}

const DENSITY_OPTS: ReadonlyArray<{ v: Density_; icon: IconName; label: string }> = [
  { v: 'comfortable', icon: 'list', label: 'Comfortable' },
  { v: 'compact', icon: 'menu', label: 'Compact' },
  { v: 'grid', icon: 'grid', label: 'Grid' },
];

export function FeedHeader({
  folderName,
  filteredCount,
  totalCount,
  filterCount,
  onClearFilters,
  pinnedCount = 0,
  onClearPinned,
  density,
  onDensityChange,
  selectionMode,
  onToggleSelectionMode,
  layout,
  signalOpen,
  onToggleSignal,
  syncLabel,
}: FeedHeaderProps) {
  const segBtn = (active: boolean, leading: boolean): CSSProperties => ({
    padding: '6px 8px',
    color: active ? 'var(--hal-a)' : 'var(--hal-text-3)',
    background: active ? 'var(--hal-a-dim)' : 'transparent',
    borderLeft: leading ? 'none' : '1px solid var(--hal-line-1)',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 22px',
        borderBottom: '1px solid var(--hal-line-1)',
        background: 'var(--hal-bg-0)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: 'var(--hal-text-0)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            margin: 0,
            fontFamily: 'var(--hal-sans)',
          }}
        >
          {folderName}
        </h1>
        <span style={{ fontFamily: 'var(--hal-mono)', fontSize: 11, color: 'var(--hal-text-3)' }}>
          {filteredCount}
          <span style={{ color: 'var(--hal-text-4)' }}>/{totalCount}</span>
        </span>
        {filterCount > 0 && (
          <button
            type="button"
            onClick={onClearFilters}
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: 'var(--hal-a)',
              padding: '2px 6px',
              background: 'var(--hal-a-dim)',
              border: '1px solid var(--hal-a)',
              borderRadius: 2,
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            {filterCount} FILTER · CLEAR ✕
          </button>
        )}
        {pinnedCount > 0 && onClearPinned && (
          <button
            type="button"
            onClick={onClearPinned}
            title="Return to your normal feed"
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: 'var(--hal-bg-0)',
              padding: '2px 6px',
              background: 'var(--hal-a)',
              border: '1px solid var(--hal-a)',
              borderRadius: 2,
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            PINNED {pinnedCount} · CLEAR ✕
          </button>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Live pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'var(--hal-bg-2)',
          border: '1px solid var(--hal-line-1)',
          borderRadius: 3,
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          color: 'var(--hal-text-2)',
          letterSpacing: '0.08em',
        }}
      >
        <StatusDot size={5} />
        <span>LIVE · {syncLabel}</span>
      </div>

      {/* Density toggles */}
      <div role="radiogroup" aria-label="Density" style={{ display: 'flex', border: '1px solid var(--hal-line-1)', borderRadius: 3 }}>
        {DENSITY_OPTS.map((o, i) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={density === o.v}
            onClick={() => onDensityChange(o.v)}
            title={`Density: ${o.label}`}
            style={segBtn(density === o.v, i === 0)}
          >
            <Icon name={o.icon} size={13} />
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleSelectionMode}
        title="Select"
        style={{
          padding: '6px 8px',
          color: selectionMode ? 'var(--hal-a)' : 'var(--hal-text-2)',
          background: selectionMode ? 'var(--hal-a-dim)' : 'transparent',
          border: '1px solid var(--hal-line-1)',
          borderRadius: 3,
          display: 'flex',
          cursor: 'pointer',
        }}
      >
        <Icon name="check" size={13} />
      </button>

      {layout === '3pane' && (
        <button
          type="button"
          onClick={onToggleSignal}
          title="Toggle Signal (⌘J)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 10px',
            color: signalOpen ? 'var(--hal-bg-0)' : 'var(--hal-a)',
            background: signalOpen ? 'var(--hal-a)' : 'var(--hal-a-dim)',
            border: '1px solid var(--hal-a)',
            borderRadius: 3,
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--hal-sans)',
          }}
        >
          <Icon name="sparkle" size={12} /> HAL
        </button>
      )}
    </div>
  );
}
