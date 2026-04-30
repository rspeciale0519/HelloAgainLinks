// packages/ui/hal/src/sidebar/BookmarkSections.tsx
//
// The Library + Subjects + Signal sections of the HAL Index sidebar.
// Extracted from IndexSidebar.tsx to keep that file under the 450 LOC cap.
'use client';

import { Icon } from '../primitives/Icon';
import { StatusDot } from '../primitives/StatusDot';
import { SectionHead } from './SectionHead';
import { FolderRow } from './FolderRow';
import type { SidebarFolder, SidebarTag } from './IndexSidebar';

const ALL_FOLDER_ID = 'f_all';

const ACTIVITY_STUB = [
  { t: '2m', a: 'HAL', x: 'auto-tagged 3 new' },
  { t: '14m', a: 'you', x: 'saved @swyx' },
  { t: '1h', a: 'HAL', x: 'found 2 related' },
];

export interface BookmarkSectionsProps {
  folders: SidebarFolder[];
  activeFolder?: string;
  onSelectFolder?: (id: string) => void;
  onCreateFolder?: () => void;
  onRenameFolder?: (id: string) => void;
  onDeleteFolder?: (id: string) => void;
  onImportXFolders?: () => void;
  tags: SidebarTag[];
  activeTags: string[];
  onToggleTag?: (id: string) => void;
}

export function BookmarkSections(props: BookmarkSectionsProps) {
  const {
    folders,
    activeFolder,
    onSelectFolder,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onImportXFolders,
    tags,
    activeTags,
    onToggleTag,
  } = props;

  return (
    <>
      {/* Library section */}
      <div style={{ marginTop: 18 }}>
        <SectionHead
          label="Library"
          right={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              {onImportXFolders && (
                <button
                  type="button"
                  title="Import X folders"
                  onClick={onImportXFolders}
                  style={importXBtnStyle}
                >
                  <Icon name="download" size={10} />
                  <span style={{ fontFamily: 'var(--hal-mono)', fontSize: 9 }}>X</span>
                </button>
              )}
              {onCreateFolder && (
                <button
                  type="button"
                  title="New folder"
                  onClick={onCreateFolder}
                  style={headerIconBtnStyle}
                >
                  <Icon name="plus" size={11} />
                </button>
              )}
              <span
                style={{ fontFamily: 'var(--hal-mono)', fontSize: 9, color: 'var(--hal-text-3)' }}
              >
                {folders.length}
              </span>
            </span>
          }
        />
        {folders.map((f) => (
          <FolderRow
            key={f.id}
            id={f.id}
            icon={f.icon}
            name={f.name}
            count={f.count}
            active={activeFolder === f.id}
            immutable={f.id === ALL_FOLDER_ID}
            onClick={() => onSelectFolder?.(f.id)}
            onRename={onRenameFolder}
            onDelete={onDeleteFolder}
          />
        ))}
      </div>

      {/* Subjects section */}
      <div style={{ marginTop: 18 }}>
        <SectionHead
          label="Subjects"
          right={
            <span
              style={{ fontFamily: 'var(--hal-mono)', fontSize: 9, color: 'var(--hal-text-3)' }}
            >
              {tags.length}
            </span>
          }
        />
        <div style={{ padding: '2px 6px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {tags.slice(0, 14).map((t) => {
            const active = activeTags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onToggleTag?.(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px',
                  fontSize: 11,
                  fontFamily: 'var(--hal-mono)',
                  color: active ? 'var(--hal-a)' : 'var(--hal-text-2)',
                  background: active ? 'var(--hal-a-dim)' : 'transparent',
                  border: `1px solid ${active ? 'var(--hal-a)' : 'var(--hal-line-1)'}`,
                  borderRadius: 3,
                  transition: 'all 0.12s',
                  cursor: 'pointer',
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activity / Signal preview */}
      <div style={{ marginTop: 22 }}>
        <SectionHead
          label="Signal"
          right={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <StatusDot size={5} />
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 9,
                  color: 'var(--hal-a)',
                  letterSpacing: '0.08em',
                }}
              >
                LIVE
              </span>
            </span>
          }
        />
        <div style={{ padding: '4px 10px' }}>
          {/* TODO Phase 4: replace stub with real activity events */}
          {ACTIVITY_STUB.map((e, i) => (
            <div
              key={`${e.t}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                padding: '5px 0',
                fontSize: 11,
                borderBottom:
                  i < ACTIVITY_STUB.length - 1 ? '1px solid var(--hal-line-0)' : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  color: 'var(--hal-text-3)',
                  fontSize: 9,
                  width: 20,
                }}
              >
                {e.t}
              </span>
              <span style={{ flex: 1, color: 'var(--hal-text-1)', lineHeight: 1.35 }}>
                <span
                  style={{
                    color: e.a === 'HAL' ? 'var(--hal-a)' : 'var(--hal-text-0)',
                    fontFamily: 'var(--hal-mono)',
                    fontSize: 10,
                  }}
                >
                  {e.a}
                </span>
                <span style={{ color: 'var(--hal-text-2)', margin: '0 4px' }}>·</span>
                <span style={{ color: 'var(--hal-text-2)' }}>{e.x}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const headerIconBtnStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--hal-text-2)',
  background: 'transparent',
  border: '1px solid var(--hal-line-1)',
  borderRadius: 3,
  cursor: 'pointer',
  padding: 0,
};

const importXBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  padding: '2px 6px',
  height: 18,
  color: 'var(--hal-a)',
  background: 'var(--hal-a-dim)',
  border: '1px solid var(--hal-a-dim)',
  borderRadius: 3,
  cursor: 'pointer',
};
