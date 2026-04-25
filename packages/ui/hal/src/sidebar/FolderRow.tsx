// packages/ui/hal/src/sidebar/FolderRow.tsx
'use client';

import { useState } from 'react';
import { Icon, type IconName } from '../primitives/Icon';

export interface FolderRowProps {
  id: string;
  name: string;
  icon: IconName;
  count?: number | string;
  active: boolean;
  /** True for the synthetic "All" virtual folder — hides rename/delete affordances. */
  immutable?: boolean;
  onClick: () => void;
  onRename?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Sidebar folder row with hover-revealed rename / delete buttons.
 * Visually matches NavItem; the action group sits to the right of the count.
 */
export function FolderRow(props: FolderRowProps) {
  const { id, name, icon, count, active, immutable, onClick, onRename, onDelete } = props;
  const [hover, setHover] = useState(false);
  const showActions = hover && !immutable && (onRename || onDelete);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '7px 10px',
          fontSize: 13,
          color: active ? 'var(--hal-text-0)' : 'var(--hal-text-1)',
          background: active ? 'var(--hal-bg-3)' : hover ? 'var(--hal-bg-2)' : 'transparent',
          borderLeft: active ? '2px solid var(--hal-a)' : '2px solid transparent',
          paddingLeft: active ? 8 : 10,
          transition: 'all 0.1s',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--hal-sans)',
          textAlign: 'left',
        }}
      >
        <span style={{ color: active ? 'var(--hal-a)' : 'var(--hal-text-2)', display: 'flex' }}>
          <Icon name={icon} size={14} />
        </span>
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
        {count !== undefined && !showActions && (
          <span
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: active ? 'var(--hal-text-1)' : 'var(--hal-text-3)',
            }}
          >
            {count}
          </span>
        )}
      </button>

      {showActions && (
        <div
          style={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: 2,
            background: active ? 'var(--hal-bg-3)' : 'var(--hal-bg-2)',
            padding: '2px 4px',
            borderRadius: 4,
          }}
        >
          {onRename && (
            <button
              type="button"
              title="Rename folder"
              onClick={(e) => {
                e.stopPropagation();
                onRename(id);
              }}
              style={folderActionBtn}
            >
              <Icon name="edit" size={12} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              title="Delete folder"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
              style={{ ...folderActionBtn, color: 'var(--hal-text-2)' }}
            >
              <Icon name="trash" size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const folderActionBtn: React.CSSProperties = {
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  color: 'var(--hal-text-2)',
  cursor: 'pointer',
  borderRadius: 3,
};
