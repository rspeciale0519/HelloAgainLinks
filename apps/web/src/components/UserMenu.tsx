'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { Plan } from '@helloagain/shared';

interface UserMenuProps {
  avatarUrl: string;
  displayName: string;
  plan?: Plan;
  onNavigate?: () => void; // called on mobile to close sidebar
}

const menuItems = [
  { id: 'profile', label: 'Profile', icon: '👤', href: '/dashboard/settings' },
  { id: 'settings', label: 'Settings', icon: '⚙️', href: '/dashboard/settings' },
  { id: 'billing', label: 'Billing', icon: '💳', action: 'billing' },
] as const;

export default function UserMenu({ avatarUrl, displayName, plan = 'free', onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
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

  // Close on Escape
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
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/stripe/portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
  }, [onNavigate]);

  const handleItemClick = useCallback((item: typeof menuItems[number]) => {
    setOpen(false);
    onNavigate?.();
    if ('action' in item && item.action === 'billing') {
      handleBilling();
    } else if ('href' in item && item.href) {
      router.push(item.href);
    }
  }, [router, onNavigate, handleBilling]);

  const planLabel = plan === 'pro' ? 'Pro' : plan === 'lifetime' ? 'Lifetime' : 'Free';
  const planColor = plan === 'free' ? '#4a4a5a' : '#00d4ff';

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Popover menu — renders above the avatar */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              marginBottom: '8px',
              background: 'rgba(18, 18, 26, 0.98)',
              border: '1px solid rgba(0,212,255,0.12)',
              borderRadius: '12px',
              padding: '6px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(0,212,255,0.06)',
              zIndex: 50,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Plan badge */}
            <div
              style={{
                padding: '10px 12px 8px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: '4px',
              }}
            >
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  background: plan === 'free' ? 'rgba(255,255,255,0.04)' : 'rgba(0,212,255,0.08)',
                  color: planColor,
                  border: `1px solid ${plan === 'free' ? 'rgba(255,255,255,0.06)' : 'rgba(0,212,255,0.15)'}`,
                }}
              >
                {planLabel} Plan
              </span>
            </div>

            {/* Menu items */}
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  color: '#c0c0cc',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'left',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,212,255,0.06)';
                  e.currentTarget.style.color = '#f0f0f5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#c0c0cc';
                }}
              >
                <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}

            {/* Divider */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />

            {/* Log out */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#ef4444',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>🚪</span>
              Log Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="User menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          padding: '12px 14px',
          borderTop: '1px solid rgba(0,212,255,0.06)',
          marginTop: '12px',
          background: open ? 'rgba(0,212,255,0.04)' : 'transparent',
          border: 'none',
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'rgba(0,212,255,0.03)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: open ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(0,212,255,0.2)',
              transition: 'border-color 0.15s ease',
            }}
          />
        ) : (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(0,212,255,0.1)',
              border: open ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(0,212,255,0.2)',
              transition: 'border-color 0.15s ease',
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', color: '#f0f0f5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{displayName}</div>
          <div style={{ fontSize: '11px', color: planColor }}>{planLabel} Plan</div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ fontSize: '10px', color: '#4a4a5a', lineHeight: 1 }}
        >
          ▲
        </motion.span>
      </button>
    </div>
  );
}
