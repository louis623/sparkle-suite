# 2026-10-03 — Live Finder launch-notify list

- `POST /api/finder/launch-notify` still returns `201` `{ "ok": true }` and the existing error codes. `/learn` keeps the same URL.
- The insert reads only `SPARKLE_FINDER_SUPABASE_URL` and `SPARKLE_FINDER_SERVICE_ROLE_KEY`. It runs only when the URL host is `pzksocboqauqjdtsgpdp.supabase.co` and the service-role JWT `ref` is `pzksocboqauqjdtsgpdp`.
- Smoke project `awdwtxcqkqrzgdikrwab` is not an insert target. The Smoke `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` client is not a fallback. A missing or other target returns `503` `service_role_not_configured` and does not insert.
- The stored row shape is unchanged: `source` is `finder_learn_notify`. No `customer_audience` and no `rep_id`.
- No migration. No deploy. The branch allowlist is unchanged.
- Draft PR #64 is `cursor/finder-live-launch-notify-811e` against Finder Smoke `cursor/finder-learn-v2-c9ad` (`3dc2fed3`).
