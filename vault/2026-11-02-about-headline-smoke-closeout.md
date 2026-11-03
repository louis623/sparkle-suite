# About headline punctuation — Smoke only

Louis approved this exact shared-file change after PR #172 merged. Verified base
0192efc941e1eb353e9d9794ef64948209e968d8; new disposable clean clone and scoped
branch codex/about-headline-smoke. PR #173 is draft/unmerged:
https://github.com/louis623/sparkle-suite/pull/173.

One tiny helper trims the name, preserves terminal ., ! or ?, and otherwise
adds one period. Both generated About headlines use it. Legacy and fast SSR
Homepage both consume this shared mapping; no separate SSR fix needed. Saved
headings/data, other wording and normal-name output remain unchanged.

Added exactly two cases (period-ending name with trailing spaces, normal name),
each covering settings and setup-draft headline paths. Ran only
tests/amethyst-preview-template-data.test.ts once: 50/50 passed. No full suite,
browser checks or test reruns; skip-ci markers prevent automatic full GitHub CI.

Initial Smoke build dpl_FUD4mCrZn4mhRCnDpK4nLub7fNh9 failed the exact shared-file
layout hash. Updated only that file's lock hash for Louis's explicitly approved
edit; all 11 lock checks passed. No application/test edits after the passing run.
Retried the failed build at application commit
184e319d40561377c19e1418096ee993f234ee10 (helper/test commit b9f75f2).

READY Smoke dpl_37NGwXGPST1emTVD1RofGDRS2AEa, project
prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ; source metadata confirms 184e319d.
https://sparkle-suite-smoke.vercel.app assigned and independently confirmed on
that deployment by Vercel API. Prior Smoke rollback target:
dpl_73vTE54NMgKg9rzq539XUyu2Cm2p. No Live, merge, data, provider, browser,
environment-variable or production branch/default changes.

This final note changes no deployed application source. Next: Louis reviews
Smoke. Keep PR unmerged; do not rerun passing tests or release Live without
separate approval.
