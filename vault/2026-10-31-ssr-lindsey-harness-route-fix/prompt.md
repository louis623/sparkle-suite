# Suite SSR: Lindsey Smoke A/B harness route fix (code-only)

Model: GPT-6.1 Sol High. Worktree /workspace/repos/sparkle-suite-ssr, branch codex/ssr-per-rep-allowlist (draft PR #169), from the current tip (application code at 5eaefb1f plus any vault-only stop notes; verify that).
First commit this prompt to vault/2026-10-31-ssr-lindsey-harness-route-fix/prompt.md.
Testing bar (Louis 2026-10-31): focused tests for what changed plus one full pass at the end. No repeated matrices, no sub-pixel work.

## Why
The stopped Smoke A/B found that scripts/qa/ssr-smoke-ab.cjs route() sends both cohorts to /dudesfizzfest. On B (REP_RENDER_V2_SLUGS=dudesfizzfest) that slug is still SSR, so no legacy page is measured. ssr-ab-cases.cjs also omits Lindsey's Smoke preset (halloween_pumpkin_witch) and puts several reviewed MHF rows on the standard layout.

## Changes (harness only, no app code)
1. route(): use /milehighfizz for both cohorts (SSR on A, legacy on B), keeping ssrReviewTheme/ssrReviewLayout/lineupPresentation. Fail closed if a candidate response lacks data-server-rendered or a legacy response has it (per row, before measuring).
2. Cases: use the mile_high_fizz layout for every milehighfizz row that Rocky's post-H1 check covered: gilded_autumn, alpine_opal, fall_owl_harvest_moon, midnight_rose, rose_gold. Add halloween_pumpkin_witch home/join/trade on her real saved layout (read how milehighfizz renders it; don't guess). Keep amethyst home. Remove or move any row that can only be tested via another rep's slug, and list what you removed.
3. Confirm with a local check that the legacy renderer honors ssrReviewTheme/ssrReviewLayout on /milehighfizz and fails closed on mismatch (same guard as before).
4. Tests: a route test (both cohorts hit /milehighfizz), an SSR-marker mismatch fails, the case list matches the rows above.
5. Change nothing else (gates, waivers, selectors logic stay; update selectors only if a new row needs them, and say so).

## Rules
No deploys, no alias changes, no Smoke or Live access, no external DB access. Never print secrets. Stop after the code run.

## Report
NEW_HEAD; the final case list (theme/page/layout); removed rows; tests passed; full-suite numbers vs 6109/75/6 and any new failing names.

Shipping bar (Louis): decent and working. Only fix or block on real problems a person would notice or get stuck on (broken pages, errors, things not working, clearly slow pages, security/data risk). Skip rare edge cases and tiny visual or pixel differences; those get fixed when real users report them. Testing: focused tests for what you change plus one full pass at the end; no repeated full runs.
