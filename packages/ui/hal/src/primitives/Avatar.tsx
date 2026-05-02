// packages/ui/hal/src/primitives/Avatar.tsx
'use client';

import { useState, type CSSProperties } from 'react';

/**
 * Tiered avatar resolution:
 *   1. Captured X profile picture (`avatarUrl`, e.g. pbs.twimg.com/profile_images/…)
 *   2. unavatar.io X-handle lookup (covers pre-Phase-6 rows where the column is
 *      null because the bookmark was imported before migration 008)
 *   3. Deterministic hue + first-letter circle (last-resort visual)
 *
 * Each tier falls through on `onError`, so deleted/suspended X accounts and
 * unavatar misses both degrade cleanly without breaking the surrounding grid.
 */

export interface AvatarProps {
  /** Optional X profile picture URL (https://pbs.twimg.com/profile_images/...). */
  avatarUrl?: string | null;
  /** Display name; first character is used as the lettered fallback. */
  name: string;
  /** X handle; used for the deterministic hue and as a fallback for the letter. */
  handle: string;
  /** Pixel diameter of the avatar; defaults to 32. */
  size?: number;
  /** Optional style overrides applied to the outer element. */
  style?: CSSProperties;
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}

export function Avatar({ avatarUrl, name, handle, size = 32, style }: AvatarProps) {
  // 0 = primary URL, 1 = unavatar fallback, 2 = lettered circle
  const [tier, setTier] = useState(0);
  const initial = (name?.[0] ?? handle?.[0] ?? '?').toUpperCase();
  const hue = hashHue(handle || name || initial);

  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    ...style,
  };

  // Tier 1: captured X URL from the extension scrape
  if (tier === 0 && avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || handle}
        loading="lazy"
        decoding="async"
        onError={() => setTier(1)}
        style={{
          ...base,
          objectFit: 'cover',
          background: 'var(--hal-bg-3)',
        }}
      />
    );
  }

  // Tier 2: unavatar.io handle lookup. `?fallback=false` makes the service
  // return 404 (instead of a generic placeholder) when the handle is unknown,
  // so our onError can drop us cleanly into the lettered tier.
  if (tier <= 1 && handle) {
    return (
      <img
        src={`https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`}
        alt={name || handle}
        loading="lazy"
        decoding="async"
        onError={() => setTier(2)}
        style={{
          ...base,
          objectFit: 'cover',
          background: 'var(--hal-bg-3)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        ...base,
        background: `hsl(${hue}, 55%, 55%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--hal-mono)',
        fontSize: Math.max(10, Math.round(size * 0.4)),
        fontWeight: 600,
        color: 'var(--hal-bg-0)',
        letterSpacing: '-0.02em',
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
