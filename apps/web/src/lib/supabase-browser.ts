// apps/web/src/lib/supabase-browser.ts
//
// Browser-side Supabase client.
//
// Web: @supabase/ssr's createBrowserClient stores the session in the same auth
// cookies the login flow + middleware read/write (`sb-<ref>-auth-token`), so an
// authed fetch and the middleware agree on who is signed in.
//
// Native (Capacitor WebView): those cookies do NOT persist at the
// capacitor://localhost origin, so getSession() comes back empty immediately
// after a successful login and every authed call bails. The native app doesn't
// use cookie/middleware auth anyway — it carries a Bearer token — so it uses the
// default supabase-js client, which persists the session to localStorage (works
// in WKWebView) and auto-refreshes tokens.

import { createBrowserClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

function isNativeRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
}

export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (isNativeRuntime()) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return client;
  }

  client = createBrowserClient(url, anonKey);
  return client;
}
