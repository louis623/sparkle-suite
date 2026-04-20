-- ─── 020: Thumper conversations + approval ledger (Phase 1 Task 1.0 spike) ───
-- Phase 1 introduces the Thumper conversational assistant. This migration:
--   1. thumper_conversations — persisted chat state (UIMessage rows) per rep
--   2. approval_events — durable ledger of HITL tool approval responses
--      (UNIQUE approval_id gives DB-level replay protection)
--   3. requests_rep_update policy — enables removeListing's auto-cancel of a
--      pending trade_request when a listing is removed, without escalating
--      to the service-role client. Rep can UPDATE trade_requests rows for
--      listings they own.
--
-- All three are additive; no existing table schema is modified.

-- ---- thumper_conversations ----

CREATE TABLE IF NOT EXISTS thumper_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  message_id TEXT NOT NULL,
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  parts JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'complete', 'aborted')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (conversation_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_thumper_conv_rep
  ON thumper_conversations(rep_id);

CREATE INDEX IF NOT EXISTS idx_thumper_conv_conv
  ON thumper_conversations(conversation_id, created_at);

ALTER TABLE thumper_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thumper_conv_own_data" ON thumper_conversations
  FOR ALL
  USING (rep_id = (SELECT id FROM reps WHERE auth_user_id = auth.uid()));

CREATE POLICY "thumper_conv_admin_full_access" ON thumper_conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reps
      WHERE auth_user_id = auth.uid()
      AND email = 'louis@neonrabbit.net'
    )
  );

-- ---- approval_events ----
-- Durable ledger for HITL tool approval responses. UNIQUE (approval_id)
-- makes replay a hard DB failure even if the application-level check is
-- bypassed.

CREATE TABLE IF NOT EXISTS approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  rep_id UUID NOT NULL REFERENCES reps(id) ON DELETE CASCADE,
  approval_id TEXT NOT NULL UNIQUE,
  tool_name TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_events_conv
  ON approval_events(conversation_id);

ALTER TABLE approval_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_events_own_data" ON approval_events
  FOR ALL
  USING (rep_id = (SELECT id FROM reps WHERE auth_user_id = auth.uid()));

CREATE POLICY "approval_events_admin_full_access" ON approval_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM reps
      WHERE auth_user_id = auth.uid()
      AND email = 'louis@neonrabbit.net'
    )
  );

-- ---- requests_rep_update policy ----
-- Allows a rep to UPDATE rows in trade_requests for listings they own.
-- Required by removeListing's auto-cancel of pending trade_requests when
-- the underlying listing is removed. Mirrors the existing SELECT policy
-- requests_rep_read's scoping.

CREATE POLICY "requests_rep_update" ON trade_requests
  FOR UPDATE
  USING (
    listing_id IN (
      SELECT id FROM trade_listings
      WHERE rep_id = (SELECT id FROM reps WHERE auth_user_id = auth.uid())
    )
  )
  WITH CHECK (
    listing_id IN (
      SELECT id FROM trade_listings
      WHERE rep_id = (SELECT id FROM reps WHERE auth_user_id = auth.uid())
    )
  );
