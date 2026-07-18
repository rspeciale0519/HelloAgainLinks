# feature-mobile-sync-trigger — app-open + resume bookmark sync

## GOAL
Make the shipped onboarding promise true ("X bookmarks sync automatically"):
trigger user-mode background sync when the mobile app opens and when it
resumes from background, throttled. No cron. Decision record:
halbrain/journal/2026-07-18.md ("mobile sync-trigger decision research").

## CURRENT STATE (do not rediscover)
- Endpoint: `POST /api/sync/background` (apps/web/src/app/api/sync/background/route.ts).
  User mode = Bearer token auth; cron mode (secret header) exists but is NOT wired — leave it that way.
- Existing manual trigger to copy the call pattern from:
  apps/web/src/app/mobile/more/settings/page.tsx:22 (Bearer ${session.access_token}).
- Mount point: apps/web/src/app/mobile/layout.tsx — already registers
  App.addListener('appUrlOpen', ...) around line 117; add the 'resume' listener alongside.
- Capacitor helpers live in apps/web/src/lib/mobile.ts; @capacitor/preferences is installed.
- Endpoint already writes sync_state.lastSyncAt server-side; throttle client-side anyway
  (Capacitor Preferences timestamp) to avoid a round-trip per app-switch.

## PHASES

### Phase 1 — Branch
Run `/git-workflow-planning:start feature mobile-sync-trigger`.
EXIT CRITERIA: command succeeds; `git branch --show-current` prints feature/mobile-sync-trigger.

### Phase 2 — Implement
In the mobile layout (or a small hook it uses, e.g. apps/web/src/lib/use-auto-sync.ts):
1. On mount with an active Supabase session, and on Capacitor 'resume', fire
   `POST /api/sync/background` (user mode), non-blocking (never delay first render).
2. Throttle: skip if last attempt < 2 minutes ago (Preferences key, e.g. `last_auto_sync_at`).
3. Skip silently when no session. Native platform only (guard via lib/mobile.ts helper).
4. Remove/keep the manual settings-page button — KEEP it (escape hatch).
EXIT CRITERIA: new code shown; repo type-check and lint scripts pass (discover exact
script names from package.json files; if a script doesn't exist, state that and skip it —
same convention as the checkpoint command).

### Phase 3 — Verify + checkpoint
1. `pnpm --filter @helloagain/web build` succeeds; then `pnpm mobile:build` succeeds
   (BUILD_TARGET=mobile static export + cap sync). If cap sync fails for a
   platform-tooling reason unrelated to this change (e.g. missing Android SDK), show the
   error and state why it's environmental — that counts as evidenced.
2. `/git-workflow-planning:checkpoint 1 "app-open + resume auto-sync with throttle"`.
EXIT CRITERIA: build output shown; checkpoint commit exists (`git log --oneline -1`).

### Phase 4 — Wrap up
1. Update docs/dev-docs/DEVELOPMENT_ROADMAP.md Mobile Delivery Track: mark scheduler
   item addressed via app-open/resume sync (cron deliberately deferred — cite the
   decision), per Rule 7.
2. Append halbrain journal entry per halbrain/CLAUDE.md protocol.
3. `/git-workflow-planning:finish` — STOP after the PR to develop is opened. Do not merge.
   PR description must list what needs MANUAL on-device verification by the owner:
   real-device resume-triggered sync, share-sheet unaffected, throttle behavior.
EXIT CRITERIA: PR URL shown in transcript.

## HARD CONSTRAINTS
- Do not wire cron mode, do not add a crons entry, do not touch BOOKMARK_SYNC_SECRET.
- Do not break the manual settings-page sync button.
- Do not touch apps/extension (no extension version bump applies).
- Do not modify onboarding copy.
- No file grows past 450 LOC; no secrets in any commit.

## DEFINITION OF DONE
All phase EXIT CRITERIA evidenced in-transcript, PR open against develop, manual-verification
list in the PR body.
