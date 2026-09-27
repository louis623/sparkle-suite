# 2026-09-27 Finder Smoke env typecheck

- Tip `d4a7e1ca` skipped the Smoke canonical rewrite, then Finder Smoke `next build` failed: `SparkleFinderEnvironment` did not extend `NodeJS.ProcessEnv`, so `process.env` was not assignable.
- `SparkleFinderEnvironment` is now an interface extending `NodeJS.ProcessEnv` with the same optional Smoke markers. Smoke skip behavior is unchanged. `apps/finder` `next build` finished TypeScript successfully.
- Draft PR #37 on `cursor/finder-smoke-env-typecheck-cfbb`. No merge and no deploy. Sam will merge and redeploy Finder Smoke only.
