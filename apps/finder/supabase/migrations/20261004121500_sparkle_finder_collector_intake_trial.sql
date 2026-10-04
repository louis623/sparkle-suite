-- Finder intake signup. New auth rows stay Free until this form is finished.
-- This file does not backfill existing memberships and does not charge anyone.

create table if not exists public.sparkle_finder_collector_intakes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  state text not null,
  birthday_month integer not null check (birthday_month between 1 and 12),
  birthday_day integer not null check (birthday_day between 1 and 31),
  favorite_stone text not null,
  cut text not null,
  finish text not null,
  ring_size text not null,
  jewelry_notes text not null default '',
  user_agreement_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sparkle_finder_collector_intakes_birthday_day_in_month check (
    birthday_day <= (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[birthday_month]
  )
);

comment on table public.sparkle_finder_collector_intakes is
  'Collector intake for Suite reps and Finder recommendations. Birthday is month and day only. The same row is the profile record a Suite rep sees.';

comment on column public.sparkle_finder_collector_intakes.birthday_month is
  'Birthday month. No year is stored.';

comment on column public.sparkle_finder_collector_intakes.birthday_day is
  'Birthday day. No year is stored.';

create table if not exists public.sparkle_finder_pay_reminders (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents = 600),
  reminder_interval text not null check (reminder_interval = 'month'),
  message text not null,
  sent_at timestamptz not null default now()
);

comment on table public.sparkle_finder_pay_reminders is
  'Sent reminder that Silver is $6 per month after a 30-day trial ends. This does not charge a card.';

alter table public.sparkle_finder_collector_intakes enable row level security;
alter table public.sparkle_finder_pay_reminders enable row level security;

revoke all on public.sparkle_finder_collector_intakes from anon;
revoke all on public.sparkle_finder_pay_reminders from anon;

create policy "Users can select their own collector intake"
on public.sparkle_finder_collector_intakes
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can insert their own collector intake"
on public.sparkle_finder_collector_intakes
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own collector intake"
on public.sparkle_finder_collector_intakes
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can select their own pay reminders"
on public.sparkle_finder_pay_reminders
for select
to authenticated
using (user_id = (select auth.uid()));

grant select on public.sparkle_finder_collector_intakes to authenticated;
grant insert (
  user_id,
  first_name,
  last_name,
  email,
  phone,
  state,
  birthday_month,
  birthday_day,
  favorite_stone,
  cut,
  finish,
  ring_size,
  jewelry_notes,
  user_agreement_accepted_at,
  privacy_accepted_at,
  completed_at
) on public.sparkle_finder_collector_intakes to authenticated;
grant update (
  first_name,
  last_name,
  email,
  phone,
  state,
  birthday_month,
  birthday_day,
  favorite_stone,
  cut,
  finish,
  ring_size,
  jewelry_notes
) on public.sparkle_finder_collector_intakes to authenticated;

grant select on public.sparkle_finder_pay_reminders to authenticated;

create or replace function private.create_sparkle_finder_account_rows()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  initial_email text := coalesce(new.email, '');
  email_display_name text := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
  metadata_display_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  metadata_phone text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  metadata_state text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'state', '')), '');
  privacy_acknowledged boolean := coalesce((new.raw_user_meta_data ->> 'privacy_acknowledged')::boolean, false);
  promo_email boolean := coalesce((new.raw_user_meta_data ->> 'promotional_email_opt_in')::boolean, false);
  promo_sms boolean := coalesce((new.raw_user_meta_data ->> 'promotional_sms_opt_in')::boolean, false);
  metadata_intake jsonb := new.raw_user_meta_data -> 'collector_intake';
  intake_completed_at timestamptz := nullif(new.raw_user_meta_data ->> 'collector_intake_completed_at', '')::timestamptz;
  birthday_month integer := nullif(metadata_intake ->> 'birthday_month', '')::integer;
  birthday_day integer := nullif(metadata_intake ->> 'birthday_day', '')::integer;
  max_birthday_day integer := (array[31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31])[birthday_month];
  intake_ready boolean := metadata_intake is not null
    and intake_completed_at is not null
    and privacy_acknowledged
    and coalesce((metadata_intake ->> 'user_agreement_accepted')::boolean, false)
    and nullif(trim(coalesce(metadata_intake ->> 'first_name', '')), '') is not null
    and nullif(trim(coalesce(metadata_intake ->> 'last_name', '')), '') is not null
    and nullif(trim(coalesce(metadata_intake ->> 'favorite_stone', '')), '') is not null
    and nullif(trim(coalesce(metadata_intake ->> 'cut', '')), '') is not null
    and nullif(trim(coalesce(metadata_intake ->> 'finish', '')), '') is not null
    and nullif(trim(coalesce(metadata_intake ->> 'ring_size', '')), '') is not null
    and metadata_phone is not null
    and metadata_state is not null
    and birthday_month between 1 and 12
    and birthday_day between 1 and max_birthday_day;
begin
  insert into public.sparkle_finder_profiles (
    user_id,
    display_name,
    email,
    phone_e164,
    state
  )
  values (
    new.id,
    coalesce(metadata_display_name, email_display_name, 'Sparkle Finder'),
    initial_email,
    metadata_phone,
    metadata_state
  )
  on conflict (user_id) do nothing;

  insert into public.sparkle_finder_memberships (
    user_id,
    access_state,
    silver_source,
    trial_started_at,
    trial_ends_at,
    silver_started_at,
    silver_ends_at
  )
  values (
    new.id,
    case when intake_ready then 'silver_trial' else 'free' end,
    case when intake_ready then 'trial' else 'none' end,
    case when intake_ready then intake_completed_at else null end,
    case when intake_ready then intake_completed_at + interval '30 days' else null end,
    case when intake_ready then intake_completed_at else null end,
    case when intake_ready then intake_completed_at + interval '30 days' else null end
  )
  on conflict (user_id) do nothing;

  if intake_ready then
    insert into public.sparkle_finder_collector_intakes (
      user_id,
      first_name,
      last_name,
      email,
      phone,
      state,
      birthday_month,
      birthday_day,
      favorite_stone,
      cut,
      finish,
      ring_size,
      jewelry_notes,
      user_agreement_accepted_at,
      privacy_accepted_at,
      completed_at
    )
    values (
      new.id,
      trim(metadata_intake ->> 'first_name'),
      trim(metadata_intake ->> 'last_name'),
      initial_email,
      metadata_phone,
      metadata_state,
      birthday_month,
      birthday_day,
      trim(metadata_intake ->> 'favorite_stone'),
      trim(metadata_intake ->> 'cut'),
      trim(metadata_intake ->> 'finish'),
      trim(metadata_intake ->> 'ring_size'),
      coalesce(trim(metadata_intake ->> 'jewelry_notes'), ''),
      intake_completed_at,
      intake_completed_at,
      intake_completed_at
    )
    on conflict (user_id) do nothing;
  end if;

  insert into public.sparkle_finder_communication_consents (
    user_id,
    promotional_email_opt_in,
    promotional_email_consented_at,
    promotional_sms_opt_in,
    promotional_sms_consented_at,
    privacy_acknowledged_at
  )
  values (
    new.id,
    promo_email,
    case when promo_email then now() else null end,
    promo_sms,
    case when promo_sms then now() else null end,
    case when privacy_acknowledged then now() else null end
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_sparkle_finder_account_rows() from public;
revoke all on function private.create_sparkle_finder_account_rows() from anon;
revoke all on function private.create_sparkle_finder_account_rows() from authenticated;

create or replace function public.complete_sparkle_finder_collector_intake(
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_state text,
  p_birthday_month integer,
  p_birthday_day integer,
  p_favorite_stone text,
  p_cut text,
  p_finish text,
  p_ring_size text,
  p_jewelry_notes text,
  p_user_agreement_accepted_at timestamptz,
  p_privacy_accepted_at timestamptz,
  p_completed_at timestamptz,
  p_start_trial boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.sparkle_finder_collector_intakes (
    user_id,
    first_name,
    last_name,
    email,
    phone,
    state,
    birthday_month,
    birthday_day,
    favorite_stone,
    cut,
    finish,
    ring_size,
    jewelry_notes,
    user_agreement_accepted_at,
    privacy_accepted_at,
    completed_at
  )
  values (
    current_user_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_state,
    p_birthday_month,
    p_birthday_day,
    p_favorite_stone,
    p_cut,
    p_finish,
    p_ring_size,
    coalesce(p_jewelry_notes, ''),
    p_user_agreement_accepted_at,
    p_privacy_accepted_at,
    p_completed_at
  )
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    phone = excluded.phone,
    state = excluded.state,
    birthday_month = excluded.birthday_month,
    birthday_day = excluded.birthday_day,
    favorite_stone = excluded.favorite_stone,
    cut = excluded.cut,
    finish = excluded.finish,
    ring_size = excluded.ring_size,
    jewelry_notes = excluded.jewelry_notes,
    updated_at = now();

  if p_start_trial then
    update public.sparkle_finder_memberships
    set
      access_state = 'silver_trial',
      silver_source = 'trial',
      trial_started_at = p_completed_at,
      trial_ends_at = p_completed_at + interval '30 days',
      silver_started_at = p_completed_at,
      silver_ends_at = p_completed_at + interval '30 days'
    where user_id = current_user_id
      and access_state = 'free'
      and trial_started_at is null;
  end if;
end;
$$;

revoke all on function public.complete_sparkle_finder_collector_intake(
  text, text, text, text, text, integer, integer, text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean
) from public;
revoke all on function public.complete_sparkle_finder_collector_intake(
  text, text, text, text, text, integer, integer, text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean
) from anon;
grant execute on function public.complete_sparkle_finder_collector_intake(
  text, text, text, text, text, integer, integer, text, text, text, text, text, timestamptz, timestamptz, timestamptz, boolean
) to authenticated;

create or replace function public.settle_sparkle_finder_expired_silver_trial()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return false;
  end if;

  update public.sparkle_finder_memberships
  set
    access_state = 'free',
    silver_source = 'none'
  where user_id = current_user_id
    and access_state = 'silver_trial'
    and trial_ends_at is not null
    and trial_ends_at <= now();

  if not found then
    return false;
  end if;

  insert into public.sparkle_finder_pay_reminders (
    user_id,
    amount_cents,
    reminder_interval,
    message,
    sent_at
  )
  values (
    current_user_id,
    600,
    'month',
    'Silver is $6 per month.',
    now()
  );

  return true;
end;
$$;

revoke all on function public.settle_sparkle_finder_expired_silver_trial() from public;
revoke all on function public.settle_sparkle_finder_expired_silver_trial() from anon;
grant execute on function public.settle_sparkle_finder_expired_silver_trial() to authenticated;
