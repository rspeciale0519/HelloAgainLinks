'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || '';

async function createCheckout(priceId: string, token: string) {
  const res = await fetch(`${APP_URL}/api/stripe/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ priceId }),
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

async function openPortal(token: string) {
  const res = await fetch(`${APP_URL}/api/stripe/portal`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.url) window.location.href = data.url;
}

export default function SettingsPage() {
  const [plan] = useState<'free' | 'pro' | 'lifetime'>('free');

  const handleUpgrade = (priceId: string) => {
    // In production, get token from session/cookie
    const token = ''; // placeholder
    createCheckout(priceId, token);
  };

  const handleManageBilling = () => {
    const token = '';
    openPortal(token);
  };

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
            <span style={{ color: '#00d4ff', fontSize: '14px', fontWeight: 600 }}>
              {plan === 'free' ? 'Free' : plan === 'pro' ? 'Pro' : 'Lifetime'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Subscription */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Subscription</h2>

        {plan === 'free' ? (
          <>
            <p style={{ color: '#8a8a9a', fontSize: '14px', marginBottom: '20px' }}>
              Upgrade to Pro for unlimited bookmarks, AI features, and unlimited Blends.
            </p>

            {/* Pricing cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <motion.button
                whileHover={{ scale: 1.01, boxShadow: '0 0 20px rgba(0,212,255,0.3)' }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleUpgrade('pro_monthly')}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  color: '#0a0a0f',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Pro Monthly</span>
                <span>$9/mo</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleUpgrade('pro_annual')}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,212,255,0.2)',
                  background: 'rgba(0,212,255,0.05)',
                  color: '#f0f0f5',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Pro Annual <span style={{ color: '#00d4ff', fontSize: '12px' }}>Save 20%</span></span>
                <span>$86/yr</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleUpgrade('lifetime')}
                style={{
                  padding: '14px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(168,85,247,0.2)',
                  background: 'rgba(168,85,247,0.05)',
                  color: '#f0f0f5',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Lifetime Deal <span style={{ color: '#a855f7', fontSize: '12px' }}>Limited</span></span>
                <span>$79 once</span>
              </motion.button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#8a8a9a', fontSize: '14px', marginBottom: '16px' }}>
              You&apos;re on the <strong style={{ color: '#00d4ff' }}>{plan === 'pro' ? 'Pro' : 'Lifetime'}</strong> plan.
            </p>
            {plan === 'pro' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleManageBilling}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0,212,255,0.2)',
                  background: 'rgba(0,212,255,0.05)',
                  color: '#00d4ff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Manage Billing
              </motion.button>
            )}
          </>
        )}
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
