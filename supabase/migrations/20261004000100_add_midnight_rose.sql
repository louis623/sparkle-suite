-- RG-02 is a new Community theme. Preserve all current and legacy selections.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.amethyst_skin_catalog
    WHERE skin_id = 'midnight_rose'
      AND (visibility <> 'community' OR owner_rep_id IS NOT NULL OR allow_internal_demo IS DISTINCT FROM false)
  ) THEN
    RAISE EXCEPTION 'Midnight Rose already has a different catalog policy; review before applying this migration';
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
      'rose_gold', 'midnight_rose', 'garnet', 'amber', 'pearl', 'luxe',
      'velvet', 'rose_quartz', 'ocean_sapphire'
    )
  );

INSERT INTO public.amethyst_skin_catalog (skin_id, visibility, owner_rep_id, allow_internal_demo)
VALUES ('midnight_rose', 'community', NULL, false)
ON CONFLICT (skin_id) DO NOTHING;
COMMIT;
