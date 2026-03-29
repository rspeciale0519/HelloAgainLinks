'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexToRgba } from '@helloagain/shared';

export interface TagInfo {
  id: string;
  name: string;
  color: string;
}

interface TagPopoverProps {
  allTags: TagInfo[];
  activeTagIds: Set<string>;
  onToggle: (tagId: string, add: boolean) => void;
  onClose: () => void;
}


export default function TagPopover({ allTags, activeTagIds, onToggle, onClose }: TagPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, y: -4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '6px',
          minWidth: '220px',
          maxWidth: '300px',
          background: 'rgba(18, 18, 26, 0.98)',
          border: '1px solid rgba(0,212,255,0.12)',
          borderRadius: '12px',
          padding: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(0,212,255,0.06)',
          zIndex: 50,
          backdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          fontSize: '13px',
          color: '#8a8a9a',
          marginBottom: '10px',
          fontWeight: 500,
        }}>
          Manage Tags
        </div>

        {allTags.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#4a4a5a', padding: '8px 0' }}>
            No tags yet.{' '}
            <a
              href="/dashboard/tags"
              style={{ color: '#00d4ff', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              Create tags
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {allTags.map((tag) => {
              const isActive = activeTagIds.has(tag.id);
              return (
                <motion.button
                  key={tag.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(tag.id, !isActive);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '12px',
                    fontWeight: 500,
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? hexToRgba(tag.color, 0.4) : 'rgba(255,255,255,0.08)'}`,
                    background: isActive ? hexToRgba(tag.color, 0.15) : 'transparent',
                    color: isActive ? tag.color : '#8a8a9a',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4.5 7.5L8 3" stroke={tag.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {tag.name}
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
