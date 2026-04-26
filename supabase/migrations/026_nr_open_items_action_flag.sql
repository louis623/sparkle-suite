-- ─── 026: open_items action-item flag ──────────────────────────────────
-- Adds a boolean flag so the HQ dashboard can render the Action Items
-- list card on the VA Compensation project view, plus a partial index
-- for fast (project, is_action_item=true) lookups. Seeds the 8 initial
-- action items chosen for VAC.
BEGIN;

ALTER TABLE open_items
  ADD COLUMN IF NOT EXISTS is_action_item BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_open_items_action
  ON open_items (project, is_action_item)
  WHERE is_action_item = true;

UPDATE open_items SET is_action_item = true WHERE id IN (
  '0258a20b-a88d-4391-b031-1c57a2c432db',
  '90bd351a-70ee-4a09-8316-cf141fcceac7',
  'e7afa48e-ce57-4336-a040-d636fa30ce2f',
  '7e44d18f-ef5c-4b9c-b6c7-d247064b65e3',
  '00ecb70e-0f80-46bb-9304-b1002ad28a61',
  '48ab88d1-945a-4afa-bd75-d9a7890a3f54',
  'ed5531d8-d310-4593-b66c-72f20e038fc1',
  'b8c4bdd6-1600-47d7-9fb9-b71f62725466'
);

COMMIT;
