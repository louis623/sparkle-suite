-- Cards & QR: text-to-link opt-ins (Louis, 2026-10-11).
-- Applied to Smoke. Live: apply in the order in docs/card-qr/LIVE-APPLY.md.
-- The number is entered once; the rep checks "Add text-to-link number" separately
-- in the flyer section (show_flyer_text_link) and the card section (show_text_link).

ALTER TABLE public.rep_card_qr_profiles
  ADD COLUMN IF NOT EXISTS show_flyer_text_link boolean NOT NULL DEFAULT false;

-- New profiles start unchecked on the card too; existing rows keep their saved choice.
ALTER TABLE public.rep_card_qr_profiles
  ALTER COLUMN show_text_link SET DEFAULT false;

NOTIFY pgrst, 'reload schema';
