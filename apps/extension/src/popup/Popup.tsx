import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface UserInfo {
  id: string;
  handle: string;
  name: string;
  avatar: string;
}

interface BookmarkItem {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  content_text: string;
  created_at: string;
}

function ImportBookmarks() {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [imported, setImported] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const listener = (message: Record<string, unknown>) => {
      if (message.type === 'BULK_IMPORT_PROGRESS' || message.type === 'BULK_IMPORT_DONE' || message.type === 'BULK_IMPORT_ERROR') {
        return; // these come via storage changes, not direct messages
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // Listen for storage-based progress (more reliable for MV3)
    const storageListener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (!changes.import_progress) return;
      const p = changes.import_progress.newValue;
      if (!p) return;
      setImported(p.imported || 0);
      setSkipped(p.skipped || 0);
      setLimitReached(p.limitReached || false);
      if (p.error) {
        setErrorMsg(p.error);
        setState('error');
      } else if (p.done) {
        setState('done');
      } else {
        setState('running');
      }
    };
    chrome.storage.local.onChanged.addListener(storageListener);

    // Check if import is already running
    chrome.runtime.sendMessage({ type: 'GET_IMPORT_STATUS' }, (res) => {
      void chrome.runtime.lastError;
      if (res?.running) {
        setState('running');
        setImported(res.imported || 0);
        setSkipped(res.skipped || 0);
      }
    });

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      chrome.storage.local.onChanged.removeListener(storageListener);
    };
  }, []);

  const handleStart = () => {
    setState('running');
    setImported(0);
    setSkipped(0);
    setLimitReached(false);
    chrome.runtime.sendMessage({ type: 'START_BULK_IMPORT' });
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({ type: 'BULK_IMPORT_STOP' });
    setState('done');
  };

  return (
    <div style={{
      padding: '10px 0', borderTop: '1px solid rgba(0,212,255,0.06)', marginTop: '8px',
    }}>
      {state === 'idle' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleStart}
          style={{
            width: '100%', padding: '10px', borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.2)', background: 'rgba(0,212,255,0.05)',
            color: '#00d4ff', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Import All X Bookmarks
        </motion.button>
      )}
      {state === 'running' && (
        <div>
          <div style={{ fontSize: '12px', color: '#8a8a9a', marginBottom: '6px' }}>
            Importing... <span style={{ color: '#00d4ff', fontWeight: 600 }}>{imported}</span> saved
            {skipped > 0 && <span> ({skipped} skipped)</span>}
          </div>
          <button
            onClick={handleStop}
            style={{
              width: '100%', padding: '8px', borderRadius: '8px',
              border: '1px solid rgba(239,68,68,0.2)', background: 'transparent',
              color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Stop Import
          </button>
        </div>
      )}
      {state === 'done' && (
        <div style={{ fontSize: '12px', color: '#8a8a9a' }}>
          <span style={{ color: '#22c55e' }}>Done!</span> Imported{' '}
          <span style={{ color: '#00d4ff', fontWeight: 600 }}>{imported}</span> bookmarks
          {skipped > 0 && <span> ({skipped} skipped)</span>}
          {limitReached && (
            <div style={{ color: '#f59e0b', marginTop: '4px', fontSize: '11px' }}>
              Plan limit reached — upgrade to Pro for unlimited imports
            </div>
          )}
          <button
            onClick={() => setState('idle')}
            style={{
              marginTop: '6px', background: 'none', border: 'none',
              color: '#00d4ff', fontSize: '11px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Import again
          </button>
        </div>
      )}
      {state === 'error' && (
        <div style={{ fontSize: '12px' }}>
          <div style={{ color: '#ef4444', marginBottom: '4px' }}>{errorMsg || 'Import failed'}</div>
          <button
            onClick={() => setState('idle')}
            style={{
              background: 'none', border: 'none',
              color: '#00d4ff', fontSize: '11px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

function HalButtonToggle() {
  const [showButton, setShowButton] = useState(true);

  useEffect(() => {
    chrome.storage.sync.get({ showHalButton: true }, (result) => {
      setShowButton(result.showHalButton);
    });
  }, []);

  const handleToggle = () => {
    const newVal = !showButton;
    setShowButton(newVal);
    chrome.storage.sync.set({ showHalButton: newVal });
  };

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 0', borderTop: '1px solid rgba(0,212,255,0.06)', marginTop: '8px',
      }}
    >
      <div>
        <div style={{ fontSize: '12px', color: '#8a8a9a' }}>Show HAL button on tweets</div>
        <div style={{ fontSize: '10px', color: '#4a4a5a' }}>Native bookmarks always mirror to HAL</div>
      </div>
      <button
        onClick={handleToggle}
        style={{
          width: '36px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: showButton ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: showButton ? '#00d4ff' : '#4a4a5a',
          position: 'absolute', top: '2px',
          left: showButton ? '18px' : '2px',
          transition: 'left 0.2s, background 0.2s',
        }} />
      </button>
    </div>
  );
}

export function Popup() {
  const [search, setSearch] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [recentBookmarks, setRecentBookmarks] = useState<BookmarkItem[]>([]);
  const [searchResults, setSearchResults] = useState<BookmarkItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<BookmarkItem | null>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (res) => {
      setAuthenticated(!!res?.authenticated);
      if (res?.user) setUser(res.user);
      setLoading(false);
    });
    chrome.runtime.sendMessage({ type: 'GET_BOOKMARK_COUNT' }, (res) => {
      if (res?.count !== undefined) setBookmarkCount(res.count);
    });
    chrome.runtime.sendMessage(
      { type: 'GET_BOOKMARKS', params: { pageSize: '5', sort: 'created_at', order: 'desc' } },
      (res) => {
        if (res?.data) setRecentBookmarks(res.data);
      }
    );
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const timer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'SEARCH_BOOKMARKS', query }, (res) => {
        setSearchResults(res?.data || (Array.isArray(res) ? res : []));
        setSearchLoading(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleLogin = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'LOGIN' });
  }, []);

  const handleOpenDashboard = useCallback(() => {
    chrome.tabs.create({ url: 'https://helloagainlinks.com/dashboard' });
  }, []);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const openBookmark = (bm: BookmarkItem) => {
    const url = `https://x.com/${bm.x_author_handle}/status/${bm.x_post_id}`;
    chrome.runtime.sendMessage({ type: 'OPEN_IN_CURRENT_TAB', url });
  };

  const confirmDeleteBookmark = useCallback(() => {
    if (!confirmDelete) return;
    const bm = confirmDelete;
    setConfirmDelete(null);
    chrome.runtime.sendMessage({ type: 'DELETE_BOOKMARK', data: { postId: bm.x_post_id } }, () => {
      void chrome.runtime.lastError;
      setRecentBookmarks((prev) => prev.filter((b) => b.id !== bm.id));
      setSearchResults((prev) => prev.filter((b) => b.id !== bm.id));
      setBookmarkCount((prev) => Math.max(0, prev - 1));
    });
  }, [confirmDelete]);

  const renderBookmarkCard = (bm: BookmarkItem, i: number) => (
    <motion.div
      key={bm.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
      onClick={() => openBookmark(bm)}
      style={{
        padding: '10px 12px',
        borderRadius: '8px',
        marginBottom: '6px',
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0,212,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.1)';
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#4a4a5a' }}>{timeAgo(bm.created_at)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(bm); }}
            title="Remove bookmark"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4a4a5a', padding: '2px', display: 'flex', alignItems: 'center',
              transition: 'color 0.15s',
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
      <div style={{ fontSize: '12px', color: '#8a8a9a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {bm.content_text}
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#8a8a9a', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: '48px', height: '48px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: 700, color: '#0a0a0f',
            marginBottom: '20px', boxShadow: '0 0 20px rgba(0,212,255,0.3)',
          }}
        >
          H
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>Hello Again Links</h2>
        <p style={{ fontSize: '13px', color: '#8a8a9a', marginBottom: '24px' }}>Sign in to save and search your X bookmarks</p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogin}
          style={{
            padding: '12px 24px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            color: '#0a0a0f', fontWeight: 600, fontSize: '14px',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign in with X
        </motion.button>
      </div>
    );
  }

  const isSearching = search.trim().length > 0;
  const listLabel = isSearching ? (searchLoading ? 'SEARCHING…' : 'RESULTS') : 'RECENT';
  const listItems = isSearching ? searchResults : recentBookmarks;

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: '#0f1019', border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: '14px', padding: '20px', width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f0f0f5', marginBottom: '6px' }}>
              Remove bookmark?
            </p>
            <p style={{ fontSize: '12px', color: '#8a8a9a', lineHeight: 1.5, marginBottom: '16px' }}>
              This will permanently remove it from HAL.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#8a8a9a', fontSize: '12px', cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={confirmDeleteBookmark}
                style={{
                  padding: '7px 12px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div
          style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 700, color: '#0a0a0f',
            boxShadow: '0 0 15px rgba(0,212,255,0.3)',
          }}
        >
          H
        </div>
        <div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{user?.name || 'HAL'}</span>
          {user?.handle && (
            <div style={{ fontSize: '11px', color: '#4a4a5a' }}>@{user.handle}</div>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: '#00d4ff', fontWeight: 500 }}>{bookmarkCount.toLocaleString()}</span>
        <span style={{ fontSize: '11px', color: '#4a4a5a' }}>saved</span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookmarks..."
          style={{
            width: '100%',
            padding: search ? '10px 34px 10px 14px' : '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.1)',
            background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer',
              fontSize: '16px', lineHeight: 1, padding: '2px 4px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ fontSize: '12px', color: '#4a4a5a', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>
          {listLabel}
        </div>
        {!isSearching && recentBookmarks.length === 0 && (
          <div style={{ color: '#4a4a5a', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No bookmarks yet. Save your first one!
          </div>
        )}
        {isSearching && !searchLoading && searchResults.length === 0 && (
          <div style={{ color: '#4a4a5a', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No results for "{search.trim()}"
          </div>
        )}
        {listItems.map((bm, i) => renderBookmarkCard(bm, i))}
      </div>

      {/* Bulk Import */}
      <ImportBookmarks />

      {/* Settings */}
      <HalButtonToggle />

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(0,212,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={handleOpenDashboard}
          style={{
            background: 'none', border: 'none', color: '#00d4ff',
            fontSize: '12px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Open Dashboard →
        </button>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => setAuthenticated(false))}
          style={{
            background: 'none', border: 'none', color: '#4a4a5a',
            fontSize: '12px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
