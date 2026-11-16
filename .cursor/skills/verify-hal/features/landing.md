# Landing

Landing is the public marketing home at `/`. A visitor sees the HAL identity, can start sign-in, and can open the Chrome extension install instructions.

## Sub-features

- `landing-identity` shows the product name and the heading `Your X Bookmarks, Reimagined`.
- `landing-nav-anon` shows `Sign In` and `Get Started` when there is no session.
- `landing-get-started` takes an anonymous visitor to `/login`.
- `landing-install` takes a visitor to `/install`.
- `landing-features` jumps to the in-page `#features` cards (Smart Search, AI Auto-Tagging, Bookmark Blend).

## How to get to it (user POV)

- Open `/` in a browser.
- Choose `Home` from `/privacy` or `/terms`.
- Choose `← Back to home` from `/login`.
- Choose the Hello Again Links wordmark on `/install`.

## Driving it with verify-hal

Preconditions:

- HAL is healthy at `http://127.0.0.1:4370`.
- `verify-hal` doctor reports the expected URL and `auth_driveable` may be `0`.
- No session cookies are required.

- **Open home.** Go to `/`. Run `node .cursor/skills/verify-hal/scripts/drive.mjs --feature landing`. The heading reads `Your X Bookmarks, Reimagined`. Links named `Sign In`, `Get Started`, and `Install Chrome Extension` are visible. Screenshot `landing-home.png` shows the HAL name in the nav.
- **Get Started.** Choose `Get Started`. The driver clicks the link named `Get Started`. The URL becomes `/login` and the heading reads `Welcome back` with a button named `Continue with X`. Screenshot `landing-get-started.png`.
- **Install CTA.** Return to `/` and choose `Install Chrome Extension`. The URL becomes `/install` and the heading reads `Install the Chrome Extension`. Screenshot `landing-install.png`.
- **Sign In (same destination as Get Started).** From `/`, choose `Sign In`. The URL becomes `/login`. If you already proved Get Started in this run, still hit this entry point once; do not skip it as "the same page."
- **See Features.** From `/`, choose `See Features`. The page stays on `/` and the `#features` region shows cards titled `Smart Search`, `AI Auto-Tagging`, and `Bookmark Blend`.
- **Proof.** `drive-report.json` lists `feature: landing` and the home / login / install screenshots. The HAL identity is readable in `landing-home.png`.

## Gotchas

- `/` is a client page. `curl` of the HTML shell may omit `Sign In` / `Get Started`; prove them in the browser DOM, not with grep on the first response body.
- When a session exists, nav swaps to a `Dashboard` link. An anonymous verify run must see `Sign In` and `Get Started`. If you see `Dashboard`, you are in someone else's session — stop and relaunch.
- `useAuth` talks to Supabase on load. Placeholder env can log console errors; the anonymous nav still renders because `!loading && user` is false while loading. Do not treat a Supabase network error as a failed landing.
- Do not follow `Install Chrome Extension` through to GitHub as proof of this feature. The HAL observable is the `/install` page.
