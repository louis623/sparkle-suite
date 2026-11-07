-- Roll back only the signup-discount toggle and custom message.
ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_signup_discount_message_length,
  DROP COLUMN IF EXISTS signup_discount_message,
  DROP COLUMN IF EXISTS signup_discount_enabled;

NOTIFY pgrst, 'reload schema';
