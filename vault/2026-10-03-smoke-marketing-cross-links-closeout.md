# 2026-10-03 Smoke marketing cross-links

- Suite Smoke `/` and `/learn` share a footer Sparkle Finder link hardcoded to `https://yoursparklefinder.com`, which 308s to live Suite. Finder Smoke `/learn` and `/learn-live` share a footer Sparkle Suite link hardcoded to `https://www.yoursparklesuite.com`.
- Smoke builds already set `SPARKLE_ENVIRONMENT` or `NEXT_PUBLIC_SPARKLE_ENVIRONMENT` to `smoke`. Those markers now choose the other product's Smoke landing. Production builds keep the live hosts. No new URL env var, because the Smoke env guard rejects live-host strings.
- Suite footer change is draft PR #65 on `cursor/smoke-marketing-cross-links-bc31`. Finder `/learn` is not on the hardening tip; it is PR #60. The Suite-link change is draft PR #66 on `cursor/finder-smoke-suite-link-bc31`, based on that branch.
- Focused Suite marketing tests passed. One existing public-landing Nic-Nac assertion (`No pay-the-difference`) failed and was left alone. Finder `learn-page.test.tsx` passed 4 tests.
- Not merged. Not deployed. This session had no `VERCEL_TOKEN`. Smoke hrefs stay wrong until Suite Smoke deploys #65 and Finder Smoke deploys #66. Do not alias `yoursparklesuite.com` or `yoursparklefinder.com`.
