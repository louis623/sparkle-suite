-- Remove uses the existing archive path for pending AND already-ready slots.
-- No asset/storage delete and no changes to the existing 90-day purge.
create or replace function public.archive_tiktok_queue_item(p_item_id uuid, p_note text)
returns void language plpgsql security definer set search_path = pg_catalog, public, pg_temp as $$
declare v_rep uuid; q public.tiktok_video_queue;
begin
  select rep_id into v_rep from public.tiktok_video_queue where id = p_item_id;
  if v_rep is null then raise exception 'queue_item_not_found'; end if;
  perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(v_rep));
  select * into q from public.tiktok_video_queue where id = p_item_id for update;
  if q.status not in ('pending', 'completed') then raise exception 'queue_item_not_pending'; end if;
  update public.tiktok_video_queue set status = 'archived', operator_note = left(p_note, 500),
         closed_at = now(), updated_at = now() where id = q.id;
  insert into public.tiktok_video_dismissals (rep_id, tiktok_video_id, assignment, source_url, slot_keys, note)
  values (q.rep_id, q.tiktok_video_id,
          case when 'featured_reveal' = any(q.slot_keys) then 'static' else 'slot' end,
          q.source_url, q.slot_keys, left(p_note, 500))
  on conflict (rep_id, tiktok_video_id) do update set note = excluded.note, assignment = excluded.assignment,
    source_url = excluded.source_url, slot_keys = excluded.slot_keys, created_at = now();
end $$;


-- Enforce clear-before-replace for enabled reps, including direct RLS writers.
-- Clear and archive happen in the same transaction; AFTER sync cannot retain
-- a removed static marker as a pending operator task.
create or replace function public.tiktok_slot_clear_guard()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp as $$
declare old_slot jsonb; new_url text; old_url text; vid text; q record;
begin
  if not public.tiktok_hosted_video_enabled(new.rep_id) then return new; end if;
  for old_slot in select value from jsonb_array_elements(
    case when jsonb_typeof(old.homepage_media_slots)='array' then old.homepage_media_slots else '[]'::jsonb end)
  loop
    if old_slot->>'key' not in ('showcase','about_2','about_3','about_4') then continue; end if;
    old_url := coalesce(old_slot->>'videoUrl','');
    if old_url !~* '^https?://(www\.|vm\.|vt\.)?tiktok\.com/' then continue; end if;
    select coalesce(e->>'videoUrl','') into new_url from jsonb_array_elements(
      case when jsonb_typeof(new.homepage_media_slots)='array' then new.homepage_media_slots else '[]'::jsonb end) e
      where e->>'key'=old_slot->>'key' limit 1;
    new_url := coalesce(new_url,'');
    vid := public.tiktok_video_id_from_url(old_url);
    if new_url <> '' and new_url is distinct from old_url
      and (vid is null or public.tiktok_video_id_from_url(new_url) is distinct from vid)
    then raise exception 'tiktok_remove_before_replace' using errcode='23514'; end if;
    if new_url = '' and vid is not null then
      perform pg_advisory_xact_lock(public.tiktok_queue_lock_key(new.rep_id));
      -- Shared IDs still used in another slot keep their one shared queue item.
      if exists (select 1 from jsonb_array_elements(
        case when jsonb_typeof(new.homepage_media_slots)='array' then new.homepage_media_slots else '[]'::jsonb end) e
        where e->>'key' in ('showcase','about_2','about_3','about_4')
          and public.tiktok_video_id_from_url(e->>'videoUrl')=vid
          and coalesce(e->'isVisible','true'::jsonb)<>'false'::jsonb) then continue; end if;
      for q in select id from public.tiktok_video_queue
        where rep_id=new.rep_id and tiktok_video_id=vid and status in ('pending','completed')
        order by created_at
      loop
        perform public.archive_tiktok_queue_item(q.id,'Removed from Workspace');
      end loop;
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.tiktok_slot_clear_guard() from public,anon,authenticated,service_role;
create trigger tiktok_slot_clear_guard before update of homepage_media_slots on public.site_settings
for each row execute function public.tiktok_slot_clear_guard();

-- Server-only entry point. The route derives rep identity from the paid session
-- or requires the existing same-origin interactive owner guard for operator use.
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
  if current_url !~* '^https?://(www\.|vm\.|vt\.)?tiktok\.com/' then raise exception 'invalid_video_slot'; end if;
  update public.site_settings set homepage_media_slots=(select jsonb_agg(
    case when e->>'key'=p_slot_key then e || '{"videoUrl":"","isVisible":false}'::jsonb else e end order by ord)
    from jsonb_array_elements(slots) with ordinality a(e,ord)) where rep_id=p_rep_id;
end $$;
revoke all on function public.remove_tiktok_slot(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.remove_tiktok_slot(uuid,text,text) to service_role;
