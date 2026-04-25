// apps/web/src/app/api/folders/route.ts
//
// Phase 3 (HAL redesign): single-folder semantics matching X.com.
// GET returns { folders: FolderRow[] } with bookmark counts via the
// `get_folders_with_counts` RPC (migration 006).
// POST inserts a new folder and returns { folder }.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { PLAN_LIMITS } from '@helloagain/shared';

export const dynamic = 'force-dynamic';

interface FolderWithCount {
  id: string;
  name: string;
  x_folder_id: string | null;
  created_at: string;
  updated_at: string;
  bookmark_count: number;
}

const CreateFolderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  x_folder_id: z.string().trim().max(120).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const { data, error } = await ctx.userClient.rpc('get_folders_with_counts', {
    p_user_id: ctx.userId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ folders: (data ?? []) as FolderWithCount[] });
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

  const parsed = CreateFolderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Plan limit guard.
  const limit = PLAN_LIMITS[ctx.plan].folders;
  if (limit !== Infinity) {
    const { count } = await ctx.userClient
      .from('folders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);
    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: `Folder limit reached (${limit}). Upgrade to Pro.` },
        { status: 403 },
      );
    }
  }

  const { data, error } = await ctx.userClient
    .from('folders')
    .insert({
      user_id: ctx.userId,
      name: parsed.data.name,
      x_folder_id: parsed.data.x_folder_id ?? null,
    })
    .select('id, name, x_folder_id, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(
    { folder: { ...data, bookmark_count: 0 } },
    { status: 201 },
  );
}
