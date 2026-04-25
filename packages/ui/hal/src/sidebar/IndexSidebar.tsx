// packages/ui/hal/src/sidebar/Index.tsx
'use client';

import type { ReactNode } from 'react';
import { Icon, type IconName } from '../primitives/Icon';
import { StatusDot } from '../primitives/StatusDot';
import { SectionHead } from './SectionHead';
import { NavItem } from './NavItem';

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
  folders: SidebarFolder[];
  activeFolder: string;
  onSelectFolder: (id: string) => void;
  tags: SidebarTag[];
  activeTags: string[];
  onToggleTag: (id: string) => void;
  onOpenCmd: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  userFooter?: ReactNode;
  brandLabel?: string;
  brandSubline?: string;
}

const ACTIVITY_STUB = [
  { t: '2m', a: 'HAL', x: 'auto-tagged 3 new' },
  { t: '14m', a: 'you', x: 'saved @swyx' },
  { t: '1h', a: 'HAL', x: 'found 2 related' },
];

export function Index(props: IndexProps) {
  const {
    folders,
    activeFolder,
    onSelectFolder,
    tags,
    activeTags,
    onToggleTag,
    onOpenCmd,
    collapsed,
    onToggleCollapsed,
    userFooter,
    brandLabel = 'H.A.L.',
    brandSubline = 'v0.4 · synced',
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
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--hal-text-2)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Expand (⌘B)"
        >
          <Icon name="menu" size={16} />
        </button>
        <div style={{ height: 12 }} />
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelectFolder(f.id)}
            title={f.name}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: activeFolder === f.id ? 'var(--hal-a)' : 'var(--hal-text-2)',
              position: 'relative',
              borderRadius: 6,
              background: activeFolder === f.id ? 'var(--hal-a-dim)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name={f.icon} size={15} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onOpenCmd}
          title="Command (⌘K)"
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--hal-a)',
            border: '1px solid var(--hal-a-dim)',
            borderRadius: 6,
            background: 'transparent',
            cursor: 'pointer',
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
              letterSpacing: '0.08em',
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
        {/* Library section */}
        <SectionHead
          label="Library"
          right={
            <span style={{ fontFamily: 'var(--hal-mono)', fontSize: 9, color: 'var(--hal-text-3)' }}>
              {folders.length}
            </span>
          }
        />
        {folders.map((f) => (
          <NavItem
            key={f.id}
            icon={f.icon}
            label={f.name}
            count={f.count}
            active={activeFolder === f.id}
            onClick={() => onSelectFolder(f.id)}
          />
        ))}

        {/* Subjects section */}
        <div style={{ marginTop: 18 }}>
          <SectionHead
            label="Subjects"
            right={
              <span style={{ fontFamily: 'var(--hal-mono)', fontSize: 9, color: 'var(--hal-text-3)' }}>
                {tags.length}
              </span>
            }
          />
          <div
            style={{
              padding: '2px 6px 0',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
            }}
          >
            {tags.slice(0, 14).map((t) => {
              const active = activeTags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onToggleTag(t.id)}
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
                  borderBottom: i < ACTIVITY_STUB.length - 1 ? '1px solid var(--hal-line-0)' : 'none',
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
