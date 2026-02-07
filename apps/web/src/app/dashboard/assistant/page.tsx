'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm your bookmark assistant powered by Grok. Ask me anything about your saved bookmarks — search, summarize, find patterns, or get recommendations." },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSending(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Please sign in to use the assistant.' }]);
        setSending(false);
        return;
      }

      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMsg,
          history: messages.slice(-10),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        const err = await res.json().catch(() => ({}));
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: err.error === 'Shared Lists require a Pro plan.'
            ? 'The AI assistant is a Pro feature. Upgrade to unlock it!'
            : `Sorry, something went wrong: ${err.error || 'Unknown error'}`,
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }

    setSending(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>AI Assistant</h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          Ask questions about your bookmarks. Powered by Grok.
        </p>
      </div>

      {/* Chat messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px',
        paddingBottom: '16px',
      }}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(14,165,233,0.1))'
                : 'rgba(30,31,45,0.8)',
              border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
              color: '#e0e0f0',
              fontSize: '14px',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 600, marginBottom: '4px' }}>
                  ✨ HAL
                </div>
              )}
              {msg.content}
            </div>
          </motion.div>
        ))}
        {sending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', justifyContent: 'flex-start' }}
          >
            <div style={{
              padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
              background: 'rgba(30,31,45,0.8)', border: '1px solid rgba(255,255,255,0.05)',
              color: '#8a8a9a', fontSize: '14px',
            }}>
              <span style={{ fontSize: '11px', color: '#00d4ff', fontWeight: 600 }}>✨ HAL</span>
              <br />Thinking...
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: '10px', padding: '16px 0 0',
        borderTop: '1px solid rgba(0,212,255,0.08)',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your bookmarks..."
          style={{
            flex: 1, padding: '12px 16px', borderRadius: '12px',
            border: '1px solid rgba(0,212,255,0.15)', background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none',
          }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '12px 20px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
            fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </motion.button>
      </div>
    </div>
  );
}
