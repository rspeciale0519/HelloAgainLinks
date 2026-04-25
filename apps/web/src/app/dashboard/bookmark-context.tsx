// apps/web/src/app/dashboard/bookmark-context.tsx
//
// Shared sidebar state between the dashboard layout (which renders the
// HAL Index sidebar) and the bookmarks page (which uses the same active
// folder / active tags for filtering its feed). Layout owns the state.
'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { SidebarFolder, SidebarTag } from '@helloagain/ui-hal';

interface BookmarkSidebarState {
  folders: SidebarFolder[];
  setFolders: (folders: SidebarFolder[]) => void;

  activeFolder: string;
  setActiveFolder: (id: string) => void;

  tags: SidebarTag[];
  setTags: (tags: SidebarTag[]) => void;

  activeTags: string[];
  setActiveTags: (ids: string[] | ((prev: string[]) => string[])) => void;
}

const BookmarkSidebarContext = createContext<BookmarkSidebarState | null>(null);

const PLACEHOLDER_FOLDERS: SidebarFolder[] = [
  { id: 'f_all', name: 'All', icon: 'inbox', count: '?' },
  { id: 'f_unread', name: 'Unread', icon: 'bookmark', count: '?' },
  { id: 'f_brain', name: 'Brain food', icon: 'cpu', count: '?' },
  { id: 'f_design', name: 'Design craft', icon: 'layers', count: '?' },
  { id: 'f_read', name: 'Read later', icon: 'clock', count: '?' },
];

export function BookmarkSidebarProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<SidebarFolder[]>(PLACEHOLDER_FOLDERS);
  const [activeFolder, setActiveFolder] = useState('f_all');
  const [tags, setTags] = useState<SidebarTag[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const value = useMemo<BookmarkSidebarState>(
    () => ({ folders, setFolders, activeFolder, setActiveFolder, tags, setTags, activeTags, setActiveTags }),
    [folders, activeFolder, tags, activeTags],
  );

  return <BookmarkSidebarContext.Provider value={value}>{children}</BookmarkSidebarContext.Provider>;
}

export function useBookmarkSidebar(): BookmarkSidebarState {
  const ctx = useContext(BookmarkSidebarContext);
  if (!ctx) {
    throw new Error('useBookmarkSidebar must be used within BookmarkSidebarProvider');
  }
  return ctx;
}
