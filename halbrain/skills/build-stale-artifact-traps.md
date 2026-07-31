---
type: skill
area: build
status: active
confidence: established
updated: 2026-07-31
sources:
  - journal/2026-07-26 (dist gotcha 3rd+4th hits, mobile-bundle realization, deploy-coupling incident)
  - journal/2026-07-27 (packages/ui dist, 5th hit)
  - journal/2026-07-28 (native bundle predates fixes)
  - scripts/mobile-build.mjs
---

# Stale-artifact traps — the code you edited is not the code that runs

## When to use
Before claiming any hal change is "done", and FIRST when a shipped fix
"didn't take" — check which artifact the affected surface actually loads
before debugging source.

## The approach
Four surfaces, four different artifacts, four rebuild/ship steps:

| Surface | Runs from | Updated by |
|---|---|---|
| `packages/shared`, `packages/ui`, `packages/ui/hal` | that package's `dist/` | `npx tsc` in the package (or `turbo build`) — app sees NOTHING until then |
| Chrome extension | `apps/extension/dist/` | `pnpm build` in the extension, then reload the unpacked extension — bumping `public/manifest.json` alone changes nothing |
| Mobile app UI (`apps/web/src/app/mobile/**`) | static export baked into the Capacitor/TestFlight binary | a **Codemagic build** — a Vercel deploy CANNOT update mobile UI; only `/api/*` runs on Vercel |
| Web app + API routes | Vercel deployment | push to `develop`/`main`; verify the deployment is Ready on the expected commit |

**Deploy-coupling order rule:** the extension and web app are a matched pair
for the auth handshake. Ship the web side first, let Vercel finish, THEN
rebuild/reload the extension. The reverse strands users on `/auth/set-session`
(bit us on 07-26: new extension + unpushed web = `?error=no_tokens`).

**Also check the version end-to-end:** extension version must be bumped in
BOTH `package.json` and `public/manifest.json`, then rebuilt — a reloaded
extension showing the old version means no rebuild happened, not a bad bump.

## Pitfalls & anti-patterns
- Editing `packages/*/src` and immediately type-checking/running the app — hit
  5+ separate times across 07-26/07-27 before this skill existed.
- Concluding "prod still runs old code" (or the reverse) from behavior alone —
  verify the Vercel deployments page / Codemagic build commit hash instead.
- Telling the user to rebuild the mobile app for an API-only fix (waste), or
  to wait for Vercel for a mobile-UI fix (will never arrive).

## Evidence
- 07-26 13:45: "Up to date" message persisted after deploy — mobile bundle
  baked; explained the entire "fix didn't work" report.
- 07-26 19:48: mixed-state incident (extension rebuilt before web push).
- 07-27 20:42 + 07-26 14:51/15:51: `packages/ui`/`shared` dist rebuilds needed
  before changes were visible (logo stayed stale on 07-20 for the same reason).

## Revision log
- 2026-07-31: created at consolidation, distilled from journals 07-26 → 07-28.
