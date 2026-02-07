'use client';

import { motion } from 'framer-motion';

export default function BlendPage() {
  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>
        Bookmark Blend
      </h1>
      <p style={{ color: '#8a8a9a', fontSize: '14px', marginBottom: '32px' }}>
        Compare your bookmark taste with friends. See what you have in common.
      </p>

      {/* New blend CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass glow-border"
        style={{
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          marginBottom: '32px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>
          Start a Blend
        </h2>
        <p style={{ color: '#8a8a9a', fontSize: '14px', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
          Enter a friend&apos;s X handle to see your bookmark compatibility score, shared interests, and discover new content.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '400px', margin: '0 auto' }}>
          <input
            placeholder="@username"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(0,212,255,0.15)',
              background: 'rgba(15,16,25,0.8)',
              color: '#f0f0f5',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
            whileTap={{ scale: 0.98 }}
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
            Blend
          </motion.button>
        </div>
      </motion.div>

      {/* Example blend result */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass glow-border"
        style={{
          padding: '32px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '32px',
        }}
      >
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'conic-gradient(#00d4ff 0% 78%, rgba(0,212,255,0.1) 78% 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#0f1019',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 700,
              color: '#00d4ff',
            }}
          >
            78%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#00d4ff', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.05em' }}>
            SAMPLE BLEND
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginBottom: '8px' }}>
            You & @naval
          </h3>
          <p style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5, marginBottom: '12px' }}>
            High compatibility! You both save content about startups, wealth building, and philosophy.
            Naval&apos;s unique interest: meditation. Your unique interest: space tech.
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['Startups', 'Wealth', 'Philosophy', 'AI'].map((t) => (
              <span key={t} style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>{t}</span>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
