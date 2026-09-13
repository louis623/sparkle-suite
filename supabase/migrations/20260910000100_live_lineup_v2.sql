-- ADDITIVE / LOCAL DRAFT. Does not replace legacy live_queue or change grandfathered mappings.
-- Deploy only with explicit owner approval after local database verification.
-- Publisher IDs/credentials/order IDs never belong in the anonymous public projection.
create table public.live_lineup_states (
  rep_id uuid primary key references public.reps(id),
  revision bigint not null check (revision >= 1 and revision <= 9007199254740991),
  state jsonb not null check ((
    jsonb_typeof(state) = 'object'
    and state->>'schemaVersion' = '2'
    and (state->>'revision')::bigint = revision
    and jsonb_typeof(state->'entries') = 'array'
    and jsonb_typeof(state->'order') = 'array'
    and jsonb_typeof(state->'held') = 'array'
  ) is true),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.live_lineup_states enable row level security;
revoke all on public.live_lineup_states from public, anon, authenticated;
grant select, insert, update on public.live_lineup_states to service_role;

-- Owner-started shows retain their prior state atomically. Archives are private, not public history.
create table public.live_lineup_show_archives (
  rep_id uuid not null references public.reps(id),
  generation bigint not null check (generation >= 0),
  revision bigint not null,
  state jsonb not null,
  archived_at timestamptz not null default clock_timestamp(),
  primary key (rep_id, generation)
);
alter table public.live_lineup_show_archives enable row level security;
revoke all on public.live_lineup_show_archives from public, anon, authenticated;
grant select, insert on public.live_lineup_show_archives to service_role;

create table public.live_lineup_publisher_tokens (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text not null check (length(label) between 1 and 80 and label = btrim(label) and label !~ '[[:cntrl:]]'),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '30 days'),
  revoked_at timestamptz,
  last_used_at timestamptz,
  check (expires_at > created_at)
);
alter table public.live_lineup_publisher_tokens enable row level security;
revoke all on public.live_lineup_publisher_tokens from public, anon, authenticated;
grant select, insert, update on public.live_lineup_publisher_tokens to service_role;
create index live_lineup_publisher_tokens_rep on public.live_lineup_publisher_tokens(rep_id);

-- Issue credentials through one tenant-serialized transaction. A tenant-derived
-- advisory lock is stable even before that tenant has any credentials. Expired/revoked rows
-- remain as audit history and do not consume one of the eight usable device slots.
create function public.live_lineup_issue_publisher(p_rep_id uuid, p_token_id uuid, p_token_hash text, p_label text)
returns table(id uuid, rep_id uuid, label text, created_at timestamptz, expires_at timestamptz, revoked_at timestamptz, active_count bigint)
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  issued_at timestamptz;
  usable_count bigint;
begin
  if p_rep_id is null or p_token_id is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_label is null or length(p_label) not between 1 and 80 or p_label <> btrim(p_label)
    or p_label ~ '[[:cntrl:]]' then
    raise exception 'Invalid lineup publisher credential' using errcode = '22023';
  end if;
  -- A hash collision only over-serializes two tenants; it cannot weaken the cap.
  -- The insert's foreign key remains authoritative for tenant existence.
  perform pg_advisory_xact_lock(hashtextextended(p_rep_id::text, 734918));
  issued_at := clock_timestamp();
  select count(*) into usable_count from public.live_lineup_publisher_tokens t
    where t.rep_id = p_rep_id and t.revoked_at is null and t.expires_at > issued_at;
  if usable_count >= 8 then
    raise exception 'Lineup publisher credential limit reached' using errcode = '54000';
  end if;
  return query
    insert into public.live_lineup_publisher_tokens as t(id,rep_id,token_hash,label,created_at,expires_at,revoked_at)
      values(p_token_id,p_rep_id,p_token_hash,p_label,issued_at,issued_at + interval '2160 hours',null)
    returning t.id,t.rep_id,t.label,t.created_at,t.expires_at,t.revoked_at,usable_count + 1;
end;
$$;
revoke all on function public.live_lineup_issue_publisher(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.live_lineup_issue_publisher(uuid,uuid,text,text) to service_role;

-- Return every credential that can still authenticate, followed by as much recent
-- inactive audit history as fits in a bounded owner response. active_count lets the
-- service reject a truncated/hostile receipt instead of hiding a revokable key.
create function public.live_lineup_list_publishers(p_rep_id uuid)
returns table(checked_at timestamptz, active_count bigint, listed_count bigint, publishers jsonb)
language plpgsql stable security invoker set search_path = pg_catalog, public as $$
declare
  observed_at timestamptz := transaction_timestamp();
  usable_count bigint;
begin
  select count(*) into usable_count from public.live_lineup_publisher_tokens t
    where t.rep_id = p_rep_id and t.revoked_at is null and t.expires_at > observed_at;
  if usable_count > 8 then
    raise exception 'Invalid lineup publisher credential count' using errcode = '22023';
  end if;
  return query
    with classified as (
      select t.*, (t.revoked_at is null and t.expires_at > observed_at) as usable
      from public.live_lineup_publisher_tokens t where t.rep_id = p_rep_id
    ), ranked as (
      select c.*, row_number() over(partition by c.usable order by c.created_at desc,c.id) as history_rank
      from classified c
    ), chosen as (
      select r.* from ranked r where r.usable or r.history_rank <= 100 - usable_count
    )
    select observed_at,usable_count,count(*),coalesce(jsonb_agg(jsonb_build_object(
      'id',c.id,'rep_id',c.rep_id,'label',c.label,'created_at',c.created_at,'expires_at',c.expires_at,
      'revoked_at',c.revoked_at,'is_valid',c.usable) order by c.usable desc,c.created_at desc,c.id),'[]'::jsonb)
    from chosen c;
end;
$$;
revoke all on function public.live_lineup_list_publishers(uuid) from public, anon, authenticated;
grant execute on function public.live_lineup_list_publishers(uuid) to service_role;

-- All mutations, including publisher claims and heartbeats, use the same revision CAS.
-- Zero returned rows means conflict; caller MUST reread and recompute rather than replay old state.
-- First writer uses revision 0. INSERT ... ON CONFLICT prevents concurrent duplicate rep rows.
create function public.live_lineup_compare_swap(p_rep_id uuid, p_expected_revision bigint, p_state jsonb, p_token_id uuid default null)
returns setof public.live_lineup_states
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  publisher_token public.live_lineup_publisher_tokens%rowtype;
  changed_rows bigint;
  prior public.live_lineup_states%rowtype;
  prior_generation bigint;
  next_generation bigint;
begin
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision >= 9007199254740991
     or p_state is null or jsonb_typeof(p_state) <> 'object'
     or p_state->>'schemaVersion' is distinct from '2'
     or (p_state->>'revision')::bigint is distinct from p_expected_revision + 1 then
    raise exception 'Invalid lineup revision/state' using errcode = '22023';
  end if;
  if p_token_id is not null then
    -- Lock through the state commit so revocation cannot race a prior application-level token check.
    -- NO KEY UPDATE also serializes same-token requests; SHARE followed by last_used_at UPDATE would
    -- deadlock competing requests when they both attempted to upgrade their shared row locks.
    select * into publisher_token from public.live_lineup_publisher_tokens
      where id = p_token_id for no key update;
    if not found or publisher_token.rep_id is distinct from p_rep_id
      or publisher_token.revoked_at is not null or publisher_token.expires_at <= clock_timestamp()
      or p_state #>> '{publisher,id}' is distinct from p_token_id::text then
      raise exception 'Invalid lineup publisher token' using errcode = '28000';
    end if;
  end if;
  next_generation := coalesce((p_state #>> '{show,generation}')::bigint, 0);
  if p_expected_revision > 0 then
    select * into prior from public.live_lineup_states where rep_id = p_rep_id for update;
    if not found or prior.revision <> p_expected_revision then return; end if;
    prior_generation := coalesce((prior.state #>> '{show,generation}')::bigint, 0);
    if next_generation <> prior_generation then
      if p_token_id is not null or next_generation <> prior_generation + 1 then
        raise exception 'Invalid show transition' using errcode = '22023';
      end if;
      insert into public.live_lineup_show_archives(rep_id,generation,revision,state)
        values(p_rep_id,prior_generation,prior.revision,prior.state);
    end if;
  elsif next_generation <> 0 then
    raise exception 'Invalid initial show generation' using errcode = '22023';
  end if;
  -- A state-row lock may have waited beyond token expiry after the first authorization check.
  if p_token_id is not null and publisher_token.expires_at <= clock_timestamp() then
    raise exception 'Expired lineup publisher token' using errcode = '28000';
  end if;
  if p_expected_revision = 0 then
    return query insert into public.live_lineup_states(rep_id, revision, state)
      values (p_rep_id, 1, p_state)
      on conflict (rep_id) do nothing returning *;
  else
    return query update public.live_lineup_states
      set revision = p_expected_revision + 1, state = p_state, updated_at = clock_timestamp()
      where rep_id = p_rep_id and revision = p_expected_revision returning *;
  end if;
  get diagnostics changed_rows = row_count;
  if changed_rows > 0 and p_token_id is not null then
    update public.live_lineup_publisher_tokens set last_used_at = clock_timestamp() where id = p_token_id;
  end if;
end;
$$;
revoke all on function public.live_lineup_compare_swap(uuid,bigint,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.live_lineup_compare_swap(uuid,bigint,jsonb,uuid) to service_role;

-- Lost claim responses may be replayed only for the exact worker attempt. A fresh nonce never
-- acquires another active worker's epoch. Authorization and receipt lookup share one transaction.
create function public.live_lineup_claim_receipt(p_rep_id uuid, p_token_id uuid, p_claim_id uuid)
returns setof public.live_lineup_states
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  publisher_token public.live_lineup_publisher_tokens%rowtype;
  current_state public.live_lineup_states%rowtype;
begin
  select * into publisher_token from public.live_lineup_publisher_tokens where id = p_token_id for share;
  if not found or publisher_token.rep_id is distinct from p_rep_id or publisher_token.revoked_at is not null
    or publisher_token.expires_at <= clock_timestamp() then
    raise exception 'Invalid lineup publisher token' using errcode = '28000';
  end if;
  select * into current_state from public.live_lineup_states where rep_id = p_rep_id for share;
  if not found then return; end if;
  if publisher_token.expires_at <= clock_timestamp() then
    raise exception 'Invalid lineup publisher token' using errcode = '28000';
  end if;
  if current_state.state #>> '{publisher,id}' = p_token_id::text
    and current_state.state #>> '{publisher,claimId}' = p_claim_id::text
    and (current_state.state #>> '{publisher,leaseExpiresAt}')::timestamptz > clock_timestamp() then
    return next current_state;
  end if;
end;
$$;
revoke all on function public.live_lineup_claim_receipt(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.live_lineup_claim_receipt(uuid,uuid,uuid) to service_role;

-- Owner revocation and selected-lease invalidation are one transaction. Use the same
-- token -> state lock order as source CAS, so an already-authorized heartbeat cannot
-- restore the revoked publisher after this operation commits. Revoking an old device
-- must never invalidate a replacement device that has already claimed the state.
create function public.live_lineup_revoke_publisher(p_rep_id uuid, p_token_id uuid)
returns table(publisher_id uuid, rep_id uuid, revoked_at timestamptz, invalidated boolean)
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare
  publisher_token public.live_lineup_publisher_tokens%rowtype;
  current_state public.live_lineup_states%rowtype;
  invalidated_lease boolean := false;
  revoked_time timestamptz;
  expired_lease text;
  next_state jsonb;
begin
  select t.* into publisher_token from public.live_lineup_publisher_tokens t
    where t.id = p_token_id and t.rep_id = p_rep_id for no key update;
  if not found then return; end if;
  revoked_time := coalesce(publisher_token.revoked_at, clock_timestamp());
  update public.live_lineup_publisher_tokens t set revoked_at = revoked_time where t.id = p_token_id;
  select s.* into current_state from public.live_lineup_states s where s.rep_id = p_rep_id for update;
  if found and current_state.state #>> '{publisher,id}' = p_token_id::text
    and (current_state.state->'lastReceivedAt' <> 'null'::jsonb
      or (current_state.state #>> '{publisher,leaseExpiresAt}')::timestamptz > clock_timestamp()) then
    if current_state.revision >= 9007199254740991 then
      raise exception 'Invalid lineup revision' using errcode = '22023';
    end if;
    -- Match the model's unreceived/expired lease shape; retain the last ready queue,
    -- manual order, holds, undo, show generation, and timestamps used for retention.
    expired_lease := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
    next_state := current_state.state || jsonb_build_object(
      'revision', current_state.revision + 1, 'lastReceivedAt', null,
      'parserState', 'loading', 'sourceVersion', null,
      'publisher', (current_state.state->'publisher') || jsonb_build_object('lastSequence', -1, 'leaseExpiresAt', expired_lease));
    update public.live_lineup_states s set revision = current_state.revision + 1,
      state = next_state, updated_at = clock_timestamp() where s.rep_id = p_rep_id;
    invalidated_lease := true;
  end if;
  return query select p_token_id, p_rep_id, revoked_time, invalidated_lease;
end;
$$;
revoke all on function public.live_lineup_revoke_publisher(uuid,uuid) from public, anon, authenticated;
grant execute on function public.live_lineup_revoke_publisher(uuid,uuid) to service_role;
