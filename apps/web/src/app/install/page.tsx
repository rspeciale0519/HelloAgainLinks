'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const steps = [
  {
    num: '1',
    title: 'Download the Extension',
    desc: 'Click the button below to download the HAL Chrome extension.',
  },
  {
    num: '2',
    title: 'Open Chrome Extensions',
    desc: 'Go to chrome://extensions in your browser and enable "Developer mode" (top-right toggle).',
  },
  {
    num: '3',
    title: 'Load the Extension',
    desc: 'Unzip the download, click "Load unpacked", and select the unzipped folder.',
  },
  {
    num: '4',
    title: 'Browse X & Save',
    desc: 'Visit x.com — you\'ll see a HAL save button on every tweet. Click to save!',
  },
];

export default function InstallPage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div
        style={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 48px', borderBottom: '1px solid rgba(0,212,255,0.06)', position: 'relative', zIndex: 10,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 700, color: '#0a0a0f',
            boxShadow: '0 0 20px rgba(0,212,255,0.3)',
          }}>
            H
          </div>
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#f0f0f5' }}>Hello Again Links</span>
        </Link>
      </nav>

      <main style={{
        maxWidth: '700px', margin: '0 auto', padding: '80px 24px',
        position: 'relative', zIndex: 10,
      }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 style={{
            fontSize: '36px', fontWeight: 700, color: '#f0f0f5', marginBottom: '12px', textAlign: 'center',
          }}>
            Install the Chrome Extension
          </h1>
          <p style={{ fontSize: '16px', color: '#8a8a9a', textAlign: 'center', marginBottom: '48px', lineHeight: 1.6 }}>
            Save bookmarks from X/Twitter with one click. Auto-organize with AI.
          </p>
        </motion.div>

        {/* Download button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: '48px' }}
        >
          <a
            href="https://github.com/rspeciale0519/HelloAgain/releases"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '16px 36px', borderRadius: '14px', textDecoration: 'none',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
              fontSize: '17px', fontWeight: 700,
              boxShadow: '0 0 40px rgba(0,212,255,0.3)',
              transition: 'all 0.2s',
            }}
          >
            ⬇️ Download Extension v0.1.0
          </a>
          <div style={{ fontSize: '13px', color: '#4a4a5a', marginTop: '12px' }}>
            Chrome Web Store listing coming soon
          </div>
        </motion.div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass glow-border"
              style={{
                padding: '20px 24px', borderRadius: '14px',
                display: 'flex', gap: '16px', alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: 700, color: '#00d4ff',
              }}>
                {step.num}
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5 }}>
                  {step.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* What you get */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: '48px', textAlign: 'center' }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#f0f0f5', marginBottom: '20px' }}>
            What the Extension Does
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { icon: '🔖', text: 'Save button on every tweet' },
              { icon: '⚡', text: 'Auto-captures native bookmarks' },
              { icon: '🔍', text: 'Search from the popup' },
              { icon: '🏷️', text: 'AI auto-tags (Pro)' },
            ].map((f) => (
              <div key={f.text} className="glass" style={{
                padding: '16px', borderRadius: '10px', border: '1px solid rgba(0,212,255,0.08)',
              }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
                <div style={{ fontSize: '13px', color: '#8a8a9a' }}>{f.text}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
