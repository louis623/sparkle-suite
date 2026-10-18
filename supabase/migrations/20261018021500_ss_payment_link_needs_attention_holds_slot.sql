-- Follow-up to 20261018010000_ss_payment_first_links.sql.
-- That migration is already applied. This file replaces the founder-slot
-- assign function so a needs_attention link holds its sequence, matching
-- idx_payment_links_founder_sequence_held (open, paid, needs_attention).
-- Not applied by this pull request.

drop index if exists public.idx_payment_links_founder_sequence_held;

create unique index idx_payment_links_founder_sequence_held
  on public.sparkle_suite_payment_links (founder_sequence)
  where founder_sequence is not null
    and status in ('open', 'paid', 'needs_attention');

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
        and held.status in ('open', 'paid', 'needs_attention')
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
