-- Undo for supabase/migrations/20261025190000_ss_customer_audience_jewelry_notes_empty_string.sql
-- Makes jewelry_notes nullable again. Does not turn existing '' values back into NULL.
--
-- Restoring those NULLs needs the saved list of row ids. The forward migration
-- sets every NULL jewelry_notes value to ''. On Smoke that was 90 rows. This
-- file does not contain those ids, and a real empty note ('') cannot be told
-- apart from a converted NULL without them. Do not run the optional restore
-- below unless that saved id list is pasted in. This pull request does not
-- run either statement against any database.
--
-- Optional restore, after the statements in this file, using the saved ids:
-- UPDATE public.customer_audience
-- SET jewelry_notes = NULL
-- WHERE id IN (
--   -- paste the saved row ids here (90 rows on Smoke)
-- );

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
