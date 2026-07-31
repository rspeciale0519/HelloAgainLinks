# Feature: Blend share card + public page (+ legal pages)

Completes the Bookmark Blend viral loop (PRD §3.3, roadmap 3.3) and unblocks
Chrome Web Store prep (legal pages). Approved 2026-07-31 as the top
post-defect-sweep priority.

## Phase 1 — OG card image
- `GET /api/blends/[id]/card` → 1200×630 PNG via `ImageResponse` (`next/og`).
- Content: Blend score (prominent), tier label, top shared topics (≤3), each
  user's signature interest, both handles + avatars (from `profiles`), HAL
  wordmark. Four color themes keyed by score tier, on the HAL dark + cyan
  design language.
- Public by capability URL (blend uuid); service-client fetch; 404 on unknown
  id or non-active blend. Aggregate themes only — never bookmark contents.

## Phase 2 — Public blend page
- `apps/web/src/app/blend/[id]/page.tsx` — server component, public.
- `generateMetadata`: og:title/description, `og:image` → the card route,
  `twitter:card = summary_large_image`.
- Body: score dial, tier, common ground, each side's unique tastes +
  signatures, "Share on X" intent link (pre-filled text), "Download card",
  "Create your own Blend" CTA → `/login`.
- Link to it from `/dashboard/blend` rows.

## Phase 3 — Legal pages
- `/privacy` + `/terms` static pages (plain, honest, HAL-styled).
- Wire the dead "Terms" / "Privacy Policy" spans on `/login` to them.

## Phase 4 — Docs + brain close-out
- Roadmap 3.3 checkboxes + PRD addendum lines updated; journal entry.
