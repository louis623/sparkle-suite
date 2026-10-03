# 2026-10-03 Finder launch-notify LOC read

- Added Finder-only LOC read `finder.launchNotify.list` on draft PR https://github.com/louis623/sparkle-suite/pull/63, branch `cursor/finder-launch-notify-list-5f51`.
- It lists `public.sparkle_finder_launch_notify` with `limit`, `offset`, and `query`. Result shape is `{ items, nextOffset }`. Items return the public signup fields only.
- The read uses Suite env `SPARKLE_FINDER_SUPABASE_URL` and `SPARKLE_FINDER_SERVICE_ROLE_KEY`, and accepts only live Finder project `pzksocboqauqjdtsgpdp`. Smoke `awdwtxcqkqrzgdikrwab` is refused. `finder.reviews` remains the Suite-side studio ledger.
- Included migration `apps/finder/supabase/migrations/20261003124500_sparkle_finder_launch_notify.sql`. It was not applied. No deploy, no `customer_audience` write, and no change to the Finder launch-notify POST route.
- Focused LOC tests passed: `tests/loc-finder-launch-notify.test.ts`, `tests/loc-control-center-bridge.test.ts`, and `tests/loc-control-center-support-credentials.test.ts` (38 tests).
- Next: confirm Suite has those two live Finder env vars, then release only after Ops has created the live table and copied the two Smoke signup rows. Not deployed.
