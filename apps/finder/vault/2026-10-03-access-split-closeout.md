# 2026-10-03 — Finder access split

- Silver stays two things: saving a collection, and Nic-Nac. Trial still counts as Silver. Billing, price, and trial length were not changed.
- Signed-in Free accounts can use the library, the rep list, show times, Dance Floors, a profile, Showcase setup, Showcase Studio, favorite reps, and favorite-rep notes.
- Free accounts cannot save a collection. Nic-Nac stays behind Silver. The public line is: Nic-Nac is your collection curator and jewelry finder assistant.
- Repo migration `apps/finder/supabase/migrations/20261003193000_sparkle_finder_free_access_split.sql` is not applied. `POST /api/finder/launch-notify` still inserts into the live Finder table.
- Finder vitest: 67 files, 834 passed. No deploy.
- Draft PR #68 is `cursor/finder-access-split-be9e` rebased onto `2c909d6ca3d3838ec0dbd53e78016b02c05f1995` (`cursor/finder-learn-trial-cards-3dbd`). The `/learn` include lines stay: Follow your favorite reps, and Window shop their virtual dance floors. No deploy.
