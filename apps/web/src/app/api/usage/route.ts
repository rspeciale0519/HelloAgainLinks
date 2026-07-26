import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, isAuthError } from '@/lib/auth';
import { secondsUntilWindowReset } from '@/lib/quota';
import { quotaRulesFor, windowKey, type QuotaMetric } from '@helloagain/shared';

export const dynamic = 'force-dynamic';

// Reports what the caller has spent against their plan's ceilings. Reads the
// same PLAN_QUOTAS the server enforces, so the settings UI can never advertise
// a limit that differs from the one actually applied.

const METRICS: QuotaMetric[] = ['chat', 'sync', 'classify', 'ai_op'];

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext(req);
  if (isAuthError(ctx)) return ctx;

  const rows = await Promise.all(
    METRICS.flatMap((metric) =>
      quotaRulesFor(ctx.plan, metric).map(async (rule) => {
        const { data, error } = await ctx.serviceClient.rpc('peek_quota', {
          p_subject: ctx.userId,
          p_metric: metric,
          p_window_key: windowKey(rule.window),
        });
        return {
          metric,
          window: rule.window,
          limit: rule.limit,
          // A missing counter simply means nothing spent in this window yet.
          used: error ? 0 : Number(data ?? 0),
          resetsInSeconds: secondsUntilWindowReset(rule.window),
        };
      }),
    ),
  );

  return NextResponse.json({ plan: ctx.plan, usage: rows });
}
