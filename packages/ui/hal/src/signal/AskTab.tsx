// packages/ui/hal/src/signal/AskTab.tsx
'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Icon } from '../primitives/Icon';
import { Msg, type MsgItem } from './Msg';
import type { CitationBookmark } from './Citations';
import { AskSuggestions, AskLocked } from './AskSuggestions';
import { consumeSseStream } from './sse-consumer';

/**
 * Auth-aware fetch injected by the host app. Returns null when there is no
 * active session. Mirrors apps/web/src/lib/auth-fetch.ts.
 */
export type AuthFetch = (path: string, init?: RequestInit) => Promise<Response | null>;

export interface AskTabProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  isProUser: boolean;
  authFetch: AuthFetch;
  /** Lookup populated by the host page from its current feed pagination. */
  bookmarkLookup: Record<string, CitationBookmark>;
  /** Pipe cited ids into the host's feed view. When omitted, no pin pill renders. */
  onPinToFeed?: (bookmarkIds: string[]) => void;
}

const GREETING: MsgItem = {
  key: 'greeting',
  role: 'assistant',
  text: 'Archive online. Ask me anything about your bookmarks — I can search, summarize, find patterns, and cite specific saves.',
};

export function AskTab({
  conversationId,
  onConversationCreated,
  isProUser,
  authFetch,
  bookmarkLookup,
  onPinToFeed,
}: AskTabProps) {
  const [messages, setMessages] = useState<MsgItem[]>([GREETING]);
  // Citations hydrated from the SSE 'done' event + conversation history.
  // This covers bookmarks the user hasn't paginated to in the feed yet, so
  // chips render reliably regardless of which page the feed is on.
  const [citationLookup, setCitationLookup] = useState<Record<string, CitationBookmark>>({});
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Tracks ids that were minted locally via `send()`. We must NOT re-hydrate
  // from /api/conversations/[id] for those ids — the in-memory state already
  // contains the optimistic user message + the in-flight streaming assistant
  // bubble, and refetching would wipe both for a fraction of a second.
  const localIds = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate from /api/conversations/[id] when the id changes (or resets).
  useEffect(() => {
    if (!conversationId) {
      setMessages([GREETING]);
      setCitationLookup({});
      return;
    }
    if (localIds.current.has(conversationId)) {
      // Locally created — skip the hydration round-trip.
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    (async () => {
      const res = await authFetch(`/api/conversations/${conversationId}`);
      if (!res || cancelled) return;
      if (!res.ok) {
        setLoadingHistory(false);
        return;
      }
      const data = (await res.json()) as {
        messages: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: string;
          cited_bookmark_ids: string[] | null;
        }>;
        cited_bookmarks?: CitationBookmark[];
      };
      if (cancelled) return;
      setMessages(
        data.messages.length === 0
          ? [GREETING]
          : data.messages.map((m) => ({
              key: m.id,
              role: m.role,
              text: m.content,
              citedIds: m.cited_bookmark_ids ?? [],
            })),
      );
      const next: Record<string, CitationBookmark> = {};
      for (const bm of data.cited_bookmarks ?? []) next[bm.id] = bm;
      setCitationLookup(next);
      setLoadingHistory(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, authFetch]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Merge feed-page lookup with citation-hydrated lookup. Citation-hydrated
  // wins when both have an entry — the server-side citation hydration fetches
  // x_post_id which the chip needs, while the feed-page lookup may not.
  const mergedLookup = useMemo(() => {
    return { ...bookmarkLookup, ...citationLookup };
  }, [bookmarkLookup, citationLookup]);

  const finalizeWithError = (key: string, errMsg: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.key === key ? { ...m, streaming: false, error: errMsg } : m)),
    );
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || sending || !isProUser) return;

    const userKey = `local-user-${Date.now()}`;
    const assistantKey = `local-asst-${Date.now()}`;
    setMessages((prev) => [
      ...prev.filter((m) => m.key !== 'greeting' || prev.length === 1),
      { key: userKey, role: 'user', text },
      { key: assistantKey, role: 'assistant', text: '', streaming: true, citedIds: [] },
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
      if (!createRes || !createRes.ok) {
        finalizeWithError(assistantKey, 'Failed to create conversation');
        setSending(false);
        return;
      }
      const created = (await createRes.json()) as { conversation: { id: string } };
      activeId = created.conversation.id;
      localIds.current.add(activeId);
      onConversationCreated(activeId);
    }

    const streamRes = await authFetch(`/api/conversations/${activeId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });

    if (!streamRes) {
      finalizeWithError(assistantKey, 'No active session');
      setSending(false);
      return;
    }
    if (!streamRes.ok) {
      const err = await streamRes.json().catch(() => ({}));
      finalizeWithError(assistantKey, (err as { error?: string }).error ?? `HTTP ${streamRes.status}`);
      setSending(false);
      return;
    }
    if (!streamRes.body) {
      finalizeWithError(assistantKey, 'Empty stream body');
      setSending(false);
      return;
    }

    await consumeSseStream(streamRes.body, (event) => {
      if (event.type === 'chunk') {
        setMessages((prev) =>
          prev.map((m) =>
            m.key === assistantKey ? { ...m, text: m.text + event.text } : m,
          ),
        );
      } else if (event.type === 'done') {
        setMessages((prev) =>
          prev.map((m) =>
            m.key === assistantKey
              ? {
                  ...m,
                  key: event.message_id,
                  text: event.content,
                  citedIds: event.cited_bookmark_ids,
                  streaming: false,
                }
              : m,
          ),
        );
        const incoming = event.cited_bookmarks ?? [];
        if (incoming.length > 0) {
          setCitationLookup((prev) => {
            const next = { ...prev };
            for (const bm of incoming) next[bm.id] = bm;
            return next;
          });
        }
      } else if (event.type === 'error') {
        finalizeWithError(assistantKey, event.error);
      }
    });

    setSending(false);
  };

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  if (!isProUser) {
    return <AskLocked />;
  }

  return (
    <>
      <div style={contentStyle}>
        {loadingHistory ? (
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 11,
              color: 'var(--hal-text-3)',
              letterSpacing: '0.1em',
            }}
          >
            LOADING…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m) => (
              <Msg
                key={m.key}
                m={m}
                bookmarkLookup={mergedLookup}
                onPinToFeed={onPinToFeed}
              />
            ))}
            {messages.length <= 1 && !sending && <AskSuggestions onPick={send} />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: '1px solid var(--hal-line-1)',
          flexShrink: 0,
        }}
      >
        <div style={inputWrapStyle}>
          <Icon name="send" size={13} style={{ color: 'var(--hal-a)', flexShrink: 0 }} />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Ask the archive…"
            disabled={sending}
            style={inputStyle}
            aria-label="Ask HAL"
          />
          <span style={kbdStyle}>↵</span>
        </div>
      </div>
    </>
  );
}

const contentStyle: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '14px 16px',
};

const inputWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  background: 'var(--hal-bg-2)',
  border: '1px solid var(--hal-line-1)',
  borderRadius: 4,
  transition: 'border-color 0.1s',
};

const inputStyle: CSSProperties = {
  flex: 1,
  fontSize: 13,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--hal-text-0)',
  fontFamily: 'var(--hal-sans)',
};

const kbdStyle: CSSProperties = {
  fontFamily: 'var(--hal-mono)',
  fontSize: 10,
  color: 'var(--hal-text-3)',
  border: '1px solid var(--hal-line-1)',
  padding: '1px 5px',
  borderRadius: 2,
};
