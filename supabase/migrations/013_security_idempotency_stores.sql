-- Durable single-use stores for Stripe webhook replays and mobile auth handoffs.
-- Service-role only; RLS on, no policies (same pattern as usage_counters in 011).

CREATE TABLE IF NOT EXISTS stripe_processed_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stripe_processed_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE stripe_processed_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE stripe_processed_events TO service_role;

CREATE TABLE IF NOT EXISTS mobile_auth_handoff_replays (
  handoff_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mobile_auth_handoff_replays ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mobile_auth_handoff_replays FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE mobile_auth_handoff_replays TO service_role;

CREATE INDEX IF NOT EXISTS idx_mobile_auth_handoff_replays_expires
  ON mobile_auth_handoff_replays (expires_at);
