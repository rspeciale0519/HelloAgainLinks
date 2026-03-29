import { getSupabaseBrowserClient } from './supabase-browser';

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

  return fetch(path, {
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
