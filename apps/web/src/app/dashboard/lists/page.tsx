'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { authFetch, authPost } from '@/lib/auth-fetch';

interface SharedList {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  invite_code: string;
  bookmark_count: number;
  member_count: number;
  created_at: string;
  userRole: string;
}

export default function SharedListsPage() {
  const [lists, setLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVisibility, setNewVisibility] = useState('private');
  const [showCreate, setShowCreate] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchLists = useCallback(async () => {
    const res = await authFetch('/api/shared-lists');
    if (!res) { setLoading(false); return; }

    if (res.ok) {
      const data = await res.json();
      setLists(data.lists || []);
    } else {
      setError('Failed to load shared lists. Please refresh.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError('');

    const res = await authPost('/api/shared-lists', {
      name: newName,
      description: newDesc,
      visibility: newVisibility,
    });

    if (!res) { setCreating(false); return; }

    if (res.ok) {
      setNewName('');
      setNewDesc('');
      setNewVisibility('private');
      setShowCreate(false);
      fetchLists();
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

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(0,212,255,0.15)',
    background: 'rgba(15,16,25,0.8)',
    color: '#f0f0f5',
    fontSize: '14px',
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>
            Shared Lists
          </h1>
          <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
            Collaborate on bookmark collections with others.
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
            color: '#0a0a0f',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          + New List
        </motion.button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass glow-border"
          style={{ padding: '24px', borderRadius: '14px', marginBottom: '24px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="text"
              placeholder="List name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label style={{ color: '#8a8a9a', fontSize: '14px' }}>Visibility:</label>
              {['private', 'public'].map((v) => (
                <button
                  key={v}
                  onClick={() => setNewVisibility(v)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${newVisibility === v ? '#00d4ff' : 'rgba(0,212,255,0.15)'}`,
                    background: newVisibility === v ? 'rgba(0,212,255,0.1)' : 'transparent',
                    color: newVisibility === v ? '#00d4ff' : '#8a8a9a',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    textTransform: 'capitalize',
                  }}
                >
                  {v === 'private' ? '🔒 Private' : '🌐 Public'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#8a8a9a', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  color: '#0a0a0f',
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: creating || !newName.trim() ? 0.5 : 1,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {creating ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lists */}
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : lists.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass glow-border"
          style={{ padding: '48px', borderRadius: '14px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ fontSize: '18px', color: '#f0f0f5', fontWeight: 600, marginBottom: '8px' }}>
            No shared lists yet
          </div>
          <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.6 }}>
            Create a list and invite friends to curate bookmarks together.
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {lists.map((list, i) => (
            <motion.div
              key={list.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass glow-border"
              style={{ padding: '20px 24px', borderRadius: '14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5' }}>
                      {list.name}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 500,
                      background: list.visibility === 'public' ? 'rgba(34,197,94,0.1)' : 'rgba(0,212,255,0.08)',
                      color: list.visibility === 'public' ? '#22c55e' : '#00d4ff',
                      border: `1px solid ${list.visibility === 'public' ? 'rgba(34,197,94,0.2)' : 'rgba(0,212,255,0.15)'}`,
                    }}>
                      {list.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: '#8a8a9a',
                      background: 'rgba(255,255,255,0.04)',
                    }}>
                      {list.userRole}
                    </span>
                  </div>
                  {list.description && (
                    <div style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '10px' }}>
                      {list.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#4a4a5a' }}>
                    <span>📚 {list.bookmark_count} bookmarks</span>
                    <span>👥 {list.member_count} members</span>
                  </div>
                </div>
                <button
                  onClick={() => copyInvite(list)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,212,255,0.15)',
                    background: copiedId === list.id ? 'rgba(34,197,94,0.1)' : 'transparent',
                    color: copiedId === list.id ? '#22c55e' : '#00d4ff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedId === list.id ? '✓ Copied!' : '🔗 Copy Invite'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
