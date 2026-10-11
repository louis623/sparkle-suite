-- Smoke-only: business card back social platform mark (Louis, 2026-10-11).
-- Applied to Smoke (pukemqiwlyqmyytxkdmo) only. Not for Live.
-- The chosen platform picks which handle shows and its brand mark replaces the generic @ icon.

ALTER TABLE public.rep_card_qr_profiles
  ADD COLUMN IF NOT EXISTS social_platform text NOT NULL DEFAULT 'tiktok';

ALTER TABLE public.rep_card_qr_profiles
  DROP CONSTRAINT IF EXISTS rep_card_qr_profiles_social_platform_check;

ALTER TABLE public.rep_card_qr_profiles
  ADD CONSTRAINT rep_card_qr_profiles_social_platform_check
  CHECK (social_platform IN ('tiktok', 'instagram', 'facebook', 'youtube'));

NOTIFY pgrst, 'reload schema';
