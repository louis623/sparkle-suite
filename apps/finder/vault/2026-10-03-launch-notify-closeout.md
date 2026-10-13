# 2026-10-03 — Finder launch-notify signup

- Public `POST /api/finder/launch-notify` inserts one service-role row into `public.sparkle_finder_launch_notify` and returns `201` `{ "ok": true }`.
- Stored `source` is always `finder_learn_notify`. No welcome email, no audience row, and no rep id.
- `/learn`, auth, and the F logo were left as they are. The launch buttons still do not submit.
- Migration `apps/finder/supabase/migrations/20261003124500_sparkle_finder_launch_notify.sql` is idempotent and was not applied. Live was not touched. No deploy.
- Draft PR is against current Finder Smoke `cursor/finder-learn-v2-c9ad` (`900cc908`).
- Next: wire the `/learn` form to this route on Smoke only when Louis asks.
