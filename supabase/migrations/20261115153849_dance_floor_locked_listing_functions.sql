-- Phase 2, forward-only. Existing customer RPCs/grants are deliberately untouched.
create table public.trade_listing_edit_revisions (
  listing_id uuid primary key references public.trade_listings(id) on delete cascade,
  rep_id uuid not null references public.reps(id) on delete cascade,
  revision int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.trade_listing_edit_revisions enable row level security;
revoke all on table public.trade_listing_edit_revisions from public, anon, authenticated;
grant select, insert, update on table public.trade_listing_edit_revisions to service_role;

-- One counted-before-work record binds the reservation to the exact immutable path.
-- Abandoned reservations consume capacity; retries never authorize a second pipeline.
create table public.trade_listing_photo_attempts (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  listing_id uuid not null references public.trade_listings(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index trade_listing_photo_attempts_rep_time on public.trade_listing_photo_attempts(rep_id, created_at);
create index trade_listing_photo_attempts_listing_time on public.trade_listing_photo_attempts(listing_id, created_at);
alter table public.trade_listing_photo_attempts enable row level security;
revoke all on table public.trade_listing_photo_attempts from public, anon, authenticated;
grant select, insert, update on table public.trade_listing_photo_attempts to service_role;

create function public.rpc_remove_trade_listing_v1(p_rep_id uuid, p_listing_id uuid, p_reason text default 'other')
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.trade_listings%rowtype; ids uuid[]; stamp timestamptz := now();
begin
  if p_reason is null or p_reason not in ('sold','keeping','mistake','other') then raise exception 'INVALID_REASON'; end if;
  select * into l from public.trade_listings where id=p_listing_id and rep_id=p_rep_id for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if l.status='removed' then return jsonb_build_object('listing_id',l.id,'previous_status',l.status,'previous_quantity',l.quantity_available,'cancelled_request_ids','[]'::jsonb,'cancelled_count',0,'deleted_at',l.deleted_at,'already_removed',true); end if;
  if l.status is null or l.status not in ('available','pending_trade') then raise exception 'LISTING_NOT_ACTIVE'; end if;
  perform id from public.trade_requests where listing_id=l.id order by id for update;
  if exists(select 1 from public.trade_fulfillment f join public.trade_requests r on r.id=f.request_id where r.listing_id=l.id and f.fulfillment_status is distinct from 'completed') then raise exception 'OPEN_SWAP'; end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into ids from public.trade_requests where listing_id=l.id and status='pending';
  update public.trade_requests set status='cancelled',updated_at=stamp where id=any(ids);
  update public.trade_listings set status='removed',removal_reason=p_reason::public.removal_reason,deleted_at=stamp,updated_at=stamp where id=l.id;
  return jsonb_build_object('listing_id',l.id,'previous_status',l.status,'previous_quantity',l.quantity_available,'cancelled_request_ids',ids,'cancelled_count',cardinality(ids),'deleted_at',stamp,'already_removed',false);
end; $$;

create function public.rpc_set_trade_listing_quantity_v1(p_rep_id uuid,p_listing_id uuid,p_quantity integer,p_expected_quantity integer default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.trade_listings%rowtype; pending integer; rev integer; next_status public.listing_status;
begin
  select * into l from public.trade_listings where id=p_listing_id and rep_id=p_rep_id for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if l.status is null or l.status not in ('available','pending_trade') then raise exception 'LISTING_NOT_ACTIVE'; end if;
  if p_quantity is null or p_quantity<1 or p_quantity>greatest(99,l.quantity_available) then raise exception 'QUANTITY_OUT_OF_RANGE'; end if;
  perform id from public.trade_requests where listing_id=l.id order by id for update;
  select count(*) into pending from public.trade_requests where listing_id=l.id and status='pending';
  select revision into rev from public.trade_listing_edit_revisions where listing_id=l.id;
  if l.quantity_available=p_quantity then return jsonb_build_object('listing_id',l.id,'status',l.status,'quantity_available',l.quantity_available,'pending_count',pending,'edit_revision',coalesce(rev,0)); end if;
  if p_expected_quantity is not null and p_expected_quantity<>l.quantity_available then raise exception 'QUANTITY_CHANGED'; end if;
  if p_quantity<pending then raise exception 'BELOW_PENDING'; end if;
  next_status := case when pending>=p_quantity then 'pending_trade'::public.listing_status else 'available'::public.listing_status end;
  update public.trade_listings set quantity_available=p_quantity,status=next_status,updated_at=now() where id=l.id;
  insert into public.trade_listing_edit_revisions(listing_id,rep_id,revision) values(l.id,p_rep_id,1)
    on conflict(listing_id) do update set revision=trade_listing_edit_revisions.revision+1,updated_at=now() returning revision into rev;
  return jsonb_build_object('listing_id',l.id,'status',next_status,'quantity_available',p_quantity,'pending_count',pending,'edit_revision',rev);
end; $$;

create function public.rpc_adjust_trade_listing_quantity_v1(p_rep_id uuid,p_listing_id uuid,p_delta integer,p_floor integer default 1,p_record_edit boolean default true)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.trade_listings%rowtype; pending integer; rev integer; quantity bigint; next_status public.listing_status;
begin
  select * into l from public.trade_listings where id=p_listing_id and rep_id=p_rep_id for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if l.status is null or l.status not in ('available','pending_trade') then raise exception 'LISTING_NOT_ACTIVE'; end if;
  perform id from public.trade_requests where listing_id=l.id order by id for update;
  select count(*) into pending from public.trade_requests where listing_id=l.id and status='pending';
  quantity := l.quantity_available::bigint+p_delta;
  if quantity is null or quantity<greatest(p_floor,pending,1) then raise exception 'BELOW_FLOOR'; end if;
  if quantity>greatest(99,l.quantity_available) then raise exception 'QUANTITY_OUT_OF_RANGE'; end if;
  next_status := case when pending>=quantity then 'pending_trade'::public.listing_status else 'available'::public.listing_status end;
  if quantity<>l.quantity_available then
    update public.trade_listings set quantity_available=quantity,status=next_status,updated_at=now() where id=l.id;
    if coalesce(p_record_edit,true) then
      insert into public.trade_listing_edit_revisions(listing_id,rep_id,revision) values(l.id,p_rep_id,1)
        on conflict(listing_id) do update set revision=trade_listing_edit_revisions.revision+1,updated_at=now();
    end if;
  end if;
  select revision into rev from public.trade_listing_edit_revisions where listing_id=l.id;
  return jsonb_build_object('listing_id',l.id,'status',next_status,'quantity_available',quantity,'pending_count',pending,'edit_revision',coalesce(rev,0));
end; $$;

-- Normalized manual identity includes every piece detail, immutable image identity and both notes.
create function public.dance_floor_manual_identity_v1(p_rep_id uuid,p_row jsonb)
returns text language plpgsql immutable security definer set search_path = public, pg_temp as $$
begin
 return md5(jsonb_build_array(p_rep_id,
 lower(regexp_replace(btrim(coalesce(p_row->>'manual_type_prefix','')),'\s+',' ','g')),
 lower(regexp_replace(btrim(coalesce(p_row->>'manual_collection_family','')),'\s+',' ','g')),
 lower(regexp_replace(btrim(coalesce(p_row->>'manual_collection_name','')),'\s+',' ','g')),
 lower(regexp_replace(btrim(coalesce(p_row->>'manual_size','')),'\s+',' ','g')),
 coalesce(p_row->>'rarity_classification','standard'),
 btrim(coalesce(p_row->>'manual_photo_url','')),
 regexp_replace(btrim(coalesce(p_row->>'rep_notes','')),'\s+',' ','g'),
 regexp_replace(btrim(coalesce(p_row->>'trade_preferences','')),'\s+',' ','g'))::text);
end; $$;

create function public.rpc_restore_trade_listing_v1(p_rep_id uuid,p_listing_id uuid,p_recovery_days integer)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.trade_listings%rowtype; initial public.trade_listings%rowtype; group_key text; pending integer; quantity integer; next_status public.listing_status; failed_constraint text; rev integer;
begin
 select * into initial from public.trade_listings where id=p_listing_id and rep_id=p_rep_id;
 if not found then raise exception 'LISTING_NOT_FOUND'; end if;
 if initial.listing_source='catalog' then
   group_key := public.trade_listing_catalog_group_digest(p_rep_id,initial.design_id,initial.ring_size,initial.listing_photo_url,initial.uses_canonical_photo,initial.rep_notes,initial.trade_preferences);
   perform pg_advisory_xact_lock(hashtextextended(group_key||':'||initial.rarity_classification,0));
 else
   group_key := public.dance_floor_manual_identity_v1(p_rep_id,to_jsonb(initial));
   perform pg_advisory_xact_lock(hashtextextended('manual:'||group_key,0));
 end if;
 select * into l from public.trade_listings where id=p_listing_id and rep_id=p_rep_id for update;
 if not found then raise exception 'LISTING_NOT_FOUND'; end if;
 if l.listing_source is distinct from initial.listing_source then raise exception 'QUANTITY_CHANGED'; end if;
 if l.listing_source='catalog' then
   if public.trade_listing_catalog_group_digest(p_rep_id,l.design_id,l.ring_size,l.listing_photo_url,l.uses_canonical_photo,l.rep_notes,l.trade_preferences) is distinct from group_key or l.rarity_classification is distinct from initial.rarity_classification then raise exception 'QUANTITY_CHANGED'; end if;
 else
   if public.dance_floor_manual_identity_v1(p_rep_id,to_jsonb(l)) is distinct from group_key then raise exception 'QUANTITY_CHANGED'; end if;
 end if;
 if l.status is distinct from 'removed' then raise exception 'LISTING_NOT_ACTIVE'; end if;
 if p_recovery_days not in (7,30) or p_recovery_days is null or l.deleted_at is null or l.deleted_at<now()-make_interval(days=>p_recovery_days) then raise exception 'RECOVERY_EXPIRED'; end if;
 if exists(select 1 from public.trade_listings x where x.rep_id=p_rep_id and x.id<>l.id and x.status in ('available','pending_trade') and x.listing_source=l.listing_source and
   case when l.listing_source='catalog' then public.trade_listing_catalog_group_digest(p_rep_id,x.design_id,x.ring_size,x.listing_photo_url,x.uses_canonical_photo,x.rep_notes,x.trade_preferences)=group_key
   else public.dance_floor_manual_identity_v1(p_rep_id,to_jsonb(x))=group_key end) then raise exception 'DUPLICATE_ACTIVE_LISTING'; end if;
 perform id from public.trade_requests where listing_id=l.id order by id for update;
 select count(*) into pending from public.trade_requests where listing_id=l.id and status='pending';
 quantity := greatest(l.quantity_available,1);
 next_status := case when pending>=quantity then 'pending_trade'::public.listing_status else 'available'::public.listing_status end;
 update public.trade_listings set quantity_available=quantity,status=next_status,removal_reason=null,deleted_at=null,updated_at=now() where id=l.id;
 if quantity is distinct from l.quantity_available then
   insert into public.trade_listing_edit_revisions(listing_id,rep_id,revision) values(l.id,p_rep_id,1)
     on conflict(listing_id) do update set revision=trade_listing_edit_revisions.revision+1,updated_at=now();
 end if;
 select revision into rev from public.trade_listing_edit_revisions where listing_id=l.id;
 return jsonb_build_object('listing_id',l.id,'status',next_status,'quantity_available',quantity,'pending_count',pending,'edit_revision',coalesce(rev,0));
exception when unique_violation then
 get stacked diagnostics failed_constraint=constraint_name;
 if failed_constraint='idx_trade_listings_active_catalog_group_unique' then raise exception 'DUPLICATE_ACTIVE_LISTING'; end if;
 raise;
end; $$;
create or replace function public.rpc_approve_trade_v2(
  p_request_id uuid,
  p_rep_id uuid,
  p_verified_family text,
  p_verified_type public.jewelry_type,
  p_verification_confirmed boolean,
  p_final_confirmation boolean,
  p_rep_notes text default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_request public.trade_requests%rowtype;
  v_listing public.trade_listings%rowtype;
  v_requested_family text;
  v_requested_type public.jewelry_type;
  v_fulfillment_id uuid;
  v_remaining_quantity integer;
  v_other_pending_count integer;
  v_next_status public.listing_status;
begin
  if p_rep_id is null or not coalesce(p_verification_confirmed, false)
     or not coalesce(p_final_confirmation, false)
     or public.trade_canonical_family_v1(p_verified_family) is null
     or p_verified_type is null then
    raise exception 'VERIFICATION_REQUIRED';
  end if;
  select * into v_request from public.trade_requests where id = p_request_id;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  select * into v_listing from public.trade_listings where id = v_request.listing_id for update;
  if not found or v_listing.rep_id <> p_rep_id then raise exception 'UNAUTHORIZED_TRADE'; end if;
  perform id from public.trade_requests where listing_id = v_listing.id order by id for update;
  select * into v_request from public.trade_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.listing_id is distinct from v_listing.id or v_request.status <> 'pending' then raise exception 'REQUEST_NOT_PENDING'; end if;
  if v_listing.status not in ('available','pending_trade') or v_listing.quantity_available < 1 then raise exception 'LISTING_NOT_FOUND'; end if;
  select coalesce(l.manual_collection_family, c.name),
         coalesce(l.manual_type_prefix::public.jewelry_type, d.type_prefix)
    into v_requested_family, v_requested_type
  from public.trade_listings l
  left join public.jewelry_designs d on d.id = l.design_id
  left join public.collections c on c.id = d.collection_id
  where l.id = v_listing.id;
  if public.trade_canonical_family_v1(v_requested_family) is null or v_requested_type is null then
    raise exception 'REQUESTED_ITEM_UNVERIFIED';
  end if;
  if public.trade_canonical_family_v1(p_verified_family) <> public.trade_canonical_family_v1(v_requested_family) then
    raise exception 'TRADE_FAMILY_MISMATCH';
  end if;
  if p_verified_type <> v_requested_type then raise exception 'TRADE_TYPE_MISMATCH'; end if;

  update public.trade_requests set
    status = 'approved', rep_notes = p_rep_notes,
    verified_offered_family = public.trade_canonical_family_v1(p_verified_family),
    verified_offered_type = p_verified_type,
    verification_version = 1,
    verified_by_rep_id = p_rep_id,
    verified_at = now(), updated_at = now()
  where id = p_request_id;
  v_remaining_quantity := v_listing.quantity_available - 1;
  select count(*) into v_other_pending_count from public.trade_requests
    where listing_id = v_listing.id and status = 'pending';
  v_next_status := case
    when v_remaining_quantity <= 0 then 'traded'::public.listing_status
    when v_other_pending_count >= v_remaining_quantity then 'pending_trade'::public.listing_status
    else 'available'::public.listing_status end;
  update public.trade_listings set quantity_available = v_remaining_quantity,
    status = v_next_status, updated_at = now() where id = v_listing.id;
  if v_remaining_quantity <= 0 then
    update public.trade_requests set status = 'cancelled', updated_at = now()
      where listing_id = v_listing.id and status = 'pending';
  end if;
  insert into public.trade_fulfillment (request_id, fulfillment_status)
    values (p_request_id, 'approved') returning id into v_fulfillment_id;
  if v_listing.design_id is not null then
    update public.jewelry_designs set times_traded = times_traded + 1, updated_at = now()
      where id = v_listing.design_id;
  end if;
  return json_build_object('request_id', p_request_id, 'fulfillment_id', v_fulfillment_id,
    'listing_id', v_listing.id, 'customer_name', v_request.customer_name,
    'quantity_available', v_remaining_quantity);
end;
$$;
create or replace function public.rpc_reject_trade_v2(
  p_request_id uuid, p_rep_id uuid, p_reason public.rejection_reason,
  p_customer_explanation text default null, p_rep_notes text default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_request public.trade_requests%rowtype;
  v_listing public.trade_listings%rowtype;
  v_pending_count integer;
  v_next_status public.listing_status;
begin
  if p_reason is null or p_reason::text not in
    ('collection_mismatch', 'jewelry_type_mismatch', 'item_unavailable', 'other')
    or (p_reason::text = 'other' and nullif(btrim(p_customer_explanation), '') is null)
    or length(coalesce(p_customer_explanation, '')) > 240 then
    raise exception 'DENIAL_REASON_REQUIRED';
  end if;
  select * into v_request from public.trade_requests where id = p_request_id;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  select * into v_listing from public.trade_listings where id = v_request.listing_id for update;
  if not found or v_listing.rep_id <> p_rep_id then raise exception 'UNAUTHORIZED_TRADE'; end if;
  perform id from public.trade_requests where listing_id = v_listing.id order by id for update;
  select * into v_request from public.trade_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.listing_id is distinct from v_listing.id or v_request.status <> 'pending' then raise exception 'REQUEST_NOT_PENDING'; end if;
  update public.trade_requests set status = 'denied', rejection_reason = p_reason,
    denial_explanation = case when p_reason::text = 'other' then btrim(p_customer_explanation) else null end,
    rep_notes = p_rep_notes, updated_at = now() where id = p_request_id;
  select count(*) into v_pending_count from public.trade_requests
    where listing_id = v_listing.id and status = 'pending';
  v_next_status := case
    when v_listing.status = 'removed' then 'removed'::public.listing_status
    when v_listing.quantity_available <= 0 then 'traded'::public.listing_status
    when v_pending_count >= v_listing.quantity_available then 'pending_trade'::public.listing_status
    else 'available'::public.listing_status end;
  if v_listing.status <> 'removed' then
    update public.trade_listings set status = v_next_status, updated_at = now() where id = v_listing.id;
  end if;
  return json_build_object('request_id', p_request_id, 'listing_id', v_listing.id,
    'listing_restored', v_next_status = 'available'::public.listing_status);
end;
$$;

-- Manual creators share restore's identity lock; preserve one-row-per-add behavior.
create function public.rpc_add_manual_trade_listing_v1(p_rep_id uuid,p_row jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare result public.trade_listings%rowtype;
begin
 if p_rep_id is null then raise exception 'LISTING_NOT_FOUND'; end if;
 perform pg_advisory_xact_lock(hashtextextended('manual:'||public.dance_floor_manual_identity_v1(p_rep_id,p_row),0));
 if exists(select 1 from public.trade_listings x where x.rep_id=p_rep_id and x.listing_source='non_item_number' and x.status in ('available','pending_trade') and public.dance_floor_manual_identity_v1(p_rep_id,to_jsonb(x))=public.dance_floor_manual_identity_v1(p_rep_id,p_row)) then raise exception 'DUPLICATE_ACTIVE_LISTING'; end if;
 insert into public.trade_listings(rep_id,listing_source,design_id,status,rep_notes,trade_preferences,ring_size,
 listing_photo_url,uses_canonical_photo,manual_type_prefix,manual_collection_family,manual_collection_name,manual_size,manual_photo_url,listed_at,
 rarity_classification,rarity_confirmed_at,rarity_confirmation_source)
 values(p_rep_id,'non_item_number',null,'available',p_row->>'rep_notes',p_row->>'trade_preferences',p_row->>'manual_size',
 p_row->>'manual_photo_url',false,p_row->>'manual_type_prefix',p_row->>'manual_collection_family',p_row->>'manual_collection_name',
 p_row->>'manual_size',p_row->>'manual_photo_url',now(),coalesce(p_row->>'rarity_classification','standard'),now(),'nic_nac_explicit_answer')
 returning * into result;
 return jsonb_build_object('id',result.id,'status',result.status);
end; $$;

-- A local lock cannot protect a subsequent HTTP write; do the entire transition here.
create function public.rpc_update_trade_fulfillment_v1(p_rep_id uuid,p_fulfillment_id uuid,p_next_status public.fulfillment_status,p_shipping_notes text default null,p_write_notes boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare f public.trade_fulfillment%rowtype; l public.trade_listings%rowtype; listing_id uuid; old_status public.fulfillment_status; changed boolean;
begin
 select r.listing_id into listing_id from public.trade_fulfillment x join public.trade_requests r on r.id=x.request_id where x.id=p_fulfillment_id;
 select * into l from public.trade_listings where id=listing_id and rep_id=p_rep_id for update;
 if not found then raise exception 'LISTING_NOT_FOUND'; end if;
 perform id from public.trade_requests where trade_requests.listing_id=l.id order by id for update;
 select * into f from public.trade_fulfillment where id=p_fulfillment_id for update;
 if not found or not exists(select 1 from public.trade_requests where id=f.request_id and trade_requests.listing_id=l.id) then raise exception 'LISTING_NOT_FOUND'; end if;
 old_status:=f.fulfillment_status;
 if p_next_status is null or not (old_status=p_next_status or old_status='approved' and p_next_status in ('shipped','completed') or old_status='shipped' and p_next_status='completed' or old_status='completed' and p_next_status='approved') then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 if old_status='completed' and p_next_status='approved' and l.status not in ('available','pending_trade') then raise exception 'LISTING_OFF_FLOOR'; end if;
 if length(coalesce(p_shipping_notes,''))>300 then raise exception 'INVALID_INPUT'; end if;
 changed := old_status is distinct from p_next_status or (p_write_notes and coalesce(f.shipping_notes,'') is distinct from coalesce(p_shipping_notes,''));
 if changed then
 update public.trade_fulfillment set fulfillment_status=p_next_status,
 status_updated_at=case when old_status is distinct from p_next_status then now() else status_updated_at end,
 shipping_notes=case when p_write_notes then p_shipping_notes else shipping_notes end,
 completed_at=case when p_next_status='completed' and old_status is distinct from 'completed' then now() when old_status='completed' and p_next_status='approved' then null else completed_at end
 where id=f.id returning * into f;
 end if;
 return jsonb_build_object('id',f.id,'request_id',f.request_id,'previous_status',old_status,'fulfillment_status',f.fulfillment_status,'completed_at',f.completed_at,'changed',changed);
end; $$;

create function public.rpc_claim_trade_listing_photo_v1(p_rep_id uuid,p_listing_id uuid,p_storage_path text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare l public.trade_listings%rowtype; attempt public.trade_listing_photo_attempts%rowtype; path text;
begin
 -- Serialize both counters for this rep, then the listing. No other path takes this lock after a listing lock.
 perform pg_advisory_xact_lock(hashtextextended('dance-floor-photo:'||p_rep_id::text,0));
 select * into l from public.trade_listings where id=p_listing_id and rep_id=p_rep_id for update;
 if not found then raise exception 'LISTING_NOT_FOUND'; end if;
 if l.status is null or l.status not in ('available','pending_trade') then raise exception 'LISTING_NOT_ACTIVE'; end if;
 if p_storage_path is null then
   if (select count(*) from public.trade_listing_photo_attempts where rep_id=p_rep_id and created_at>now()-interval '1 hour')>=50 then raise exception 'PHOTO_REP_LIMIT'; end if;
   if (select count(*) from public.trade_listing_photo_attempts where rep_id=p_rep_id and listing_id=l.id and created_at>now()-interval '1 day')>=5 then raise exception 'PHOTO_DANCER_LIMIT'; end if;
   path:=p_rep_id::text||'/dance-floor/'||l.id::text||'/jewelry/'||gen_random_uuid()::text;
   insert into public.trade_listing_photo_attempts(rep_id,listing_id,storage_path) values(p_rep_id,l.id,path) returning * into attempt;
 else
   select * into attempt from public.trade_listing_photo_attempts where rep_id=p_rep_id and listing_id=l.id and storage_path=p_storage_path for update;
   if not found or attempt.consumed_at is not null or attempt.created_at<now()-interval '2 hours' then raise exception 'PHOTO_TARGET_INVALID'; end if;
   -- Capacity was charged before issuance; claim once before running the pipeline.
   update public.trade_listing_photo_attempts set consumed_at=now() where id=attempt.id;
 end if;
 return jsonb_build_object('storage_path',attempt.storage_path,'role','jewelry');
end; $$;

revoke all on function public.rpc_remove_trade_listing_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.rpc_remove_trade_listing_v1(uuid,uuid,text) to service_role;

revoke all on function public.rpc_set_trade_listing_quantity_v1(uuid,uuid,integer,integer) from public, anon, authenticated;
grant execute on function public.rpc_set_trade_listing_quantity_v1(uuid,uuid,integer,integer) to service_role;

revoke all on function public.rpc_adjust_trade_listing_quantity_v1(uuid,uuid,integer,integer,boolean) from public, anon, authenticated;
grant execute on function public.rpc_adjust_trade_listing_quantity_v1(uuid,uuid,integer,integer,boolean) to service_role;

revoke all on function public.rpc_restore_trade_listing_v1(uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.rpc_restore_trade_listing_v1(uuid,uuid,integer) to service_role;

revoke all on function public.dance_floor_manual_identity_v1(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.dance_floor_manual_identity_v1(uuid,jsonb) to service_role;

revoke all on function public.rpc_add_manual_trade_listing_v1(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.rpc_add_manual_trade_listing_v1(uuid,jsonb) to service_role;

revoke all on function public.rpc_update_trade_fulfillment_v1(uuid,uuid,public.fulfillment_status,text,boolean) from public, anon, authenticated;
grant execute on function public.rpc_update_trade_fulfillment_v1(uuid,uuid,public.fulfillment_status,text,boolean) to service_role;

revoke all on function public.rpc_claim_trade_listing_photo_v1(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.rpc_claim_trade_listing_photo_v1(uuid,uuid,text) to service_role;

notify pgrst, 'reload schema';
