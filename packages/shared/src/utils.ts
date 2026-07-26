/**
 * Relative time formatting — "5m ago", "3h ago", "2d ago".
 * Pass `short: true` for compact form without "ago" — "5m", "3h", "2d".
 */
export function timeAgo(dateStr: string, options?: { short?: boolean }): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const suffix = options?.short ? '' : ' ago';
  if (mins < 1) return options?.short ? '1m' : 'Just now';
  if (mins < 60) return `${mins}m${suffix}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h${suffix}`;
  return `${Math.floor(hrs / 24)}d${suffix}`;
}

/**
 * Absolute post timestamp in X's own style.
 *
 *   default          "3:04 PM - July 22, 2026"   (roomy layouts — desktop)
 *   { short: true }  "3:04PM - 7/22/26"          (narrow layouts — mobile cards)
 *
 * Preferred over timeAgo() for bookmark cards: a saved post is usually old, and
 * "26w" tells you far less than the date it was actually published. Rendered in
 * the viewer's local timezone.
 */
export function formatPostDate(dateStr: string, options?: { short?: boolean }): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (options?.short) {
    const date = d.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
    // "3:04 PM" -> "3:04PM": drop the space to buy room in a one-line card header.
    return `${time.replace(/\s/g, '')} - ${date}`;
  }

  const date = d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `${time} - ${date}`;
}

/**
 * Convert a hex color string (#RRGGBB) to an rgba() CSS value.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
