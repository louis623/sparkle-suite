-- Cards & QR: QR center mark column (2026-10-09). Applied to Smoke.
-- Live: apply in the order in docs/card-qr/LIVE-APPLY.md.

ALTER TABLE public.rep_card_qr_profiles
  ADD COLUMN IF NOT EXISTS qr_icon text NOT NULL DEFAULT 'none';

ALTER TABLE public.rep_card_qr_profiles
  DROP CONSTRAINT IF EXISTS rep_card_qr_profiles_qr_icon_check;

ALTER TABLE public.rep_card_qr_profiles
  ADD CONSTRAINT rep_card_qr_profiles_qr_icon_check
  CHECK (qr_icon IN ('none', 'diamond', 'unicorn'));

NOTIFY pgrst, 'reload schema';
