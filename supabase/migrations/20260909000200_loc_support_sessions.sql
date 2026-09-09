-- LOC stores only encrypted CSRF material; the existing support session table
-- remains authoritative for target, capability, expiry, notice and audit.
create table if not exists public.loc_control_center_support_sessions (
 session_id uuid primary key references public.operator_support_sessions(id),
 owner_id uuid not null,
 connection_id text not null,
 operator_rep_id uuid not null references public.reps(id),
 target_rep_id uuid not null references public.reps(id),
 csrf_ciphertext jsonb not null,
 created_at timestamptz not null default now(),
 ended_at timestamptz
);
alter table public.loc_control_center_support_sessions enable row level security;
revoke all on public.loc_control_center_support_sessions from anon,authenticated;
grant select,insert,update on public.loc_control_center_support_sessions to service_role;
create index if not exists loc_control_center_support_owner on public.loc_control_center_support_sessions(owner_id,connection_id,created_at desc);
