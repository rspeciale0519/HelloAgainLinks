'use client';

import { useEffect } from 'react';
import { CapacitorShareTarget } from '@capgo/capacitor-share-target';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { isNativeApp, triggerHaptic } from '@/lib/mobile';

function extractTweetUrl(input: string): string | null {
  const regex = /(https?:\/\/(?:x|twitter)\.com\/[\w_]+\/status\/\d+)/i;
  const match = input.match(regex);
  return match?.[1] ?? null;
}

export function MobileShareListener() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let active = true;

    CapacitorShareTarget.addListener('shareReceived', async (event) => {
      if (!active) return;
      const texts = [event.title, ...(event.texts || [])].filter(Boolean);
      const joined = texts.join(' ');
      const tweetUrl = extractTweetUrl(joined);
      if (!tweetUrl) return;

      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/mobile/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: tweetUrl }),
      });

      if (res.ok) {
        await triggerHaptic();
      }
    });

    return () => {
      active = false;
      CapacitorShareTarget.removeAllListeners();
    };
  }, []);

  return null;
}
