'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Blend {
  id: string;
  status: string;
  blend_score: number | null;
  analysis_json: {
    tier?: string;
    commonGround?: string[];
    summary?: string;
    signatureA?: string;
    signatureB?: string;
  } | null;
  created_at: string;
}

export default function BlendPage() {
  const [blends, setBlends] = useState<Blend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBlends = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/blends', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setBlends(data.blends || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBlends(); }, [fetchBlends]);

  const createInvite = async () => {
    setCreating(true);
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/blends', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setInviteUrl(data.inviteUrl || '');
    }
    setCreating(false);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tierColors: Record<string, string> = {
    'Intellectual Twins': '#22c55e',
    'Bookmark Buddies': '#00d4ff',
    'Interesting Crossovers': '#f59e0b',
    "Expanding Each Other's Horizons": '#8b5cf6',
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#f0f0f5', marginBottom: '4px' }}>Bookmark Blend</h1>
        <p style={{ color: '#8a8a9a', fontSize: '14px' }}>
          Compare your bookmark taste with friends. See what you have in common.
        </p>
      </div>

      {/* Create invite */}
      <div className="glass glow-border" style={{ padding: '24px', borderRadius: '14px', marginBottom: '32px' }}>
        {inviteUrl ? (
          <div>
            <div style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '12px' }}>
              Share this link with a friend to start a Blend:
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                readOnly
                value={inviteUrl}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '10px',
                  border: '1px solid rgba(0,212,255,0.15)', background: 'rgba(15,16,25,0.8)',
                  color: '#00d4ff', fontSize: '13px', fontFamily: 'monospace', outline: 'none',
                }}
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={copyInvite}
                style={{
                  padding: '10px 18px', borderRadius: '10px', border: 'none',
                  background: copied ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
                  color: copied ? '#22c55e' : '#0a0a0f', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </motion.button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔗</div>
            <div style={{ fontSize: '16px', color: '#f0f0f5', fontWeight: 600, marginBottom: '8px' }}>
              Start a Blend
            </div>
            <div style={{ fontSize: '14px', color: '#8a8a9a', marginBottom: '16px' }}>
              Generate an invite link and share it with a friend. When they accept, AI will analyze your bookmark compatibility.
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createInvite}
              disabled={creating}
              style={{
                padding: '12px 28px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)', color: '#0a0a0f',
                fontWeight: 600, fontSize: '15px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                opacity: creating ? 0.5 : 1,
              }}
            >
              {creating ? 'Creating...' : 'Create Blend Invite'}
            </motion.button>
          </div>
        )}
      </div>

      {/* Existing blends */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f0f0f5', marginBottom: '16px' }}>Your Blends</h2>

      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : blends.length === 0 ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
          No blends yet. Create an invite and share it!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {blends.map((blend, i) => {
            const analysis = blend.analysis_json;
            const tier = analysis?.tier || 'Pending';
            const color = tierColors[tier] || '#8a8a9a';

            return (
              <motion.div
                key={blend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass glow-border"
                style={{ padding: '20px 24px', borderRadius: '14px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color }}>
                    {tier}
                  </span>
                  {blend.blend_score !== null && (
                    <span style={{
                      fontSize: '24px', fontWeight: 700, color,
                      textShadow: `0 0 20px ${color}40`,
                    }}>
                      {blend.blend_score}%
                    </span>
                  )}
                </div>

                {analysis?.summary && (
                  <div style={{ fontSize: '14px', color: '#8a8a9a', lineHeight: 1.5, marginBottom: '12px' }}>
                    {analysis.summary}
                  </div>
                )}

                {analysis?.commonGround && analysis.commonGround.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {analysis.commonGround.map((topic) => (
                      <span key={topic} style={{
                        padding: '4px 10px', borderRadius: '100px', fontSize: '12px',
                        background: 'rgba(0,212,255,0.06)', color: '#00d4ff',
                        border: '1px solid rgba(0,212,255,0.15)',
                      }}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {blend.status === 'pending' && (
                  <div style={{ fontSize: '13px', color: '#f59e0b', fontStyle: 'italic' }}>
                    ⏳ Waiting for your friend to accept...
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
