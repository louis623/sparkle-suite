-- Per-rep Google Analytics 4 property records.
-- Service role only. Reps and anonymous visitors cannot read or write this table.
-- Nic-Nac site settings and site_settings do not store these IDs.

create table if not exists public.rep_analytics_properties (
  rep_id uuid primary key references public.reps (id) on delete cascade,
  ga4_property_id text not null,
  measurement_id text not null,
  time_zone text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rep_analytics_properties_property_id_check
    check (ga4_property_id ~ '^[0-9]{6,15}$'),
  constraint rep_analytics_properties_measurement_id_check
    check (measurement_id ~ '^G-[A-Z0-9]{4,20}$'),
  constraint rep_analytics_properties_time_zone_check
    check (time_zone ~ '^[A-Za-z0-9_+-]+(?:/[A-Za-z0-9_+-]+)+$'),
  constraint rep_analytics_properties_property_id_key unique (ga4_property_id),
  constraint rep_analytics_properties_measurement_id_key unique (measurement_id)
);

alter table public.rep_analytics_properties enable row level security;

revoke all on table public.rep_analytics_properties from public, anon, authenticated;
grant select, insert, update, delete on table public.rep_analytics_properties to service_role;

comment on table public.rep_analytics_properties is
  'Admin-only GA4 property and measurement IDs for a rep public site. No anon or authenticated access.';

notify pgrst, 'reload schema';
