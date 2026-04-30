// apps/web/src/app/api/folders/import-x/route.ts
//
// Phase 3: receives the assembled folder + assignment list from the
// browser extension's folder-walk import and reconciles it with the
// HAL `folders` and `bookmarks` tables.
//
// Body (validated with Zod):
//   {
//     folders:     Array<{ x_folder_id: string; name: string }>,
//     assignments: Array<{ bookmark_x_post_id: string; x_folder_id: string }>,
//   }
//
// Response: { folders_created, folders_updated, bookmarks_assigned }

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ImportXSchema = z.object({
  folders: z
    .array(
      z.object({
        x_folder_id: z.string().trim().min(1).max(120),
        name: z.string().trim().min(1).max(200),
      }),
    )
    .max(500),
  assignments: z
    .array(
      z.object({
        bookmark_x_post_id: z.string().trim().min(1).max(120),
        x_folder_id: z.string().trim().min(1).max(120),
      }),
    )
    .max(50_000),
});

interface ExistingFolder {
  id: string;
  x_folder_id: string | null;
  name: string;
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = ImportXSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { folders, assignments } = parsed.data;

  // ── 1. Reconcile folders ────────────────────────────────────
  // Pull every existing folder for this user that has an x_folder_id
  // so we can decide between INSERT and UPDATE without round-tripping
  // per row.
  const { data: existing, error: existingErr } = await ctx.userClient
    .from('folders')
    .select('id, x_folder_id, name')
    .eq('user_id', ctx.userId)
    .not('x_folder_id', 'is', null);
  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  const existingMap = new Map<string, ExistingFolder>();
  for (const row of (existing ?? []) as ExistingFolder[]) {
    if (row.x_folder_id) existingMap.set(row.x_folder_id, row);
  }

  let foldersCreated = 0;
  let foldersUpdated = 0;
  // x_folder_id → HAL folder UUID
  const idMap = new Map<string, string>();

  for (const f of folders) {
    const found = existingMap.get(f.x_folder_id);
    if (found) {
      idMap.set(f.x_folder_id, found.id);
      if (found.name !== f.name) {
        const { error } = await ctx.userClient
          .from('folders')
          .update({ name: f.name })
          .eq('id', found.id)
          .eq('user_id', ctx.userId);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        foldersUpdated += 1;
      }
    } else {
      const { data, error } = await ctx.userClient
        .from('folders')
        .insert({ user_id: ctx.userId, name: f.name, x_folder_id: f.x_folder_id })
        .select('id')
        .single();
      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? 'Insert failed' },
          { status: 500 },
        );
      }
      idMap.set(f.x_folder_id, data.id as string);
      foldersCreated += 1;
    }
  }

  // ── 2. Apply assignments ────────────────────────────────────
  // Group by target HAL folder UUID so we can issue one UPDATE per
  // group (Postgres limits UPDATE...WHERE...IN list size; chunk to be
  // safe on large folders).

  const grouped = new Map<string, string[]>();
  for (const a of assignments) {
    const halFolderId = idMap.get(a.x_folder_id);
    if (!halFolderId) continue; // unknown folder — skip silently
    const arr = grouped.get(halFolderId) ?? [];
    arr.push(a.bookmark_x_post_id);
    grouped.set(halFolderId, arr);
  }

  const CHUNK = 500;
  let bookmarksAssigned = 0;

  for (const [halFolderId, postIds] of grouped) {
    for (let i = 0; i < postIds.length; i += CHUNK) {
      const slice = postIds.slice(i, i + CHUNK);
      const { data, error } = await ctx.userClient
        .from('bookmarks')
        .update({ folder_id: halFolderId })
        .eq('user_id', ctx.userId)
        .in('x_post_id', slice)
        .select('id');
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      bookmarksAssigned += data?.length ?? 0;
    }
  }

  return NextResponse.json({
    folders_created: foldersCreated,
    folders_updated: foldersUpdated,
    bookmarks_assigned: bookmarksAssigned,
  });
}
