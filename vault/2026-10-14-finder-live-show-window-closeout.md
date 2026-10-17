# 2026-10-14 Finder public show window

- Draft PR https://github.com/louis623/sparkle-suite/pull/96 on `cursor/finder-live-show-window-41b5`, tip `083df1c9`.
- Public Finder reads keep a scheduled, non-cancelled show until start plus duration, defaulting to 60 minutes. Live-show items and `nextShow` include `durationMinutes` and `endTime`.
- Smoke app only: Vercel `dpl_4CwkKgDxoyfxAA7tsKgHMcexhEep` at https://sparkle-suite-smoke.vercel.app. Live app was not deployed. Live reps `nextShow` still has no `endTime`.
- Smoke database `pukemqiwlyqmyytxkdmo` does not have the new directory function. This environment has no Smoke database password, and the service role cannot run DDL. Smoke `calendar_events` is empty, so public live-shows, reps, and catalog return empty lists.
- Live database: `list_sparkle_finder_public_reps` was replaced by mistake (schema version `20261014125321`) and then restored. Scheduled shows again require `event.event_time >= p_as_of`. History row `20261014130357` records the revert.
- Next: apply `supabase/migrations/20261014133000_ss_finder_public_show_window.sql` to Smoke only, with the Smoke database password, after confirming live design `9f043e03-f36c-4f41-9573-2c843831c686` is absent.
