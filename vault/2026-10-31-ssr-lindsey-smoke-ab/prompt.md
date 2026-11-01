# Suite SSR: Lindsey (milehighfizz) Smoke A/B, one run (Chromium)

Model: GPT-6.1 Sol High. Repo louis623/sparkle-suite, worktree /workspace/repos/sparkle-suite-ssr, branch codex/ssr-per-rep-allowlist (draft PR #169).
APPLICATION SHA: 5eaefb1f0e903c7d0b2b0a78389672c7920aab6c. If the branch tip is newer, verify the diff from 5eaefb1f is vault-only, then deploy 5eaefb1f. Otherwise STOP.
First commit this prompt to vault/2026-10-31-ssr-lindsey-smoke-ab/prompt.md.
Rocky approved this harness at 5eaefb1f (pr169/NOTES.md, Re-review 5). Use the committed harness scripts/qa/ssr-smoke-ab.cjs as-is; don't change gates or cases. The local WebKit script ssr-local-lindsey.cjs is not part of this run.

Testing bar (Louis 2026-10-31): test only what matters to users or catches real bugs. ONE pass of the rows below. No repeated matrices, no reruns to chase small differences, no sub-pixel work. Record misses and finish; stop only for a safety problem.

## Safety gates (unchanged from earlier Smoke runs)
- DB binding: run exactly `bash /workspace/codex-runs/tools/smoke-db-binding-check.sh` and proceed ONLY if it prints "RESULT: SMOKE BINDING OK" and exits 0. Don't do your own decrypt/compare. On anything else, STOP before deploying and report its (value-free) lines.
- Secret filtering: never print secrets, tokens, bypass values, share links or cookies. No raw get_alias/get_project JSON; strip *bypass*/*token*/*secret*/share-link fields before printing. Keep the bypass only in variables or temp files outside the repo, deleted afterwards. Report env NAMES only.
- NOTHING on Live: no access to Live project prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3 or Live DB bqhzfkgkjyuhlsozpylf. No Vercel env/settings/protection changes, no new bypass tokens, no merge (PR stays draft), no sends, checkouts or provider actions.

## Step 1: two Smoke deployments of 5eaefb1f
Smoke project prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ only, with the 39 deployment-only overrides listed in vault/2026-10-29-release-ssr-finder/planned-deployment-env-names.json, passed for both runtime and build env exactly as for dpl_2tsBNUCP3cFyvf9Au155cMTX3s51:
- 3 Smoke DB bindings from the Smoke project's own values (temp file outside the repo, deleted afterwards). Never a Live value.
- NEXT_PUBLIC_SPARKLE_ENVIRONMENT=smoke, SPARKLE_ENVIRONMENT=smoke, SPARKLE_RELEASE_REPOSITORY=louis623/sparkle-suite, SPARKLE_RELEASE_BRANCH=codex/ssr-per-rep-allowlist.
- Every other inherited credential/flag in the list set EMPTY.
- A (SSR): REP_RENDER_V2_SLUGS=dudesfizzfest,milehighfizz. B (legacy): REP_RENDER_V2_SLUGS=dudesfizzfest, unaliased, reached only via the existing automation bypass.
- Don't set SSR_PREVIEW_PAGE_DATA_DELAY_MS or SSR_PREVIEW_THEME_OVERRIDE.
One attempt per deployment; on a build failure report the error and stop.
Record ALIAS_BEFORE (expected dpl_2tsBNUCP3cFyvf9Au155cMTX3s51; if different, record and STOP). Rollback target = ALIAS_BEFORE.

12 GET controls on A's URL and B's URL (HTTP 200 and `data-server-rendered`): milehighfizz home/trade/join = SSR yes on A, no on B; dudesfizzfest home/trade/join = yes on both; blingkitchen and smokecodex home/trade/join = no on both. Only if A passes 12/12, move sparkle-suite-smoke.vercel.app to A and rerun the 12 on the Smoke domain (must match A). Save A-candidate-controls.json, A-alias-controls.json, B-candidate-controls.json.

## Step 2: one A/B pass with the committed harness
milehighfizz (rep a0683f86-a19b-4ee5-a8d1-16dd015371ee) appearance_preset may be changed temporarily in the Smoke DB pukemqiwlyqmyytxkdmo only, guarded and read back after each change. Leave template amethyst and motion zoom unchanged.
Rows (desktop and phone, method as the harness defines it):
- Lindsey's own: gilded_autumn and alpine_opal, home/join/trade. alpine_opal last.
- Her Smoke preset: halloween_pumpkin_witch home/join/trade.
- Fixed in this PR: amethyst home; fall_owl_harvest_moon, midnight_rose and rose_gold home on the MHF layout.
Gates are the harness's: SSR LCP/FCP no slower than legacy (same theme), CLS exactly 0, no page or #418/#423/#425 hydration errors on the candidate, loading taps warn >200 / fail >300 ms, idle taps fail >200 ms, absolute targets with the five hard-coded phone waivers. Also confirm per theme: hero animation autoplays with no click and Pause/Play works.
Then restore milehighfizz appearance_preset to ORIGINAL halloween_pumpkin_witch and read it back independently. Confirm the alias is on A and B has zero aliases.

Commit the report and evidence (CSV/JSON, a few compressed screenshots, control receipts) under vault/2026-10-31-ssr-lindsey-smoke-ab/ and push.

## Report (plain, pass/fail with numbers)
- Binding-check result; A and B deployment IDs; alias before and after.
- 12 controls on A, alias and B.
- One table: row, device, SSR vs legacy LCP median, CLS, errors, worst tap loading/idle, autoplay yes/no, PASS/FAIL/WAIVED.
- Overall count of passing rows; every FAIL listed with its number.
- preset restore read-back; confirmation nothing on Live changed.

Shipping bar (Louis): decent and working. Only fix or block on real problems a person would notice or get stuck on (broken pages, errors, things not working, clearly slow pages, security/data risk). Skip rare edge cases and tiny visual or pixel differences; those get fixed when real users report them. Testing: focused tests for what you change plus one full pass at the end; no repeated full runs.
