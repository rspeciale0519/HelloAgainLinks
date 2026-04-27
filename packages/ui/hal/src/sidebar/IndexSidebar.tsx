// packages/ui/hal/src/sidebar/IndexSidebar.tsx
'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '../primitives/Icon';
import { SectionHead } from './SectionHead';
import { NavItem } from './NavItem';
import { BookmarkSections } from './BookmarkSections';

export interface AppNavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
}

export interface SidebarFolder {
  id: string;
  name: string;
  icon: IconName;
  count?: number | string;
}

export interface SidebarTag {
  id: string;
  name: string;
}

export interface IndexProps {
  /** App-level route nav (Dashboard / Bookmarks / Tags / etc). Always rendered. */
  appNav: AppNavItem[];
  /** Current pathname; used to highlight the active app-nav item. */
  activePath: string;
  /** Invoked when the user clicks an app-nav item. Caller handles haptics, drawer-close, router.push. */
  onAppNavClick: (href: string) => void;

  /** When true, render Library + Subjects + Signal sections beneath the app nav. */
  showBookmarkSections?: boolean;
  folders?: SidebarFolder[];
  activeFolder?: string;
  onSelectFolder?: (id: string) => void;
  /** Phase 3: invoked when the user clicks the "+" affordance on the Library header. */
  onCreateFolder?: () => void;
  /** Phase 3: invoked when the user picks "rename" on a folder hover-menu. */
  onRenameFolder?: (id: string) => void;
  /** Phase 3: invoked when the user picks "delete" on a folder hover-menu. */
  onDeleteFolder?: (id: string) => void;
  /** Phase 3: invoked when the user clicks the "Import X" pill on the Library header. */
  onImportXFolders?: () => void;
  tags?: SidebarTag[];
  activeTags?: string[];
  onToggleTag?: (id: string) => void;

  /** Opens the command palette (⌘K). */
  onOpenCmd: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  userFooter?: ReactNode;
  brandLabel?: string;
  brandSubline?: string;
}

export function Index(props: IndexProps) {
  const {
    appNav,
    activePath,
    onAppNavClick,
    showBookmarkSections = false,
    folders = [],
    activeFolder,
    onSelectFolder,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    onImportXFolders,
    tags = [],
    activeTags = [],
    onToggleTag,
    onOpenCmd,
    collapsed,
    onToggleCollapsed,
    userFooter,
    brandLabel = 'H.A.L.',
    brandSubline = 'Hello Again Links',
  } = props;

  if (collapsed) {
    return (
      <div
        style={{
          width: 56,
          flexShrink: 0,
          borderRight: '1px solid var(--hal-line-1)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0',
          gap: 4,
          alignItems: 'center',
          background: 'var(--hal-bg-1)',
          // Sticky + 100vh so the sidebar fills the viewport regardless of how
          // long the main content (and thus the parent flex row) gets. Plain
          // `height: 100%` resolves against an `auto` parent and falls back to
          // content height, leaving the sidebar short of the viewport bottom.
          position: 'sticky',
          top: 0,
          height: '100vh',
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          style={iconBtnStyle('var(--hal-text-2)')}
          title="Expand (⌘B)"
        >
          <Icon name="menu" size={16} />
        </button>
        <div style={{ height: 12 }} />

        {/* App nav (collapsed icons) */}
        {appNav.map((item) => {
          const isActive = activePath === item.href;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAppNavClick(item.href)}
              title={item.label}
              style={{
                ...iconBtnStyle(isActive ? 'var(--hal-a)' : 'var(--hal-text-2)'),
                background: isActive ? 'var(--hal-a-dim)' : 'transparent',
                borderRadius: 6,
              }}
            >
              <Icon name={item.icon} size={15} />
            </button>
          );
        })}

        {/* Bookmark folders (collapsed icons) */}
        {showBookmarkSections && folders.length > 0 && (
          <>
            <div style={{ width: 24, height: 1, background: 'var(--hal-line-1)', margin: '6px 0' }} />
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onSelectFolder?.(f.id)}
                title={f.name}
                style={{
                  ...iconBtnStyle(activeFolder === f.id ? 'var(--hal-a)' : 'var(--hal-text-2)'),
                  background: activeFolder === f.id ? 'var(--hal-a-dim)' : 'transparent',
                  borderRadius: 6,
                }}
              >
                <Icon name={f.icon} size={15} />
              </button>
            ))}
          </>
        )}

        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onOpenCmd}
          title="Command (⌘K)"
          style={{
            ...iconBtnStyle('var(--hal-a)'),
            border: '1px solid var(--hal-a-dim)',
            borderRadius: 6,
          }}
        >
          <Icon name="command" size={14} />
        </button>
      </div>
    );
  }

  return (
    <aside
      style={{
        width: 244,
        flexShrink: 0,
        borderRight: '1px solid var(--hal-line-1)',
        background: 'var(--hal-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Sticky + 100vh so the sidebar fills the viewport regardless of how
        // long the main content (and thus the parent flex row) gets. Plain
        // `height: 100%` resolves against an `auto` parent and falls back to
        // content height, leaving the sidebar short of the viewport bottom.
        position: 'sticky',
        top: 0,
        height: '100vh',
        alignSelf: 'flex-start',
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: '16px 18px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid var(--hal-line-1)',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            border: '1px solid var(--hal-a)',
            color: 'var(--hal-a)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--hal-mono)',
            fontWeight: 600,
            fontSize: 12,
            letterSpacing: '-0.02em',
            background: 'var(--hal-a-dim)',
          }}
        >
          H
        </div>
        <div style={{ flex: 1, lineHeight: 1.1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--hal-text-0)',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--hal-sans)',
            }}
          >
            {brandLabel}
          </div>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 9,
              color: 'var(--hal-text-3)',
              letterSpacing: '0.04em',
              marginTop: 2,
            }}
          >
            {brandSubline}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Collapse (⌘B)"
          style={{
            color: 'var(--hal-text-3)',
            padding: 4,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Icon name="chevron-l" size={13} />
        </button>
      </div>

      {/* Quick search / cmd */}
      <div style={{ padding: '10px 12px 6px' }}>
        <button
          type="button"
          onClick={onOpenCmd}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            background: 'var(--hal-bg-2)',
            border: '1px solid var(--hal-line-1)',
            borderRadius: 6,
            fontSize: 12,
            color: 'var(--hal-text-2)',
            transition: 'all 0.15s',
            cursor: 'pointer',
            fontFamily: 'var(--hal-sans)',
          }}
        >
          <Icon name="search" size={13} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search & ask…</span>
          <span
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              color: 'var(--hal-text-3)',
              letterSpacing: '0.05em',
              border: '1px solid var(--hal-line-1)',
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            ⌘K
          </span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 16px' }}>
        {/* APP nav — always rendered */}
        <SectionHead label="App" />
        {appNav.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activePath === item.href}
            onClick={() => onAppNavClick(item.href)}
          />
        ))}

        {showBookmarkSections && (
          <BookmarkSections
            folders={folders}
            activeFolder={activeFolder}
            onSelectFolder={onSelectFolder}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onImportXFolders={onImportXFolders}
            tags={tags}
            activeTags={activeTags}
            onToggleTag={onToggleTag}
          />
        )}
      </div>

      {/* Footer slot — caller passes UserMenu to avoid coupling */}
      {userFooter && (
        <div
          style={{
            padding: '8px 8px',
            borderTop: '1px solid var(--hal-line-1)',
          }}
        >
          {userFooter}
        </div>
      )}
    </aside>
  );
}

function iconBtnStyle(color: string): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  };
}
