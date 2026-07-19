/**
 * Mobile build script for Capacitor.
 *
 * Next.js output: 'export' fails on server-side Route Handlers, dynamic pages
 * with 'use client', and other non-mobile routes. Solution: temporarily move
 * all non-mobile app subdirectories out before the build, then restore them.
 * The mobile app calls the live Vercel API, so none of those routes are needed
 * in the static bundle.
 */
import { renameSync, readdirSync, statSync, mkdirSync, rmdirSync, readFileSync, existsSync } from 'fs';
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

// Fail loudly if the client env the mobile bundle hard-requires is absent.
// NEXT_PUBLIC_* values are inlined into the static bundle at build time; if
// they are missing they compile to `undefined`, and createBrowserClient()
// throws on first authed render — a returning user lands on /mobile/home,
// which constructs the Supabase client on mount, so the app dies on launch
// with a bare "client-side exception". A build once shipped to TestFlight
// this way. Precedence mirrors Next: real process env (the Codemagic env
// group on CI) wins; apps/web/.env.local is the local fallback.
function hasBuildEnv(key) {
  // Shell-defined vars win and are authoritative even when empty — this is
  // Next's own precedence, so an empty CI var must fail the guard, not be
  // masked by .env.local.
  if (key in process.env) return Boolean(process.env[key]);
  const envLocal = resolve(root, 'apps/web/.env.local');
  if (!existsSync(envLocal)) return false;
  return readFileSync(envLocal, 'utf8')
    .split(/\r?\n/)
    .some((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      return match && match[1] === key && match[2].replace(/^['"]|['"]$/g, '').length > 0;
    });
}
const REQUIRED_PUBLIC_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const missingEnv = REQUIRED_PUBLIC_ENV.filter((key) => !hasBuildEnv(key));
if (missingEnv.length > 0) {
  console.error(`\nERROR: mobile build is missing required client env: ${missingEnv.join(', ')}`);
  console.error('These are inlined into the static bundle at build time; without them the');
  console.error('app throws a client-side exception on launch. Set them in the Codemagic');
  console.error('env group (hal_mobile_env) for CI, or apps/web/.env.local locally.\n');
  process.exit(1);
}

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
