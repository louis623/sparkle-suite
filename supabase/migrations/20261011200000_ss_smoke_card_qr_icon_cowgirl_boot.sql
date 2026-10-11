-- Smoke-only: Louis-approved QR center marks, set 3b (2026-10-11): adds cowgirl-boot (33rd mark).
-- Applied to Smoke (pukemqiwlyqmyytxkdmo) only. Not for Live.

ALTER TABLE public.rep_card_qr_profiles
  DROP CONSTRAINT IF EXISTS rep_card_qr_profiles_qr_icon_check;

ALTER TABLE public.rep_card_qr_profiles
  ADD CONSTRAINT rep_card_qr_profiles_qr_icon_check
  CHECK (qr_icon IN (
    'none', 'diamond-solid', 'diamond-two-tone', 'unicorn-line', 'unicorn-two-tone', 'heart',
    'smiley', 'gem-ring', 'crown', 'butterfly', 'heart-sparkle', 'gift',
    'peace', 'cross', 'bath-bomb', 'ladybug', 'rose', 'daisy',
    'tulips', 'palm', 'cowboy-hat', 'cowboy-hat-side', 'bat', 'skull',
    'jack-o-lantern', 'jack-o-lantern-spooky', 'xmas-tree', 'xmas-tree-ornaments', 'snowflake', 'wreath',
    'candy-cane', 'santa-hat', 'cowgirl-boot'
  ));

NOTIFY pgrst, 'reload schema';
