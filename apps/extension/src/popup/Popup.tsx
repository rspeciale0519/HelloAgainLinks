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
  x_author_handle: string;
  content_text: string;
  created_at: string;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (res) => {
      setAuthenticated(!!res?.authenticated);
      if (res?.user) setUser(res.user);
      setLoading(false);
    });

    // Get bookmark count
    chrome.runtime.sendMessage({ type: 'GET_BOOKMARK_COUNT' }, (res) => {
      if (res?.count !== undefined) setBookmarkCount(res.count);
    });

    // Get recent bookmarks
    chrome.runtime.sendMessage(
      { type: 'GET_BOOKMARKS', params: { pageSize: '5', sort: 'created_at', order: 'desc' } },
      (res) => {
        if (res?.data) setRecentBookmarks(res.data);
      }
    );
  }, []);

  const handleLogin = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'LOGIN' });
  }, []);

  const handleSearch = useCallback(() => {
    if (!search.trim()) return;
    // Open side panel with search
    chrome.runtime.sendMessage({ type: 'SEARCH_BOOKMARKS', query: search });
  }, [search]);

  const handleOpenDashboard = useCallback(() => {
    chrome.tabs.create({ url: 'https://helloagain-three.vercel.app/dashboard' });
  }, []);

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
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 700,
            color: '#0a0a0f',
            marginBottom: '20px',
            boxShadow: '0 0 20px rgba(0,212,255,0.3)',
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
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            color: '#0a0a0f',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign in with X
        </motion.button>
      </div>
    );
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{ padding: '20px', minHeight: '480px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
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
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search bookmarks..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.1)',
            background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5',
            fontSize: '13px',
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
          }}
        />
      </div>

      {/* Recent */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: '#4a4a5a', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>
          RECENT
        </div>
        {recentBookmarks.length === 0 ? (
          <div style={{ color: '#4a4a5a', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            No bookmarks yet. Save your first one!
          </div>
        ) : (
          recentBookmarks.map((bm, i) => (
            <motion.div
              key={bm.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '6px',
                cursor: 'pointer',
                border: '1px solid transparent',
                transition: 'all 0.2s',
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#00d4ff' }}>
                  @{bm.x_author_handle}
                </span>
                <span style={{ fontSize: '11px', color: '#4a4a5a' }}>{timeAgo(bm.created_at)}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#8a8a9a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bm.content_text}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Settings */}
      <HalButtonToggle />

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(0,212,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={handleOpenDashboard}
          style={{
            background: 'none',
            border: 'none',
            color: '#00d4ff',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Open Dashboard →
        </button>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'LOGOUT' }, () => setAuthenticated(false))}
          style={{
            background: 'none',
            border: 'none',
            color: '#4a4a5a',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
