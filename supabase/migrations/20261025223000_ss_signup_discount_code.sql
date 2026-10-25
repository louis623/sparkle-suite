-- Optional per-rep code shown after a customer submits the public signup form.
-- This pull request does not apply the migration. Run it on Smoke before Live.
-- Lindsey's Mile High Fizz code is a separate data change. Do not add it here.

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS signup_discount_code TEXT,
  ADD COLUMN IF NOT EXISTS signup_discount_offer TEXT;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_signup_discount_code_shape;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_signup_discount_code_shape
  CHECK (
    signup_discount_code IS NULL
    OR signup_discount_code ~ '^[A-Za-z0-9-]{1,40}$'
  );

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_signup_discount_offer_length;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_signup_discount_offer_length
  CHECK (
    signup_discount_offer IS NULL
    OR (
      char_length(signup_discount_offer) BETWEEN 1 AND 40
      AND char_length(btrim(signup_discount_offer)) >= 1
    )
  );

COMMENT ON COLUMN public.site_settings.signup_discount_code IS
  'Optional public discount code shown after a customer submits the rep site signup form. NULL hides it.';

COMMENT ON COLUMN public.site_settings.signup_discount_offer IS
  'Short offer phrase for that code, such as 15% off. The confirmation says Your {offer} code. NULL uses Your discount code.';

NOTIFY pgrst, 'reload schema';
