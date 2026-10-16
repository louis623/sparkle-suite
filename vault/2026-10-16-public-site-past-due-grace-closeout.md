# 2026-10-16 public-site past_due grace

- PR #109 on `cursor/public-site-past-due-grace` (`64880135`), based on `c8f3e6b2`. `git am` applied cleanly. Not merged.
- Public rep sites stay up for `past_due` and go away for canceled, unpaid, incomplete_expired, paused, or no subscription. Blocked customer domains return 503 noindex. Their llms.txt and sitemap return 404 noindex. Customer domains do not fall back to the Suite demo. Workspace access still blocks `past_due`.
- `tsc` passed. Full vitest: 53 failed on both the base and this branch. The 13 new tests passed. No new failures.
- Smoke preview only: `dpl_PH3BvdbNEef1GkLgqRyJeuRf5x4R` on `sparkle-suite-smoke`, target preview, ready. Live `www.yoursparklesuite.com` stays on `dpl_EzNsHJEScRTAXUfKXY91hpk9MJNg`. The Smoke alias stays on `dpl_Epu1Cfx8PQPi1iJneUPscHEAesfK`. No Live database write and no billing change.
