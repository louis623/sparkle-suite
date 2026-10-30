-- Optional ring size on customer sign-up.
-- Blank answers stay null. "Not sure" is stored as not_sure.
-- Allowed values match Finder RING_SIZE_VALUES in lib/sparkle-finder/ring-sizes.ts:
-- Bomb Party FAQ sizes 5-11, whole sizes only, plus not_sure. No half sizes.
-- To change the list, edit the check below and the Suite ring-size constant together.

ALTER TABLE public.customer_audience
  ADD COLUMN IF NOT EXISTS ring_size text;

ALTER TABLE public.customer_audience
  DROP CONSTRAINT IF EXISTS customer_audience_ring_size_check;

ALTER TABLE public.customer_audience
  ADD CONSTRAINT customer_audience_ring_size_check
  CHECK (ring_size IS NULL OR ring_size IN ('5', '6', '7', '8', '9', '10', '11', 'not_sure'));

COMMENT ON COLUMN public.customer_audience.ring_size IS
  'Optional whole ring size 5-11, or not_sure. Null means the customer left it blank.';

NOTIFY pgrst, 'reload schema';
