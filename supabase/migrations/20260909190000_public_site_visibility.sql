-- Publication preferences only; no changes to listings, queues or entitlements.
alter table public.site_settings
  add column if not exists dance_floor_visible boolean not null default true,
  add column if not exists live_lineup_visible boolean not null default true;
