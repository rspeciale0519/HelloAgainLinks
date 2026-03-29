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
 * Convert a hex color string (#RRGGBB) to an rgba() CSS value.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
