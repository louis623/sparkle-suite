-- Manual seed. This file is not a migration and must not be applied by the migration runner.
-- It inserts the six live rep GA4 rows by matching reps.custom_domain.
-- Run it only when Louis asks to write these IDs on a database.
-- The Smoke test property is intentionally absent.

insert into public.rep_analytics_properties (
  rep_id,
  ga4_property_id,
  measurement_id,
  time_zone,
  enabled
)
select
  reps.id,
  seed.ga4_property_id,
  seed.measurement_id,
  seed.time_zone,
  true
from (
  values
    ('theblingkitchen.com', '559313613', 'G-FYP8WPK3SW', 'America/New_York'),
    ('brisglowtique.com', '559404981', 'G-VKFLMW866F', 'America/Chicago'),
    ('brittwithbling.com', '559308718', 'G-0W5EVQPY69', 'America/New_York'),
    ('goforthebling.com', '559305458', 'G-7FY93FNW1L', 'America/New_York'),
    ('milehighfizz.com', '559335477', 'G-VQ6FC1Y4G1', 'America/Denver'),
    ('sparklybutterflies.com', '559247691', 'G-JP9E66TV91', 'America/Denver')
) as seed (custom_domain, ga4_property_id, measurement_id, time_zone)
join public.reps
  on lower(reps.custom_domain) = seed.custom_domain
on conflict (rep_id) do update
set
  ga4_property_id = excluded.ga4_property_id,
  measurement_id = excluded.measurement_id,
  time_zone = excluded.time_zone,
  enabled = excluded.enabled,
  updated_at = now();

do $$
declare
  found integer;
begin
  select count(*) into found
  from public.rep_analytics_properties properties
  join public.reps on reps.id = properties.rep_id
  where lower(reps.custom_domain) in (
    'theblingkitchen.com',
    'brisglowtique.com',
    'brittwithbling.com',
    'goforthebling.com',
    'milehighfizz.com',
    'sparklybutterflies.com'
  );

  if found <> 6 then
    raise exception 'Expected 6 rep analytics rows after matching custom_domain, found %', found;
  end if;
end $$;
