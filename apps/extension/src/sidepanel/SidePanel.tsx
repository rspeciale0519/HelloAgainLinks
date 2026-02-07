import React, { useState } from 'react';
import { motion } from 'framer-motion';

const tabs = ['All', 'AI', 'Startups', 'Wealth', 'Tech'];

const mockBookmarks = Array.from({ length: 20 }, (_, i) => ({
  id: `bm-${i}`,
  author: ['@elonmusk', '@naval', '@paulg', '@sama'][i % 4],
  content: [
    'The future of neural interfaces and brain-computer interaction is closer than we think...',
    'How to build wealth through leverage and specific knowledge in the modern era...',
    'Why the best startups are often the ones nobody believes in at first...',
    'AGI timeline predictions and what it means for society at large...',
  ][i % 4],
  tags: [['AI'], ['Wealth'], ['Startups'], ['AI', 'Future']][i % 4],
  time: `${i + 1}d ago`,
}));

export function SidePanel() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0', borderBottom: '1px solid rgba(0,212,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0a0a0f',
            }}
          >
            H
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600 }}>HelloAgain</span>
        </div>

        {/* Search */}
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
            marginBottom: '12px',
          }}
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', paddingBottom: '12px', overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '5px 12px',
                borderRadius: '100px',
                border: activeTab === tab ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
                background: activeTab === tab ? 'rgba(0,212,255,0.08)' : 'transparent',
                color: activeTab === tab ? '#00d4ff' : '#8a8a9a',
                fontSize: '12px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmark list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {mockBookmarks.map((bm, i) => (
          <motion.div
            key={bm.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 }}
            style={{
              padding: '12px',
              borderRadius: '10px',
              marginBottom: '4px',
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'all 0.2s',
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
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#00d4ff' }}>{bm.author}</span>
              <span style={{ fontSize: '11px', color: '#4a4a5a' }}>{bm.time}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#8a8a9a', lineHeight: 1.4, marginBottom: '6px' }}>
              {bm.content}
            </p>
            <div style={{ display: 'flex', gap: '4px' }}>
              {bm.tags.map((t) => (
                <span key={t} style={{ padding: '1px 7px', borderRadius: '100px', fontSize: '10px', color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.12)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
