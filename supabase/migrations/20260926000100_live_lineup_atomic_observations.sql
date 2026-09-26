-- Additive v5.2 commit boundary. Existing JSON remains readable and the original
-- RPC keeps its signature for older application instances. No public grants.
create function public.live_lineup_commit(p_rep_id uuid, p_expected_revision bigint, p_state jsonb,
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
          > (prior.state #>> '{publisher,leaseExpiresAt}')::timestamptz then
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
  if changed_rows>0 and p_token_id is not null then
    update public.live_lineup_publisher_tokens set last_used_at=clock_timestamp() where id=p_token_id;
  end if;
end;
$$;
revoke all on function public.live_lineup_commit(uuid,bigint,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.live_lineup_commit(uuid,bigint,jsonb,uuid,jsonb) to service_role;

create or replace function public.live_lineup_compare_swap(p_rep_id uuid,p_expected_revision bigint,p_state jsonb,p_token_id uuid default null)
returns setof public.live_lineup_states
language sql security invoker set search_path=pg_catalog,public as $$
  select * from public.live_lineup_commit(p_rep_id,p_expected_revision,p_state,p_token_id,'{}'::jsonb);
$$;
