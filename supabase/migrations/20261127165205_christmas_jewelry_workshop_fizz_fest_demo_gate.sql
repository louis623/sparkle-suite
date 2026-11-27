-- Record of the migration that already ran on Live (version 20261127165205).
-- It added Christmas Jewelry Workshop to the catalog as a private theme owned by
-- the Fizz Fest demo workspace. 20261127171338_christmas_jewelry_workshop_community
-- (the next migration) opens it to every rep as a Community theme.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $review$
DECLARE
  current_rule text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.reps AS rep
      JOIN public.site_settings AS settings ON settings.rep_id = rep.id
     WHERE rep.id = 'ac3e643a-6ccf-4400-8230-662f63a07f3e'
       AND rep.public_site_slug = 'dudesfizzfest'
       AND rep.status = 'active'
       AND rep.account_classification = 'demo'
       AND rep.finder_directory_visible IS FALSE
       AND rep.custom_domain IS NULL
       AND rep.auth_user_id IS NOT NULL
       AND settings.appearance_preset = 'silver_bells'
  ) THEN
    RAISE EXCEPTION 'Fizz Fest Live demo identity or saved baseline changed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.amethyst_skin_catalog
     WHERE skin_id = 'christmas_jewelry_workshop'
  ) THEN
    RAISE EXCEPTION 'Workshop catalog is already populated';
  END IF;

  SELECT pg_get_expr(conbin, conrelid) INTO STRICT current_rule
    FROM pg_constraint
   WHERE conrelid = 'public.site_settings'::regclass
     AND conname = 'site_settings_appearance_preset_check'
     AND convalidated;

  ALTER TABLE public.site_settings DROP CONSTRAINT site_settings_appearance_preset_check;
  EXECUTE format(
    'ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_appearance_preset_check CHECK ((%s) OR appearance_preset = %L)',
    current_rule,
    'christmas_jewelry_workshop'
  );

  INSERT INTO public.amethyst_skin_catalog (skin_id, visibility, owner_rep_id, allow_internal_demo)
  VALUES ('christmas_jewelry_workshop', 'private', 'ac3e643a-6ccf-4400-8230-662f63a07f3e', false);
END;
$review$;
