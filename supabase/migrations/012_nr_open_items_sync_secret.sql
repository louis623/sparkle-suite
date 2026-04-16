-- ─── 012: Append SYNC_SECRET cron-failure item to open_items ──────────────────
-- Flags a pre-existing auth disconnect discovered during Task 2 rename:
-- daily-financial-sync Edge Function reads SYNC_SECRET via Deno.env.get(), but
-- the secret is absent from the Edge Function runtime env (not in
-- `supabase secrets list`). Cron pulls sync_secret from Vault and sends as
-- Bearer, but function has no matching value. Silent 401 for ~12 days;
-- last successful financial_snapshots write was 2026-04-04.
--
-- Idempotent: guarded on title so re-applying is a no-op.

BEGIN;

INSERT INTO public.open_items (title, description, category, status, priority, blocking_phase)
SELECT
  'SYNC_SECRET missing from Edge Function runtime — daily cron silently 401-ing',
  'daily-financial-sync Edge Function reads SYNC_SECRET via Deno.env.get() but the secret is not in supabase secrets list. Cron pulls sync_secret from Vault and sends as Bearer, but function has no matching value. Last successful financial_snapshots write was April 4. Cron jobs show ''succeeded'' but that only means net.http_post dispatched. Pre-existing — not caused by Task 2 rename.',
  'task'::open_item_category,
  'open'::open_item_status,
  'high'::open_item_priority,
  'HQ Phase 2B (financial sync)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.open_items
  WHERE title = 'SYNC_SECRET missing from Edge Function runtime — daily cron silently 401-ing'
);

COMMIT;
