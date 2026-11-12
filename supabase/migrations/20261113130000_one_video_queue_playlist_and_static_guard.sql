-- Replace the existing functions in place to retain their grants and trigger binding.
create or replace function public.queue_video_link(u text) returns jsonb language plpgsql immutable strict
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
  if path='/embed/videoseries' then return null; end if;
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

create or replace function public.queue_video_link_error(u text) returns text language sql immutable as $$
 select case when public.queue_video_link(u) is not null then null
 when u ~* '^https?://((www\.|m\.)?youtube\.com|(www\.)?youtube-nocookie\.com)(:443)?/' and
      substring(u from '^[^:]+://[^/?#]+(/[^?#]*)') ~ '^/embed(/|$)' and u !~ '[[:space:]\\]' then 'Open the video and copy the full link.'
 when u ~* '^https?://(fb\.watch|l\.instagram\.com)(:443)?([/?#]|$)' or u ~* '^https?://(www\.)?(instagram|facebook)\.com(:443)?/share([/?#]|$)' then 'Open the video and copy the full link.'
 when u ~* '^https?://(www\.)?facebook\.com(:443)?([/?#]|$)' then 'Paste a Facebook video or Reel link.'
 else 'This needs a public TikTok, YouTube, Instagram, or Facebook video link.' end
$$;
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
      -- A static assignment still uses this identity after its editable slot is removed.
      -- Archiving even another history row here would create a dismissal for the shared identity.
      if exists (select 1 from public.tiktok_video_queue static_item
        where static_item.rep_id=new.rep_id and static_item.source_provider=link->>'provider'
          and static_item.tiktok_video_id=vid and static_item.status in ('pending','completed')
          and not (static_item.slot_keys <@ array['showcase','about_2','about_3','about_4']::text[]))
      then continue; end if;
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
