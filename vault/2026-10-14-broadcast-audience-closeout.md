# 2026-10-14 broadcast audience closeout

Louis approved a Smoke-only audience fix at 7:18 PM ET. Draft PR only. No merge and no Live write.

- `all_active`, monthly reports, and weekly birthday reports now keep active `account_classification=customer` reps, plus `louis@neonrabbit.net` on slug `dudesfizzfest`.
- Demo and agent classifications stay out of that fan-out. Explicit selected recipients are unchanged.
- Manual scripts, not migrations: `supabase/manual/20261014_deactivate_noncustomer_reps.sql` and `supabase/manual/20261014_deactivate_noncustomer_reps_undo.sql`. Off value is `inactive`.
- Smoke REST inventory found none of the deactivation emails. The SQL script was not executed because no Smoke Postgres password was available.
- Live script stays unrun until Louis says OK.
