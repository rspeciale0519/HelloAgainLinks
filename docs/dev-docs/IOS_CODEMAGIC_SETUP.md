# iOS TestFlight via Codemagic — one-time portal setup

`codemagic.yaml` (repo root) defines the build. It cannot run until these
one-time steps are done in the Apple Developer portal, App Store Connect, and
Codemagic — none require a Mac; all are browser + your iPhone (for 2FA).

## 1. Apple Developer portal (developer.apple.com/account)
- Register an **App ID**: Identifiers → `+` → App IDs → Bundle ID `com.helloagainlinks.app` (explicit, not wildcard).
- Note your **Team ID** (top-right membership details) — Codemagic will ask for it.

## 2. App Store Connect (appstoreconnect.apple.com)
- My Apps → `+` → New App. Platform iOS, name "Hello Again Links" (or your choice), bundle ID = the one registered above, SKU = anything unique (e.g. `helloagainlinks-ios`).
- Users and Access → Integrations → App Store Connect API → `+` to generate a new **API key**. Role: App Manager (minimum for TestFlight uploads). Download the `.p8` key **once** — Apple won't let you re-download it.
- TestFlight tab → Internal Testing → create a group named exactly **Internal Testers** (matches `beta_groups` in `codemagic.yaml`) and add your own Apple ID as a tester.

## 3. Codemagic (codemagic.io)
- Sign up, connect your GitHub account, add the `HelloAgainLinks` repo.
- Teams → Integrations → App Store Connect → add integration named **`hal_app_store_connect`** (must match `integrations.app_store_connect` in `codemagic.yaml` exactly). Enter: Issuer ID, Key ID, and the `.p8` file from step 2, plus your Team ID from step 1.
- Codemagic auto-manages the distribution certificate + provisioning profile from that integration — no manual cert/profile files needed.

## 4. First build
- In Codemagic, select the `ios-testflight` workflow and start a build (or push to `develop` — the workflow triggers on push per `codemagic.yaml`).
- On success, the build appears in App Store Connect → TestFlight within a few minutes (Apple's own processing step) and a push notification arrives in the TestFlight app.
- Install the **TestFlight** app from the App Store on your iPhone, accept the internal-tester invite email, install HAL from there.

## Notes
- `beta_groups: [Internal Testers]` skips Apple's external-tester review entirely — internal-group builds are available as soon as Apple's automated processing finishes (usually minutes, not days).
- Every push to `develop` ships a new build automatically once this is wired up. Adjust `branch_patterns` in `codemagic.yaml` if that's too aggressive (e.g. restrict to a `release/*` branch instead).
- The Android workflow (`android-release`) in the same file needs a `hal_android_signing` variable group in Codemagic (keystore + passwords) before it will produce a signed build — lower priority since you don't have an Android device to test on, but the existing GitHub Actions debug-APK build (`.github/workflows/build-android.yml`) already works today for anyone who does.
