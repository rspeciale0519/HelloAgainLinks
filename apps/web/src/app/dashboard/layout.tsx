'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const navItems = [
  { id: 'home', label: 'Dashboard', href: '/dashboard', icon: '⬡' },
  { id: 'bookmarks', label: 'Bookmarks', href: '/dashboard/bookmarks', icon: '🔖' },
  { id: 'tags', label: 'Tags', href: '/dashboard/tags', icon: '🏷️' },
  { id: 'blend', label: 'Blend', href: '/dashboard/blend', icon: '🔗' },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav
        style={{
          width: '260px',
          borderRight: '1px solid rgba(0,212,255,0.08)',
          background: 'rgba(10,10,15,0.95)',
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 20,
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
      </nav>

      {/* Main content */}
      <main style={{ marginLeft: '260px', flex: 1, padding: '32px 40px' }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
