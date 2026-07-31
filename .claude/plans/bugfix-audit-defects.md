# Bugfix: 2026-07-31 audit defects

Source: defect list in `docs/dev-docs/DEVELOPMENT_ROADMAP.md` (Codebase Audit —
2026-07-31 section) and `halbrain/knowledge/roadmap.md` triage. Numbers below
reference that list.

## Scope
Fix the diagnosed, code-only defects. Deferred (need user/product decisions):
- #6 iOS Share Extension (new native Xcode target + Apple provisioning)
- #11 product half (whether AskTab honors the free 25-msg trial — pricing call)
- Stripe webhook idempotency store (needs a new table; low current risk)

## Phase 1 — Blend invite loop (#1, #10)
- Create public page `apps/web/src/app/blend/invite/[code]/page.tsx` (model on
  `lists/join/[code]`): fetch `GET /api/blends/invite/[code]`, show inviter,
  Accept CTA when signed in, login redirect (with return path) when not.
- #10 minimal: at `POST /api/blends`, count this month's `blend_invites`
  (pending+accepted) for the inviter instead of `blends` rows; add the same
  free-tier check on accept for the invitee side.

## Phase 2 — Search + data-honesty fixes (#2, #3, #7, #12, #13)
- Migration 012: add `p_folder_id uuid default null` and `p_tag_ids uuid[]
  default null` params to `search_bookmarks` (filter in-body; preserve grants
  per skills/supabase-definer-rpc-authz). NOTE: must be applied to prod before
  deploy.
- #2: pass `folder_id` through `api/bookmarks/search/route.ts`.
- #3: add `tag_ids[]` to `/api/bookmarks` (join filter) + search route + Zod
  schema; send from `use-bookmarks-data.ts`; remove the client-side post-filter
  in `dashboard/bookmarks/page.tsx` so pagination math is correct.
- #7: `api/sync/background/route.ts` classify step writes all four enrichment
  columns (`ai_summary`, `ai_tags` included).
- #12: dashboard home Recent list requests `sort=post_created_at` so order
  matches the displayed dates.
- #13: fix `countData?.length` → use `count` from the head query in
  `api/ai/assistant/route.ts`.

## Phase 3 — Metering + Stripe drift (#8, #9)
- #8: `enforceQuota` on `/api/ai/assistant` (chat metric) and
  `/api/ai/duplicate-check` (ai_op); blend-engine: import model constant from
  grok.ts (kill the dead `grok-3` fallback) and log usage; meter blend
  generation (ai_op) in the accept route.
- #9: `customer.subscription.updated` handler re-syncs `profiles.plan`
  (derive plan from the subscription's price id via `planForPriceId`).

## Phase 4 — Mobile share contract + extension side panel (#5, #4)
- #5: fix `/api/mobile/share` to match what the shipped `MobileShareSheet`
  binary already expects: HTTP 409 for duplicates, `bookmark` object in the
  success payload (keep existing fields for compatibility).
- #4: extension — remove the dead `chrome.action.onClicked` handler; add an
  "Open side panel" button in the popup (user gesture → `sidePanel.open`).
  Bump version 0.5.4 → 0.5.5 in BOTH package.json and public/manifest.json,
  rebuild dist (skills/build-stale-artifact-traps).

## Phase 5 — Docs + roadmap close-out
- Mark fixed defects in `DEVELOPMENT_ROADMAP.md` audit section (FIXED + date),
  update `halbrain/knowledge/roadmap.md` triage, journal entry.
