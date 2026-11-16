#!/usr/bin/env node
/**
 * One-shot: launch, doctor, drive ONE feature, cleanup, confirm evidence survived.
 * Usage: node .cursor/skills/verify-hal/scripts/run.mjs --feature landing
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FEATURES = ['landing', 'sign-in', 'legal', 'install-extension', 'dashboard-bookmarks'];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: path.resolve(SCRIPT_DIR, '../../../..'),
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited ${code}`));
    });
  });
}

async function main() {
  const feature = arg('--feature', 'landing');
  if (!FEATURES.includes(feature)) {
    console.error(`verify-hal run: --feature must be one of ${FEATURES.join(', ')}`);
    process.exit(1);
  }

  const launch = path.join(SCRIPT_DIR, 'launch.sh');
  const doctor = path.join(SCRIPT_DIR, 'doctor.sh');
  const drive = path.join(SCRIPT_DIR, 'drive.mjs');
  const cleanup = path.join(SCRIPT_DIR, 'cleanup.sh');

  let evidenceDir = null;
  try {
    await run('bash', [launch]);
    await run('bash', [doctor]);
    const current = process.env.HAL_VERIFY_STATE_DIR || '/tmp/hal-verify';
    evidenceDir = (await readFile(path.join(current, 'current', 'evidence'), 'utf8')).trim();
    await run('node', [drive, '--feature', feature]);
  } finally {
    try {
      await run('bash', [cleanup]);
    } catch (err) {
      console.error(`verify-hal run: cleanup failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (!evidenceDir || !existsSync(evidenceDir)) {
    console.error(`verify-hal run: FAIL: evidence directory missing after cleanup: ${evidenceDir}`);
    process.exit(1);
  }
  const files = readdirSync(evidenceDir);
  if (files.length === 0) {
    console.error(`verify-hal run: FAIL: evidence directory empty after cleanup: ${evidenceDir}`);
    process.exit(1);
  }
  console.log(`verify-hal run: evidence survived cleanup at ${evidenceDir}`);
  for (const file of files.sort()) console.log(`  - ${file}`);
}

main().catch((err) => {
  console.error(`verify-hal run: FAIL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
