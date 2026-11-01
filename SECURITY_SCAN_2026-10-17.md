# HAL security scan — 2026-10-17

Repo: HelloAgainLinks (web + Capacitor + Chrome extension). Owner (Rob Speciale) approved this scan. Method: Anthropic security-guidance style — broad sweep, then an independent “try to disprove” pass, then local A/B/admin attack tests. **No production systems, no real cards, no live email/SMS, no prod DB writes.**

Attack tests: 27 passed (`pnpm --filter @helloagain/web test`, vitest 3.2.7, 13 files). Output:

```
Test Files  13 passed (13)
     Tests  27 passed (27)
```

Fixes for confirmed critical/high/medium items that can be done in code are in this branch. Items that need a human (key rotation, history rewrite, prod migration apply, native rebuild) are marked **owner action**.

---

## LIVE SECRET (owner action first)

### C1 — Vercel API tokens are still in git — Critical — **owner action, not changed in this PR**

Anyone with the GitHub repo can use those tokens against the Vercel API (projects, env vars, deployments).

- **Where:** `.claude/settings.local.json` (tracked; token-bearing allow-list entries historically around lines 22–38)
- **Proof:** `git ls-files .claude/settings.local.json` lists the file. Pattern scan of the git blob matches live Vercel token prefixes. This PR **does not edit that file** so the tokens are not pasted again into a GitHub diff.
- **Fix (owner):** 1) Revoke/rotate every Vercel token that ever lived in this file. 2) Remove the file from git (`git rm --cached`) after rotation. 3) Consider history rewrite / GitHub secret scanning. 4) Keep `.gitignore` (already updated here) so it cannot come back.

---

## Critical

### C2 — Next.js unauthenticated RCE advisories on 15.5.14 — Critical — **fixed in PR**

Old Next could be remotely exploitable (Windows RCE + Image Optimization AVIF). Vercel Linux is a weaker match for the Windows issue, but the AVIF advisory is still in range.

- **Where:** `apps/web/package.json` (was `next@^15.5.14`)
- **Proof:** `pnpm audit` reported GHSA-p293-qw3h-jr36 and GHSA-2xp9-vwfh-vxw4 for `>=13.4.0 <15.5.24` / `>=10.0.0 <15.5.24`.
- **Fix:** Bumped to `next@^15.5.28` (patch line). Re-audit no longer lists `next` as critical.

### C3 — Capacitor iOS/Android origin confusion via internal HTTP proxy — Critical — **package bump in PR; native rebuild is owner action**

A malicious page loaded through Capacitor’s internal proxy could run as the app origin and read the WebView session.

- **Where:** `apps/web/package.json` (`@capacitor/ios` / `@capacitor/android` were `^8.0.2`; advisory `>=8.0.0 <=8.3.4`)
- **Proof:** `pnpm audit` GHSA-rvm3-566m-v7fv.
- **Fix:** Bumped packages to `^8.5.3`. **Owner:** run `cap sync` and ship a new Codemagic/iOS+Android build; JS bump alone does not patch the shipped binary.

---

## High

### H1 — X OAuth logs could print access tokens — High — **fixed in PR**

Login errors used to `JSON.stringify` the token response. Vercel logs would then hold X access tokens.

- **Where:** `apps/web/src/app/api/auth/x-callback/route.ts` (was ~107, 114, 190)
- **Proof:** Code stored `tokens = await tokenRes.json()` then logged `JSON.stringify(tokens)`. Regression: `src/lib/redact.test.ts`.
- **Fix:** Log status only; redact helper for remaining JSON; no token bodies.

### H2 — Bookmark sync classified every new row with no classify quota — High — **fixed in PR**

Paid sync still ran one Grok call per imported bookmark. A scripted user could burn AI spend after the cheap “sync” meter.

- **Where:** `apps/web/src/app/api/sync/background/route.ts` (classify loop; now ~188–201)
- **Proof:** Loop called `classifyBookmark` with no `enforceQuota(..., 'classify')`. The dedicated `/api/bookmarks/classify` route already charged that meter.
- **Fix:** Charge `classify` for the batch; skip enrichment if denied. Cron also charges per-user `sync` quota and compares the cron secret in constant time.

### H3 — Mobile share auto-tagged with no plan or quota gate — High — **fixed in PR**

`POST /api/ai/auto-tag` requires Pro + `ai_op` quota. Share-to-app did not, so a free account looping shares got free Grok.

- **Where:** `apps/web/src/app/api/mobile/share/route.ts:60` (now ~63–69)
- **Proof:** `autoTagBookmark(...)` ran for every successful insert. Attack test intent covered in `attack-scenarios.test.ts` + share route change.
- **Fix:** Same Pro + `ai_op` gate. Bookmark still saves if tagging is skipped.

### H4 — Mobile login fallback secret outside production — High — **fixed in PR**

If `MOBILE_AUTH_HANDOFF_SECRET` was unset, any non-production `NODE_ENV` used a hardcoded fallback. A preview deploy could mint session handoffs.

- **Where:** `apps/web/src/lib/mobile-auth-handoff.ts:3-6`
- **Proof:** `process.env.MOBILE_AUTH_HANDOFF_SECRET || (NODE_ENV === 'production' ? null : FALLBACK)`.
- **Fix:** Fallback only when `NODE_ENV === 'development'`. Preview/test must set the env var. **Owner:** confirm `MOBILE_AUTH_HANDOFF_SECRET` is set on Vercel Production and Preview.

### H5 — Cron header compared with `===` and skipped user quotas — High — **fixed in PR**

A leaked `BOOKMARK_SYNC_SECRET` synced 100 users with no per-user quota; string compare also leaked length.

- **Where:** `apps/web/src/app/api/sync/background/route.ts:221-239`
- **Proof:** `if (CRON_SECRET && authHeader === CRON_SECRET)` then `syncUser` with no `enforceQuota`.
- **Fix:** `secretsMatch` (SHA-256 + `timingSafeEqual`) + per-user sync quota in cron. Test: `secrets-match.test.ts`.

---

## Medium

### M1 — Extension import accepted any X bearer + user id — Medium — **fixed in PR**

User A could post a stolen X token and pull that person’s X bookmarks into A’s HAL account (and spend X API credits).

- **Where:** `apps/web/src/app/api/bookmarks/import/route.ts:27-76`
- **Proof:** Body `x_access_token` / `x_user_id` used directly against `api.x.com` with no `/2/users/me` check and no match to `profiles.x_user_id`.
- **Fix:** Verify token owner; reject mismatch with the HAL profile; charge `sync` quota. `/api/import` also charges `sync` quota.

### M2 — OG blend card fetched `avatar_url` with no host allowlist (SSRF) — Medium — **fixed in PR**

If `profiles.avatar_url` is attacker-controlled, `GET /api/blends/[id]/card` fetched it from the server.

- **Where:** `apps/web/src/app/api/blends/[id]/card/route.tsx:42-46`
- **Proof:** `fetch(url)` with no scheme/host check. Tests in `safe-avatar-url.test.ts` reject metadata IPs, localhost, and non-twimg hosts.
- **Fix:** HTTPS + `*.twimg.com` only; `redirect: 'error'`.

### M3 — Stripe webhook granted Pro when price metadata was missing — Medium — **fixed in PR**

`plan = planForPriceId(...) ?? (isLifetime ? 'lifetime' : 'pro')` could upgrade on a session we did not price.

- **Where:** `apps/web/src/app/api/stripe/webhook/route.ts:36-37`
- **Proof:** `resolvePaidPlan` tests: unknown `priceId` + `amountTotal: 0` → `null`.
- **Fix:** Resolve from our price table / unique amount only; skip upgrade if unknown. Signed events still required (`constructEvent`). Idempotency table in migration 013.

### M4 — Any logged-in user could overwrite the shared X GraphQL query id — Medium — **fixed in PR**

One POST with a junk `queryId` broke import for every extension.

- **Where:** `apps/web/src/app/api/x-config/route.ts:45-60`
- **Proof:** No format check. Tests reject URLs and path payloads (`x-query-id.test.ts`).
- **Fix:** `queryId` must be 8–64 URL-safe tokens; features length-capped.

### M5 — No security headers / CSP in the Next config — Medium — **fixed in PR**

Clickjacking and missing CSP.

- **Where:** `apps/web/next.config.ts:5-12` (was headers-empty)
- **Proof:** Repo had no CSP/HSTS/`X-Frame-Options`. Test: `security-headers.test.ts`.
- **Fix:** Headers module wired in `next.config.ts` (`DENY`, nosniff, HSTS, baseline CSP).

### M6 — Tag/folder attach did not check the ids belonged to the caller — Medium — **fixed in PR**

User A could send User B’s `tag_id` / `folder_id` on their own bookmark. App-layer IDOR if RLS/FKs are weak.

- **Where:** `apps/web/src/app/api/bookmarks/[id]/tags/route.ts:31-34`; `.../folders/route.ts:30-32`
- **Proof:** `owned-ids.test.ts` — A requesting `[tag-a, tag-b]` only owns `tag-a`.
- **Fix:** Load owned ids first; 404 if any id is foreign.

### M7 — JWT `sub` decoded before verification for plan prefetch — Medium — **fixed in PR**

A mutated payload could prefetch User B’s plan (not an auth bypass if `getUser` holds, but fail-open on mismatch).

- **Where:** `apps/web/src/lib/auth.ts:28-51`
- **Proof:** `planFromPrefetch(userA, userB, 'max') === 'free'` (`auth-plan.test.ts`).
- **Fix:** Use prefetched plan only when decoded `sub` equals verified `user.id`.

### M8 — `auth.admin.listUsers()` on every returning X login — Medium — **fixed in PR**

Loaded the user directory into the login process.

- **Where:** `apps/web/src/app/api/auth/x-callback/route.ts:147-153`
- **Proof:** `listUsers()` then filter by email.
- **Fix:** Look up `profiles` by `x_user_id`.

### M9 — Playwright console logs were git-tracked — Medium — **fixed in PR**

One log referenced a password grant URL. Not a live key, still should not be in git.

- **Where:** `.playwright-mcp/*.log` (6 files)
- **Proof:** `git ls-files .playwright-mcp` listed them; one file matched `grant_type` / `password`.
- **Fix:** Untracked + `.gitignore`.

### M10 — Android `allowBackup=true` — Medium — **fixed in PR**

Backups can include WebView `localStorage` (Supabase session).

- **Where:** `apps/web/android/app/src/main/AndroidManifest.xml:5`
- **Fix:** `android:allowBackup="false"`.

### M11 — Extension callback accepted session JSON in `?token=` — Medium — **fixed in PR**

Tokens in the query string hit history, Referer, and proxies.

- **Where:** `apps/web/src/app/auth/extension-callback/page.tsx:59-64`
- **Proof:** Only this file parsed `searchParams.get('token')`; nothing else still minted it.
- **Fix:** Session comes only from the in-page Supabase client.

### M12 — `node-tar` critical DoS via Capacitor CLI — Medium — **fixed in PR**

- **Where:** root `package.json` pnpm override (was `tar@7.5.13`, advisory `<=7.5.18`)
- **Fix:** Override `7.5.22`.

### M13 — Mobile handoff replay store was in-process only — Medium — **code + migration in PR; apply is owner action**

On Vercel, two instances could both accept the same handoff+nonce within 120s.

- **Where:** `apps/web/src/lib/mobile-auth-handoff.ts:121-137`
- **Fix:** Insert into `mobile_auth_handoff_replays` (migration `013_security_idempotency_stores.sql`); unique violation → 409. Falls back to memory if the table is not applied yet.
- **Owner:** Apply migration 013 in the Supabase SQL editor (do not run from this agent against prod). Same table set covers Stripe event ids.

---

## Low

### L1 — Unused Chrome `identity` permission — Low — **fixed in PR**

- **Where:** `apps/extension/public/manifest.json:6`
- **Fix:** Removed. No `chrome.identity` usage.

### L2 — Cookie `Secure` only when `NODE_ENV === 'production'` — Low — accepted for local HTTP.

- **Where:** `apps/web/src/app/api/auth/x-login/route.ts:56-61`; `auth/callback/route.ts:45-55`

### L3 — Dashboard middleware fail-open — Low — **not changed** (product)

HTML is served without proving the JWT; data APIs still require `Authorization: Bearer`. Changing this would log out valid localStorage sessions. See `apps/web/src/middleware.ts:84-87`.

---

## Info (survived adversarial pass as design / already mitigated)

| ID | Summary | Notes |
|----|---------|--------|
| I1 | Open redirect on OAuth `redirect` | Already gated by `safeInternalPath`. Extra tests added. |
| I2 | API CSRF | APIs require Bearer, not cookies. |
| I3 | Stripe signature | `constructEvent` already verified; we added idempotency + no default-Pro. |
| I4 | Public blend OG card / invite preview | Intentional share surfaces. UUIDs / 64-bit hex codes. |
| I5 | Supabase anon JWT in CI/Codemagic | Public by design. Safety is RLS. |
| I6 | Base-table RLS not in repo SQL | Prior live check (2026-07-24) said `bookmarks` / `bookmark_tags` RLS on. **Owner:** re-run policies on `profiles` (includes X tokens). |
| I7 | Extension MAIN-world `postMessage` | x.com page JS can spoof interceptor messages. Redesign (per-tab secret / drop MAIN world) is a product change — not in this PR. |
| I8 | `externally_connectable` includes localhost | Dev convenience; store listing should drop it later. |
| I9 | Login `?error=` | UI maps known codes; we still `encodeURIComponent`. |
| I10 | Vitest `tinypool` critical (dev only) | Test runner, not production bundle. |
| I11 | Zero web tests before this PR | Addressed: vitest + `.github/workflows/web-security.yml` (`contents: read` only). |

---

## Disproved (looked scary, did not survive)

- **IDOR on bookmark/folder/conversation GET/PATCH/DELETE:** routes filter `eq('user_id', ctx.userId)` and use the user JWT client.
- **Mass-assign `plan` via profile API:** GET only; checkout amounts are server-side `PRICE_CONFIG`.
- **CORS `*`:** origin must match Capacitor/localhost regex.
- **`Math.random` for tokens:** none. Invite codes use `crypto.randomBytes`.
- **Service role in the browser / `NEXT_PUBLIC_` secrets:** not found.
- **`dangerouslySetInnerHTML` in web:** none. Extension `innerHTML` is static SVG.
- **`pull_request_target` / workflow injection:** workflows are `push` / `workflow_dispatch` only.
- **SQL injection on search:** sanitizers + parameterized RPC.

---

## Owner checklist (do not do from this PR)

1. **Rotate Vercel tokens** that appeared in `.claude/settings.local.json`. Then untrack the file. Consider history rewrite.
2. **Apply** `supabase/migrations/013_security_idempotency_stores.sql` in the dashboard SQL editor (this agent did not touch prod).
3. Confirm **`MOBILE_AUTH_HANDOFF_SECRET`** on Vercel Production and Preview.
4. **Capacitor:** `cap sync` + new iOS/Android build so GHSA-rvm3-566m-v7fv is in the binary.
5. Re-verify **RLS on `profiles`** (X tokens live there) and RPC EXECUTE grants (`search_bookmarks` service_role only).
6. Optional later: MAIN-world extension `postMessage` redesign; drop `localhost` from `externally_connectable` for the store build.
