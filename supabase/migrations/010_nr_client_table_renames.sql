-- ─── 010: Client table renames ────────────────────────────────────────────────
-- clients         → clients_build_pipeline  (SS build pipeline; pipeline_status/builds/payments FK here)
-- sparkle_clients → neon_rabbit_clients     (HQ canonical client DB; Stripe cron target)
--
-- Rename-only. No schema or data changes. Idempotent.
-- FK constraints on pipeline_status/builds/payments auto-track the renamed
-- parent via pg_catalog OIDs — no FK DDL needed. Constraint names contain
-- the column "client_id", not the table "clients", so they remain accurate.

BEGIN;

-- Rename 1: clients → clients_build_pipeline
ALTER TABLE IF EXISTS public.clients
  RENAME TO clients_build_pipeline;
ALTER INDEX IF EXISTS public.clients_pkey
  RENAME TO clients_build_pipeline_pkey;

-- Rename 2: sparkle_clients → neon_rabbit_clients
ALTER TABLE IF EXISTS public.sparkle_clients
  RENAME TO neon_rabbit_clients;
ALTER INDEX IF EXISTS public.sparkle_clients_pkey
  RENAME TO neon_rabbit_clients_pkey;

COMMIT;
