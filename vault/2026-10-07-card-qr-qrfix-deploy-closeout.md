# Suite Smoke PR #75 QR-fix redeploy — 2026-10-05

## Source
- Repo: louis623/sparkle-suite
- PR: #75 (draft) branch `cursor/smoke-card-qr-flyer-1376`
- Tip SHA: `2556abbb8825819c5c63e823cc62ad4c6d06af51`
- Commit: fix(workspace): render the Smoke site QR without Stripe secrets
- Confirmed in tree before deploy:
  - `loadCardQrContext` uses `resolveCardQrRequestOrigin` (no `getStripeConfig` / `getAppUrl` / `resolveCheckoutReturnOrigin`)
  - Section title **QR code**; buttons **Download QR** + **Copy QR** only
  - No Save to profile / Copy site address / field toggles
- Workdir: `/tmp/suite-smoke-pr75`
- Local branch name for gate only: `codex/nic-nac-trade-hardening` (not pushed)

## Target (Smoke only)
- Vercel project: `sparkle-suite-smoke` (`prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`)
- Scope: `louis-2849s-projects`
- Command: `vercel deploy --prod --yes --scope louis-2849s-projects --local-config scripts/smoke-environment/vercel.json` + github meta matching prior PR75 recipe (`githubCommitRef=codex/nic-nac-trade-hardening`, `githubRepo=sparkle-suite`)
- Did **not** deploy/link against live `sparkle-suite`
- Failed attempts (ERROR, no alias): `dpl_E3SeojXr…` (wrong commitRef meta), `dpl_uCfc99tw…` (githubRepo included owner)

## Result
- Status: READY
- Deployment id: `dpl_G4uxVtEujgyXqZccw2ygqeqUcrNi`
- Deployment URL: https://sparkle-suite-smoke-7g2o2bxht-louis-2849s-projects.vercel.app
- Inspector: https://vercel.com/louis-2849s-projects/sparkle-suite-smoke/G4uxVtEujgyXqZccw2ygqeqUcrNi
- Alias: https://sparkle-suite-smoke.vercel.app → this deployment (confirmed immediately and ~20s later)
- Meta SHA: `2556abbb8825819c5c63e823cc62ad4c6d06af51`
- Created (ET): Mon Oct 05 2026 ~4:59 PM EDT
- Smoke `/` → 200, `x-sparkle-environment: smoke`, `x-robots-tag: noindex…`
- Unauth `GET /api/workspace/card-qr/qr` → **401** `application/json` `{"error":"unauthenticated"}` (not a crash/500); `x-matched-path: /api/workspace/card-qr/qr`
- Signed-in PNG preview: not verified here (needs session cookies). Louis should hard-refresh and check the QR image.

## Live untouched
- www tip still `dpl_7THhPRRkoa58NPmhZpbjZZRVa7nu` (Ready, ~23h old)
- Zero successful deploy against project `sparkle-suite`

## Louis path
- https://sparkle-suite-smoke.vercel.app → hard refresh → sign in as `louis@neonrabbit.net` → **Workspace → Tools → QR codes, QR flyers, business cards → Open tool → QR code** section
- Expect a real QR image, Download QR, Copy QR; no Save / toggles / Copy site address

---

# Update 2026-10-07 ~7:07 PM ET: PR #75 + default-branch merge redeploy (Louis go 7:00 PM ET)

## Source
- Default branch ("main") = `codex/nic-nac-trade-hardening` @ `d148a7514274e3c453ca13018fdc35573bf246d7` (Nova's landing/FAQ, Fizz templates, FAQ articles #81)
- Merged default branch INTO PR #75 branch via GitHub "Update branch" (PR still draft, NOT merged into default)
- New PR #75 head: `0d9b49ea62564352270d2c8490db25848749c251` (parents 2556abbb + d148a751)
- Text conflicts: none (zero overlapping files). Remote merge tree == locally tested tree (`ca83f50c`)
- Local gates on merge: `tsc --noEmit` 0 errors; `vitest tests/workspace-card-qr.test.ts` 12/12; eslint on card-qr files 0 errors

## Semantic conflict found at build (fixed, NOT yet committed)
- 1st deploy `dpl_FyUBvQHAB7tNjJaRGW7YvVVHij3E` → ERROR (no alias change): Turbopack "server-only" import in client bundle
- Cause: PR #75 `lib/workspace/card-qr/access.ts` (client-bundled via DashboardPlaceholder) imported `isSuiteSmokeEnvironment` from `lib/sparkle-suite/live-founder-availability.ts`; main (bb7f6ffe) made that file dynamically import server-only `founder-availability-service.ts`
- Fix: drop the import; local non-exported `isSuiteSmokeEnvironment(env)` (same two-marker check) in access.ts
- Patch: `/workspace/suite-smoke-pr75-access-server-only-fix.patch` — **must be committed to `cursor/smoke-card-qr-flyer-1376` by a cloud agent** (box cannot push)
- With fix: tsc 0 errors, card-qr tests 12/12, local `next build` compiled OK (42/42 static pages)

## Deploy (Smoke only)
- Command: `vercel deploy --prod --yes --scope louis-2849s-projects --local-config scripts/smoke-environment/vercel.json --meta githubCommitSha=0d9b49ea… --meta githubCommitRef=codex/nic-nac-trade-hardening --meta githubRepo=sparkle-suite`
- Deployed tree = `0d9b49ea` + uncommitted access.ts fix
- Deployment id: `dpl_39mXJ7oHsUF85TJQdC485s9PeQfj` — READY
- URL: https://sparkle-suite-smoke-jsl3n7ajv-louis-2849s-projects.vercel.app
- Inspector: https://vercel.com/louis-2849s-projects/sparkle-suite-smoke/39mXJ7oHsUF85TJQdC485s9PeQfj
- Alias https://sparkle-suite-smoke.vercel.app → this deployment (confirmed via `vercel inspect` + `dpl=` in HTML)
- Previous alias target (rollback): `dpl_G4uxVtEujgyXqZccw2ygqeqUcrNi`
- Logs: /workspace/suite-smoke-pr75-mainmerge-deploy.log (failed), …-deploy2.log (good)

## Verified on alias (unauthenticated)
- `/` 200 smoke; h1/h2 headings identical to Live www (current main): "Your brand. Your show…", "Hi, I'm Louis.", "Get in at the start.", etc. (not the old Oct 5 landing)
- `/faq` 200 (Linktree article present)
- `/api/workspace/card-qr` 401 `{"error":"unauthenticated"}`
- `/api/workspace/card-qr/qr` 401 `{"error":"unauthenticated"}`
- `/nic-nac` (Workspace) 200; `/nic-nac?section=card-qr` 200
- Workspace client chunk contains hub tile "QR codes, QR flyers, business cards"
- `/api/public/founder-availability` 200 JSON
- Smoke production env vars: 24 present, same names as before deploy (values not read)

## Live untouched
- www.yoursparklesuite.com tip `dpl_BdoK5djFHtnr3tn1zhWxm5iGyD2U` (created 3:26 PM ET, before this work)
- No deploy/link against project `sparkle-suite`; no Supabase touched

## Louis path
- https://sparkle-suite-smoke.vercel.app → hard refresh → sign in `louis@neonrabbit.net` → Workspace → Tools → QR codes, QR flyers, business cards → Open tool → QR code section (Download QR / Copy QR)
