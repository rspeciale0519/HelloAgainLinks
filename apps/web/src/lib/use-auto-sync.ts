'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '@/lib/mobile';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const LAST_AUTO_SYNC_KEY = 'last_auto_sync_at';
// Each sync is a paid X API call (owned reads bill per resource returned), and
// this fires on every app open AND every resume. At 2 minutes a normal day's
// app-switching triggered a sync almost every time the app came forward. New
// bookmarks don't arrive that fast, and a manual "Sync Now" still exists for
// the impatient case — so widen the window substantially.
const THROTTLE_MS = 15 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://helloagainlinks.com';

async function maybeSync() {
  const { value } = await Preferences.get({ key: LAST_AUTO_SYNC_KEY });
  const last = value ? Number(value) : 0;
  if (Date.now() - last < THROTTLE_MS) return;

  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Stamp before the request so overlapping open/resume events can't stampede
  await Preferences.set({ key: LAST_AUTO_SYNC_KEY, value: String(Date.now()) });
  try {
    await fetch(`${APP_URL}/api/sync/background`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    // network failure — next open/resume retries once the throttle window passes
  }
}

export function useAutoSync() {
  useEffect(() => {
    if (!isNativeApp()) return;

    void maybeSync();

    const listenerPromise = App.addListener('resume', () => {
      void maybeSync();
    });

    return () => {
      listenerPromise.then(handle => handle.remove()).catch(() => {});
    };
  }, []);
}
