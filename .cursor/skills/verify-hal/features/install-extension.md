# Install Chrome Extension

Install is the public `/install` page. A visitor reads how to load the HAL Chrome extension and sees a download link. Loading the unpacked extension in Chrome is a separate, machine-local step this skill does not perform.

## Sub-features

- `install-open` shows heading `Install the Chrome Extension`.
- `install-steps` lists steps 1–4 (download, `chrome://extensions`, Load unpacked, browse X).
- `install-download` exposes a link matching `Download Extension` pointing at GitHub releases.
- `install-capabilities` shows `What the Extension Does`.
- `install-home` returns to `/` via the Hello Again Links wordmark.

## How to get to it (user POV)

- Choose `Install Chrome Extension` on `/`.
- Open `/install` directly.
- Land here from marketing copy that tells the user to install the extension.

## Driving it with verify-hal

Preconditions:

- HAL is healthy at `http://127.0.0.1:4370`.
- Doctor has run on this instance.
- No session is required.

- **Open install.** Go to `/install`. Run `node .cursor/skills/verify-hal/scripts/drive.mjs --feature install-extension`. The heading reads `Install the Chrome Extension`. Screenshot `install-page.png`.
- **Steps.** The page contains `Download the Extension`, `Open Chrome Extensions`, `Load the Extension`, and `Browse X & Save`.
- **Download link.** A link named like `Download Extension` has an `https://github.com/` href. Record the href. Do not click it as proof of HAL (it leaves the app).
- **Home.** Choose the `Hello Again Links` wordmark. The landing heading is visible.
- **Proof.** Screenshot shows the install heading, the four steps, and the download link. `drive-report.json` records the href.

## Gotchas

- The download version string on the button (`v0.1.0`) can lag `apps/extension` (`0.5.5` in package.json). Assert the heading and that the link is GitHub, not the version number.
- Building the extension (`pnpm --filter @helloagain/extension build`) is a gate, not this feature. This feature is the web install page.
- Do not automate `chrome://extensions`. That is outside the HAL origin.
- Capacitor / mobile install is a different surface and is not this page.
