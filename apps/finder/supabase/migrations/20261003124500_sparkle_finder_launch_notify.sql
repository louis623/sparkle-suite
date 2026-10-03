-- Public Sparkle Finder launch-notify signups.
-- Idempotent so this file can be recorded later. Apply it to Live only in a
-- separate approved step. This change does not run it.
-- Service role inserts only. No anon or authenticated read or write.
-- Collector launch signup only. No audience table and no rep column.

create table if not exists public.sparkle_finder_launch_notify (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  notify_email boolean not null,
  notify_sms boolean not null,
  address text,
  birthday_month smallint,
  birthday_day smallint,
  favorite_gem_or_stone text,
  favorite_material text,
  favorite_cut text,
  favorite_collection text,
  notes text,
  tags text[] not null default '{}'::text[],
  marketing_consent boolean not null default false,
  source text not null default 'finder_learn_notify',
  created_at timestamptz not null default now(),
  constraint sparkle_finder_launch_notify_names_present
    check (char_length(btrim(first_name)) > 0 and char_length(btrim(last_name)) > 0),
  constraint sparkle_finder_launch_notify_channel_present
    check (notify_email or notify_sms),
  constraint sparkle_finder_launch_notify_email_when_requested
    check (notify_email = false or nullif(btrim(email), '') is not null),
  constraint sparkle_finder_launch_notify_phone_when_requested
    check (notify_sms = false or nullif(btrim(phone), '') is not null),
  constraint sparkle_finder_launch_notify_birthday_month_range
    check (birthday_month is null or birthday_month between 1 and 12),
  constraint sparkle_finder_launch_notify_birthday_day_range
    check (birthday_day is null or birthday_day between 1 and 31),
  constraint sparkle_finder_launch_notify_source_check
    check (source = 'finder_learn_notify')
);

create index if not exists sparkle_finder_launch_notify_created_at_idx
  on public.sparkle_finder_launch_notify (created_at desc);

alter table public.sparkle_finder_launch_notify enable row level security;

revoke all on table public.sparkle_finder_launch_notify from public;
revoke all on table public.sparkle_finder_launch_notify from anon;
revoke all on table public.sparkle_finder_launch_notify from authenticated;

grant select, insert on table public.sparkle_finder_launch_notify to service_role;

notify pgrst, 'reload schema';
