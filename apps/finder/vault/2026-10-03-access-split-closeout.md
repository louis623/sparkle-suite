# 2026-10-03 — Finder access split

- Silver stays two things: saving a collection, and Nic-Nac. Trial still counts as Silver. Billing, price, and trial length were not changed.
- Signed-in Free accounts can use the library, the rep list, show times, Dance Floors, a profile, Showcase setup, Showcase Studio, favorite reps, and favorite-rep notes.
- Free accounts cannot save a collection. Nic-Nac stays behind Silver. The public line is: Nic-Nac is your collection curator and jewelry finder assistant.
- Repo migration `apps/finder/supabase/migrations/20261003193000_sparkle_finder_free_access_split.sql` is not applied. `POST /api/finder/launch-notify` still inserts into the live Finder table.
- Finder vitest: 67 files, 833 passed. No deploy.
