-- SB-01 Sunset Beach is additive; preserve every current and legacy selection.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.amethyst_skin_catalog
    WHERE skin_id = 'sunset_beach'
      AND (visibility <> 'community' OR owner_rep_id IS NOT NULL OR allow_internal_demo IS DISTINCT FROM false)
  ) THEN
    RAISE EXCEPTION 'Sunset Beach already has a different catalog policy; review before applying this migration';
  END IF;
END;
$$;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_appearance_preset_check;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_appearance_preset_check CHECK (
    appearance_preset IN (
      'amethyst', 'sparkle_suite_morganite', 'black_diamond', 'moonstone',
      'alpine_opal', 'emerald_garden', 'gnome_garden', 'neon_butterfly',
      'halloween_pumpkin_witch', 'halloween_pumpkin_cat', 'gilded_autumn',
      'sunset_beach', 'gobble_and_fizz', 'pie_please', 'rose_gold', 'midnight_rose', 'pearl_rose', 'rose_champagne', 'fall_owl_harvest_moon', 'garnet', 'amber', 'pearl', 'luxe',
      'velvet', 'rose_quartz', 'ocean_sapphire'
    )
  );

INSERT INTO public.amethyst_skin_catalog (skin_id, visibility, owner_rep_id, allow_internal_demo)
VALUES ('sunset_beach', 'community', NULL, false)
ON CONFLICT (skin_id) DO NOTHING;
COMMIT;
