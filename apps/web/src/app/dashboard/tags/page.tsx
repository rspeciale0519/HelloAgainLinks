'use client';

import { motion } from 'framer-motion';

const mockTags = [
  { name: 'AI', count: 342, color: '#00d4ff' },
  { name: 'Startups', count: 189, color: '#0ea5e9' },
  { name: 'Wealth', count: 156, color: '#3b82f6' },
  { name: 'Philosophy', count: 98, color: '#8b5cf6' },
  { name: 'Tech', count: 267, color: '#00d4ff' },
  { name: 'Space', count: 45, color: '#0ea5e9' },
  { name: 'Crypto', count: 78, color: '#3b82f6' },
  { name: 'Design', count: 34, color: '#8b5cf6' },
  { name: 'Science', count: 56, color: '#00d4ff' },
  { name: 'Productivity', count: 23, color: '#0ea5e9' },
];

export default function TagsPage() {
  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '24px' }}>Tags</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {mockTags.map((tag, i) => (
          <motion.div
            key={tag.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.05, boxShadow: `0 0 20px ${tag.color}30` }}
            className="glass"
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              cursor: 'pointer',
              border: `1px solid ${tag.color}25`,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ color: tag.color, fontWeight: 600, fontSize: '14px' }}>{tag.name}</span>
            <span style={{ color: '#4a4a5a', fontSize: '12px' }}>{tag.count}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
