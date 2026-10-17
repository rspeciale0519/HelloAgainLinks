import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Return the subset of `ids` that belong to `userId`.
 * Used so User A cannot attach User B's tags/folders to their own rows.
 */
export async function ownedIds(
  client: SupabaseClient,
  table: 'tags' | 'folders',
  ids: string[],
  userId: string,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const unique = Array.from(new Set(ids));
  const { data, error } = await client
    .from(table)
    .select('id')
    .in('id', unique)
    .eq('user_id', userId);
  if (error || !data) return [];
  return data.map((row) => row.id as string);
}

export function allIdsOwned(requested: string[], owned: string[]): boolean {
  const have = new Set(owned);
  return requested.every((id) => have.has(id));
}
