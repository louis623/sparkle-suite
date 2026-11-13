-- Existing embeds can be worked in the queue without changing their presentation.
alter table public.tiktok_video_preserved_assignments add column queue_while_preserved boolean not null default false;
alter table public.tiktok_hosted_video_reps add column preserved_queue_enrolled boolean not null default false;
create or replace function public.tiktok_current_slot_ids(p_rep_id uuid) returns table(vid text,slot_key text,url text,source_provider text,preserved boolean)
language sql stable security definer set search_path=pg_catalog,public,pg_temp as $$
 select v->>'id',e->>'key',e->>'videoUrl',v->>'provider',(public.video_is_preserved(p_rep_id,e->>'key',e->>'videoUrl') and not exists(select 1 from public.tiktok_video_preserved_assignments p where p.rep_id=p_rep_id and p.slot_key=e->>'key' and p.queue_while_preserved))
 from public.site_settings s cross join lateral jsonb_array_elements(case when jsonb_typeof(s.homepage_media_slots)='array' then s.homepage_media_slots else '[]' end) e
 cross join lateral public.queue_video_link(e->>'videoUrl') v
 where s.rep_id=p_rep_id and e->>'key' in ('showcase','about_2','about_3','about_4') and (coalesce(e->'isVisible','true')<>'false' or exists(select 1 from public.tiktok_video_preserved_assignments p where p.rep_id=p_rep_id and p.slot_key=e->>'key' and p.queue_while_preserved))
 and v is not null and (v->>'provider'='tiktok' or public.video_all_sources(p_rep_id))
$$;
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
  delete from public.tiktok_video_preserved_assignments where rep_id=q.rep_id and source_provider=q.source_provider and source_id=q.tiktok_video_id;
  return jsonb_build_object('assetId', v_asset, 'replayed', false);
end $$;


create function public.enroll_preserved_video_queue(p_rep_id uuid) returns void
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
declare enrolled boolean; static_url text; static_id text;
begin
 perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
 if not exists(select 1 from public.reps where id=p_rep_id and status='active') then raise exception 'rep_inactive'; end if;
 select preserved_queue_enrolled into enrolled from public.tiktok_hosted_video_reps where rep_id=p_rep_id for update;
 if not found then raise exception 'rep_not_enabled'; end if;
 perform 1 from public.site_settings where rep_id=p_rep_id for update;
 if enrolled then
  perform public.set_all_sources_enabled(p_rep_id,true);
  return;
 end if;
 perform public.set_all_sources_enabled(p_rep_id,true);
 insert into public.tiktok_video_preserved_assignments(rep_id,slot_key,source_provider,source_id,queue_while_preserved)
 select p_rep_id,e->>'key',coalesce(v->>'provider','legacy'),coalesce(v->>'id',e->>'videoUrl'),true
 from public.site_settings s cross join lateral jsonb_array_elements(coalesce(s.homepage_media_slots,'[]')) e
 cross join lateral public.queue_video_link(e->>'videoUrl') v
 where s.rep_id=p_rep_id and e->>'key' in ('showcase','about_2','about_3','about_4')
 and coalesce(e->>'videoUrl','') ~* '^https?://'
 and not exists(select 1 from public.public_site_videos a where a.rep_id=p_rep_id and a.source_provider=v->>'provider' and a.tiktok_video_id=v->>'id' and a.status='live')
 on conflict(rep_id,slot_key) do update set source_provider=excluded.source_provider,source_id=excluded.source_id,queue_while_preserved=true;

 if exists(select 1 from public.reps where id=p_rep_id and public_site_slug='brittwithbling') then
  foreach static_url in array array['https://www.tiktok.com/embed/7609434971228425486','https://www.tiktok.com/embed/7602795836380073229'] loop
   static_id:=public.tiktok_video_id_from_url(static_url);
   if not exists(select 1 from public.public_site_videos where rep_id=p_rep_id and source_provider='tiktok' and tiktok_video_id=static_id and status='live') then
    insert into public.tiktok_video_preserved_assignments(rep_id,slot_key,source_provider,source_id,queue_while_preserved)
    values(p_rep_id,'featured_reveal:'||static_id,'tiktok',static_id,true) on conflict(rep_id,slot_key) do nothing;
   end if;
   perform public.tiktok_queue_add_static(p_rep_id,static_url);
  end loop;
 end if;
 update public.tiktok_hosted_video_reps set preserved_queue_enrolled=true where rep_id=p_rep_id;
 perform public.tiktok_sync_rep(p_rep_id,'backfill');
end $$;
revoke all on function public.enroll_preserved_video_queue(uuid) from public,anon,authenticated;
grant execute on function public.enroll_preserved_video_queue(uuid) to service_role;

create or replace function public.video_backfill_slots(p_rep_id uuid,p_slots text[]) returns void language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(p_rep_id));
 if not public.video_all_sources(p_rep_id) or not exists(select 1 from public.reps where id=p_rep_id and status='active') then raise exception 'rep_not_enabled'; end if;
 if coalesce(cardinality(p_slots),0)=0 or not p_slots <@ array['showcase','about_2','about_3','about_4'] then raise exception 'invalid_video_slot'; end if;
 delete from public.tiktok_video_preserved_assignments p where rep_id=p_rep_id and slot_key=any(p_slots)
 and exists(select 1 from public.tiktok_current_slot_ids(p_rep_id) c where c.slot_key=p.slot_key and public.video_is_preserved(p_rep_id,c.slot_key,c.url));
 perform public.tiktok_sync_rep(p_rep_id,'backfill');
end $$;
