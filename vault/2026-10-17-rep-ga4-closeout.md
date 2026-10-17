# 2026-10-17 per-rep GA4

- Added service-role-only `rep_analytics_properties` and `rep_ga4_report_cache` migrations. The six-rep seed is manual and was not applied.
- Rep HTML injects a host-matched gtag. `?c=` cannot select another rep's measurement ID. Smoke ID `G-3XK98BLX70` is preview-host only.
- Home, Dance Floor, and Join now pass the rep id into the visit beacon.
- `/api/nic-nac/site-analytics` reads GA4 for the signed-in rep and returns an empty state when `GA4_READER_SERVICE_ACCOUNT_JSON` is missing.
- Not deployed. Live DB was not changed.
