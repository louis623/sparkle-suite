-- Live Lineup connection codes.
-- The per-rep extension code (also the Secret Rep ID) used to live only on live_queue,
-- next to a queue payload the legacy extension kept writing. Lineup names now belong
-- only in live_lineup_states. This table stores the code and nothing else, so a rep
-- with no current lineup cannot be shown a retired queue.
--
-- Every non-blank live_queue.sync_code whose rep_id still exists is copied exactly.
-- Codes are not trimmed, regenerated, or rotated. Reps keep the code already saved
-- in the extension. Rows whose rep_id is not in reps cannot authenticate and stay
-- on the retired table; the copy warns instead of dropping a real rep's code.
--
-- Rollback: live_queue is not dropped or rewritten. Restore service_role writes,
-- copy any codes created only in this table back onto live_queue, then deploy the
-- previous application and live-queue-sync function. See the table comment.

create table public.live_lineup_connection_codes (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  sync_code text not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint live_lineup_connection_codes_sync_code_key unique (sync_code),
  constraint live_lineup_connection_codes_sync_code_present check (length(btrim(sync_code)) > 0)
);

comment on table public.live_lineup_connection_codes is
  'Per-rep Live Lineup connection code. Replaces live_queue.sync_code. Stores no queue payload. Oldest created_at for a rep is the canonical code returned to that rep; every copied code still authenticates.';

create index live_lineup_connection_codes_rep_created_idx
  on public.live_lineup_connection_codes (rep_id, created_at, id);

alter table public.live_lineup_connection_codes enable row level security;
revoke all on public.live_lineup_connection_codes from public, anon, authenticated;
grant select on public.live_lineup_connection_codes to authenticated;
grant select, insert on public.live_lineup_connection_codes to service_role;

create policy live_lineup_connection_codes_select_own
  on public.live_lineup_connection_codes
  for select
  to authenticated
  using (
    rep_id in (select r.id from public.reps r where r.auth_user_id = auth.uid())
  );

do $$
declare
  skipped bigint;
begin
  select count(*) into skipped
  from public.live_queue q
  where q.sync_code is not null
    and length(btrim(q.sync_code)) > 0
    and not exists (select 1 from public.reps r where r.id = q.rep_id);
  if skipped > 0 then
    raise warning 'Skipped % live_queue sync code row(s) with no matching reps.id. Those codes remain only on retired live_queue.', skipped;
  end if;
end $$;

insert into public.live_lineup_connection_codes (rep_id, sync_code, created_at)
select q.rep_id, q.sync_code, coalesce(q.created_at, clock_timestamp())
from public.live_queue q
where q.rep_id in (select r.id from public.reps r)
  and q.sync_code is not null
  and length(btrim(q.sync_code)) > 0;

do $$
declare
  source_count bigint;
  copied_count bigint;
begin
  select count(*) into source_count
  from public.live_queue q
  where q.rep_id in (select r.id from public.reps r)
    and q.sync_code is not null
    and length(btrim(q.sync_code)) > 0;
  select count(*) into copied_count
  from public.live_lineup_connection_codes c
  where exists (
    select 1 from public.live_queue q
    where q.sync_code = c.sync_code
      and q.rep_id = c.rep_id
  );
  if copied_count <> source_count then
    raise exception 'Connection code copy incomplete: source % copied %', source_count, copied_count;
  end if;
end $$;

-- Reviewer reset no longer writes the retired queue. Connection codes are kept.
create or replace function public.reset_reviewer_live_lineup(p_rep_id uuid, p_auth_user_id uuid, p_email text)
returns table(rep_id uuid, auth_user_id uuid, ready boolean, reset_at timestamptz,
  deleted_states bigint, deleted_tokens bigint, deleted_archives bigint)
language plpgsql security definer set search_path = pg_catalog as $$
declare
  reviewer public.reps%rowtype;
  reviewer_auth auth.users%rowtype;
  entitlement public.subscriptions%rowtype;
  reserved_slug text;
  states_count bigint;
  tokens_count bigint;
  archives_count bigint;
begin
  reserved_slug := case p_email
    when 'sparkle-reviewer+preview@neonrabbit.net' then 'sparkle-reviewer-preview'
    when 'sparkle-reviewer+local@neonrabbit.net' then 'sparkle-reviewer-local'
    else null end;
  if reserved_slug is null or p_rep_id is null or p_auth_user_id is null then
    raise exception 'Unsupported reviewer identity' using errcode = '28000';
  end if;
  -- Match live_lineup_issue_publisher exactly. The transaction-scoped lock is
  -- acquired before identity/table locks and is retained through commit/rollback.
  perform pg_advisory_xact_lock(hashtextextended(p_rep_id::text, 734918));
  select u.* into reviewer_auth from auth.users u where u.id = p_auth_user_id for share;
  if not found or lower(reviewer_auth.email) is distinct from p_email
    or reviewer_auth.raw_app_meta_data->>'reviewer_smoke_scope' is distinct from 'sparkle-suite-reviewer-v1' then
    raise exception 'Reviewer server-owned identity scope is required' using errcode = '28000';
  end if;
  -- NO KEY UPDATE serializes reviewer resets but remains compatible with the rep FK's
  -- key-share locks used by source inserts. Do not introduce a rep -> token FK deadlock.
  select r.* into reviewer from public.reps r where r.id = p_rep_id for no key update;
  if not found or reviewer.auth_user_id is distinct from p_auth_user_id or lower(reviewer.email) is distinct from p_email
    or reviewer.account_classification::text is distinct from 'demo' or reviewer.finder_directory_visible is distinct from false
    or reviewer.custom_domain is not null or (reviewer.public_site_slug is not null and reviewer.public_site_slug <> reserved_slug) then
    raise exception 'Workspace is not the isolated supported reviewer' using errcode = '28000';
  end if;
  if exists(select 1 from public.reps r where r.auth_user_id = p_auth_user_id and r.id <> p_rep_id) then
    raise exception 'Ambiguous reviewer auth link' using errcode = '28000';
  end if;
  select s.* into entitlement from public.subscriptions s where s.rep_id = p_rep_id for share;
  if not found or entitlement.stripe_livemode is distinct from false or entitlement.monthly_amount is distinct from 0
    or entitlement.pricing_tier::text is distinct from 'smoke'
    or entitlement.stripe_subscription_id is distinct from 'sub_reviewer_smoke_' || p_rep_id::text
    or entitlement.stripe_customer_id is distinct from 'cus_reviewer_smoke_' || p_rep_id::text then
    raise exception 'Non-live zero-dollar synthetic entitlement is required' using errcode = '28000';
  end if;
  -- Source CAS/revoke/claim use token -> state ordering. Lock every existing token
  -- for this one reviewer first; never lock or enumerate another tenant's tokens.
  perform t.id from public.live_lineup_publisher_tokens t where t.rep_id = p_rep_id order by t.id for update;
  delete from public.live_lineup_states s where s.rep_id = p_rep_id;
  get diagnostics states_count = row_count;
  delete from public.live_lineup_show_archives a where a.rep_id = p_rep_id;
  get diagnostics archives_count = row_count;
  delete from public.live_lineup_publisher_tokens t where t.rep_id = p_rep_id;
  get diagnostics tokens_count = row_count;
  -- Connection codes stay in live_lineup_connection_codes. Retired live_queue is not written.
  -- Defensive postcondition: do not acknowledge a clean reset if any targeted
  -- v2 state remains. The exception rolls the entire cleanup back.
  if exists(select 1 from public.live_lineup_states s where s.rep_id = p_rep_id)
    or exists(select 1 from public.live_lineup_show_archives a where a.rep_id = p_rep_id)
    or exists(select 1 from public.live_lineup_publisher_tokens t where t.rep_id = p_rep_id) then
    raise exception 'Reviewer source changed during reset; retry after stopping its fixture publisher' using errcode = '40001';
  end if;
  -- Empty v2 state means NOT initialized, never a synthetic ready-source acknowledgment.
  return query select p_rep_id, p_auth_user_id, false, clock_timestamp(), states_count, tokens_count, archives_count;
end;
$$;
revoke all on function public.reset_reviewer_live_lineup(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.reset_reviewer_live_lineup(uuid,uuid,text) to service_role;

revoke insert, update, delete, truncate on table public.live_queue from public, anon, authenticated, service_role;

comment on table public.live_queue is
  'RETIRED. Replaced by Live Lineup: connection codes live in live_lineup_connection_codes and lineup data lives in live_lineup_states. Kept read-only for rollback. Do not write queue or sync_code here.';
