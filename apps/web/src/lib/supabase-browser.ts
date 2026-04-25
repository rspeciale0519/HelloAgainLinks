// apps/web/src/lib/supabase-browser.ts
//
// Browser-side Supabase client. Uses @supabase/ssr's createBrowserClient so
// it reads the same auth cookies that the app's login flow + middleware
// already write (`sb-<project-ref>-auth-token.0/.1`, the chunked-cookie
// "base64-" format introduced in @supabase/ssr v0.5).
//
// Why not the plain @supabase/supabase-js createClient? Its default storage
// adapter is localStorage. After a fresh login the session lives in cookies;
// localStorage is empty. authFetch (which reads `auth.getSession()`) would
// silently return null and every authed fetch would no-op or return 401.

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
