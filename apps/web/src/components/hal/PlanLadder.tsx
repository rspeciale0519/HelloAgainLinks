// No 'use client' directive: this renders only inside the settings page, which
// is already a client component. Declaring it a client *entry* would make Next
// treat these callback props as needing to be serializable.
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  PLAN_INFO,
  PLAN_QUOTAS,
  quotaRulesFor,
  type Plan,
  type QuotaMetric,
  type QuotaWindow,
} from '@helloagain/shared';

// ============================================================
// PlanLadder — the subscription instrument
// ============================================================
//
// HAL's tiers are metered ceilings, not feature bundles, so this is built as a
// gauge rather than a pricing table: what you've actually spent against the
// ceiling you actually have. Every number is read from PLAN_QUOTAS — the same
// config the server enforces — so the UI cannot advertise a limit that differs
// from the one applied.
//
// Meters are scaled to YOUR ceiling (so the reading is legible and honest);
// tier comparison lives in the ladder beneath as explicit ceilings, rather than
// squashing wildly different limits onto one distorted axis.

export interface UsageRow {
  metric: QuotaMetric;
  window: QuotaWindow;
  limit: number;
  used: number;
  resetsInSeconds: number | null;
}

/** The window that represents each metric's headline allowance. */
const HEADLINE_WINDOW: Record<QuotaMetric, QuotaWindow[]> = {
  chat: ['month', 'lifetime'],
  sync: ['day'],
  classify: ['month'],
  ai_op: ['day'],
};

const METRIC_LABEL: Record<QuotaMetric, string> = {
  chat: 'AI chat',
  sync: 'Syncs',
  classify: 'Auto-tagging',
  ai_op: 'AI actions',
};

const METRIC_UNIT: Record<QuotaMetric, string> = {
  chat: 'messages',
  sync: 'runs',
  classify: 'bookmarks',
  ai_op: 'actions',
};

const WINDOW_CAPTION: Record<QuotaWindow, string> = {
  hour: 'this hour',
  day: 'today',
  month: 'this month',
  // Not 'total' — this allowance never resets, and saying so avoids someone
  // waiting for a rollover that will not come.
  lifetime: 'lifetime',
};

const LADDER: Plan[] = ['free', 'pro', 'max'];

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true); // assume reduced until measured
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function formatReset(seconds: number | null): string | null {
  if (seconds === null) return null;
  const h = Math.floor(seconds / 3600);
  if (h >= 48) return `resets in ${Math.floor(h / 24)}d`;
  if (h >= 1) return `resets in ${h}h`;
  return `resets in ${Math.max(1, Math.floor(seconds / 60))}m`;
}

const mono = (size: number, color: string): CSSProperties => ({
  fontFamily: 'var(--hal-mono)',
  fontSize: size,
  letterSpacing: '0.14em',
  color,
  textTransform: 'uppercase',
});

/** One metric's gauge: filled track, ceiling numerals, reset caption. */
function Meter({ row, animate }: { row: UsageRow; animate: boolean }) {
  const [width, setWidth] = useState(0);
  const pct = row.limit > 0 ? Math.min(1, row.used / row.limit) : 0;
  const near = pct >= 0.8;

  useEffect(() => {
    if (!animate) {
      setWidth(pct);
      return;
    }
    const t = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(t);
  }, [pct, animate]);

  const reset = formatReset(row.resetsInSeconds);

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 7,
        }}
      >
        <span style={mono(10, 'var(--hal-text-2)')}>
          {METRIC_LABEL[row.metric]}
          <span style={{ color: 'var(--hal-text-3)', marginLeft: 8 }}>
            {WINDOW_CAPTION[row.window]}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--hal-mono)',
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            color: near ? 'var(--hal-a)' : 'var(--hal-text-1)',
          }}
        >
          {row.used.toLocaleString()}
          <span style={{ color: 'var(--hal-text-3)' }}>
            {' / '}
            {row.limit.toLocaleString()}
          </span>
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={row.used}
        aria-valuemin={0}
        aria-valuemax={row.limit}
        aria-label={`${METRIC_LABEL[row.metric]} ${WINDOW_CAPTION[row.window]}`}
        style={{
          position: 'relative',
          height: 6,
          background: 'var(--hal-bg-3)',
          border: '1px solid var(--hal-line-1)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${width * 100}%`,
            background: near ? 'var(--hal-a)' : 'var(--hal-a-dim)',
            borderRight: width > 0 ? '1px solid var(--hal-a)' : 'none',
            transition: animate ? 'width 620ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          }}
        />
      </div>

      {(reset || near) && (
        <div style={{ marginTop: 6, display: 'flex', gap: 10 }}>
          {near && <span style={mono(9, 'var(--hal-a)')}>near limit</span>}
          {reset && <span style={mono(9, 'var(--hal-text-3)')}>{reset}</span>}
        </div>
      )}
    </div>
  );
}

function priceLabel(plan: Plan): string {
  const cents = PLAN_INFO[plan].priceCents;
  if (cents === null) return 'paid once';
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}

/** A tier's headline ceilings, derived from the enforcement config. */
function ceilingsFor(plan: Plan): { label: string; value: string }[] {
  return (Object.keys(PLAN_QUOTAS[plan]) as QuotaMetric[])
    .map((metric) => {
      const rule = quotaRulesFor(plan, metric).find((r) =>
        HEADLINE_WINDOW[metric].includes(r.window),
      );
      if (!rule) return null;
      return {
        label: `${METRIC_LABEL[metric]} ${WINDOW_CAPTION[rule.window]}`,
        value: `${rule.limit.toLocaleString()} ${METRIC_UNIT[metric]}`,
      };
    })
    .filter((x): x is { label: string; value: string } => x !== null);
}

export function PlanLadder({
  plan,
  usage,
  busyPlan,
  onChoose,
  onManageBilling,
}: {
  plan: Plan;
  usage: UsageRow[] | null;
  busyPlan: Plan | null;
  onChoose: (plan: Plan) => void;
  onManageBilling: () => void;
}) {
  const reduced = useReducedMotion();

  // Headline gauges only — the burst-brake windows are enforcement detail, not
  // something a person needs to read on a settings page. Ordered by pressure so
  // the meter you might have to act on is the first one you read.
  const headline = (usage ?? [])
    .filter((r) => HEADLINE_WINDOW[r.metric].includes(r.window))
    .sort((a, b) => {
      const pa = a.limit > 0 ? a.used / a.limit : 0;
      const pb = b.limit > 0 ? b.used / b.limit : 0;
      return pb - pa;
    });

  return (
    <>
      <HalGauge
        plan={plan}
        headline={headline}
        loading={usage === null}
        reduced={reduced}
        onManageBilling={onManageBilling}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 10,
          marginTop: 10,
        }}
      >
        {LADDER.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            current={tier === plan}
            busy={busyPlan === tier}
            onChoose={onChoose}
          />
        ))}
      </div>

      {plan === 'lifetime' && (
        <div style={{ ...mono(9, 'var(--hal-text-3)'), marginTop: 10, letterSpacing: '0.1em' }}>
          Lifetime includes Pro-level limits.
        </div>
      )}
    </>
  );
}

function HalGauge({
  plan,
  headline,
  loading,
  reduced,
  onManageBilling,
}: {
  plan: Plan;
  headline: UsageRow[];
  loading: boolean;
  reduced: boolean;
  onManageBilling: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--hal-bg-1)',
        border: '1px solid var(--hal-line-1)',
        borderLeft: plan === 'free' ? '1px solid var(--hal-line-1)' : '2px solid var(--hal-a)',
        borderRadius: 4,
        padding: 22,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ ...mono(10, 'var(--hal-text-3)'), marginBottom: 6 }}>
            Current plan
          </div>
          <div
            style={{
              fontFamily: 'var(--hal-serif)',
              fontSize: 34,
              lineHeight: 1,
              color: 'var(--hal-text-0)',
            }}
          >
            {PLAN_INFO[plan].label}
          </div>
        </div>
        {/* Price is subordinate here: the gauge's job is consumption, and the
            ladder below states every price. Two large serif figures competing
            for the eye made the panel read as a pricing table. */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: 'var(--hal-mono)',
              fontSize: 11,
              color: 'var(--hal-text-2)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {priceLabel(plan)}
            {PLAN_INFO[plan].priceCents ? (
              <span style={{ color: 'var(--hal-text-3)' }}> / mo</span>
            ) : null}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={mono(10, 'var(--hal-text-3)')}>Reading usage…</div>
      ) : headline.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--hal-text-2)' }}>
          No metered usage on this plan yet.
        </div>
      ) : (
        headline.map((row) => (
          <Meter key={`${row.metric}-${row.window}`} row={row} animate={!reduced} />
        ))
      )}

      {plan !== 'free' && (
        <button
          type="button"
          onClick={onManageBilling}
          style={{
            marginTop: 6,
            padding: '7px 14px',
            background: 'transparent',
            color: 'var(--hal-text-1)',
            border: '1px solid var(--hal-line-2)',
            borderRadius: 3,
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Manage billing
        </button>
      )}
    </div>
  );
}

function TierCard({
  tier,
  current,
  busy,
  onChoose,
}: {
  tier: Plan;
  current: boolean;
  busy: boolean;
  onChoose: (p: Plan) => void;
}) {
  const ceilings = ceilingsFor(tier);
  return (
    <div
      style={{
        background: current ? 'var(--hal-bg-2)' : 'var(--hal-bg-1)',
        border: `1px solid ${current ? 'var(--hal-a-dim)' : 'var(--hal-line-1)'}`,
        borderRadius: 4,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={mono(10, current ? 'var(--hal-a)' : 'var(--hal-text-2)')}>
          {PLAN_INFO[tier].label}
        </span>
        <span
          style={{
            fontFamily: 'var(--hal-serif)',
            fontSize: 20,
            color: current ? 'var(--hal-a)' : 'var(--hal-text-1)',
          }}
        >
          {priceLabel(tier)}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {ceilings.map((c) => (
          <div key={c.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span
              style={{
                fontFamily: 'var(--hal-mono)',
                fontSize: 11,
                color: 'var(--hal-text-1)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {c.value}
            </span>
            <span style={{ ...mono(9, 'var(--hal-text-3)'), letterSpacing: '0.1em' }}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {current ? (
        <div
          style={{
            ...mono(10, 'var(--hal-text-3)'),
            padding: '7px 0',
            textAlign: 'center',
            border: '1px dashed var(--hal-line-2)',
            borderRadius: 3,
          }}
        >
          Your plan
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || tier === 'free'}
          onClick={() => onChoose(tier)}
          style={{
            padding: '8px 14px',
            background: tier === 'free' ? 'transparent' : 'var(--hal-a)',
            color: tier === 'free' ? 'var(--hal-text-3)' : 'var(--hal-bg-0)',
            border: tier === 'free' ? '1px solid var(--hal-line-2)' : 'none',
            borderRadius: 3,
            fontFamily: 'var(--hal-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: busy || tier === 'free' ? 'default' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {tier === 'free' ? 'Downgrade via billing' : busy ? 'Opening…' : `Switch to ${PLAN_INFO[tier].label}`}
        </button>
      )}
    </div>
  );
}
