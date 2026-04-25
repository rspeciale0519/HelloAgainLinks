// apps/web/src/lib/use-sync-time.ts
'use client';

import { useEffect, useState } from 'react';
import { authFetch } from './auth-fetch';
import { formatRelative } from './relative-time';

export interface SyncTimeState {
  label: string;
  lastSyncIso: string | null;
}

/**
 * Hook that fetches /api/profile/sync-state once on mount and re-renders every
 * 15 s so the relative "SYNCED Ns ago" label keeps advancing.
 */
export function useSyncTime(): SyncTimeState {
  const [lastSyncIso, setLastSyncIso] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await authFetch('/api/profile/sync-state');
      if (!res?.ok || !mounted) return;
      const data = (await res.json()) as { lastSyncAt?: string | null };
      setLastSyncIso(data?.lastSyncAt ?? null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  return {
    label: lastSyncIso ? `SYNCED ${formatRelative(lastSyncIso)}` : 'NEVER SYNCED',
    lastSyncIso,
  };
}
