'use client';

import { motion } from 'framer-motion';

export default function SettingsPage() {
  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '32px' }}>Settings</h1>

      {/* Account */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#8a8a9a', fontSize: '14px' }}>X Handle</span>
            <span style={{ color: '#f0f0f5', fontSize: '14px' }}>@user</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#8a8a9a', fontSize: '14px' }}>Plan</span>
            <span style={{ color: '#00d4ff', fontSize: '14px', fontWeight: 600 }}>Free</span>
          </div>
        </div>
      </motion.div>

      {/* Plan */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Subscription</h2>
        <p style={{ color: '#8a8a9a', fontSize: '14px', marginBottom: '16px' }}>
          Upgrade to Pro for unlimited bookmarks, AI features, and unlimited Blends.
        </p>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '10px 20px',
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
          Upgrade to Pro — $9/mo
        </motion.button>
      </motion.div>

      {/* Privacy */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Privacy</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f0f0f5', fontSize: '14px', marginBottom: '2px' }}>Blend Opt-in</div>
            <div style={{ color: '#4a4a5a', fontSize: '12px' }}>Allow others to send you Blend requests</div>
          </div>
          <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: '#00d4ff', position: 'relative', cursor: 'pointer' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', right: '2px', transition: 'all 0.2s' }} />
          </div>
        </div>
      </motion.div>

      {/* Danger zone */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ padding: '24px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444', marginBottom: '16px' }}>Danger Zone</h2>
        <button
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'transparent',
            color: '#ef4444',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Delete Account
        </button>
      </motion.div>
    </div>
  );
}
