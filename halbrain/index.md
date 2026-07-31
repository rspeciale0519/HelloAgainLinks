# Index
Catalog of the hal brain. SessionStart reads this.

## Skills
- [[skills/supabase-definer-rpc-authz]] — supabase · established — `SECURITY DEFINER` RPC IDOR: how to spot, fix by caller type, and verify ACLs against the live DB.
- [[skills/auth-stale-shell-retest]] — auth · established — a client-side session change needs a clean sign-out → sign-in to retest; a stale shell mimics a failed fix.
- [[skills/build-stale-artifact-traps]] — build · established — which artifact each surface actually runs (package dist / extension dist / baked mobile bundle / Vercel) and the web-before-extension ship order.
- [[skills/integrations-x-api-cost-model]] — integrations · established — X bills unique resources per 24h UTC day (dedup), not per sync; expansions A/B must run on a fresh UTC day.

## Knowledge
- [[knowledge/orientation]] — current (2026-07-24)
- [[knowledge/superseded]] — current (2026-07-31)
- [[knowledge/features]] — current (2026-07-31, full audit)
- [[knowledge/roadmap]] — current (2026-07-31, includes 10-defect triage)

## Recent journal
- [[journal/2026-07-31]] — full codebase-vs-docs audit; 13 defects; docs + knowledge reconciled; second consolidation.
- [[journal/2026-07-28]] — dashboard Recent post-date fix (#45), released to prod.
- [[journal/2026-07-27]] — small-text legibility: real fonts, WCAG AA ramp (#34/#35).
- [[journal/2026-07-26]] — sync honesty + timestamps epic (#20-#33), X cost model findings, login tab-close fix.
- [[journal/2026-07-24]] — migration 010 applied + live ACLs verified; PR #16 merged; first consolidation.
