-- Private month/day birthdays for Team Management plus immutable weekly
-- Message Center birthday-report snapshots. Birth years are never stored.

alter table public.join_team_members
  add column if not exists birthday_month smallint,
  add column if not exists birthday_day smallint;

alter table public.join_team_members
  drop constraint if exists join_team_members_birthday_month_range,
  drop constraint if exists join_team_members_birthday_day_range,
  drop constraint if exists join_team_members_birthday_parts_together,
  drop constraint if exists join_team_members_birthday_valid_date;

alter table public.customer_audience
  drop constraint if exists customer_audience_birthday_valid_date;

alter table public.join_team_members
  add constraint join_team_members_birthday_month_range
    check (birthday_month is null or birthday_month between 1 and 12),
  add constraint join_team_members_birthday_day_range
    check (birthday_day is null or birthday_day between 1 and 31),
  add constraint join_team_members_birthday_parts_together
    check (
      (birthday_month is null and birthday_day is null)
      or (birthday_month is not null and birthday_day is not null)
    ),
  add constraint join_team_members_birthday_valid_date check (
    birthday_month is null or birthday_day <= case birthday_month
      when 2 then 29
      when 4 then 30
      when 6 then 30
      when 9 then 30
      when 11 then 30
      else 31
    end
  );

alter table public.customer_audience
  add constraint customer_audience_birthday_valid_date check (
    birthday_month is null or birthday_day <= case birthday_month
      when 2 then 29
      when 4 then 30
      when 6 then 30
      when 9 then 30
      when 11 then 30
      else 31
    end
  ) not valid;

alter table public.customer_audience
  validate constraint customer_audience_birthday_valid_date;

create index if not exists idx_join_team_members_rep_birthday
  on public.join_team_members (rep_id, birthday_month, birthday_day)
  where birthday_month is not null and birthday_day is not null;

comment on column public.join_team_members.birthday_month is
  'Optional private team-member birthday month for weekly rep reminders; birth years are never stored or exposed publicly.';
comment on column public.join_team_members.birthday_day is
  'Optional private team-member birthday day for weekly rep reminders; birth years are never stored or exposed publicly.';

create table if not exists public.workspace_weekly_birthday_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.reps(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  time_zone text not null default 'America/New_York',
  customer_birthdays jsonb not null default '[]'::jsonb,
  team_birthdays jsonb not null default '[]'::jsonb,
  generator_version text not null,
  publication_id uuid references public.workspace_message_publications(id) on delete set null,
  generated_at timestamptz not null default now(),
  check (extract(dow from week_start) = 0),
  check (week_end = week_start + 6),
  check (jsonb_typeof(customer_birthdays) = 'array'),
  check (jsonb_typeof(team_birthdays) = 'array'),
  check (
    jsonb_array_length(customer_birthdays) > 0
    or jsonb_array_length(team_birthdays) > 0
  ),
  unique (rep_id, week_start)
);

create index if not exists idx_workspace_weekly_birthday_reports_rep_week
  on public.workspace_weekly_birthday_report_snapshots (rep_id, week_start desc);

alter table public.workspace_weekly_birthday_report_snapshots enable row level security;

drop policy if exists "workspace_weekly_birthday_reports_own_select"
  on public.workspace_weekly_birthday_report_snapshots;
create policy "workspace_weekly_birthday_reports_own_select"
  on public.workspace_weekly_birthday_report_snapshots
  for select
  to authenticated
  using (
    rep_id = (select id from public.reps where auth_user_id = auth.uid())
  );

drop policy if exists "workspace_weekly_birthday_reports_admin_full_access"
  on public.workspace_weekly_birthday_report_snapshots;
create policy "workspace_weekly_birthday_reports_admin_full_access"
  on public.workspace_weekly_birthday_report_snapshots
  for all
  to authenticated
  using (
    exists (
      select 1 from public.reps
      where auth_user_id = auth.uid()
        and email = 'louis@neonrabbit.net'
    )
  )
  with check (
    exists (
      select 1 from public.reps
      where auth_user_id = auth.uid()
        and email = 'louis@neonrabbit.net'
    )
  );

revoke all on public.workspace_weekly_birthday_report_snapshots from anon, authenticated;
grant select on public.workspace_weekly_birthday_report_snapshots to authenticated;
grant all on public.workspace_weekly_birthday_report_snapshots to service_role;

alter table public.workspace_message_publications
  drop constraint if exists workspace_message_publications_category_check;
alter table public.workspace_message_publications
  add constraint workspace_message_publications_category_check check (
    category in (
      'customer_activity', 'business_update', 'monthly_report',
      'birthday_report', 'platform_update', 'help_update', 'blog', 'video',
      'announcement', 'account_activity'
    )
  );

insert into public.workspace_message_senders (
  sender_key, display_name, sender_type, capabilities, is_active
) values (
  'birthday_reporter',
  'Sparkle Suite',
  'automation',
  '{"categories":["birthday_report"],"audiences":["selected"]}'::jsonb,
  true
)
on conflict (sender_key) do update set
  display_name = excluded.display_name,
  sender_type = excluded.sender_type,
  capabilities = excluded.capabilities,
  is_active = true,
  updated_at = now();

comment on table public.workspace_weekly_birthday_report_snapshots is
  'Immutable per-rep Sunday-through-Saturday birthday digests delivered only through the private Sparkle Suite Message Center.';
