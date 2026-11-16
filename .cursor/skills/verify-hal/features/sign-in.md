# Sign in with X

Sign in is the public `/login` page. A visitor starts X OAuth with `Continue with X`. Completing OAuth requires a real X app and a real user account; this skill stops at that boundary.

## Sub-features

- `signin-open` shows `Welcome back` and `Continue with X` from each login entry point.
- `signin-legal` links `Terms` and `Privacy Policy` from the login card.
- `signin-back` returns to `/` via `← Back to home`.
- `signin-oauth-start` navigates to `/api/auth/x-login` and issues the X authorize redirect.
- `signin-error` renders a red error when `?error=` is present (`user_fetch_failed`, `token_failed`, `token_missing`, `no_state`).

## How to get to it (user POV)

- Choose `Sign In` on `/`.
- Choose `Get Started` on `/`.
- Open `/login` directly.
- Open `/login?src=extension` from the Chrome extension (copy changes to "Sign in with X to connect your extension").
- Be redirected from Blend invite or list join when no session exists (`/login?redirect=...`).

## Driving it with verify-hal

Preconditions:

- HAL is healthy at `http://127.0.0.1:4370`.
- Doctor has run on this instance.
- Do not use real X credentials. If `auth_driveable=0`, prove up to the OAuth redirect only.

- **Open login.** Go to `/login`. Run `node .cursor/skills/verify-hal/scripts/drive.mjs --feature sign-in`. The heading reads `Welcome back`. A button named `Continue with X` is enabled. Screenshot `sign-in-page.png`.
- **Legal links.** Choose `Terms`. The URL becomes `/terms`. Return, then choose `Privacy Policy`. The URL becomes `/privacy`.
- **Back to home.** From `/login`, choose `← Back to home`. The heading `Your X Bookmarks, Reimagined` is visible.
- **Start OAuth.** Choose `Continue with X`. The browser hits `/api/auth/x-login`, which must respond with a 3xx toward `https://x.com/i/oauth2/authorize` (or the page URL becomes that authorize URL). Screenshot `sign-in-oauth-boundary.png`. Stop. Do not enter an X account. A 500, a hang on `/login`, or a missing redirect is a failed drive, not a blocked one.
- **Extension copy.** Open `/login?src=extension`. The subtitle reads `Sign in with X to connect your extension`.
- **Error query.** Open `/login?error=no_state`. A red status reads `Session expired. Please try logging in again.`
- **Proof.** Screenshots show the login card identity and the OAuth boundary URL. `drive-report.json` sets `blocked: true` with the reason that OAuth must not be completed in this skill.

## Gotchas

- `/login` is client-rendered. `curl` may not contain `Continue with X`; wait for the heading in the browser.
- `Continue with X` is a full navigation, not a fetch. With placeholder `X_CLIENT_ID` the authorize URL still loads on x.com and will fail there. That is not a HAL bug; it is the expected secret boundary.
- Do not call `/api/auth/x-callback` yourself. That mints a session from X tokens.
- A 302 to x.com is not proof of a successful login. Proof of this feature is the login UI plus the start of the redirect.
- Do not treat a stuck `/login` URL or an `/api/auth/x-login` 500 as the OAuth boundary. Those are regressions; fail the drive.
- Never capture authorization codes, cookies from x.com, or access tokens in evidence.
