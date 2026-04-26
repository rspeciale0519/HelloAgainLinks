'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';

interface AssistantMessage {
  /** Stable client-side key — db id when persisted, otherwise a temp local id. */
  key: string;
  role: 'user' | 'assistant';
  content: string;
  /** True while the assistant message is still streaming. */
  streaming?: boolean;
  /** Surface upstream stream errors inline. */
  error?: string | null;
  citedIds?: string[];
}

const GREETING: AssistantMessage = {
  key: 'greeting',
  role: 'assistant',
  content:
    "Hey! I'm your bookmark assistant powered by Grok. Ask me anything about your saved bookmarks — search, summarize, find patterns, or get recommendations.",
};

interface SseDoneEvent {
  type: 'done';
  message_id: string;
  cited_bookmark_ids: string[];
  content: string;
}
interface SseChunkEvent {
  type: 'chunk';
  text: string;
}
interface SseErrorEvent {
  type: 'error';
  error: string;
}
type SseEvent = SseChunkEvent | SseDoneEvent | SseErrorEvent;

function AssistantPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get('conversation');

  const [conversationId, setConversationId] = useState<string | null>(conversationParam);
  const [messages, setMessages] = useState<AssistantMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate when ?conversation=<id> changes (incl. on first load).
  useEffect(() => {
    setConversationId(conversationParam);
  }, [conversationParam]);

  useEffect(() => {
    if (!conversationId) {
      setMessages([GREETING]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      const res = await authFetch(`/api/conversations/${conversationId}`);
      if (!res || cancelled) return;
      if (!res.ok) {
        setLoadingHistory(false);
        setMessages([
          {
            key: 'load-err',
            role: 'assistant',
            content: 'Could not load that conversation.',
            error: `HTTP ${res.status}`,
          },
        ]);
        return;
      }
      const data = (await res.json()) as {
        messages: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          cited_bookmark_ids: string[] | null;
        }>;
      };
      if (cancelled) return;
      setMessages(
        data.messages.length === 0
          ? [GREETING]
          : data.messages.map((m) => ({
              key: m.id,
              role: m.role,
              content: m.content,
              citedIds: m.cited_bookmark_ids ?? [],
            })),
      );
      setLoadingHistory(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const finalizeWithError = useCallback((key: string, errMsg: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.key === key ? { ...m, streaming: false, error: errMsg } : m)),
    );
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userKey = `local-user-${Date.now()}`;
    const assistantKey = `local-asst-${Date.now()}`;
    setMessages((prev) => [
      ...prev.filter((m) => m.key !== 'greeting' || prev.length === 1),
      { key: userKey, role: 'user', content: text },
      { key: assistantKey, role: 'assistant', content: '', streaming: true, citedIds: [] },
    ]);
    setInput('');
    setSending(true);

    let activeId = conversationId;
    if (!activeId) {
      const createRes = await authFetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!createRes) {
        finalizeWithError(assistantKey, 'Please sign in to use the assistant.');
        setSending(false);
        return;
      }
      if (!createRes.ok) {
        finalizeWithError(assistantKey, `Failed to create conversation (${createRes.status})`);
        setSending(false);
        return;
      }
      const created = (await createRes.json()) as { conversation: { id: string } };
      activeId = created.conversation.id;
      setConversationId(activeId);
      // Reflect in URL so refreshes resume the same thread.
      router.replace(`/dashboard/assistant?conversation=${activeId}`);
    }

    const streamRes = await authFetch(`/api/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    if (!streamRes) {
      finalizeWithError(assistantKey, 'Please sign in to use the assistant.');
      setSending(false);
      return;
    }
    if (!streamRes.ok) {
      const err = await streamRes.json().catch(() => ({}));
      const errBody = err as { error?: string; code?: string };
      const friendly = errBody.code === 'plan_required'
        ? 'The AI assistant is a Pro feature. Upgrade to unlock it!'
        : errBody.error ?? `HTTP ${streamRes.status}`;
      finalizeWithError(assistantKey, friendly);
      setSending(false);
      return;
    }
    if (!streamRes.body) {
      finalizeWithError(assistantKey, 'Empty stream body');
      setSending(false);
      return;
    }
    await consumeSse(streamRes.body, (event) => {
      if (event.type === 'chunk') {
        setMessages((prev) =>
          prev.map((m) =>
            m.key === assistantKey ? { ...m, content: m.content + event.text } : m,
          ),
        );
      } else if (event.type === 'done') {
        setMessages((prev) =>
          prev.map((m) =>
            m.key === assistantKey
              ? {
                  ...m,
                  key: event.message_id,
                  content: event.content,
                  citedIds: event.cited_bookmark_ids,
                  streaming: false,
                }
              : m,
          ),
        );
      } else if (event.type === 'error') {
        finalizeWithError(assistantKey, event.error);
      }
    });

    setSending(false);
  };

  const openInSignalRail = () => {
    if (!conversationId) {
      router.push('/dashboard/bookmarks');
      return;
    }
    router.push(`/dashboard/bookmarks?conversation=${conversationId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: '#f0f0f5', marginBottom: 4 }}>
            AI Assistant
          </h1>
          <p style={{ color: '#8a8a9a', fontSize: 14 }}>
            Ask questions about your bookmarks. Powered by Grok.
          </p>
        </div>
        <button
          type="button"
          onClick={openInSignalRail}
          style={{
            padding: '8px 14px',
            borderRadius: 10,
            border: '1px solid rgba(0,212,255,0.25)',
            background: 'rgba(0,212,255,0.08)',
            color: '#00d4ff',
            fontSize: 12,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
          }}
        >
          Open in Signal rail ↗
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingBottom: 16,
        }}
      >
        {loadingHistory && (
          <div style={{ color: '#8a8a9a', fontSize: 13 }}>Loading conversation…</div>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius:
                  msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(14,165,233,0.1))'
                    : 'rgba(30,31,45,0.8)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                color: msg.error ? '#ef4444' : '#e0e0f0',
                fontSize: 14,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{ fontSize: 11, color: '#00d4ff', fontWeight: 600, marginBottom: 4 }}>
                  ✨ HAL
                </div>
              )}
              {msg.error ? `Error: ${msg.error}` : msg.content || (msg.streaming ? '…' : '')}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '16px 0 0',
          borderTop: '1px solid rgba(0,212,255,0.08)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about your bookmarks..."
          disabled={sending}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(0,212,255,0.15)',
            background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5',
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
            outline: 'none',
          }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            color: '#0a0a0f',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            opacity: sending || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </motion.button>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div style={{ color: '#8a8a9a', fontSize: 13 }}>Loading…</div>}>
      <AssistantPageInner />
    </Suspense>
  );
}

async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: SseEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx;
    while ((sepIdx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + 2);
      const dataLines = rawEvent
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim());
      for (const data of dataLines) {
        if (!data || data === '[DONE]') continue;
        try {
          onEvent(JSON.parse(data) as SseEvent);
        } catch {
          // Ignore malformed events.
        }
      }
    }
  }
}
