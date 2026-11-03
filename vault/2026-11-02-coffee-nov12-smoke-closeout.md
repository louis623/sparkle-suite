# Coffee with Louis — November 12 start, Smoke only

Louis approved one small PR from verified production tip cb7b691a. PR #172 is
draft and unmerged: https://github.com/louis623/sparkle-suite/pull/172.

Application commit 811a4d42d919577f77622e22b4eb7015b18ef626 changes only the
Coffee anchor to November 12, 2026, its date comment, and the two authorized
test files. The 8 PM Eastern time, 14-day interval, cadence text, Meet URL and
strict rollover at session start are unchanged. Nov 12, Nov 26, Dec 10 follow;
Nov 5 is no longer a session. Required branch/workspace guard bookkeeping limits
codex/coffee-nov12-smoke to the separate Smoke preview project.

Exactly one test run: coffee-with-louis.test.ts 8/8 passed;
nic-nac-dashboard-placeholder.test.ts 150/150 passed. No full suite, browser
checks or reruns. Commit skip-ci markers prevented automatic full GitHub CI;
the post-PR run list was empty.

Smoke deployment dpl_73vTE54NMgKg9rzq539XUyu2Cm2p is READY, source metadata
confirms application commit 811a4d42 and Smoke project
prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ. Alias sparkle-suite-smoke.vercel.app was
assigned and independently confirmed on that exact deployment by Vercel API.
URL: https://sparkle-suite-smoke.vercel.app. Raw deployment URL is provenance:
sparkle-suite-smoke-4b0qyt2hl-louis-2849s-projects.vercel.app.

Rollback Smoke alias to previous dpl_CtNKmL7hNtJs5msptKUuXGpAGniA if needed.
No Live project, merge, account/data, environment-variable, domain/DNS, extension,
email/SMS or browser action. Environment metadata inspection was blocked; the
deployment used the existing Smoke project configuration without retrieving
secrets. This closeout-only commit does not alter the deployed application.

Next action: Louis reviews Smoke; keep PR unmerged and do not release to Live
without separate explicit approval. Do not repeat the passing tests.
