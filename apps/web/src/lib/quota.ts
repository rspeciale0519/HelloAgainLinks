import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  quotaRulesFor,
  windowKey,
  type Plan,
  type QuotaMetric,
  type QuotaWindow,
} from '@helloagain/shared';

// ============================================================
// Server-side quota enforcement
// ============================================================
//
// The authoritative cost control. Client-side throttles (use-auto-sync) are UX
// politeness only — anyone can call the API directly with their bearer token.
//
// Two layers:
//   1. Per-user, per-plan quotas (packages/shared/src/plans.ts).
//   2. A global circuit breaker — a platform-wide daily ceiling that trips
//      regardless of plan. This is the backstop for abuse paths we haven't
//      thought of, and specifically protects X's 2M-reads/month cap, which is
//      shared across ALL users: one scripted account exhausting it takes sync
//      down for everybody.

const GLOBAL_SUBJECT = '__global__';

/**
 * Platform-wide daily ceilings. X allows 2M post reads/month (~66k/day); we sit
 * well under so a bad day can't burn the month. Tune via env without a deploy.
 */
const GLOBAL_DAILY_LIMITS: Record<QuotaMetric, number> = {
  sync: Number(process.env.GLOBAL_DAILY_SYNC_LIMIT) || 5_000,
  chat: Number(process.env.GLOBAL_DAILY_CHAT_LIMIT) || 5_000,
  classify: Number(process.env.GLOBAL_DAILY_CLASSIFY_LIMIT) || 20_000,
  ai_op: Number(process.env.GLOBAL_DAILY_AI_OP_LIMIT) || 5_000,
};

interface ConsumeRow {
  allowed: boolean;
  current_count: number;
}

async function consume(
  serviceClient: SupabaseClient,
  subject: string,
  metric: QuotaMetric,
  window: QuotaWindow,
  limit: number,
  cost: number,
): Promise<ConsumeRow | null> {
  const { data, error } = await serviceClient.rpc('consume_quota', {
    p_subject: subject,
    p_metric: metric,
    p_window_key: windowKey(window),
    p_limit: limit,
    p_cost: cost,
  });
  if (error) {
    console.error('[quota] consume_quota failed:', error.message);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return (row as ConsumeRow) ?? null;
}

export interface QuotaDenial {
  metric: QuotaMetric;
  window: QuotaWindow;
  limit: number;
  used: number;
  scope: 'user' | 'global';
}

/** Seconds until the current window rolls over — drives the Retry-After header. */
function secondsUntilWindowReset(window: QuotaWindow): number | null {
  const now = new Date();
  switch (window) {
    case 'hour':
      return 3600 - (now.getUTCMinutes() * 60 + now.getUTCSeconds());
    case 'day': {
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      return Math.ceil((end - now.getTime()) / 1000);
    }
    case 'month': {
      const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
      return Math.ceil((end - now.getTime()) / 1000);
    }
    case 'lifetime':
    default:
      return null;
  }
}

/**
 * Charge `cost` units of `metric` against the user's plan and the global
 * breaker. Returns a ready-to-return 429/503 response when denied, or null when
 * the caller may proceed.
 *
 * Call this BEFORE the expensive operation — the whole point is to prevent the
 * spend, not to record it afterwards. A denial consumes nothing.
 *
 * Note: quota is charged on attempt. If the downstream provider then fails, the
 * unit is still spent; that is the deliberate trade for a hard pre-spend gate.
 */
export async function enforceQuota(
  serviceClient: SupabaseClient,
  userId: string,
  plan: Plan,
  metric: QuotaMetric,
  cost = 1,
): Promise<NextResponse | null> {
  // Global breaker first: if the platform is over budget, no plan may proceed.
  const globalLimit = GLOBAL_DAILY_LIMITS[metric];
  const globalRow = await consume(
    serviceClient,
    GLOBAL_SUBJECT,
    metric,
    'day',
    globalLimit,
    cost,
  );

  // Fail CLOSED on infrastructure error. An unavailable meter must not become
  // an open door — that is exactly the window an abuser would target.
  if (globalRow === null) {
    return NextResponse.json(
      { error: 'Usage metering unavailable, please retry shortly.' },
      { status: 503, headers: { 'Retry-After': '60' } },
    );
  }

  if (!globalRow.allowed) {
    console.error(
      `[quota] GLOBAL breaker tripped: metric=${metric} used=${globalRow.current_count} limit=${globalLimit}`,
    );
    return NextResponse.json(
      {
        error: 'This feature is temporarily unavailable due to platform load. Please try again later.',
        scope: 'global',
      },
      { status: 503, headers: { 'Retry-After': String(secondsUntilWindowReset('day') ?? 3600) } },
    );
  }

  // Then the user's own plan rules — every window must pass.
  for (const rule of quotaRulesFor(plan, metric)) {
    const row = await consume(serviceClient, userId, metric, rule.window, rule.limit, cost);
    if (row === null) {
      return NextResponse.json(
        { error: 'Usage metering unavailable, please retry shortly.' },
        { status: 503, headers: { 'Retry-After': '60' } },
      );
    }
    if (!row.allowed) {
      const denial: QuotaDenial = {
        metric,
        window: rule.window,
        limit: rule.limit,
        used: row.current_count,
        scope: 'user',
      };
      const retry = secondsUntilWindowReset(rule.window);
      return NextResponse.json(
        {
          error: quotaMessage(denial, plan),
          quota: denial,
          upgrade: plan === 'free' || plan === 'pro',
        },
        {
          status: 429,
          headers: retry === null ? undefined : { 'Retry-After': String(retry) },
        },
      );
    }
  }

  return null;
}

const METRIC_LABEL: Record<QuotaMetric, string> = {
  chat: 'AI chat messages',
  sync: 'bookmark syncs',
  classify: 'bookmark classifications',
  ai_op: 'AI actions',
};

const WINDOW_LABEL: Record<QuotaWindow, string> = {
  hour: 'this hour',
  day: 'today',
  month: 'this month',
  lifetime: 'on the free plan',
};

function quotaMessage(d: QuotaDenial, plan: Plan): string {
  const base = `You've used all ${d.limit} ${METRIC_LABEL[d.metric]} ${WINDOW_LABEL[d.window]}.`;
  if (d.window === 'lifetime') return `${base} Upgrade to keep going.`;
  if (plan === 'free' || plan === 'pro') return `${base} Upgrade for a higher limit.`;
  return `${base} This limit resets automatically.`;
}
