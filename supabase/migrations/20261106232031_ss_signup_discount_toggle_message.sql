-- Preserve existing valid codes while making new signup discounts opt-in.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS signup_discount_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signup_discount_message text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.site_settings'::regclass
      AND conname = 'site_settings_signup_discount_message_length'
  ) THEN
    ALTER TABLE public.site_settings
      ADD CONSTRAINT site_settings_signup_discount_message_length
      CHECK (signup_discount_message IS NULL OR
        (char_length(signup_discount_message) BETWEEN 1 AND 140
         AND char_length(btrim(signup_discount_message)) >= 1));
  END IF;
END $$;

UPDATE public.site_settings SET signup_discount_enabled = true
WHERE signup_discount_code ~ '^[A-Za-z0-9-]{1,40}$';

NOTIFY pgrst, 'reload schema';
