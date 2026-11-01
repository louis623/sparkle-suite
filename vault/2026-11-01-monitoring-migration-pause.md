# Monitoring migration paused — November 1, 2026

RESOLVED: Louis explicitly approved the ORIGINAL tested migration on November 1, 2026, limited to Smoke `pukemqiwlyqmyytxkdmo`. The append-only rewrite was discarded. The original migration applied successfully to Smoke; readback confirmed exactly its four new monitoring tables. All 26 focused monitoring tests passed again. No Live access or migration. The earlier pause and rewrite below are historical, not current instructions.

Louis denied the Smoke migration after destructive-SQL detection and explicitly requires his OK before any further database application. Do not retry `apply_migration`, execute the migration through another tool, or run SQL against any database pending that approval.

The connector returned confirmation expired; no successful migration application was reported. The submitted version created new private monitoring tables/functions but included routine-body cleanup DELETEs and counter UPDATEs. It had no DROP/TRUNCATE and no unqualified row UPDATE/DELETE; nevertheless Louis requested an additive rewrite.

Local file `supabase/migrations/20261101170000_client_error_alert_limits.sql` now uses append-only batches, observations, claims and delivery reservations, with CREATE TABLE/INDEX IF NOT EXISTS, RLS and service-role SELECT/INSERT only. It contains no DROP, DELETE, TRUNCATE or UPDATE statement. No revised SQL has been applied or executed, including local SQL tests. Retention cleanup is deliberately absent; agree any future archival separately.

Before this rewrite, 26 focused monitoring tests and TypeScript passed. Those results do not validate the revised append-only implementation; adjust its SQL fixtures and rerun focused tests only after permission. No full pass, commit/push or new Smoke deployment has happened for this hardening task. Alerts remain off by default. Live was untouched.
