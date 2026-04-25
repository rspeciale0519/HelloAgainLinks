// packages/ui/hal/src/feed/Feed.tsx
'use client';

import type { ReactNode } from 'react';
import { Card, type CardBookmark } from './Card';
import { FeedHeader, type Density_ } from './FeedHeader';

export interface FeedProps {
  bookmarks: CardBookmark[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  // FeedHeader props (forwarded)
  folderName: string;
  filterCount: number;
  onClearFilters: () => void;
  density: Density_;
  onDensityChange: (d: Density_) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  layout: '2pane' | '3pane';
  signalOpen: boolean;
  onToggleSignal: () => void;
  syncLabel: string;
  // Card callbacks
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onTagClick: (tagName: string) => void;
  onDelete: (id: string, xPostId: string) => void;
  onOpenTagEditor: (id: string, anchor: HTMLElement) => void;
  selectedIds?: string[];
  highlightedIds?: string[];
  emptyLabel?: string;
  classificationBanner?: ReactNode;
}

export function Feed(props: FeedProps) {
  const {
    bookmarks,
    total,
    page,
    pageSize,
    loading,
    onPageChange,
    folderName,
    filterCount,
    onClearFilters,
    density,
    onDensityChange,
    selectionMode,
    onToggleSelectionMode,
    layout,
    signalOpen,
    onToggleSignal,
    syncLabel,
    onSelect,
    onOpen,
    onTagClick,
    onDelete,
    onOpenTagEditor,
    selectedIds = [],
    highlightedIds = [],
    emptyLabel,
    classificationBanner,
  } = props;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filteredCount = bookmarks.length;
  const selectedSet = new Set(selectedIds);
  const highlightedSet = new Set(highlightedIds);

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--hal-bg-0)',
      }}
    >
      <FeedHeader
        folderName={folderName}
        filteredCount={filteredCount}
        totalCount={total}
        filterCount={filterCount}
        onClearFilters={onClearFilters}
        density={density}
        onDensityChange={onDensityChange}
        selectionMode={selectionMode}
        onToggleSelectionMode={onToggleSelectionMode}
        layout={layout}
        signalOpen={signalOpen}
        onToggleSignal={onToggleSignal}
        syncLabel={syncLabel}
      />

      {classificationBanner && (
        <div style={{ padding: '12px 22px 0' }}>{classificationBanner}</div>
      )}

      {/* Feed body */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {density === 'grid' && bookmarks.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '20px 110px 1fr 200px 90px',
              gap: 14,
              padding: '8px 18px',
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: 'var(--hal-text-3)',
              background: 'var(--hal-bg-1)',
              borderBottom: '1px solid var(--hal-line-1)',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <span />
            <span>WHEN</span>
            <span>CONTENT</span>
            <span>TAGS</span>
            <span />
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: 'var(--hal-text-3)',
              fontFamily: 'var(--hal-mono)',
              fontSize: 11,
              letterSpacing: '0.1em',
            }}
          >
            LOADING…
          </div>
        ) : bookmarks.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--hal-text-2)' }}>
            <div
              style={{
                fontSize: 22,
                color: 'var(--hal-text-0)',
                marginBottom: 8,
                fontFamily: 'var(--hal-sans)',
                letterSpacing: '-0.02em',
              }}
            >
              {emptyLabel ?? 'No matches.'}
            </div>
            <div style={{ fontSize: 13, marginBottom: 18 }}>
              The archive is quiet. Loosen filters or save something from X.
            </div>
            {filterCount > 0 && (
              <button
                type="button"
                onClick={onClearFilters}
                style={{
                  padding: '8px 18px',
                  background: 'var(--hal-a-dim)',
                  border: '1px solid var(--hal-a)',
                  color: 'var(--hal-a)',
                  fontSize: 12,
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontFamily: 'var(--hal-sans)',
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          bookmarks.map((bm, i) => (
            <div
              key={bm.id}
              style={{
                animation: `hal-slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 0.03}s both`,
              }}
            >
              <Card
                bookmark={bm}
                density={density}
                index={i}
                selected={selectedSet.has(bm.id)}
                selectionMode={selectionMode}
                highlight={highlightedSet.has(bm.id)}
                onSelect={onSelect}
                onOpen={onOpen}
                onTagClick={onTagClick}
                onDelete={onDelete}
                onOpenTagEditor={onOpenTagEditor}
              />
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && bookmarks.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              padding: '24px 22px',
              fontFamily: 'var(--hal-mono)',
              fontSize: 11,
            }}
          >
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 14px',
                borderRadius: 3,
                border: '1px solid var(--hal-line-1)',
                background: 'transparent',
                color: page === 1 ? 'var(--hal-text-4)' : 'var(--hal-a)',
                cursor: page === 1 ? 'default' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              ← PREV
            </button>
            <span
              style={{
                padding: '8px 14px',
                color: 'var(--hal-text-2)',
                letterSpacing: '0.05em',
              }}
            >
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              style={{
                padding: '8px 14px',
                borderRadius: 3,
                border: '1px solid var(--hal-line-1)',
                background: 'transparent',
                color: page === totalPages ? 'var(--hal-text-4)' : 'var(--hal-a)',
                cursor: page === totalPages ? 'default' : 'pointer',
                letterSpacing: '0.05em',
              }}
            >
              NEXT →
            </button>
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          padding: '6px 22px',
          borderTop: '1px solid var(--hal-line-1)',
          background: 'var(--hal-bg-1)',
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.08em',
          color: 'var(--hal-text-3)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span>{filteredCount} ENTRIES</span>
        <span>·</span>
        <span>{total} INDEXED</span>
        <span>·</span>
        <span>
          HAL <span style={{ color: 'var(--hal-a)' }}>READY</span>
        </span>
        <div style={{ flex: 1 }} />
        <span>⌘K COMMAND</span>
        <span>⌘J SIGNAL</span>
        <span>⌘B NAV</span>
      </div>
    </div>
  );
}
