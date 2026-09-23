-- Customer reveal images are uploaded directly to private storage. A verified
-- ticket is consumed in the same transaction that creates the trade request.

alter table public.trade_requests
  drop constraint if exists trade_requests_reveal_screenshot_size_bytes_check;
alter table public.trade_requests
  add constraint trade_requests_reveal_screenshot_size_bytes_check
  check (reveal_screenshot_size_bytes is null or
         reveal_screenshot_size_bytes between 1 and 26214400);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trade-request-screenshots', 'trade-request-screenshots', false, 26214400,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.trade_request_upload_tickets (
  id uuid primary key,
  listing_id uuid not null references public.trade_listings(id) on delete cascade,
  rep_id uuid not null references public.reps(id) on delete cascade,
  submission_id uuid not null,
  request_ip_hash text not null check (request_ip_hash ~ '^[a-f0-9]{64}$'),
  raw_path text not null unique,
  ready_path text unique,
  declared_content_type text not null check (declared_content_type in
    ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif')),
  declared_size_bytes integer not null check (declared_size_bytes between 1 and 26214400),
  ready_size_bytes integer check (ready_size_bytes between 1 and 26214400),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  raw_cleanup_at timestamptz,
  consumed_at timestamptz,
  consumed_request_id uuid references public.trade_requests(id) on delete set null,
  constraint trade_request_upload_ticket_ready_check check
    ((ready_at is null and ready_path is null and ready_size_bytes is null) or
     (ready_at is not null and ready_path is not null and ready_size_bytes is not null))
);
create index if not exists idx_trade_request_upload_tickets_cleanup
  on public.trade_request_upload_tickets (created_at);
create index if not exists idx_trade_request_upload_tickets_ip
  on public.trade_request_upload_tickets (request_ip_hash, created_at desc);
alter table public.trade_request_upload_tickets enable row level security;
revoke all on public.trade_request_upload_tickets from public, anon, authenticated;
grant select, insert, update, delete on public.trade_request_upload_tickets to service_role;

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
  -- The existing RPC owns eligibility, idempotency, screening, and receipt
  -- validation. Any ticket failure rolls its writes back with this transaction.
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
  where id = v_request_id
    and (reveal_screenshot_path is null or reveal_screenshot_path = v_ticket.ready_path);
  if not found then raise exception 'TRADE_UPLOAD_ALREADY_ATTACHED'; end if;

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
