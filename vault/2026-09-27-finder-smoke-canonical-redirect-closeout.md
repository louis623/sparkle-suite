# 2026-09-27 Finder Smoke canonical redirect

- Smoke production hosts such as `sparkle-finder-smoke.vercel.app` were 308ing to `yoursparklefinder.com` because `getSparkleFinderCanonicalRedirect` treats every `*.vercel.app` host as an alternate production host when `VERCEL_ENV` is `production`. Smoke deploys use `--prod`, so that check matched.
- Smoke markers (`NEXT_PUBLIC_SPARKLE_ENVIRONMENT=smoke` or `SPARKLE_ENVIRONMENT=smoke`) now skip that rewrite. The same check lives in `apps/finder/lib/sparkle-finder/smoke-environment.ts` and is used by the Finder password policy.
- Live production still redirects `www.yoursparklefinder.com` and non-Smoke `*.vercel.app` hosts to `yoursparklefinder.com`. Preview still skips.
- Draft PR #36 on `cursor/finder-smoke-canonical-redirect-cfbb`. No merge and no deploy. Smoke will keep bouncing until this is merged and a Finder Smoke production deploy is run.
