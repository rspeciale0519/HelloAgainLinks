import type { Plan } from './types';

// ============================================================
// Plan quotas — single source of truth for tier limits
// ============================================================
//
// Every metered operation costs real money:
//   * `sync`     — X API owned reads, billed PER RESOURCE returned ($0.001 each).
//                  One sync = up to SYNC_INCREMENTAL_PAGE_SIZE resources.
//   * `chat`     — a streamed assistant turn (~5.5K in / ~300 out tokens).
//   * `classify` — one full-model call per bookmark enriched.
//   * `ai_op`    — the smaller one-shot helpers (search intent, summarize,
//                  duplicate check, related posts).
//
// Sizing principle: a tier's WORST-CASE monthly cost (every quota maxed) should
// land near its subscription price, so the most abusive possible paying account
// costs us roughly nothing rather than a loss. Legitimate usage sits far below
// these ceilings — they are abuse brakes, not product promises.
//
// Two windows per metric where it matters: a long window (the commercial
// allowance) and a short one (the burst brake that stops a scripted loop).
// The short window is what actually protects the X API's 2M/month platform cap.

export type QuotaMetric = 'chat' | 'sync' | 'classify' | 'ai_op';

/** `lifetime` = never resets; the counter is per-account, forever. */
export type QuotaWindow = 'hour' | 'day' | 'month' | 'lifetime';

export interface QuotaRule {
  window: QuotaWindow;
  limit: number;
}

export type PlanQuotas = Record<QuotaMetric, QuotaRule[]>;

/**
 * Free is deliberately austere on `sync`, because that is the only metric that
 * spends X API credits, and mass free signups are the cheapest abuse vector.
 * Chat is a one-time lifetime trial (not monthly) so a free account's total
 * chat exposure is bounded forever, not merely per month.
 */
const FREE: PlanQuotas = {
  chat: [{ window: 'lifetime', limit: 25 }],
  sync: [
    { window: 'hour', limit: 1 },
    { window: 'day', limit: 2 },
  ],
  classify: [{ window: 'month', limit: 100 }],
  ai_op: [{ window: 'day', limit: 5 }],
};

const PRO: PlanQuotas = {
  chat: [
    { window: 'month', limit: 500 },
    { window: 'hour', limit: 40 },
  ],
  sync: [
    { window: 'hour', limit: 6 },
    { window: 'day', limit: 20 },
  ],
  classify: [{ window: 'month', limit: 2000 }],
  ai_op: [{ window: 'day', limit: 100 }],
};

/**
 * The "unlimited, fair use" tier. The month limit is high enough that no honest
 * user reaches it (1,500/mo ≈ 50 chats every single day) while still bounding
 * worst-case spend.
 */
const MAX: PlanQuotas = {
  chat: [
    { window: 'month', limit: 1500 },
    { window: 'hour', limit: 80 },
  ],
  sync: [
    { window: 'hour', limit: 10 },
    { window: 'day', limit: 30 },
  ],
  classify: [{ window: 'month', limit: 6000 }],
  ai_op: [{ window: 'day', limit: 300 }],
};

export const PLAN_QUOTAS: Record<Plan, PlanQuotas> = {
  free: FREE,
  pro: PRO,
  max: MAX,
  // Lifetime buyers purchased at pro-level expectations; they are NOT unlimited.
  lifetime: PRO,
};

/** Display metadata. Prices are in USD cents to avoid float drift. */
export const PLAN_INFO: Record<Plan, { label: string; priceCents: number | null }> = {
  free: { label: 'Free', priceCents: 0 },
  pro: { label: 'Pro', priceCents: 1299 },
  max: { label: 'Max', priceCents: 2900 },
  lifetime: { label: 'Lifetime', priceCents: null },
};

export function quotaRulesFor(plan: Plan, metric: QuotaMetric): QuotaRule[] {
  return (PLAN_QUOTAS[plan] ?? FREE)[metric] ?? [];
}

/**
 * Bucket key for a window. Counters are keyed by this string, so a new bucket
 * (and therefore a fresh allowance) begins automatically when it rolls over —
 * no cron, no reset job. UTC throughout so the boundary is unambiguous.
 */
export function windowKey(window: QuotaWindow, now: Date = new Date()): string {
  const iso = now.toISOString();
  switch (window) {
    case 'hour':
      return iso.slice(0, 13); // YYYY-MM-DDTHH
    case 'day':
      return iso.slice(0, 10); // YYYY-MM-DD
    case 'month':
      return iso.slice(0, 7); // YYYY-MM
    case 'lifetime':
      return 'lifetime';
  }
}
