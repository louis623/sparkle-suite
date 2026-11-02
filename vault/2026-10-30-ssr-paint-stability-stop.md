# PR #169 paint-stability work stopped — October 30, 2026

**Resumed with Louis's approval; local verification gate now passes.** The original stop below is retained as history. Both initial flyer cases passed unchanged alone, and the later optional-tagline/domain timeout also passed a separately approved fresh isolated rerun. Current code checkpoint and results are below; deployed speed and visual verification remain pending at this code commit.

Stopped at Step 1 under Louis's explicit zero-new-failing-names rule. No new commit, push, deployment or alias move. PR #169 remains at 04601fb6b89d1bb64d53be3a34e988bf80b0dbc5 on codex/ssr-per-rep-allowlist; the fix implementation remains uncommitted in the allowlisted disposable worktree.

Implemented: restore existing pinned legacy font files/weights on SSR home, preload the embedded hero heading face; render the computed empty Dance Floor body class before hydration; reserve Pause-button width before reduced-motion Play labels; use Amethyst opening-poster.webp and Sunset Beach hero-approved.png. Keep Pause/Play and reduced-motion behavior. No legacy/frozen assets, flyer code/timeouts or VM limits changed. Regenerated SSR runtime and strict parity hashes reflect the intended rendering changes.

TypeScript and production build passed. Focused checks passed 389/389, including all 69 layout-parity cases and eight new paint-stability cases. A sandbox-only EPERM attempt executed zero tests; the unchanged elevated run passed. Local synthetic comparison matched all 28 home heading pairs at 1440 and 390 pixels; all SSR font views and all 12 targeted shift probes had CLS 0. This does not establish deployed visual parity or speed.

Full-suite baseline: 6,036 passed / 76 failed / 5 skipped. The interrupted run observed the same 76 failures plus these two new timeout names in untouched workspace-card-qr-flyer.test.ts:

| Test under flyer render | Base pass ms | Current timeout ms |
| --- | ---: | ---: |
| renders gobble_and_fizz inside the safe zones and the QR decodes | 2112.478 | 5025 |
| decodes PNG and JPG for every theme and center mark, including a 30% JPEG resave | 516996.141 | 600015 |

The flyer file reported 40 passed / 2 failed in 802,964 ms. The task-owned runner was stopped after the new-failure result; no final whole-suite totals or completed suite-error comparison are claimed. No reruns or timeout/code changes followed. These are not established pre-existing flakes; further investigation needs Louis's direction under the stop rule.

Smoke alias readback remains dpl_5DM79yJh9NNFYEzH9QQyWsgNM6Pc. Final Smoke-only database readback: milehighfizz / a0683f86-a19b-4ee5-a8d1-16dd015371ee / halloween_pumpkin_witch / amethyst / zoom. ORIGINAL was already restored; no closeout write was needed. Six pre-fix appearance-only diagnostic changes included restoring ORIGINAL; no benchmark theme changes started. Actual catalog scope is 14 themes total, Alpine Opal last, explicitly approved by Louis.

No Live deployment, promotion, alias operation, environment read/change or DB connection. No Vercel project env/settings changes. Neither of the two newly authorized Smoke deployment attempts was used. NEW_HEAD does not exist yet. The A/B five-run benchmark and deployed visual matrix were not started; all 84 rows remain NOT RUN. Keep PR draft and do not merge or release.

Evidence and local gallery, retained locally rather than as an extra evidence commit:

- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/report.md
- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/full-suite-comparison.json
- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/full-suite-stopped.log
- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/local-summary.json
- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/gallery.html
- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/restored-original-final.json
- vault/2026-10-30-ssr-per-rep/smoke/parity-speed/alias-after.json

The task-owned synthetic server was closed. Deployment and fair-measurement helpers are prepared in .tmp-qa/parity-speed-*.cjs but have not been run against candidates. They must not be invoked until Louis resolves the failed gate and the required checks pass. The single fix-commit budget remains unused.

Open Brain closeout was captured and independently retrieved successfully in this session; the repository vault is also updated. No credentials were stored.

## Resumed local verification checkpoint

Louis authorized rerunning only the two initial failures unchanged. Gobble passed in 2,319.773 ms and the all-theme/center-mark sweep passed in 474,402.287 ms. The complete resumed suite finished in 1,435.51 seconds: **6,043 passed / 77 failed / 5 skipped**, 6,125 cases in 729 files. Baseline remains 6,036 / 76 / 5, 6,117 cases in 728 files; the eight new paint-stability cases all passed. All 69 layout-parity cases passed without changing any VM limit.

Its only additional failing name was `flyer render closes the tagline and website slots when they are absent, and prints a custom domain`, timed out at 5,322.040 ms against a 2,331.462 ms baseline pass. The retained file-only run used for the earlier three flake approvals also contains a 2,920.214 ms pass for this exact case, with the test source unchanged since October 24. Louis then explicitly approved a fresh single-case rerun after the full suite; it passed in **3,124.916 ms**. No flyer implementation, test, assertion or timeout was edited. The two initial cases passed in the complete resumed suite as well.

Full comparison: **zero unapproved new failing names, zero new suite-loading errors, zero new unhandled errors**. The same 76 baseline failures and existing four load errors / request-scope unhandled error remain. The additional flyer timeout is classified using its fresh isolated pass and the exact console error. Vitest JSON returned a STACK_TRACE_ERROR placeholder; the console's case-specific failure block explicitly says `Test timed out in 5000ms.` No non-timeout assertion is exempted. Full-run totals were not synthesized from the interrupted run.

The measurement observers were checked on two local synthetic pages and captured real heading/media paint times and layout-shift sources. This remains tooling validation, not the deployed legacy speed baseline. The task-owned local server and temporary browser are closed before deployment/performance work.

Louis's authorization now permits the single fix commit/push, followed by exactly two new Smoke Preview deployments of that exact head, using the same 39 deployment-only overrides. A enables MHF SSR and may receive only the normal Smoke alias after all 12 candidate GET controls pass; B disables MHF SSR and stays unaliased, accessible only through the existing automation bypass. Preserve rollback dpl_5DM79yJh9NNFYEzH9QQyWsgNM6Pc. No Live or project settings/env actions. The matrix uses the actual 14 themes, Alpine Opal last; test Sunset Beach phone home first because its approved PNG is 2,753,789 bytes. All deployed measurements are still pending at this checkpoint. Final local report and gallery remain in the evidence folder above; the post-deployment closeout must also be captured in Open Brain without creating an extra code commit.
