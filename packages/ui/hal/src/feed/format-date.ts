// packages/ui/hal/src/feed/format-date.ts
// Package-internal date helpers so feed components stay decoupled from the
// web app's relative-time helper.

export function formatDate(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Absolute post timestamp in X's own style.
 *
 *   default          "3:04 PM - July 22, 2026"   (roomy layouts — list cards)
 *   { short: true }  "3:04PM - 7/22/26"          (narrow layouts — grid cards)
 *
 * Use this for a post's publication time. A relative count is the wrong unit
 * for a saved post: "26w" says far less than the date it went up. Mirrors
 * formatPostDate in @helloagain/shared — duplicated deliberately, since this
 * package stays decoupled from the web app's helpers.
 */
export function formatPostDate(
  isoOrDate: string | Date | null | undefined,
  options?: { short?: boolean },
): string {
  if (!isoOrDate) return '';
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return '';

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (options?.short) {
    const date = d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
    return `${time.replace(/\s/g, '')} - ${date}`;
  }
  const date = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${time} - ${date}`;
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
