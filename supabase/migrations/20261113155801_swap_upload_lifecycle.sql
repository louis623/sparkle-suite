-- Accounting survives deletion of tickets/listings and the old writer's cleanup.
alter table public.trade_request_upload_tickets
  add column rendition_version smallint not null default 1 check (rendition_version in (1,2)),
  add column thumb_path text,
  add column discarded_at timestamptz,
  add column signed_until timestamptz not null default (now() + interval '2 hours 10 minutes');
alter table public.trade_requests add column reveal_screenshot_thumb_path text;
grant select (reveal_screenshot_thumb_path) on public.trade_requests to authenticated;
drop policy if exists trade_request_screenshots_rep_read on storage.objects;
create index trade_upload_tickets_submission on public.trade_request_upload_tickets(submission_id,created_at);

create table public.trade_swap_review_listings (
  listing_id uuid primary key, run_id uuid not null, rep_id uuid not null
);
create table public.trade_upload_ledger (
  id uuid primary key, listing_id uuid not null, rep_id uuid not null, submission_id uuid not null,
  ip_hash text not null, issued_at timestamptz not null, signed_until timestamptz not null,
  raw_path text not null, measured_bytes integer, consumed boolean not null default false,
  discarded boolean not null default false, raw_final boolean not null default false,
  next_sweep timestamptz not null, lease_id uuid, lease_until timestamptz
);
alter table public.trade_upload_ledger enable row level security;
alter table public.trade_swap_review_listings enable row level security;
revoke all on public.trade_upload_ledger,public.trade_swap_review_listings from public, anon, authenticated;
grant select,insert,update,delete on public.trade_swap_review_listings,public.trade_upload_ledger to service_role;
create index trade_upload_ledger_ip on public.trade_upload_ledger(ip_hash,issued_at);
create index trade_upload_ledger_submission on public.trade_upload_ledger(submission_id,issued_at);
create index trade_upload_ledger_sweep on public.trade_upload_ledger(next_sweep) where not raw_final;
create index trade_swap_review_run on public.trade_swap_review_listings(run_id,listing_id);

create function public.trade_upload_account() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.trade_upload_ledger as l
    (id,listing_id,rep_id,submission_id,ip_hash,issued_at,signed_until,raw_path,consumed,discarded,next_sweep)
  values (new.id,new.listing_id,new.rep_id,new.submission_id,new.request_ip_hash,new.created_at,new.signed_until,
    new.raw_path,new.consumed_at is not null,new.discarded_at is not null,
    case when new.discarded_at is not null then now() else new.signed_until end)
  on conflict (id) do update set
    consumed = l.consumed or excluded.consumed, discarded = l.discarded or excluded.discarded,
    signed_until = greatest(l.signed_until,excluded.signed_until),
    next_sweep = case when excluded.discarded and not l.discarded then now() else l.next_sweep end,
    measured_bytes = case when new.ready_at is not null then new.declared_size_bytes else l.measured_bytes end;
  return new;
end $$;
revoke all on function public.trade_upload_account() from public, anon, authenticated;
create trigger trade_upload_account after insert or update of signed_until,ready_at,consumed_at,discarded_at
on public.trade_request_upload_tickets for each row execute function public.trade_upload_account();
insert into public.trade_upload_ledger(id,listing_id,rep_id,submission_id,ip_hash,issued_at,signed_until,
  raw_path,measured_bytes,consumed,next_sweep)
select id,listing_id,rep_id,submission_id,request_ip_hash,created_at,signed_until,raw_path,
  case when ready_at is not null then declared_size_bytes end,consumed_at is not null,signed_until
from public.trade_request_upload_tickets;

create function public.admit_swap_upload(p_id uuid,p_listing_id uuid,p_submission_id uuid,p_expected_rep uuid,
  p_ip_hash text,p_content_type text,p_size integer) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare
  v_rep uuid; v_raw text; v_created timestamptz; v_active int; v_total int; v_count int;
  v_bytes bigint; v_retry int; v_code text; v_now timestamptz := clock_timestamp();
begin
  if p_ip_hash is null or p_ip_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_IP_HASH'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text,2));
  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash,5));
  select rep_id into v_rep from public.trade_listings where id=p_listing_id and status='available'
    and quantity_available>0 and (p_expected_rep is null or rep_id=p_expected_rep);
  if not found then raise exception 'TRADE_UPLOAD_LISTING_UNAVAILABLE'; end if;
  select count(*),count(*) filter (where not consumed and not discarded)
    into v_total,v_active from public.trade_upload_ledger where ip_hash=p_ip_hash and issued_at>v_now-interval '1 hour';
  select count(*) into v_count from public.trade_upload_ledger where submission_id=p_submission_id and issued_at>v_now-interval '1 hour';
  -- Rolling daily budget: measured confirmed bytes after the final raw sweep, otherwise full raw capacity.
  select coalesce(sum(case when raw_final and measured_bytes is not null then measured_bytes else 26214400 end),0)
    into v_bytes from public.trade_upload_ledger where ip_hash=p_ip_hash and (issued_at>v_now-interval '24 hours' or not raw_final);
  if v_count>=8 then v_code:='TRADE_UPLOAD_SUBMISSION_LIMIT';
  elsif v_total>=200 then v_code:='TRADE_UPLOAD_TOTAL_LIMIT';
  elsif v_active>=40 then v_code:='TRADE_UPLOAD_PENDING_LIMIT';
  elsif v_bytes+26214400>2147483648 then v_code:='TRADE_UPLOAD_BYTE_LIMIT'; end if;
  if v_code is not null then
    if v_code='TRADE_UPLOAD_BYTE_LIMIT' then v_retry:=900;
    else
      select greatest(1,ceil(extract(epoch from (min(issued_at)+interval '1 hour'-v_now)))::int)
      into v_retry from public.trade_upload_ledger where issued_at>v_now-interval '1 hour' and
        case when v_code='TRADE_UPLOAD_SUBMISSION_LIMIT' then submission_id=p_submission_id
          else ip_hash=p_ip_hash and (v_code<>'TRADE_UPLOAD_PENDING_LIMIT' or (not consumed and not discarded)) end;
    end if;
    return jsonb_build_object('code',v_code,'retry_after',v_retry);
  end if;
  v_raw:='staging/'||v_rep||'/'||p_id||'.'||(case when p_content_type='image/jpeg' then 'jpg' else split_part(p_content_type,'/',2) end);
  insert into public.trade_request_upload_tickets(id,listing_id,rep_id,submission_id,request_ip_hash,raw_path,
    declared_content_type,declared_size_bytes,rendition_version) values(p_id,p_listing_id,v_rep,p_submission_id,p_ip_hash,
    v_raw,p_content_type,p_size,2) returning created_at into v_created;
  return jsonb_build_object('raw_path',v_raw,'created_at',v_created);
end $$;

create function public.discard_swap_upload(p_id uuid,p_listing_id uuid,p_submission_id uuid,p_expected_rep uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare t public.trade_request_upload_tickets%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text,2));
  select * into t from public.trade_request_upload_tickets where id=p_id and listing_id=p_listing_id
    and submission_id=p_submission_id and (p_expected_rep is null or rep_id=p_expected_rep) for update;
  if not found then raise exception 'TRADE_UPLOAD_NOT_FOUND'; end if;
  if t.consumed_at is not null then raise exception 'TRADE_UPLOAD_ALREADY_USED'; end if;
  update public.trade_request_upload_tickets set discarded_at=coalesce(discarded_at,now()),
    ready_at=null,ready_path=null,ready_size_bytes=null,thumb_path=null where id=t.id;
  return jsonb_build_object('id',t.id,'rep_id',t.rep_id,'raw_path',t.raw_path);
end $$;

-- Claim before object removal. Serialize with consume/discard via the ticket row.
-- A crashed worker loses its short lease. A worker can acknowledge only its own claim.
create function public.claim_swap_upload_sweep(p_run uuid,p_lease uuid,p_limit int)
returns setof public.trade_upload_ledger language plpgsql security invoker set search_path=public,pg_temp as $$
declare row_id uuid; t public.trade_request_upload_tickets%rowtype;
begin
  for row_id in select l.id from public.trade_upload_ledger l where not l.raw_final and l.next_sweep<=now()
    and (l.lease_until is null or l.lease_until<=now()) and (p_run is null or exists(
      select 1 from public.trade_swap_review_listings r where r.run_id=p_run and r.listing_id=l.listing_id and r.rep_id=l.rep_id))
    order by l.next_sweep,l.id limit least(greatest(p_limit,1),50)
  loop
    select * into t from public.trade_request_upload_tickets where id=row_id for update skip locked;
    if not found and exists(select 1 from public.trade_request_upload_tickets where id=row_id) then continue; end if;
    if t.id is not null and t.consumed_at is null and t.discarded_at is null then
      if t.created_at > now()-interval '2 hours' then continue; end if;
      update public.trade_request_upload_tickets set discarded_at=now(),ready_at=null,ready_size_bytes=null,
        ready_path=null,thumb_path=null where id=row_id;
    end if;
    return query update public.trade_upload_ledger set lease_id=p_lease,lease_until=now()+interval '2 minutes'
      where id=row_id and not raw_final and (lease_until is null or lease_until<=now()) returning *;
  end loop;
end $$;

create function public.finish_swap_upload_sweep(p_id uuid,p_lease uuid) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  update public.trade_upload_ledger set raw_final=now()>=signed_until+interval '2 minutes',
    next_sweep=greatest(now()+interval '1 minute',signed_until+interval '2 minutes'),
    lease_id=null,lease_until=null where id=p_id and lease_id=p_lease;
end $$;
create function public.prune_swap_upload_ledger(p_run uuid,p_limit int) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
declare t_id uuid;
begin
  for t_id in select l.id from public.trade_upload_ledger l where l.raw_final
    and l.issued_at<now()-interval '24 hours' and (not l.consumed or l.issued_at<now()-interval '8 days')
    and (p_run is null or exists(select 1 from public.trade_swap_review_listings r where r.listing_id=l.listing_id and r.rep_id=l.rep_id and r.run_id=p_run))
    order by l.issued_at limit least(greatest(p_limit,1),50) for update skip locked
  loop
    delete from public.trade_request_upload_tickets where id=t_id;
    delete from public.trade_upload_ledger where id=t_id;
  end loop;
  perform public.prune_swap_request_admission(p_run,p_limit);
end $$;
create function public.swap_staged_bytes_high(p_run uuid) returns boolean language sql stable security invoker
set search_path=public,pg_temp as $$
 select count(*) * 26214400::bigint >= 10737418240::bigint from public.trade_upload_ledger l
 where not l.consumed and not l.raw_final and (p_run is null or exists(select 1 from public.trade_swap_review_listings r
 where r.run_id=p_run and r.rep_id=l.rep_id and r.listing_id=l.listing_id))
$$;
revoke all on function public.admit_swap_upload(uuid,uuid,uuid,uuid,text,text,integer),
 public.discard_swap_upload(uuid,uuid,uuid,uuid),public.claim_swap_upload_sweep(uuid,uuid,integer),
 public.finish_swap_upload_sweep(uuid,uuid),public.prune_swap_upload_ledger(uuid,integer),public.swap_staged_bytes_high(uuid)
 from public,anon,authenticated;
grant execute on function public.admit_swap_upload(uuid,uuid,uuid,uuid,text,text,integer),
 public.discard_swap_upload(uuid,uuid,uuid,uuid),public.claim_swap_upload_sweep(uuid,uuid,integer),
 public.finish_swap_upload_sweep(uuid,uuid),public.prune_swap_upload_ledger(uuid,integer),public.swap_staged_bytes_high(uuid)
 to service_role;

-- Older cleanup could lose the ticket before discovering the final JPEG. Inspect
-- only immutable generated names. In Smoke even an orphan needs attributable ledger evidence.
create function public.find_swap_orphan_images(p_run uuid,p_limit integer) returns table(object_path text)
language sql stable security invoker set search_path=public,pg_temp as $$
 select o.name from storage.objects o
 where o.bucket_id='trade-request-screenshots' and o.created_at < now()-interval '2 hours 10 minutes'
 and o.name ~ '^[0-9a-f-]{36}/trade-request-uploads/[0-9a-f-]{36}(\.800)?\.jpg$'
 and not exists(select 1 from public.trade_request_upload_tickets t
   where t.rep_id::text=split_part(o.name,'/',1) and t.id::text=split_part(split_part(o.name,'/',3),'.',1)
     and t.discarded_at is null)
 and not exists(select 1 from public.trade_requests q where q.reveal_screenshot_path=o.name or q.reveal_screenshot_thumb_path=o.name)
 and (p_run is null or exists(select 1 from public.trade_upload_ledger l join public.trade_swap_review_listings r
   on r.listing_id=l.listing_id and r.rep_id=l.rep_id
   where r.run_id=p_run and l.rep_id::text=split_part(o.name,'/',1) and l.id::text=split_part(split_part(o.name,'/',3),'.',1)))
 order by o.created_at,o.name limit least(greatest(p_limit,1),50)
$$;
revoke all on function public.find_swap_orphan_images(uuid,integer) from public,anon,authenticated;
grant execute on function public.find_swap_orphan_images(uuid,integer) to service_role;
