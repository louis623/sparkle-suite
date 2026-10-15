-- Read-only inventory for supabase/manual/20261014_deactivate_noncustomer_reps.sql.
-- This file does not change data. Safe to run on Smoke. A Live read is not
-- approval to write to Live.
--
-- expected_inactive_count: 19
-- expected_churned_count: 1
-- expected_match_count: 20
-- Match is by the hard-coded rep UUIDs. A missing id comes back with a null rep row.

WITH inactive_ids AS (
  SELECT unnest(ARRAY[
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
  ]) AS id
),
churned_ids AS (
  SELECT unnest(ARRAY[
    'cf798d57-c2f7-40d7-a862-2fc39ca3a4b1'::uuid -- cookiefountainsdk@gmail.com Stephanie Graham
  ]) AS id
),
protected_ids AS (
  SELECT unnest(ARRAY[
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
  ]) AS id
),
requested AS (
  SELECT id, 'inactive'::text AS intended_status, NULL::text AS intended_classification
  FROM inactive_ids
  UNION ALL
  SELECT id, 'churned'::text, 'customer'::text
  FROM churned_ids
  UNION ALL
  SELECT id, 'protected'::text, NULL::text
  FROM protected_ids
)
SELECT
  requested.intended_status,
  requested.intended_classification,
  requested.id AS requested_id,
  r.id AS rep_id,
  r.email AS rep_email,
  u.email AS auth_email,
  r.status::text AS status,
  r.account_classification,
  r.updated_at,
  r.public_site_slug,
  r.display_name,
  r.business_name,
  EXISTS (
    SELECT 1
    FROM protected_ids
    WHERE protected_ids.id = r.id
      AND requested.intended_status <> 'protected'
  ) AS overlaps_protected
FROM requested
LEFT JOIN public.reps r ON r.id = requested.id
LEFT JOIN auth.users u ON u.id = r.auth_user_id
ORDER BY requested.intended_status, r.email, requested.id;
