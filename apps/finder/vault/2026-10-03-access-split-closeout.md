# 2026-10-04 — Finder intake signup

- Smoke sign-up stores first name, last name, email, phone, state, birthday month and day (no year), favorite stone, cut, finish, ring size, jewelry notes, user agreement, and privacy. The same row is the profile record a Suite rep sees.
- The 30-day Silver trial starts when that form is finished. A new auth row stays Free until then. On day 30 the stored access state becomes Free and a $6/month reminder is saved. No charge and no Stripe.
- Repo migration `apps/finder/supabase/migrations/20261004121500_sparkle_finder_collector_intake_trial.sql` is not applied. Learn copy, the Reps and Collectors footer disclaimer, and the live launch-notify insert stay. No deploy.
- Finder vitest: 68 files, 846 passed.

# 2026-10-03 — Finder access split

- Silver stays two things: saving a collection, and Nic-Nac. Trial still counts as Silver. Billing, price, and trial length were not changed.
- Signed-in Free accounts can use the library, the rep list, show times, Dance Floors, a profile, Showcase setup, Showcase Studio, favorite reps, and favorite-rep notes.
- Free accounts cannot save a collection. Nic-Nac stays behind Silver. The public line is: Nic-Nac is your collection curator and jewelry finder assistant.
- Repo migration `apps/finder/supabase/migrations/20261003193000_sparkle_finder_free_access_split.sql` is not applied. `POST /api/finder/launch-notify` still inserts into the live Finder table.
- Finder vitest: 67 files, 834 passed. No deploy.
- Draft PR #68 is `cursor/finder-access-split-be9e` rebased onto `3a90da09d130be976be9917c9485eaf2b8bb12d4` (`cursor/finder-learn-trial-cards-3dbd`). Finder and Suite footers keep the Reps and Collectors disclaimer. No deploy.
