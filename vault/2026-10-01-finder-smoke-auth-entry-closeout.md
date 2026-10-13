# October 1, 2026 - Finder Smoke magic-link entry

- Smoke magic-link sign-in was returning to `/auth/sign-in` because `/auth/confirm` only accepted `token_hash`. Default PKCE emails return `code`. Confirm now exchanges that code, then `/auth/post-login` sends a real session to the collection home (`/`) instead of another auth screen.
- The sign-in magic link is requested in the browser and returns to the host the visitor is on, so Smoke stays on `https://sparkle-finder-smoke.vercel.app`.
- Anonymous Smoke (`SPARKLE_ENVIRONMENT` or `NEXT_PUBLIC_SPARKLE_ENVIRONMENT` = `smoke`) skips the coming-soon page and starts at `/auth/sign-in?next=/`. Signed-in Smoke and live anonymous marketing stay on their current homes.
- No email delivery check, no Vercel promote, no customer-domain alias change. After this commit is accepted, deploy that exact SHA to Vercel project `sparkle-finder-smoke` (`prj_PvqPYv0R3DclFbFmM6vVNX2Q50gl`) and leave `yoursparklefinder.com` where it is.
