---
kind: knowledge
slug: superseded
status: current
updated: 2026-07-31
layer: reference
sources:
  - docs/dev-docs/DEVELOPMENT_ROADMAP.md
  - docs/dev-docs/PRD.md
  - package.json
  - apps/web/src/lib/grok.ts
  - apps/web/src/app/auth/set-session/page.tsx
  - claude-memory:project_hal_redesign_open_bugs.md (Claude Code auto-memory, 2026-04-26)
---

# Superseded — doc-vs-truth deltas

Genuine discrepancies only, each with both sides cited. Signal Boards/Pulse/CKG
being absent from code is **not** a delta — PRD lists those as post-MVP and the
code agrees. See [[knowledge/features]] for full evidence-gated build status.

**2026-07-31: the dev docs themselves were reconciled** — `DEVELOPMENT_ROADMAP.md`
checkboxes now reflect audited reality (with a dated audit section + defect list at
the top) and `PRD.md` carries an Implementation Status Addendum. Items 1-3 below are
therefore *historical* (the docs no longer mislead); kept for context on why older
journal entries distrust doc checkboxes.

## 1. [RESOLVED in docs 2026-07-31] Roadmap Phase 1-3 checkboxes were stale
The Feb-7 Phase 1-3 sections showed everything `- [ ]` unchecked while nearly all
of it was built. Fixed: every checkbox audited against code and annotated.

## 2. [RESOLVED in docs 2026-07-31] PRD self-contradicted on mobile scope
§10 "Out of Scope" listed the mobile app that a later section described as shipped.
Fixed: line struck through with pointer. Firefox extension remains genuinely unbuilt.

## 3. [RESOLVED in docs 2026-07-31] pnpm version mismatch
Tech-stack tables said 9.x; `package.json` says `pnpm@10.28.2`. Tables corrected.

## 4. AI Assistant "function calling" is documented but not implemented
PRD §3.2 describes Grok function calling for bookmark CRUD/discovery. Zero
`tools`/`tool_choice`/`function_call` params exist anywhere (re-confirmed
2026-07-31; only two comment lines `grok.ts:344,347`). Citations are a
`[bm:<uuid>]` prompt contract resolved **server-side** (`extractCitations`,
`grok-conversation.ts:284-312`) — the earlier note saying "parsed client-side"
was itself slightly off. PRD addendum now records this.

## 5. Blend shareable OG card documented, not implemented — AND the invite loop is broken
PRD §3.3 describes a 1200×630 shareable card; no OG-image code exists (re-confirmed).
**Worse (found 2026-07-31):** `POST /api/blends` returns `inviteUrl` pointing at
`/blend/invite/[code]` but no `/blend/**` page route exists — every invite link
404s (`api/blends/route.ts:57`). BL-01's "send a Blend invite via shareable link"
is only half-true. Also unbuilt: decline route, Blend detail/public page, Blend
Feed, privacy controls (BL-04/BL-05/AC-04).

## 6. Grok `x_search()` / Collections API documented, not wired
Unchanged (re-confirmed 2026-07-31). Related content works via SQL RPC
(category + tag-Jaccard), not the documented tool use.

## 7. Mobile spec claims the sync cron is "already functional" — it is not wired
`2026-03-17-mobile-x-support-design.md` §8 claims server-side cron sync. No cron
exists anywhere (vercel.json has no `crons`; no scheduled workflow — re-confirmed
2026-07-31). Client-side app-open/resume auto-sync exists (`use-auto-sync.ts`) —
**note: 15-min throttle now, not 2-min** (widened for X API cost; comment in file),
wired in `mobile/layout.tsx`, not the root layout. X-402 credit exhaustion is
surfaced via an `xApiError` field on an HTTP **200** body — only the mobile
settings page decodes it; any `res.ok` check reads exhaustion as success.

## 8. Mobile share pipeline: docs say shipped; two pieces are broken (found 2026-07-31)
- **iOS Share Extension does not exist** — no app-extension target in the Xcode
  project, yet `capacitor.config.ts:12` names `ShareExtension` and iOS onboarding
  step 4 teaches users to enable it. PRD "save from mobile Share Sheet" is
  Android-only in practice.
- **`/api/mobile/share` ↔ `MobileShareSheet` contract mismatch** — sheet reads
  `data.bookmark.*` and expects HTTP 409 for duplicates; route returns
  `{status,id,tags}` and 200 for duplicates. Tags never display; dupes render as
  saves. `MobileShareListener.tsx` is dead code.

## 9. Roadmap said "no rate limiting / no cost tracking" — both exist now (found 2026-07-31)
Quota metering (`lib/quota.ts` + `consume_quota`, migration 011; per-plan windows,
global circuit breaker, fails closed) and per-call LLM cost logging
(`lib/llm-usage.ts`) are BUILT. Still absent: retry/backoff, response caching.
Three paths bypass metering: `/api/ai/assistant`, `/api/ai/duplicate-check`,
`blend-engine.ts`.

## 10. Four `/api/ai/*` routes are orphaned (found 2026-07-31)
`search`, `summarize`, `related/[bookmarkId]`, `duplicate-check` all compile and
hold `XAI_API_KEY` but have zero callers. Live equivalents: `/api/bookmarks/search`
(FTS), enrichment `ai_summary`, `/api/bookmarks/[id]/related` (RPC). The docs'
"AI features BUILT" claims were citing the orphaned routes.

## 11. Auth docs vs live flow (found 2026-07-31)
Docs/roadmap describe Supabase X OAuth. Live flow is a hand-rolled X OAuth 2.0
PKCE pair (`/api/auth/x-login` → `/api/auth/x-callback`) minting sessions via the
Supabase **admin** API; `/api/auth/login` (`signInWithOAuth`) is dead code;
`middleware.ts` enforces nothing (CORS + mobile redirect only). PRD "OAuth tokens
stored encrypted" — raw X tokens sit in `profiles` columns.

## Operator corrections (status as of 2026-07-31)
Resolved since the 2026-04-26 memory:
- **set-session StrictMode auth flash — FIXED** (PR #32 `42492a7`): `startedRef`
  guard at `set-session/page.tsx:86-87`. (Auto-memory `project_hal_redesign_open_bugs`
  is stale on this item.)
- **`SignalPlaceholder`** — archived (confirmed earlier).
- **ui-hal React peerDependency** — fixed at `^19.0.0` (confirmed earlier).

Still present, re-verified:
- **`HalMobileBar`/`HalDrawer` dead code** — still zero references (PR #34 touched
  them only in the blanket font sweep).
- **`HalSearchBar` never absorbed into ⌘K palette** — still unconditional at
  `dashboard/bookmarks/page.tsx:496`.
- **Tag filtering client-side-only** — unchanged; pagination math still broken.
  **Plus (new): `/api/bookmarks/search` ignores `folder_id`** — accepted by schema,
  sent by client, never applied → in-folder search searches everything.
- **`.env.local` DB credentials are ALL stale (corrected 2026-07-31)** — the
  earlier note ("only `SUPABASE_DB_PASSWORD` is stale; the password inside
  `DIRECT_DATABASE_URL` authenticates") is **wrong as of now**. Tested directly
  with psql 17 against `db.<ref>.supabase.co:5432`: `DIRECT_DATABASE_URL`,
  `DATABASE_URL`, and `SUPABASE_DB_PASSWORD` all carry the **same** 27-char
  password and it returns `FATAL: password authentication failed for user
  "postgres"`. Network path is fine (server reached, IPv6). So **there is no
  working direct-psql route to prod today** — the DB password must be reset in
  the dashboard before CLI/psql migration workflows work. `NEXT_PUBLIC_APP_URL`
  localhost value still applies. (Names only, no values.)
- **`@helloagain/ui-hal` lint script no-op echo** — unchanged.
- **LOC cap violations, worse again** — `background.ts` 709, `content.ts` 580
  (was 687/580 on 07-28, 562/541 on 04-26); plus `dashboard/bookmarks/page.tsx`
  680 and `Popup.tsx` 579.
- **`StatusDot` division-by-zero calc trick** — unchanged (deliberate
  reduced-motion freeze; documented, arguably fine).
