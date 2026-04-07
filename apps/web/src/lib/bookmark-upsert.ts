import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreBookmarkRecord, mergeBookmarkRecords } from '@helloagain/shared';

interface BookmarkRow {
  user_id: string;
  x_post_id: string;
  [key: string]: unknown;
}

interface MergeUpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
  insertedRows: { id: string; content_text?: string }[];
}

/**
 * Check-then-merge upsert for bookmarks. Replaces ignoreDuplicates with
 * a score-based merge that preserves the richest data.
 *
 * 1. Fetch existing rows matching the incoming x_post_ids
 * 2. Partition into: new inserts vs. potential updates
 * 3. For updates: merge if incoming is richer, skip otherwise
 * 4. Bulk insert new rows, individually update enriched rows
 */
export async function mergeUpsertBookmarks(
  serviceClient: SupabaseClient,
  userId: string,
  rows: BookmarkRow[],
): Promise<MergeUpsertResult> {
  if (rows.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0, insertedRows: [] };
  }

  const postIds = rows.map((r) => r.x_post_id);
  const { data: existingRows } = await serviceClient
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .in('x_post_id', postIds);

  const existingMap = new Map(
    (existingRows ?? []).map((r: Record<string, unknown>) => [r.x_post_id as string, r]),
  );

  const toInsert: BookmarkRow[] = [];
  const toUpdate: { id: string; data: Record<string, unknown> }[] = [];
  let skipped = 0;

  for (const row of rows) {
    const existing = existingMap.get(row.x_post_id);
    if (!existing) {
      toInsert.push(row);
    } else {
      const incomingScore = scoreBookmarkRecord(row);
      const existingScore = scoreBookmarkRecord(existing as Record<string, unknown>);
      if (incomingScore > existingScore) {
        const merged = mergeBookmarkRecords(
          existing as Record<string, unknown>,
          row as Record<string, unknown>,
        );
        // Only keep writable bookmark columns
        const WRITABLE_FIELDS = new Set([
          'x_author_handle', 'x_author_name', 'content_text', 'media_urls',
          'post_created_at', 'bookmarked_at', 'x_author_avatar_url',
          'engagement', 'language', 'conversation_id', 'in_reply_to_status_id',
          'quoted_status_id', 'possibly_sensitive', 'ingested_via',
          'primary_category', 'primary_domain',
        ]);
        const updateData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(merged)) {
          if (WRITABLE_FIELDS.has(key)) updateData[key] = value;
        }
        toUpdate.push({ id: existing.id as string, data: updateData });
      } else {
        skipped++;
      }
    }
  }

  let insertedRows: { id: string; content_text?: string }[] = [];

  if (toInsert.length > 0) {
    const { data, error } = await serviceClient
      .from('bookmarks')
      .insert(toInsert)
      .select('id, content_text');
    if (error) {
      console.error('[mergeUpsert] Insert error:', error);
    } else {
      insertedRows = data ?? [];
    }
  }

  for (const { id, data } of toUpdate) {
    const { error } = await serviceClient
      .from('bookmarks')
      .update(data)
      .eq('id', id);
    if (error) {
      console.error('[mergeUpsert] Update error:', error);
    }
  }

  return {
    inserted: insertedRows.length,
    updated: toUpdate.length,
    skipped,
    insertedRows,
  };
}
