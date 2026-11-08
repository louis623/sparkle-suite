// Print the Smoke-only SQL after deploying a build with new appearance presets:
// node --import tsx scripts/smoke-environment/fizz-fest-theme-access.ts
// Apply the normal skin migrations first, then run the output on Suite Smoke.
import { AMETHYST_APPEARANCE_PRESET_IDS } from '../../lib/amethyst/appearance-presets'

const previewIds = AMETHYST_APPEARANCE_PRESET_IDS.map(id => {
  if (!/^[a-z0-9_]+$/.test(id)) throw new Error('Invalid theme identifier')
  return `'${id}'`
}).join(', ')

console.log(`
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.reps WHERE id='56c59f36-0e37-4e8e-a664-a1b293699c11'
      AND public_site_slug='dudesfizzfest' AND status='active' AND account_classification='demo'
      AND finder_directory_visible IS FALSE AND custom_domain IS NULL AND auth_user_id IS NOT NULL
  ) OR EXISTS (SELECT 1 FROM public.reps WHERE id='ac3e643a-6ccf-4400-8230-662f63a07f3e') THEN
    RAISE EXCEPTION 'Expected the isolated Suite Smoke Fizz Fest fixture';
  END IF;
END $guard$;

CREATE SCHEMA IF NOT EXISTS sparkle_smoke_review;
REVOKE ALL ON SCHEMA sparkle_smoke_review FROM PUBLIC, anon, authenticated, service_role;

-- Retain the installed owner/catalog policy as the fallback for every other rep.
DO $install$
BEGIN
  IF to_regprocedure('sparkle_smoke_review.amethyst_skin_is_available_to_rep(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.amethyst_skin_is_available_to_rep(uuid,text) SET SCHEMA sparkle_smoke_review;
  END IF;
END $install$;

CREATE OR REPLACE FUNCTION sparkle_smoke_review.fizz_fest_theme_ids(p_rep_id uuid)
RETURNS TABLE(skin_id text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $ids$
  WITH eligible AS (
    SELECT 1 FROM public.reps r WHERE r.id=p_rep_id
      AND r.id='56c59f36-0e37-4e8e-a664-a1b293699c11' AND r.public_site_slug='dudesfizzfest'
      AND r.status='active' AND r.account_classification='demo'
      AND r.finder_directory_visible IS FALSE AND r.custom_domain IS NULL
      AND r.auth_user_id IS NOT NULL AND (auth.uid() IS NULL OR r.auth_user_id=auth.uid())
  ), supported AS (
    SELECT c.skin_id FROM public.amethyst_skin_catalog c
    UNION SELECT unnest(ARRAY[${previewIds}]::text[])
  )
  SELECT supported.skin_id FROM supported WHERE EXISTS (SELECT 1 FROM eligible)
$ids$;
REVOKE ALL ON FUNCTION sparkle_smoke_review.fizz_fest_theme_ids(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.amethyst_skin_is_available_to_rep(p_rep_id uuid,p_skin_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $check$
  SELECT EXISTS (SELECT 1 FROM sparkle_smoke_review.fizz_fest_theme_ids(p_rep_id) t WHERE t.skin_id=p_skin_id)
      OR sparkle_smoke_review.amethyst_skin_is_available_to_rep(p_rep_id,p_skin_id)
$check$;

CREATE OR REPLACE FUNCTION public.list_available_amethyst_skin_ids(p_rep_id uuid)
RETURNS TABLE(skin_id text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $list$
  SELECT c.skin_id FROM public.amethyst_skin_catalog c
  WHERE sparkle_smoke_review.amethyst_skin_is_available_to_rep(p_rep_id,c.skin_id)
  UNION SELECT t.skin_id FROM sparkle_smoke_review.fizz_fest_theme_ids(p_rep_id) t
  ORDER BY 1
$list$;

REVOKE ALL ON FUNCTION public.amethyst_skin_is_available_to_rep(uuid,text), public.list_available_amethyst_skin_ids(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.amethyst_skin_is_available_to_rep(uuid,text), public.list_available_amethyst_skin_ids(uuid) TO authenticated, service_role;
`)
