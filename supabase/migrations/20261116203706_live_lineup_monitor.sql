-- Dedicated private monitoring ledger. No changes to publisher auth, lineup state, or commit RPC.
-- Deployment alone does not enable monitoring, scheduling, email or webhook delivery.
create table if not exists public.live_lineup_monitor_states (
  rep_id uuid primary key references public.reps(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 4096),
  updated_at timestamptz not null default now()
);
create table if not exists public.live_lineup_monitor_incidents (
  id uuid primary key,
  rep_id uuid not null references public.reps(id) on delete cascade,
  status text not null check (status in ('open','recovered')),
  opened_at timestamptz not null default now(),
  recovered_at timestamptz,
  email_accepted_at timestamptz,
  recovery_payload jsonb
);
create unique index if not exists live_lineup_monitor_one_open
  on public.live_lineup_monitor_incidents(rep_id) where status = 'open';
create table if not exists public.live_lineup_monitor_deliveries (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.live_lineup_monitor_incidents(id) on delete cascade,
  rep_id uuid references public.reps(id) on delete cascade,
  release_version text,
  kind text not null check (kind in ('incident','recovery','adoption')),
  channel text not null check (channel in ('email','webhook')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 262144),
  status text not null default 'pending' check (status in ('pending','processing','accepted','canceled','exhausted')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_by uuid, claimed_at timestamptz,
  provider_id text, accepted_at timestamptz,
  delivery_status text not null default 'unverified' check (delivery_status in ('unverified','delivered','bounced')),
  created_at timestamptz not null default now(),
  check ((kind = 'adoption' and incident_id is null and rep_id is null and release_version is not null)
    or (kind <> 'adoption' and incident_id is not null and rep_id is not null and release_version is null)),
  unique (incident_id, kind, channel),
  unique (release_version, channel)
);
create index if not exists live_lineup_monitor_due on public.live_lineup_monitor_deliveries(next_attempt_at)
  where status in ('pending','processing');
alter table public.live_lineup_monitor_states enable row level security;
alter table public.live_lineup_monitor_incidents enable row level security;
alter table public.live_lineup_monitor_deliveries enable row level security;
revoke all on public.live_lineup_monitor_states, public.live_lineup_monitor_incidents, public.live_lineup_monitor_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.live_lineup_monitor_states, public.live_lineup_monitor_incidents, public.live_lineup_monitor_deliveries to service_role;

create or replace function public.live_lineup_monitor_commit(
  p_rep_id uuid, p_expected_revision bigint, p_data jsonb, p_event_kind text, p_incident_id uuid, p_payload jsonb
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_revision bigint; v_after timestamptz;
begin
  if jsonb_typeof(p_data) <> 'object' or p_expected_revision < 0
    or (p_event_kind is not null and p_event_kind not in ('incident','recovery')) then
    raise exception 'invalid monitoring transition';
  end if;
  insert into public.live_lineup_monitor_states(rep_id) values (p_rep_id) on conflict do nothing;
  select revision into v_revision from public.live_lineup_monitor_states where rep_id = p_rep_id for update;
  if v_revision <> p_expected_revision then return false; end if;
  update public.live_lineup_monitor_states set revision = revision + 1, data = p_data, updated_at = now() where rep_id = p_rep_id;
  if p_event_kind = 'incident' then
    if p_incident_id is null or p_payload is null or p_data->>'incidentId' <> p_incident_id::text then
      raise exception 'invalid monitoring incident';
    end if;
    insert into public.live_lineup_monitor_incidents(id,rep_id,status) values(p_incident_id,p_rep_id,'open');
    select greatest(now(), coalesce(max(email_accepted_at) + interval '30 minutes', now())) into v_after
      from public.live_lineup_monitor_incidents where rep_id = p_rep_id;
    insert into public.live_lineup_monitor_deliveries(incident_id,rep_id,kind,channel,payload,next_attempt_at)
      select p_incident_id,p_rep_id,'incident',channel,p_payload,v_after from unnest(array['email','webhook']) channel;
  elsif p_event_kind = 'recovery' then
    update public.live_lineup_monitor_incidents set status = 'recovered', recovered_at = now(), recovery_payload = p_payload
      where id = p_incident_id and rep_id = p_rep_id;
    -- A processing sender may already be contacting the provider; its receipt remains authoritative.
    update public.live_lineup_monitor_deliveries set status = 'canceled'
      where incident_id = p_incident_id and kind = 'incident' and status = 'pending';
    insert into public.live_lineup_monitor_deliveries(incident_id,rep_id,kind,channel,payload)
      select i.id,i.rep_id,'recovery',sent.channel,i.recovery_payload from public.live_lineup_monitor_incidents i
        join public.live_lineup_monitor_deliveries sent on sent.incident_id = i.id and sent.kind = 'incident' and sent.status = 'accepted'
      where i.id = p_incident_id and i.rep_id = p_rep_id and i.status = 'recovered'
      on conflict (incident_id,kind,channel) do nothing;
  end if;
  return true;
end $$;

create or replace function public.live_lineup_monitor_claim(p_worker uuid, p_limit integer default 20)
returns setof public.live_lineup_monitor_deliveries language plpgsql security invoker set search_path = '' as $$
begin
  if p_worker is null or p_limit < 1 or p_limit > 50 then raise exception 'invalid monitoring claim'; end if;
  return query with due as (
    select d.id from public.live_lineup_monitor_deliveries d
    where (d.status = 'pending' and d.next_attempt_at <= now())
      or (d.status = 'processing' and d.claimed_at < now() - interval '5 minutes')
    order by d.next_attempt_at,d.id limit p_limit for update skip locked
  ) update public.live_lineup_monitor_deliveries d
    set status = 'processing', claimed_by = p_worker, claimed_at = now(), attempt_count = d.attempt_count + 1
    from due where d.id = due.id returning d.*;
end $$;

create or replace function public.live_lineup_monitor_finish(
  p_job_id uuid,p_worker uuid,p_outcome text,p_provider_id text default null,p_retry_seconds integer default 60
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_job public.live_lineup_monitor_deliveries;
begin
  if p_outcome not in ('accepted','retry','canceled','exhausted') or p_retry_seconds < 1 or p_retry_seconds > 3600
    or (p_outcome = 'accepted' and (p_provider_id is null or length(p_provider_id) > 200)) then
    raise exception 'invalid monitoring receipt';
  end if;
  -- Same incident-before-delivery lock order as the transition RPC, avoiding a recovery/send deadlock.
  select * into v_job from public.live_lineup_monitor_deliveries where id = p_job_id;
  if v_job.rep_id is not null then
    perform 1 from public.live_lineup_monitor_states where rep_id = v_job.rep_id for update;
  end if;
  if v_job.incident_id is not null then
    perform 1 from public.live_lineup_monitor_incidents where id = v_job.incident_id for update;
  end if;
  select * into v_job from public.live_lineup_monitor_deliveries
    where id = p_job_id and status = 'processing' and claimed_by = p_worker for update;
  if not found then return false; end if;
  update public.live_lineup_monitor_deliveries
    set status = case when p_outcome = 'retry' then 'pending' else p_outcome end,
      next_attempt_at = now() + make_interval(secs => p_retry_seconds), claimed_by = null, claimed_at = null,
      provider_id = case when p_outcome = 'accepted' then p_provider_id else provider_id end,
      accepted_at = case when p_outcome = 'accepted' then now() else accepted_at end
    where id = p_job_id;
  if p_outcome = 'canceled' and v_job.kind = 'incident' and v_job.channel = 'email' then
    update public.live_lineup_monitor_incidents set status = 'recovered', recovered_at = now()
      where id = v_job.incident_id and email_accepted_at is null and status = 'open';
    if found then
      update public.live_lineup_monitor_states set revision = revision + 1,
        data = data || jsonb_build_object('incidentId',null,'recoveringIncidentId',v_job.incident_id::text,'unhealthySince',null), updated_at = now()
        where rep_id = v_job.rep_id and data->>'incidentId' = v_job.incident_id::text;
      update public.live_lineup_monitor_deliveries set status = 'canceled'
        where incident_id = v_job.incident_id and kind = 'incident' and status = 'pending';
    end if;
  end if;
  if p_outcome = 'accepted' and v_job.kind = 'incident' then
    if v_job.channel = 'email' then
      update public.live_lineup_monitor_incidents set email_accepted_at = coalesce(email_accepted_at,now()) where id = v_job.incident_id;
    end if;
    -- A channel receives recovery only if its own incident notification was accepted.
    insert into public.live_lineup_monitor_deliveries(incident_id,rep_id,kind,channel,payload)
      select i.id,i.rep_id,'recovery',v_job.channel,i.recovery_payload from public.live_lineup_monitor_incidents i
      where i.id = v_job.incident_id and i.status = 'recovered' and i.recovery_payload is not null
      on conflict (incident_id,kind,channel) do nothing;
  end if;
  return true;
end $$;

create or replace function public.live_lineup_monitor_adoption(p_version text,p_payload jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_version !~ '^\d{1,5}(\.\d{1,5}){1,3}$' or jsonb_typeof(p_payload) <> 'object' then raise exception 'invalid adoption report'; end if;
  insert into public.live_lineup_monitor_deliveries(release_version,kind,channel,payload)
    values(p_version,'adoption','email',p_payload) on conflict (release_version,channel) do nothing;
  return found;
end $$;

revoke all on function public.live_lineup_monitor_commit(uuid,bigint,jsonb,text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.live_lineup_monitor_claim(uuid,integer) from public,anon,authenticated;
revoke all on function public.live_lineup_monitor_finish(uuid,uuid,text,text,integer) from public,anon,authenticated;
revoke all on function public.live_lineup_monitor_adoption(text,jsonb) from public,anon,authenticated;
grant execute on function public.live_lineup_monitor_commit(uuid,bigint,jsonb,text,uuid,jsonb) to service_role;
grant execute on function public.live_lineup_monitor_claim(uuid,integer) to service_role;
grant execute on function public.live_lineup_monitor_finish(uuid,uuid,text,text,integer) to service_role;
grant execute on function public.live_lineup_monitor_adoption(text,jsonb) to service_role;
