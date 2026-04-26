-- ─── 028: Thumper Guardian + Enforcer hooks (Task 1.1) ───
-- Task 1.1 promotes the Phase 1 Thumper spike into a production route and
-- lays in two structural subsystems:
--
--   Guardian (telemetry / health):
--     - thumper_incidents    — error / severity ledger for the route
--     - tool_executions      — per-tool-call timing + success/failure log
--
--   Enforcer (audit):
--     - auth_events          — login / logout / failed-login ledger
--     - trade_action_audit   — before/after state hashes for trade mutations
--     - sms_email_blast_audit — schema-only ledger for blast cost/reach
--
-- All 5 tables: RLS enabled, single policy granting service_role full access.
-- No anon, no authenticated, no rep-scoped policy. Writes go through the
-- admin-client helpers in lib/thumper/{guardian-telemetry,audit}.ts.
--
-- All additive; no existing schema is modified.

-- ---- thumper_incidents ----

CREATE TABLE IF NOT EXISTS thumper_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  rep_id UUID REFERENCES reps(id) ON DELETE CASCADE,
  conversation_id UUID,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  details JSONB,
  resolved_status TEXT NOT NULL DEFAULT 'unresolved'
    CHECK (resolved_status IN ('unresolved', 'investigating', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_thumper_incidents_severity_created
  ON thumper_incidents(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_thumper_incidents_rep_created
  ON thumper_incidents(rep_id, created_at DESC) WHERE rep_id IS NOT NULL;

ALTER TABLE thumper_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thumper_incidents_service_role_only" ON thumper_incidents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- tool_executions ----

CREATE TABLE IF NOT EXISTS tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  success BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT,
  args_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_rep_created
  ON tool_executions(rep_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_created
  ON tool_executions(tool_name, created_at DESC);

ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tool_executions_service_role_only" ON tool_executions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- auth_events ----

CREATE TABLE IF NOT EXISTS auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID REFERENCES reps(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('login', 'logout', 'login_fail', 'password_reset', 'account_create')),
  ip_address INET,
  user_agent TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_events_rep_created
  ON auth_events(rep_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_events_type_created
  ON auth_events(event_type, created_at DESC);

ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_events_service_role_only" ON auth_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- trade_action_audit ----

CREATE TABLE IF NOT EXISTS trade_action_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  target_listing_id UUID,
  before_state_hash TEXT NOT NULL,
  after_state_hash TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_action_audit_rep_created
  ON trade_action_audit(rep_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trade_action_audit_listing
  ON trade_action_audit(target_listing_id) WHERE target_listing_id IS NOT NULL;

ALTER TABLE trade_action_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_action_audit_service_role_only" ON trade_action_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---- sms_email_blast_audit (schema-only — not wired in this task) ----

CREATE TABLE IF NOT EXISTS sms_email_blast_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blast_type TEXT NOT NULL CHECK (blast_type IN ('sms', 'email')),
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  cost_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_email_blast_audit_rep_created
  ON sms_email_blast_audit(rep_id, created_at DESC);

ALTER TABLE sms_email_blast_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sms_email_blast_audit_service_role_only" ON sms_email_blast_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
