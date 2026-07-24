---
type: skill
area: auth
status: current
confidence: established
updated: 2026-07-24
sources:
  - journal/2026-07-19
  - journal/2026-07-20
  - apps/web/src/lib/supabase-browser.ts
  - apps/web/src/app/mobile/onboarding/page.tsx
---

# Retesting a client-side session change requires a clean sign-out → sign-in

## When to use
After changing **where or how the client stores/reads a session** (storage
adapter, cookie→localStorage, auth-fetch base URL, paging/session bootstrap) and
shipping it to an already-installed shell — the mobile/TestFlight app especially,
but the same trap exists on web.

## The approach
A shell that was already logged in from a **previous build** holds its session in
the **old** location. New code looks in the new location, finds nothing (or
something stale), and behaves like the fix failed. It did not.

1. Before diagnosing a "the fix didn't work" report, ask/verify whether the user
   did a **clean Sign Out → Sign In** on the new build. Do that first.
2. Diagnose from **server logs / status codes**, not UI impressions — "still
   shows Loading" is compatible with several very different causes. A `200` vs
   `400` vs `405` on the actual request settles it immediately.
3. Only after a clean re-login still fails should you treat it as a code defect.

## Pitfalls & anti-patterns
- **`onboarding_complete` (or any "has the user been here" flag) ≠ has-session.**
  A shell can render as "logged in" off a persisted flag while holding no valid
  session at all. Never treat a UI logged-in state as evidence of a session.
- **This cost time twice in the same epic** — first read as a session-persistence
  bug, then as a paging bug. Both times the actual remedy was a clean re-login on
  the new build; the second time there *was* also a real bug (0-indexed paging),
  which is exactly why the stale shell is so good at hiding real causes.
- A failed fetch that returns early without clearing `loading` turns any API error
  into a permanent spinner — the same symptom as a session problem. Always clear
  loading state on the failure path so the UI distinguishes "error" from "hanging".

## Evidence
- [[journal/2026-07-19]] [20:35] and [[journal/2026-07-20]] [00:40]: build 10
  "still shows Loading" was **not** a fix failure — a carried-over logged-in shell
  from build 9 held the session in the old cookie store rather than localStorage;
  resolved by a fresh sign-in.
- [[journal/2026-07-20]] [00:40] RESOLVED: after a clean Sign Out → Sign In on
  build 11, every page loaded; confirmed by prod logs `GET /api/bookmarks 200`
  (previously `400`) and tags `200`.

## Revision log
- 2026-07-24 — created during first brain consolidation. Distilled from the
  mobile launch epic, where the same stale-shell trap recurred twice across
  separate diagnoses. Confidence `established`: two independent occurrences in
  different task contexts, each resolved by the same remedy and confirmed by
  server-log evidence.
