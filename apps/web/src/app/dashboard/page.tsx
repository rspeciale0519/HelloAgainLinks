'use client';

import { motion } from 'framer-motion';

const stats = [
  { label: 'Total Bookmarks', value: '1,247', change: '+23 this week' },
  { label: 'Tags Created', value: '34', change: '5 auto-generated' },
  { label: 'Blend Score Avg', value: '72%', change: '3 blends completed' },
  { label: 'Search Queries', value: '89', change: 'This month' },
];

const recentBookmarks = [
  { author: '@elonmusk', content: 'Thread on the future of AI and space exploration...', time: '2h ago', tags: ['AI', 'Space'] },
  { author: '@naval', content: 'How to get rich without getting lucky - a thread...', time: '5h ago', tags: ['Wealth', 'Philosophy'] },
  { author: '@paulg', content: 'The best essay I\'ve read on startups this year...', time: '1d ago', tags: ['Startups'] },
];

export default function DashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>
          Dashboard
        </h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          Welcome back. Here&apos;s your bookmark activity.
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '40px',
        }}
      >
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass glow-border"
            style={{ padding: '24px', borderRadius: '14px' }}
          >
            <div style={{ fontSize: '13px', color: '#8a8a9a', marginBottom: '8px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f0f0f5', marginBottom: '4px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: '#00d4ff' }}>{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent bookmarks */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>
          Recent Bookmarks
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recentBookmarks.map((bm, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              className="glass glow-border"
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#00d4ff' }}>
                    {bm.author}
                  </span>
                  <span style={{ fontSize: '12px', color: '#4a4a5a' }}>{bm.time}</span>
                </div>
                <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.4 }}>
                  {bm.content}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginLeft: '16px', flexShrink: 0 }}>
                {bm.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '100px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#00d4ff',
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.15)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
