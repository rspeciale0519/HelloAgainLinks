---
type: skill
area: integrations
status: active
confidence: established
updated: 2026-07-31
sources:
  - journal/2026-07-26 (17:01 dedup finding; 12:47/13:45 billing observations)
  - docs.x.com/x-api/getting-started/pricing (primary source, read 2026-07-26)
---

# X API cost model — reason in unique resources per UTC day, not per sync

## When to use
Any time you estimate, debug, or optimize X API spend for sync — or design a
billing experiment.

## The approach
- **24-hour UTC dedup window (the load-bearing fact):** "All resources are
  deduplicated within a 24-hour UTC day window" — you are charged once per
  billable resource per UTC day no matter how many syncs re-fetch it. Cost
  scales with UNIQUE resources/day; frequent re-syncing of the same bookmarks
  is near-free. X calls this a "soft guarantee" — treat as a discount to
  expect, not a number to forecast on.
- Observed corroboration: repeat syncs same UTC day billed $0.00; first sync
  of ~300 resources billed $0.30.
- **Incremental sync is cheap by design:** 10/page + `caught_up` guard ⇒ a
  routine sync is ~1 request / ~10 resources (~30× fewer than the pre-fix
  100/page full walks).
- **Expansions billing is an OPEN question:** a 7.5× gap between expected and
  billed cost is *consistent with* `expansions=author_id` billing separately
  (posts ~$0.001, users ~$0.010) but unproven. Any A/B MUST run on a fresh
  UTC day or the dedup window confounds it (a same-day re-fetch is free
  regardless of expansions).
- **Financial backstops:** X billing-cycle spend cap is set ($25) beneath the
  app-level quotas. xAI credit kickback returns up to 20% of cumulative X API
  spend as xAI credits ($200+: 10%, $500+: 15%, $1,000+: 20%) — offsets the
  Grok bill at scale, 0% below $200.
- **Event kind ≠ billing breakdown:** the console's Usage "kind" column
  (e.g. one "Read" kind) says nothing about which resources billed — don't
  settle billing questions from it.
- **X Activity API has no bookmark event** (catalogue enumerated exhaustively
  07-26) — push can never replace bookmark polling; its events bill per
  delivery, so subscribing only ADDS cost. Revisit only if X adds a bookmark
  event type.

## Pitfalls & anti-patterns
- Estimating per-user cost as (syncs/day × resources/sync × rate) — wrong by
  an order of magnitude; use unique-resources/day.
- Running billing comparisons within one UTC day.
- Declaring a billing question settled off a single console signal (done once,
  retracted same day).

## Evidence
Primary-source pricing doc + matched observations (requests 5/6/7 billed
$0.00 same-day; $0.30 for the first 300-resource day). Independent
corroboration across doc + console ⇒ established.

## Revision log
- 2026-07-31: created at consolidation, distilled from journal 2026-07-26.
