# 2026-10-02 Smoke hub at `/`

- Branch `cursor/smoke-hub-at-root-fdc2` starts from hardening tip `777a38bd` (PR #58 `/learn` marketing landing).
- Smoke `/` renders the two-card Suite/Finder hub. Any build that is not Smoke keeps the marketing landing at `/`.
- Suite Sign In is `href="/login"`. The PR #56 on-card shell is not on this tip and does not open login.
- Suite Learn More goes to `/learn`. Finder stays **Coming soon** with no signup URL (`yoursparklefinder.com/auth/*` redirects to the Suite homepage).
- `/learn` is unchanged. Not merged. Not aliased to `yoursparklesuite.com`.
