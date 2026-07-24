-- Migration 011: server-side usage metering + quota enforcement.
--
-- WHY: plan gating was binary (`plan === 'free'` -> 403), so every paying user
-- was effectively unlimited, and the only sync throttle lived in the mobile
-- client (`use-auto-sync.ts`) where any caller can bypass it by hitting the API
-- directly. Each metered operation spends real money — X API owned reads bill
-- per resource, every chat/classify call bills tokens — so a single scripted
-- account could run up unbounded cost AND exhaust X's 2M-reads/month platform
-- cap, which is shared by every user.
--
-- Counters are bucketed by a window key (e.g. '2026-07-24T14'), so a new bucket
-- starts a fresh allowance automatically — no reset cron.

-- ── Allow the new 'max' tier ──────────────────────────────────────
-- profiles/subscriptions predate this migrations folder and each carries a
-- CHECK constraint pinned to ('free','pro','lifetime'). Without widening them,
-- a Max checkout would take the customer's money and then fail on the webhook's
-- write — paid, but never upgraded. Verified against prod before writing this.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan = ANY (ARRAY['free'::text, 'pro'::text, 'max'::text, 'lifetime'::text]));

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan = ANY (ARRAY['free'::text, 'pro'::text, 'max'::text, 'lifetime'::text]));

CREATE TABLE IF NOT EXISTS usage_counters (
  -- user uuid as text, or the sentinel '__global__' for the circuit breaker.
  subject_key text        NOT NULL,
  metric      text        NOT NULL,
  window_key  text        NOT NULL,
  count       bigint      NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_key, metric, window_key)
);

-- Only service_role touches this table (it bypasses RLS). RLS is enabled with
-- NO policies so that anon/authenticated get nothing even if the anon key is
-- pointed straight at PostgREST — usage counters are not user-editable.
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Supports pruning old buckets later without scanning the PK.
CREATE INDEX IF NOT EXISTS idx_usage_counters_updated_at
  ON usage_counters (updated_at);

-- ── Atomic consume ────────────────────────────────────────────────
-- Increments only if the result stays within p_limit, in a single statement, so
-- concurrent requests cannot race past the ceiling. Returns whether the spend
-- was allowed plus the resulting (or current, if denied) count.
CREATE OR REPLACE FUNCTION consume_quota(
  p_subject    text,
  p_metric     text,
  p_window_key text,
  p_limit      bigint,
  p_cost       bigint DEFAULT 1
)
RETURNS TABLE (allowed boolean, current_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count bigint;
BEGIN
  -- A zero/negative allowance denies outright; so does a single request that
  -- could never fit (guards the fresh-INSERT path, which has no WHERE clause).
  IF p_limit <= 0 OR p_cost > p_limit THEN
    SELECT uc.count INTO v_count
    FROM usage_counters uc
    WHERE uc.subject_key = p_subject
      AND uc.metric = p_metric
      AND uc.window_key = p_window_key;
    RETURN QUERY SELECT false, COALESCE(v_count, 0::bigint);
    RETURN;
  END IF;

  INSERT INTO usage_counters AS uc (subject_key, metric, window_key, count)
  VALUES (p_subject, p_metric, p_window_key, p_cost)
  ON CONFLICT (subject_key, metric, window_key) DO UPDATE
    SET count = uc.count + p_cost,
        updated_at = now()
    WHERE uc.count + p_cost <= p_limit
  RETURNING uc.count INTO v_count;

  IF v_count IS NOT NULL THEN
    RETURN QUERY SELECT true, v_count;
  ELSE
    -- Conflict target existed but the WHERE guard rejected the increment.
    SELECT uc.count INTO v_count
    FROM usage_counters uc
    WHERE uc.subject_key = p_subject
      AND uc.metric = p_metric
      AND uc.window_key = p_window_key;
    RETURN QUERY SELECT false, COALESCE(v_count, 0::bigint);
  END IF;
END;
$$;

-- Read-only peek for surfacing "N of M used" without spending anything.
CREATE OR REPLACE FUNCTION peek_quota(
  p_subject    text,
  p_metric     text,
  p_window_key text
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT uc.count
     FROM usage_counters uc
     WHERE uc.subject_key = p_subject
       AND uc.metric = p_metric
       AND uc.window_key = p_window_key),
    0::bigint
  );
$$;

-- Both functions are called only from server routes holding the service-role
-- key. Revoke the default PUBLIC EXECUTE grant so neither is reachable with the
-- public anon key — a caller who could invoke consume_quota directly could
-- burn another user's allowance, and peek_quota would leak their usage.
REVOKE EXECUTE ON FUNCTION consume_quota(text, text, text, bigint, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_quota(text, text, text, bigint, bigint)
  TO service_role;

REVOKE EXECUTE ON FUNCTION peek_quota(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION peek_quota(text, text, text)
  TO service_role;
