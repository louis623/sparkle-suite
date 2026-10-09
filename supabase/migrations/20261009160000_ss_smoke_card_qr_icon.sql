-- Smoke-only center mark for Cards & QR.
-- NOT APPLIED. Louis has not asked for this column on Smoke or live.
-- The app treats a missing qr_icon column as "none" so Smoke keeps working.

ALTER TABLE public.rep_card_qr_profiles
  ADD COLUMN IF NOT EXISTS qr_icon text NOT NULL DEFAULT 'none';

ALTER TABLE public.rep_card_qr_profiles
  DROP CONSTRAINT IF EXISTS rep_card_qr_profiles_qr_icon_check;

ALTER TABLE public.rep_card_qr_profiles
  ADD CONSTRAINT rep_card_qr_profiles_qr_icon_check
  CHECK (qr_icon IN ('none', 'diamond', 'unicorn'));

NOTIFY pgrst, 'reload schema';
