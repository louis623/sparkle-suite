-- First-party page views for rep public sites.
-- No IP addresses. Reps can read their own rows. Inserts go through the server route only.

create table if not exists public.public_site_visits (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  path text not null,
  referrer text,
  src text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  us_state text,
  visitor_day_hash text,
  constraint public_site_visits_path_check
    check (char_length(path) between 1 and 300 and left(path, 1) = '/'),
  constraint public_site_visits_referrer_check
    check (referrer is null or char_length(referrer) between 1 and 300),
  constraint public_site_visits_src_check
    check (src is null or char_length(src) between 1 and 40),
  constraint public_site_visits_utm_source_check
    check (utm_source is null or char_length(utm_source) between 1 and 80),
  constraint public_site_visits_utm_medium_check
    check (utm_medium is null or char_length(utm_medium) between 1 and 80),
  constraint public_site_visits_utm_campaign_check
    check (utm_campaign is null or char_length(utm_campaign) between 1 and 80),
  constraint public_site_visits_us_state_check
    check (us_state is null or us_state ~ '^[A-Z]{2}$'),
  constraint public_site_visits_visitor_hash_check
    check (visitor_day_hash is null or visitor_day_hash ~ '^[a-f0-9]{32}$')
);

create index if not exists public_site_visits_rep_viewed_idx
  on public.public_site_visits (rep_id, viewed_at desc);

alter table public.public_site_visits enable row level security;

revoke all on table public.public_site_visits from anon, authenticated;
grant select on table public.public_site_visits to authenticated;
grant select, insert on table public.public_site_visits to service_role;

drop policy if exists public_site_visits_rep_read on public.public_site_visits;
create policy public_site_visits_rep_read
  on public.public_site_visits
  for select
  to authenticated
  using (
    rep_id = (select id from public.reps where auth_user_id = auth.uid())
  );

comment on table public.public_site_visits is
  'First-party public site page views for the rep dashboard. No IP addresses are stored. Inserts are service-role only.';

notify pgrst, 'reload schema';
