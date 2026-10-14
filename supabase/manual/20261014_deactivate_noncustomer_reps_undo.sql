-- Undo for supabase/manual/20261014_deactivate_noncustomer_reps.sql.
-- Restores previous_status from public.manual_rep_status_backup_20261014
-- when the rep is still inactive. Does not remove backup rows or any other rows.
--
-- Same session flag as the apply script:
--   Smoke: SET sparkle.allow_rep_deactivation = 'smoke';
--   Live, only after Louis's OK: SET sparkle.allow_rep_deactivation = 'approved-live';
--
-- Never restores a protected real rep or an agent account that must stay untouched,
-- even if a backup row were present.

BEGIN;

DO $undo$
DECLARE
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
  restored int;
BEGIN
  IF current_setting('sparkle.allow_rep_deactivation', true) IS DISTINCT FROM 'smoke'
     AND current_setting('sparkle.allow_rep_deactivation', true) IS DISTINCT FROM 'approved-live' THEN
    RAISE EXCEPTION 'Refusing to restore rep status. Set sparkle.allow_rep_deactivation to smoke, or to approved-live only after Louis approves a Live run.';
  END IF;
  IF to_regclass('public.manual_rep_status_backup_20261014') IS NULL THEN
    RAISE EXCEPTION 'Backup table public.manual_rep_status_backup_20261014 is missing. Nothing was restored.';
  END IF;

  UPDATE public.reps r
  SET status = b.previous_status,
      updated_at = now()
  FROM public.manual_rep_status_backup_20261014 b
  WHERE r.id = b.rep_id
    AND r.status = 'inactive'::public.rep_status
    AND lower(btrim(r.email)) <> ALL (protected_emails)
    AND NOT EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = r.auth_user_id
        AND lower(btrim(u.email)) = ANY (protected_emails)
    );

  GET DIAGNOSTICS restored = ROW_COUNT;
  RAISE NOTICE 'restored % rep status row(s) from manual_rep_status_backup_20261014', restored;
END
$undo$;

SELECT
  b.rep_id,
  b.rep_email,
  b.auth_email,
  b.previous_status::text AS previous_status,
  r.status::text AS current_status
FROM public.manual_rep_status_backup_20261014 b
JOIN public.reps r ON r.id = b.rep_id
ORDER BY b.rep_email, b.rep_id;

COMMIT;
