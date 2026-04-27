'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@helloagain/ui-hal';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { authFetch } from '@/lib/auth-fetch';
import type { Plan } from '@helloagain/shared';

interface UserMenuProps {
  avatarUrl: string;
  displayName: string;
  plan?: Plan;
  /** Called on mobile to close the sidebar drawer. */
  onNavigate?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: IconName;
  href?: string;
  action?: 'billing';
}

const menuItems: ReadonlyArray<MenuItem> = [
  { id: 'settings', label: 'Settings', icon: 'sliders', href: '/dashboard/settings' },
  { id: 'billing', label: 'Billing', icon: 'star', action: 'billing' },
];

export default function UserMenu({
  avatarUrl,
  displayName,
  plan = 'free',
  onNavigate,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleLogout = useCallback(async () => {
    setOpen(false);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
  }, [router]);

  const handleBilling = useCallback(async () => {
    setOpen(false);
    onNavigate?.();
    const res = await authFetch('/api/stripe/portal', { method: 'POST' });
    if (res?.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  }, [onNavigate]);

  const handleItemClick = useCallback(
    (item: MenuItem) => {
      setOpen(false);
      onNavigate?.();
      if (item.action === 'billing') {
        void handleBilling();
      } else if (item.href) {
        router.push(item.href);
      }
    },
    [router, onNavigate, handleBilling],
  );

  const planLabel = plan === 'pro' ? 'PRO' : plan === 'lifetime' ? 'LIFETIME' : 'FREE';
  const isPaid = plan !== 'free';

  return (
    <div ref={menuRef} style={{ position: 'relative', fontFamily: 'var(--hal-sans)' }}>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="User menu"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: 6,
              background: 'var(--hal-bg-1)',
              border: '1px solid var(--hal-line-2)',
              borderRadius: 4,
              padding: 4,
              boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.5)',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid var(--hal-line-1)',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  color: 'var(--hal-text-3)',
                  textTransform: 'uppercase',
                }}
              >
                Plan
              </span>
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 10,
                  letterSpacing: '0.1em',
                  padding: '2px 6px',
                  borderRadius: 2,
                  color: isPaid ? 'var(--hal-a)' : 'var(--hal-text-2)',
                  background: isPaid ? 'var(--hal-a-dim)' : 'transparent',
                  border: `1px solid ${isPaid ? 'var(--hal-a)' : 'var(--hal-line-1)'}`,
                }}
              >
                {planLabel}
              </span>
            </div>

            {menuItems.map((item) => (
              <MenuRow key={item.id} item={item} onClick={() => handleItemClick(item)} />
            ))}

            <div
              style={{
                height: 1,
                background: 'var(--hal-line-1)',
                margin: '4px 0',
              }}
            />

            <button
              type="button"
              role="menuitem"
              onClick={() => void handleLogout()}
              style={logoutBtnStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Icon name="external" size={13} />
              <span style={{ flex: 1, textAlign: 'left' }}>Log out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger row — matches the HAL sidebar's NavItem aesthetic. */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="User menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          padding: '10px 12px',
          background: open ? 'var(--hal-bg-3)' : 'transparent',
          borderTop: '1px solid var(--hal-line-1)',
          borderRight: 'none',
          borderBottom: 'none',
          borderLeft: open ? '2px solid var(--hal-a)' : '2px solid transparent',
          paddingLeft: open ? 10 : 12,
          marginTop: 8,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--hal-sans)',
          transition: 'all 0.1s',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--hal-bg-2)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            style={{
              borderRadius: '50%',
              border: open
                ? '1px solid var(--hal-a)'
                : '1px solid var(--hal-line-2)',
              transition: 'border-color 0.1s',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--hal-a-dim)',
              border: open
                ? '1px solid var(--hal-a)'
                : '1px solid var(--hal-line-2)',
              transition: 'border-color 0.1s',
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--hal-text-0)',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            @{displayName}
          </div>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 9.5,
              letterSpacing: '0.1em',
              color: isPaid ? 'var(--hal-a)' : 'var(--hal-text-3)',
              marginTop: 2,
            }}
          >
            {planLabel} PLAN
          </div>
        </div>
        <motion.span
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.12 }}
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 9,
            color: 'var(--hal-text-3)',
            lineHeight: 1,
          }}
        >
          ▲
        </motion.span>
      </button>
    </div>
  );
}

function MenuRow({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={menuRowStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--hal-bg-3)';
        e.currentTarget.style.color = 'var(--hal-text-0)';
        e.currentTarget.style.borderLeftColor = 'var(--hal-a)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--hal-text-1)';
        e.currentTarget.style.borderLeftColor = 'transparent';
      }}
    >
      <span style={{ color: 'var(--hal-text-2)', display: 'flex' }}>
        <Icon name={item.icon} size={13} />
      </span>
      <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
    </button>
  );
}

const menuRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 10px',
  paddingLeft: 8,
  borderTop: 'none',
  borderRight: 'none',
  borderBottom: 'none',
  borderLeft: '2px solid transparent',
  background: 'transparent',
  color: 'var(--hal-text-1)',
  fontSize: 12.5,
  fontFamily: 'var(--hal-sans)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.1s',
};

const logoutBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  width: '100%',
  padding: '8px 10px',
  paddingLeft: 8,
  borderTop: 'none',
  borderRight: 'none',
  borderBottom: 'none',
  borderLeft: '2px solid transparent',
  background: 'transparent',
  color: '#ef4444',
  fontSize: 12.5,
  fontFamily: 'var(--hal-sans)',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.1s',
};
