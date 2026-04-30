'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { authFetch, authPost } from '@/lib/auth-fetch';
import {
  PageShell,
  SectionLabel,
  HalInput,
  HalPrimaryButton,
} from '@/components/hal/PageShell';

interface Tag {
  id: string;
  name: string;
  bookmark_count?: number;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    const res = await authFetch('/api/tags');
    if (res?.ok) {
      const data = await res.json();
      setTags(data.tags || data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleCreate = async () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    const res = await authPost('/api/tags', { name: trimmed });
    if (res?.ok) {
      setNewTag('');
      await fetchTags();
    } else if (res) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Failed to create tag.');
    }
    setCreating(false);
  };

  const handleDelete = async (tagId: string) => {
    await authFetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    setTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  return (
    <PageShell
      eyebrow="DASHBOARD · TAGS"
      title="Tags"
      subtitle="Organize bookmarks with manual tags. Pro plans also receive AI auto-tags on every save."
    >
      <SectionLabel>NEW TAG</SectionLabel>
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          maxWidth: 460,
        }}
      >
        <HalInput
          value={newTag}
          onChange={setNewTag}
          placeholder="e.g. ai-tools"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          style={{ flex: 1 }}
        />
        <HalPrimaryButton
          onClick={handleCreate}
          disabled={creating || !newTag.trim()}
        >
          {creating ? 'CREATING…' : 'ADD'}
        </HalPrimaryButton>
      </div>
      {error && (
        <div
          style={{
            marginTop: 10,
            fontFamily: 'var(--hal-mono)',
            fontSize: 11,
            color: '#ef4444',
            letterSpacing: '0.04em',
          }}
        >
          ERROR · {error}
        </div>
      )}

      <SectionLabel count={loading ? '…' : tags.length}>ALL TAGS</SectionLabel>

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
      ) : tags.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          {tags.map((tag) => (
            <TagPill key={tag.id} tag={tag} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function TagPill({ tag, onDelete }: { tag: Tag; onDelete: (id: string) => void }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 4px 5px 10px',
        fontFamily: 'var(--hal-mono)',
        fontSize: 11,
        background: 'var(--hal-a-dim)',
        border: '1px solid rgba(var(--hal-a-rgb), 0.25)',
        borderRadius: 2,
        letterSpacing: '0.02em',
      }}
    >
      <Link
        href={`/dashboard/bookmarks?tag=${encodeURIComponent(tag.name)}`}
        style={{
          color: 'var(--hal-a)',
          textDecoration: 'none',
        }}
      >
        #{tag.name}
        {typeof tag.bookmark_count === 'number' && tag.bookmark_count > 0 && (
          <span style={{ marginLeft: 6, color: 'var(--hal-text-3)' }}>
            {tag.bookmark_count}
          </span>
        )}
      </Link>
      <button
        type="button"
        onClick={() => onDelete(tag.id)}
        title={`Delete ${tag.name}`}
        style={{
          width: 16,
          height: 16,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--hal-text-3)',
          cursor: 'pointer',
          fontSize: 13,
          lineHeight: 1,
          fontFamily: 'var(--hal-mono)',
          transition: 'color 0.1s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--hal-text-3)';
        }}
      >
        ×
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-1)',
        borderRadius: 4,
        padding: '28px 22px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--hal-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--hal-text-3)',
          marginBottom: 8,
        }}
      >
        NO TAGS YET
      </div>
      <div style={{ fontSize: 13, color: 'var(--hal-text-1)', lineHeight: 1.55 }}>
        Create a tag above, or upgrade to Pro to receive AI auto-tags on every
        bookmark save.
      </div>
    </div>
  );
}
