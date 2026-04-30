'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch, authPost } from '@/lib/auth-fetch';
import {
  PageShell,
  SectionLabel,
  HalInput,
  HalPanel,
  HalPrimaryButton,
  HalGhostButton,
} from '@/components/hal/PageShell';

interface SharedList {
  id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'private' | string;
  invite_code: string;
  bookmark_count: number;
  member_count: number;
  created_at: string;
  userRole: string;
}

const VISIBILITY_OPTIONS: Array<{ value: 'private' | 'public'; label: string }> = [
  { value: 'private', label: 'PRIVATE' },
  { value: 'public', label: 'PUBLIC' },
];

export default function SharedListsPage() {
  const [lists, setLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState<'private' | 'public'>('private');
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchLists = useCallback(async () => {
    const res = await authFetch('/api/shared-lists');
    if (!res) {
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setLists(data.lists || []);
    } else {
      setError('Failed to load shared lists. Please refresh.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    const res = await authPost('/api/shared-lists', {
      name: newName,
      description: newDesc,
      visibility: newVisibility,
    });
    if (!res) {
      setCreating(false);
      return;
    }
    if (res.ok) {
      setNewName('');
      setNewDesc('');
      setNewVisibility('private');
      setShowCreate(false);
      await fetchLists();
    } else {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError(data.error || 'Shared Lists require a Pro plan. Upgrade in Settings.');
      } else {
        setError(data.error || 'Failed to create list. Please try again.');
      }
    }
    setCreating(false);
  };

  const copyInvite = (list: SharedList) => {
    const url = `${window.location.origin}/lists/join/${list.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(list.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <PageShell
      eyebrow="DASHBOARD · SHARED LISTS"
      title="Shared Lists"
      subtitle="Curate bookmark collections with collaborators. Each list has its own membership and invite link."
      action={
        <HalPrimaryButton onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'CANCEL' : '+ NEW LIST'}
        </HalPrimaryButton>
      }
    >
      {error && (
        <div
          style={{
            marginTop: 8,
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 3,
            fontSize: 12,
            color: '#ef4444',
            fontFamily: 'var(--hal-mono)',
            letterSpacing: '0.04em',
          }}
        >
          ERROR · {error}
        </div>
      )}

      {showCreate && (
        <HalPanel accent style={{ marginTop: 18, padding: 18 }}>
          <SectionLabel>NEW LIST</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <HalInput
              value={newName}
              onChange={setNewName}
              placeholder="List name"
            />
            <HalInput
              value={newDesc}
              onChange={setNewDesc}
              placeholder="Description (optional)"
            />
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--hal-mono)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  color: 'var(--hal-text-3)',
                  marginRight: 6,
                }}
              >
                VISIBILITY
              </span>
              {VISIBILITY_OPTIONS.map((opt) => {
                const active = newVisibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewVisibility(opt.value)}
                    style={{
                      padding: '4px 10px',
                      background: active ? 'var(--hal-a-dim)' : 'transparent',
                      border: `1px solid ${active ? 'var(--hal-a)' : 'var(--hal-line-2)'}`,
                      borderRadius: 2,
                      fontFamily: 'var(--hal-mono)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: active ? 'var(--hal-a)' : 'var(--hal-text-2)',
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}
            >
              <HalGhostButton onClick={() => setShowCreate(false)}>
                CANCEL
              </HalGhostButton>
              <HalPrimaryButton
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? 'CREATING…' : 'CREATE LIST'}
              </HalPrimaryButton>
            </div>
          </div>
        </HalPanel>
      )}

      <SectionLabel count={loading ? '…' : lists.length}>ACTIVE LISTS</SectionLabel>

      {loading ? (
        <div
          style={{
            padding: '36px 0',
            textAlign: 'center',
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            color: 'var(--hal-text-3)',
          }}
        >
          QUERYING…
        </div>
      ) : lists.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lists.map((list) => (
            <ListRow
              key={list.id}
              list={list}
              copied={copiedId === list.id}
              onCopy={() => copyInvite(list)}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function ListRow({
  list,
  copied,
  onCopy,
}: {
  list: SharedList;
  copied: boolean;
  onCopy: () => void;
}) {
  const isPublic = list.visibility === 'public';
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 16,
        padding: '16px 20px',
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-1)',
        borderRadius: 4,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--hal-text-0)',
              fontFamily: 'var(--hal-sans)',
              letterSpacing: '-0.01em',
            }}
          >
            {list.name}
          </span>
          <Badge active={isPublic}>{isPublic ? 'PUBLIC' : 'PRIVATE'}</Badge>
          <Badge muted>{list.userRole.toUpperCase()}</Badge>
        </div>
        {list.description && (
          <div style={{ fontSize: 13, color: 'var(--hal-text-2)', marginBottom: 8 }}>
            {list.description}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            gap: 18,
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'var(--hal-text-3)',
          }}
        >
          <span>{list.bookmark_count} BOOKMARKS</span>
          <span>{list.member_count} MEMBERS</span>
        </div>
      </div>
      <HalGhostButton onClick={onCopy}>
        {copied ? '✓ COPIED' : 'COPY INVITE'}
      </HalGhostButton>
    </div>
  );
}

function Badge({
  children,
  active,
  muted,
}: {
  children: React.ReactNode;
  active?: boolean;
  muted?: boolean;
}) {
  const fg = muted ? 'var(--hal-text-3)' : active ? 'var(--hal-a)' : 'var(--hal-text-2)';
  const bg = muted
    ? 'transparent'
    : active
      ? 'var(--hal-a-dim)'
      : 'var(--hal-bg-2)';
  const border = muted
    ? 'var(--hal-line-1)'
    : active
      ? 'rgba(var(--hal-a-rgb), 0.25)'
      : 'var(--hal-line-1)';
  return (
    <span
      style={{
        padding: '2px 7px',
        fontFamily: 'var(--hal-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        color: fg,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 2,
      }}
    >
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <HalPanel>
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--hal-text-3)',
          marginBottom: 8,
        }}
      >
        NO SHARED LISTS YET
      </div>
      <div style={{ fontSize: 13, color: 'var(--hal-text-1)', lineHeight: 1.55 }}>
        Create a list and share its invite link. Members see and contribute to a
        common pool of bookmarks separate from their personal archive.
      </div>
    </HalPanel>
  );
}
