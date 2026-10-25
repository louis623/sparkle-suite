-- Undo for supabase/migrations/20261025223000_ss_signup_discount_code.sql
-- Drops the signup discount columns and the codes stored in them.

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_signup_discount_code_shape;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_signup_discount_offer_length;

ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS signup_discount_offer;

ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS signup_discount_code;

NOTIFY pgrst, 'reload schema';
