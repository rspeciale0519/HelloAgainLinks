'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '@/lib/auth-fetch';
import {
  PageShell,
  SectionLabel,
  HalInput,
  HalPanel,
  HalPrimaryButton,
} from '@/components/hal/PageShell';

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
    const res = await authFetch('/api/blends');
    if (res?.ok) {
      const data = await res.json();
      setBlends(data.blends || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBlends();
  }, [fetchBlends]);

  const createInvite = async () => {
    setCreating(true);
    const res = await authFetch('/api/blends', { method: 'POST' });
    if (res?.ok) {
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

  return (
    <PageShell
      eyebrow="DASHBOARD · BLEND"
      title="Bookmark Blend"
      subtitle="Compare your archive to a friend's. HAL highlights overlap and divergence — taste-graph signal in one number."
    >
      <SectionLabel>NEW INVITE</SectionLabel>
      {inviteUrl ? (
        <HalPanel accent>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--hal-text-3)',
              marginBottom: 10,
            }}
          >
            INVITE READY · SHARE THIS URL
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <HalInput
              value={inviteUrl}
              readOnly
              style={{
                flex: 1,
                color: 'var(--hal-a)',
                fontFamily: 'var(--hal-mono)',
                fontSize: 12,
              }}
            />
            <HalPrimaryButton onClick={copyInvite}>
              {copied ? '✓ COPIED' : 'COPY'}
            </HalPrimaryButton>
          </div>
        </HalPanel>
      ) : (
        <HalPanel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, color: 'var(--hal-text-1)', lineHeight: 1.55 }}>
              Generate an invite link and send it to a friend. When they accept,
              HAL analyzes both archives and produces a tier + score summarizing
              the overlap.
            </div>
            <div>
              <HalPrimaryButton onClick={createInvite} disabled={creating}>
                {creating ? 'CREATING…' : 'CREATE BLEND INVITE'}
              </HalPrimaryButton>
            </div>
          </div>
        </HalPanel>
      )}

      <SectionLabel count={loading ? '…' : blends.length}>YOUR BLENDS</SectionLabel>

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
      ) : blends.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {blends.map((blend) => (
            <BlendRow key={blend.id} blend={blend} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function BlendRow({ blend }: { blend: Blend }) {
  const analysis = blend.analysis_json;
  const tier = analysis?.tier ?? 'PENDING';
  const isPending = blend.status === 'pending';

  return (
    <div
      style={{
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-1)',
        borderLeft: isPending ? '2px solid var(--hal-text-3)' : '2px solid var(--hal-a)',
        borderRadius: 4,
        padding: '18px 22px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 9,
              letterSpacing: '0.16em',
              color: 'var(--hal-text-3)',
              marginBottom: 3,
            }}
          >
            TIER
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: isPending ? 'var(--hal-text-2)' : 'var(--hal-text-0)',
              fontFamily: 'var(--hal-sans)',
              letterSpacing: '-0.01em',
            }}
          >
            {tier}
          </div>
        </div>
        {blend.blend_score !== null && (
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: 'var(--hal-a)',
              fontFamily: 'var(--hal-mono)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            {blend.blend_score}
            <span style={{ fontSize: 16, color: 'var(--hal-text-3)' }}>%</span>
          </div>
        )}
      </div>

      {analysis?.summary && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--hal-text-1)',
            lineHeight: 1.55,
            marginBottom: 12,
          }}
        >
          {analysis.summary}
        </div>
      )}

      {analysis?.commonGround && analysis.commonGround.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {analysis.commonGround.map((topic) => (
            <span
              key={topic}
              style={{
                padding: '3px 8px',
                fontFamily: 'var(--hal-mono)',
                fontSize: 10,
                color: 'var(--hal-a)',
                background: 'var(--hal-a-dim)',
                border: '1px solid rgba(var(--hal-a-rgb), 0.25)',
                borderRadius: 2,
                letterSpacing: '0.02em',
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {isPending && (
        <div
          style={{
            marginTop: 10,
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--hal-text-3)',
          }}
        >
          AWAITING PARTNER · INVITE OPEN
        </div>
      )}
    </div>
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
        NO BLENDS YET
      </div>
      <div style={{ fontSize: 13, color: 'var(--hal-text-1)', lineHeight: 1.55 }}>
        Create a Blend invite above and share the link. As soon as a friend
        accepts, HAL fingerprints both archives and writes the analysis here.
      </div>
    </HalPanel>
  );
}

