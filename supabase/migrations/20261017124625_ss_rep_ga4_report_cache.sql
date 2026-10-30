-- Daily cache for a rep's GA4 dashboard report.
-- Same lockdown as rep_analytics_properties: service role only.

create table if not exists public.rep_ga4_report_cache (
  rep_id uuid not null references public.reps (id) on delete cascade,
  report_key text not null,
  date_range text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (rep_id, report_key, date_range),
  constraint rep_ga4_report_cache_report_key_check
    check (char_length(report_key) between 1 and 80),
  constraint rep_ga4_report_cache_date_range_check
    check (char_length(date_range) between 1 and 40)
);

alter table public.rep_ga4_report_cache enable row level security;

revoke all on table public.rep_ga4_report_cache from public, anon, authenticated;
grant select, insert, update, delete on table public.rep_ga4_report_cache to service_role;

comment on table public.rep_ga4_report_cache is
  'Service-role cache of GA4 Data API dashboard numbers. No anon or authenticated access.';

notify pgrst, 'reload schema';
