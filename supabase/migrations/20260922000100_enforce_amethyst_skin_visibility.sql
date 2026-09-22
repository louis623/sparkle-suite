-- Enforce catalog-backed visibility for Amethyst customer-site skins.
-- This migration never rewrites an existing customer's selected skin. It verifies
-- private assignments first and aborts on any conflict for Louis to review.
BEGIN;

CREATE TABLE IF NOT EXISTS public.amethyst_skin_catalog (
  skin_id text PRIMARY KEY,
  visibility text NOT NULL CHECK (visibility IN ('community', 'private')),
  owner_rep_id uuid NULL REFERENCES public.reps(id) ON DELETE RESTRICT,
  allow_internal_demo boolean NOT NULL DEFAULT false,
  CHECK (
    (visibility = 'community' AND owner_rep_id IS NULL)
    OR (visibility = 'private' AND owner_rep_id IS NOT NULL)
  )
);

ALTER TABLE public.amethyst_skin_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.amethyst_skin_catalog FROM anon, authenticated;

DO $$
DECLARE
  v_louis_demo_id uuid := 'ac3e643a-6ccf-4400-8230-662f63a07f3e';
  v_kelly_id uuid := 'b5404543-b90a-41cf-85f6-4e6d1d576cfa';
  v_brittany_id uuid;
  v_lindsey_id uuid;
  v_kim_id uuid;
BEGIN
  IF (
    SELECT count(*)
    FROM public.reps
    WHERE id = v_louis_demo_id
      AND email = 'louis@neonrabbit.net'
      AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION 'Louis demo workspace identity guard failed';
  END IF;

  IF (
    SELECT count(*)
    FROM public.reps
    WHERE id = v_kelly_id
      AND public_site_slug = 'sparklybutterflies'
      AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION 'Kelly Sparkly Butterflies identity guard failed';
  END IF;

  IF (
    SELECT count(*)
    FROM public.reps
    WHERE public_site_slug = 'brittwithbling'
      AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION 'Brittany Britt With Bling identity guard failed';
  END IF;
  SELECT id INTO v_brittany_id
  FROM public.reps
  WHERE public_site_slug = 'brittwithbling'
    AND status = 'active';

  IF (
    SELECT count(*)
    FROM public.reps
    WHERE public_site_slug = 'milehighfizz'
      AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION 'Lindsey Mile High Fizz identity guard failed';
  END IF;
  SELECT id INTO v_lindsey_id
  FROM public.reps
  WHERE public_site_slug = 'milehighfizz'
    AND status = 'active';

  IF (
    SELECT count(*)
    FROM public.reps
    WHERE public_site_slug = 'goforthebling'
      AND status = 'active'
  ) <> 1 THEN
    RAISE EXCEPTION 'Kim Go for the Bling identity guard failed';
  END IF;
  SELECT id INTO v_kim_id
  FROM public.reps
  WHERE public_site_slug = 'goforthebling'
    AND status = 'active';

  INSERT INTO public.amethyst_skin_catalog (
    skin_id,
    visibility,
    owner_rep_id,
    allow_internal_demo
  )
  VALUES
    ('amethyst', 'community', NULL, false),
    ('sparkle_suite_morganite', 'community', NULL, false),
    ('black_diamond', 'private', v_brittany_id, true),
    ('moonstone', 'community', NULL, false),
    ('alpine_opal', 'private', v_lindsey_id, true),
    ('emerald_garden', 'community', NULL, false),
    ('gnome_garden', 'private', v_kim_id, true),
    ('neon_butterfly', 'private', v_kelly_id, true),
    ('halloween_pumpkin_witch', 'community', NULL, false),
    ('rose_gold', 'community', NULL, false),
    ('garnet', 'community', NULL, false),
    ('amber', 'community', NULL, false),
    ('velvet', 'community', NULL, false),
    ('rose_quartz', 'community', NULL, false)
  ON CONFLICT (skin_id) DO UPDATE
  SET
    visibility = EXCLUDED.visibility,
    owner_rep_id = EXCLUDED.owner_rep_id,
    allow_internal_demo = EXCLUDED.allow_internal_demo;

  -- Read-only safety gate: do not alter any existing site setting. A conflict
  -- rolls this transaction back so it can be reviewed deliberately.
  IF EXISTS (
    SELECT 1
    FROM public.site_settings settings
    JOIN public.amethyst_skin_catalog catalog
      ON catalog.skin_id = settings.appearance_preset
    WHERE catalog.visibility = 'private'
      AND settings.rep_id NOT IN (catalog.owner_rep_id, v_louis_demo_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.reps reviewer
        WHERE reviewer.id = settings.rep_id
          AND reviewer.status = 'active'
          AND reviewer.account_classification = 'demo'
          AND reviewer.finder_directory_visible = false
          AND reviewer.custom_domain IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'Private skin assignment conflict: review current assignments before release';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.amethyst_skin_is_available_to_rep(
  p_rep_id uuid,
  p_skin_id text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visibility text;
  v_owner_rep_id uuid;
  v_allow_internal_demo boolean;
BEGIN
  -- A browser session may ask only about its own rep. Service-role callers are
  -- used by server-owned write paths and migration verification.
  IF auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.reps
      WHERE id = p_rep_id
        AND auth_user_id = auth.uid()
    ) THEN
    RETURN false;
  END IF;

  SELECT visibility, owner_rep_id, allow_internal_demo
  INTO v_visibility, v_owner_rep_id, v_allow_internal_demo
  FROM public.amethyst_skin_catalog
  WHERE skin_id = p_skin_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_visibility = 'community' THEN
    RETURN true;
  END IF;

  IF p_rep_id IN (
    v_owner_rep_id,
    'ac3e643a-6ccf-4400-8230-662f63a07f3e'::uuid
  ) THEN
    RETURN true;
  END IF;

  RETURN v_allow_internal_demo
    AND EXISTS (
      SELECT 1
      FROM public.reps
      WHERE id = p_rep_id
        AND status = 'active'
        AND account_classification = 'demo'
        AND finder_directory_visible = false
        AND custom_domain IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.list_available_amethyst_skin_ids(
  p_rep_id uuid
)
RETURNS TABLE(skin_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT catalog.skin_id
  FROM public.amethyst_skin_catalog catalog
  WHERE public.amethyst_skin_is_available_to_rep(p_rep_id, catalog.skin_id)
  ORDER BY catalog.skin_id;
$$;

REVOKE ALL ON FUNCTION public.amethyst_skin_is_available_to_rep(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_available_amethyst_skin_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.amethyst_skin_is_available_to_rep(uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_available_amethyst_skin_ids(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_amethyst_skin_visibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.appearance_preset IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.amethyst_skin_is_available_to_rep(
    NEW.rep_id,
    NEW.appearance_preset
  ) THEN
    RAISE EXCEPTION 'appearance preset is not available to this rep'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS site_settings_amethyst_skin_visibility ON public.site_settings;
CREATE TRIGGER site_settings_amethyst_skin_visibility
BEFORE INSERT OR UPDATE OF appearance_preset ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_amethyst_skin_visibility();

-- The catalog-backed trigger supersedes the former one-skin-only check and
-- allows explicitly marked internal demo/reviewer workspaces to review safely.
ALTER TABLE public.site_settings
  DROP CONSTRAINT IF EXISTS site_settings_neon_butterfly_owner_check;

COMMIT;
