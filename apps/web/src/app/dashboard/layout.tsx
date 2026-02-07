'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';

const navItems = [
  { id: 'home', label: 'Dashboard', href: '/dashboard', icon: '⬡' },
  { id: 'bookmarks', label: 'Bookmarks', href: '/dashboard/bookmarks', icon: '🔖' },
  { id: 'tags', label: 'Tags', href: '/dashboard/tags', icon: '🏷️' },
  { id: 'blend', label: 'Blend', href: '/dashboard/blend', icon: '🔗' },
  { id: 'assistant', label: 'Assistant', href: '/dashboard/assistant', icon: '✨' },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

const MOBILE_BREAKPOINT = 768;
const SIDEBAR_WIDTH = 260;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const showSidebar = !isMobile || sidebarOpen;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Overlay backdrop (mobile only) */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSidebar}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 25,
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.nav
            initial={isMobile ? { x: -SIDEBAR_WIDTH } : false}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_WIDTH }}
            transition={{ type: 'tween', duration: 0.25 }}
            style={{
              width: `${SIDEBAR_WIDTH}px`,
              borderRight: '1px solid rgba(0,212,255,0.08)',
              background: 'rgba(10,10,15,0.98)',
              padding: '20px 12px',
              display: 'flex',
              flexDirection: 'column',
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              zIndex: 30,
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                marginBottom: '32px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#0a0a0f',
                  boxShadow: '0 0 15px rgba(0,212,255,0.3)',
                }}
              >
                H
              </div>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5' }}>HelloAgain</span>
            </div>

            {/* Nav items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={isMobile ? closeSidebar : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
                      color: isActive ? '#00d4ff' : '#8a8a9a',
                      transition: 'all 0.2s ease',
                      fontFamily: "'Inter', sans-serif",
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    {item.label}
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          width: '3px',
                          height: '24px',
                          borderRadius: '0 4px 4px 0',
                          background: '#00d4ff',
                          boxShadow: '0 0 10px rgba(0,212,255,0.5)',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Profile area */}
            <div
              style={{
                padding: '12px 14px',
                borderTop: '1px solid rgba(0,212,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0,212,255,0.1)',
                  border: '1px solid rgba(0,212,255,0.2)',
                }}
              />
              <div>
                <div style={{ fontSize: '13px', color: '#f0f0f5', fontWeight: 500 }}>@user</div>
                <div style={{ fontSize: '11px', color: '#4a4a5a' }}>Free Plan</div>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{ marginLeft: isMobile ? 0 : `${SIDEBAR_WIDTH}px`, flex: 1, padding: '0 0 0 0' }}>
        {/* Top bar with hamburger (mobile) + Demo banner */}
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(0,212,255,0.12), rgba(14,165,233,0.08))',
            borderBottom: '1px solid rgba(0,212,255,0.15)',
            padding: isMobile ? '10px 16px' : '10px 40px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            color: '#00d4ff',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00d4ff',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '2px 8px 2px 0',
                lineHeight: 1,
              }}
              aria-label="Open menu"
            >
              ☰
            </button>
          )}
          <span style={{ fontSize: '16px' }}>🔮</span>
          <span style={{ fontWeight: 600 }}>Demo Mode</span>
          {!isMobile && (
            <span style={{ color: '#8a8a9a' }}>— You&apos;re viewing a preview with sample data. Auth coming soon.</span>
          )}
        </div>
        <div style={{ padding: isMobile ? '20px 16px' : '32px 40px' }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
