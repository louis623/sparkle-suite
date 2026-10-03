# 2026-10-03 Smoke founder spots closeout

- Suite Smoke marketing pages `/` and `/learn` render `FounderStrip` from the live availability endpoint `https://www.yoursparklesuite.com/api/public/founder-availability`. The number is not hardcoded and Smoke does not count its own database.
- The same-origin Smoke route proxies that live endpoint, so the existing client poll updates when live changes. A failed Smoke refresh keeps the last live count instead of the unconfirmed fallback.
- No countdown, deadline, or date was on the live page. None was added.
- Header stays Portfolio, then Demos, beside the wordmark. Not deployed. Live database and live site were not changed.
