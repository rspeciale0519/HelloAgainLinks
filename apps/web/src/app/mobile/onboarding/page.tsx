'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { HalLogo } from '@helloagain/ui';
import { hexToRgba } from '@helloagain/shared';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { ImpactStyle } from '@capacitor/haptics';
import { triggerHaptic } from '@/lib/mobile';

const isIOS = Capacitor.getPlatform() === 'ios';
const TOTAL_STEPS = isIOS ? 5 : 4; // Android skips share extension setup
const MOBILE_AUTH_NONCE_KEY = 'mobile_auth_handoff_nonce';

function createMobileAuthNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const next = async () => {
    await triggerHaptic(ImpactStyle.Light);
    // Android: skip step 4 (iOS share extension setup)
    const nextStep = (!isIOS && step === 3) ? 5 : step + 1;
    if (nextStep > 5) {
      await complete();
    } else {
      setStep(nextStep);
    }
  };

  const complete = async () => {
    await Preferences.set({ key: 'onboarding_complete', value: 'true' });
    router.replace('/mobile/home');
  };

  const openSignIn = async () => {
    // window.open with '_system' target opens in the device's default browser,
    // which preserves the appUrlOpen listener mounted in layout.tsx.
    // Do NOT use window.location.href — that navigates the WebView away from
    // the app shell and destroys the listener before the deep-link fires.
    // Use absolute production URL — relative URLs resolve to http://localhost in the system browser.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://helloagainlinks.com';
    const mobileNonce = createMobileAuthNonce();
    await Preferences.set({ key: MOBILE_AUTH_NONCE_KEY, value: mobileNonce });
    window.open(
      `${appUrl}/api/auth/x-login?platform=mobile&mobile_nonce=${mobileNonce}`,
      '_system'
    );
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', padding: '48px 24px 32px',
      display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif",
    }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const isActive = i + 1 === (isIOS ? step : step > 3 ? step - 1 : step);
          return (
            <div key={i} style={{
              height: 5, borderRadius: 3,
              width: isActive ? 20 : 5,
              background: isActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
              boxShadow: isActive ? '0 0 6px rgba(var(--accent-rgb),0.5)' : 'none',
              transition: 'all 0.3s ease',
            }} />
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        >
          {step === 1 && <StepWelcome onGetStarted={next} onReturning={openSignIn} />}
          {step === 2 && <StepSignIn onSignIn={openSignIn} />}
          {step === 3 && <StepTwoWays onNext={next} />}
          {step === 4 && isIOS && <StepEnableShare onNext={next} onSkip={next} />}
          {step === 5 && <StepAllSet onDone={complete} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepWelcome({ onGetStarted, onReturning }: { onGetStarted: () => void; onReturning: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <HalLogo size={72} style={{ marginBottom: 20 }} />
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f0f0f5', marginBottom: 8, lineHeight: 1.2 }}>
        Hello Again Links
      </h1>
      <p style={{ color: '#4a4a5a', fontSize: 14, lineHeight: 1.6, marginBottom: 48, maxWidth: 260 }}>
        Your AI-powered bookmark manager for X — everywhere.
      </p>
      <button onClick={onGetStarted} style={primaryBtn}>Get Started</button>
      <button onClick={onReturning} style={{ ...secondaryBtn, marginTop: 12 }}>I already have an account</button>
    </div>
  );
}

function StepSignIn({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12, margin: '0 auto 16px',
          background: 'rgba(var(--accent-rgb),0.08)', border: '1px solid rgba(var(--accent-rgb),0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>𝕏</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 8 }}>Sign in with X</h2>
        <p style={{ color: '#4a4a5a', fontSize: 13, lineHeight: 1.6 }}>
          HAL uses your X account to sync bookmarks and personalise your AI experience.
        </p>
      </div>
      <div style={{
        background: 'rgba(var(--accent-rgb),0.04)', border: '1px solid rgba(var(--accent-rgb),0.1)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 28,
      }}>
        <div style={{ fontSize: 10, color: '#4a4a5a', marginBottom: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Permissions requested</div>
        {['✓  Read your profile', '✓  Read your bookmarks', '✗  Post on your behalf'].map((p, i) => (
          <div key={i} style={{ fontSize: 12, color: p.startsWith('✗') ? '#4a4a5a' : '#8a8a9a', lineHeight: 1.8 }}>{p}</div>
        ))}
      </div>
      <button onClick={onSignIn} style={{
        ...primaryBtn, background: '#000',
        border: '1px solid rgba(255,255,255,0.12)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
        Continue with X
      </button>
      <p style={{ textAlign: 'center', fontSize: 10, color: '#4a4a5a', marginTop: 16, lineHeight: 1.6 }}>
        By continuing you agree to HAL&apos;s{' '}
        <span style={{ color: 'var(--accent-cyan)' }}>Terms</span> and{' '}
        <span style={{ color: 'var(--accent-cyan)' }}>Privacy Policy</span>
      </p>
    </div>
  );
}

function StepTwoWays({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 6 }}>Two ways to save</h2>
      <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
        HAL works with how you already use X — no changes needed.
      </p>
      {[
        { icon: '🔖', title: 'Bookmark in X, sync to HAL', desc: 'Tap X\'s native bookmark button as usual. HAL automatically syncs it in the background — no extra steps.', badge: 'Zero extra taps', badgeColor: '#22c55e' },
        { icon: '📤', title: 'Share directly to HAL', desc: 'Tap Share on any tweet → select HAL. Saves without adding to X bookmarks. AI tags it instantly.', badge: 'AI-tagged on save', badgeColor: 'var(--accent-cyan)' },
      ].map((m) => (
        <div key={m.title} style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(var(--accent-rgb),0.1)',
          borderRadius: 14, padding: 16, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--accent-rgb),0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>{m.icon}</div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{m.title}</span>
          </div>
          <p style={{ fontSize: 11, color: '#4a4a5a', lineHeight: 1.5, marginBottom: 8 }}>{m.desc}</p>
          <span style={{
            borderRadius: 100, padding: '2px 10px', fontSize: 9, fontWeight: 600,
            background: hexToRgba(m.badgeColor, 0.1),
            border: `1px solid ${m.badgeColor}40`, color: m.badgeColor,
          }}>{m.badge}</span>
        </div>
      ))}
      <button onClick={onNext} style={{ ...primaryBtn, marginTop: 'auto' }}>Next →</button>
    </div>
  );
}

function StepEnableShare({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f5', marginBottom: 6 }}>Enable HAL in X</h2>
      <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
        One-time setup so HAL appears in X&apos;s share menu.
      </p>
      {[
        { num: '1', title: 'Open the X app', desc: 'Tap Share (↑) on any tweet' },
        { num: '2', title: 'Scroll down → tap "More"', desc: 'Or "Edit Actions" on iOS 17+' },
        { num: '3', title: 'Find HAL and tap +', desc: 'HAL will now appear every time you share a tweet.' },
      ].map((s) => (
        <div key={s.num} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            background: 'rgba(var(--accent-rgb),0.1)', border: '1px solid rgba(var(--accent-rgb),0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)',
          }}>{s.num}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5', marginBottom: 3 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: '#4a4a5a', lineHeight: 1.4 }}>{s.desc}</div>
          </div>
        </div>
      ))}
      <button onClick={onNext} style={{ ...primaryBtn, marginTop: 'auto' }}>I&apos;ve done this →</button>
      <button onClick={onSkip} style={{ ...secondaryBtn, marginTop: 10 }}>Skip for now</button>
    </div>
  );
}

function StepAllSet({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
        border: '2px solid var(--accent-cyan)', boxShadow: '0 0 24px rgba(var(--accent-rgb),0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
      }}>✓</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f5', marginBottom: 8 }}>You&apos;re all set</h2>
      <p style={{ color: '#4a4a5a', fontSize: 13, lineHeight: 1.6, marginBottom: 32, maxWidth: 260 }}>
        HAL is ready. Start saving bookmarks from X anytime.
      </p>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
        {[
          { icon: '✨', text: 'AI auto-tags every bookmark you save' },
          { icon: '🔄', text: 'X bookmarks sync automatically' },
          { icon: '🔗', text: 'Blend with friends to discover shared interests' },
        ].map((f) => (
          <div key={f.icon} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(var(--accent-rgb),0.04)', border: '1px solid rgba(var(--accent-rgb),0.08)',
            borderRadius: 10, padding: '10px 14px',
          }}>
            <span style={{ fontSize: 14 }}>{f.icon}</span>
            <span style={{ fontSize: 12, color: '#8a8a9a' }}>{f.text}</span>
          </div>
        ))}
      </div>
      <button onClick={onDone} style={primaryBtn}>Go to my bookmarks →</button>
    </div>
  );
}

// Shared button styles
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
  background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan))',
  color: '#0a0a0f', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  boxShadow: '0 0 20px rgba(var(--accent-rgb),0.2)',
};

const secondaryBtn: React.CSSProperties = {
  width: '100%', padding: '12px 0', borderRadius: 13,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', color: '#8a8a9a',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
};
