import { getSupabaseBrowserClient } from './supabase-browser';

// In the native app (capacitor://localhost) a relative "/api/..." path resolves
// to the local bundle origin, not the live backend, so every data call misses
// the API. Prepend the production origin when running natively; the web app
// stays same-origin (relative).
function apiBase(): string {
  if (typeof window === 'undefined') return '';
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean };
  }).Capacitor;
  const isNative = typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
  if (!isNative) return '';
  return process.env.NEXT_PUBLIC_APP_URL || 'https://helloagainlinks.com';
}

/**
 * Authenticated fetch — gets the current session and adds the Bearer header.
 * Returns null if there is no active session.
 */
export async function authFetch(
  path: string,
  options?: RequestInit
): Promise<Response | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  return fetch(`${apiBase()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...options?.headers,
    },
  });
}

/**
 * Authenticated JSON POST — convenience for the common POST-with-JSON-body pattern.
 */
export async function authPost(
  path: string,
  body: unknown,
  options?: RequestInit
): Promise<Response | null> {
  return authFetch(path, {
    method: 'POST',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(body),
  });
}
