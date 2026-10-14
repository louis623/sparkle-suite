-- Manual deactivation of listed test, demo, and smoke reps.
-- NOT a migration. Do not move this file under supabase/migrations.
--
-- rep_status, from supabase/migrations/006_sparkle_suite_schema.sql, allows:
--   onboarding, active, inactive, suspended, churned
-- No later migration adds a value. The reversible off value is inactive.
-- suspended and churned also hide public Finder pages, so this script does not use them.
--
-- This script sets status to inactive for the listed emails only. It matches
-- public.reps.email and the linked auth.users.email. It records the previous
-- status in public.manual_rep_status_backup_20261014. It does not remove rows.
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
END
$guard$;

CREATE TABLE IF NOT EXISTS public.manual_rep_status_backup_20261014 (
  rep_id uuid PRIMARY KEY,
  rep_email text NOT NULL,
  auth_email text,
  previous_status public.rep_status NOT NULL,
  public_site_slug text,
  display_name text,
  business_name text,
  account_classification text,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.manual_rep_status_backup_20261014 IS
  'Manual backup of rep status before 20261014 deactivation. Previous status lives in previous_status. This table is the undo source. Do not remove its rows.';

ALTER TABLE public.manual_rep_status_backup_20261014 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.manual_rep_status_backup_20261014 FROM PUBLIC, anon, authenticated;

DO $deactivate$
DECLARE
  target_emails text[] := ARRAY[
    'louis+sparkle-beta-demo@neonrabbit.net',
    'louis+sparkle-demo-2@neonrabbit.net',
    'louischapman1@gmail.com',
    'testrep@neonrabbit.net',
    'louis+sparkle-demo@neonrabbit.net',
    'demo-prelaunch-waitlist@yoursparklesuite.com',
    'demo01@neonrabbit.net',
    'spike-b@neonrabbit.test',
    'gatetest@neonrabbit.net',
    'janetest@gmail.com',
    'sparkle-smoke+1780589740368@neonrabbit.net',
    'smoke.rep.1780593846442@example.com',
    'smoke.rep.1780598666326@example.com',
    'smoke.rep.1780601179810@example.com',
    'smoke.rep.20260605001558@example.com',
    'mila.harper.smoke.20260604@example.com',
    'sparkle-demo-1780753483318@example.test',
    'cookiefountainsdk@gmail.com'
  ];
  protected_emails text[] := ARRAY[
    'braxtonsherri33@gmail.com',
    'kellyygiselleee@gmail.com',
    'lindseychapman1188@gmail.com',
    'williams.brianna19@yahoo.com',
    'ksgoforth64@gmail.com',
    'blingkitchen19@gmail.com',
    'louis@neonrabbit.net',
    'sparkle-reviewer+preview@neonrabbit.net',
    'sparkle-reviewer+local@neonrabbit.net',
    'sparkle-reviewer+loc@example.test',
    'nic-nac-support@neonrabbit.net',
    'lane-accounting-viewer@neonrabbit.internal'
  ];
  live_smoke_pattern text := 'louis+sparkle-live-smoke-178119%@neonrabbit.net';
  protected_hit int;
  matched_ids uuid[];
  rec record;
BEGIN
  IF target_emails && protected_emails THEN
    RAISE EXCEPTION 'A deactivation email is also on the protected list. No rows were changed.';
  END IF;

  SELECT count(*) INTO protected_hit
  FROM public.reps r
  LEFT JOIN auth.users u ON u.id = r.auth_user_id
  WHERE (
      lower(btrim(r.email)) = ANY (target_emails)
      OR lower(btrim(coalesce(u.email, ''))) = ANY (target_emails)
      OR lower(btrim(r.email)) LIKE live_smoke_pattern
      OR lower(btrim(coalesce(u.email, ''))) LIKE live_smoke_pattern
    )
    AND (
      lower(btrim(r.email)) = ANY (protected_emails)
      OR lower(btrim(coalesce(u.email, ''))) = ANY (protected_emails)
    );

  IF protected_hit > 0 THEN
    RAISE EXCEPTION 'Refusing: % matched rep(s) also match the protected list. No status changes were made.', protected_hit;
  END IF;

  SELECT coalesce(array_agg(r.id), ARRAY[]::uuid[]) INTO matched_ids
  FROM public.reps r
  LEFT JOIN auth.users u ON u.id = r.auth_user_id
  WHERE (
      lower(btrim(r.email)) = ANY (target_emails)
      OR lower(btrim(coalesce(u.email, ''))) = ANY (target_emails)
      OR lower(btrim(r.email)) LIKE live_smoke_pattern
      OR lower(btrim(coalesce(u.email, ''))) LIKE live_smoke_pattern
    )
    AND lower(btrim(r.email)) <> ALL (protected_emails)
    AND lower(btrim(coalesce(u.email, ''))) <> ALL (protected_emails);

  INSERT INTO public.manual_rep_status_backup_20261014 (
    rep_id, rep_email, auth_email, previous_status, public_site_slug,
    display_name, business_name, account_classification
  )
  SELECT
    r.id, r.email, u.email, r.status, r.public_site_slug,
    r.display_name, r.business_name, r.account_classification
  FROM public.reps r
  LEFT JOIN auth.users u ON u.id = r.auth_user_id
  WHERE r.id = ANY (matched_ids)
  ON CONFLICT (rep_id) DO NOTHING;

  UPDATE public.reps r
  SET status = 'inactive'::public.rep_status,
      updated_at = now()
  WHERE r.id = ANY (matched_ids)
    AND r.status IS DISTINCT FROM 'inactive'::public.rep_status
    AND lower(btrim(r.email)) <> ALL (protected_emails);

  FOR rec IN
    SELECT b.rep_id, b.rep_email, b.auth_email, b.previous_status::text AS previous_status, r.status::text AS current_status
    FROM public.manual_rep_status_backup_20261014 b
    JOIN public.reps r ON r.id = b.rep_id
    WHERE b.rep_id = ANY (matched_ids)
    ORDER BY b.rep_email, b.rep_id
  LOOP
    RAISE NOTICE 'deactivated rep_id=% rep_email=% auth_email=% previous_status=% current_status=%',
      rec.rep_id, rec.rep_email, rec.auth_email, rec.previous_status, rec.current_status;
  END LOOP;
END
$deactivate$;

SELECT
  b.rep_id,
  b.rep_email,
  b.auth_email,
  b.previous_status::text AS previous_status,
  r.status::text AS current_status,
  b.public_site_slug,
  b.display_name,
  b.business_name
FROM public.manual_rep_status_backup_20261014 b
JOIN public.reps r ON r.id = b.rep_id
ORDER BY b.rep_email, b.rep_id;

COMMIT;
