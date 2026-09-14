-- Expand the visual preset constraint only; retain database-only legacy skins.
BEGIN;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_appearance_preset_check;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_appearance_preset_check
  CHECK (
    appearance_preset IN (
      'amethyst',
      'sparkle_suite_morganite',
      'black_diamond',
      'moonstone',
      'alpine_opal',
      'emerald_garden',
      'gnome_garden',
      'neon_butterfly',
      'rose_gold',
      'garnet',
      'amber',
      'pearl',
      'luxe',
      'velvet',
      'rose_quartz',
      'ocean_sapphire'
    )
  );

COMMIT;
