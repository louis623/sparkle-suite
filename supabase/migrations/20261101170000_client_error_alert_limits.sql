-- Off-by-default browser monitoring. Only the server service role may use it.
create table public.ss_client_error_batches (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  started_at timestamptz not null default clock_timestamp(),
  report_count smallint not null default 0 check (report_count between 0 and 11),
  flooded boolean not null default false,
  processed boolean not null default false
);
create index ss_client_error_batches_ip_time on public.ss_client_error_batches(ip_hash, started_at desc);
create index ss_client_error_batches_time on public.ss_client_error_batches(started_at);
create table public.ss_client_error_observations (
  batch_id uuid not null references public.ss_client_error_batches(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  diagnostic jsonb not null,
  occurrences integer not null default 1,
  primary key (batch_id, fingerprint)
);
create table public.ss_client_error_fingerprints (
  fingerprint text primary key check (fingerprint ~ '^[a-f0-9]{64}$'),
  last_alert_at timestamptz,
  first_seen_at timestamptz not null default clock_timestamp(),
  repeat_count bigint not null default 0
);
create table public.ss_client_error_deliveries (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  reserved_at timestamptz not null default clock_timestamp()
);
create index ss_client_error_deliveries_time on public.ss_client_error_deliveries(reserved_at);

alter table public.ss_client_error_batches enable row level security;
alter table public.ss_client_error_observations enable row level security;
alter table public.ss_client_error_fingerprints enable row level security;
alter table public.ss_client_error_deliveries enable row level security;
revoke all on public.ss_client_error_batches, public.ss_client_error_observations,
  public.ss_client_error_fingerprints, public.ss_client_error_deliveries from public, anon, authenticated;
grant select, insert, update, delete on public.ss_client_error_batches, public.ss_client_error_observations,
  public.ss_client_error_fingerprints, public.ss_client_error_deliveries to service_role;

-- Buffer a whole IP window BEFORE reserving any email budget. A burst of 11+
-- reports invalidates the entire batch, including its first ten reports.
create function public.ss_admit_client_error(p_ip_hash text, p_fingerprint text, p_diagnostic jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_batch public.ss_client_error_batches%rowtype;
  v_schedule boolean := false;
begin
  if p_ip_hash is null or p_fingerprint is null or p_diagnostic is null
     or p_ip_hash !~ '^[a-f0-9]{64}$' or p_fingerprint !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_diagnostic) <> 'object' then
    raise exception 'Invalid monitoring admission';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('client-error-ip:' || p_ip_hash, 0));
  delete from public.ss_client_error_batches where id in (
    select id from public.ss_client_error_batches where started_at < v_now - interval '1 day' limit 100
  );
  select * into v_batch from public.ss_client_error_batches
    where ip_hash = p_ip_hash and started_at > v_now - interval '1 minute'
    order by started_at desc limit 1 for update;
  if not found then
    insert into public.ss_client_error_batches(ip_hash, started_at) values (p_ip_hash, v_now)
      returning * into v_batch;
    v_schedule := true;
  end if;
  update public.ss_client_error_batches set report_count = least(report_count + 1, 11)
    where id = v_batch.id returning * into v_batch;
  if v_batch.report_count > 10 or v_batch.flooded then
    update public.ss_client_error_batches set flooded = true where id = v_batch.id;
    delete from public.ss_client_error_observations where batch_id = v_batch.id;
    return jsonb_build_object('allowed', false);
  end if;
  insert into public.ss_client_error_observations(batch_id, fingerprint, diagnostic)
    values (v_batch.id, p_fingerprint, p_diagnostic)
    on conflict (batch_id, fingerprint) do update
      set occurrences = ss_client_error_observations.occurrences + 1;
  return jsonb_build_object('allowed', true, 'batchId', v_batch.id, 'schedule', v_schedule,
    'delayMs', ceil(extract(epoch from (v_batch.started_at + interval '61 seconds' - v_now)) * 1000));
end;
$$;

-- One transaction owns all budget decisions across instances and deployments.
-- Reservations also count uncertain/failed provider calls, conservatively.
create function public.ss_claim_client_error_batch(p_batch_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  v_ip text;
  v_batch public.ss_client_error_batches%rowtype;
  v_state public.ss_client_error_fingerprints%rowtype;
  v_report record;
  v_known boolean;
  v_total integer;
  v_repeats bigint;
  v_id uuid;
  v_result jsonb := '[]'::jsonb;
begin
  select ip_hash into v_ip from public.ss_client_error_batches where id = p_batch_id;
  if not found then return v_result; end if;
  perform pg_advisory_xact_lock(hashtextextended('client-error-ip:' || v_ip, 0));
  select * into v_batch from public.ss_client_error_batches where id = p_batch_id for update;
  if v_batch.processed or v_now < v_batch.started_at + interval '1 minute' then return v_result; end if;
  update public.ss_client_error_batches set processed = true where id = p_batch_id;
  if v_batch.flooded then return v_result; end if;
  perform pg_advisory_xact_lock(hashtextextended('client-error-budget', 0));
  delete from public.ss_client_error_deliveries where reserved_at < v_now - interval '2 days';
  delete from public.ss_client_error_fingerprints
    where coalesce(last_alert_at, first_seen_at) < v_now - interval '7 days';
  select count(*) into v_total from public.ss_client_error_deliveries
    where reserved_at > v_now - interval '24 hours';
  for v_report in select * from public.ss_client_error_observations
    where batch_id = p_batch_id order by fingerprint loop
    select * into v_state from public.ss_client_error_fingerprints where fingerprint = v_report.fingerprint;
    v_known := found;
    if v_known and v_state.last_alert_at > v_now - interval '1 hour' then
      update public.ss_client_error_fingerprints set repeat_count = repeat_count + v_report.occurrences
        where fingerprint = v_report.fingerprint;
      continue;
    end if;
    if v_total >= 20 then
      insert into public.ss_client_error_fingerprints(fingerprint, repeat_count)
        values (v_report.fingerprint, v_report.occurrences)
        on conflict (fingerprint) do update
          set repeat_count = ss_client_error_fingerprints.repeat_count + v_report.occurrences;
      continue;
    end if;
    v_repeats := case when v_known then v_state.repeat_count else 0 end + v_report.occurrences - 1;
    insert into public.ss_client_error_fingerprints(fingerprint, last_alert_at, repeat_count)
      values (v_report.fingerprint, v_now, 0)
      on conflict (fingerprint) do update set last_alert_at = v_now, repeat_count = 0;
    insert into public.ss_client_error_deliveries(fingerprint, reserved_at)
      values (v_report.fingerprint, v_now) returning id into v_id;
    v_total := v_total + 1;
    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'reservationId', v_id, 'fingerprint', v_report.fingerprint,
      'repeatCount', v_repeats, 'diagnostic', v_report.diagnostic));
  end loop;
  delete from public.ss_client_error_observations where batch_id = p_batch_id;
  return v_result;
end;
$$;

revoke all on function public.ss_admit_client_error(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.ss_claim_client_error_batch(uuid) from public, anon, authenticated;
grant execute on function public.ss_admit_client_error(text, text, jsonb) to service_role;
grant execute on function public.ss_claim_client_error_batch(uuid) to service_role;
