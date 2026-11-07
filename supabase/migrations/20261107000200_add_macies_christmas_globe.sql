-- Add the private Main Gem Co. skin without selecting it for any workspace.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.reps
    WHERE (public_site_slug = 'maingemco' AND id <> '0c54de1c-dba9-4e82-b2ce-abe51758e65b')
       OR (id = '0c54de1c-dba9-4e82-b2ce-abe51758e65b' AND public_site_slug IS DISTINCT FROM 'maingemco')
  ) THEN
    RAISE EXCEPTION 'Main Gem Co. identity mismatch; review owner mapping before activation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.amethyst_skin_catalog
    WHERE skin_id = 'macies_christmas_globe'
      AND (visibility <> 'private' OR owner_rep_id IS DISTINCT FROM '0c54de1c-dba9-4e82-b2ce-abe51758e65b' OR allow_internal_demo IS DISTINCT FROM true)
  ) THEN
    RAISE EXCEPTION 'Macie globe already has a different catalog policy; review before applying this migration';
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
      'macies_christmas_globe', 'starlight_christmas_hollow', 'sunset_beach', 'gobble_and_fizz', 'pie_please', 'rose_gold', 'midnight_rose', 'pearl_rose', 'rose_champagne', 'fall_owl_harvest_moon', 'garnet', 'amber', 'pearl', 'luxe',
      'velvet', 'rose_quartz', 'ocean_sapphire'
    )
  );

INSERT INTO public.amethyst_skin_catalog (skin_id, visibility, owner_rep_id, allow_internal_demo)
-- Smoke and fresh installations can lack the owner. Leave the skin unissued
-- there. Never create a customer account as a side effect of a migration.
SELECT 'macies_christmas_globe', 'private', id, true
FROM public.reps
WHERE id = '0c54de1c-dba9-4e82-b2ce-abe51758e65b' AND public_site_slug = 'maingemco'
ON CONFLICT (skin_id) DO NOTHING;
COMMIT;
