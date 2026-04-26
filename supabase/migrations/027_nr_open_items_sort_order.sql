-- ─── 027: open_items.sort_order ─────────────────────────────────────────
-- Adds an explicit sort_order column for manual ranking of action items
-- on the HQ dashboard. Lower numbers appear first; NULL sorts last.
-- Seeds the 9 current va_compensation action items with Louis-approved
-- ranks 1-9.
BEGIN;

ALTER TABLE open_items
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

COMMENT ON COLUMN open_items.sort_order IS
  'Manual sort order for dashboard display. Lower numbers appear first. NULL = unsorted (appears after sorted items).';

-- Seed strategic ranks (Louis-approved order, 1 = highest priority on dashboard).
UPDATE open_items SET sort_order = 1 WHERE id = '0258a20b-a88d-4391-b031-1c57a2c432db';
UPDATE open_items SET sort_order = 2 WHERE id = '90bd351a-70ee-4a09-8316-cf141fcceac7';
UPDATE open_items SET sort_order = 3 WHERE id = 'e7afa48e-ce57-4336-a040-d636fa30ce2f';
UPDATE open_items SET sort_order = 4 WHERE id = '7e44d18f-ef5c-4b9c-b6c7-d247064b65e3';
UPDATE open_items SET sort_order = 5 WHERE id = '00ecb70e-0f80-46bb-9304-b1002ad28a61';
UPDATE open_items SET sort_order = 6 WHERE id = '48ab88d1-945a-4afa-bd75-d9a7890a3f54';
UPDATE open_items SET sort_order = 7 WHERE id = 'ed5531d8-d310-4593-b66c-72f20e038fc1';
UPDATE open_items SET sort_order = 8 WHERE id = 'b8c4bdd6-1600-47d7-9fb9-b71f62725466';
UPDATE open_items SET sort_order = 9 WHERE id = 'fea1b96f-f505-4da8-95e6-3d550db0aa68';

COMMIT;
