'use client';

import '@helloagain/ui-hal/styles';

import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { ImpactStyle } from '@capacitor/haptics';

import {
  BackgroundLayers,
  Index as IndexSidebar,
  type AppNavItem,
} from '@helloagain/ui-hal';

import { useAuth } from '@/lib/use-auth';
import { usePlan } from '@/lib/use-plan';
import { triggerHaptic } from '@/lib/mobile';
import UserMenu from '@/components/UserMenu';
import { BookmarkSidebarProvider, useBookmarkSidebar } from './bookmark-context';

const APP_NAV: AppNavItem[] = [
  { id: 'home', label: 'Dashboard', icon: 'inbox', href: '/dashboard' },
  { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark', href: '/dashboard/bookmarks' },
  { id: 'tags', label: 'Tags', icon: 'tag', href: '/dashboard/tags' },
  { id: 'lists', label: 'Shared Lists', icon: 'layers', href: '/dashboard/lists' },
  { id: 'blend', label: 'Blend', icon: 'users', href: '/dashboard/blend' },
  { id: 'assistant', label: 'Assistant', icon: 'sparkle', href: '/dashboard/assistant' },
];

const MOBILE_BREAKPOINT = 768;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookmarkSidebarProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </BookmarkSidebarProvider>
  );
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const meta = user?.user_metadata || {};
  const displayName = meta.preferred_username || meta.user_name || 'User';
  const avatarUrl = meta.avatar_url || meta.picture || '';
  const plan = usePlan(user?.id);

  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sidebar = useBookmarkSidebar();
  const isBookmarksRoute = pathname === '/dashboard/bookmarks';

  // Apply HAL theme tokens at document level so the sidebar can read --hal-* vars
  useEffect(() => {
    document.documentElement.setAttribute('data-hal', 'on');
    return () => document.documentElement.removeAttribute('data-hal');
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    if (isMobile) setDrawerOpen(false);
  }, [pathname, isMobile]);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleAppNavClick = useCallback(
    async (href: string) => {
      if (isMobile) await triggerHaptic(ImpactStyle.Light);
      if (isMobile) setDrawerOpen(false);
      router.push(href);
    },
    [isMobile, router],
  );

  const sidebarNode = (
    <IndexSidebar
      appNav={APP_NAV}
      activePath={pathname}
      onAppNavClick={handleAppNavClick}
      showBookmarkSections={isBookmarksRoute}
      folders={sidebar.folders}
      activeFolder={sidebar.activeFolder}
      onSelectFolder={(id) => {
        sidebar.setActiveFolder(id);
        if (isMobile) setDrawerOpen(false);
      }}
      tags={sidebar.tags}
      activeTags={sidebar.activeTags}
      onToggleTag={(id) =>
        sidebar.setActiveTags((prev) =>
          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        )
      }
      onOpenCmd={() => {
        /* TODO Phase 5: command palette */
      }}
      collapsed={collapsed && !isMobile}
      onToggleCollapsed={() => setCollapsed((v) => !v)}
      userFooter={
        <UserMenu
          avatarUrl={avatarUrl}
          displayName={displayName}
          plan={plan}
          onNavigate={isMobile ? closeDrawer : undefined}
        />
      }
    />
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      <BackgroundLayers />

      {/* Mobile top bar (hamburger + brand) */}
      {isMobile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid var(--hal-line-1)',
            background: 'var(--hal-bg-1)',
            zIndex: 20,
          }}
        >
          <button
            type="button"
            onClick={async () => {
              await triggerHaptic(ImpactStyle.Light);
              setDrawerOpen(true);
            }}
            aria-label="Open menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--hal-a)',
              fontSize: 22,
              cursor: 'pointer',
              padding: '2px 8px 2px 0',
              lineHeight: 1,
            }}
          >
            ☰
          </button>
          <div
            style={{
              width: 22,
              height: 22,
              border: '1px solid var(--hal-a)',
              background: 'var(--hal-a-dim)',
              color: 'var(--hal-a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--hal-mono)',
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            H
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--hal-text-0)',
              fontFamily: 'var(--hal-sans)',
              letterSpacing: '-0.01em',
            }}
          >
            H.A.L.
          </span>
        </div>
      )}

      {/* Mobile drawer + backdrop */}
      <AnimatePresence>
        {isMobile && drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDrawer}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                zIndex: 25,
              }}
            />
            <motion.div
              initial={{ x: -244 }}
              animate={{ x: 0 }}
              exit={{ x: -244 }}
              transition={{ type: 'tween', duration: 0.25 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 244,
                zIndex: 30,
              }}
            >
              {sidebarNode}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      {!isMobile && sidebarNode}

      {/* Main content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          marginTop: isMobile ? 44 : 0,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ padding: isMobile ? '20px 16px' : '0' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
