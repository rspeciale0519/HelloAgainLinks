# Legal pages

Legal pages let a visitor read the Privacy Policy and Terms of Service and move between them and home without signing in.

## Sub-features

- `legal-privacy` renders `/privacy` with heading `Privacy Policy`.
- `legal-terms` renders `/terms` with heading `Terms of Service`.
- `legal-cross-links` moves privacy → terms and terms → privacy.
- `legal-home` returns to `/` from either page via `Home`.
- `legal-from-login` reaches both pages from the `/login` card links `Terms` and `Privacy Policy`.

## How to get to it (user POV)

- Open `/privacy` or `/terms` directly.
- Choose `Terms` or `Privacy Policy` on `/login`.
- Choose `Terms of Service` on `/privacy`.
- Choose `Privacy Policy` on `/terms`.

## Driving it with verify-hal

Preconditions:

- HAL is healthy at `http://127.0.0.1:4370`.
- Doctor has run on this instance.
- No session is required.

- **Open privacy.** Go to `/privacy`. Run `node .cursor/skills/verify-hal/scripts/drive.mjs --feature legal`. The heading reads `Privacy Policy`. A link named `Terms of Service` is visible. Screenshot `legal-privacy.png`.
- **Privacy to terms.** Choose `Terms of Service`. The URL becomes `/terms` and the heading reads `Terms of Service`. Screenshot `legal-terms.png`.
- **Terms home.** Choose `Home`. The heading `Your X Bookmarks, Reimagined` is visible. Screenshot `legal-home.png`.
- **Login entry.** From `/login`, choose `Terms`, then return and choose `Privacy Policy`. Both headings match the routes above.
- **Proof.** Screenshots show the HelloAgain title line (`HelloAgain (helloagainlinks.com)`) on both legal pages and a return to landing.

## Gotchas

- These two routes are server-rendered. `curl` can confirm the heading, but the proof still needs browser screenshots of the user path.
- Do not treat a 200 on an unknown path as a legal page. Assert the heading text.
- Contact email is on both pages. Do not send mail as part of verification.
