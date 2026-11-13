-- Only the service-role v5 API can create or reconcile a customer request.
alter table public.trade_requests
  add column description_is_placeholder boolean not null default false,
  add column request_ip_hash text check (request_ip_hash ~ '^[a-f0-9]{64}$'),
  add column rep_alerted_at timestamptz;

create index trade_request_pending_ip on public.trade_requests(request_ip_hash)
  where status = 'pending' and request_ip_hash is not null;
-- A request can be removed by fixture teardown or an authorized data operation.
-- Keep the hourly counter independent of the lifetime of the request itself.
create table public.trade_request_hourly_admission (
  submission_id uuid primary key,
  listing_id uuid not null,
  request_ip_hash text not null check (request_ip_hash ~ '^[a-f0-9]{64}$'),
  admitted_at timestamptz not null default clock_timestamp()
);
create index trade_request_hourly_ip on public.trade_request_hourly_admission(request_ip_hash, admitted_at desc);
create index trade_request_admission_expiry on public.trade_request_hourly_admission(admitted_at);
alter table public.trade_request_hourly_admission enable row level security;
revoke all on public.trade_request_hourly_admission from public,anon,authenticated,service_role;
grant select on public.trade_request_hourly_admission to service_role;

-- Retain ticket identity even after the 7-day storage cleanup. Legacy submissions
-- use their consumed ticket while it exists, without changing historical rows.
create table public.trade_request_attempts (
  submission_id uuid primary key,
  listing_id uuid not null references public.trade_listings(id) on delete cascade,
  upload_id uuid,
  request_id uuid references public.trade_requests(id) on delete cascade,
  abandoned boolean not null,
  created_at timestamptz not null default now(),
  check ((request_id is null) = abandoned)
);
create table public.trade_request_photo_policy (
  singleton boolean primary key default true check (singleton),
  photo_optional_until timestamptz,
  generation bigint not null default 0,
  updated_by text not null default session_user,
  updated_at timestamptz not null default now()
);
insert into public.trade_request_photo_policy(singleton) values (true);
create table public.trade_photo_policy_history (
  generation bigint primary key,
  previous_until timestamptz,
  photo_optional_until timestamptz,
  actor text not null,
  changed_at timestamptz not null
);
-- SQL-only routing. No production recipient or secret is seeded by this migration.
create table public.trade_photo_policy_sink (
  singleton boolean primary key default true check (singleton),
  rep_id uuid not null references public.reps(id)
);
create table public.trade_photo_policy_deliveries (
  generation bigint not null references public.trade_photo_policy_history(generation),
  event text not null check (event in ('active', 'expired')),
  recipient_id uuid not null references public.reps(id),
  delivered_at timestamptz not null default now(),
  primary key(generation, event)
);

-- Persistent failure journal for the shared Smoke alias, policy and reviewer.
-- A crashed process leaves its owner in place; another run must not steal it.
create table public.trade_swap_review_window (
  singleton boolean primary key default true check(singleton),
  run_id uuid unique not null, owner text not null,
  previous_deployment text not null, prior_sha text not null, candidate_sha text not null,
  prior_policy_generation bigint not null, prior_policy_until timestamptz, prior_sink_id uuid,
  acquired_at timestamptz default clock_timestamp() not null
);
alter table public.trade_swap_review_window enable row level security;
revoke all on public.trade_swap_review_window from public,anon,authenticated,service_role;
grant select,insert,delete on public.trade_swap_review_window to service_role;

alter table public.trade_request_attempts enable row level security;
alter table public.trade_request_photo_policy enable row level security;
alter table public.trade_photo_policy_history enable row level security;
alter table public.trade_photo_policy_sink enable row level security;
alter table public.trade_photo_policy_deliveries enable row level security;
revoke all on public.trade_request_attempts, public.trade_request_photo_policy,
  public.trade_photo_policy_history, public.trade_photo_policy_sink, public.trade_photo_policy_deliveries
  from public, anon, authenticated, service_role;
grant select on public.trade_request_photo_policy, public.trade_photo_policy_history,
  public.trade_photo_policy_deliveries, public.trade_photo_policy_sink to service_role;
grant insert, update, delete on public.trade_photo_policy_sink to service_role;
grant select on public.trade_request_attempts to service_role;

create function public.swap_policy_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op <> 'UPDATE' or tg_table_name <> 'trade_request_photo_policy' then
    raise exception 'POLICY_AUDIT_IMMUTABLE';
  end if;
  if new.singleton is distinct from old.singleton or new.photo_optional_until > clock_timestamp() + interval '6 hours' then
    raise exception 'INVALID_PHOTO_POLICY';
  end if;
  new.generation := old.generation + 1;
  new.updated_at := clock_timestamp();
  new.updated_by := coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub',
    nullif(current_setting('role',true),'none'),session_user);
  return new;
end $$;
create trigger guard_swap_photo_policy before update or delete on public.trade_request_photo_policy
  for each row execute function public.swap_policy_guard();
create trigger preserve_swap_policy_history before update or delete on public.trade_photo_policy_history
  for each row execute function public.swap_policy_guard();

-- Caller already holds the policy singleton row lock. Mark delivery and write the
-- actual in-app message in one transaction: any failure leaves it retryable.
create function public.swap_deliver_policy_event(p_generation bigint,p_event text,p_rep_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_conversation uuid;
begin
  if p_rep_id is null or not exists (
    select 1 from public.trade_photo_policy_sink where singleton and rep_id=p_rep_id
  ) then raise exception 'PHOTO_POLICY_SINK_NOT_CONFIGURED'; end if;
  insert into public.trade_photo_policy_deliveries(generation,event,recipient_id)
    values(p_generation,p_event,p_rep_id) on conflict do nothing;
  if not found then return false; end if;
  select conversation_id into v_conversation from public.nic_nac_conversations
    where rep_id=p_rep_id and support_session_id is null and cleared_at is null order by created_at desc,id desc limit 1;
  insert into public.nic_nac_conversations(rep_id,conversation_id,message_id,role,parts,status)
  values(p_rep_id,coalesce(v_conversation,gen_random_uuid()),'swap-policy-'||p_generation||'-'||p_event,
    'assistant',jsonb_build_array(jsonb_build_object('type','text','text',
      case when p_event='active' then 'Dance Floor photo uploads are optional until ' ||
        (select photo_optional_until::text from public.trade_request_photo_policy where singleton) || '.'
      else 'The Dance Floor photo-optional window has expired. Photos are required again.' end)), 'complete');
  return true;
end $$;
create function public.swap_record_photo_policy() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.trade_photo_policy_history(generation,previous_until,photo_optional_until,actor,changed_at)
    values(new.generation,old.photo_optional_until,new.photo_optional_until,new.updated_by,new.updated_at);
  if new.photo_optional_until > clock_timestamp() then
    perform public.swap_deliver_policy_event(new.generation,'active',
      (select rep_id from public.trade_photo_policy_sink where singleton));
  end if;
  return new;
end $$;
create trigger record_swap_photo_policy after update on public.trade_request_photo_policy
  for each row execute function public.swap_record_photo_policy();

create function public.set_trade_request_photo_policy(p_enabled boolean,p_expected_generation bigint,
  p_duration interval default interval '2 hours',p_restore_until timestamptz default null)
returns public.trade_request_photo_policy language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.trade_request_photo_policy; v_until timestamptz;
begin
  if p_enabled is null or p_expected_generation is null then raise exception 'INVALID_PHOTO_POLICY'; end if;
  if p_enabled then
    if p_duration is null or p_duration <= interval '0' or p_duration > interval '6 hours' then raise exception 'INVALID_PHOTO_POLICY'; end if;
    v_until := coalesce(p_restore_until,clock_timestamp()+p_duration);
  elsif p_restore_until is not null and p_restore_until <= clock_timestamp() then
    v_until := p_restore_until;
  end if;
  update public.trade_request_photo_policy set photo_optional_until=v_until
    where singleton and generation=p_expected_generation returning * into v_row;
  if not found then raise exception 'PHOTO_POLICY_GENERATION_CONFLICT'; end if;
  return v_row;
end $$;
create function public.deliver_expired_trade_photo_policy(p_rep_id uuid,p_expected_generation bigint)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row public.trade_request_photo_policy;
begin
  select * into v_row from public.trade_request_photo_policy where singleton for update;
  if not found or v_row.generation is distinct from p_expected_generation
     or v_row.photo_optional_until is null or v_row.photo_optional_until > clock_timestamp()
     or not exists (select 1 from public.trade_photo_policy_deliveries where generation=v_row.generation
       and event='active' and recipient_id=p_rep_id) then return false; end if;
  return public.swap_deliver_policy_event(v_row.generation,'expired',p_rep_id);
end $$;

create function public.rpc_submit_trade_request_v5(
  p_listing_id uuid,p_customer_name text,p_customer_description text,p_submission_id uuid,
  p_receipt_token_hash text,p_offered_family text default null,p_offered_type public.jewelry_type default null,
  p_manual_review_requested boolean default false,p_upload_id uuid default null,p_request_ip_hash text default null,
  p_intent text default 'send',p_expected_rep_id uuid default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.trade_requests%rowtype;
  v_attempt public.trade_request_attempts%rowtype;
  v_ticket public.trade_request_upload_tickets%rowtype;
  v_description text := coalesce(nullif(btrim(p_customer_description),''),'See photo');
  v_placeholder boolean := nullif(btrim(p_customer_description),'') is null;
  v_original_upload uuid;
  v_until timestamptz;
  v_result json;
begin
  if p_submission_id is null or p_listing_id is null or nullif(btrim(p_customer_name),'') is null
    or length(btrim(p_customer_name)) > 100 or p_receipt_token_hash is null or p_receipt_token_hash !~ '^[a-f0-9]{64}$'
    or p_intent is null or p_intent not in ('send','recover','retry','abandon') then raise exception 'INVALID_TRADE_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text,2));
  if p_expected_rep_id is not null and not exists
    (select 1 from public.trade_listings where id=p_listing_id and rep_id=p_expected_rep_id)
  then raise exception 'LISTING_NOT_FOUND'; end if;
  select * into v_attempt from public.trade_request_attempts where submission_id=p_submission_id;
  if v_attempt.abandoned then
    if v_attempt.listing_id <> p_listing_id or v_attempt.upload_id is distinct from p_upload_id then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    if p_intent in ('abandon','recover') then return json_build_object('outcome','abandoned'); end if;
    raise exception 'TRADE_ATTEMPT_ABANDONED';
  end if;
  -- Missing policy is closed for new photo-less requests; photos and exact replay remain usable.
  begin
    select photo_optional_until into v_until from public.trade_request_photo_policy where singleton for share;
  exception when undefined_table or insufficient_privilege then
    v_until := null;
  end;
  select * into v_row from public.trade_requests where submission_id=p_submission_id;
  if found then
    if v_attempt.request_id is not null then
      v_original_upload := v_attempt.upload_id;
    else
      select id into v_original_upload from public.trade_request_upload_tickets where consumed_request_id=v_row.id;
      if v_original_upload is null and v_row.reveal_screenshot_uploaded_at is not null then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    end if;
    if v_row.listing_id <> p_listing_id or v_row.customer_name <> btrim(p_customer_name)
      or v_row.customer_description <> v_description or v_row.description_is_placeholder <> v_placeholder
      or v_row.receipt_token_hash is distinct from p_receipt_token_hash
      or v_row.offered_family is distinct from nullif(btrim(p_offered_family),'')
      or v_row.offered_type is distinct from p_offered_type
      or v_row.manual_review_requested is distinct from coalesce(p_manual_review_requested,false)
      or v_original_upload is distinct from p_upload_id then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return json_build_object('request_id',v_row.id,'listing_id',v_row.listing_id,'mutation_replayed',true);
  end if;
  if p_intent='recover' then return json_build_object('outcome','absent'); end if;
  if p_intent='abandon' then
    insert into public.trade_request_attempts(submission_id,listing_id,upload_id,abandoned)
      values(p_submission_id,p_listing_id,p_upload_id,true);
    return json_build_object('outcome','abandoned');
  end if;
  if p_request_ip_hash is null or p_request_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'TRADE_REQUEST_IP_UNAVAILABLE'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_ip_hash,5));
  if p_upload_id is null and (v_until is null or v_until <= clock_timestamp()) then raise exception 'PHOTO_REQUIRED'; end if;
  if (select count(*) from public.trade_requests where request_ip_hash=p_request_ip_hash and status='pending') >= 3
    then raise exception 'TRADE_REQUEST_PENDING_LIMIT'; end if;
  if (select count(*) from public.trade_request_hourly_admission where request_ip_hash=p_request_ip_hash and admitted_at > clock_timestamp()-interval '1 hour') >= 10
    then raise exception 'TRADE_REQUEST_HOURLY_LIMIT'; end if;
  if p_upload_id is not null then
    select * into v_ticket from public.trade_request_upload_tickets where id=p_upload_id for update;
    if not found then raise exception 'TRADE_UPLOAD_NOT_FOUND'; end if;
    if v_ticket.listing_id <> p_listing_id or v_ticket.submission_id <> p_submission_id then raise exception 'TRADE_UPLOAD_SCOPE_MISMATCH'; end if;
    if v_ticket.consumed_request_id is not null then raise exception 'TRADE_UPLOAD_ALREADY_USED'; end if;
    if v_ticket.discarded_at is not null or v_ticket.created_at <= clock_timestamp()-interval '2 hours' then raise exception 'TRADE_UPLOAD_EXPIRED'; end if;
    if v_ticket.ready_at is null or (v_ticket.rendition_version=2 and v_ticket.thumb_path is null) then raise exception 'TRADE_UPLOAD_NOT_READY'; end if;
  end if;
  v_result := public.rpc_submit_trade_request_v4(p_listing_id,btrim(p_customer_name),v_description,
    p_submission_id,p_receipt_token_hash,p_offered_family,p_offered_type,p_manual_review_requested,p_upload_id);
  update public.trade_requests set request_ip_hash=p_request_ip_hash,description_is_placeholder=v_placeholder,
    reveal_screenshot_thumb_path=v_ticket.thumb_path where id=(v_result->>'request_id')::uuid;
  insert into public.trade_request_attempts(submission_id,listing_id,upload_id,request_id,abandoned)
    values(p_submission_id,p_listing_id,p_upload_id,(v_result->>'request_id')::uuid,false);
  insert into public.trade_request_hourly_admission(submission_id,listing_id,request_ip_hash)
    values(p_submission_id,p_listing_id,p_request_ip_hash);
  -- Restrict opportunistic pruning to the current listing. A Smoke admission
  -- cannot clean another reviewer's rows even when both used the same Wi-Fi.
  delete from public.trade_request_hourly_admission where submission_id in (
    select a.submission_id from public.trade_request_hourly_admission a
      where a.admitted_at <= clock_timestamp()-interval '1 hour' and a.listing_id=p_listing_id
      order by a.admitted_at limit 20 for update skip locked
  );
  return v_result;
end $$;

create function public.prune_swap_request_admission(p_run uuid,p_limit integer)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_limit is null or p_limit not between 1 and 1000 then raise exception 'INVALID_CLEANUP_LIMIT'; end if;
  delete from public.trade_request_hourly_admission where submission_id in (
    select a.submission_id from public.trade_request_hourly_admission a
      where a.admitted_at <= clock_timestamp()-interval '1 hour' and
        (p_run is null or exists(select 1 from public.trade_swap_review_listings r
          where r.listing_id=a.listing_id and r.run_id=p_run))
      order by a.admitted_at limit p_limit for update of a skip locked
  );
end $$;

create function public.rpc_notify_swap_request(p_request_id uuid,p_rep_id uuid,p_parts jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_request public.trade_requests%rowtype; v_conversation uuid; v_key text := 'trade-request-'||p_request_id;
begin
  select r.* into v_request from public.trade_requests r join public.trade_listings l on l.id=r.listing_id
    where r.id=p_request_id and l.rep_id=p_rep_id for update of r;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.rep_alerted_at is not null then return false; end if;
  if not exists(select 1 from public.nic_nac_conversations where rep_id=p_rep_id and message_id=v_key and role='assistant') then
    select conversation_id into v_conversation from public.nic_nac_conversations where rep_id=p_rep_id and support_session_id is null and cleared_at is null
      order by created_at desc,id desc limit 1;
    insert into public.nic_nac_conversations(rep_id,conversation_id,message_id,role,parts,status)
      values(p_rep_id,coalesce(v_conversation,gen_random_uuid()),v_key,'assistant',p_parts,'complete');
  end if;
  update public.trade_requests set rep_alerted_at=clock_timestamp() where id=p_request_id;
  return true;
end $$;

revoke all on function public.swap_policy_guard(), public.swap_record_photo_policy(),
  public.swap_deliver_policy_event(bigint,text,uuid), public.set_trade_request_photo_policy(boolean,bigint,interval,timestamptz),
  public.prune_swap_request_admission(uuid,integer),
  public.deliver_expired_trade_photo_policy(uuid,bigint),public.rpc_notify_swap_request(uuid,uuid,jsonb),
  public.rpc_submit_trade_request_v5(uuid,text,text,uuid,text,text,public.jewelry_type,boolean,uuid,text,text,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.set_trade_request_photo_policy(boolean,bigint,interval,timestamptz),
  public.prune_swap_request_admission(uuid,integer),
  public.deliver_expired_trade_photo_policy(uuid,bigint),public.rpc_notify_swap_request(uuid,uuid,jsonb),
  public.rpc_submit_trade_request_v5(uuid,text,text,uuid,text,text,public.jewelry_type,boolean,uuid,text,text,uuid)
  to service_role;

-- Table grants override column grants. Replace them and project only rep-safe
-- columns in the publication. The original owning-rep RLS policies still apply.
revoke all on public.trade_requests from public,anon,authenticated;
alter table public.trade_requests replica identity default;
do $$
declare v_columns text;
begin
  select string_agg(quote_ident(attname),', ' order by attnum) into v_columns
    from pg_attribute where attrelid='public.trade_requests'::regclass and attnum>0 and not attisdropped
      and attname not in ('submission_id','receipt_token_hash','request_ip_hash','rep_alerted_at');
  execute format('grant select (%s) on public.trade_requests to authenticated',v_columns);
  grant update (status,rep_notes,rejection_reason,updated_at) on public.trade_requests to authenticated;
  if exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trade_requests') then
    alter publication supabase_realtime drop table public.trade_requests;
    execute format('alter publication supabase_realtime add table public.trade_requests (%s)',v_columns);
  end if;
end $$;

-- Invoker permissions and request RLS apply before ranking. Filtering the view
-- by its output id preserves the position across page and fresh-dialog reads.
create view public.swap_pending_request_positions with (security_invoker=true) as
select id, listing_id,
       row_number() over (partition by listing_id order by created_at, id) as position
from public.trade_requests
where status='pending';
revoke all on public.swap_pending_request_positions from public,anon,authenticated;
grant select on public.swap_pending_request_positions to authenticated,service_role;
