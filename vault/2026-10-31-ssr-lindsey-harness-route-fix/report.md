# Lindsey harness route fix — code-only closeout

Input: verified GitHub tip `b7ba3acd87472cdd2d90860eb55eb70def399c7d`, branch `codex/ssr-per-rep-allowlist`, disposable Linux worktree `/workspace/repos/sparkle-suite-ssr`. The difference from `5eaefb1f` was vault-only. Prompt committed first as `e0932201`. PR #169 remains draft.

Both cohorts now route to `/milehighfizz`, retaining `ssrReviewTheme`, `ssrReviewLayout`, and `lineupPresentation=grouped-v1`. Every load verifies the root marker immediately after the root is parsed, before a loading tap or paint sample is collected. Candidate requires `data-server-rendered="true"`; legacy rejects the attribute even if its value is empty or false. No load-state wait was added before the loading tap.

Final fixed cases (13 page rows):

| Theme | Page(s) | Layout |
| --- | --- | --- |
| gilded_autumn | homepage, join, trade | mile_high_fizz |
| alpine_opal | homepage, join, trade | mile_high_fizz |
| fall_owl_harvest_moon | homepage | mile_high_fizz |
| midnight_rose | homepage | mile_high_fizz |
| rose_gold | homepage | mile_high_fizz |
| halloween_pumpkin_witch | homepage, join, trade | standard |
| amethyst | homepage | standard |

The saved Pumpkin Witch layout is determined from `lib/amethyst/preview-template-data.ts`: Lindsey's MHF variant is applied only when the selected skin is Alpine Opal, for all three pages. The existing offline `mile-high-fizz-public-site` test proves the Pumpkin Witch data has no custom variant. No saved setting was read from or changed in a database.

Removed rows: `halloween_pumpkin_cat/homepage`, `pearl_rose/join`, and `midnight_rose/join`. These old standard-layout cases are outside the requested Lindsey saved-preset/post-H1 page set; they were removed rather than routed through another rep. Midnight Rose homepage is retained on MHF.

Necessary selector adjustments: the newly covered MHF home rows use the existing candidate `[data-mhf-video-toggle]`. The frozen Fall Owl/Midnight Rose standard controls do not mount on `.mhf-hero`, and legacy MHF has no video toggle or sound control, so those absent controls are not requested. Pumpkin Witch uses candidate `[data-hero-motion-toggle]` and legacy `.hpw-motion-control` on all three pages. Its legacy `aria-pressed` means paused, so only that new control's state is inverted to preserve the existing Pause/Play meaning. Navigation/CTA selection, tap gates, speed/CLS/error gates, waivers, and the 12000ms settle time are unchanged.

**Blocker: the requested positive legacy override check cannot pass within harness-only scope.** `lib/amethyst/homepage-smoke-review.ts` permits review selection only for `dudesfizzfest`, so both the HTML wrapper and normal template APIs reject the query on `milehighfizz`. Three offline checks call the real legacy wrapper with mocked saved data, confirm the parameters/review label are absent, execute the corresponding bootstrap, and confirm the existing runtime-theme guard rejects the resulting mismatch. This is a verified failure of the requested positive check, not successful override support. App code and guard authorization remain unchanged. A/B is not ready to run until this separate guard issue is resolved.

Validation results are recorded in `test-summary.json`. Focused checks cover both cohort URLs and all query parameters, pre-measurement SSR-marker mismatch rejection, the exact case/layout list, new control selection/state, the legacy guard blocker, and saved Pumpkin Witch layout mapping. CJS syntax and `git diff --check` also pass. One full suite is run with the existing external-socket/fetch guard and two workers; no performance/browser matrices are repeated.

No deploy, alias operation, Smoke/Live access, external DB access, account action, environment/settings change, extension edit, or merge. Only local synthetic tests and GitHub provenance operations are in scope.

Open Brain capture unavailable: tool discovery exposes no `capture_thought`; no substitute external service was accessed. This vault closeout records that failed attempt.

Next-session prompt: Resume PR #169 from the current verified GitHub tip and read this report. Keep the corrected harness cases/routes. Resolve the `milehighfizz` review-selection guard blocker only with authorization for that app-code change, then prove the real legacy HTML/template API honors both overrides locally and rejects mismatches. This session grants no deploy or Smoke/Live/DB access. Do not rerun deployments, A/B, or prior browser matrices automatically.
