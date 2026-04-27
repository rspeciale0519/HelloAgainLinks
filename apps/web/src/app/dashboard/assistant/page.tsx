'use client';

import { useState, useRef, useEffect, useCallback, Suspense, type CSSProperties } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authFetch } from '@/lib/auth-fetch';
import { HalGhostButton, HalPrimaryButton } from '@/components/hal/PageShell';

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
    "I have your archive indexed. Ask me to search, summarize, find patterns, or surface forgotten posts. The Signal rail on the bookmarks page hosts the same conversation with citations linked into the feed.",
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
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-grow the textarea up to ~10 visual lines, then scroll internally.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const max = 10 * 22 + 24; // ~10 lines @ 22px line-height + padding
    ta.style.height = `${Math.min(ta.scrollHeight, max)}px`;
  }, [input]);

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
        ? 'The AI assistant is a Pro feature. Upgrade to unlock it.'
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: 880,
        margin: '0 auto',
        padding: '32px 28px 16px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          paddingBottom: 18,
          marginBottom: 18,
          borderBottom: '1px solid var(--hal-line-1)',
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              letterSpacing: '0.18em',
              color: 'var(--hal-text-3)',
              marginBottom: 6,
            }}
          >
            DASHBOARD · ASSISTANT
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: 'var(--hal-text-0)',
              fontFamily: 'var(--hal-sans)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            HAL
            <span
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 13,
                color: 'var(--hal-a)',
                marginLeft: 10,
                letterSpacing: '0.08em',
              }}
            >
              · GROK
            </span>
          </h1>
        </div>
        <HalGhostButton onClick={openInSignalRail}>
          OPEN IN SIGNAL RAIL ↗
        </HalGhostButton>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          paddingBottom: 16,
        }}
      >
        {loadingHistory && (
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--hal-text-3)',
              padding: '12px 0',
            }}
          >
            HYDRATING…
          </div>
        )}
        {messages.map((msg) => (
          <MessageRow key={msg.key} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          padding: '14px 0 0',
          borderTop: '1px solid var(--hal-line-1)',
          flexShrink: 0,
        }}
      >
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask HAL about your bookmarks…"
          disabled={sending}
          rows={1}
          style={inputStyle}
        />
        <HalPrimaryButton
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{ alignSelf: 'flex-end', height: 38 }}
        >
          {sending ? 'SENDING…' : 'SEND'}
        </HalPrimaryButton>
      </div>
    </div>
  );
}

function MessageRow({ msg }: { msg: AssistantMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '78%',
          minWidth: 0,
          padding: '12px 14px',
          background: isUser ? 'var(--hal-a-dim)' : 'var(--hal-bg-1)',
          border: `1px solid ${isUser ? 'rgba(var(--hal-a-rgb), 0.25)' : 'var(--hal-line-1)'}`,
          borderLeft: !isUser ? '2px solid var(--hal-a)' : undefined,
          borderRadius: 4,
          color: msg.error ? '#ef4444' : 'var(--hal-text-0)',
          fontSize: 14,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {!isUser && (
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 9,
              letterSpacing: '0.18em',
              color: 'var(--hal-a)',
              marginBottom: 6,
            }}
          >
            HAL
          </div>
        )}
        {msg.error ? `ERROR · ${msg.error}` : msg.content || (msg.streaming ? '…' : '')}
        {msg.streaming && !msg.error && (
          <span
            style={{
              display: 'inline-block',
              width: 7,
              height: 14,
              marginLeft: 4,
              background: 'var(--hal-a)',
              animation: 'hal-blink 1s step-end infinite',
              verticalAlign: 'text-bottom',
            }}
          />
        )}
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '10px 12px',
  background: 'var(--hal-bg-2)',
  color: 'var(--hal-text-0)',
  border: '1px solid var(--hal-line-1)',
  borderRadius: 3,
  fontSize: 14,
  fontFamily: 'var(--hal-sans)',
  lineHeight: 1.45,
  outline: 'none',
  resize: 'none',
  maxHeight: 244,
  overflowY: 'auto',
};

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: '32px 28px',
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--hal-text-3)',
          }}
        >
          LOADING…
        </div>
      }
    >
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
