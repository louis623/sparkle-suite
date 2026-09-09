-- The LOC evidence endpoint uses Finder's server-only service role. The
-- original intake migration granted authenticated access but omitted this
-- role. Keep customer policies intact and grant only the reads needed here.
grant select on public.sparkle_finder_nic_nac_intake_submissions to service_role;
grant select on public.sparkle_finder_nic_nac_intake_assets to service_role;
