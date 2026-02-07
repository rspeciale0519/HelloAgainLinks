'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  bookmarks?: { author: string; content: string; tags: string[] }[];
  timestamp: Date;
}

const suggestedPrompts = [
  'Find my most saved topics',
  'Summarize my bookmarks from this week',
  'Show bookmarks about AI',
  'Tag all startup bookmarks as "venture"',
  'Find posts similar to my distributed systems saves',
];

const mockConversation: Message[] = [
  {
    id: '1',
    role: 'user',
    content: 'Show me everything about AI from this week',
    timestamp: new Date(Date.now() - 300000),
  },
  {
    id: '2',
    role: 'assistant',
    content: 'I found 8 bookmarks about AI from the past week. Here are the top results:',
    bookmarks: [
      { author: '@karpathy', content: 'New insights on training large language models efficiently with less compute...', tags: ['AI', 'LLMs'] },
      { author: '@ylecun', content: 'Why autoregressive models are not enough for true understanding — a thread...', tags: ['AI', 'Research'] },
      { author: '@elonmusk', content: 'Grok 3 is now the most capable AI system. Here\'s what makes it different...', tags: ['AI', 'xAI'] },
    ],
    timestamp: new Date(Date.now() - 290000),
  },
  {
    id: '3',
    role: 'user',
    content: 'Tag all of those as "machine-learning"',
    timestamp: new Date(Date.now() - 200000),
  },
  {
    id: '4',
    role: 'assistant',
    content: '✅ Done! I\'ve added the tag **"machine-learning"** to all 8 AI bookmarks from this week. Want me to create a folder for them too?',
    timestamp: new Date(Date.now() - 195000),
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>(mockConversation);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getResponse(text),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, reply]);
    }, 1500 + Math.random() * 1000);
  };

  const getResponse = (q: string): string => {
    const lower = q.toLowerCase();
    if (lower.includes('most saved') || lower.includes('top topics'))
      return '📊 Your most saved topics this month:\n\n1. **AI/ML** — 47 bookmarks\n2. **Startups** — 31 bookmarks\n3. **Web Dev** — 28 bookmarks\n4. **Crypto/DeFi** — 19 bookmarks\n5. **Philosophy** — 12 bookmarks\n\nWant me to create smart folders for any of these?';
    if (lower.includes('summarize'))
      return '📝 **This week\'s bookmark summary:**\n\nYou saved 23 posts across 6 topics. AI dominated with 9 saves — mostly around LLM training advances. You also saved 5 startup fundraising threads and 4 posts about React Server Components.\n\nNotable thread: @naval\'s 12-part series on building wealth through leverage.';
    if (lower.includes('similar') || lower.includes('find'))
      return '🔍 Found 5 posts similar to your distributed systems bookmarks that you haven\'t saved yet:\n\n• @martinkl — "Designing Data-Intensive Applications, updated chapter on CRDTs"\n• @aphyr — "New Jepsen analysis of TigerBeetle database"\n• @b0rk — "How DNS actually works — the full picture"\n\nWant me to save any of these?';
    if (lower.includes('tag'))
      return '✅ Done! Tags have been updated. I applied the changes to all matching bookmarks.';
    if (lower.includes('folder') || lower.includes('create'))
      return '📁 Created! The new folder is ready and I\'ve moved the relevant bookmarks into it.';
    return '🤖 I can help you search, organize, and discover bookmarks. Try asking me to find bookmarks about a topic, tag them, or discover similar posts!';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>✨</span> AI Assistant
        </h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          Chat with your bookmark library. Ask questions, organize, and discover.
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '14px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(14,165,233,0.1))'
                    : 'rgba(20,20,30,0.8)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.2)' : 'rgba(0,212,255,0.08)'}`,
                  boxShadow: msg.role === 'assistant' ? '0 0 20px rgba(0,212,255,0.05)' : 'none',
                  color: '#e0e0ea',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
                {msg.bookmarks && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {msg.bookmarks.map((bm, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(0,212,255,0.04)',
                          border: '1px solid rgba(0,212,255,0.1)',
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#00d4ff', marginBottom: '4px' }}>
                          {bm.author}
                        </div>
                        <div style={{ fontSize: '13px', color: '#8a8a9a' }}>{bm.content}</div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                          {bm.tags.map((t) => (
                            <span key={t} style={{ padding: '2px 8px', borderRadius: '100px', fontSize: '10px', color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.15)' }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ display: 'flex', justifyContent: 'flex-start' }}
            >
              <div style={{
                padding: '14px 20px',
                borderRadius: '18px 18px 18px 4px',
                background: 'rgba(20,20,30,0.8)',
                border: '1px solid rgba(0,212,255,0.08)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#00d4ff',
                      boxShadow: '0 0 6px rgba(0,212,255,0.4)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {suggestedPrompts.slice(0, 3).map((prompt) => (
          <motion.button
            key={prompt}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => sendMessage(prompt)}
            style={{
              padding: '8px 14px',
              borderRadius: '100px',
              fontSize: '12px',
              color: '#00d4ff',
              background: 'rgba(0,212,255,0.06)',
              border: '1px solid rgba(0,212,255,0.12)',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.2s',
            }}
          >
            {prompt}
          </motion.button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{
        display: 'flex',
        gap: '10px',
        padding: '12px 16px',
        borderRadius: '16px',
        background: 'rgba(15,15,25,0.9)',
        border: '1px solid rgba(0,212,255,0.1)',
        alignItems: 'center',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder="Ask about your bookmarks..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#e0e0ea',
            fontSize: '14px',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        {/* Mic placeholder */}
        <button style={{ background: 'none', border: 'none', color: '#4a4a5a', fontSize: '18px', cursor: 'pointer', padding: '4px' }}>
          🎙️
        </button>
        {/* Send */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => sendMessage(input)}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            background: input.trim() ? 'linear-gradient(135deg, #00d4ff, #0ea5e9)' : 'rgba(0,212,255,0.1)',
            border: 'none',
            color: input.trim() ? '#0a0a0f' : '#4a4a5a',
            fontSize: '13px',
            fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'default',
            fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s',
          }}
        >
          Send
        </motion.button>
      </div>
    </div>
  );
}
