# Per-rep GA4

Each live rep site can carry its own GA4 tag. The measurement ID comes from `rep_analytics_properties`, looked up by `rep_id`. A missing row renders no tag.

## Env vars

- `GA4_READER_SERVICE_ACCOUNT_JSON` — server-only service-account JSON for the GA4 Data API. Set it on Production when the reader key exists. If it is missing, `/api/nic-nac/site-analytics` returns an empty dashboard and does not error.
- `GA4_SMOKE_TEST_MEASUREMENT_ID` — Smoke and preview only. The approved value is `G-3XK98BLX70` (property `559335478`). The tag uses that measurement ID only when the real request host ends in `.vercel.app`. It never applies on a production host, including yoursparklesuite.com and rep domains.

## Database

Migrations:

- `supabase/migrations/20261017121500_ss_rep_analytics_properties.sql`
- `supabase/migrations/20261017121600_ss_rep_ga4_report_cache.sql`

The six live rows are in `supabase/manual/20261017_ss_rep_analytics_properties_seed.sql`. That file is not a migration. It matches `reps.custom_domain` and is run only when Louis asks.

Nic-Nac site settings cannot write these tables.
