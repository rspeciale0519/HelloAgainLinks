/**
 * Mobile build script for Capacitor.
 *
 * Next.js output: 'export' fails on server-side Route Handlers, dynamic pages
 * with 'use client', and other non-mobile routes. Solution: temporarily move
 * all non-mobile app subdirectories out before the build, then restore them.
 * The mobile app calls the live Vercel API, so none of those routes are needed
 * in the static bundle.
 */
import { renameSync, readdirSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const appDir = resolve(root, 'apps/web/src/app');
const backupDir = resolve(root, 'apps/web/src/.app-mobile-backup');

// Directories to keep during mobile build (only mobile routes + shared assets)
const KEEP = new Set(['mobile']);

// Collect all subdirectories to temporarily move out
const entries = readdirSync(appDir).filter((name) => {
  const full = join(appDir, name);
  return statSync(full).isDirectory() && !KEEP.has(name);
});

if (entries.length === 0) {
  console.error('ERROR: no subdirectories found in src/app — already in a bad state?');
  process.exit(1);
}

// Create backup container
import { mkdirSync } from 'fs';
mkdirSync(backupDir, { recursive: true });

console.log(`→ Moving ${entries.length} non-mobile directories out of app/...`);
for (const name of entries) {
  renameSync(join(appDir, name), join(backupDir, name));
}

try {
  console.log('→ Running Next.js static export build (mobile only)...');
  execSync('pnpm --filter @helloagain/web run build', {
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'mobile' },
  });

  console.log('→ Running cap sync...');
  execSync('pnpm --filter @helloagain/web exec cap sync', { stdio: 'inherit' });
} finally {
  console.log('→ Restoring app directories...');
  for (const name of entries) {
    renameSync(join(backupDir, name), join(appDir, name));
  }
  // Remove the backup container (now empty)
  import('fs').then(({ rmdirSync }) => {
    try { rmdirSync(backupDir); } catch { /* ignore if not empty */ }
  });
  console.log('→ Done.');
}
