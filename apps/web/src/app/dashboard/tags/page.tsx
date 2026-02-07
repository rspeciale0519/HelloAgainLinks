'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

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

  const fetchTags = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/tags', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags || data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const handleCreate = async () => {
    if (!newTag.trim()) return;
    setCreating(true);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newTag.trim() }),
    });

    if (res.ok) {
      setNewTag('');
      fetchTags();
    }
    setCreating(false);
  };

  const handleDelete = async (tagId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await fetch(`/api/tags/${tagId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    setTags(tags.filter(t => t.id !== tagId));
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>Tags</h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          Organize your bookmarks with tags. Pro users get AI auto-tagging.
        </p>
      </div>

      {/* Create tag */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', maxWidth: '400px' }}>
        <input
          type="text"
          placeholder="New tag name..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '10px',
            border: '1px solid rgba(0,212,255,0.15)', background: 'rgba(15,16,25,0.8)',
            color: '#f0f0f5', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none',
          }}
        />
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleCreate}
          disabled={creating || !newTag.trim()}
          style={{
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            opacity: creating || !newTag.trim() ? 0.5 : 1, fontFamily: "'Inter', sans-serif",
          }}
        >
          Add
        </motion.button>
      </div>

      {/* Tags grid */}
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : tags.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass glow-border"
          style={{ padding: '48px', borderRadius: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏷️</div>
          <div style={{ fontSize: '18px', color: '#f0f0f5', fontWeight: 600, marginBottom: '8px' }}>No tags yet</div>
          <div style={{ fontSize: '14px', color: '#8a8a9a' }}>Create tags to organize your bookmarks, or upgrade to Pro for AI auto-tagging.</div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {tags.map((tag, i) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '100px',
                background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)',
              }}
            >
              <span style={{ fontSize: '14px', color: '#00d4ff', fontWeight: 500 }}>{tag.name}</span>
              <button
                onClick={() => handleDelete(tag.id)}
                style={{
                  background: 'none', border: 'none', color: '#4a4a5a', cursor: 'pointer',
                  fontSize: '14px', padding: '0 2px', lineHeight: 1,
                }}
                title="Remove tag"
              >
                ×
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
