'use client';

import TagPopover, { type TagInfo } from '@/components/TagPopover';

export interface TagAnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

export interface TagPopoverAnchoredProps {
  rect: TagAnchorRect;
  allTags: TagInfo[];
  activeTagIds: Set<string>;
  onToggle: (tagId: string, add: boolean) => void;
  onClose: () => void;
}

/**
 * Wraps TagPopover at a fixed-position anchor (computed from a button's
 * getBoundingClientRect). Clamps to viewport so it stays on screen.
 */
export function TagPopoverAnchored({
  rect,
  allTags,
  activeTagIds,
  onToggle,
  onClose,
}: TagPopoverAnchoredProps) {
  const top = Math.min(rect.bottom + 6, window.innerHeight - 320);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - 240));
  return (
    <div style={{ position: 'fixed', top, left, zIndex: 60 }}>
      <TagPopover
        allTags={allTags}
        activeTagIds={activeTagIds}
        onToggle={onToggle}
        onClose={onClose}
      />
    </div>
  );
}
