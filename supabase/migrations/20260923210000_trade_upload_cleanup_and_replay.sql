-- Follow-up to the already-applied direct-upload migration. Track raw staging
-- cleanup after signed URLs expire, and keep idempotent request replays inert.
alter table public.trade_request_upload_tickets
  add column if not exists raw_cleanup_at timestamptz;

create or replace function public.rpc_submit_trade_request_v4(
  p_listing_id uuid,
  p_customer_name text,
  p_customer_description text,
  p_submission_id uuid,
  p_receipt_token_hash text,
  p_offered_family text default null,
  p_offered_type public.jewelry_type default null,
  p_manual_review_requested boolean default false,
  p_upload_id uuid default null
) returns json language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_result json;
  v_request_id uuid;
  v_ticket public.trade_request_upload_tickets%rowtype;
begin
  v_result := public.rpc_submit_trade_request_v3(
    p_listing_id, p_customer_name, p_customer_description, p_submission_id,
    p_receipt_token_hash, p_offered_family, p_offered_type,
    p_manual_review_requested
  );
  if p_upload_id is null then return v_result; end if;
  v_request_id := (v_result->>'request_id')::uuid;
  select * into v_ticket from public.trade_request_upload_tickets
    where id = p_upload_id for update;
  if not found or v_ticket.listing_id <> p_listing_id
    or v_ticket.submission_id <> p_submission_id
    or v_ticket.ready_at is null
    or v_ticket.ready_path is null
    or v_ticket.ready_size_bytes is null
    or (v_ticket.created_at < now() - interval '2 hours'
      and v_ticket.consumed_request_id is null)
    or (v_ticket.consumed_request_id is not null
      and v_ticket.consumed_request_id <> v_request_id)
  then raise exception 'TRADE_UPLOAD_NOT_READY'; end if;
  if not exists (select 1 from public.trade_listings
    where id = p_listing_id and rep_id = v_ticket.rep_id) then
    raise exception 'TRADE_UPLOAD_SCOPE_MISMATCH';
  end if;

  update public.trade_requests set
    reveal_screenshot_path = v_ticket.ready_path,
    reveal_screenshot_content_type = 'image/jpeg',
    reveal_screenshot_size_bytes = v_ticket.ready_size_bytes,
    reveal_screenshot_uploaded_at = v_ticket.ready_at,
    reveal_screenshot_expires_at = v_ticket.ready_at + interval '7 days',
    updated_at = now()
  where id = v_request_id and reveal_screenshot_path is null;
  if not found and not exists (
    select 1 from public.trade_requests
      where id = v_request_id and reveal_screenshot_path = v_ticket.ready_path
  ) then raise exception 'TRADE_UPLOAD_ALREADY_ATTACHED'; end if;

  update public.trade_request_upload_tickets set
    consumed_at = coalesce(consumed_at, now()),
    consumed_request_id = v_request_id
  where id = p_upload_id;
  return v_result;
end;
$$;
revoke all on function public.rpc_submit_trade_request_v4(
  uuid,text,text,uuid,text,text,public.jewelry_type,boolean,uuid
) from public, anon, authenticated;
grant execute on function public.rpc_submit_trade_request_v4(
  uuid,text,text,uuid,text,text,public.jewelry_type,boolean,uuid
) to service_role;
