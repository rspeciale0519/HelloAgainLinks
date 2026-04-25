// apps/web/src/app/dashboard/bookmark-context.tsx
//
// Shared sidebar state between the dashboard layout (which renders the
// HAL Index sidebar) and the bookmarks page (which uses the same active
// folder / active tags for filtering its feed). Layout owns the state.
//
// Phase 3: folders are loaded from /api/folders. The synthetic "All"
// folder (id "f_all") is always present and represents "no filter".
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SidebarFolder, SidebarTag } from '@helloagain/ui-hal';
import { authFetch } from '@/lib/auth-fetch';

export const ALL_FOLDER_ID = 'f_all';

interface BookmarkSidebarState {
  folders: SidebarFolder[];
  setFolders: (folders: SidebarFolder[]) => void;

  activeFolder: string;
  setActiveFolder: (id: string) => void;

  tags: SidebarTag[];
  setTags: (tags: SidebarTag[]) => void;

  activeTags: string[];
  setActiveTags: (ids: string[] | ((prev: string[]) => string[])) => void;

  /** Re-fetch the live folder list from /api/folders. */
  refetchFolders: () => Promise<void>;
}

const BookmarkSidebarContext = createContext<BookmarkSidebarState | null>(null);

interface ApiFolder {
  id: string;
  name: string;
  x_folder_id: string | null;
  bookmark_count: number;
}

const ALL_FOLDER: SidebarFolder = {
  id: ALL_FOLDER_ID,
  name: 'All',
  icon: 'inbox',
  count: '?',
};

export function BookmarkSidebarProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<SidebarFolder[]>([ALL_FOLDER]);
  const [activeFolder, setActiveFolder] = useState<string>(ALL_FOLDER_ID);
  const [tags, setTags] = useState<SidebarTag[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const refetchFolders = useCallback(async () => {
    const res = await authFetch('/api/folders');
    if (!res?.ok) return;
    const json = (await res.json()) as { folders?: ApiFolder[] };
    const fetched = json.folders ?? [];

    const total = fetched.reduce((sum, f) => sum + (f.bookmark_count ?? 0), 0);
    const next: SidebarFolder[] = [
      { ...ALL_FOLDER, count: total },
      ...fetched.map<SidebarFolder>((f) => ({
        id: f.id,
        name: f.name,
        icon: 'folder',
        count: f.bookmark_count,
      })),
    ];
    setFolders(next);
  }, []);

  useEffect(() => {
    void refetchFolders();
  }, [refetchFolders]);

  const value = useMemo<BookmarkSidebarState>(
    () => ({
      folders,
      setFolders,
      activeFolder,
      setActiveFolder,
      tags,
      setTags,
      activeTags,
      setActiveTags,
      refetchFolders,
    }),
    [folders, activeFolder, tags, activeTags, refetchFolders],
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
