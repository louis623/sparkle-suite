-- Undo for supabase/migrations/20261025190000_ss_customer_audience_jewelry_notes_empty_string.sql
-- Makes jewelry_notes nullable again. Does not turn existing '' values back into NULL.

ALTER TABLE public.customer_audience
  ALTER COLUMN jewelry_notes DROP NOT NULL;

ALTER TABLE public.customer_audience
  ALTER COLUMN jewelry_notes DROP DEFAULT;

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_jewelry_notes_length;

ALTER TABLE public.customer_audience
  ADD CONSTRAINT customer_audience_jewelry_notes_length
  CHECK (jewelry_notes IS NULL OR length(jewelry_notes) <= 500);

COMMENT ON COLUMN public.customer_audience.jewelry_notes IS
  'Customer-written notes about the jewelry they like, 500 characters max. Separate from the rep-private notes column.';

NOTIFY pgrst, 'reload schema';
