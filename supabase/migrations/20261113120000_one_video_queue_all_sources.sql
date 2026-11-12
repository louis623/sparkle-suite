-- Extend the existing queue in place. No slot is enrolled by this migration.
alter table public.tiktok_hosted_video_reps add column all_sources_enabled boolean not null default false,
 add column rollback_managed_slots jsonb not null default '{}'::jsonb;
create function public.video_all_sources(p_rep_id uuid) returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select public.tiktok_hosted_video_enabled(p_rep_id) and exists(select 1 from public.tiktok_hosted_video_reps where rep_id=p_rep_id and all_sources_enabled)
$$;
revoke all on function public.video_all_sources(uuid) from public,anon,authenticated;
grant execute on function public.video_all_sources(uuid) to service_role;

create function public.queue_video_link(u text) returns jsonb language plpgsql immutable strict
set search_path=pg_catalog,public,pg_temp as $$
declare host text; path text; params text; id text; provider text; canonical text; parts text[]; nested text;
begin
 if u !~* '^https?://[a-z0-9.-]+(:443)?([/?#]|$)' or u ~ '[[:space:]\\]' then return null; end if;
 if lower(substring(u from '^[^:]+://([^/:?#]+)')) in ('www.youtu.be','www.m.youtube.com','www.fb.watch','www.l.instagram.com') then return null; end if;
 host := regexp_replace(lower(substring(u from '^[^:]+://([^/:?#]+)')),'^www\.','');
 path := regexp_replace(coalesce(substring(u from '^[^:]+://[^/?#]+(/[^?#]*)'),''),'/$','');
 params := substring(split_part(u,'#',1) from '\?([^#]*)');
 if host='tiktok.com' then
  provider:='tiktok'; id:=public.tiktok_video_id_from_url(u); canonical:=public.tiktok_canonical_url(u);
 elsif host in ('youtube.com','m.youtube.com','youtu.be','youtube-nocookie.com') then
  provider:='youtube';
  if host='youtu.be' then id:=substring(path from '^/([A-Za-z0-9_-]{11})$');
  elsif path='/watch' then id:=substring(params from '(?:^|&)v=([A-Za-z0-9_-]{11})(?:&|$)');
  else id:=substring(path from '^/(?:shorts|embed|live)/([A-Za-z0-9_-]{11})$'); end if;
  canonical:='https://www.youtube.com/watch?v='||id;
 elsif host='instagram.com' then
  provider:='instagram'; parts:=regexp_match(path,'^/(?:[A-Za-z0-9._]+/)?(reels?|p)/([a-zA-Z0-9_-]{5,32})(?:/embed)?$');
  if path ~ '^/(stories|tv)/' or path ~ '^/[^/]+/reels/' then return null; end if;
  id:=parts[2]; canonical:='https://www.instagram.com/'||case when parts[1]='p' then 'p' else 'reel' end||'/'||id||'/';
 elsif host='facebook.com' then
  provider:='facebook';
  if path ~ '^/groups/' then return null; end if;
  if path='/plugins/video.php' then
   nested:=substring(params from '(?:^|&)href=([^&]+)');
   nested:=replace(replace(replace(replace(replace(nested,'%3A',':'),'%2F','/'),'%3F','?'),'%3D','='),'%26','&');
   if nested ~* '^https?://(www\.)?facebook\.com/(reel/|watch[/?]|videos/|[A-Za-z0-9._-]+/videos/)' then return public.queue_video_link(nested); end if;
   return null;
  elsif path='/watch' then id:=substring(params from '(?:^|&)v=([0-9]{5,25})(?:&|$)');
  else id:=substring(path from '^/(?:reel|videos|[A-Za-z0-9._-]+/videos)/([0-9]{5,25})$'); end if;
  canonical:='https://www.facebook.com/watch/?v='||id;
 end if;
 if id is null then return null; end if;
 return jsonb_build_object('provider',provider,'id',id,'canonical',canonical);
end $$;

create function public.queue_video_link_error(u text) returns text language sql immutable as $$
 select case when public.queue_video_link(u) is not null then null
 when u ~* '^https?://(fb\.watch|l\.instagram\.com)(:443)?([/?#]|$)' or u ~* '^https?://(www\.)?(instagram|facebook)\.com(:443)?/share([/?#]|$)' then 'Open the video and copy the full link.'
 when u ~* '^https?://(www\.)?facebook\.com(:443)?([/?#]|$)' then 'Paste a Facebook video or Reel link.'
 else 'This needs a public TikTok, YouTube, Instagram, or Facebook video link.' end
$$;
create function public.is_queued_video_url(u text) returns boolean language sql immutable as $$
 select coalesce(public.queue_video_link(u) is not null or u ~* '^https?://(www\.|vm\.|vt\.)?tiktok\.com(:443)?([/?#]|$)', false)
$$;

do $$ declare t text; c record; begin
 foreach t in array array['tiktok_video_queue','public_site_videos','tiktok_video_dismissals','tiktok_video_upload_tickets'] loop
  for c in select conname from pg_constraint where conrelid=format('public.%I',t)::regclass and contype='c'
    and (pg_get_constraintdef(oid) like '%tiktok_video_id ~%' or pg_get_constraintdef(oid) like '%source_url ~%') loop
   execute format('alter table public.%I drop constraint %I',t,c.conname);
  end loop;
  execute format($ddl$alter table public.%I add source_provider text not null default 'tiktok',
   add check(case source_provider when 'tiktok' then tiktok_video_id ~ '^[0-9]{8,22}$'
    when 'youtube' then tiktok_video_id ~ '^[a-zA-Z0-9_-]{11}$'
    when 'instagram' then tiktok_video_id ~ '^[a-zA-Z0-9_-]{5,32}$'
    when 'facebook' then tiktok_video_id ~ '^[0-9]{5,25}$' else false end)$ddl$,t);
  if t <> 'tiktok_video_upload_tickets' then
   execute format($ddl$alter table public.%I add check(coalesce(source_url ~ '^https://' and
    public.queue_video_link(source_url)->>'provider'=source_provider and public.queue_video_link(source_url)->>'id'=tiktok_video_id,false))$ddl$,t);
  end if;
 end loop;
end $$;
create unique index queue_provider_pending on public.tiktok_video_queue(rep_id,source_provider,tiktok_video_id) where status='pending';
create unique index video_provider_live on public.public_site_videos(rep_id,source_provider,tiktok_video_id) where status='live';
drop index public.tiktok_video_queue_one_pending, public.public_site_videos_one_live;
alter index public.queue_provider_pending rename to tiktok_video_queue_one_pending;
alter index public.video_provider_live rename to public_site_videos_one_live;
alter table public.tiktok_video_dismissals drop constraint tiktok_video_dismissals_pkey, add primary key(rep_id,source_provider,tiktok_video_id);
grant select(source_provider) on public.public_site_videos,public.tiktok_video_queue to authenticated;

create table public.tiktok_video_preserved_assignments(
 rep_id uuid not null references public.reps(id) on delete cascade, slot_key text not null,
 source_provider text not null, source_id text not null, created_at timestamptz not null default now(), primary key(rep_id,slot_key)
);
alter table public.tiktok_video_preserved_assignments enable row level security;
revoke all on public.tiktok_video_preserved_assignments from public,anon,authenticated,service_role;
grant select on public.tiktok_video_preserved_assignments to authenticated,service_role;
create policy preserved_own_read on public.tiktok_video_preserved_assignments for select to authenticated using
 (rep_id=(select id from public.reps where auth_user_id=auth.uid()));
-- Non-parseable legacy assignments retain the exact saved URL as a comparison key.
create function public.video_is_preserved(r uuid,k text,u text) returns boolean language sql stable security definer
set search_path=pg_catalog,public,pg_temp as $$
 select exists(select 1 from public.tiktok_video_preserved_assignments where rep_id=r and slot_key=k
 and source_provider=coalesce(public.queue_video_link(u)->>'provider','legacy') and source_id=coalesce(public.queue_video_link(u)->>'id',u))
$$;
create function public.set_all_sources_enabled(p_rep_id uuid,p_enabled boolean) returns void language plpgsql security definer
set search_path=pg_catalog,public,pg_temp as $$
declare previous boolean; managed_slots jsonb; begin
 perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
 select all_sources_enabled,rollback_managed_slots into previous,managed_slots from public.tiktok_hosted_video_reps where rep_id=p_rep_id for update;
 if not found then raise exception 'rep_not_enabled'; end if;
 if previous=p_enabled then return; end if;
 perform 1 from public.site_settings where rep_id=p_rep_id for update;
 if p_enabled then
  insert into public.tiktok_video_preserved_assignments(rep_id,slot_key,source_provider,source_id)
  select p_rep_id,e->>'key',coalesce(v->>'provider','legacy'),coalesce(v->>'id',e->>'videoUrl') from public.site_settings s
  cross join lateral jsonb_array_elements(s.homepage_media_slots) e cross join lateral public.queue_video_link(e->>'videoUrl') v
  where s.rep_id=p_rep_id and e->>'key' in ('showcase','about_2','about_3','about_4')
  and e->>'videoUrl' ~* '^https?://' and e->>'videoUrl' !~* '^https?://(www\.|vm\.|vt\.)?tiktok\.com/'
  and (managed_slots->(e->>'key')) is distinct from jsonb_build_array(v->>'provider',v->>'id')
  on conflict(rep_id,slot_key) do update set source_provider=excluded.source_provider,source_id=excluded.source_id;
  managed_slots:='{}';
 else
  select coalesce(jsonb_object_agg(e->>'key',jsonb_build_array(v->>'provider',v->>'id')),'{}') into managed_slots
  from public.site_settings s cross join lateral jsonb_array_elements(s.homepage_media_slots) e
  cross join lateral public.queue_video_link(e->>'videoUrl') v
  where s.rep_id=p_rep_id and e->>'key' in ('showcase','about_2','about_3','about_4')
   and v->>'provider'<>'tiktok' and not public.video_is_preserved(p_rep_id,e->>'key',e->>'videoUrl');
 end if;
 update public.tiktok_hosted_video_reps set all_sources_enabled=p_enabled, rollback_managed_slots=managed_slots where rep_id=p_rep_id;
end $$;
drop function public.tiktok_current_slot_ids(uuid);
create function public.tiktok_current_slot_ids(p_rep_id uuid) returns table(vid text,slot_key text,url text,source_provider text,preserved boolean)
language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select v->>'id',e->>'key',e->>'videoUrl',v->>'provider',public.video_is_preserved(p_rep_id,e->>'key',e->>'videoUrl')
 from public.site_settings s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.homepage_media_slots)='array' then s.homepage_media_slots else '[]' end) e
 cross join lateral public.queue_video_link(e->>'videoUrl') v
 where s.rep_id=p_rep_id and e->>'key' in ('showcase','about_2','about_3','about_4') and coalesce(e->'isVisible','true')<>'false'
 and v is not null and (v->>'provider'='tiktok' or public.video_all_sources(p_rep_id))
$$;
create function public.video_backfill_slots(p_rep_id uuid,p_slots text[]) returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
 if not public.video_all_sources(p_rep_id) or not exists(select 1 from public.reps where id=p_rep_id and status='active') then raise exception 'rep_not_enabled'; end if;
 if coalesce(cardinality(p_slots),0)=0 or not p_slots <@ array['showcase','about_2','about_3','about_4'] then raise exception 'invalid_video_slot'; end if;
 delete from public.tiktok_video_preserved_assignments p where rep_id=p_rep_id and slot_key=any(p_slots)
 and exists(select 1 from public.tiktok_current_slot_ids(p_rep_id) c where c.slot_key=p.slot_key and c.preserved);
 perform public.tiktok_sync_rep(p_rep_id,'backfill');
end $$;
revoke all on function public.video_backfill_slots(uuid,text[]), public.video_is_preserved(uuid,text,text),public.set_all_sources_enabled(uuid,boolean),public.tiktok_current_slot_ids(uuid) from public,anon,authenticated,service_role;
grant execute on function public.video_backfill_slots(uuid,text[]),public.set_all_sources_enabled(uuid,boolean),public.tiktok_current_slot_ids(uuid) to service_role;
create or replace function public.tiktok_sync_locked(p_rep_id uuid, p_origin text default 'slot')
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_active boolean;
begin
  select (r.status = 'active') into v_active from public.reps r where r.id = p_rep_id;
  if not found then return; end if;
  if not public.tiktok_hosted_video_enabled(p_rep_id) then return; end if;

  -- a) A slot dismissal ends when that ID leaves every visible slot (new assignment requeues).
  delete from public.tiktok_video_dismissals d
   where d.rep_id = p_rep_id and d.assignment = 'slot' and (source_provider='tiktok' or public.video_all_sources(p_rep_id))
     and (d.source_provider,d.tiktok_video_id) not in (select c.source_provider,c.vid from public.tiktok_current_slot_ids(p_rep_id) c where not c.preserved);

  -- b) Pending items for current IDs with no live asset and no dismissal.
  insert into public.tiktok_video_queue (rep_id, source_provider, tiktok_video_id, source_url, slot_keys, origin)
  select p_rep_id, w.source_provider, w.vid, public.queue_video_link(w.url)->>'canonical', w.keys, p_origin
  from (select c.source_provider,c.vid, array_agg(distinct c.slot_key order by c.slot_key) keys, min(c.url) url
          from public.tiktok_current_slot_ids(p_rep_id) c where not c.preserved group by c.source_provider,c.vid) w
  where v_active
    and not exists (select 1 from public.public_site_videos a where a.rep_id = p_rep_id and a.source_provider=w.source_provider and a.tiktok_video_id = w.vid and a.status = 'live')
    and not exists (select 1 from public.tiktok_video_dismissals d where d.rep_id = p_rep_id and d.source_provider=w.source_provider and d.tiktok_video_id = w.vid)
  on conflict (rep_id, source_provider,tiktok_video_id) where status = 'pending'
  do update set slot_keys = (select coalesce(array_agg(distinct k order by k), '{}')
                               from unnest(public.tiktok_video_queue.slot_keys || excluded.slot_keys) k
                              where k = 'featured_reveal' or k = any(excluded.slot_keys)),
                source_url = excluded.source_url, updated_at = now();

  -- c) Pending item whose ID left the slots but also holds featured_reveal: keep, drop slot keys.
  update public.tiktok_video_queue q set slot_keys = array['featured_reveal'], updated_at = now()
   where q.rep_id = p_rep_id and q.status = 'pending' and (source_provider='tiktok' or public.video_all_sources(p_rep_id)) and 'featured_reveal' = any(q.slot_keys)
     and (q.source_provider,q.tiktok_video_id) not in (select c.source_provider,c.vid from public.tiktok_current_slot_ids(p_rep_id) c where not c.preserved)
     and q.slot_keys <> array['featured_reveal'];

  -- d) Cancel: inactive rep (all pending), or slot-only items whose ID left every visible slot.
  update public.tiktok_video_queue q
     set status = 'cancelled', closed_at = now(), updated_at = now(),
         cancel_reason = case when not v_active then 'rep_inactive' else 'link_removed' end
   where q.rep_id = p_rep_id and q.status = 'pending' and (source_provider='tiktok' or public.video_all_sources(p_rep_id))
     and (not v_active
          or (not ('featured_reveal' = any(q.slot_keys))
              and (q.source_provider,q.tiktok_video_id) not in (select c.source_provider,c.vid from public.tiktok_current_slot_ids(p_rep_id) c where not c.preserved)));
end $$;

create or replace function public.archive_tiktok_queue_item(p_item_id uuid, p_note text)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_rep uuid; q public.tiktok_video_queue;
begin
  select rep_id into v_rep from public.tiktok_video_queue where id = p_item_id;
  if v_rep is null then raise exception 'queue_item_not_found'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(v_rep));
  select * into q from public.tiktok_video_queue where id = p_item_id for update;
  if q.source_provider <> 'tiktok' and not public.video_all_sources(v_rep) then raise exception 'rep_not_enabled'; end if;
  if q.status not in ('pending', 'completed') then raise exception 'queue_item_not_pending'; end if;
  update public.tiktok_video_queue set status = 'archived', operator_note = left(p_note, 500),
         closed_at = now(), updated_at = now() where id = q.id;
  insert into public.tiktok_video_dismissals (rep_id, source_provider,tiktok_video_id, assignment, source_url, slot_keys, note)
  values (q.rep_id,q.source_provider, q.tiktok_video_id,
          case when 'featured_reveal' = any(q.slot_keys) then 'static' else 'slot' end,
          q.source_url, q.slot_keys, left(p_note, 500))
  on conflict (rep_id,source_provider,tiktok_video_id) do update set note = excluded.note, assignment = excluded.assignment,
    source_url = excluded.source_url, slot_keys = excluded.slot_keys, created_at = now();
end $$;

drop function public.reopen_tiktok_dismissal(uuid,text);

create or replace function public.reopen_tiktok_dismissal(p_rep_id uuid, p_tiktok_video_id text,p_provider text default 'tiktok')
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare d public.tiktok_video_dismissals; v_new uuid; v_keys text[]; v_url text;
begin
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
  select * into d from public.tiktok_video_dismissals
   where rep_id = p_rep_id and source_provider=p_provider and tiktok_video_id = p_tiktok_video_id for update;
  if p_provider <> 'tiktok' and not public.video_all_sources(p_rep_id) then raise exception 'rep_not_enabled'; end if;
  if d.rep_id is null then raise exception 'dismissal_not_found'; end if;
  if not exists (select 1 from public.reps r where r.id = p_rep_id and r.status = 'active') then raise exception 'rep_inactive'; end if;
  if not public.tiktok_hosted_video_enabled(p_rep_id) then raise exception 'rep_not_enabled'; end if;
  -- Current assignment: slot keys from her visible slots now; a static dismissal keeps featured_reveal.
  select array_agg(distinct c.slot_key order by c.slot_key), min(c.url) into v_keys, v_url
    from public.tiktok_current_slot_ids(p_rep_id) c where not c.preserved and c.source_provider=p_provider and c.vid = p_tiktok_video_id;
  if d.assignment = 'static' then
    v_keys := (select array_agg(distinct k order by k) from unnest(coalesce(v_keys, '{}') || array['featured_reveal']) k);
  elsif v_keys is null then
    raise exception 'source_missing';   -- slot link no longer on her site
  end if;
  delete from public.tiktok_video_dismissals where rep_id = p_rep_id and source_provider=p_provider and tiktok_video_id = p_tiktok_video_id;
  select id into v_new from public.tiktok_video_queue
   where rep_id = p_rep_id and source_provider=p_provider and tiktok_video_id = p_tiktok_video_id and status = 'pending';
  if v_new is null then
    insert into public.tiktok_video_queue (rep_id, source_provider,tiktok_video_id, source_url, slot_keys, origin)
    values (p_rep_id,p_provider, p_tiktok_video_id, coalesce(public.queue_video_link(v_url)->>'canonical', d.source_url), v_keys, 'reopen')
    returning id into v_new;
  end if;
  return v_new;
end $$;

revoke all on function public.reopen_tiktok_dismissal(uuid,text,text) from public,anon,authenticated; grant execute on function public.reopen_tiktok_dismissal(uuid,text,text) to service_role;

create or replace function public.reopen_tiktok_queue_item(p_item_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_rep uuid; q public.tiktok_video_queue; v_new uuid;
begin
  select rep_id into v_rep from public.tiktok_video_queue where id = p_item_id;
  if v_rep is null then raise exception 'queue_item_not_found'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(v_rep));
  select * into q from public.tiktok_video_queue where id = p_item_id for update;
  if q.source_provider <> 'tiktok' and not public.video_all_sources(v_rep) then raise exception 'rep_not_enabled'; end if;
  if q.status not in ('archived','completed','cancelled') then raise exception 'queue_item_not_closed'; end if;
  if exists (select 1 from public.tiktok_video_dismissals d where d.rep_id = q.rep_id and d.source_provider=q.source_provider and d.tiktok_video_id = q.tiktok_video_id) then
    return public.reopen_tiktok_dismissal(q.rep_id, q.tiktok_video_id,q.source_provider);   -- same rep lock, re-entrant
  end if;
  if not exists (select 1 from public.reps r where r.id = q.rep_id and r.status = 'active') then raise exception 'rep_inactive'; end if;
  if not public.tiktok_hosted_video_enabled(q.rep_id) then raise exception 'rep_not_enabled'; end if;
  select id into v_new from public.tiktok_video_queue
   where rep_id = q.rep_id and source_provider=q.source_provider and tiktok_video_id = q.tiktok_video_id and status = 'pending';
  if v_new is null then
    insert into public.tiktok_video_queue (rep_id,source_provider, tiktok_video_id, source_url, slot_keys, origin)
    values (q.rep_id,q.source_provider, q.tiktok_video_id, q.source_url, q.slot_keys, 'reopen') returning id into v_new;
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
  if not found or q.status <> 'pending' or q.source_provider <> t.source_provider or q.rep_id <> t.rep_id or q.tiktok_video_id <> t.tiktok_video_id then
    raise exception 'queue_item_not_pending';
  end if;
  if not exists (select 1 from public.reps r where r.id = q.rep_id and r.status = 'active') then raise exception 'rep_inactive'; end if;
  if (q.source_provider <> 'tiktok' and not public.video_all_sources(q.rep_id)) or not public.tiktok_hosted_video_enabled(q.rep_id) then raise exception 'rep_not_enabled'; end if;
  if not ('featured_reveal' = any(q.slot_keys))
     and (q.source_provider,q.tiktok_video_id) not in (select c.source_provider,c.vid from public.tiktok_current_slot_ids(q.rep_id) c where not c.preserved) then
    raise exception 'source_changed';
  end if;
  update public.public_site_videos set status = 'superseded', superseded_at = now()
   where rep_id = q.rep_id and source_provider=q.source_provider and tiktok_video_id = q.tiktok_video_id and status = 'live';
  insert into public.public_site_videos (rep_id, source_provider,tiktok_video_id, source_url, storage_path, poster_path, mime_type,
    byte_size, width, height, duration_seconds, source_method, created_by_rep_id)
  values (q.rep_id,q.source_provider, q.tiktok_video_id, q.source_url, t.video_path, t.poster_path, t.video_content_type,
    t.video_byte_size, p_width, p_height, p_duration, p_method, p_operator_rep_id)
  returning id into v_asset;
  update public.tiktok_video_queue set status = 'completed', asset_id = v_asset, closed_at = now(), updated_at = now() where id = q.id;
  delete from public.tiktok_video_dismissals where rep_id = q.rep_id and source_provider=q.source_provider and tiktok_video_id = q.tiktok_video_id;
  update public.tiktok_video_upload_tickets set consumed_at = now(), asset_id = v_asset where id = t.id;
  return jsonb_build_object('assetId', v_asset, 'replayed', false);
end $$;

create or replace function public.tiktok_queue_add_static(p_rep_id uuid, p_url text)
returns text language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_vid text := public.tiktok_video_id_from_url(p_url);
begin
  if v_vid is null then return 'skipped_no_id'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
  if not public.tiktok_hosted_video_enabled(p_rep_id) then return 'skipped_not_enabled'; end if;
  if not exists (select 1 from public.reps r where r.id = p_rep_id and r.status = 'active') then return 'skipped_inactive'; end if;
  if exists (select 1 from public.public_site_videos a where a.rep_id = p_rep_id and a.source_provider='tiktok' and a.tiktok_video_id = v_vid and a.status = 'live')
     or exists (select 1 from public.tiktok_video_dismissals d where d.rep_id = p_rep_id and d.source_provider='tiktok' and d.tiktok_video_id = v_vid) then
    return 'skipped_done_or_archived';
  end if;
  insert into public.tiktok_video_queue (rep_id, tiktok_video_id, source_url, slot_keys, origin)
  values (p_rep_id, v_vid, public.tiktok_canonical_url(p_url), array['featured_reveal'], 'static')
  on conflict (rep_id,source_provider,tiktok_video_id) where status = 'pending'
  do update set slot_keys = (select array_agg(distinct k order by k)
                               from unnest(public.tiktok_video_queue.slot_keys || array['featured_reveal']) k),
                updated_at = now();
  return 'queued_or_merged';
end $$;

create or replace function public.tiktok_slot_clear_guard()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare old_slot jsonb; new_url text; old_url text; vid text; link jsonb; replacement jsonb; managed boolean:=public.video_all_sources(new.rep_id); q record;
begin
  if not public.tiktok_hosted_video_enabled(new.rep_id) then return new; end if;
  for old_slot in select value from jsonb_array_elements(
    case when jsonb_typeof(old.homepage_media_slots)='array' then old.homepage_media_slots else '[]'::jsonb end)
  loop
    if old_slot->>'key' not in ('showcase','about_2','about_3','about_4') then continue; end if;
    old_url := coalesce(old_slot->>'videoUrl','');
    select coalesce(e->>'videoUrl','') into new_url from jsonb_array_elements(
      case when jsonb_typeof(new.homepage_media_slots)='array' then new.homepage_media_slots else '[]'::jsonb end) e
      where e->>'key'=old_slot->>'key' limit 1;
    new_url := coalesce(new_url,'');
    link:=public.queue_video_link(old_url); replacement:=public.queue_video_link(new_url); vid:=link->>'id';
    if managed and public.video_is_preserved(new.rep_id,old_slot->>'key',old_url) then
      if old_url<>new_url and (vid is null or (link->>'provider',vid) is distinct from (replacement->>'provider',replacement->>'id')) then
        delete from public.tiktok_video_preserved_assignments where rep_id=new.rep_id and slot_key=old_slot->>'key';
      end if;
      continue;
    end if;
    if managed and not public.is_queued_video_url(old_url) then continue; end if;
    if not managed and old_url !~* '^https?://(www\.|vm\.|vt\.)?tiktok\.com/' then continue; end if;
    if new_url <> '' and new_url is distinct from old_url
      and (vid is null or (replacement->>'provider',replacement->>'id') is distinct from (link->>'provider',vid))
    then raise exception 'tiktok_remove_before_replace' using errcode='23514'; end if;
    if new_url = '' and vid is not null then
      perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(new.rep_id));
      -- Shared IDs still used in another slot keep their one shared queue item.
      if exists (select 1 from jsonb_array_elements(
        case when jsonb_typeof(new.homepage_media_slots)='array' then new.homepage_media_slots else '[]'::jsonb end) e
        where e->>'key' in ('showcase','about_2','about_3','about_4')
          and public.queue_video_link(e->>'videoUrl')->>'id'=vid and public.queue_video_link(e->>'videoUrl')->>'provider'=link->>'provider' and not public.video_is_preserved(new.rep_id,e->>'key',e->>'videoUrl')
          and coalesce(e->'isVisible','true'::jsonb)<>'false'::jsonb) then continue; end if;
      for q in select id from public.tiktok_video_queue
        where rep_id=new.rep_id and source_provider=link->>'provider' and tiktok_video_id=vid and status in ('pending','completed')
        order by created_at
      loop
        perform public.archive_tiktok_queue_item(q.id,'Removed from Workspace');
      end loop;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.remove_tiktok_slot(p_rep_id uuid,p_slot_key text,p_expected_url text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare slots jsonb; current_url text;
begin
  if p_slot_key not in ('showcase','about_2','about_3','about_4') then raise exception 'invalid_video_slot'; end if;
  if not public.tiktok_hosted_video_enabled(p_rep_id) then raise exception 'rep_not_enabled'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
  select homepage_media_slots into slots from public.site_settings where rep_id=p_rep_id for update;
  select e->>'videoUrl' into current_url from jsonb_array_elements(
    case when jsonb_typeof(slots)='array' then slots else '[]'::jsonb end) e where e->>'key'=p_slot_key;
  if current_url is distinct from p_expected_url or coalesce(current_url,'')='' then raise exception 'source_changed'; end if;
  if current_url !~* '^https?://(www\.|vm\.|vt\.)?tiktok\.com/' and not (public.video_all_sources(p_rep_id) and (public.is_queued_video_url(current_url) or public.video_is_preserved(p_rep_id,p_slot_key,current_url))) then raise exception 'invalid_video_slot'; end if;
  update public.site_settings set homepage_media_slots=(select jsonb_agg(
    case when e->>'key'=p_slot_key then e || '{"videoUrl":"","isVisible":false}'::jsonb else e end order by ord)
    from jsonb_array_elements(slots) with ordinality a(e,ord)) where rep_id=p_rep_id;
end $$;
