import React, { useState } from 'react';
import { motion } from 'framer-motion';

const recentBookmarks = [
  { author: '@elonmusk', content: 'Thread on neural interfaces...', time: '2h ago' },
  { author: '@naval', content: 'How to build wealth...', time: '5h ago' },
  { author: '@paulg', content: 'Best startup essay...', time: '1d ago' },
];

export function Popup() {
  const [search, setSearch] = useState('');

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
        <span style={{ fontSize: '16px', fontWeight: 600 }}>HelloAgain</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '12px', color: '#00d4ff', fontWeight: 500 }}>1,247</span>
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

      {/* Quick save */}
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
        whileTap={{ scale: 0.98 }}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          border: 'none',
          background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
          color: '#0a0a0f',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          marginBottom: '20px',
        }}
      >
        + Save Current Page
      </motion.button>

      {/* Recent */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', color: '#4a4a5a', fontWeight: 600, marginBottom: '10px', letterSpacing: '0.05em' }}>
          RECENT
        </div>
        {recentBookmarks.map((bm, i) => (
          <motion.div
            key={i}
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
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#00d4ff' }}>{bm.author}</span>
              <span style={{ fontSize: '11px', color: '#4a4a5a' }}>{bm.time}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#8a8a9a' }}>{bm.content}</div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(0,212,255,0.06)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
        <button
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
          style={{
            background: 'none',
            border: 'none',
            color: '#4a4a5a',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Settings
        </button>
      </div>
    </div>
  );
}
