-- Undo for the customer sign-up jewelry preference migrations:
--   supabase/migrations/20261020150200_ss_customer_audience_jewelry_notes.sql
--   supabase/migrations/20261020150100_ss_customer_audience_ring_size.sql
--   supabase/migrations/20261020150000_ss_customer_audience_favorite_arrays.sql
-- Deletes collected data. Run only after an app rollback.

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_jewelry_notes_length;

ALTER TABLE public.customer_audience
  DROP COLUMN IF EXISTS jewelry_notes;

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_ring_size_check;

ALTER TABLE public.customer_audience
  DROP COLUMN IF EXISTS ring_size;

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_stones_check,
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_materials_check,
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_cuts_check,
  DROP CONSTRAINT IF EXISTS customer_audience_favorite_collections_check;

ALTER TABLE public.customer_audience
  DROP COLUMN IF EXISTS favorite_stones,
  DROP COLUMN IF EXISTS favorite_materials,
  DROP COLUMN IF EXISTS favorite_cuts,
  DROP COLUMN IF EXISTS favorite_collections;

NOTIFY pgrst, 'reload schema';
