-- Smoke-only: Louis-approved QR center marks (2026-10-09).
-- Applied to Smoke (pukemqiwlyqmyytxkdmo) only. Not for Live.
-- Old values map to the new marks: diamond -> diamond-solid, unicorn -> unicorn-two-tone.

ALTER TABLE public.rep_card_qr_profiles
  ADD COLUMN IF NOT EXISTS qr_icon text NOT NULL DEFAULT 'none';

ALTER TABLE public.rep_card_qr_profiles
  DROP CONSTRAINT IF EXISTS rep_card_qr_profiles_qr_icon_check;

UPDATE public.rep_card_qr_profiles SET qr_icon = 'diamond-solid' WHERE qr_icon = 'diamond';
UPDATE public.rep_card_qr_profiles SET qr_icon = 'unicorn-two-tone' WHERE qr_icon = 'unicorn';

ALTER TABLE public.rep_card_qr_profiles
  ADD CONSTRAINT rep_card_qr_profiles_qr_icon_check
  CHECK (qr_icon IN (
    'none', 'diamond-solid', 'diamond-two-tone', 'unicorn-line', 'unicorn-two-tone',
    'heart', 'smiley', 'gem-ring', 'crown', 'butterfly'
  ));

NOTIFY pgrst, 'reload schema';
