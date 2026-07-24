// ============================================================
// LLM usage + cost telemetry
// ============================================================
//
// xAI returns a `usage` block on every completion (and on the final chunk of a
// stream when `stream_options.include_usage` is set). We were discarding it,
// which left per-user cost as an estimate. Every call site now funnels through
// `logLlmUsage`, which emits one structured line per call so real spend can be
// aggregated from logs without any extra infrastructure.
//
// Emits NO user content — operation name, model, token counts, cost only.

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
  /** xAI reports cached prompt tokens here when prompt caching applies. */
  prompt_tokens_details?: { cached_tokens?: number };
}

/** USD per 1M tokens. Source: docs.x.ai/developers/pricing (verified 2026-07-24). */
const PRICING_PER_MTOK: Record<string, { in: number; cachedIn: number; out: number }> = {
  'grok-4.5': { in: 2.0, cachedIn: 0.3, out: 6.0 },
  'grok-4.3': { in: 1.25, cachedIn: 0.2, out: 2.5 },
  'grok-4.20-0309-reasoning': { in: 1.25, cachedIn: 0.2, out: 2.5 },
  'grok-4.20-0309-non-reasoning': { in: 1.25, cachedIn: 0.2, out: 2.5 },
  // Legacy — no longer listed on xAI's pricing page. Kept so historical logs
  // and any pinned GROK_MODEL_* override still cost out correctly.
  'grok-3': { in: 3.0, cachedIn: 3.0, out: 15.0 },
  'grok-3-mini': { in: 0.3, cachedIn: 0.3, out: 0.5 },
};

/** Estimated USD for one completion. Returns null for an unpriced model. */
export function estimateCostUsd(model: string, usage: TokenUsage): number | null {
  const rate = PRICING_PER_MTOK[model];
  if (!rate) return null;

  const cached = usage.prompt_tokens_details?.cached_tokens ?? 0;
  const fresh = Math.max(0, usage.prompt_tokens - cached);

  return (
    (fresh / 1_000_000) * rate.in +
    (cached / 1_000_000) * rate.cachedIn +
    (usage.completion_tokens / 1_000_000) * rate.out
  );
}

/**
 * Emit one structured usage line. `op` identifies the call site
 * (e.g. 'classify', 'assistant', 'summarize') so spend can be attributed by
 * feature. Never throws — telemetry must not break a working request.
 */
export function logLlmUsage(op: string, model: string, usage?: TokenUsage | null): void {
  if (!usage) return;
  try {
    const costUsd = estimateCostUsd(model, usage);
    console.log(
      '[llm-usage] ' +
        JSON.stringify({
          op,
          model,
          prompt_tokens: usage.prompt_tokens,
          cached_tokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
          completion_tokens: usage.completion_tokens,
          cost_usd: costUsd === null ? null : Number(costUsd.toFixed(6)),
        }),
    );
  } catch {
    // never let telemetry break the request
  }
}
