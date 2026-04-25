// packages/ui/hal/src/feed/format-date.ts
// Package-internal date helpers so feed components stay decoupled from the
// web app's relative-time helper.

export function formatDate(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Ns/Nm/Nh/Nd ago" — mirror of apps/web/src/lib/relative-time.ts. */
export function formatRelative(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return 'never';
  const then = new Date(isoOrDate).getTime();
  if (Number.isNaN(then)) return 'never';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/**
 * Cheap deterministic hue derived from a string — used to pick a stable avatar
 * color for an X handle when no avatar URL is available.
 */
export function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return ((h % 360) + 360) % 360;
}
