# 2026-10-02 Smoke hub at `/`

- Branch `cursor/smoke-hub-at-root-fdc2` tip `f1e8f6786066080dc1ac4fe88f51d25f959d1d49` starts from hardening tip `777a38bd` (PR #58 `/learn` marketing landing). PR: https://github.com/louis623/sparkle-suite/pull/59
- Smoke alias was not moved in this session. `VERCEL_TOKEN` is not present here, so `sparkle-suite-smoke.vercel.app` still serves the previous deployment.
- Smoke `/` renders the two-card Suite/Finder hub. Any build that is not Smoke keeps the marketing landing at `/`.
- Suite Sign In is `href="/login"`. The PR #56 on-card shell is not on this tip and does not open login.
- Suite Learn More goes to `/learn`. Finder stays **Coming soon** with no signup URL (`yoursparklefinder.com/auth/*` redirects to the Suite homepage).
- `/learn` is unchanged. Not merged. Not aliased to `yoursparklesuite.com`.
