'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type ShareState = 'idle' | 'saving' | 'saved' | 'error' | 'unauthenticated';

interface SavedBookmark {
  content_text: string;
  x_author_handle: string;
  tags: Array<{ name: string; color: string }>;
}

function extractTweetUrl(input: string): string | null {
  const regex = /(https?:\/\/(?:x|twitter)\.com\/[\w_]+\/status\/\d+)/i;
  const match = input.match(regex);
  return match?.[1] ?? null;
}

export function MobileShareSheet() {
  const router = useRouter();
  const [state, setState] = useState<ShareState>('idle');
  const [tweetPreview, setTweetPreview] = useState<{ handle: string; url: string } | null>(null);
  const [savedBookmark, setSavedBookmark] = useState<SavedBookmark | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleShare = useCallback(async (tweetUrl: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setState('unauthenticated');
      return;
    }

    const urlMatch = tweetUrl.match(/(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/);
    if (urlMatch) {
      setTweetPreview({ handle: urlMatch[1], url: tweetUrl });
    }

    setState('saving');

    try {
      const res = await fetch('/api/mobile/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: tweetUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 || (data?.error ?? '').includes('duplicate')) {
          setErrorMessage('Already in your HAL');
        } else {
          setErrorMessage('Something went wrong. Try again.');
        }
        setState('error');
        return;
      }

      const data = await res.json();
      setSavedBookmark({
        content_text: data.bookmark?.content_text ?? tweetUrl,
        x_author_handle: data.bookmark?.x_author_handle ?? tweetPreview?.handle ?? '',
        tags: data.bookmark?.bookmark_tags?.map(
          (bt: { tags: { name: string; color: string } }) => bt.tags
        ) ?? [],
      });
      setState('saved');
    } catch {
      setErrorMessage('Something went wrong. Try again.');
      setState('error');
    }
  }, [tweetPreview]);

  const dismiss = useCallback(() => {
    setState('idle');
    setTweetPreview(null);
    setSavedBookmark(null);
    setErrorMessage('');
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    import('@capgo/capacitor-share-target').then(({ CapacitorShareTarget }) => {
      CapacitorShareTarget.addListener('shareReceived', (event: { title: string; texts: string[]; files?: unknown[] }) => {
        const combined = [event.title, ...(event.texts ?? [])].filter(Boolean).join(' ');
        const tweetUrl = extractTweetUrl(combined);
        if (tweetUrl) handleShare(tweetUrl);
      }).then((handle) => {
        cleanup = () => handle.remove();
      });
    });

    return () => { cleanup?.(); };
  }, [handleShare]);

  if (state === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'flex-end',
        }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          style={{
            width: '100%',
            background: '#13131f',
            borderRadius: '20px 20px 0 0',
            borderTop: '1px solid rgba(0,212,255,0.2)',
            padding: '12px 20px 32px',
          }}
        >
          {/* Drag handle */}
          <div style={{
            width: 32, height: 3, borderRadius: 100,
            background: 'rgba(255,255,255,0.12)',
            margin: '0 auto 16px',
          }} />

          {/* HAL header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: '#0a0a0f',
              boxShadow: '0 0 12px rgba(0,212,255,0.35)',
              flexShrink: 0,
            }}>H</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5' }}>
                {state === 'saving' && 'Save to HAL'}
                {state === 'saved' && 'Saved to HAL'}
                {state === 'error' && "Couldn't save"}
                {state === 'unauthenticated' && 'Sign in to save'}
              </div>
              <div style={{ fontSize: 10, color: '#4a4a5a' }}>
                {state === 'saving' && 'AI tagging your bookmark...'}
                {state === 'saved' && 'Auto-tagged by AI'}
                {state === 'error' && errorMessage}
                {state === 'unauthenticated' && 'Open HAL to sign in first'}
              </div>
            </div>
          </div>

          {/* Tweet preview */}
          {(state === 'saving' || state === 'saved' || state === 'error') && tweetPreview && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0,212,255,0.08)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#00d4ff', marginBottom: 4 }}>
                @{tweetPreview.handle}
              </div>
              <div style={{ fontSize: 10, color: '#8a8a9a', lineHeight: 1.5 }}>
                {tweetPreview.url.length > 120 ? tweetPreview.url.slice(0, 120) + '...' : tweetPreview.url}
              </div>
            </div>
          )}

          {/* Saving — shimmer skeleton */}
          {state === 'saving' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[52, 68, 44].map((w, i) => (
                <div key={i} style={{
                  height: 20, width: w, borderRadius: 100,
                  background: 'rgba(255,255,255,0.06)',
                  animation: 'shimmer 1.5s infinite',
                }} />
              ))}
            </div>
          )}

          {/* Saved — success badge + tags */}
          {state === 'saved' && savedBookmark && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,212,255,0.06)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 10, padding: '8px 12px', marginBottom: 10,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#00d4ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#0a0a0f', fontWeight: 700,
                  boxShadow: '0 0 8px rgba(0,212,255,0.4)', flexShrink: 0,
                }}>✓</div>
                <span style={{ fontSize: 11, color: '#00d4ff', fontWeight: 500 }}>
                  Bookmark saved successfully
                </span>
              </div>
              {savedBookmark.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  {savedBookmark.tags.map((tag) => {
                    const r = parseInt(tag.color.slice(1, 3), 16);
                    const g = parseInt(tag.color.slice(3, 5), 16);
                    const b = parseInt(tag.color.slice(5, 7), 16);
                    return (
                      <span key={tag.name} style={{
                        borderRadius: 100, padding: '3px 10px', fontSize: 10, fontWeight: 500,
                        background: `rgba(${r},${g},${b},0.1)`,
                        border: `1px solid rgba(${r},${g},${b},0.25)`,
                        color: tag.color,
                      }}>{tag.name}</span>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CTAs */}
          {state === 'saving' && (
            <button onClick={dismiss} style={secondaryBtnStyle}>Cancel</button>
          )}
          {state === 'saved' && (
            <button onClick={dismiss} style={primaryBtnStyle}>Done — Back to X</button>
          )}
          {state === 'error' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => tweetPreview && handleShare(tweetPreview.url)}
                style={{ ...primaryBtnStyle, flex: 1 }}
              >Try Again</button>
              <button onClick={dismiss} style={{ ...secondaryBtnStyle, flex: 1 }}>Done</button>
            </div>
          )}
          {state === 'unauthenticated' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { dismiss(); router.push('/mobile/onboarding'); }}
                style={{ ...primaryBtnStyle, flex: 1 }}
              >Open HAL</button>
              <button onClick={dismiss} style={{ ...secondaryBtnStyle, flex: 1 }}>Dismiss</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: 12, borderRadius: 12, border: 'none',
  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
  color: '#0a0a0f', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  boxShadow: '0 0 20px rgba(0,212,255,0.25)',
};

const secondaryBtnStyle: React.CSSProperties = {
  width: '100%', padding: 12, borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', color: '#8a8a9a',
  fontSize: 13, fontWeight: 500, cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
};
