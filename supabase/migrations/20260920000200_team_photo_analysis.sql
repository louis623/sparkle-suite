-- Small portrait checks are cached and capped independently of paid image edits.
create table if not exists public.team_photo_analyses (
  rep_id uuid not null references public.reps(id) on delete cascade,
  source_hash text not null,
  status text not null default 'processing' check (status in ('processing','complete','failed')),
  result jsonb,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(rep_id,source_hash)
);
alter table public.team_photo_analyses enable row level security;
revoke all on public.team_photo_analyses from anon, authenticated;
grant all on public.team_photo_analyses to service_role;
create index if not exists team_photo_analyses_created on public.team_photo_analyses(created_at);

create or replace function public.claim_team_photo_analysis(p_rep_id uuid,p_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing public.team_photo_analyses;
begin
  if p_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid source hash'; end if;
  perform pg_advisory_xact_lock(hashtextextended('team-photo-analysis-budget',0));
  select * into existing from public.team_photo_analyses where rep_id=p_rep_id and source_hash=p_hash;
  if found then return jsonb_build_object('claimed',false,'result',existing.result); end if;
  if (select count(*) from public.team_photo_analyses where created_at >= now()-interval '24 hours') >= 500
    or (select count(*) from public.team_photo_analyses where rep_id=p_rep_id and created_at >= now()-interval '24 hours') >= 50 then
    return jsonb_build_object('claimed',false);
  end if;
  insert into public.team_photo_analyses(rep_id,source_hash) values(p_rep_id,p_hash);
  return jsonb_build_object('claimed',true);
end $$;
revoke all on function public.claim_team_photo_analysis(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_team_photo_analysis(uuid,text) to service_role;
