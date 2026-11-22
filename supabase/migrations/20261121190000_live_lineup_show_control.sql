-- Show visibility is separate from the strict v2 source-state JSON.
create table public.live_lineup_show_controls (
  rep_id uuid primary key references public.reps(id) on delete cascade,
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  mode text not null default 'auto' check (mode in ('auto','started','stopped')),
  run_id uuid,
  started_at timestamptz,
  stopped_at timestamptz,
  stop_reason text check (stop_reason in ('manual','idle','party_closed')),
  changed_by text not null default 'auto' check (changed_by in ('workspace','extension','auto')),
  selection_epoch bigint not null default 0 check (selection_epoch between 0 and 9007199254740991),
  last_extension_seen_at timestamptz,
  worker_version text check (worker_version ~ '^[0-9]{1,5}(\.[0-9]{1,5}){1,3}$'),
  reader_version text check (reader_version ~ '^[0-9]{1,5}(\.[0-9]{1,5}){1,3}$'),
  tab_present boolean not null default false,
  reader_responding boolean not null default false,
  source_status text not null default 'unknown' check (source_status in ('ready','loading','partial','invalid','unavailable','unknown')),
  ack_control_revision bigint check (ack_control_revision >= 0 and ack_control_revision <= revision),
  last_new_order_at timestamptz,
  idle_deadline_at timestamptz,
  run_lineup_revision bigint check (run_lineup_revision >= 0),
  run_generation bigint check (run_generation >= 0),
  last_public_empty_at timestamptz,
  stopped_selection_epoch bigint check (stopped_selection_epoch >= 0 and stopped_selection_epoch <= selection_epoch),
  stopped_party_ids text[] not null default '{}' check (cardinality(stopped_party_ids) <= 100),
  auto_check_new_parties boolean not null default false,
  run_ready_since timestamptz,
  seen_order_ids text[] not null default '{}' check (cardinality(seen_order_ids) <= 12000),
  updated_at timestamptz not null default clock_timestamp(),
  check (idle_deadline_at is null or (started_at is not null and idle_deadline_at >= started_at)),
  check (run_ready_since is null or (started_at is not null and run_ready_since >= started_at)),
  check (not reader_responding or tab_present)
);

create index live_lineup_show_controls_due on public.live_lineup_show_controls (idle_deadline_at, rep_id)
  where mode <> 'stopped' and idle_deadline_at is not null;

create table public.live_lineup_show_control_requests (
  rep_id uuid not null references public.live_lineup_show_controls(rep_id) on delete cascade,
  request_id uuid not null,
  action text not null check (action in ('show-start','show-stop')),
  resulting_revision bigint not null check (resulting_revision > 0),
  run_id uuid,
  created_at timestamptz not null,
  primary key (rep_id, request_id)
);
create index live_lineup_control_requests_age on public.live_lineup_show_control_requests (rep_id, created_at);

alter table public.live_lineup_show_controls enable row level security;
alter table public.live_lineup_show_control_requests enable row level security;
revoke all on public.live_lineup_show_controls, public.live_lineup_show_control_requests from public, anon, authenticated, service_role;
grant select on public.live_lineup_show_controls to service_role;

-- Compatibility with publisher revocation requires taking a durable token
-- lock before the lineup row. Both precede the control row for all writers.
create function public.live_lineup_control_lock(p_rep_id uuid, p_token_id uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  state_row public.live_lineup_states%rowtype;
  token_row public.live_lineup_publisher_tokens%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('live-lineup-control:' || p_rep_id::text, 0));
  if p_token_id is not null then
    select * into token_row from public.live_lineup_publisher_tokens where id=p_token_id for no key update;
    if not found or token_row.rep_id is distinct from p_rep_id or token_row.revoked_at is not null
      or token_row.expires_at <= clock_timestamp() then
      raise exception 'Invalid lineup publisher' using errcode='28000';
    end if;
  end if;
  select * into state_row from public.live_lineup_states where rep_id=p_rep_id for update;
  return state_row.state;
end;
$$;

create function public.live_lineup_control_parties(p_state jsonb, p_field text)
returns text[] language sql immutable security invoker set search_path = pg_catalog, public as $$
  select coalesce(array_agg(distinct value order by value), '{}'::text[])
  from jsonb_array_elements_text(coalesce(p_state #> array['show',p_field], '[]'::jsonb))
$$;

create function public.live_lineup_control_stop(
  p_control public.live_lineup_show_controls, p_parties text[], p_at timestamptz, p_reason text, p_actor text
) returns public.live_lineup_show_controls
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  p_control.revision := p_control.revision + 1;
  p_control.mode := 'stopped';
  p_control.changed_by := p_actor;
  p_control.stopped_at := p_at;
  p_control.stop_reason := p_reason;
  p_control.stopped_selection_epoch := p_control.selection_epoch;
  p_control.stopped_party_ids := p_parties;
  p_control.auto_check_new_parties := false;
  p_control.updated_at := p_at;
  return p_control;
end;
$$;

create function public.live_lineup_control_start(
  p_control public.live_lineup_show_controls, p_at timestamptz, p_actor text, p_auto_check boolean
) returns public.live_lineup_show_controls
language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  p_control.revision := p_control.revision + 1;
  p_control.mode := case when p_actor='auto' then 'auto' else 'started' end;
  p_control.changed_by := p_actor;
  p_control.run_id := gen_random_uuid();
  p_control.started_at := p_at;
  p_control.stopped_at := null;
  p_control.stop_reason := null;
  p_control.stopped_selection_epoch := null;
  p_control.stopped_party_ids := '{}';
  p_control.last_new_order_at := null;
  p_control.idle_deadline_at := p_at + interval '120 minutes';
  p_control.run_lineup_revision := null;
  p_control.run_generation := null;
  p_control.run_ready_since := null;
  p_control.last_public_empty_at := null;
  p_control.seen_order_ids := '{}';
  p_control.auto_check_new_parties := p_auto_check;
  p_control.updated_at := p_at;
  return p_control;
end;
$$;

create function public.live_lineup_control_save(p_control public.live_lineup_show_controls)
returns void language sql security invoker set search_path = pg_catalog, public as $$
  update public.live_lineup_show_controls set
    (revision, mode, run_id, started_at, stopped_at, stop_reason, changed_by, selection_epoch,
     last_extension_seen_at, worker_version, reader_version, tab_present, reader_responding, source_status,
     ack_control_revision, last_new_order_at, idle_deadline_at, run_lineup_revision, run_generation,
     last_public_empty_at, stopped_selection_epoch, stopped_party_ids, auto_check_new_parties,
     run_ready_since, seen_order_ids, updated_at) =
    (p_control.revision, p_control.mode, p_control.run_id, p_control.started_at, p_control.stopped_at,
     p_control.stop_reason, p_control.changed_by, p_control.selection_epoch,
     p_control.last_extension_seen_at, p_control.worker_version, p_control.reader_version,
     p_control.tab_present, p_control.reader_responding, p_control.source_status, p_control.ack_control_revision,
     p_control.last_new_order_at, p_control.idle_deadline_at, p_control.run_lineup_revision, p_control.run_generation,
     p_control.last_public_empty_at, p_control.stopped_selection_epoch, p_control.stopped_party_ids,
     p_control.auto_check_new_parties, p_control.run_ready_since, p_control.seen_order_ids, p_control.updated_at)
  where rep_id=p_control.rep_id
$$;

create function public.live_lineup_control_command(
  p_rep_id uuid, p_action text, p_request_id uuid, p_expected_revision bigint, p_actor text, p_token_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  lineup jsonb;
  control public.live_lineup_show_controls%rowtype;
  receipt public.live_lineup_show_control_requests%rowtype;
  checked_at timestamptz;
  parties text[];
  connected boolean;
begin
  if p_action is null or p_action not in ('show-start','show-stop') or p_request_id is null
    or p_expected_revision is null or p_expected_revision not between 0 and 9007199254740990
    or p_actor is null or p_actor not in ('workspace','extension')
    or (p_actor='workspace' and p_token_id is not null) then
    raise exception 'Invalid show control command' using errcode='22023';
  end if;
  lineup := public.live_lineup_control_lock(p_rep_id,p_token_id);
  insert into public.live_lineup_show_controls(rep_id) values(p_rep_id) on conflict do nothing;
  select * into control from public.live_lineup_show_controls where rep_id=p_rep_id for update;
  checked_at := clock_timestamp();
  select * into receipt from public.live_lineup_show_control_requests
    where rep_id=p_rep_id and request_id=p_request_id;
  if found then
    if receipt.action <> p_action then raise exception 'Request id reused' using errcode='22023'; end if;
    return jsonb_build_object('status','applied','control',to_jsonb(control),
      'receipt',to_jsonb(receipt)-'rep_id','serverTime',checked_at);
  end if;
  if control.revision <> p_expected_revision then
    return jsonb_build_object('status','conflict','control',to_jsonb(control),'serverTime',checked_at);
  end if;
  parties := public.live_lineup_control_parties(lineup,'partyIds');
  if p_action='show-start' then
    connected := case when control.worker_version is not null then
      control.tab_present and control.reader_responding
        and control.last_extension_seen_at between checked_at-interval '90 seconds' and checked_at
      else (lineup->>'lastReceivedAt')::timestamptz between checked_at-interval '90 seconds' and checked_at
      end;
    control := public.live_lineup_control_start(control,checked_at,p_actor,
      cardinality(parties)=0 and coalesce(connected,false));
  else
    control := public.live_lineup_control_stop(control,parties,checked_at,'manual',p_actor);
  end if;
  perform public.live_lineup_control_save(control);
  -- Keep recent receipts bounded, independently of source/hold/archive storage.
  delete from public.live_lineup_show_control_requests where rep_id=p_rep_id and request_id in (
    select request_id from public.live_lineup_show_control_requests where rep_id=p_rep_id
      order by created_at desc, request_id offset 255);
  insert into public.live_lineup_show_control_requests(rep_id,request_id,action,resulting_revision,run_id,created_at)
    values(p_rep_id,p_request_id,p_action,control.revision,control.run_id,checked_at) returning * into receipt;
  return jsonb_build_object('status','applied','control',to_jsonb(control),
    'receipt',to_jsonb(receipt)-'rep_id','serverTime',checked_at);
end;
$$;

create function public.live_lineup_control_checkin(
  p_rep_id uuid, p_worker_version text, p_reader_version text, p_source_status text,
  p_tab_present boolean, p_reader_responding boolean, p_ack_revision bigint, p_token_id uuid default null
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  lineup jsonb;
  control public.live_lineup_show_controls%rowtype;
  checked_at timestamptz;
begin
  if p_worker_version is null or p_worker_version !~ '^[0-9]{1,5}(\.[0-9]{1,5}){1,3}$'
    or p_source_status is null or p_source_status not in ('ready','loading','partial','invalid','unavailable','unknown')
    or p_tab_present is null or p_reader_responding is null or (p_reader_responding and not p_tab_present)
    or (p_ack_revision is not null and p_ack_revision not between 0 and 9007199254740991)
    or (p_reader_version is not null and p_reader_version !~ '^[0-9]{1,5}(\.[0-9]{1,5}){1,3}$') then
    raise exception 'Invalid show check-in' using errcode='22023';
  end if;
  lineup := public.live_lineup_control_lock(p_rep_id,p_token_id);
  insert into public.live_lineup_show_controls(rep_id) values(p_rep_id) on conflict do nothing;
  select * into control from public.live_lineup_show_controls where rep_id=p_rep_id for update;
  checked_at := clock_timestamp();
  control.last_extension_seen_at := checked_at;
  control.worker_version := p_worker_version;
  control.reader_version := p_reader_version;
  control.source_status := p_source_status;
  control.tab_present := p_tab_present;
  control.reader_responding := p_reader_responding;
  if p_ack_revision is not null and p_ack_revision <= control.revision then
    control.ack_control_revision := greatest(control.ack_control_revision,p_ack_revision);
  end if;
  control.updated_at := checked_at;
  perform public.live_lineup_control_save(control);
  return jsonb_build_object('status','ok','control',to_jsonb(control),'serverTime',checked_at);
end;
$$;

create function public.live_lineup_control_expire(p_limit integer default 64)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  tenant uuid;
  control public.live_lineup_show_controls%rowtype;
  lineup jsonb;
  checked_at timestamptz;
  expired integer := 0;
begin
  -- Order tenants consistently because advisory locks are held until commit.
  for tenant in
    select rep_id from (
      select rep_id from public.live_lineup_show_controls
      where mode <> 'stopped' and idle_deadline_at <= clock_timestamp()
      order by idle_deadline_at, rep_id limit greatest(1,least(coalesce(p_limit,64),100))
    ) due order by rep_id
  loop
    lineup := public.live_lineup_control_lock(tenant);
    select * into control from public.live_lineup_show_controls where rep_id=tenant for update;
    checked_at := clock_timestamp();
    if control.mode <> 'stopped' and control.idle_deadline_at <= checked_at then
      perform public.live_lineup_control_save(public.live_lineup_control_stop(control,
        public.live_lineup_control_parties(lineup,'partyIds'),checked_at,'idle','auto'));
      expired := expired + 1;
    end if;
  end loop;
  return expired;
end;
$$;

revoke execute on function public.live_lineup_control_lock(uuid,uuid),
  public.live_lineup_control_parties(jsonb,text),
  public.live_lineup_control_start(public.live_lineup_show_controls,timestamptz,text,boolean),
  public.live_lineup_control_stop(public.live_lineup_show_controls,text[],timestamptz,text,text),
  public.live_lineup_control_save(public.live_lineup_show_controls),
  public.live_lineup_control_command(uuid,text,uuid,bigint,text,uuid),
  public.live_lineup_control_checkin(uuid,text,text,text,boolean,boolean,bigint,uuid),
  public.live_lineup_control_expire(integer) from public, anon, authenticated, service_role;
grant execute on function public.live_lineup_control_command(uuid,text,uuid,bigint,text,uuid),
  public.live_lineup_control_checkin(uuid,text,text,text,boolean,boolean,bigint,uuid),
  public.live_lineup_control_expire(integer) to service_role;

-- The caller already holds the tenant advisory lock and any prior row lock.
create function public.live_lineup_control_capture(p_rep_id uuid, p_prior jsonb, p_next jsonb,
  p_kind text, p_guard jsonb, p_at timestamptz)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  control public.live_lineup_show_controls%rowtype;
  parties text[] := public.live_lineup_control_parties(p_next,'partyIds');
  prior_parties text[] := public.live_lineup_control_parties(p_prior,'partyIds');
  exclusions text[] := public.live_lineup_control_parties(p_next,'excludedPartyIds');
  prior_exclusions text[] := public.live_lineup_control_parties(p_prior,'excludedPartyIds');
  selected text[];
  snapshot_ids text[] := '{}';
  prior_ids text[];
  exclusion_changed boolean;
  ready_source boolean := p_kind='source' and p_next->>'parserState'='ready';
  has_new_order boolean := false;
  can_restart boolean := false;
begin
  exclusion_changed := p_kind in ('configure','owner') and array(
    select id from unnest(exclusions) id
    where not coalesce((p_guard->'autoExcludedPartyIds') ? id,false)
    order by id
  ) is distinct from prior_exclusions;
  if not (ready_source or p_kind='configure' or exclusion_changed) then return; end if;
  select coalesce(array_agg(id),'{}') into selected from unnest(parties) id where not id=any(exclusions);
  if not (cardinality(selected)>0 or exclusion_changed
    or exists(select 1 from public.live_lineup_show_controls where rep_id=p_rep_id)) then return; end if;
  insert into public.live_lineup_show_controls(rep_id) values(p_rep_id) on conflict do nothing;
  select * into control from public.live_lineup_show_controls where rep_id=p_rep_id for update;
  if p_guard ? 'controlRevision' and (p_guard->>'controlRevision')::bigint is distinct from control.revision then
    return;
  end if;
  if exclusion_changed then
    control.selection_epoch := control.selection_epoch + 1;
    control.revision := control.revision + 1;
    control.auto_check_new_parties := false;
  end if;
  if control.mode<>'stopped' and control.idle_deadline_at<=p_at then
    control := public.live_lineup_control_stop(control,prior_parties,p_at,'idle','auto');
  end if;
  if ready_source and cardinality(selected)>0 then
    select coalesce(array_agg(distinct id order by id),'{}') into snapshot_ids
    from (
      select entry->>'id' id from jsonb_array_elements(p_next->'entries') entry
      union all
      select value from jsonb_array_elements_text(p_next->'revealedIds')
    ) ids
    where split_part(id,':',1)=any(selected)
      and (not (p_guard ? 'acceptedOrderIds') or (p_guard->'acceptedOrderIds') ? id);
    if control.run_ready_since is null then
      select coalesce(array_agg(distinct id),'{}') into prior_ids from (
        select entry->>'id' id from jsonb_array_elements(coalesce(p_prior->'entries','[]'::jsonb)) entry
        union all
        select value from jsonb_array_elements_text(coalesce(p_prior->'revealedIds','[]'::jsonb))
      ) ids;
    else
      prior_ids := control.seen_order_ids;
    end if;
    has_new_order := cardinality(prior_ids)<12000 and exists(
      select 1 from unnest(snapshot_ids) id where not id=any(prior_ids));
  end if;
  if control.mode='stopped' then
    can_restart := exclusion_changed
      or (control.stop_reason='idle' and has_new_order)
      or exists(select 1 from unnest(selected) id
        where not id=any(control.stopped_party_ids) and not id=any(prior_parties)
          and (cardinality(control.stopped_party_ids)>0 or p_at>=control.stopped_at+interval '120 minutes'));
    if can_restart and cardinality(selected)>0 then
      control := public.live_lineup_control_start(control,p_at,'auto',false);
    end if;
  elsif control.run_id is null and cardinality(selected)>0 then
    control := public.live_lineup_control_start(control,p_at,'auto',false);
  end if;
  if control.mode<>'stopped' and control.run_id is not null then
    if cardinality(selected)>0 then control.auto_check_new_parties := false; end if;
    if ready_source and cardinality(selected)>0 then
      if control.run_ready_since is not null and has_new_order then
        control.last_new_order_at := p_at;
        control.idle_deadline_at := p_at+interval '120 minutes';
      end if;
      control.run_ready_since := coalesce(control.run_ready_since,p_at);
      control.run_lineup_revision := (p_next->>'revision')::bigint;
      control.run_generation := coalesce((p_next#>>'{show,generation}')::bigint,0);
      if not exists(select 1 from jsonb_array_elements(p_next->'entries') entry
        where split_part(entry->>'id',':',1)=any(selected)) then control.last_public_empty_at := p_at; end if;
      select array(
        select id from unnest(control.seen_order_ids) id
        union all
        select id from unnest(snapshot_ids) id where not id=any(control.seen_order_ids)
        limit 12000
      ) into control.seen_order_ids;
    end if;
  end if;
  control.updated_at := p_at;
  perform public.live_lineup_control_save(control);
end;
$$;
revoke execute on function public.live_lineup_control_capture(uuid,jsonb,jsonb,text,jsonb,timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.live_lineup_control_capture(uuid,jsonb,jsonb,text,jsonb,timestamptz) to service_role;

-- Opt in to bounded invalid heartbeats only after the existing locked ownership and observation checks.
create or replace function public.live_lineup_commit(p_rep_id uuid, p_expected_revision bigint, p_state jsonb,
  p_token_id uuid default null, p_guard jsonb default '{}'::jsonb)
returns setof public.live_lineup_states
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  publisher_token public.live_lineup_publisher_tokens%rowtype;
  prior public.live_lineup_states%rowtype;
  prior_generation bigint;
  next_generation bigint;
  changed_rows bigint;
  checked_at timestamptz;
  source_deadline timestamptz;
  operation text := coalesce(p_guard->>'kind', 'legacy');
  configuration boolean := false;
  observation_time timestamptz;
begin
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991
    or p_state is null or jsonb_typeof(p_state) <> 'object' or p_state->>'schemaVersion' is distinct from '2'
    or (p_state->>'revision')::bigint is distinct from p_expected_revision + 1 then
    raise exception 'Invalid lineup revision/state' using errcode = '22023';
  end if;
  if octet_length(p_state::text) > 8388608 or jsonb_array_length(p_state->'entries') > 2000
    or jsonb_array_length(p_state->'revealedIds') > 10000
    or jsonb_array_length(coalesce(p_state->'restorations','[]'::jsonb)) > 10000
    or jsonb_array_length(coalesce(p_state->'revealEvents','[]'::jsonb)) > 128
    or (select coalesce(sum(jsonb_array_length(event->'groupEntryIds')),0)
      from jsonb_array_elements(coalesce(p_state->'revealEvents','[]'::jsonb)) event) > 4000 then
    raise exception 'Lineup capacity exceeded' using errcode = '54000';
  end if;
  -- Serialize against Start, Stop, check-ins and expiry before taking row locks.
  perform pg_advisory_xact_lock(hashtextextended('live-lineup-control:' || p_rep_id::text, 0));
  if p_token_id is not null then
    select * into publisher_token from public.live_lineup_publisher_tokens where id=p_token_id for no key update;
    if not found or publisher_token.rep_id is distinct from p_rep_id or publisher_token.revoked_at is not null
      or publisher_token.expires_at <= clock_timestamp() or p_state #>> '{publisher,id}' is distinct from p_token_id::text then
      raise exception 'Invalid lineup publisher token' using errcode = '28000';
    end if;
  end if;
  next_generation := coalesce((p_state #>> '{show,generation}')::bigint,0);
  -- Older application instances may spread additive fields while replacing a
  -- lease. Reject incompatible candidates instead of storing an unreadable epoch.
  if p_state->'sourceObservation' is not null and p_state->'sourceObservation' <> 'null'::jsonb
    and ((p_state #>> '{sourceObservation,epoch}')::bigint is distinct from (p_state #>> '{publisher,epoch}')::bigint
      or (p_state #>> '{sourceObservation,generation}')::bigint is distinct from next_generation) then
    raise exception 'Observation context does not match state' using errcode = '55001';
  end if;
  if p_expected_revision > 0 then
    select * into prior from public.live_lineup_states where rep_id=p_rep_id for update;
    if not found or prior.revision <> p_expected_revision then return; end if;
    prior_generation := coalesce((prior.state #>> '{show,generation}')::bigint,0);
  elsif next_generation <> 0 then
    raise exception 'Invalid initial show generation' using errcode = '22023';
  end if;
  -- Use the clock AFTER all locks. A request may have waited beyond its evidence,
  -- token, or lease deadline even though application-side validation passed.
  checked_at := clock_timestamp();
  if p_token_id is not null and publisher_token.expires_at <= checked_at then
    raise exception 'Expired lineup publisher token' using errcode = '28000';
  end if;
  if p_expected_revision > 0 then
    configuration := prior.state #> '{show,partyIds}' is distinct from p_state #> '{show,partyIds}'
      or prior.state #> '{show,excludedPartyIds}' is distinct from p_state #> '{show,excludedPartyIds}';
    if operation='legacy' and configuration and prior.state #>> '{publisher,capabilities}'='lineup-2.0.5' then
      raise exception 'Upgraded scope change needs owner proof' using errcode = '55001';
    end if;
    if operation='legacy' then
      if prior.state #>> '{publisher,epoch}' is distinct from p_state #>> '{publisher,epoch}' then operation := 'claim';
      elsif prior.state #>> '{publisher,lastSequence}' is distinct from p_state #>> '{publisher,lastSequence}'
        and prior_generation=next_generation then operation := 'source';
      elsif configuration and prior_generation=next_generation then operation := 'configure';
      else operation := 'owner'; end if;
    end if;
    if operation='claim' then
      if (prior.state #>> '{publisher,leaseExpiresAt}')::timestamptz > checked_at then
        raise exception 'Publisher still owns lease' using errcode = '55001';
      end if;
    elsif operation in ('source','configure') then
      if prior.state #>> '{publisher,id}' is distinct from p_state #>> '{publisher,id}'
        or (prior.state #>> '{publisher,leaseExpiresAt}')::timestamptz <= checked_at then
        raise exception 'Publisher lease no longer owned' using errcode = '55001';
      end if;
      -- An old worker shares the Workspace-code publisher ID. That is NOT proof
      -- of its browser's claim. Never let legacy configure mutate an upgraded lease.
      if prior.state #>> '{publisher,capabilities}' = 'lineup-2.0.5'
        or p_guard ? 'claimId' then
        if prior.state #>> '{publisher,claimId}' is distinct from p_guard->>'claimId'
          or (prior.state #>> '{publisher,epoch}')::bigint is distinct from (p_guard->>'epoch')::bigint
          or prior_generation is distinct from (p_guard->>'generation')::bigint then
          raise exception 'Publisher claim no longer owned' using errcode = '55001';
        end if;
      end if;
      if operation='source' then
        if next_generation <> prior_generation or prior.state #>> '{publisher,epoch}' is distinct from p_state #>> '{publisher,epoch}'
          or prior.state #>> '{publisher,claimId}' is distinct from p_state #>> '{publisher,claimId}' then
          raise exception 'Source context changed' using errcode = '55001';
        end if;
        if prior.state #>> '{publisher,capabilities}' = 'lineup-2.0.5' then
          observation_time := (p_guard->>'observationTime')::timestamptz;
          if observation_time is null or observation_time > checked_at
            or observation_time < checked_at - interval '15 seconds'
            or observation_time is distinct from (p_state #>> '{sourceObservation,serverTime}')::timestamptz then
            raise exception 'Source observation expired at commit' using errcode = '55002';
          end if;
        end if;
        if p_state->>'parserState' <> 'ready' and (p_state #>> '{publisher,leaseExpiresAt}')::timestamptz
          > (prior.state #>> '{publisher,leaseExpiresAt}')::timestamptz
          and not coalesce((
            p_guard->>'kind' = 'source' and p_guard->'renewInvalidLease' = 'true'::jsonb
            and prior.state #>> '{publisher,capabilities}' = 'lineup-2.0.5'
            and p_state->>'parserState' = 'invalid'
            and (p_state #>> '{publisher,lastSequence}')::bigint > (prior.state #>> '{publisher,lastSequence}')::bigint
            and (p_state #>> '{publisher,leaseExpiresAt}')::timestamptz = (p_state->>'lastReceivedAt')::timestamptz + interval '90 seconds'
            and (p_state #>> '{publisher,leaseExpiresAt}')::timestamptz <= checked_at + interval '90 seconds'
          ), false) then
          raise exception 'Nonready packet cannot renew lease' using errcode = '55001';
        end if;
      end if;
    end if;
    -- Arrangement changes and Undo use one common commit-time source gate. Show,
    -- archive, and party-repair recovery follow their explicit separate contracts.
    if (coalesce((p_guard->>'requireFresh')::boolean,false)
      or operation='owner' and prior_generation=next_generation and (
        prior.state->'order' is distinct from p_state->'order' or prior.state->'held' is distinct from p_state->'held'
        or prior.state->'undo' is distinct from p_state->'undo')) then
      source_deadline := least((coalesce(prior.state->>'lastReadySourceAt',prior.state->>'lastReadyAt'))::timestamptz
        + interval '45 seconds', (prior.state #>> '{publisher,leaseExpiresAt}')::timestamptz);
      if prior.state->>'parserState' <> 'ready' or prior.state->>'lastReadyAt' is null
        or source_deadline is null or source_deadline <= checked_at
        or prior.state #>> '{publisher,capabilities}' = 'lineup-2.0.5' and (
          prior_generation=0 or prior.state #>> '{sourceObservation,settled}' is distinct from 'true') then
        raise exception 'Source is not ready and fresh at commit' using errcode = '55000';
      end if;
    end if;
    if operation='configure' and p_guard ? 'controlRevision'
      and ((p_guard->>'controlRevision')::bigint is distinct from coalesce(
        (select revision from public.live_lineup_show_controls where rep_id=p_rep_id),0)) then
      raise exception 'Show control revision changed' using errcode = '55003';
    end if;
    if next_generation <> prior_generation then
      if next_generation <> prior_generation+1
        or p_token_id is not null and not (operation='configure' and prior_generation=0) then
        raise exception 'Invalid show transition' using errcode = '22023';
      end if;
      insert into public.live_lineup_show_archives(rep_id,generation,revision,state)
        values(p_rep_id,prior_generation,prior.revision,prior.state);
    end if;
  end if;
  if p_expected_revision=0 then
    return query insert into public.live_lineup_states(rep_id,revision,state) values(p_rep_id,1,p_state)
      on conflict(rep_id) do nothing returning *;
  else
    return query update public.live_lineup_states set revision=p_expected_revision+1,state=p_state,updated_at=clock_timestamp()
      where rep_id=p_rep_id and revision=p_expected_revision returning *;
  end if;
  get diagnostics changed_rows = row_count;
  if changed_rows>0 then
    perform public.live_lineup_control_capture(p_rep_id,prior.state,p_state,operation,p_guard,checked_at);
  end if;
  if changed_rows>0 and p_token_id is not null then
    update public.live_lineup_publisher_tokens set last_used_at=clock_timestamp() where id=p_token_id;
  end if;
end;
$$;
