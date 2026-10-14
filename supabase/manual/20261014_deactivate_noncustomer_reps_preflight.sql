-- Read-only inventory for the manual deactivation in
-- supabase/manual/20261014_deactivate_noncustomer_reps.sql.
-- This file does not change data. Safe to run on Smoke. A Live read is not
-- approval to write to Live.

WITH requested(kind, email) AS (
  VALUES
    ('deactivate', 'louis+sparkle-beta-demo@neonrabbit.net'),
    ('deactivate', 'louis+sparkle-demo-2@neonrabbit.net'),
    ('deactivate', 'louischapman1@gmail.com'),
    ('deactivate', 'testrep@neonrabbit.net'),
    ('deactivate', 'louis+sparkle-demo@neonrabbit.net'),
    ('deactivate', 'demo-prelaunch-waitlist@yoursparklesuite.com'),
    ('deactivate', 'demo01@neonrabbit.net'),
    ('deactivate', 'spike-b@neonrabbit.test'),
    ('deactivate', 'gatetest@neonrabbit.net'),
    ('deactivate', 'janetest@gmail.com'),
    ('deactivate', 'sparkle-smoke+1780589740368@neonrabbit.net'),
    ('deactivate', 'smoke.rep.1780593846442@example.com'),
    ('deactivate', 'smoke.rep.1780598666326@example.com'),
    ('deactivate', 'smoke.rep.1780601179810@example.com'),
    ('deactivate', 'smoke.rep.20260605001558@example.com'),
    ('deactivate', 'mila.harper.smoke.20260604@example.com'),
    ('deactivate', 'sparkle-demo-1780753483318@example.test'),
    ('deactivate', 'cookiefountainsdk@gmail.com'),
    ('protect', 'braxtonsherri33@gmail.com'),
    ('protect', 'kellyygiselleee@gmail.com'),
    ('protect', 'lindseychapman1188@gmail.com'),
    ('protect', 'williams.brianna19@yahoo.com'),
    ('protect', 'ksgoforth64@gmail.com'),
    ('protect', 'blingkitchen19@gmail.com'),
    ('protect', 'louis@neonrabbit.net'),
    ('keep-active-agent', 'sparkle-reviewer+preview@neonrabbit.net'),
    ('keep-active-agent', 'sparkle-reviewer+local@neonrabbit.net'),
    ('keep-active-agent', 'sparkle-reviewer+loc@example.test'),
    ('keep-active-agent', 'nic-nac-support@neonrabbit.net'),
    ('keep-active-agent', 'lane-accounting-viewer@neonrabbit.internal')
),
exact AS (
  SELECT
    requested.kind,
    requested.email AS requested_email,
    matched.id AS rep_id,
    matched.email AS rep_email,
    matched.auth_email,
    matched.status,
    matched.account_classification,
    matched.public_site_slug,
    matched.display_name,
    matched.business_name
  FROM requested
  LEFT JOIN LATERAL (
    SELECT
      r.id,
      r.email,
      u.email AS auth_email,
      r.status::text AS status,
      r.account_classification,
      r.public_site_slug,
      r.display_name,
      r.business_name
    FROM public.reps r
    LEFT JOIN auth.users u ON u.id = r.auth_user_id
    WHERE lower(btrim(r.email)) = requested.email
       OR lower(btrim(coalesce(u.email, ''))) = requested.email
  ) matched ON true
)
SELECT * FROM exact
UNION ALL
SELECT
  'deactivate-pattern',
  'louis+sparkle-live-smoke-178119*@neonrabbit.net',
  r.id,
  r.email,
  u.email,
  r.status::text,
  r.account_classification,
  r.public_site_slug,
  r.display_name,
  r.business_name
FROM public.reps r
LEFT JOIN auth.users u ON u.id = r.auth_user_id
WHERE lower(btrim(r.email)) LIKE 'louis+sparkle-live-smoke-178119%@neonrabbit.net'
   OR lower(btrim(coalesce(u.email, ''))) LIKE 'louis+sparkle-live-smoke-178119%@neonrabbit.net'
ORDER BY 1, 2, 4;
