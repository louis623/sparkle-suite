-- ===== Gate (read at request time) =====
create table public.tiktok_hosted_video_gate (
  id smallint primary key default 1 check (id = 1),
  all_reps_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.tiktok_hosted_video_gate (id) values (1) on conflict (id) do nothing;

create table public.tiktok_hosted_video_reps (
  rep_id uuid primary key references public.reps(id) on delete cascade,
  enabled_at timestamptz not null default now(),
  note text check (char_length(note) <= 200)
);

create or replace function public.tiktok_hosted_video_enabled(p_rep_id uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp as $$
  select coalesce((select g.all_reps_enabled from public.tiktok_hosted_video_gate g where g.id = 1), false)
      or exists (select 1 from public.tiktok_hosted_video_reps e where e.rep_id = p_rep_id)
$$;

create or replace function public.tiktok_queue_lock_key(p_rep_id uuid)
returns bigint language sql immutable set search_path = pg_catalog, public, pg_temp as $$
  select hashtextextended('tiktok_queue:' || p_rep_id::text, 0)
$$;

-- ===== Finished videos (never deleted by cleanup) =====
create table public.public_site_videos (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  tiktok_video_id text not null check (tiktok_video_id ~ '^[0-9]{8,22}$'),
  source_url text not null,
  storage_path text not null unique,      -- <rep_id>/<video_id>/<ticket_id>.mp4|.mov
  poster_path text not null unique,       -- <rep_id>/<video_id>/<ticket_id>-poster.webp (server re-encoded)
  mime_type text not null check (mime_type in ('video/mp4','video/quicktime')),
  byte_size bigint not null check (byte_size between 1 and 52428800),
  width int not null check (width between 16 and 4096),
  height int not null check (height between 16 and 4096),
  duration_seconds numeric(6,2) not null check (duration_seconds >= 0.5 and duration_seconds <= 180),
  -- live = current file for (rep, ID), shown whenever a visible slot holds that ID.
  -- superseded = replaced by a same-ID re-upload (Reopen). removed = manual takedown only.
  status text not null default 'live' check (status in ('live','superseded','removed')),
  source_method text not null default 'save_video' check (source_method in ('save_video','screen_record','other')),
  created_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_by_rep_id uuid references public.reps(id) on delete set null
);
create unique index public_site_videos_one_live on public.public_site_videos (rep_id, tiktok_video_id) where status = 'live';

-- ===== Work queue (closed rows purged after 90 days) =====
create table public.tiktok_video_queue (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  tiktok_video_id text not null check (tiktok_video_id ~ '^[0-9]{8,22}$'),
  source_url text not null check (source_url ~ '^https://www\.tiktok\.com/'),
  slot_keys text[] not null default '{}'
    check (slot_keys <@ array['showcase','about_2','about_3','about_4','featured_reveal']::text[]),
  origin text not null check (origin in ('slot','static','backfill','reopen')),
  status text not null default 'pending' check (status in ('pending','completed','cancelled','archived')),
  cancel_reason text check (cancel_reason in ('link_removed','rep_inactive')),
  operator_note text check (char_length(operator_note) <= 500),          -- private: no rep grant
  pending_poster_path text,                                               -- private: no rep grant
  thumbnail_status text not null default 'none' check (thumbnail_status in ('none','ok','failed')),
  thumbnail_attempted_at timestamptz,
  asset_id uuid references public.public_site_videos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  check ((status = 'pending') = (closed_at is null))
);
create unique index tiktok_video_queue_one_pending on public.tiktok_video_queue (rep_id, tiktok_video_id) where status = 'pending';
create index tiktok_video_queue_status_idx on public.tiktok_video_queue (status, created_at);
create index tiktok_video_queue_purge_idx on public.tiktok_video_queue (closed_at) where status <> 'pending';

-- "Can't get this one" for the CURRENT link assignment. Survives the 90-day purge.
-- Cleared when the link leaves every visible slot (slot kind) or by Reopen.
create table public.tiktok_video_dismissals (
  rep_id uuid not null references public.reps(id) on delete cascade,
  tiktok_video_id text not null,
  assignment text not null check (assignment in ('slot','static')),
  source_url text not null check (source_url ~ '^https://www\.tiktok\.com/'),   -- kept for reopen after purge
  slot_keys text[] not null default '{}',
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (rep_id, tiktok_video_id)
);

-- Server-persisted upload tickets (replay-safe completion).
create table public.tiktok_video_upload_tickets (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.tiktok_video_queue(id) on delete set null,
  rep_id uuid not null references public.reps(id) on delete cascade,
  tiktok_video_id text not null,
  operator_rep_id uuid not null references public.reps(id) on delete cascade,
  video_path text not null unique,
  video_content_type text not null check (video_content_type in ('video/mp4','video/quicktime')),
  video_byte_size bigint not null check (video_byte_size between 1 and 52428800),
  poster_staging_path text not null unique,
  poster_staging_content_type text not null check (poster_staging_content_type in ('image/webp','image/jpeg')),
  poster_staging_byte_size bigint not null check (poster_staging_byte_size between 1 and 2097152),
  poster_path text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  consumed_at timestamptz,
  asset_id uuid references public.public_site_videos(id) on delete set null
);
create index tiktok_video_upload_tickets_expiry_idx on public.tiktok_video_upload_tickets (expires_at) where consumed_at is null;

-- Reps whose trigger sync was skipped (busy lock) or failed. Drained by daily maintenance.
create table public.tiktok_queue_reconcile (
  rep_id uuid primary key references public.reps(id) on delete cascade,
  reason text not null check (reason in ('lock_busy','error')),
  attempts int not null default 0,
  last_error text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ===== RLS + grants =====
alter table public.tiktok_hosted_video_gate enable row level security;
alter table public.tiktok_hosted_video_reps enable row level security;
alter table public.public_site_videos enable row level security;
alter table public.tiktok_video_queue enable row level security;
alter table public.tiktok_video_dismissals enable row level security;
alter table public.tiktok_video_upload_tickets enable row level security;
alter table public.tiktok_queue_reconcile enable row level security;

revoke all on table public.tiktok_hosted_video_gate, public.tiktok_hosted_video_reps, public.public_site_videos,
  public.tiktok_video_queue, public.tiktok_video_dismissals, public.tiktok_video_upload_tickets,
  public.tiktok_queue_reconcile from public, anon, authenticated;
grant select, insert, update, delete on table public.tiktok_hosted_video_gate, public.tiktok_hosted_video_reps,
  public.public_site_videos, public.tiktok_video_queue, public.tiktok_video_dismissals,
  public.tiktok_video_upload_tickets, public.tiktok_queue_reconcile to service_role;

-- Reps may read ONLY the status columns of their own rows (Workspace status line).
grant select (rep_id, tiktok_video_id, status) on public.tiktok_video_queue to authenticated;
grant select (rep_id, tiktok_video_id, status) on public.public_site_videos to authenticated;
create policy tiktok_video_queue_own_read on public.tiktok_video_queue for select to authenticated
  using (rep_id = (select r.id from public.reps r where r.auth_user_id = auth.uid()));
create policy public_site_videos_own_read on public.public_site_videos for select to authenticated
  using (rep_id = (select r.id from public.reps r where r.auth_user_id = auth.uid()));

-- ===== URL parsing (full path segments; mirrors media-url.ts host rules) =====
create or replace function public.tiktok_video_id_from_url(p_url text)
returns text language plpgsql immutable set search_path = pg_catalog, public, pg_temp as $$
declare v_host text; v_path text;
begin
  v_host := lower(substring(p_url from '^[Hh][Tt][Tt][Pp][Ss]?://([^/?#:]+)(?::443)?(?:[/?#]|$)'));
  if v_host is null or v_host not in ('tiktok.com','www.tiktok.com') then return null; end if;
  v_path := coalesce(substring(p_url from '^[^:]+://[^/?#]+(/[^?#]*)'), '/');
  return substring(v_path from '^(?:/@[A-Za-z0-9._]{2,24}/video|/video|/player/v1|/embed|/embed/v2)/([0-9]{8,22})/?$');
end $$;

create or replace function public.tiktok_canonical_url(p_url text)
returns text language plpgsql immutable set search_path = pg_catalog, public, pg_temp as $$
declare v_id text := public.tiktok_video_id_from_url(p_url); v_user text;
begin
  if v_id is null then return null; end if;
  v_user := substring(substring(p_url from '^[^:]+://[^/?#]+(/[^?#]*)') from '^/(@[A-Za-z0-9._]{2,24})/video/[0-9]{8,22}/?$');
  return case when v_user is not null then 'https://www.tiktok.com/' || v_user || '/video/' || v_id
              else 'https://www.tiktok.com/embed/v2/' || v_id end;
end $$;

-- Current visible TikTok IDs for a rep (slot rows only). Missing settings row = none.
create or replace function public.tiktok_current_slot_ids(p_rep_id uuid)
returns table (vid text, slot_key text, url text) language sql stable security definer
set search_path = pg_catalog, public, pg_temp as $$
  select public.tiktok_video_id_from_url(e->>'videoUrl'), e->>'key', e->>'videoUrl'
  from public.site_settings s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.homepage_media_slots) = 'array'
                                               then s.homepage_media_slots else '[]'::jsonb end) e
  where s.rep_id = p_rep_id and jsonb_typeof(e) = 'object'
    and e->>'key' in ('showcase','about_2','about_3','about_4')
    and coalesce(e->'isVisible', 'true'::jsonb) <> 'false'::jsonb
    and public.tiktok_video_id_from_url(e->>'videoUrl') is not null
$$;

-- ===== Sync (caller MUST hold the rep lock) =====
create or replace function public.tiktok_sync_locked(p_rep_id uuid, p_origin text default 'slot')
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_active boolean;
begin
  select (r.status = 'active') into v_active from public.reps r where r.id = p_rep_id;
  if not found then return; end if;
  if not public.tiktok_hosted_video_enabled(p_rep_id) then return; end if;

  -- a) A slot dismissal ends when that ID leaves every visible slot (new assignment requeues).
  delete from public.tiktok_video_dismissals d
   where d.rep_id = p_rep_id and d.assignment = 'slot'
     and d.tiktok_video_id not in (select c.vid from public.tiktok_current_slot_ids(p_rep_id) c);

  -- b) Pending items for current IDs with no live asset and no dismissal.
  insert into public.tiktok_video_queue (rep_id, tiktok_video_id, source_url, slot_keys, origin)
  select p_rep_id, w.vid, public.tiktok_canonical_url(w.url), w.keys, p_origin
  from (select c.vid, array_agg(distinct c.slot_key order by c.slot_key) keys, min(c.url) url
          from public.tiktok_current_slot_ids(p_rep_id) c group by c.vid) w
  where v_active
    and not exists (select 1 from public.public_site_videos a where a.rep_id = p_rep_id and a.tiktok_video_id = w.vid and a.status = 'live')
    and not exists (select 1 from public.tiktok_video_dismissals d where d.rep_id = p_rep_id and d.tiktok_video_id = w.vid)
  on conflict (rep_id, tiktok_video_id) where status = 'pending'
  do update set slot_keys = (select coalesce(array_agg(distinct k order by k), '{}')
                               from unnest(public.tiktok_video_queue.slot_keys || excluded.slot_keys) k
                              where k = 'featured_reveal' or k = any(excluded.slot_keys)),
                source_url = excluded.source_url, updated_at = now();

  -- c) Pending item whose ID left the slots but also holds featured_reveal: keep, drop slot keys.
  update public.tiktok_video_queue q set slot_keys = array['featured_reveal'], updated_at = now()
   where q.rep_id = p_rep_id and q.status = 'pending' and 'featured_reveal' = any(q.slot_keys)
     and q.tiktok_video_id not in (select c.vid from public.tiktok_current_slot_ids(p_rep_id) c)
     and q.slot_keys <> array['featured_reveal'];

  -- d) Cancel: inactive rep (all pending), or slot-only items whose ID left every visible slot.
  update public.tiktok_video_queue q
     set status = 'cancelled', closed_at = now(), updated_at = now(),
         cancel_reason = case when not v_active then 'rep_inactive' else 'link_removed' end
   where q.rep_id = p_rep_id and q.status = 'pending'
     and (not v_active
          or (not ('featured_reveal' = any(q.slot_keys))
              and q.tiktok_video_id not in (select c.vid from public.tiktok_current_slot_ids(p_rep_id) c)));
end $$;

create or replace function public.tiktok_sync_rep(p_rep_id uuid, p_origin text default 'slot')
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
  perform public.tiktok_sync_locked(p_rep_id, p_origin);
  delete from public.tiktok_queue_reconcile where rep_id = p_rep_id;
end $$;

-- Never raises, never waits: used by triggers.
create or replace function public.tiktok_queue_try_sync(p_rep_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp set lock_timeout = '250ms' as $$
begin
  begin
    if not public.tiktok_hosted_video_enabled(p_rep_id) then return; end if;
    if pg_try_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id)) then
      perform public.tiktok_sync_locked(p_rep_id, 'slot');
    else
      insert into public.tiktok_queue_reconcile (rep_id, reason) values (p_rep_id, 'lock_busy')
      on conflict (rep_id) do update set last_seen_at = now();
    end if;
  exception when others then
    begin
      insert into public.tiktok_queue_reconcile (rep_id, reason, last_error)
      values (p_rep_id, 'error', left(sqlstate || ' ' || sqlerrm, 500))
      on conflict (rep_id) do update set reason = 'error', last_error = excluded.last_error, last_seen_at = now();
    exception when others then null;  -- the daily full sweep still catches this rep
    end;
  end;
end $$;

create or replace function public.site_settings_tiktok_queue_trigger()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if tg_op = 'DELETE' then perform public.tiktok_queue_try_sync(old.rep_id);
  elsif tg_op = 'INSERT' or new.homepage_media_slots is distinct from old.homepage_media_slots then
    perform public.tiktok_queue_try_sync(new.rep_id);
  end if;
  return null;
end $$;
create trigger site_settings_tiktok_queue
  after insert or update of homepage_media_slots or delete on public.site_settings
  for each row execute function public.site_settings_tiktok_queue_trigger();

create or replace function public.reps_tiktok_queue_trigger()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
begin
  if new.status is distinct from old.status then perform public.tiktok_queue_try_sync(new.id); end if;
  return null;
end $$;
create trigger reps_tiktok_queue after update of status on public.reps
  for each row execute function public.reps_tiktok_queue_trigger();

-- ===== Daily maintenance: full reconcile of every enabled rep, each isolated =====
create or replace function public.tiktok_queue_daily_maintenance()
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_rep_row record; v_ok int := 0; v_failed int := 0;
begin
  for v_rep_row in
    select r.id as rep_id from public.reps r where public.tiktok_hosted_video_enabled(r.id)
  loop
    begin
      perform public.tiktok_sync_rep(v_rep_row.rep_id, 'slot');
      v_ok := v_ok + 1;
    exception when others then
      v_failed := v_failed + 1;
      insert into public.tiktok_queue_reconcile (rep_id, reason, attempts, last_error)
      values (v_rep_row.rep_id, 'error', 1, left(sqlstate || ' ' || sqlerrm, 500))
      on conflict (rep_id) do update set reason = 'error', attempts = public.tiktok_queue_reconcile.attempts + 1,
        last_error = excluded.last_error, last_seen_at = now();
    end;
  end loop;
  return jsonb_build_object('synced', v_ok, 'failed', v_failed);
end $$;

-- ===== Archive / Reopen / Complete (all take the rep lock first) =====
create or replace function public.archive_tiktok_queue_item(p_item_id uuid, p_note text)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_rep uuid; q public.tiktok_video_queue;
begin
  select rep_id into v_rep from public.tiktok_video_queue where id = p_item_id;
  if v_rep is null then raise exception 'queue_item_not_found'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(v_rep));
  select * into q from public.tiktok_video_queue where id = p_item_id for update;
  if q.status <> 'pending' then raise exception 'queue_item_not_pending'; end if;
  update public.tiktok_video_queue set status = 'archived', operator_note = left(p_note, 500),
         closed_at = now(), updated_at = now() where id = q.id;
  insert into public.tiktok_video_dismissals (rep_id, tiktok_video_id, assignment, source_url, slot_keys, note)
  values (q.rep_id, q.tiktok_video_id,
          case when q.slot_keys = array['featured_reveal'] then 'static' else 'slot' end,
          q.source_url, q.slot_keys, left(p_note, 500))
  on conflict (rep_id, tiktok_video_id) do update set note = excluded.note, assignment = excluded.assignment,
    source_url = excluded.source_url, slot_keys = excluded.slot_keys, created_at = now();
end $$;

-- Reopen by (rep, video ID) against the durable dismissal record. Works after the 90-day purge.
-- Same lock order as every writer: rep advisory lock first, then rows.
create or replace function public.reopen_tiktok_dismissal(p_rep_id uuid, p_tiktok_video_id text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare d public.tiktok_video_dismissals; v_new uuid; v_keys text[]; v_url text;
begin
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
  select * into d from public.tiktok_video_dismissals
   where rep_id = p_rep_id and tiktok_video_id = p_tiktok_video_id for update;
  if not found then raise exception 'dismissal_not_found'; end if;
  if not exists (select 1 from public.reps r where r.id = p_rep_id and r.status = 'active') then raise exception 'rep_inactive'; end if;
  if not public.tiktok_hosted_video_enabled(p_rep_id) then raise exception 'rep_not_enabled'; end if;
  -- Current assignment: slot keys from her visible slots now; a static dismissal keeps featured_reveal.
  select array_agg(distinct c.slot_key order by c.slot_key), min(c.url) into v_keys, v_url
    from public.tiktok_current_slot_ids(p_rep_id) c where c.vid = p_tiktok_video_id;
  if d.assignment = 'static' then
    v_keys := (select array_agg(distinct k order by k) from unnest(coalesce(v_keys, '{}') || array['featured_reveal']) k);
  elsif v_keys is null then
    raise exception 'source_missing';   -- slot link no longer on her site
  end if;
  delete from public.tiktok_video_dismissals where rep_id = p_rep_id and tiktok_video_id = p_tiktok_video_id;
  select id into v_new from public.tiktok_video_queue
   where rep_id = p_rep_id and tiktok_video_id = p_tiktok_video_id and status = 'pending';
  if v_new is null then
    insert into public.tiktok_video_queue (rep_id, tiktok_video_id, source_url, slot_keys, origin)
    values (p_rep_id, p_tiktok_video_id, coalesce(public.tiktok_canonical_url(v_url), d.source_url), v_keys, 'reopen')
    returning id into v_new;
  end if;
  return v_new;
end $$;

-- Reopen by queue item id (row not purged). An archived row (dismissal present) hands off to
-- reopen_tiktok_dismissal; a completed or cancelled row requeues the same ID (e.g. re-upload).
create or replace function public.reopen_tiktok_queue_item(p_item_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_rep uuid; q public.tiktok_video_queue; v_new uuid;
begin
  select rep_id into v_rep from public.tiktok_video_queue where id = p_item_id;
  if v_rep is null then raise exception 'queue_item_not_found'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(v_rep));
  select * into q from public.tiktok_video_queue where id = p_item_id for update;
  if q.status not in ('archived','completed','cancelled') then raise exception 'queue_item_not_closed'; end if;
  if exists (select 1 from public.tiktok_video_dismissals d where d.rep_id = q.rep_id and d.tiktok_video_id = q.tiktok_video_id) then
    return public.reopen_tiktok_dismissal(q.rep_id, q.tiktok_video_id);   -- same rep lock, re-entrant
  end if;
  if not exists (select 1 from public.reps r where r.id = q.rep_id and r.status = 'active') then raise exception 'rep_inactive'; end if;
  if not public.tiktok_hosted_video_enabled(q.rep_id) then raise exception 'rep_not_enabled'; end if;
  select id into v_new from public.tiktok_video_queue
   where rep_id = q.rep_id and tiktok_video_id = q.tiktok_video_id and status = 'pending';
  if v_new is null then
    insert into public.tiktok_video_queue (rep_id, tiktok_video_id, source_url, slot_keys, origin)
    values (q.rep_id, q.tiktok_video_id, q.source_url, q.slot_keys, 'reopen') returning id into v_new;
  end if;
  return v_new;
end $$;

create or replace function public.complete_tiktok_queue_item(
  p_ticket_id uuid, p_operator_rep_id uuid, p_video_mime text, p_video_bytes bigint,
  p_width int, p_height int, p_duration numeric, p_method text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare t public.tiktok_video_upload_tickets; q public.tiktok_video_queue; v_rep uuid; v_asset uuid;
begin
  select rep_id into v_rep from public.tiktok_video_upload_tickets where id = p_ticket_id;
  if v_rep is null then raise exception 'ticket_not_found'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(v_rep));
  select * into t from public.tiktok_video_upload_tickets where id = p_ticket_id for update;
  if t.operator_rep_id <> p_operator_rep_id then raise exception 'ticket_mismatch'; end if;
  if t.consumed_at is not null then
    return jsonb_build_object('assetId', t.asset_id, 'replayed', true);   -- lost-response replay
  end if;
  if t.expires_at < now() then raise exception 'ticket_expired'; end if;
  if p_video_mime <> t.video_content_type or p_video_bytes <> t.video_byte_size then raise exception 'ticket_mismatch'; end if;
  select * into q from public.tiktok_video_queue where id = t.item_id for update;
  if not found or q.status <> 'pending' or q.rep_id <> t.rep_id or q.tiktok_video_id <> t.tiktok_video_id then
    raise exception 'queue_item_not_pending';
  end if;
  if not exists (select 1 from public.reps r where r.id = q.rep_id and r.status = 'active') then raise exception 'rep_inactive'; end if;
  if not public.tiktok_hosted_video_enabled(q.rep_id) then raise exception 'rep_not_enabled'; end if;
  if not ('featured_reveal' = any(q.slot_keys))
     and q.tiktok_video_id not in (select c.vid from public.tiktok_current_slot_ids(q.rep_id) c) then
    raise exception 'source_changed';
  end if;
  update public.public_site_videos set status = 'superseded', superseded_at = now()
   where rep_id = q.rep_id and tiktok_video_id = q.tiktok_video_id and status = 'live';
  insert into public.public_site_videos (rep_id, tiktok_video_id, source_url, storage_path, poster_path, mime_type,
    byte_size, width, height, duration_seconds, source_method, created_by_rep_id)
  values (q.rep_id, q.tiktok_video_id, q.source_url, t.video_path, t.poster_path, t.video_content_type,
    t.video_byte_size, p_width, p_height, p_duration, p_method, p_operator_rep_id)
  returning id into v_asset;
  update public.tiktok_video_queue set status = 'completed', asset_id = v_asset, closed_at = now(), updated_at = now() where id = q.id;
  delete from public.tiktok_video_dismissals where rep_id = q.rep_id and tiktok_video_id = q.tiktok_video_id;
  update public.tiktok_video_upload_tickets set consumed_at = now(), asset_id = v_asset where id = t.id;
  return jsonb_build_object('assetId', v_asset, 'replayed', false);
end $$;

-- ===== Cleanup helpers (exact keys only; never a bucket listing) =====
-- Purge closed queue rows > 90 days. Returns thumbnail keys no longer referenced anywhere.
create or replace function public.tiktok_queue_purge_closed()
returns table (purged_count int, thumb_paths text[]) language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare v_count int; v_paths text[];
begin
  with del as (
    delete from public.tiktok_video_queue
     where status <> 'pending' and closed_at < now() - interval '90 days'
     returning pending_poster_path
  )
  select count(*)::int, coalesce(array_agg(distinct pending_poster_path)
    filter (where pending_poster_path is not null), '{}') into v_count, v_paths from del;

  -- A later statement sees the deletion before checking remaining references.
  return query select v_count, coalesce(array_agg(path), '{}')
    from unnest(v_paths) path
    where not exists (select 1 from public.tiktok_video_queue q where q.pending_poster_path = path)
      and not exists (select 1 from public.public_site_videos a
                       where a.storage_path = path or a.poster_path = path);
end $$;

-- Expired, never-consumed tickets older than expiry + 24 h. Keys referenced by any asset (any status) are excluded.
create or replace function public.tiktok_expired_ticket_keys()
returns table (ticket_id uuid, keys text[]) language sql stable security definer
set search_path = pg_catalog, public, pg_temp as $$
  select t.id, array_remove(array[
           case when not exists (select 1 from public.public_site_videos a where a.storage_path = t.video_path or a.poster_path = t.video_path) then t.video_path end,
           t.poster_staging_path,
           case when not exists (select 1 from public.public_site_videos a where a.storage_path = t.poster_path or a.poster_path = t.poster_path) then t.poster_path end
         ], null)
  from public.tiktok_video_upload_tickets t
  where t.consumed_at is null and t.expires_at < now() - interval '24 hours'
$$;

-- Static item (Brittany's hardcoded featured reveal). Backfill only. Under the rep lock.
create or replace function public.tiktok_queue_add_static(p_rep_id uuid, p_url text)
returns text language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_vid text := public.tiktok_video_id_from_url(p_url);
begin
  if v_vid is null then return 'skipped_no_id'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
  if not public.tiktok_hosted_video_enabled(p_rep_id) then return 'skipped_not_enabled'; end if;
  if not exists (select 1 from public.reps r where r.id = p_rep_id and r.status = 'active') then return 'skipped_inactive'; end if;
  if exists (select 1 from public.public_site_videos a where a.rep_id = p_rep_id and a.tiktok_video_id = v_vid and a.status = 'live')
     or exists (select 1 from public.tiktok_video_dismissals d where d.rep_id = p_rep_id and d.tiktok_video_id = v_vid) then
    return 'skipped_done_or_archived';
  end if;
  insert into public.tiktok_video_queue (rep_id, tiktok_video_id, source_url, slot_keys, origin)
  values (p_rep_id, v_vid, public.tiktok_canonical_url(p_url), array['featured_reveal'], 'static')
  on conflict (rep_id, tiktok_video_id) where status = 'pending'
  do update set slot_keys = (select array_agg(distinct k order by k)
                               from unnest(public.tiktok_video_queue.slot_keys || array['featured_reveal']) k),
                updated_at = now();
  return 'queued_or_merged';
end $$;

-- ===== Function privileges =====
revoke all on function public.tiktok_hosted_video_enabled(uuid), public.tiktok_queue_lock_key(uuid),
  public.tiktok_video_id_from_url(text), public.tiktok_canonical_url(text), public.tiktok_current_slot_ids(uuid),
  public.tiktok_sync_locked(uuid,text), public.tiktok_sync_rep(uuid,text), public.tiktok_queue_try_sync(uuid),
  public.site_settings_tiktok_queue_trigger(), public.reps_tiktok_queue_trigger(),
  public.tiktok_queue_daily_maintenance(), public.archive_tiktok_queue_item(uuid,text),
  public.reopen_tiktok_queue_item(uuid), public.reopen_tiktok_dismissal(uuid,text), public.complete_tiktok_queue_item(uuid,uuid,text,bigint,int,int,numeric,text),
  public.tiktok_queue_purge_closed(), public.tiktok_expired_ticket_keys(), public.tiktok_queue_add_static(uuid,text)
  from public, anon, authenticated;
grant execute on function public.tiktok_hosted_video_enabled(uuid), public.tiktok_current_slot_ids(uuid), public.tiktok_sync_rep(uuid,text),
  public.tiktok_queue_daily_maintenance(), public.archive_tiktok_queue_item(uuid,text),
  public.reopen_tiktok_queue_item(uuid), public.reopen_tiktok_dismissal(uuid,text), public.complete_tiktok_queue_item(uuid,uuid,text,bigint,int,int,numeric,text),
  public.tiktok_queue_purge_closed(), public.tiktok_expired_ticket_keys(), public.tiktok_queue_add_static(uuid,text),
  public.tiktok_video_id_from_url(text), public.tiktok_canonical_url(text) to service_role;
-- Trigger functions are granted to nobody (triggers fire regardless of EXECUTE).

-- ===== Bucket: public, no storage.objects policies; verify if it already exists =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-site-videos', 'public-site-videos', true, 52428800,
        array['video/mp4','video/quicktime','image/webp','image/jpeg'])
on conflict (id) do nothing;
do $$ begin
  if not exists (
    select 1 from storage.buckets b
    where b.id = 'public-site-videos' and b.public = true and b.file_size_limit = 52428800
      and b.allowed_mime_types @> array['video/mp4','video/quicktime','image/webp','image/jpeg']
      and array['video/mp4','video/quicktime','image/webp','image/jpeg'] @> b.allowed_mime_types) then
    raise exception 'public-site-videos bucket exists with different settings; stop and report';
  end if;
end $$;
