-- Fix the existing mixed TEXT/enum COALESCE used by customer screening and rep approval.
-- The manual type column is constrained to the jewelry_type enum codes.

create or replace function public.rpc_submit_trade_request_v3(
  p_listing_id uuid,
  p_customer_name text,
  p_customer_description text,
  p_submission_id uuid,
  p_receipt_token_hash text,
  p_offered_family text default null,
  p_offered_type public.jewelry_type default null,
  p_manual_review_requested boolean default false
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_result json;
  v_request_id uuid;
  v_existing public.trade_requests%rowtype;
  v_requested_family text;
  v_requested_type public.jewelry_type;
  v_offer_family text;
  v_status text;
  v_reason text;
begin
  if length(coalesce(p_offered_family, '')) > 100
     or p_receipt_token_hash is null
     or p_receipt_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_TRADE_REQUEST'; end if;
  v_result := public.rpc_submit_trade_request_v2(
    p_listing_id, p_customer_name, p_customer_description, p_submission_id
  );
  v_request_id := (v_result->>'request_id')::uuid;
  select * into v_existing from public.trade_requests where id = v_request_id for update;
  if (v_result->>'mutation_replayed')::boolean then
    if v_existing.offered_family is distinct from nullif(btrim(p_offered_family), '')
       or v_existing.offered_type is distinct from p_offered_type
       or v_existing.manual_review_requested is distinct from coalesce(p_manual_review_requested, false)
       or v_existing.receipt_token_hash is distinct from p_receipt_token_hash
    then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return v_result;
  end if;

  select coalesce(l.manual_collection_family, c.name),
         coalesce(l.manual_type_prefix::public.jewelry_type, d.type_prefix)
    into v_requested_family, v_requested_type
  from public.trade_listings l
  left join public.jewelry_designs d on d.id = l.design_id
  left join public.collections c on c.id = d.collection_id
  where l.id = p_listing_id;
  v_offer_family := public.trade_canonical_family_v1(p_offered_family);
  if v_offer_family is null or public.trade_canonical_family_v1(v_requested_family) is null
     or p_offered_type is null or v_requested_type is null then
    v_status := 'needs_verification';
    v_reason := 'The collection family or jewelry type needs rep verification.';
  elsif v_offer_family <> public.trade_canonical_family_v1(v_requested_family) then
    v_status := 'mismatch';
    v_reason := format('The offered %s collection does not match the requested %s collection.',
      btrim(p_offered_family), btrim(v_requested_family));
  elsif p_offered_type <> v_requested_type then
    v_status := 'mismatch';
    v_reason := 'The offered jewelry type does not match the requested dancer.';
  else
    v_status := 'likely_match';
    v_reason := null;
  end if;
  if v_status = 'mismatch' and not coalesce(p_manual_review_requested, false) then
    raise exception 'MANUAL_REVIEW_REQUIRED';
  end if;
  update public.trade_requests set
    offered_family = nullif(btrim(p_offered_family), ''),
    offered_type = p_offered_type,
    manual_review_requested = coalesce(p_manual_review_requested, false),
    screening_status = v_status,
    screening_reason = v_reason,
    receipt_token_hash = p_receipt_token_hash
  where id = v_request_id;
  return v_result;
end;
$$;

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
  select * into v_request from public.trade_requests where id = p_request_id for update;
  if not found then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request.status <> 'pending' then raise exception 'REQUEST_NOT_PENDING'; end if;
  select * into v_listing from public.trade_listings where id = v_request.listing_id for update;
  if not found or v_listing.rep_id <> p_rep_id then raise exception 'UNAUTHORIZED_TRADE'; end if;
  if v_listing.quantity_available < 1 then raise exception 'LISTING_NOT_FOUND'; end if;
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

revoke all on function public.rpc_submit_trade_request_v3(uuid,text,text,uuid,text,text,public.jewelry_type,boolean)
  from public, anon, authenticated;
grant execute on function public.rpc_submit_trade_request_v3(uuid,text,text,uuid,text,text,public.jewelry_type,boolean)
  to service_role;
revoke all on function public.rpc_approve_trade_v2(uuid,uuid,text,public.jewelry_type,boolean,boolean,text)
  from public, anon, authenticated;
grant execute on function public.rpc_approve_trade_v2(uuid,uuid,text,public.jewelry_type,boolean,boolean,text)
  to service_role;
