'use client';

import { useEffect, useState, useRef } from 'react';
import type { Plan } from '@helloagain/shared';
import { getSupabaseBrowserClient } from './supabase-browser';

export function usePlan(userId: string | undefined): Plan {
  const [plan, setPlan] = useState<Plan>('free');
  const lastUserId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!userId || userId === lastUserId.current) return;
    lastUserId.current = userId;

    const controller = new AbortController();
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || controller.signal.aborted) return;

      const res = await fetch('/api/profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plan) setPlan(data.plan);
      }
    })();

    return () => controller.abort();
  }, [userId]);

  return plan;
}
