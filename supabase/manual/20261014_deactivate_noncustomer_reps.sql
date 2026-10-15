-- Manual status change for a hard-coded list of rep UUIDs.
-- NOT a migration. Do not move this file under supabase/migrations.
--
-- Header count, verified by a read-only Live SELECT on 2026-10-15.
-- Live had 32 reps. Twelve stay protected. The other 20 are the targets below.
--   expected_inactive_count: 19
--   expected_churned_count: 1
--   expected_match_count: 20
-- A review count of 20 inactive targets plus Stephanie does not match that
-- inventory. Stephanie is one of the 20, not a 21st row. There is no extra
-- inactive UUID. This script aborts unless exactly these 20 ids exist.
--
-- rep_status allows onboarding, active, inactive, suspended, churned.
-- account_classification allows customer or demo. The real-customer value is customer.
-- The 19 test, demo, and smoke reps are set to inactive. Classification stays as it is.
-- Stephanie Graham (cf798d57-c2f7-40d7-a862-2fc39ca3a4b1, cookiefountainsdk@gmail.com)
-- is set to status churned and account_classification customer.
--
-- Match is by rep id only. Emails in comments are labels, not predicates.
-- The script records previous status, account_classification, and updated_at
-- in public.manual_rep_status_backup_20261014 before it changes any rep.
-- It does not remove rows.
--
-- Do not run this on the Live database until Louis explicitly says OK.
-- An agent may run it only on the Smoke database.
--
-- Before running, in the same session:
--   Smoke: SET sparkle.allow_rep_deactivation = 'smoke';
--   Live, only after Louis's OK: SET sparkle.allow_rep_deactivation = 'approved-live';
--
-- Undo: supabase/manual/20261014_deactivate_noncustomer_reps_undo.sql
-- Inventory: supabase/manual/20261014_deactivate_noncustomer_reps_preflight.sql

BEGIN;

DO $guard$
BEGIN
  IF current_setting('sparkle.allow_rep_deactivation', true) IS DISTINCT FROM 'smoke'
     AND current_setting('sparkle.allow_rep_deactivation', true) IS DISTINCT FROM 'approved-live' THEN
    RAISE EXCEPTION 'Refusing to change rep status. Set sparkle.allow_rep_deactivation to smoke, or to approved-live only after Louis approves a Live run.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'rep_status'
      AND e.enumlabel = 'inactive'
  ) THEN
    RAISE EXCEPTION 'public.rep_status has no inactive value. No rows were changed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'rep_status'
      AND e.enumlabel = 'churned'
  ) THEN
    RAISE EXCEPTION 'public.rep_status has no churned value. No rows were changed.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.reps'::regclass
      AND conname = 'reps_account_classification_check'
      AND strpos(pg_get_constraintdef(oid), '''customer''') > 0
  ) THEN
    RAISE EXCEPTION 'reps.account_classification does not allow customer. No rows were changed.';
  END IF;
END
$guard$;

CREATE TABLE IF NOT EXISTS public.manual_rep_status_backup_20261014 (
  rep_id uuid PRIMARY KEY,
  rep_email text NOT NULL,
  auth_email text,
  previous_status public.rep_status NOT NULL,
  previous_account_classification text NOT NULL,
  previous_updated_at timestamptz NOT NULL,
  public_site_slug text,
  display_name text,
  business_name text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_rep_status_backup_20261014
  ADD COLUMN IF NOT EXISTS previous_account_classification text;

ALTER TABLE public.manual_rep_status_backup_20261014
  ADD COLUMN IF NOT EXISTS previous_updated_at timestamptz;

COMMENT ON TABLE public.manual_rep_status_backup_20261014 IS
  'Manual backup before the 20261014 rep status change. Undo restores previous_status, previous_account_classification, and previous_updated_at. Do not remove its rows.';

ALTER TABLE public.manual_rep_status_backup_20261014 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.manual_rep_status_backup_20261014 FROM PUBLIC, anon, authenticated;

DO $deactivate$
DECLARE
  expected_inactive constant int := 19;
  expected_churned constant int := 1;
  expected_protected constant int := 12;
  expected_total constant int := 20;
  inactive_ids uuid[] := ARRAY[
    'bd45ca25-236a-4621-9952-4d1a8a106c8f'::uuid, -- demo-prelaunch-waitlist@yoursparklesuite.com
    '5f3fb1f9-8108-427c-8134-8e2e016f6974'::uuid, -- demo01@neonrabbit.net
    '5dc6c155-f46f-4806-85ba-636a588e653c'::uuid, -- gatetest@neonrabbit.net
    'db76705d-4229-4be2-ac83-57e06b9ec599'::uuid, -- janetest@gmail.com
    '623f80cb-238b-4706-a3f3-67ac28bd5786'::uuid, -- louis+sparkle-beta-demo@neonrabbit.net
    'd0b2f7da-8aa2-4e7d-983a-3263996ad58b'::uuid, -- louis+sparkle-demo-2@neonrabbit.net
    '7825ac2b-c5be-4d31-87c5-eaca63fe351b'::uuid, -- louis+sparkle-demo@neonrabbit.net
    '45d02979-b84b-47f7-a89d-f93920d55bc2'::uuid, -- louis+sparkle-live-smoke-1781197388951@neonrabbit.net
    '65adbb3f-56c6-48f8-90bd-3e6540b2518a'::uuid, -- louis+sparkle-live-smoke-1781197885226@neonrabbit.net
    '0ae79b13-6c2f-48d0-bfca-5be8f2dce46f'::uuid, -- louischapman1@gmail.com
    '065854fd-7e32-4251-8206-2d65f4f09e92'::uuid, -- mila.harper.smoke.20260604@example.com
    '196779da-85df-4b96-a3c7-cce44d7d8ed8'::uuid, -- smoke.rep.1780593846442@example.com
    'bc61d039-b817-425b-a35b-b5de9482429a'::uuid, -- smoke.rep.1780598666326@example.com
    '4f9ee538-edd4-42a2-a44a-7d21ce3043a0'::uuid, -- smoke.rep.1780601179810@example.com
    '1850fb28-68a2-4235-9e36-cc5a4f2d7ab8'::uuid, -- smoke.rep.20260605001558@example.com
    'd5decc2c-6260-462c-9d59-d34c9b0f0677'::uuid, -- sparkle-demo-1780753483318@example.test
    '58e5c338-3722-4428-9e32-a2bdc8b3568d'::uuid, -- sparkle-smoke+1780589740368@neonrabbit.net
    'c78e17af-5286-4300-9567-1f2d7b1a3881'::uuid, -- spike-b@neonrabbit.test
    '5314c64e-a02d-4eb2-bcee-88797dd0961c'::uuid  -- testrep@neonrabbit.net
  ];
  churned_ids uuid[] := ARRAY[
    'cf798d57-c2f7-40d7-a862-2fc39ca3a4b1'::uuid -- cookiefountainsdk@gmail.com Stephanie Graham
  ];
  protected_ids uuid[] := ARRAY[
    '9a971c05-3631-443e-bcb8-4e9a26e15885'::uuid, -- blingkitchen19@gmail.com Heather
    '43fc5fb5-205f-40cd-a42e-a36099411f19'::uuid, -- braxtonsherri33@gmail.com Brittany
    'b5404543-b90a-41cf-85f6-4e6d1d576cfa'::uuid, -- kellyygiselleee@gmail.com Kelly
    '1b8be17b-cc4f-458b-8c11-cc097be4fba3'::uuid, -- ksgoforth64@gmail.com Kim
    'c24a43b7-8669-470f-8088-c2163f1c1de3'::uuid, -- lane-accounting-viewer@neonrabbit.internal
    'f82734fd-6964-42c7-b67d-c2445528c3b4'::uuid, -- lindseychapman1188@gmail.com Lindsey
    'ac3e643a-6ccf-4400-8230-662f63a07f3e'::uuid, -- louis@neonrabbit.net Louis
    '6e545f46-9449-4a07-a25a-8e859eba383f'::uuid, -- nic-nac-support@neonrabbit.net
    'ff7b4656-f9ab-431d-b4a4-558e0c8513ca'::uuid, -- sparkle-reviewer+loc@example.test
    '473cba20-7401-4bd4-af82-9e10e8bfacee'::uuid, -- sparkle-reviewer+local@neonrabbit.net
    'f2fdba81-4122-4de4-9695-f9caf9c4aba5'::uuid, -- sparkle-reviewer+preview@neonrabbit.net
    '2b5a27c5-9c05-4014-8d0b-754e19815bf6'::uuid  -- williams.brianna19@yahoo.com Bri
  ];
  distinct_inactive int;
  distinct_churned int;
  distinct_protected int;
  matched_inactive int;
  matched_churned int;
  backed_up int;
  rec record;
BEGIN
  IF cardinality(inactive_ids) <> expected_inactive
     OR cardinality(churned_ids) <> expected_churned
     OR cardinality(protected_ids) <> expected_protected
     OR expected_inactive + expected_churned <> expected_total THEN
    RAISE EXCEPTION 'Header count does not match the hard-coded UUID lists. No rows were changed.';
  END IF;

  SELECT count(DISTINCT v) INTO distinct_inactive FROM unnest(inactive_ids) AS u(v);
  SELECT count(DISTINCT v) INTO distinct_churned FROM unnest(churned_ids) AS u(v);
  SELECT count(DISTINCT v) INTO distinct_protected FROM unnest(protected_ids) AS u(v);

  IF distinct_inactive <> expected_inactive
     OR distinct_churned <> expected_churned
     OR distinct_protected <> expected_protected THEN
    RAISE EXCEPTION 'A hard-coded UUID list contains duplicates. No rows were changed.';
  END IF;

  IF inactive_ids && protected_ids
     OR churned_ids && protected_ids
     OR inactive_ids && churned_ids THEN
    RAISE EXCEPTION 'Refusing: a target UUID overlaps the protected list. No rows were changed.';
  END IF;

  SELECT count(*) INTO matched_inactive
  FROM public.reps
  WHERE id = ANY (inactive_ids)
    AND account_classification = 'demo';

  SELECT count(*) INTO matched_churned
  FROM public.reps
  WHERE id = ANY (churned_ids);

  IF matched_inactive <> expected_inactive OR matched_churned <> expected_churned THEN
    RAISE EXCEPTION 'expected_match_count mismatch. Expected % inactive demo targets and % churned target (% total). Found inactive demo % and churned %. No rows were changed.',
      expected_inactive, expected_churned, expected_total, matched_inactive, matched_churned;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reps
    WHERE id = ANY (inactive_ids || churned_ids)
      AND id = ANY (protected_ids)
  ) THEN
    RAISE EXCEPTION 'Refusing: a matched rep is on the protected list. No rows were changed.';
  END IF;

  INSERT INTO public.manual_rep_status_backup_20261014 (
    rep_id,
    rep_email,
    auth_email,
    previous_status,
    previous_account_classification,
    previous_updated_at,
    public_site_slug,
    display_name,
    business_name
  )
  SELECT
    r.id,
    r.email,
    u.email,
    r.status,
    r.account_classification,
    r.updated_at,
    r.public_site_slug,
    r.display_name,
    r.business_name
  FROM public.reps r
  LEFT JOIN auth.users u ON u.id = r.auth_user_id
  WHERE r.id = ANY (inactive_ids || churned_ids)
    AND r.id <> ALL (protected_ids)
  ON CONFLICT (rep_id) DO NOTHING;

  SELECT count(*) INTO backed_up
  FROM public.manual_rep_status_backup_20261014
  WHERE rep_id = ANY (inactive_ids || churned_ids)
    AND previous_status IS NOT NULL
    AND previous_account_classification IS NOT NULL
    AND previous_updated_at IS NOT NULL;

  IF backed_up <> expected_total THEN
    RAISE EXCEPTION 'Backup is missing previous status, classification, or updated_at for a target. No rows were changed.';
  END IF;

  UPDATE public.reps
  SET status = 'inactive'::public.rep_status,
      updated_at = now()
  WHERE id = ANY (inactive_ids)
    AND id <> ALL (protected_ids)
    AND id <> ALL (churned_ids)
    AND status IS DISTINCT FROM 'inactive'::public.rep_status;

  UPDATE public.reps
  SET status = 'churned'::public.rep_status,
      account_classification = 'customer',
      updated_at = now()
  WHERE id = ANY (churned_ids)
    AND id <> ALL (protected_ids)
    AND id <> ALL (inactive_ids)
    AND (
      status IS DISTINCT FROM 'churned'::public.rep_status
      OR account_classification IS DISTINCT FROM 'customer'
    );

  FOR rec IN
    SELECT
      b.rep_id,
      b.rep_email,
      b.previous_status::text AS previous_status,
      b.previous_account_classification,
      r.status::text AS current_status,
      r.account_classification AS current_classification
    FROM public.manual_rep_status_backup_20261014 b
    JOIN public.reps r ON r.id = b.rep_id
    WHERE b.rep_id = ANY (inactive_ids || churned_ids)
    ORDER BY b.rep_email, b.rep_id
  LOOP
    RAISE NOTICE 'changed rep_id=% rep_email=% previous_status=% previous_classification=% current_status=% current_classification=%',
      rec.rep_id, rec.rep_email, rec.previous_status, rec.previous_account_classification, rec.current_status, rec.current_classification;
  END LOOP;
END
$deactivate$;

SELECT
  b.rep_id,
  b.rep_email,
  b.auth_email,
  b.previous_status::text AS previous_status,
  r.status::text AS current_status,
  b.previous_account_classification,
  r.account_classification AS current_classification,
  b.previous_updated_at,
  r.updated_at AS current_updated_at,
  b.public_site_slug,
  b.display_name,
  b.business_name
FROM public.manual_rep_status_backup_20261014 b
JOIN public.reps r ON r.id = b.rep_id
ORDER BY b.rep_email, b.rep_id;

COMMIT;
