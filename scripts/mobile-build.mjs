/**
 * Mobile build script for Capacitor.
 *
 * Next.js output: 'export' fails on server-side Route Handlers, dynamic pages
 * with 'use client', and other non-mobile routes. Solution: temporarily move
 * all non-mobile app subdirectories out before the build, then restore them.
 * The mobile app calls the live Vercel API, so none of those routes are needed
 * in the static bundle.
 */
import { renameSync, readdirSync, statSync, mkdirSync, rmdirSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, join } from 'path';

// Windows can hold a handle on a directory inode (EPERM/EBUSY on rename) while
// its children remain movable. Fall back to moving children and leaving the
// husk dir in place; Next.js ignores empty route directories.
function moveDir(src, dest) {
  try {
    renameSync(src, dest);
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
    mkdirSync(dest, { recursive: true });
    for (const child of readdirSync(src)) {
      moveDir(join(src, child), join(dest, child));
    }
  }
}

function restoreDir(src, dest) {
  try {
    renameSync(src, dest);
  } catch (err) {
    if (err.code !== 'EPERM' && err.code !== 'EBUSY' && err.code !== 'ENOTEMPTY' && err.code !== 'EEXIST') throw err;
    mkdirSync(dest, { recursive: true });
    for (const child of readdirSync(src)) {
      restoreDir(join(src, child), join(dest, child));
    }
    try { rmdirSync(src); } catch { /* husk held by another process — harmless */ }
  }
}

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
mkdirSync(backupDir, { recursive: true });

console.log(`→ Moving ${entries.length} non-mobile directories out of app/...`);
for (const name of entries) {
  moveDir(join(appDir, name), join(backupDir, name));
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
    restoreDir(join(backupDir, name), join(appDir, name));
  }
  try { rmdirSync(backupDir); } catch { /* ignore if not empty */ }
  console.log('→ Done.');
}
