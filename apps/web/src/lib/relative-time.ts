// apps/web/src/lib/relative-time.ts
// Format an ISO date / Date as "Ns ago" / "Nm ago" / "Nh ago" / "Nd ago".
// Used by useSyncTime and the bookmark cards' "Saved" meta line.

export function formatRelative(isoOrDate: string | Date | null | undefined): string {
  if (!isoOrDate) return 'never';
  const then = new Date(isoOrDate).getTime();
  if (Number.isNaN(then)) return 'never';
  const diffMs = Date.now() - then;
  const s = Math.max(0, Math.floor(diffMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
