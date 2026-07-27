'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { authPost } from '@/lib/auth-fetch';

interface Message { role: 'user' | 'assistant'; content: string; }

/** Composer sizing. Keep LINE_HEIGHT in step with the textarea's lineHeight. */
const LINE_HEIGHT = 20;
const MAX_LINES = 5;
/** Height of the fixed bottom nav in mobile/layout.tsx. */
const NAV_HEIGHT = 64;

export default function MobileAIPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hey! Ask me anything about your bookmarks. I can find threads, summarize topics, or surface ideas you've saved.",
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Grow the composer with the text up to MAX_LINES, then stop and let it
  // scroll internally — so a long prompt never pushes the send button or the
  // conversation off screen.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const max = LINE_HEIGHT * MAX_LINES;
    el.style.height = 'auto'; // measure the natural height first
    const next = Math.min(el.scrollHeight, max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [input]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await authPost('/api/ai/assistant', { message: text, history: messages });
      if (!res) { setLoading(false); return; }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.message || 'Sorry, I had trouble with that.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  // The page no longer sets height:100%: the composer is fixed and the mobile
  // layout's main element owns scrolling. paddingBottom on the message list
  // clears the composer at its tallest (5 lines) so nothing hides behind it.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 16px 0' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 16 }}>AI Assistant ✨</h1>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 170 }}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              maxWidth: '85%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user'
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(var(--accent-rgb),0.07)',
              border: msg.role === 'user'
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(var(--accent-rgb),0.15)',
              borderRadius: msg.role === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              padding: '10px 14px',
              fontSize: 13,
              color: '#c0c0d0',
              lineHeight: 1.5,
            }}
          >
            {msg.content}
          </motion.div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            background: 'rgba(var(--accent-rgb),0.07)', border: '1px solid rgba(var(--accent-rgb),0.15)',
            borderRadius: '12px 12px 12px 3px', padding: '10px 14px',
            fontSize: 13, color: '#7e7e8c',
          }}>Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer — fixed directly above the bottom nav so it stays reachable
          regardless of how short the conversation is. */}
      <div style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: `calc(${NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: '#0a0a0f',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 16px',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--accent-rgb),0.12)',
          borderRadius: 12, padding: '10px 12px',
        }}>
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          // Enter sends; Shift+Enter inserts a newline.
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about your bookmarks..."
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            color: '#f0f0f5', fontSize: 13, fontFamily: "'Inter', sans-serif",
            lineHeight: `${LINE_HEIGHT}px`,
            resize: 'none',
            maxHeight: LINE_HEIGHT * MAX_LINES,
            padding: 0,
          }}
        />
        </div>
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            width: 28, height: 28, borderRadius: 7, border: 'none',
            background: input.trim() && !loading ? 'var(--accent-cyan)' : 'rgba(var(--accent-rgb),0.2)',
            color: '#0a0a0f', fontSize: 13, fontWeight: 700,
            cursor: input.trim() && !loading ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >↑</button>
      </div>
    </div>
  );
}
