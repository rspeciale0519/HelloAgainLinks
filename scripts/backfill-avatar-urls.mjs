// One-shot: applies migration 009 by populating x_author_avatar_url for
// every legacy bookmark row that's still NULL. Groups rows by handle so we
// issue one PATCH per unique author instead of per bookmark.
//
// Usage: node scripts/backfill-avatar-urls.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', 'apps', 'web', '.env.local');

function loadEnv(path) {
  const raw = readFileSync(path, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return env;
}

const env = loadEnv(envPath);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${body}`);
  }
  return res;
}

async function fetchHandlesNeedingBackfill() {
  // Enumerate every handle. Filtering for "needs update" via PostgREST gets
  // ugly because the URL pattern contains `?`; we instead let each PATCH
  // filter precisely (no-op when the row is already correct).
  const handles = new Map(); // handle → row count
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const res = await rest(
      `bookmarks?select=x_author_handle&x_author_handle=not.is.null`,
      { headers: { Range: `${from}-${from + pageSize - 1}` } },
    );
    const rows = await res.json();
    if (rows.length === 0) break;

    for (const r of rows) {
      const h = r.x_author_handle;
      if (!h) continue;
      handles.set(h, (handles.get(h) ?? 0) + 1);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return handles;
}

async function patchHandle(handle, expected) {
  // `?fallback=false` lets unavatar 404 for unknown handles so the Avatar
  // primitive falls through to the lettered-circle tier instead of
  // showing unavatar's generic silhouette.
  const url = `https://unavatar.io/x/${encodeURIComponent(handle)}?fallback=false`;
  // Match rows that are either still NULL or that hold the old query-less
  // URL the first pass wrote. Matching the new URL exactly is a no-op so
  // we skip those without listing them.
  const oldUrl = `https://unavatar.io/x/${encodeURIComponent(handle)}`;
  const filter =
    `x_author_handle=eq.${encodeURIComponent(handle)}` +
    `&or=(x_author_avatar_url.is.null,x_author_avatar_url.eq.${encodeURIComponent(oldUrl)})`;
  const res = await rest(
    `bookmarks?${filter}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ x_author_avatar_url: url }),
    },
  );
  const updated = await res.json();
  // We don't compare to `expected` — a partial update is normal because
  // some rows for this handle may already hold the target URL from an
  // earlier run.
  return updated.length;
}

async function main() {
  console.log('Scanning for bookmarks with NULL x_author_avatar_url …');
  const handles = await fetchHandlesNeedingBackfill();
  const totalRows = [...handles.values()].reduce((a, b) => a + b, 0);

  console.log(`Found ${totalRows} rows across ${handles.size} unique handles.`);
  if (totalRows === 0) {
    console.log('Nothing to do.');
    return;
  }

  let processed = 0;
  let updated = 0;
  for (const [handle, count] of handles) {
    try {
      updated += await patchHandle(handle, count);
    } catch (err) {
      console.error(`  ✖ ${handle}:`, err.message);
    }
    processed++;
    if (processed % 25 === 0 || processed === handles.size) {
      console.log(`  … ${processed}/${handles.size} handles, ${updated}/${totalRows} rows`);
    }
  }

  console.log(`Done. Updated ${updated}/${totalRows} rows across ${handles.size} handles.`);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
