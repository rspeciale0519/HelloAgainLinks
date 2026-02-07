'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const mockBookmarks = Array.from({ length: 12 }, (_, i) => ({
  id: `bm-${i}`,
  author: ['@elonmusk', '@naval', '@paulg', '@sama', '@pmarca', '@balaboris'][i % 6],
  content: [
    'The future of neural interfaces and brain-computer interaction...',
    'How to build wealth through leverage and specific knowledge...',
    'Why the best startups are often the ones nobody believes in at first...',
    'AGI timeline predictions and what it means for society...',
    'Software is eating the world, but AI will eat software...',
    'Thread on building in public and the power of transparency...',
  ][i % 6],
  tags: [['AI', 'Tech'], ['Wealth'], ['Startups', 'Advice'], ['AI', 'Future'], ['Software'], ['Building']][i % 6],
  time: `${i + 1}d ago`,
}));

export default function BookmarksPage() {
  const [search, setSearch] = useState('');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5' }}>Bookmarks</h1>
        <span style={{ fontSize: '14px', color: '#8a8a9a' }}>1,247 saved</span>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a4a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bookmarks... try 'that AI thread from last week'"
          className="glass"
          style={{
            width: '100%',
            padding: '14px 16px 14px 44px',
            borderRadius: '12px',
            color: '#f0f0f5',
            fontSize: '14px',
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
            border: '1px solid rgba(0,212,255,0.1)',
            transition: 'all 0.2s',
          }}
        />
      </div>

      {/* Bookmark grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {mockBookmarks.map((bm, i) => (
          <motion.div
            key={bm.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass glow-border"
            style={{ padding: '20px', borderRadius: '14px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#00d4ff' }}>{bm.author}</span>
              <span style={{ fontSize: '12px', color: '#4a4a5a' }}>{bm.time}</span>
            </div>
            <p style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5, marginBottom: '12px' }}>{bm.content}</p>
            <div style={{ display: 'flex', gap: '6px' }}>
              {bm.tags.map((t) => (
                <span key={t} style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '11px', color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>{t}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
