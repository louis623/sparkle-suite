# 2026-09-27 Finder Smoke password policy port

- Ported standalone Finder PR #1 (`48fdf67`, merged `f8a0c9c0`) into `apps/finder` on draft Suite PR #35, branch `cursor/finder-smoke-password-policy-abe4`, base `codex/nic-nac-trade-hardening` at `fcf02b6f`.
- Smoke (`NEXT_PUBLIC_SPARKLE_ENVIRONMENT` or `SPARKLE_ENVIRONMENT` = `smoke`): min length 6, copy `Smoke only — any password you can remember.` Live stays 8 characters, no character classes.
- `PasswordPolicyEnv` extends `NodeJS.ProcessEnv`. Reset and sign-up pages pass the policy. Sign-up rejects a short password with `weak_password` before Supabase.
- `apps/finder` vitest: `password-policy.test.ts` and `auth-routes.test.ts` passed (90). Sign-up route tests passed (7). No merge and no deploy.
- Next: review draft PR #35. A Smoke deploy of that SHA is what turns the shorter rule on. Do not deploy to the live Finder domain.
