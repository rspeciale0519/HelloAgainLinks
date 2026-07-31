import { ImageResponse } from 'next/og';
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// Satori needs TTF (not woff2). Fetched once per lambda instance, and the card
// falls back to the default sans if the fetch fails — a slightly plainer card
// beats a 500 on a share preview.
const GEIST_MONO_400 =
  'https://fonts.gstatic.com/s/geistmono/v6/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeE9KJ5T.ttf';
const GEIST_MONO_700 =
  'https://fonts.gstatic.com/s/geistmono/v6/or3yQ6H-1_WfwkMZI_qYPLs1a-t7PU0AbeHaL55T.ttf';

let fontCache: { name: string; data: ArrayBuffer; weight: 400 | 700 }[] | null = null;

async function loadFonts() {
  if (fontCache) return fontCache;
  try {
    const [regular, bold] = await Promise.all([
      fetch(GEIST_MONO_400).then((r) => r.arrayBuffer()),
      fetch(GEIST_MONO_700).then((r) => r.arrayBuffer()),
    ]);
    fontCache = [
      { name: 'Geist Mono', data: regular, weight: 400 as const },
      { name: 'Geist Mono', data: bold, weight: 700 as const },
    ];
  } catch {
    fontCache = [];
  }
  return fontCache;
}

// One theme per score tier (PRD §3.3).
function tierTheme(score: number) {
  if (score <= 25) return { label: "EXPANDING EACH OTHER'S HORIZONS", accent: '#a78bfa' };
  if (score <= 50) return { label: 'INTERESTING CROSSOVERS', accent: '#fbbf24' };
  if (score <= 75) return { label: 'BOOKMARK BUDDIES', accent: '#00d4ff' };
  return { label: 'INTELLECTUAL TWINS', accent: '#f472b6' };
}

async function avatarDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

interface Analysis {
  score?: number;
  commonGround?: string[];
  signatureA?: string;
  signatureB?: string;
}

function Avatar({
  src,
  fallbackInitial,
  accent,
}: {
  src: string | null;
  fallbackInitial: string;
  accent: string;
}) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={104}
      height={104}
      style={{ borderRadius: 999, border: `3px solid ${accent}` }}
    />
  ) : (
    <div
      style={{
        width: 104,
        height: 104,
        borderRadius: 999,
        border: `3px solid ${accent}`,
        background: '#16161c',
        color: '#f0f0f5',
        fontSize: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {fallbackInitial.toUpperCase()}
    </div>
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const serviceClient = getServiceClient();

  const { data: blend } = await serviceClient
    .from('blends')
    .select('id, status, blend_score, analysis_json, user_a_id, user_b_id')
    .eq('id', id)
    .eq('status', 'active')
    .single();

  if (!blend) {
    return NextResponse.json({ error: 'Blend not found' }, { status: 404 });
  }

  const [{ data: profileA }, { data: profileB }] = await Promise.all([
    serviceClient.from('profiles').select('display_name, x_handle, avatar_url').eq('id', blend.user_a_id).single(),
    serviceClient.from('profiles').select('display_name, x_handle, avatar_url').eq('id', blend.user_b_id).single(),
  ]);

  const analysis = (blend.analysis_json ?? {}) as Analysis;
  const score = Math.max(0, Math.min(100, blend.blend_score ?? analysis.score ?? 0));
  const theme = tierTheme(score);
  const handleA = profileA?.x_handle || 'user';
  const handleB = profileB?.x_handle || 'user';
  const topics = (analysis.commonGround ?? []).slice(0, 3);

  const [fonts, avatarA, avatarB] = await Promise.all([
    loadFonts(),
    avatarDataUri(profileA?.avatar_url ?? null),
    avatarDataUri(profileB?.avatar_url ?? null),
  ]);

  const mono = fonts.length > 0 ? 'Geist Mono' : 'sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 64px 40px',
          background: 'linear-gradient(160deg, #0a0a0c 0%, #101018 100%)',
          color: '#f0f0f5',
          fontFamily: mono,
        }}
      >
        {/* Telemetry strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 22,
            letterSpacing: 4,
            color: '#8a8a96',
          }}
        >
          <span>HAL ▪ BOOKMARK BLEND</span>
          <span>helloagainlinks.com</span>
        </div>

        {/* Avatars joined by the score scan-line: the filled length IS the score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Avatar src={avatarA} fallbackInitial={handleA[0] ?? 'A'} accent={theme.accent} />
            <span style={{ fontSize: 24, color: '#c9c9d4' }}>@{handleA}</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexGrow: 1,
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.10)',
            }}
          >
            <div
              style={{
                width: `${score}%`,
                height: 6,
                borderRadius: 3,
                background: theme.accent,
                boxShadow: `0 0 24px ${theme.accent}`,
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Avatar src={avatarB} fallbackInitial={handleB[0] ?? 'B'} accent={theme.accent} />
            <span style={{ fontSize: 24, color: '#c9c9d4' }}>@{handleB}</span>
          </div>
        </div>

        {/* Score + tier */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 32 }}>
          <span style={{ fontSize: 170, fontWeight: 700, lineHeight: 1, color: theme.accent }}>
            {score}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 18 }}>
            <span style={{ fontSize: 22, letterSpacing: 4, color: '#8a8a96' }}>BLEND SCORE</span>
            <span
              style={{
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: 2,
                color: '#f0f0f5',
              }}
            >
              {theme.label}
            </span>
          </div>
        </div>

        {/* Common ground */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 20, letterSpacing: 4, color: '#8a8a96' }}>COMMON GROUND</span>
          <div style={{ display: 'flex', gap: 14 }}>
            {(topics.length > 0 ? topics : ['Curated curiosity']).map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 24,
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: `1.5px solid ${theme.accent}`,
                  color: '#f0f0f5',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: fonts.length > 0 ? fonts.map((f) => ({ name: f.name, data: f.data, weight: f.weight })) : undefined,
    }
  );
}

// Required for Next.js static export compatibility (mobile build only)
export function generateStaticParams() {
  return [];
}
