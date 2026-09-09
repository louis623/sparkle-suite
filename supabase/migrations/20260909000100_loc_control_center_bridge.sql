-- Additive LOC receipts. Business records and existing operator access stay put.
create table if not exists public.loc_control_center_operations (
  id uuid primary key,
  owner_id uuid not null,
  connection_id text not null,
  intended_assignee text,
  operator_rep_id uuid not null references public.reps(id),
  operation text not null,
  product text not null check (product in ('suite','finder')),
  input_digest text not null,
  status text not null check (status in ('running','succeeded','failed','uncertain')),
  result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.loc_control_center_operations enable row level security;
revoke all on public.loc_control_center_operations from anon, authenticated;
grant select, insert, update on public.loc_control_center_operations to service_role;
create index if not exists loc_control_center_operations_owner_created on public.loc_control_center_operations(owner_id, created_at desc);

-- Claim and update one task in a single database statement. This revision
-- predicate also detects edits made from the still-active original center.
create or replace function public.loc_update_control_center_task(p_id uuid, p_expected_updated_at timestamptz, p_patch jsonb)
returns setof public.sparkle_suite_bug_hunt_items
language sql security invoker set search_path = public as $$
 update public.sparkle_suite_bug_hunt_items set
   details = case when p_patch ? 'details' then nullif(p_patch->>'details','') else details end,
   owner = case when p_patch ? 'owner' then nullif(p_patch->>'owner','') else owner end,
   priority = case when p_patch ? 'priority' then p_patch->>'priority' else priority end,
   status = case when p_patch ? 'status' then p_patch->>'status' else status end,
   completed_at = case when p_patch ? 'status' then case when p_patch->>'status'='complete' then now() else null end else completed_at end,
   updated_at = now()
 where id=p_id and updated_at=p_expected_updated_at
 returning *;
$$;
revoke all on function public.loc_update_control_center_task(uuid,timestamptz,jsonb) from public, anon, authenticated;
grant execute on function public.loc_update_control_center_task(uuid,timestamptz,jsonb) to service_role;
