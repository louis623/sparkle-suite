alter table public.site_settings
  add column if not exists recruiting_link text;

alter table public.site_settings
  drop constraint if exists site_settings_recruiting_link_bomb_party_check;

alter table public.site_settings
  add constraint site_settings_recruiting_link_bomb_party_check
  check (
    recruiting_link is null
    or recruiting_link ~* '^https://([a-z0-9-]+\.)*bombparty\.com([/:?#]|$)'
  );

-- Brittany's public Join page already uses this verified enrollment destination.
-- No other tenant is backfilled: each rep must save their own official link.
insert into public.site_settings (rep_id, recruiting_link)
select id, 'https://bombparty.com/brittwithbling/packs'
from public.reps
where public_site_slug = 'brittwithbling'
on conflict (rep_id) do update
set recruiting_link = coalesce(
  public.site_settings.recruiting_link,
  excluded.recruiting_link
);
