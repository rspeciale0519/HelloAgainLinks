import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface BookmarkItem {
  id: string;
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

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    const params: Record<string, string> = { page: String(nextPage) };
    if (activeFilter.type === 'tag' && activeFilter.id) params.tag_id = activeFilter.id;
    if (activeFilter.type === 'folder' && activeFilter.id) params.folder_id = activeFilter.id;
    loadBookmarks(params, true);
  }, [page, activeFilter, loadBookmarks]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#00d4ff' }}>
                    @{bm.x_author_handle}
                  </span>
                  <span style={{ fontSize: '11px', color: '#4a4a5a' }}>{timeAgo(bm.bookmarked_at || bm.created_at)}</span>
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
