-- Payment-first onboarding. Not applied by this pull request.
-- A rep account is created only after a paid subscription Checkout Session.
-- The pending row is keyed by stripe_checkout_session_id, not by email.
-- Email and name are filled from Stripe customer_details after payment.
-- Open, paid, and needs_attention links can hold a founder sequence.
-- Expired and duplicate links release the slot.

create table if not exists public.sparkle_suite_payment_links (
  id uuid primary key default gen_random_uuid(),
  launch_build_id uuid references public.sparkle_suite_launch_builds(id) on delete set null,
  operator_rep_id uuid references public.reps(id) on delete set null,
  lead_name text,
  lead_email text,
  status text not null default 'open',
  build_fee_waived boolean not null default false,
  pricing_tier text,
  founder_sequence integer,
  monthly_price_id text,
  build_fee_price_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  expires_at timestamptz,
  rep_id uuid references public.reps(id) on delete set null,
  payment_email_draft text,
  welcome_email_draft text,
  welcome_email_status text not null default 'not_queued',
  attention_reason text,
  returning_rep boolean not null default false,
  paid_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sparkle_suite_payment_links_status_check
    check (status in ('open', 'paid', 'expired', 'duplicate', 'needs_attention')),
  constraint sparkle_suite_payment_links_tier_check
    check (pricing_tier is null or pricing_tier in ('founder', 'standard')),
  constraint sparkle_suite_payment_links_welcome_status_check
    check (welcome_email_status in ('not_queued', 'draft')),
  constraint sparkle_suite_payment_links_founder_shape_check
    check (
      (pricing_tier = 'founder' and founder_sequence between 1 and 20)
      or (pricing_tier = 'standard' and founder_sequence is null)
      or (pricing_tier is null and founder_sequence is null)
    )
);

create unique index if not exists idx_payment_links_checkout_session
  on public.sparkle_suite_payment_links (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create unique index if not exists idx_payment_links_founder_sequence_held
  on public.sparkle_suite_payment_links (founder_sequence)
  where founder_sequence is not null
    and status in ('open', 'paid', 'needs_attention');

create index if not exists idx_payment_links_launch_build
  on public.sparkle_suite_payment_links (launch_build_id, created_at desc);

alter table public.sparkle_suite_payment_links enable row level security;

revoke all on table public.sparkle_suite_payment_links from anon, authenticated;
grant select, insert, update, delete on table public.sparkle_suite_payment_links to service_role;

create or replace function public.assign_sparkle_suite_payment_link_pricing(
  p_payment_link_id uuid,
  p_pricing_tier text
)
returns table(pricing_tier text, founder_sequence integer)
language plpgsql
as $$
declare
  assigned_tier text;
  assigned_sequence integer;
  candidate_sequence integer;
begin
  perform pg_advisory_xact_lock(hashtext('sparkle_suite_founder_pricing'));

  select link.pricing_tier, link.founder_sequence
    into assigned_tier, assigned_sequence
  from public.sparkle_suite_payment_links as link
  where link.id = p_payment_link_id
  for update;

  if not found then
    raise exception 'Payment link % was not found.', p_payment_link_id
      using errcode = 'P0002';
  end if;

  if p_pricing_tier = 'standard' then
    update public.sparkle_suite_payment_links
    set pricing_tier = 'standard',
        founder_sequence = null,
        updated_at = now()
    where id = p_payment_link_id;
    return query select 'standard'::text, null::integer;
    return;
  end if;

  if p_pricing_tier <> 'founder' then
    raise exception 'Pricing tier must be founder or standard.'
      using errcode = 'P0001';
  end if;

  if assigned_tier = 'founder' and assigned_sequence between 1 and 20 then
    return query select assigned_tier, assigned_sequence;
    return;
  end if;

  select available_slots.candidate_sequence
    into candidate_sequence
  from generate_series(1, 20) as available_slots(candidate_sequence)
  where not exists (
      select 1
      from public.reps as rep
      where rep.pricing_tier = 'founder'
        and rep.founder_sequence = available_slots.candidate_sequence
    )
    and not exists (
      select 1
      from public.subscriptions as subscription
      where subscription.pricing_tier = 'founder'
        and subscription.founder_sequence = available_slots.candidate_sequence
    )
    and not exists (
      select 1
      from public.sparkle_suite_payment_links as held
      where held.founder_sequence = available_slots.candidate_sequence
        and held.status in ('open', 'paid')
        and held.id <> p_payment_link_id
    )
  order by available_slots.candidate_sequence
  limit 1;

  if candidate_sequence is null then
    raise exception 'Founder pricing is not open for another link right now.'
      using errcode = 'P0001';
  end if;

  update public.sparkle_suite_payment_links
  set pricing_tier = 'founder',
      founder_sequence = candidate_sequence,
      updated_at = now()
  where id = p_payment_link_id;

  return query select 'founder'::text, candidate_sequence;
end;
$$;

revoke all on function public.assign_sparkle_suite_payment_link_pricing(uuid, text)
  from public, anon, authenticated;
grant execute on function public.assign_sparkle_suite_payment_link_pricing(uuid, text)
  to service_role;

create or replace function public.release_sparkle_suite_payment_link_pricing(
  p_payment_link_id uuid
)
returns boolean
language plpgsql
as $$
declare
  affected_rows integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('sparkle_suite_founder_pricing'));

  update public.sparkle_suite_payment_links as link
  set pricing_tier = null,
      founder_sequence = null,
      updated_at = now()
  where link.id = p_payment_link_id
    and link.status = 'open'
    and not exists (
      select 1
      from public.subscriptions as subscription
      where subscription.rep_id = link.rep_id
        and link.rep_id is not null
        and subscription.pricing_tier = 'founder'
        and subscription.founder_sequence = link.founder_sequence
    );

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all on function public.release_sparkle_suite_payment_link_pricing(uuid)
  from public, anon, authenticated;
grant execute on function public.release_sparkle_suite_payment_link_pricing(uuid)
  to service_role;
