# Smart customer orders — October 13, 2026

Draft PR #47 (`cursor/smart-customer-cards-9630`) was merged onto `codex/nic-nac-trade-hardening` at `60c6aae5` (`87ed596b`). Purchase tracking is `a10c20cb`. No Smoke deploy, no Live deploy, and no migration was applied. Focused Vitest after the archive exclusion-list fix: 9 files, 66 passed. The customer-card UI was not opened in a browser.

## Purchase tracking

- Migration `supabase/migrations/20261013000100_ss_live_lineup_customer_orders.sql` is Smoke-only. Louis applies it. Do not apply it to Live.
- `live_lineup_customer_orders` stores one row per Bomb Party order per rep: audience id, order id, party id, ordered_at.
- Rows are written when the customer-card function matches a unique full name or the rep picks a card, and when a show archive is inserted. Backfill is `live_lineup_backfill_customer_orders(rep_id)`.
- `customer_audience.last_seen_in_lineup_at` follows the latest order time. That touch does not bump `profile_version`.
- Dashboard helpers, not wired to UI: `getLiveLineupCustomerActivity`, `countCustomersOrderedDuringLiveInLast90Days`, `countCustomersGoneQuiet` in `lib/services/live-lineup-customer-orders.ts`.

## Still true

The customer-card UI has not been tried in a real browser. Revealed orders whose names were dropped from the archived lineup cannot be backfilled.
