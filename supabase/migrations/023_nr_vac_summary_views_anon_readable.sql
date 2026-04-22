-- ─── 023: make VAC aggregate views anon-readable (defensive) ─────────
-- Bug: on 2026-04-22 the VAC dashboard Stats row showed 0% / $0 despite
-- a granted tinnitus condition (10%) existing in vac_conditions. Root-cause
-- analysis (service-role + `SET role authenticated` tests both returned
-- 10% / $180.42; anon returned 0 / null) showed the views work correctly
-- under the `authenticated` role. The remaining failure mode was the
-- two-layer RLS dependency: an aggregate view with security_invoker=true
-- relies on the caller's session JWT propagating through to each
-- underlying table's RLS policy. If that propagation ever fails (stale
-- session, transport quirk, supabase-js race), the view silently returns
-- zeros/nulls instead of an error.
--
-- Fix: flip the two PURELY AGGREGATE views to security_invoker=false so
-- they run with the owner's (postgres) privileges and bypass table RLS.
-- Only aggregate scalars are exposed — combined rating %, monthly $,
-- rate year, filed-count, last-activity timestamp. Individual condition
-- rows, notes, ICD codes, source records, and activity log entries stay
-- authenticated-only via the unchanged table RLS policies.
--
-- vac_action_items_v stays security_invoker=true: it surfaces per-condition
-- title/description rows, not aggregates, so it must respect RLS.
--
-- Anon key is already embedded in the client bundle of neon-rabbit-hq
-- (single-user internal dashboard on a private Vercel URL). This change
-- matches the security posture of migration 019 (dashboard_read_thoughts)
-- which already grants {anon,authenticated} read on the thoughts table.

BEGIN;

ALTER VIEW public.vac_rating_summary_v SET (security_invoker = false);
ALTER VIEW public.vac_last_activity_v  SET (security_invoker = false);

-- Provenance note for the activity log.
INSERT INTO public.vac_activity_log (entry_type, subject_type, subject_id, description, actor)
VALUES (
  'note', NULL, NULL,
  'Migration 023: flipped vac_rating_summary_v and vac_last_activity_v to security_invoker=false so aggregate scalars are anon-readable without traversing two-layer RLS. Individual condition/source/activity rows remain authenticated-only.',
  'migration'
);

COMMIT;
