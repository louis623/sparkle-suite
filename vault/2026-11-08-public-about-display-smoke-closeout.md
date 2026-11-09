# Public About display fixes — Smoke and PR only

[PR #186](https://github.com/louis623/sparkle-suite/pull/186) targets
`codex/nic-nac-trade-hardening` from `codex/public-about-display-fixes`.
Fresh base `b617799da95a82eca54e09de876cfccd85847c9f`; application
`b79ed0decb2cd76d26fbddfbea87a3a075535f77`. Disposable clone:
`/tmp/sparkle-about-20261108`. No merge or Live release, DB writes, environment
writes/overrides, production aliases, Chrome extension or personal sessions.

## Result

No saved narrative maps to empty About slots rather than template paragraphs.
Targeted public, served legacy, and v2 SSR About renderers drop blank/stock
schedule lines, hide the text block when no real paragraphs remain, keep real
portrait/video media, and omit the section when both story and media are absent.
Saved narratives retain their existing mapping/normalization. Media mapping uses
only authored captions; the template portrait editor hint cannot be inherited.
No theme-specific exception was added.

## Work and limits

Before the handoff was read, only the clean clone/branch, branch guard entries,
read-only inspection, and npm dependency installation existed. No prior tests,
full build, deployment, or page loads needed repeating.

Ran exactly once:
`node node_modules/vitest/vitest.mjs run tests/amethyst-homepage-template.test.ts tests/amethyst-preview-template-data.test.ts --reporter=json --outputFile=.local/about-display/tests.json`

56 homepage tests and 59 preview-data tests passed (115 total; zero failures).
Exactly two new cases cover empty narratives with no media/portrait/video and
portrait caption absence/preservation, exercising all three renderer sources.
Existing seven-paragraph mapping/bootstrap regressions passed in the same run.
No test rerun, unrelated test file, full suite, or separate typecheck. Commits use
`[skip ci]` to avoid the repository's automatic full-suite PR workflow.
One local asset regeneration, then one Vercel production-mode build as part of
the single preview deployment. The build's branch safety, 11 shared layout locks,
compilation and TypeScript stages passed. No repeated application build.
Unrelated line-ending-only generated CSS/runtime changes were excluded.

## Smoke deployment

[Smoke empty-bio review](https://sparkle-suite-smoke.vercel.app/milehighfizz#about).
READY deployment `dpl_3WvhKXacBFVQY4JRZ83eDee8fcKn`, application `b79ed0de`,
project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, team
`team_kvcmZ4RlZB0Hah65NE3280x5`, preview target (API target=null).
The exact pinned branch/SHA was fetched by Vercel through Git; existing Smoke
environment values were used without writes or request overrides. A preliminary
API request with target=preview was rejected with HTTP400 before any deployment
was created; the corrected request omitted target per Vercel's API. Exactly one
deployment/build record was created. No retry after build creation.

Only `sparkle-suite-smoke.vercel.app` moved, confirmed by alias readback.
Rollback: restore that alias to `dpl_FDtpNvqP7AUqeeV95fGQGNottHp1`, application
`03954b8d59deab73f9fa21b6129365d206622131`.

## Page review and gaps

Used **1 of maximum 2 page loads**, one isolated anonymous Chromium navigation
to `/milehighfizz#about` on the stable Smoke domain. Read-only Smoke data confirmed
its narrative is empty and its media slots absent. HTTP200, targeted slug correct,
paragraph payload `["","",""]`, zero About copy blocks/sections, no stock About
schedule line, no editor hint, and zero page errors. Desktop1440px and a390px
resize of the same page had no horizontal overflow. No form was submitted;
browser non-GET requests/third-party frame navigations were blocked (two GA
collection POSTs blocked). No account/authentication or provider operation.

`maingemco` and `brittwithbling` have no records in Smoke DB
`pukemqiwlyqmyytxkdmo` (read-only inspection). No fixtures were created under the
no-writes constraint. Consequently the maingemco saved-bio Smoke comparison is
**unchecked**, and the second page load was not used. A real portrait caption and
media-only empty-story layout were verified by the focused automated cases, not
by a deployed browser fixture. No slow-4G reload, animation/performance, all-theme,
or Live review was performed. Do not call this Live-ready or claim maingemco
acceptance.

Evidence: [desktop](../docs/sparkle-suite/qa/2026-11-08-about-display/empty-about-desktop.png),
[resized phone](../docs/sparkle-suite/qa/2026-11-08-about-display/empty-about-phone.png),
[browser receipt](../docs/sparkle-suite/qa/2026-11-08-about-display/browser.json),
[test counts](../docs/sparkle-suite/qa/2026-11-08-about-display/test-summary.json).

## Files changed

- `lib/amethyst/preview-template-data.ts`: empty narrative and authored-caption mapping.
- `public/amethyst/homepage.jsx`, `lib/amethyst/legacy/assets/homepage.jsx`,
  `lib/amethyst/v2/homepage.jsx`: matching public About empty-state handling.
- `public/amethyst/compiled/homepage.js`, `lib/amethyst/generated/page-runtimes.json`:
  affected generated v2 browser/runtime output only.
- `tests/amethyst-preview-template-data.test.ts`: exactly two new regression cases.
- `tests/fixtures/customer-site-layout-lock.json`: only mapper hash updated with
  explicit requested shared-change receipt; ten other locks and guard unchanged.
- `config/active-branches.json`, `docs/sparkle-suite/operations/branch-register.md`:
  requested PR branch registered for Smoke preview only; default/production branch
  unchanged.
- This closeout and the four evidence files linked above.

## Memory and next session

Repo vault closeout written on the PR branch. Open Brain capture could not be
attempted beyond tool discovery: no `capture_thought`/Open Brain MCP tool is
available in this session. No substitute diary or history rebuild.

Next-session prompt: Read this receipt and PR186. Keep Smoke/PR only and preserve
all testing/deployment/load limits already consumed. Verify maingemco's unchanged
saved bio only after an approved Smoke fixture is available; do not seed data,
change env, rerun tests/builds, redeploy, merge, or release Live without a new
scoped instruction.
