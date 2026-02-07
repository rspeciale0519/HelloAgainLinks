'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '30%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '20%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 48px',
          borderBottom: '1px solid rgba(0,212,255,0.06)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
              color: '#0a0a0f',
              boxShadow: '0 0 20px rgba(0,212,255,0.3)',
            }}
          >
            H
          </div>
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#f0f0f5' }}>
            HelloAgain
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
        >
          <Link
            href="/login"
            style={{
              color: '#8a8a9a',
              textDecoration: 'none',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '8px',
              transition: 'color 0.2s',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/login"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              color: '#0a0a0f',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
              padding: '10px 22px',
              borderRadius: '10px',
              boxShadow: '0 0 20px rgba(0,212,255,0.3)',
              transition: 'all 0.2s',
            }}
          >
            Get Started
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '120px 24px 80px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span
            style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '100px',
              border: '1px solid rgba(0,212,255,0.2)',
              background: 'rgba(0,212,255,0.05)',
              color: '#00d4ff',
              fontSize: '13px',
              fontWeight: 500,
              marginBottom: '24px',
              letterSpacing: '0.04em',
            }}
          >
            AI-Powered Bookmark Intelligence
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          style={{
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: '800px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #f0f0f5 0%, #00d4ff 50%, #3b82f6 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Your X Bookmarks, Reimagined
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            fontSize: '18px',
            color: '#8a8a9a',
            maxWidth: '560px',
            lineHeight: 1.6,
            marginBottom: '40px',
          }}
        >
          Search, organize, and discover with AI. Then blend your taste with friends
          and see what you have in common. Powered by Grok.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link
            href="/login"
            style={{
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              color: '#0a0a0f',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 600,
              padding: '14px 32px',
              borderRadius: '12px',
              boxShadow: '0 0 30px rgba(0,212,255,0.3)',
              transition: 'all 0.2s',
            }}
          >
            Install Chrome Extension
          </Link>
          <a
            href="#features"
            style={{
              border: '1px solid rgba(0,212,255,0.2)',
              color: '#f0f0f5',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 500,
              padding: '14px 32px',
              borderRadius: '12px',
              background: 'transparent',
              transition: 'all 0.2s',
            }}
          >
            See Features
          </a>
        </motion.div>

        {/* Feature cards */}
        <div
          id="features"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '1000px',
            width: '100%',
            marginTop: '100px',
          }}
        >
          {[
            {
              icon: '🔍',
              title: 'Smart Search',
              desc: 'Natural language search powered by Grok. Find "that thread about React from last month" instantly.',
            },
            {
              icon: '🏷️',
              title: 'AI Auto-Tagging',
              desc: 'Every bookmark automatically categorized by topic. Zero effort organization.',
            },
            {
              icon: '🔗',
              title: 'Bookmark Blend',
              desc: 'Compare your taste with friends. Get a compatibility score and discover shared interests.',
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="glass glow-border"
              style={{
                padding: '32px',
                borderRadius: '16px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '16px' }}>{feature.icon}</div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#f0f0f5',
                  marginBottom: '8px',
                }}
              >
                {feature.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6 }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          textAlign: 'center',
          padding: '40px 24px',
          borderTop: '1px solid rgba(0,212,255,0.06)',
          color: '#4a4a5a',
          fontSize: '13px',
        }}
      >
        © 2026 HelloAgain. Built with ❤️ and Grok.
      </footer>
    </div>
  );
}
