-- Live Queue sync table for Chrome extension → website realtime sync

CREATE TABLE live_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL,
  sync_code TEXT NOT NULL UNIQUE,
  queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_live_queue_sync_code ON live_queue(sync_code);

ALTER TABLE live_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read live queue"
  ON live_queue FOR SELECT
  USING (true);

-- Seed data for all five current reps
-- rep_ids are placeholder UUIDs; will be linked to sparkle_clients table later
INSERT INTO live_queue (rep_id, sync_code, queue) VALUES
  ('f1a2b3c4-d5e6-7890-abcd-ef1234560001', 'MHF-7342', '[]'::jsonb),
  ('f1a2b3c4-d5e6-7890-abcd-ef1234560002', 'BWB-5819', '[]'::jsonb),
  ('f1a2b3c4-d5e6-7890-abcd-ef1234560003', 'BGL-2463', '[]'::jsonb),
  ('f1a2b3c4-d5e6-7890-abcd-ef1234560004', 'TBK-9157', '[]'::jsonb),
  ('f1a2b3c4-d5e6-7890-abcd-ef1234560005', 'SID-6284', '[]'::jsonb);

-- Enable Realtime so website components can subscribe to queue changes
ALTER PUBLICATION supabase_realtime ADD TABLE live_queue;
