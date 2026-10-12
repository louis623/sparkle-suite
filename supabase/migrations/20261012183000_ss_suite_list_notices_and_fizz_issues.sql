-- Suite-list notice sends and Fizz approve-once staging.
-- Service role only. Reps never read or write these rows.

create table if not exists public.suite_official_notice_sends (
  idempotency_key text primary key,
  source_kind text not null,
  source_id text not null,
  status text not null default 'pending',
  broadcast_id text,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suite_official_notice_sends_key_check
    check (char_length(idempotency_key) between 8 and 200),
  constraint suite_official_notice_sends_source_kind_check
    check (source_kind in ('workspace_publication', 'workspace_resource')),
  constraint suite_official_notice_sends_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint suite_official_notice_sends_result_object
    check (jsonb_typeof(result) = 'object')
);

create index if not exists suite_official_notice_sends_source_idx
  on public.suite_official_notice_sends (source_kind, source_id);

alter table public.suite_official_notice_sends enable row level security;
revoke all on table public.suite_official_notice_sends from anon, authenticated;
grant select, insert, update on table public.suite_official_notice_sends to service_role;

comment on table public.suite_official_notice_sends is
  'Idempotent Suite-list Resend broadcast ledger. One row per publication. No rep addresses are stored.';

create table if not exists public.fizz_staged_issues (
  issue_id text primary key,
  subject text not null,
  preheader text not null,
  email_html text not null,
  workspace_title text not null,
  workspace_summary text not null,
  workspace_body text not null,
  action_url text,
  staged_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fizz_staged_issues_issue_id_check
    check (issue_id ~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'),
  constraint fizz_staged_issues_subject_check
    check (char_length(btrim(subject)) between 3 and 160),
  constraint fizz_staged_issues_preheader_check
    check (char_length(btrim(preheader)) between 1 and 180),
  constraint fizz_staged_issues_html_check
    check (char_length(email_html) between 20 and 100000),
  constraint fizz_staged_issues_title_check
    check (char_length(btrim(workspace_title)) between 3 and 160),
  constraint fizz_staged_issues_summary_check
    check (char_length(btrim(workspace_summary)) between 1 and 500),
  constraint fizz_staged_issues_body_check
    check (char_length(btrim(workspace_body)) between 3 and 20000)
);

alter table public.fizz_staged_issues enable row level security;
revoke all on table public.fizz_staged_issues from anon, authenticated;
grant select, insert, update on table public.fizz_staged_issues to service_role;

comment on table public.fizz_staged_issues is
  'Owner-staged Fizz issue. Approve-once sends are recorded separately and do not rewrite a sent issue.';

create table if not exists public.fizz_issue_results (
  idempotency_key text primary key,
  issue_id text not null references public.fizz_staged_issues (issue_id),
  mode text not null,
  channel text not null,
  status text not null default 'pending',
  broadcast_id text,
  result jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fizz_issue_results_mode_check
    check (mode in ('test', 'live')),
  constraint fizz_issue_results_channel_check
    check (channel in ('email', 'broadcast')),
  constraint fizz_issue_results_status_check
    check (status in ('pending', 'sent', 'failed')),
  constraint fizz_issue_results_key_check
    check (idempotency_key = 'fizz-' || issue_id || '-' || mode || '-' || channel),
  constraint fizz_issue_results_result_object
    check (jsonb_typeof(result) = 'object'),
  constraint fizz_issue_results_issue_mode_channel_key
    unique (issue_id, mode, channel)
);

create index if not exists fizz_issue_results_issue_idx
  on public.fizz_issue_results (issue_id, mode, channel);

alter table public.fizz_issue_results enable row level security;
revoke all on table public.fizz_issue_results from anon, authenticated;
grant select, insert, update on table public.fizz_issue_results to service_role;

comment on table public.fizz_issue_results is
  'Per-channel Fizz approve results. Keys are fizz-<issueId>-<mode>-email and fizz-<issueId>-<mode>-broadcast.';

notify pgrst, 'reload schema';
