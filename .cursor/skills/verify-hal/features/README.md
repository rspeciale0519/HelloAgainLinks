# Hello Again Links verification map

This directory is the maintained source for verifying the user-facing behavior of Hello Again Links (HAL). Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch HAL with `bash .cursor/skills/verify-hal/scripts/launch.sh` at `http://127.0.0.1:4370` (or `$HAL_VERIFY_PORT`).
- Run `bash .cursor/skills/verify-hal/scripts/doctor.sh` and require the HAL identity string, our pid, and our port.
- Never drive an instance that was not started by this verification run.
- If doctor prints `auth_driveable=0`, drive public features only (`landing`, `sign-in` up to the OAuth boundary, `legal`, `install-extension`). Treat `dashboard-bookmarks` as blocked until a disposable local session exists — and do not create one with real X credentials or real user data.
- Seed data: none. The web app has no local fixture directory. Public pages render without a database. Authenticated pages talk to Supabase; there is no in-repo mock.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer heading, link, and button accessible names over CSS selectors or coordinates. This UI has almost no `aria-*` on marketing pages.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser actions through `node .cursor/skills/verify-hal/scripts/drive.mjs --feature <id>`.
- Do not follow the X OAuth redirect through to a real login. Do not click the GitHub "Download Extension" link as proof of HAL.
- Restore nothing after a public-page drive (no mutations). Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes screenshots under `.cursor/skills/verify-hal/evidence/<run_id>/` and `drive-report.json` with the feature id.
- Mutation proof does not apply to the public pages. Do not call write APIs to fake it.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with verify-hal` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Landing](./landing.md) covers the marketing home page, Get Started / Sign In, and the install CTA.
- [Sign in with X](./sign-in.md) covers the login page up to the OAuth boundary.
- [Legal pages](./legal.md) covers Privacy Policy and Terms of Service and the links between them.
- [Install Chrome Extension](./install-extension.md) covers the install instructions page.
- [Dashboard bookmarks](./dashboard-bookmarks.md) covers the signed-in home and bookmark library. Blocked without a session.
