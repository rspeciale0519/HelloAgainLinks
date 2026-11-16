#!/usr/bin/env node
/**
 * Drive one mapped Hello Again Links feature in Chromium.
 * Usage: node .cursor/skills/verify-hal/scripts/drive.mjs --feature landing
 * Requires: a live instance from launch.sh (or --base-url) and Playwright Chromium.
 */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
const STATE_DIR = process.env.HAL_VERIFY_STATE_DIR || '/tmp/hal-verify';
const CURRENT = path.join(STATE_DIR, 'current');

const FEATURES = ['landing', 'sign-in', 'legal', 'install-extension', 'dashboard-bookmarks'];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function fail(message, extra) {
  console.error(`verify-hal drive: FAIL: ${message}`);
  if (extra) console.error(extra);
  process.exit(1);
}

async function readCurrent(file) {
  const p = path.join(CURRENT, file);
  if (!existsSync(p)) return null;
  return (await readFile(p, 'utf8')).trim();
}

async function screenshot(page, evidenceDir, name) {
  const file = path.join(evidenceDir, name);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function writeReport(evidenceDir, report) {
  const file = path.join(evidenceDir, 'drive-report.json');
  await writeFile(file, `${JSON.stringify(report, null, 2)}\n`);
  return file;
}

async function driveLanding(page, url, evidenceDir) {
  const steps = [];
  await page.goto(`${url}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Your X Bookmarks, Reimagined' }).waitFor({ timeout: 20000 });
  const signIn = page.getByRole('link', { name: 'Sign In' });
  const getStarted = page.getByRole('link', { name: 'Get Started' });
  const install = page.getByRole('link', { name: 'Install Chrome Extension' });
  await signIn.waitFor();
  await getStarted.waitFor();
  await install.waitFor();
  steps.push({
    action: 'open-home',
    result: 'heading Your X Bookmarks, Reimagined; nav Sign In and Get Started',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'landing-home.png')),
  });

  await getStarted.click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await page.getByRole('button', { name: 'Continue with X' }).waitFor();
  steps.push({
    action: 'get-started',
    result: 'login page with Continue with X',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'landing-get-started.png')),
  });

  await page.goto(`${url}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Sign In' }).click();
  await page.waitForURL(/\/login/, { timeout: 15000 });
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  steps.push({
    action: 'sign-in',
    result: 'Sign In also lands on /login with Welcome back',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'landing-sign-in.png')),
  });

  await page.goto(`${url}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Install Chrome Extension' }).click();
  await page.waitForURL(/\/install/, { timeout: 15000 });
  await page.getByRole('heading', { name: 'Install the Chrome Extension' }).waitFor();
  steps.push({
    action: 'install-cta',
    result: 'install page heading visible; download stays on GitHub (not followed)',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'landing-install.png')),
  });

  return { feature: 'landing', blocked: false, steps };
}

async function driveSignIn(page, url, evidenceDir) {
  const steps = [];
  await page.goto(`${url}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Welcome back' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Continue with X' }).waitFor();
  await page.getByRole('link', { name: 'Terms' }).waitFor();
  await page.getByRole('link', { name: 'Privacy Policy' }).waitFor();
  steps.push({
    action: 'open-login',
    result: 'Welcome back + Continue with X + Terms/Privacy links',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'sign-in-page.png')),
  });

  let xLogin = null;
  const onResponse = (res) => {
    try {
      if (new URL(res.url()).pathname === '/api/auth/x-login') xLogin = res;
    } catch {
      /* ignore */
    }
  };
  page.on('response', onResponse);
  const started = Date.now();
  await page.getByRole('button', { name: 'Continue with X' }).click({ noWaitAfter: true });
  while (Date.now() - started < 15000) {
    if (xLogin) break;
    if (/oauth2\/authorize/i.test(page.url())) break;
    await page.waitForTimeout(100);
  }
  page.off('response', onResponse);

  const status = xLogin ? xLogin.status() : null;
  const location = xLogin ? xLogin.headers().location || '' : '';
  const finalUrl = page.url();
  const towardX = /oauth2\/authorize/i.test(location) || /oauth2\/authorize/i.test(finalUrl);
  steps.push({
    action: 'continue-with-x',
    result: `x-login HTTP ${status ?? 'none'}; location=${location || finalUrl}`,
    screenshot: path.basename(await screenshot(page, evidenceDir, 'sign-in-oauth-boundary.png')),
  });

  if (!xLogin && !towardX) {
    fail(`Continue with X did not hit /api/auth/x-login (still at ${finalUrl})`);
  }
  if (status !== null && (status < 300 || status >= 400) && !towardX) {
    fail(`/api/auth/x-login returned HTTP ${status}; expected a redirect toward X authorize`);
  }
  if (!towardX) {
    fail(
      `/api/auth/x-login did not redirect toward X authorize (HTTP ${status}, location=${location}, url=${finalUrl})`,
    );
  }

  let reason =
    'X OAuth is the production login. The authorize redirect ran; do not complete it with real credentials or user data.';
  if (/verification-placeholder/i.test(`${location} ${finalUrl}`)) {
    reason =
      'X_CLIENT_ID is the verification placeholder. OAuth cannot complete without a real X app client. Stopped at the redirect boundary.';
  }
  return { feature: 'sign-in', blocked: true, blockedReason: reason, steps };
}

async function driveLegal(page, url, evidenceDir) {
  const steps = [];
  await page.goto(`${url}/privacy`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Privacy Policy' }).waitFor({ timeout: 20000 });
  await page.getByRole('link', { name: 'Terms of Service' }).waitFor();
  steps.push({
    action: 'open-privacy',
    result: 'Privacy Policy heading and Terms of Service link',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'legal-privacy.png')),
  });

  await page.getByRole('link', { name: 'Terms of Service' }).click();
  await page.waitForURL(/\/terms/, { timeout: 15000 });
  await page.getByRole('heading', { name: 'Terms of Service' }).waitFor();
  await page.getByRole('link', { name: 'Privacy Policy' }).waitFor();
  steps.push({
    action: 'privacy-to-terms',
    result: 'Terms of Service heading and Privacy Policy link',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'legal-terms.png')),
  });

  await page.getByRole('link', { name: 'Home' }).click();
  await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 15000 });
  await page.getByRole('heading', { name: 'Your X Bookmarks, Reimagined' }).waitFor();
  steps.push({
    action: 'terms-home',
    result: 'returned to landing heading',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'legal-home.png')),
  });
  return { feature: 'legal', blocked: false, steps };
}

async function driveInstall(page, url, evidenceDir) {
  const steps = [];
  await page.goto(`${url}/install`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Install the Chrome Extension' }).waitFor({ timeout: 20000 });
  const download = page.getByRole('link', { name: /Download Extension/ });
  await download.waitFor();
  const href = await download.getAttribute('href');
  steps.push({
    action: 'open-install',
    result: `install heading visible; download href=${href}`,
    screenshot: path.basename(await screenshot(page, evidenceDir, 'install-page.png')),
  });
  if (!href || !href.includes('github.com')) {
    fail('Download Extension link is missing or not a GitHub releases URL', href);
  }
  return { feature: 'install-extension', blocked: false, steps };
}

async function driveDashboard(page, url, evidenceDir) {
  const steps = [];
  await page.goto(`${url}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const body = await page.locator('body').innerText();
  steps.push({
    action: 'open-dashboard',
    result: 'rendered dashboard chrome without a session',
    screenshot: path.basename(await screenshot(page, evidenceDir, 'dashboard-unauthenticated.png')),
    bodyExcerpt: body.slice(0, 500),
  });
  const hasQuerying = /QUERYING/.test(body);
  const hasHello = /Hello/.test(body);
  return {
    feature: 'dashboard-bookmarks',
    blocked: true,
    blockedReason:
      'Dashboard bookmarks require a signed-in Supabase session from X OAuth. Middleware does not redirect anonymous users; home stays on QUERYING… when getSession() is empty. Do not mint a real session or use real user data for verification.',
    observed: { hasQuerying, hasHello },
    steps,
  };
}

async function main() {
  const feature = arg('--feature');
  if (!feature || !FEATURES.includes(feature)) {
    fail(`--feature must be one of: ${FEATURES.join(', ')}`);
  }

  const url = arg('--base-url') || (await readCurrent('url'));
  if (!url) fail('No --base-url and no current launch. Run launch.sh first.');

  const runId = (await readCurrent('run_id')) || new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const evidenceDir =
    arg('--evidence') ||
    process.env.HAL_VERIFY_EVIDENCE_DIR ||
    (await readCurrent('evidence')) ||
    path.join(SKILL_DIR, 'evidence', runId);
  await mkdir(evidenceDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));

  let report;
  try {
    if (feature === 'landing') report = await driveLanding(page, url, evidenceDir);
    else if (feature === 'sign-in') report = await driveSignIn(page, url, evidenceDir);
    else if (feature === 'legal') report = await driveLegal(page, url, evidenceDir);
    else if (feature === 'install-extension') report = await driveInstall(page, url, evidenceDir);
    else report = await driveDashboard(page, url, evidenceDir);
  } catch (err) {
    await screenshot(page, evidenceDir, `${feature}-error.png`).catch(() => {});
    await browser.close();
    fail(err instanceof Error ? err.message : String(err));
  }

  report = {
    ...report,
    url,
    runId,
    evidenceDir,
    pageErrors: errors.slice(0, 10),
    recordedAt: new Date().toISOString(),
  };
  const reportFile = await writeReport(evidenceDir, report);
  await browser.close();
  console.log(`verify-hal drive: ${feature} ${report.blocked ? 'BLOCKED' : 'OK'}`);
  console.log(`verify-hal drive: evidence ${evidenceDir}`);
  console.log(`verify-hal drive: report ${reportFile}`);
  if (report.blocked) {
    console.log(`verify-hal drive: blockedReason=${report.blockedReason}`);
  }
  // Public features must fully pass. Blocked authenticated features still write evidence.
  if (!report.blocked && errors.some((e) => /hydration|application error/i.test(e))) {
    fail('page errors during an otherwise successful drive', errors.join('\n'));
  }
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
