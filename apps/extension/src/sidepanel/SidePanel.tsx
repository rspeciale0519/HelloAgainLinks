import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { timeAgo } from '@helloagain/shared';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';

interface BookmarkItem {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[];
  created_at: string;
  bookmarked_at: string;
  bookmark_tags?: Array<{ tag_id: string; tags: { id: string; name: string; color: string } }>;
  bookmark_folders?: Array<{ folder_id: string; folders: { id: string; name: string } }>;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface FolderItem {
  id: string;
  name: string;
  parent_id: string | null;
}

function ImportButton() {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [imported, setImported] = useState(0);
  const [phaseMessage, setPhaseMessage] = useState('');
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (!changes.import_progress) return;
      const p = changes.import_progress.newValue;
      if (!p) return;
      setImported(p.imported || 0);
      if (p.phaseMessage) setPhaseMessage(p.phaseMessage);
      if (p.startedAt) setStartedAt(p.startedAt);
      setState(p.done ? 'done' : 'running');
    };
    chrome.storage.local.onChanged.addListener(listener);
    chrome.runtime.sendMessage({ type: 'GET_IMPORT_STATUS' }, (res) => {
      void chrome.runtime.lastError;
      if (res?.running) { setState('running'); setImported(res.imported || 0); }
    });
    return () => chrome.storage.local.onChanged.removeListener(listener);
  }, []);

  const speed = state === 'running' && startedAt && imported > 0
    ? Math.round(imported / ((Date.now() - startedAt) / 1000))
    : 0;

  if (state === 'running') {
    return (
      <span style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%',
          background: '#00d4ff', animation: 'hal-sp-pulse 1.2s ease-in-out infinite',
        }} />
        {imported > 0
          ? <>{imported} imported{speed > 0 && <span style={{ color: '#4a4a5a' }}> ({speed}/s)</span>}</>
          : (phaseMessage || 'Connecting...')
        }
        <style>{`@keyframes hal-sp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </span>
    );
  }

  if (state === 'done') {
    return (
      <button
        onClick={() => setState('idle')}
        style={{
          background: 'none', border: 'none', color: '#22c55e',
          fontSize: '11px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
        }}
      >
        Done ({imported})
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        setState('running');
        setImported(0);
        setPhaseMessage('Connecting...');
        chrome.runtime.sendMessage({ type: 'START_BULK_IMPORT' });
      }}
      style={{
        padding: '4px 10px', borderRadius: '6px',
        border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.05)',
        color: '#00d4ff', fontSize: '11px', fontWeight: 600,
        cursor: 'pointer', fontFamily: "'Inter', sans-serif",
      }}
    >
      Import All
    </button>
  );
}

export function SidePanel() {
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<{ type: 'all' | 'tag' | 'folder'; id?: string }>({ type: 'all' });
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; postId: string } | null>(null);

  const loadBookmarks = useCallback((params: Record<string, string> = {}, append = false) => {
    setLoading(true);
    chrome.runtime.sendMessage(
      { type: 'GET_BOOKMARKS', params: { pageSize: '20', sort: 'bookmarked_at', order: 'desc', ...params } },
      (res) => {
        if (res?.data) {
          setBookmarks((prev) => (append ? [...prev, ...res.data] : res.data));
          setHasMore(res.hasMore || false);
        }
        setLoading(false);
      }
    );
  }, []);

  const loadTags = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_TAGS' }, (res) => {
      if (Array.isArray(res)) setTags(res);
      else if (res?.data) setTags(res.data);
    });
  }, []);

  const loadFolders = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_FOLDERS' }, (res) => {
      if (Array.isArray(res)) setFolders(res);
      else if (res?.data) setFolders(res.data);
    });
  }, []);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (res) => {
      setAuthenticated(!!res?.authenticated);
      if (res?.authenticated) {
        loadBookmarks();
        loadTags();
        loadFolders();
      } else {
        setLoading(false);
      }
    });
  }, [loadBookmarks, loadTags, loadFolders]);

  const handleSearch = useCallback(() => {
    if (!search.trim()) {
      loadBookmarks();
      return;
    }
    setLoading(true);
    chrome.runtime.sendMessage({ type: 'SEARCH_BOOKMARKS', query: search }, (res) => {
      if (res?.data) {
        setBookmarks(res.data);
        setHasMore(false);
      }
      setLoading(false);
    });
  }, [search, loadBookmarks]);

  const handleFilterTag = useCallback((tagId: string) => {
    setActiveFilter({ type: 'tag', id: tagId });
    setPage(1);
    loadBookmarks({ tag_id: tagId });
  }, [loadBookmarks]);

  const handleFilterFolder = useCallback((folderId: string) => {
    setActiveFilter({ type: 'folder', id: folderId });
    setPage(1);
    loadBookmarks({ folder_id: folderId });
  }, [loadBookmarks]);

  const handleShowAll = useCallback(() => {
    setActiveFilter({ type: 'all' });
    setPage(1);
    loadBookmarks();
  }, [loadBookmarks]);

  const handleDelete = useCallback((bookmarkId: string, postId: string) => {
    setConfirmDelete({ id: bookmarkId, postId });
  }, []);

  const confirmDeleteBookmark = useCallback(() => {
    if (!confirmDelete) return;
    const { id, postId } = confirmDelete;
    setConfirmDelete(null);
    chrome.runtime.sendMessage(
      { type: 'DELETE_BOOKMARK', data: { postId } },
      () => {
        void chrome.runtime.lastError;
        setBookmarks((prev) => prev.filter((bm) => bm.id !== id));
      }
    );
  }, [confirmDelete]);

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    const params: Record<string, string> = { page: String(nextPage) };
    if (activeFilter.type === 'tag' && activeFilter.id) params.tag_id = activeFilter.id;
    if (activeFilter.type === 'folder' && activeFilter.id) params.folder_id = activeFilter.id;
    loadBookmarks(params, true);
  }, [page, activeFilter, loadBookmarks]);


  if (!authenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
        <div
          style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, color: '#0a0a0f', marginBottom: '20px',
          }}
        >H</div>
        <p style={{ color: '#8a8a9a', fontSize: '14px', marginBottom: '16px' }}>Sign in to view your bookmarks</p>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'LOGIN' })}
          style={{
            padding: '12px 24px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            color: '#0a0a0f', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}
        >Sign in with X</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
      <ConfirmDeleteModal
        open={confirmDelete !== null}
        onConfirm={confirmDeleteBookmark}
        onCancel={() => setConfirmDelete(null)}
      />
      {/* Header */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div
            style={{
              width: '28px', height: '28px', borderRadius: '7px',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700, color: '#0a0a0f',
            }}
          >H</div>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>Hello Again Links</span>
          <div style={{ flex: 1 }} />
          <ImportButton />
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search bookmarks..."
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.1)', background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5', fontSize: '13px', fontFamily: "'Inter', sans-serif",
            outline: 'none', marginBottom: '12px',
          }}
        />

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '4px', paddingBottom: '12px', overflowX: 'auto', flexWrap: 'nowrap' }}>
          <button
            onClick={handleShowAll}
            style={{
              padding: '5px 12px', borderRadius: '100px', whiteSpace: 'nowrap',
              border: activeFilter.type === 'all' ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
              background: activeFilter.type === 'all' ? 'rgba(0,212,255,0.08)' : 'transparent',
              color: activeFilter.type === 'all' ? '#00d4ff' : '#8a8a9a',
              fontSize: '12px', cursor: 'pointer',
            }}
          >All</button>

          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => handleFilterFolder(f.id)}
              style={{
                padding: '5px 12px', borderRadius: '100px', whiteSpace: 'nowrap',
                border: activeFilter.id === f.id ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                background: activeFilter.id === f.id ? 'rgba(0,212,255,0.08)' : 'transparent',
                color: activeFilter.id === f.id ? '#00d4ff' : '#8a8a9a',
                fontSize: '12px', cursor: 'pointer',
              }}
            >📁 {f.name}</button>
          ))}

          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => handleFilterTag(t.id)}
              style={{
                padding: '5px 12px', borderRadius: '100px', whiteSpace: 'nowrap',
                border: activeFilter.id === t.id ? `1px solid ${t.color}40` : '1px solid transparent',
                background: activeFilter.id === t.id ? `${t.color}15` : 'transparent',
                color: activeFilter.id === t.id ? t.color : '#8a8a9a',
                fontSize: '12px', cursor: 'pointer',
              }}
            >{t.name}</button>
          ))}
        </div>
      </div>

      {/* Bookmark list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading && bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#4a4a5a' }}>Loading...</div>
        ) : bookmarks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#4a4a5a' }}>
            {search ? 'No results found' : 'No bookmarks yet'}
          </div>
        ) : (
          <>
            {bookmarks.map((bm, i) => (
              <motion.div
                key={bm.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i < 20 ? i * 0.02 : 0 }}
                style={{
                  padding: '12px', borderRadius: '10px', marginBottom: '4px',
                  cursor: 'pointer', border: '1px solid transparent', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,212,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(0,212,255,0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#00d4ff' }}>
                    @{bm.x_author_handle}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#4a4a5a' }}>{timeAgo(bm.bookmarked_at || bm.created_at, { short: true })}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(bm.id, bm.x_post_id); }}
                      title="Remove bookmark"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#4a4a5a', padding: '2px', display: 'flex', alignItems: 'center',
                        transition: 'color 0.15s ease', flexShrink: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4a5a'; }}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#8a8a9a', lineHeight: 1.4, marginBottom: '6px' }}>
                  {bm.content_text?.slice(0, 200)}
                </p>
                {bm.bookmark_tags && bm.bookmark_tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {bm.bookmark_tags.map((bt) => (
                      <span
                        key={bt.tag_id}
                        style={{
                          padding: '1px 7px', borderRadius: '100px', fontSize: '10px',
                          color: bt.tags?.color || '#00d4ff',
                          background: `${bt.tags?.color || '#00d4ff'}15`,
                          border: `1px solid ${bt.tags?.color || '#00d4ff'}20`,
                        }}
                      >{bt.tags?.name}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid rgba(0,212,255,0.1)', background: 'transparent',
                  color: '#00d4ff', fontSize: '13px', cursor: 'pointer', marginTop: '8px',
                }}
              >Load more</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
