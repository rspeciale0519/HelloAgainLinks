'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { authFetch } from '@/lib/auth-fetch';

interface Blend {
  id: string; status: string; blend_score: number | null;
  analysis_json: { tier?: string; commonGround?: string[]; summary?: string } | null;
}

const TIER_COLORS: Record<string, string> = {
  'Intellectual Twins': '#22c55e',
  'Bookmark Buddies': 'var(--accent-cyan)',
  'Interesting Crossovers': '#f59e0b',
  "Expanding Each Other's Horizons": '#8b5cf6',
};

export default function MobileBlendPage() {
  const [blends, setBlends] = useState<Blend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBlends = useCallback(async () => {
    const res = await authFetch('/api/blends');
    if (res?.ok) { const d = await res.json(); setBlends(d.blends || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBlends(); }, [fetchBlends]);

  const createInvite = async () => {
    setCreating(true);
    const res = await authFetch('/api/blends', { method: 'POST' });
    if (res?.ok) { const d = await res.json(); setInviteUrl(d.inviteUrl || ''); }
    setCreating(false);
  };

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Best blend score across all completed blends
  const bestScore = blends.reduce((max, b) => Math.max(max, b.blend_score ?? 0), 0);
  const bestBlend = blends.find(b => b.blend_score === bestScore && bestScore > 0);
  const ringColor = (bestBlend && TIER_COLORS[bestBlend.analysis_json?.tier ?? '']) || 'var(--accent-cyan)';
  const ringR = 38;
  const ringCirc = 2 * Math.PI * ringR;
  const ringProgress = (bestScore / 100) * ringCirc;

  return (
    <div style={{ padding: '20px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: '#f0f0f5', marginBottom: 6 }}>Blend 🔗</h1>
      <p style={{ color: '#4a4a5a', fontSize: 13, marginBottom: 20 }}>Compare bookmark taste with friends.</p>

      {/* Score ring — shows best blend score */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r={ringR} fill="none" stroke="rgba(var(--accent-rgb),0.1)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r={ringR} fill="none" stroke={ringColor} strokeWidth="8"
              strokeDasharray={`${ringProgress} ${ringCirc}`} strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)`, transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: ringColor }}>
              {bestScore > 0 ? `${bestScore}%` : '—'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#4a4a5a', marginTop: 8 }}>Best Blend Score</div>
        {bestBlend?.analysis_json?.tier && (
          <div style={{ fontSize: 12, color: ringColor, fontWeight: 500, marginTop: 2 }}>
            {bestBlend.analysis_json.tier}
          </div>
        )}
      </div>

      {/* Create invite */}
      <div className="glass glow-border" style={{ padding: 20, borderRadius: 14, marginBottom: 24 }}>
        {inviteUrl ? (
          <>
            <div style={{ fontSize: 12, color: '#8a8a9a', marginBottom: 10 }}>Share with a friend to start a Blend:</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={inviteUrl} style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                border: '1px solid rgba(var(--accent-rgb),0.15)', background: 'rgba(15,16,25,0.8)',
                color: 'var(--accent-cyan)', fontSize: 11, fontFamily: 'monospace', outline: 'none',
              }} />
              <button onClick={copyInvite} style={{
                padding: '9px 14px', borderRadius: 10, border: 'none',
                background: copied ? 'rgba(34,197,94,0.2)' : 'linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan))',
                color: copied ? '#22c55e' : '#0a0a0f', fontWeight: 600, fontSize: 12,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>{copied ? '✓' : 'Copy'}</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔗</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f0f5', marginBottom: 6 }}>Start a Blend</div>
            <div style={{ fontSize: 12, color: '#4a4a5a', lineHeight: 1.5, marginBottom: 16 }}>
              Generate an invite link and share it with a friend. AI will analyze your compatibility.
            </div>
            <button onClick={createInvite} disabled={creating} style={{
              padding: '11px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-cyan))',
              color: '#0a0a0f', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", opacity: creating ? 0.5 : 1,
            }}>{creating ? 'Creating…' : 'Create Blend Invite'}</button>
          </div>
        )}
      </div>

      {/* Existing blends */}
      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f5', marginBottom: 12 }}>Your Blends</h2>
      {loading ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 24, fontSize: 13 }}>Loading…</div>
      ) : blends.length === 0 ? (
        <div style={{ color: '#4a4a5a', textAlign: 'center', padding: 24, fontSize: 13 }}>No blends yet. Create an invite!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blends.map((blend, i) => {
            const tier = blend.analysis_json?.tier || 'Pending';
            const color = TIER_COLORS[tier] || '#8a8a9a';
            return (
              <motion.div
                key={blend.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="glass glow-border"
                style={{ padding: '16px 20px', borderRadius: 14 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color }}>{tier}</span>
                  {blend.blend_score !== null && (
                    <span style={{ fontSize: 20, fontWeight: 700, color }}>{blend.blend_score}%</span>
                  )}
                </div>
                {blend.analysis_json?.summary && (
                  <div style={{ fontSize: 12, color: '#8a8a9a', lineHeight: 1.5, marginBottom: 10 }}>
                    {blend.analysis_json.summary}
                  </div>
                )}
                {(blend.analysis_json?.commonGround?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {blend.analysis_json!.commonGround!.map((t) => (
                      <span key={t} style={{
                        padding: '3px 9px', borderRadius: 100, fontSize: 11,
                        background: 'rgba(var(--accent-rgb),0.06)', color: 'var(--accent-cyan)',
                        border: '1px solid rgba(var(--accent-rgb),0.15)',
                      }}>{t}</span>
                    ))}
                  </div>
                )}
                {blend.status === 'pending' && (
                  <div style={{ fontSize: 12, color: '#f59e0b', fontStyle: 'italic', marginTop: 8 }}>
                    ⏳ Waiting for your friend to accept…
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
