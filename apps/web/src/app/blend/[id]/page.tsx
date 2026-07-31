import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://helloagainlinks.com';

interface Analysis {
  score?: number;
  tier?: string;
  commonGround?: string[];
  uniqueA?: string[];
  uniqueB?: string[];
  hiddenConnections?: string[];
  summary?: string;
  signatureA?: string;
  signatureB?: string;
}

interface PublicBlend {
  id: string;
  score: number;
  analysis: Analysis;
  handleA: string;
  handleB: string;
  avatarA: string | null;
  avatarB: string | null;
}

function tierTheme(score: number) {
  if (score <= 25) return { label: "Expanding Each Other's Horizons", accent: '#a78bfa' };
  if (score <= 50) return { label: 'Interesting Crossovers', accent: '#fbbf24' };
  if (score <= 75) return { label: 'Bookmark Buddies', accent: '#00d4ff' };
  return { label: 'Intellectual Twins', accent: '#f472b6' };
}

// Public by capability URL: only ACTIVE blends resolve, and only aggregate
// themes from analysis_json are shown — never bookmark contents (PRD §3.5).
async function getPublicBlend(id: string): Promise<PublicBlend | null> {
  const serviceClient = getServiceClient();
  const { data: blend } = await serviceClient
    .from('blends')
    .select('id, status, blend_score, analysis_json, user_a_id, user_b_id')
    .eq('id', id)
    .eq('status', 'active')
    .single();
  if (!blend) return null;

  const [{ data: profileA }, { data: profileB }] = await Promise.all([
    serviceClient.from('profiles').select('x_handle, avatar_url').eq('id', blend.user_a_id).single(),
    serviceClient.from('profiles').select('x_handle, avatar_url').eq('id', blend.user_b_id).single(),
  ]);

  const analysis = (blend.analysis_json ?? {}) as Analysis;
  return {
    id: blend.id,
    score: Math.max(0, Math.min(100, blend.blend_score ?? analysis.score ?? 0)),
    analysis,
    handleA: profileA?.x_handle || 'user',
    handleB: profileB?.x_handle || 'user',
    avatarA: profileA?.avatar_url ?? null,
    avatarB: profileB?.avatar_url ?? null,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const blend = await getPublicBlend(id);
  if (!blend) return { title: 'Blend not found — HelloAgain' };

  const theme = tierTheme(blend.score);
  const title = `@${blend.handleA} × @${blend.handleB} — ${blend.score}% ${theme.label}`;
  const description =
    blend.analysis.summary ||
    'Two bookmark libraries, one compatibility score. See what they have in common on HelloAgain.';
  const cardUrl = `${APP_URL}/api/blends/${id}/card`;

  return {
    title: `${title} · Bookmark Blend`,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: cardUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [cardUrl],
    },
  };
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '12px', letterSpacing: '0.18em', color: '#8a8a96', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function TopicChips({ topics, accent }: { topics: string[]; accent: string }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {topics.map((t) => (
        <span
          key={t}
          style={{
            fontSize: '13px',
            padding: '6px 14px',
            borderRadius: '999px',
            border: `1px solid ${accent}`,
            color: '#f0f0f5',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default async function PublicBlendPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const blend = await getPublicBlend(id);
  if (!blend) notFound();

  const theme = tierTheme(blend.score);
  const a = blend.analysis;
  const shareText = `My bookmark blend with @${blend.handleB} — we're ${theme.label}! 🔖 ${APP_URL}/blend/${blend.id}`;
  const shareUrl = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', padding: '48px 24px' }}>
      <div style={{ maxWidth: '640px', width: '100%' }}>
        {/* Header: the pairing */}
        <div style={{ fontSize: '12px', letterSpacing: '0.2em', color: '#8a8a96', marginBottom: '24px' }}>
          HAL ▪ BOOKMARK BLEND
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
          {[
            { avatar: blend.avatarA, handle: blend.handleA },
            { avatar: blend.avatarB, handle: blend.handleB },
          ].map((u, i) => (
            <div key={u.handle + i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {i === 1 && <span style={{ color: theme.accent, fontSize: '20px' }}>×</span>}
              {u.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u.avatar}
                  alt=""
                  width={44}
                  height={44}
                  style={{ borderRadius: '50%', border: `2px solid ${theme.accent}` }}
                />
              ) : (
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    border: `2px solid ${theme.accent}`, background: '#16161c',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#f0f0f5', fontSize: '18px',
                  }}
                >
                  {u.handle[0]?.toUpperCase()}
                </div>
              )}
              <span style={{ color: '#c9c9d4', fontSize: '15px' }}>@{u.handle}</span>
            </div>
          ))}
        </div>

        {/* Score */}
        <div className="glass" style={{ borderRadius: '20px', padding: '32px', marginBottom: '20px', border: `1px solid ${theme.accent}33` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '18px' }}>
            <span style={{ fontSize: '72px', fontWeight: 700, lineHeight: 1, color: theme.accent }}>
              {blend.score}
            </span>
            <div style={{ paddingBottom: '8px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.18em', color: '#8a8a96' }}>BLEND SCORE</div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#f0f0f5' }}>{theme.label}</div>
            </div>
          </div>
          <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ width: `${blend.score}%`, height: '6px', borderRadius: '3px', background: theme.accent, boxShadow: `0 0 16px ${theme.accent}` }} />
          </div>
          {a.summary && (
            <p style={{ marginTop: '18px', fontSize: '15px', lineHeight: 1.6, color: '#c9c9d4' }}>{a.summary}</p>
          )}
        </div>

        {/* Aggregate themes only — never specific bookmarks */}
        {(a.commonGround?.length ?? 0) > 0 && (
          <div className="glass" style={{ borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
            <SectionLabel>COMMON GROUND</SectionLabel>
            <TopicChips topics={a.commonGround!} accent={theme.accent} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {([
            [`@${blend.handleA}`, a.uniqueA, a.signatureA],
            [`@${blend.handleB}`, a.uniqueB, a.signatureB],
          ] as const).map(([who, topics, signature]) =>
            (topics?.length ?? 0) > 0 || signature ? (
              <div key={who} className="glass" style={{ borderRadius: '16px', padding: '24px', flex: '1 1 240px' }}>
                <SectionLabel>{who} BRINGS</SectionLabel>
                {signature && (
                  <div style={{ fontSize: '14px', color: '#f0f0f5', marginBottom: '10px' }}>{signature}</div>
                )}
                {(topics?.length ?? 0) > 0 && <TopicChips topics={topics!} accent="#3a3a44" />}
              </div>
            ) : null
          )}
        </div>

        {(a.hiddenConnections?.length ?? 0) > 0 && (
          <div className="glass" style={{ borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
            <SectionLabel>HIDDEN CONNECTIONS</SectionLabel>
            <TopicChips topics={a.hiddenConnections!} accent={theme.accent} />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '12px 24px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #00d4ff, #0ea5e9)',
              color: '#0a0a0f', fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Share on X
          </a>
          <a
            href={`/api/blends/${blend.id}/card`}
            download={`blend-${blend.handleA}-${blend.handleB}.png`}
            style={{
              padding: '12px 24px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.18)', color: '#f0f0f5',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none',
            }}
          >
            Download card
          </a>
        </div>

        {/* Viral loop CTA */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#8a8a96', marginBottom: '12px' }}>
            What would your blend look like?
          </div>
          <Link
            href="/login"
            style={{ color: '#00d4ff', fontSize: '15px', fontWeight: 600, textDecoration: 'none' }}
          >
            Create your own Blend →
          </Link>
        </div>
      </div>
    </div>
  );
}
