-- Undo for supabase/migrations/20261019000100_add_thanksgiving_community_themes.sql.
-- Run only after an app rollback.

BEGIN;

DO $$
DECLARE
  in_use int;
BEGIN
  SELECT count(*) INTO in_use
  FROM public.site_settings
  WHERE appearance_preset IN ('gobble_and_fizz', 'pie_please');

  IF in_use <> 0 THEN
    RAISE EXCEPTION 'Refusing to undo Thanksgiving themes: % site_settings row(s) still use gobble_and_fizz or pie_please', in_use;
  END IF;
END;
$$;

DELETE FROM public.amethyst_skin_catalog
WHERE skin_id IN ('gobble_and_fizz', 'pie_please');

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_appearance_preset_check;
ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_appearance_preset_check CHECK (
    appearance_preset IN (
      'amethyst', 'sparkle_suite_morganite', 'black_diamond', 'moonstone',
      'alpine_opal', 'emerald_garden', 'gnome_garden', 'neon_butterfly',
      'halloween_pumpkin_witch', 'halloween_pumpkin_cat', 'gilded_autumn',
      'rose_gold', 'midnight_rose', 'pearl_rose', 'rose_champagne', 'fall_owl_harvest_moon', 'garnet', 'amber', 'pearl', 'luxe',
      'velvet', 'rose_quartz', 'ocean_sapphire'
    )
  );

COMMIT;
