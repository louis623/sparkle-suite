-- Empty jewelry notes use one value, ''.
-- Run on Smoke before Live. This pull request does not apply it.

UPDATE public.customer_audience
SET jewelry_notes = ''
WHERE jewelry_notes IS NULL;

ALTER TABLE public.customer_audience
  ALTER COLUMN jewelry_notes SET DEFAULT '';

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_jewelry_notes_length;

ALTER TABLE public.customer_audience
  ADD CONSTRAINT customer_audience_jewelry_notes_length
  CHECK (length(jewelry_notes) <= 500);

ALTER TABLE public.customer_audience
  ALTER COLUMN jewelry_notes SET NOT NULL;

COMMENT ON COLUMN public.customer_audience.jewelry_notes IS
  'Customer-written notes about the jewelry they like, 500 characters max. Empty is ''''. Separate from the rep-private notes column.';

NOTIFY pgrst, 'reload schema';
