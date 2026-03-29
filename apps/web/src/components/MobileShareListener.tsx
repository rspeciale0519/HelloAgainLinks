'use client';

import { useEffect } from 'react';
import { CapacitorShareTarget } from '@capgo/capacitor-share-target';
import { authPost } from '@/lib/auth-fetch';
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

      const res = await authPost('/api/mobile/share', { url: tweetUrl });

      if (res?.ok) {
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
