'use client';
import React from 'react';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  header?: React.ReactNode;
}

export function Sidebar({ items, activeId, onSelect, header }: SidebarProps) {
  return (
    <nav
      style={{
        width: '260px',
        height: '100vh',
        background: 'rgba(10, 10, 15, 0.95)',
        borderRight: '1px solid rgba(0, 212, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {header && <div style={{ marginBottom: '32px', padding: '0 8px' }}>{header}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                background: isActive ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                color: isActive ? '#00d4ff' : '#8a8a9a',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
