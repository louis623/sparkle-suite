-- Customer-written jewelry notes from the site sign-up.
-- Kept apart from customer_audience.notes, which is the rep's private notes.

ALTER TABLE public.customer_audience
  ADD COLUMN IF NOT EXISTS jewelry_notes text;

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_jewelry_notes_length;

ALTER TABLE public.customer_audience
  ADD CONSTRAINT customer_audience_jewelry_notes_length
  CHECK (jewelry_notes IS NULL OR length(jewelry_notes) <= 500);

COMMENT ON COLUMN public.customer_audience.jewelry_notes IS
  'Customer-written notes about the jewelry they like, 500 characters max. Separate from the rep-private notes column.';

NOTIFY pgrst, 'reload schema';
