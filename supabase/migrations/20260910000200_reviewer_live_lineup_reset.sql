-- LOCAL ADDITIVE DRAFT. Applying this migration or migrating an existing reviewer identity
-- needs separate approval. Never stamps auth metadata, changes entitlements, or targets customers.
-- Operational prerequisite: stop this reviewer's fixture publisher and pairing UI before reset.
-- Publisher issuance and reset share one tenant advisory lock for their whole transactions.
create function public.reset_reviewer_live_lineup(p_rep_id uuid, p_auth_user_id uuid, p_email text)
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
  -- Keep the established synthetic sync-code mapping but remove stale legacy display data.
  update public.live_queue q set queue = '[]'::jsonb, last_updated = null where q.rep_id = p_rep_id;
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
