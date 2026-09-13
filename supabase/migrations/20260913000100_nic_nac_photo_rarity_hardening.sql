-- Rarity is a human-confirmed fact. Descriptive words such as "diamond cubic
-- zirconia" must never promote a normal dancer.
alter table public.jewelry_designs
  add column if not exists rarity_classification text not null default 'standard',
  add column if not exists rarity_confirmed_at timestamptz,
  add column if not exists rarity_confirmation_source text;

alter table public.trade_listings
  add column if not exists rarity_classification text not null default 'standard',
  add column if not exists rarity_confirmed_at timestamptz,
  add column if not exists rarity_confirmation_source text;

alter table public.trade_board_intake_sessions
  add column if not exists rarity_classification text,
  add column if not exists rarity_confirmed_at timestamptz;

alter table public.trade_board_intake_photos
  add column if not exists content_sha256 text,
  add column if not exists inspected_at timestamptz,
  add column if not exists visual_role_source text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jewelry_designs_rarity_classification_valid') then
    alter table public.jewelry_designs add constraint jewelry_designs_rarity_classification_valid
      check (rarity_classification in ('standard', 'diamond', 'unicorn'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trade_listings_rarity_classification_valid') then
    alter table public.trade_listings add constraint trade_listings_rarity_classification_valid
      check (rarity_classification in ('standard', 'diamond', 'unicorn'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trade_board_intake_sessions_rarity_classification_valid') then
    alter table public.trade_board_intake_sessions add constraint trade_board_intake_sessions_rarity_classification_valid
      check (rarity_classification is null or rarity_classification in ('standard', 'diamond', 'unicorn'));
  end if;
end $$;

-- Owner-confirmed baseline: there are currently no diamond or unicorn pieces.
-- Never infer this field from a name, stone, description, tag, or note.
update public.jewelry_designs set
  rarity_classification = 'standard',
  rarity_confirmed_at = coalesce(rarity_confirmed_at, now()),
  rarity_confirmation_source = coalesce(rarity_confirmation_source, 'owner_confirmed_baseline');
update public.trade_listings set
  rarity_classification = 'standard',
  rarity_confirmed_at = coalesce(rarity_confirmed_at, now()),
  rarity_confirmation_source = coalesce(rarity_confirmation_source, 'owner_confirmed_baseline');

-- Preserve the before state and source lineage for every historical repair.
create table if not exists public.jewelry_listing_repair_audit (
  id uuid primary key default gen_random_uuid(),
  repair_batch_id uuid not null,
  listing_id uuid not null references public.trade_listings(id) on delete restrict,
  design_id uuid references public.jewelry_designs(id) on delete restrict,
  rep_id uuid not null references public.reps(id) on delete restrict,
  reason text not null,
  status text not null default 'planned'
    check (status in ('planned', 'approved', 'applied', 'skipped', 'failed')),
  before_state jsonb not null default '{}'::jsonb,
  proposed_state jsonb not null default '{}'::jsonb,
  applied_state jsonb,
  source_conversation_id text,
  source_message_id text,
  source_attachment_index integer,
  source_content_sha256 text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
create unique index if not exists idx_jewelry_listing_repair_audit_batch_listing
  on public.jewelry_listing_repair_audit(repair_batch_id, listing_id);
alter table public.jewelry_listing_repair_audit enable row level security;
revoke all on table public.jewelry_listing_repair_audit from anon, authenticated;
grant select, insert, update on table public.jewelry_listing_repair_audit to service_role;

-- Apply one reviewed repair atomically. The caller must first verify the
-- source bytes against the immutable manifest; this function additionally
-- refuses to write if either database photo pointer changed after review.
create or replace function public.rpc_apply_jewelry_listing_photo_repair(
  p_repair_batch_id uuid,
  p_listing_id uuid,
  p_design_id uuid,
  p_rep_id uuid,
  p_expected_listing_photo_url text,
  p_expected_canonical_photo_url text,
  p_new_photo_url text,
  p_original_photo_url text,
  p_source_photo_id uuid,
  p_source_content_sha256 text,
  p_reason text,
  p_preflight_score integer,
  p_preflight_issues jsonb,
  p_selected_source text
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_listing public.trade_listings%rowtype;
  v_design public.jewelry_designs%rowtype;
  v_existing public.jewelry_listing_repair_audit%rowtype;
  v_before jsonb;
  v_after jsonb;
begin
  if p_repair_batch_id is null or p_listing_id is null or p_design_id is null
    or p_rep_id is null or p_source_photo_id is null
    or nullif(btrim(p_new_photo_url), '') is null
    or nullif(btrim(p_original_photo_url), '') is null
    or p_source_content_sha256 !~ '^[0-9a-f]{64}$'
    or p_selected_source not in ('original', 'cropped', 'enhanced', 'cropped_enhanced')
    or p_preflight_score < 0 or p_preflight_score > 100 then
    raise exception 'invalid listing repair input' using errcode = '22023';
  end if;

  select * into v_existing from public.jewelry_listing_repair_audit
    where repair_batch_id = p_repair_batch_id and listing_id = p_listing_id;
  if found and v_existing.status = 'applied' then
    return coalesce(v_existing.applied_state, '{}'::jsonb) ||
      jsonb_build_object('repair_replayed', true);
  end if;

  select * into v_listing from public.trade_listings
    where id = p_listing_id for update;
  select * into v_design from public.jewelry_designs
    where id = p_design_id for update;
  if v_listing.id is null or v_design.id is null
    or v_listing.design_id <> p_design_id
    or v_listing.rep_id <> p_rep_id then
    raise exception 'listing repair identity mismatch' using errcode = '22023';
  end if;
  if v_listing.listing_photo_url is distinct from p_expected_listing_photo_url
    or v_design.canonical_photo_url is distinct from p_expected_canonical_photo_url then
    raise exception 'listing repair photo pointer changed after review' using errcode = '40001';
  end if;
  if exists (
    select 1 from public.trade_listings other_listing
    where other_listing.design_id = p_design_id
      and other_listing.id <> p_listing_id
      and other_listing.status in ('available', 'pending_trade')
  ) then
    raise exception 'listing repair design is now shared by another current listing'
      using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.trade_board_intake_photos photo
    join public.trade_board_intake_sessions session on session.id = photo.session_id
    where photo.id = p_source_photo_id
      and session.rep_id = p_rep_id
      and (session.created_design_id = p_design_id or p_listing_id = any(session.created_listing_ids))
  ) then
    raise exception 'listing repair source photo is outside the owning workflow' using errcode = '22023';
  end if;

  v_before := jsonb_build_object(
    'listing_photo_url', v_listing.listing_photo_url,
    'uses_canonical_photo', v_listing.uses_canonical_photo,
    'canonical_photo_url', v_design.canonical_photo_url,
    'photo_pipeline_status', v_design.photo_pipeline_status,
    'rarity_classification', coalesce(v_listing.rarity_classification, 'standard')
  );

  update public.jewelry_designs set
    canonical_photo_url = p_new_photo_url,
    photo_pipeline_original_url = p_original_photo_url,
    photo_pipeline_status = 'published',
    photo_pipeline_preflight_score = p_preflight_score,
    photo_pipeline_preflight_issues = coalesce(p_preflight_issues, '[]'::jsonb),
    photo_pipeline_provider = 'nic_nac_recovery',
    photo_pipeline_qa_decision = 'approve',
    photo_pipeline_qa_confidence = 1,
    photo_pipeline_processed_at = now(),
    rarity_classification = 'standard',
    rarity_confirmed_at = now(),
    rarity_confirmation_source = 'operator_recovery',
    updated_at = now()
  where id = p_design_id;

  update public.trade_listings set
    listing_photo_url = p_new_photo_url,
    uses_canonical_photo = false,
    rarity_classification = 'standard',
    rarity_confirmed_at = now(),
    rarity_confirmation_source = 'operator_recovery',
    updated_at = now()
  where id = p_listing_id;

  v_after := jsonb_build_object(
    'listing_id', p_listing_id,
    'design_id', p_design_id,
    'listing_photo_url', p_new_photo_url,
    'canonical_photo_url', p_new_photo_url,
    'original_photo_url', p_original_photo_url,
    'source_photo_id', p_source_photo_id,
    'source_content_sha256', p_source_content_sha256,
    'selected_source', p_selected_source,
    'photo_pipeline_status', 'published',
    'rarity_classification', 'standard',
    'repair_replayed', false
  );

  insert into public.jewelry_listing_repair_audit(
    repair_batch_id, listing_id, design_id, rep_id, reason, status,
    before_state, proposed_state, applied_state, source_content_sha256, applied_at)
  values (
    p_repair_batch_id, p_listing_id, p_design_id, p_rep_id, p_reason, 'applied',
    v_before,
    jsonb_build_object('source_photo_id', p_source_photo_id,
      'source_content_sha256', p_source_content_sha256,
      'new_photo_url', p_new_photo_url),
    v_after, p_source_content_sha256, now())
  on conflict (repair_batch_id, listing_id) do update set
    status = excluded.status,
    before_state = excluded.before_state,
    proposed_state = excluded.proposed_state,
    applied_state = excluded.applied_state,
    source_content_sha256 = excluded.source_content_sha256,
    applied_at = excluded.applied_at;

  return v_after;
end;
$$;
revoke all on function public.rpc_apply_jewelry_listing_photo_repair(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text, text,
  integer, jsonb, text
) from public, anon, authenticated;
grant execute on function public.rpc_apply_jewelry_listing_photo_repair(
  uuid, uuid, uuid, uuid, text, text, text, text, uuid, text, text,
  integer, jsonb, text
) to service_role;

-- Rarity participates in physical-piece grouping. Keep v2 available for the
-- currently served application while the new code rolls out.
create or replace function public.rpc_add_or_increment_catalog_listing_v3(
  p_rep_id uuid,
  p_design_id uuid,
  p_rep_notes text default null,
  p_trade_preferences text default null,
  p_ring_size text default null,
  p_listing_photo_url text default null,
  p_uses_canonical_photo boolean default true,
  p_idempotency_key text default null,
  p_input_signature text default null,
  p_rarity_classification text default 'standard'
) returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_listing public.trade_listings%rowtype;
  v_grouped boolean := false;
  v_pending integer := 0;
  v_quantity integer;
  v_receipt public.trade_listing_add_mutations%rowtype;
  v_result jsonb;
begin
  if p_rep_id is null or p_design_id is null
    or nullif(btrim(p_idempotency_key), '') is null
    or nullif(btrim(p_input_signature), '') is null
    or p_rarity_classification not in ('standard', 'diamond', 'unicorn') then
    raise exception 'invalid catalog listing mutation input' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_rep_id::text || ':' || p_idempotency_key, 1));
  select * into v_receipt from public.trade_listing_add_mutations
    where rep_id = p_rep_id and idempotency_key = p_idempotency_key;
  if found then
    if v_receipt.input_signature <> p_input_signature then
      raise exception 'catalog listing idempotency key reused with different input' using errcode = '22023';
    end if;
    return v_receipt.result || jsonb_build_object('mutation_replayed', true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    public.trade_listing_catalog_group_digest(p_rep_id, p_design_id, p_ring_size,
      p_listing_photo_url, p_uses_canonical_photo, p_rep_notes, p_trade_preferences)
      || ':' || p_rarity_classification, 0));
  select * into v_listing from public.trade_listings
    where rep_id = p_rep_id and design_id = p_design_id
      and listing_source = 'catalog' and status in ('available', 'pending_trade')
      and ring_size is not distinct from p_ring_size
      and listing_photo_url is not distinct from p_listing_photo_url
      and uses_canonical_photo is not distinct from p_uses_canonical_photo
      and rep_notes is not distinct from p_rep_notes
      and trade_preferences is not distinct from p_trade_preferences
      and rarity_classification = p_rarity_classification
    order by created_at asc, id asc limit 1 for update;
  if found then
    v_grouped := true;
    v_quantity := v_listing.quantity_available + 1;
    select count(*)::integer into v_pending from public.trade_requests
      where listing_id = v_listing.id and status = 'pending';
    update public.trade_listings set quantity_available = v_quantity,
      status = case when v_pending >= v_quantity then 'pending_trade'::listing_status else 'available'::listing_status end,
      updated_at = now() where id = v_listing.id returning * into v_listing;
  else
    insert into public.trade_listings(rep_id, design_id, listing_source, status,
      rep_notes, trade_preferences, ring_size, listing_photo_url, uses_canonical_photo,
      quantity_available, listed_at, rarity_classification, rarity_confirmed_at,
      rarity_confirmation_source)
    values (p_rep_id, p_design_id, 'catalog', 'available', p_rep_notes,
      p_trade_preferences, p_ring_size, p_listing_photo_url, p_uses_canonical_photo,
      1, now(), p_rarity_classification, now(), 'nic_nac_explicit_answer')
    returning * into v_listing;
  end if;
  v_result := jsonb_build_object('listing_id', v_listing.id, 'status', v_listing.status,
    'quantity_available', v_listing.quantity_available, 'grouped_with_existing', v_grouped,
    'mutation_replayed', false);
  insert into public.trade_listing_add_mutations(idempotency_key, rep_id, input_signature,
    listing_id, result) values (p_idempotency_key, p_rep_id, p_input_signature,
    v_listing.id, v_result);
  return v_result;
end;
$$;
revoke all on function public.rpc_add_or_increment_catalog_listing_v3(
  uuid, uuid, text, text, text, text, boolean, text, text, text
) from public, anon, authenticated;
grant execute on function public.rpc_add_or_increment_catalog_listing_v3(
  uuid, uuid, text, text, text, text, boolean, text, text, text
) to service_role;

-- Finder reads the explicit classification. Search tags and descriptive text
-- remain searchable, but can never assign a Diamond or Unicorn badge.
create or replace function public.sparkle_finder_catalog_filtered_v2(
  p_query text default null,
  p_type_prefix text default null,
  p_collection text default null,
  p_material text default null,
  p_main_stone text default null,
  p_label text default null,
  p_collection_year integer default null
) returns table (
  id uuid, item_number text, design_name text, collection_name text,
  collection_year integer, type_prefix text, material text, main_stone text,
  bp_msrp numeric, canonical_photo_url text, search_tags text[],
  created_at timestamptz, catalog_label text
)
language sql stable security invoker set search_path to public set statement_timeout to '5s'
as $function$
  with base as materialized (
    select d.id, d.item_number, d.design_name, c.name as collection_name,
      c.collection_year, d.type_prefix::text as type_prefix, d.material,
      d.main_stone, d.bp_msrp, d.canonical_photo_url,
      coalesce(d.search_tags, array[]::text[]) as search_tags, d.created_at,
      coalesce(d.rarity_classification, 'standard') as catalog_label,
      (nullif(btrim(p_query), '') is not null and (
        position(lower(btrim(p_query)) in lower(d.item_number)) > 0
        or position(lower(btrim(p_query)) in lower(d.design_name)) > 0
        or position(lower(btrim(p_query)) in lower(coalesce(d.material, ''))) > 0
        or position(lower(btrim(p_query)) in lower(coalesce(d.main_stone, ''))) > 0
      )) as direct_match,
      (length(btrim(coalesce(p_query, ''))) between 2 and 32 and exists (
        select 1 from unnest(coalesce(d.search_tags, array[]::text[])) as tag
        where lower(btrim(tag)) = lower(btrim(p_query))
      )) as tag_match,
      (nullif(btrim(p_query), '') is not null and (
        position(lower(btrim(p_query)) in lower(coalesce(c.name, ''))) > 0
        or (btrim(p_query) ~ '^20[2-4][0-9]$' and c.collection_year = btrim(p_query)::integer)
      )) as collection_match
    from public.jewelry_designs d
    left join public.collections c on c.id = d.collection_id
    where (p_type_prefix is null or d.type_prefix::text = p_type_prefix)
      and (nullif(btrim(p_collection), '') is null
        or position(lower(btrim(p_collection)) in lower(coalesce(c.name, ''))) > 0)
      and (nullif(btrim(p_material), '') is null
        or position(lower(btrim(p_material)) in lower(coalesce(d.material, ''))) > 0)
      and (nullif(btrim(p_main_stone), '') is null
        or position(lower(btrim(p_main_stone)) in lower(coalesce(d.main_stone, ''))) > 0)
      and (p_collection_year is null or c.collection_year = p_collection_year)
  ), labeled as materialized (
    select * from base where p_label is null or base.catalog_label = p_label
  ), search_mode as (
    select case
      when nullif(btrim(p_query), '') is null then 'all'
      when exists (select 1 from labeled where direct_match) then 'direct'
      when exists (select 1 from labeled where tag_match) then 'tag'
      else 'collection'
    end as mode
  )
  select base.id, base.item_number, base.design_name, base.collection_name,
    base.collection_year, base.type_prefix, base.material, base.main_stone,
    base.bp_msrp, base.canonical_photo_url, base.search_tags, base.created_at,
    base.catalog_label
  from labeled base cross join search_mode
  where case search_mode.mode
    when 'all' then true when 'direct' then base.direct_match
    when 'tag' then base.tag_match else base.collection_match end;
$function$;

create or replace function public.list_sparkle_finder_catalog_v2(
  p_query text default null, p_type_prefix text default null,
  p_collection text default null, p_material text default null,
  p_main_stone text default null, p_label text default null,
  p_collection_year integer default null, p_limit integer default 24,
  p_cursor_created_at timestamptz default null,
  p_cursor_design_id uuid default null,
  p_cursor_created_at_is_null boolean default false
) returns jsonb
language sql stable security invoker set search_path to public set statement_timeout to '5s'
as $function$
  with request_limit as (
    select least(greatest(coalesce(p_limit, 24), 1), 50)::bigint as value
  ), filtered as materialized (
    select * from public.sparkle_finder_catalog_filtered_v2(
      p_query, p_type_prefix, p_collection, p_material, p_main_stone,
      p_label, p_collection_year)
  ), page_rows as materialized (
    select filtered.*, row_number() over (
      order by filtered.created_at desc nulls last, filtered.id desc
    ) as page_position
    from filtered cross join request_limit
    where p_cursor_design_id is null or case
      when p_cursor_created_at_is_null then
        filtered.created_at is null and filtered.id < p_cursor_design_id
      else filtered.created_at is null or filtered.created_at < p_cursor_created_at
        or (filtered.created_at = p_cursor_created_at and filtered.id < p_cursor_design_id)
      end
    order by filtered.created_at desc nulls last, filtered.id desc
    limit (select value + 1 from request_limit)
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page_rows) - 'page_position'
      order by page_rows.page_position) from page_rows cross join request_limit
      where page_rows.page_position <= request_limit.value), '[]'::jsonb),
    'totalCount', (select count(*) from filtered),
    'hasMore', ((select count(*) from page_rows) > (select value from request_limit)),
    'nextPosition', (select jsonb_build_object('createdAt', page_rows.created_at,
      'designId', page_rows.id) from page_rows cross join request_limit
      where page_rows.page_position = request_limit.value and exists (
        select 1 from page_rows lookahead where lookahead.page_position > request_limit.value
      ) limit 1)
  );
$function$;

create or replace function public.get_sparkle_finder_catalog_batch_v2(p_design_ids uuid[])
returns jsonb
language sql stable security invoker set search_path to public set statement_timeout to '5s'
as $function$
  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id, 'item_number', d.item_number, 'design_name', d.design_name,
    'collection_name', c.name, 'collection_year', c.collection_year,
    'type_prefix', d.type_prefix::text, 'material', d.material,
    'main_stone', d.main_stone, 'bp_msrp', d.bp_msrp,
    'canonical_photo_url', d.canonical_photo_url,
    'search_tags', coalesce(d.search_tags, array[]::text[]),
    'created_at', d.created_at,
    'catalog_label', coalesce(d.rarity_classification, 'standard')
  ) order by d.id), '[]'::jsonb))
  from public.jewelry_designs d
  left join public.collections c on c.id = d.collection_id
  where d.id = any(coalesce(p_design_ids, array[]::uuid[]));
$function$;

notify pgrst, 'reload schema';
