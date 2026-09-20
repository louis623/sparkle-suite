-- Team portraits are independent of jewelry/Dance Floor enhancement jobs.
create table public.team_photo_polish_jobs (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  card_key text not null check (card_key = 'lead' or card_key ~ '^[0-9a-fA-F-]{36}$'),
  request_id uuid not null,
  attempt_number integer not null check (attempt_number between 1 and 4),
  source_path text not null,
  source_sha256 text not null,
  skin_id text not null,
  model text not null,
  status text not null default 'queued' check (status in ('queued','processing','succeeded','failed','uncertain')),
  preview_path text,
  approved_path text,
  provider_request_id text,
  usage jsonb,
  error_message text,
  notification_status text check (notification_status in ('processing','delivered','failed','not_configured')),
  support_conversation_id uuid,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  unique(rep_id, request_id),
  unique(rep_id, card_key, attempt_number)
);
create index team_photo_polish_month_idx on public.team_photo_polish_jobs(created_at);
alter table public.team_photo_polish_jobs enable row level security;
revoke all on public.team_photo_polish_jobs from anon, authenticated;
grant all on public.team_photo_polish_jobs to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('team-photo-previews', 'team-photo-previews', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Single transaction serializes both the global monthly ceiling and card limits.
-- Request replay returns the same job, even once the allowance is exhausted.
create or replace function public.reserve_team_photo_polish(
  p_rep_id uuid, p_card_key text, p_request_id uuid, p_source_path text,
  p_source_sha256 text, p_skin_id text, p_model text, p_monthly_limit integer
) returns public.team_photo_polish_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_job public.team_photo_polish_jobs; v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('team_photo_polish_budget', 0));
  select * into v_job from public.team_photo_polish_jobs where rep_id=p_rep_id and request_id=p_request_id;
  if found then
    if v_job.card_key <> p_card_key then raise exception 'REQUEST_CONFLICT'; end if;
    return v_job;
  end if;
  if p_card_key <> 'lead' and not exists (
    select 1 from public.join_team_members where id::text=p_card_key and rep_id=p_rep_id
  ) then raise exception 'CARD_NOT_FOUND'; end if;
  if p_source_path not like p_rep_id::text || '/profile/%' or p_source_path like '%..%' then
    raise exception 'INVALID_SOURCE';
  end if;
  if exists (select 1 from public.team_photo_polish_jobs where rep_id=p_rep_id and card_key=p_card_key and status in ('queued','processing','uncertain')) then
    raise exception 'PHOTO_ALREADY_PENDING';
  end if;
  select count(*) into v_count from public.team_photo_polish_jobs where rep_id=p_rep_id and card_key=p_card_key;
  if v_count >= 4 then raise exception 'PHOTO_LIMIT_REACHED'; end if;
  if p_monthly_limit is null or p_monthly_limit < 1 or (
    select count(*) from public.team_photo_polish_jobs where created_at >= date_trunc('month', now() at time zone 'UTC') at time zone 'UTC'
  ) >= p_monthly_limit then raise exception 'PHOTO_BUDGET_REACHED'; end if;
  if (select count(*) from public.team_photo_polish_jobs where created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC') >= 25 then
    raise exception 'PHOTO_DAILY_BUDGET_REACHED';
  end if;
  insert into public.team_photo_polish_jobs(rep_id,card_key,request_id,attempt_number,source_path,source_sha256,skin_id,model)
  values(p_rep_id,p_card_key,p_request_id,v_count+1,p_source_path,p_source_sha256,p_skin_id,p_model) returning * into v_job;
  if v_count=3 then
    insert into public.nic_nac_incidents(error_type,rep_id,severity,details)
    values('team_photo_polish_limit',p_rep_id,'warn',jsonb_build_object('jobId',v_job.id,'cardKey',p_card_key,'attemptsUsed',4,'workflow','Team Management photo polish'));
  end if;
  return v_job;
end;
$$;
revoke all on function public.reserve_team_photo_polish(uuid,text,uuid,text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.reserve_team_photo_polish(uuid,text,uuid,text,text,text,text,integer) to service_role;
