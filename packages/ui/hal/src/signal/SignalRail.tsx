// packages/ui/hal/src/signal/SignalRail.tsx
'use client';

import { useState, type CSSProperties } from 'react';
import { Icon } from '../primitives/Icon';
import { AskTab, type AuthFetch } from './AskTab';
import { ThreadsTab } from './ThreadsTab';
import { RelatedTab } from './RelatedTab';
import type { CitationBookmark } from './Citations';

export type SignalTab = 'ask' | 'related' | 'threads';

export interface SignalRailProps {
  isProUser: boolean;
  totalBookmarks: number;
  activeBookmarkId: string | null;
  /** Open a single bookmark — used by Related tab. Phase 5 will swap to a Spread modal. */
  onJumpTo: (bookmarkId: string) => void;
  /**
   * Pin a set of cited bookmarks into the host's feed view. Used by Ask tab's
   * "VIEW N IN FEED" pill. When omitted, the pill is hidden.
   */
  onPinCitations?: (bookmarkIds: string[]) => void;
  bookmarkLookup: Record<string, CitationBookmark>;
  authFetch: AuthFetch;
  onClose?: () => void;
  /** Optional: preselect a conversation when opening (e.g. via ?conversation=). */
  initialConversationId?: string | null;
  /** Optional: preselect a tab. Defaults to 'ask'. */
  initialTab?: SignalTab;
}

const TABS: { id: SignalTab; label: string }[] = [
  { id: 'ask', label: 'Ask' },
  { id: 'related', label: 'Related' },
  { id: 'threads', label: 'Threads' },
];

export function SignalRail({
  isProUser,
  totalBookmarks,
  activeBookmarkId,
  onJumpTo,
  onPinCitations,
  bookmarkLookup,
  authFetch,
  onClose,
  initialConversationId = null,
  initialTab = 'ask',
}: SignalRailProps) {
  const [tab, setTab] = useState<SignalTab>(initialTab);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId,
  );
  const [threadsRefreshKey, setThreadsRefreshKey] = useState(0);

  const handleConversationCreated = (id: string) => {
    setConversationId(id);
    setThreadsRefreshKey((k) => k + 1);
  };

  const handleSelectConversation = (id: string) => {
    setConversationId(id);
    setTab('ask');
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setTab('ask');
  };

  return (
    <aside
      style={{
        width: 340,
        flexShrink: 0,
        borderLeft: '1px solid var(--hal-line-1)',
        background: 'var(--hal-bg-1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--hal-sans)',
        height: '100%',
        minHeight: 'calc(100vh - 56px)',
      }}
    >
      <header style={headerStyle}>
        <div style={glyphStyle} aria-hidden>
          <Icon name="sparkle" size={12} stroke={2} />
          <span style={pulseDotStyle} className="hal-pulse-dot" />
        </div>
        <div style={{ flex: 1, lineHeight: 1.1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--hal-text-0)' }}>
            HAL
          </div>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 9,
              color: 'var(--hal-a)',
              letterSpacing: '0.1em',
            }}
          >
            ONLINE · {totalBookmarks} docs indexed
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Signal"
            style={{
              color: 'var(--hal-text-3)',
              padding: 4,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </header>

      <nav style={tabsStyle} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 12px',
              fontSize: 12,
              color: tab === t.id ? 'var(--hal-text-0)' : 'var(--hal-text-2)',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: `1px solid ${tab === t.id ? 'var(--hal-a)' : 'transparent'}`,
              background: 'transparent',
              marginBottom: -1,
              cursor: 'pointer',
              fontFamily: 'var(--hal-sans)',
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'ask' && (
        <AskTab
          conversationId={conversationId}
          onConversationCreated={handleConversationCreated}
          isProUser={isProUser}
          authFetch={authFetch}
          bookmarkLookup={bookmarkLookup}
          onPinToFeed={onPinCitations}
        />
      )}

      {tab === 'related' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <RelatedTab
            activeBookmarkId={activeBookmarkId}
            onJumpTo={onJumpTo}
            bookmarkLookup={bookmarkLookup}
            authFetch={authFetch}
          />
        </div>
      )}

      {tab === 'threads' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          <ThreadsTab
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            authFetch={authFetch}
            refreshKey={threadsRefreshKey}
          />
        </div>
      )}
    </aside>
  );
}

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '12px 16px',
  borderBottom: '1px solid var(--hal-line-1)',
  flexShrink: 0,
};

const glyphStyle: CSSProperties = {
  width: 22,
  height: 22,
  background: 'var(--hal-a)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--hal-bg-0)',
  position: 'relative',
};

const pulseDotStyle: CSSProperties = {
  position: 'absolute',
  top: -3,
  right: -3,
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: 'var(--hal-a)',
  boxShadow: '0 0 8px var(--hal-a-glow)',
};

const tabsStyle: CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--hal-line-1)',
  padding: '0 8px',
  flexShrink: 0,
};
