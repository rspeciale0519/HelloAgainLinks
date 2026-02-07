'use client';

import { motion } from 'framer-motion';

interface UpgradePromptProps {
  feature: string;
  currentUsage?: number;
  limit?: number;
  onUpgrade: (priceId: 'pro_monthly' | 'pro_annual' | 'lifetime') => void;
  onDismiss?: () => void;
}

export function UpgradePrompt({ feature, currentUsage, limit, onUpgrade, onDismiss }: UpgradePromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        padding: '24px',
        borderRadius: '14px',
        border: '1px solid rgba(0,212,255,0.2)',
        background: 'linear-gradient(135deg, rgba(0,212,255,0.06), rgba(14,165,233,0.03))',
        position: 'relative',
      }}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            color: '#4a4a5a',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          ×
        </button>
      )}

      <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚡</div>
      <h3 style={{ color: '#f0f0f5', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
        {limit && currentUsage !== undefined
          ? `You've used ${currentUsage}/${limit} ${feature}`
          : `Upgrade to unlock ${feature}`}
      </h3>
      <p style={{ color: '#8a8a9a', fontSize: '13px', marginBottom: '20px', lineHeight: 1.5 }}>
        Go Pro for unlimited bookmarks, AI features, and unlimited Blends.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onUpgrade('pro_monthly')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            color: '#0a0a0f',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Pro — $9/mo
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onUpgrade('pro_annual')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.2)',
            background: 'rgba(0,212,255,0.05)',
            color: '#00d4ff',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Annual — $86/yr
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onUpgrade('lifetime')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(168,85,247,0.2)',
            background: 'rgba(168,85,247,0.05)',
            color: '#a855f7',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Lifetime — $79
        </motion.button>
      </div>
    </motion.div>
  );
}
