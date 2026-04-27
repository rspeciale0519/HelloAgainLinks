// packages/ui/hal/src/primitives/Avatar.tsx
'use client';

import { useState, type CSSProperties } from 'react';

/**
 * Stable avatar that prefers the captured X profile picture (`avatarUrl`) and
 * falls back to a deterministic colored-letter circle when the URL is null,
 * empty, or fails to load. Pre-Phase-6 bookmarks have no avatar URL and the
 * fallback keeps them visually consistent with the rest of the feed.
 *
 * Falls back automatically when X serves a 404 (deleted/suspended account) or
 * when the image is otherwise unreachable. Component re-renders into the
 * lettered circle without breaking the surrounding grid.
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
  const [errored, setErrored] = useState(false);
  const initial = (name?.[0] ?? handle?.[0] ?? '?').toUpperCase();
  const hue = hashHue(handle || name || initial);

  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    ...style,
  };

  if (avatarUrl && !errored) {
    return (
      <img
        src={avatarUrl}
        alt={name || handle}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
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
