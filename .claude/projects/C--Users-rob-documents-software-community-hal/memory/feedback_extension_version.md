---
name: Extension version bumping
description: Always bump Chrome extension version in manifest.json when making any changes to extension code
type: feedback
---

Always bump the extension version in `apps/extension/public/manifest.json` when making ANY changes to extension source files. Use semver: patch for small fixes, minor for new features, major for breaking changes.

**Why:** User had to remind me twice. The version number is how they verify the updated extension is loaded in Chrome.

**How to apply:** Before completing any work that touches files in `apps/extension/`, update the `"version"` field in `apps/extension/public/manifest.json`. Do this as part of the code change, not as an afterthought.
