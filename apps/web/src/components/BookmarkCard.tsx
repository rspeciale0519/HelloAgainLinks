'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { authFetch, authPost } from '@/lib/auth-fetch';
import { hexToRgba } from '@helloagain/shared';
import TagPopover, { type TagInfo } from './TagPopover';
export type { TagInfo } from './TagPopover';

export interface BookmarkTag {
  tag_id: string;
  tags: TagInfo;
}

export interface BookmarkWithTags {
  id: string;
  x_post_id: string;
  x_author_handle: string;
  x_author_name: string;
  content_text: string;
  media_urls: string[];
  bookmarked_at: string;
  post_created_at?: string;
  bookmark_tags?: BookmarkTag[];
}

interface BookmarkCardProps {
  bookmark: BookmarkWithTags;
  index: number;
  allTags: TagInfo[];
  onTagsChanged: (bookmarkId: string, tags: BookmarkTag[]) => void;
  onDelete?: (bookmarkId: string, xPostId: string) => void;
}


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookmarkCard({ bookmark, index, allTags, onTagsChanged, onDelete }: BookmarkCardProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const currentTags = useMemo(() => bookmark.bookmark_tags ?? [], [bookmark.bookmark_tags]);
  const activeTagIds = useMemo(() => new Set(currentTags.map((bt) => bt.tag_id)), [currentTags]);

  const handleToggleTag = useCallback(async (tagId: string, add: boolean) => {
    const previousTags = [...currentTags];

    if (add) {
      const tagInfo = allTags.find((t) => t.id === tagId);
      if (!tagInfo) return;
      const optimistic = [...currentTags, { tag_id: tagId, tags: tagInfo }];
      onTagsChanged(bookmark.id, optimistic);
    } else {
      const optimistic = currentTags.filter((bt) => bt.tag_id !== tagId);
      onTagsChanged(bookmark.id, optimistic);
    }

    try {
      if (add) {
        const res = await authPost(`/api/bookmarks/${bookmark.id}/tags`, { tag_ids: [tagId] });
        if (!res?.ok) throw new Error('Failed to add tag');
      } else {
        const res = await authFetch(`/api/bookmarks/${bookmark.id}/tags/${tagId}`, { method: 'DELETE' });
        if (!res?.ok) throw new Error('Failed to remove tag');
      }
    } catch {
      onTagsChanged(bookmark.id, previousTags);
    }
  }, [bookmark.id, currentTags, allTags, onTagsChanged]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="glass glow-border"
      style={{
        padding: '16px 20px',
        borderRadius: '12px',
        position: 'relative',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#00d4ff' }}>
          @{bookmark.x_author_handle}
        </span>
        {bookmark.x_author_name && (
          <span style={{ fontSize: '13px', color: '#4a4a5a' }}>{bookmark.x_author_name}</span>
        )}
        <a
          href={`https://x.com/${bookmark.x_author_handle}/status/${bookmark.x_post_id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: '#4a4a5a',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#00d4ff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4a5a'; }}
          title="View on X"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
        <span style={{ fontSize: '12px', color: '#4a4a5a', marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          {bookmark.post_created_at && (
            <span>Posted {formatDate(bookmark.post_created_at)}</span>
          )}
          <span>Added {formatDate(bookmark.bookmarked_at)}</span>
        </span>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            title="Remove bookmark"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#4a4a5a', padding: '2px', display: 'flex', alignItems: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4a5a'; }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ fontSize: '14px', color: '#c0c0d0', lineHeight: 1.5 }}>
        {bookmark.content_text}
      </div>

      {/* Tag pills */}
      {currentTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
          {currentTags.map((bt) => (
            <span
              key={bt.tag_id}
              style={{
                borderRadius: '100px',
                padding: '3px 10px',
                fontSize: '12px',
                fontWeight: 500,
                background: hexToRgba(bt.tags.color, 0.1),
                border: `1px solid ${hexToRgba(bt.tags.color, 0.25)}`,
                color: bt.tags.color,
              }}
            >
              {bt.tags.name}
            </span>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setConfirmDelete(false)}
        >
          <div
            style={{
              background: '#0f1019', border: '1px solid rgba(0,212,255,0.15)',
              borderRadius: '16px', padding: '32px', maxWidth: '360px', width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#f0f0f5', marginBottom: '10px' }}>
              Remove bookmark?
            </h3>
            <p style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5, marginBottom: '24px' }}>
              This will permanently remove this bookmark from HAL. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '9px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#8a8a9a', fontSize: '14px', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >Cancel</button>
              <button
                onClick={() => { setConfirmDelete(false); onDelete!(bookmark.id, bookmark.x_post_id); }}
                style={{
                  padding: '9px 18px', borderRadius: '8px', border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Tag button */}
      <div style={{ position: 'relative', display: 'inline-block', marginTop: '8px' }}>
        <button
          onClick={() => setPopoverOpen(!popoverOpen)}
          style={{
            width: '28px',
            height: '28px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: popoverOpen ? 'rgba(0,212,255,0.08)' : 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            color: popoverOpen ? '#00d4ff' : '#4a4a5a',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!popoverOpen) {
              e.currentTarget.style.background = 'rgba(0,212,255,0.08)';
              e.currentTarget.style.color = '#00d4ff';
            }
          }}
          onMouseLeave={(e) => {
            if (!popoverOpen) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#4a4a5a';
            }
          }}
          title="Manage tags"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </button>

        {popoverOpen && (
          <TagPopover
            allTags={allTags}
            activeTagIds={activeTagIds}
            onToggle={handleToggleTag}
            onClose={() => setPopoverOpen(false)}
          />
        )}
      </div>
    </motion.div>
  );
}
