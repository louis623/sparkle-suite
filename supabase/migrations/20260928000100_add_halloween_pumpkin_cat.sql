-- Add the approved Pumpkin and Cat community skin. Existing selections are unchanged.
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
      'halloween_pumpkin_witch',
      'halloween_pumpkin_cat',
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

INSERT INTO public.amethyst_skin_catalog (skin_id, visibility, owner_rep_id, allow_internal_demo)
VALUES ('halloween_pumpkin_cat', 'community', NULL, false)
ON CONFLICT (skin_id) DO NOTHING;
COMMIT;
