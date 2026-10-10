-- Smoke-only: business card back options + rep-entered text-to-link number (2026-10-09).
-- Applied to Smoke (pukemqiwlyqmyytxkdmo) only. Not for Live.
-- text_link_number is typed by the rep; the app never copies the account phone into it.

ALTER TABLE public.rep_card_qr_profiles
  ADD COLUMN IF NOT EXISTS show_website boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_text_link boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS text_link_number text;

ALTER TABLE public.rep_card_qr_profiles
  DROP CONSTRAINT IF EXISTS rep_card_qr_profiles_text_link_number_check;

ALTER TABLE public.rep_card_qr_profiles
  ADD CONSTRAINT rep_card_qr_profiles_text_link_number_check
  CHECK (text_link_number IS NULL OR (char_length(text_link_number) <= 24 AND text_link_number ~ '^[0-9+(). -]+$'));

NOTIFY pgrst, 'reload schema';
