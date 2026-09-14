BEGIN;

DO $$
DECLARE
  kelly_rep_id uuid := 'b5404543-b90a-41cf-85f6-4e6d1d576cfa';
  louis_demo_rep_id uuid := 'ac3e643a-6ccf-4400-8230-662f63a07f3e';
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.reps
    WHERE id = kelly_rep_id
      AND public_site_slug = 'sparklybutterflies'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Kelly Sparkly Butterflies identity guard failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.reps
    WHERE id = louis_demo_rep_id
      AND email = 'louis@neonrabbit.net'
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Louis demo workspace identity guard failed';
  END IF;

  UPDATE public.site_settings
  SET
    customer_site_template = 'amethyst',
    appearance_preset = 'neon_butterfly',
    updated_at = now()
  WHERE rep_id = kelly_rep_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kelly Sparkly Butterflies site settings row is missing';
  END IF;

  UPDATE public.site_settings
  SET
    appearance_preset = 'sparkle_suite_morganite',
    updated_at = now()
  WHERE appearance_preset = 'neon_butterfly'
    AND rep_id NOT IN (kelly_rep_id, louis_demo_rep_id);
END;
$$;

ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_neon_butterfly_owner_check;

ALTER TABLE public.site_settings
  ADD CONSTRAINT site_settings_neon_butterfly_owner_check
  CHECK (
    appearance_preset <> 'neon_butterfly'
    OR rep_id IN (
      'b5404543-b90a-41cf-85f6-4e6d1d576cfa'::uuid,
      'ac3e643a-6ccf-4400-8230-662f63a07f3e'::uuid
    )
  );

COMMIT;
