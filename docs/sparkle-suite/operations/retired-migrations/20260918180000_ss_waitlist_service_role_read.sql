-- RETIRED 2026-09-23. Historical proposal only; do not execute.
-- See ../2026-09-23-retired-waitlist-service-role-migration.md.
-- Classic Control Center waitlist/build-list reads were RLS-on with no policy.
-- Operator-health tables have explicit service_role policies; this table did not,
-- so a service-role client without BYPASSRLS returns a false-empty list and a
-- missing row for get-by-id. Align waitlist and linked intake with the same
-- service_role pattern as other Control Center tables.

drop policy if exists sparkle_suite_waitlist_service_role_only
  on public.sparkle_suite_waitlist;
create policy sparkle_suite_waitlist_service_role_only
  on public.sparkle_suite_waitlist
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sparkle_suite_waitlist
  to service_role;

drop policy if exists sparkle_suite_intake_submissions_service_role_only
  on public.sparkle_suite_intake_submissions;
create policy sparkle_suite_intake_submissions_service_role_only
  on public.sparkle_suite_intake_submissions
  for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on table public.sparkle_suite_intake_submissions
  to service_role;

notify pgrst, 'reload schema';
