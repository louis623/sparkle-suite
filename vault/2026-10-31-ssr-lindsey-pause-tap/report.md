Code commit: `d0c858ffbe179340f5d13322c1151c166646e8d2`. Input tip: `dc644c83b7df4cb0d8d88491dc3e31ffad3f580a`. Worktree `/workspace/repos/sparkle-suite-ssr`, branch `codex/ssr-per-rep-allowlist`. PR #169 remains draft. The final pushed NEW_HEAD is reported in the completion message; the closeout commit adds evidence only.

Candidate-only acceptance: candidate page errors and hydration errors (#418/#423/#425 included) fail; legacy runtime errors remain in the raw baseline rows. Legacy tap medians remain in the output with `baselineOnly: true`, without timing failures or warnings. Measurement failures, invalid/missing samples and legacy theme mismatches still fail. Candidate loading medians warn above 200 ms and fail above 300 ms; idle medians fail above 200 ms. The offline Lindsey runner shares these thresholds. Legacy same-theme verification, FCP/LCP comparisons, CLS 0 requirement, 12000 ms A/B settle and the fixed waivers table are unchanged.

Optional Pause tweak: **not made**. No customer motion/runtime code changed. Rocky traced pending-play Pause blocking to WebKit on Linux, even on a blank page. This pass retained loading Pause medians of 726 ms on phone and 729 ms on desktop for Gilded Autumn home. These remain failed timing gates without a waiver, but are the prompt's known nonblocking test-browser quirk under Louis's decent-and-working bar. No deployed performance or new customer defect is asserted from these offline samples.

Each cell below is the largest per-control median for that browser/phase, in ms (loading / idle). Each control has five samples. Full per-control medians and every sample are in [local-browser-results.json](local-browser-results.json). `FAIL` means loading >300 ms or idle >200 ms; `WARN` means loading >200 ms through 300 ms.

| Theme / page | Device | Chromium loading / idle ms | WebKit loading / idle ms |
| --- | --- | ---: | ---: |
| gilded_autumn/home | phone | 49.3 / 47.2 | 726.0 **FAIL** / 45.0 |
| gilded_autumn/join | phone | 47.1 / 46.9 | 62.0 / 54.0 |
| gilded_autumn/trade | phone | 46.6 / 46.3 | 39.0 / 40.0 |
| alpine_opal/home | phone | 46.8 / 47.4 | 105.0 / 42.0 |
| alpine_opal/join | phone | 62.1 / 79.5 | 86.0 / 85.0 |
| alpine_opal/trade | phone | 63.2 / 70.4 | 79.0 / 49.0 |
| gilded_autumn/home | desktop | 47.1 / 46.5 | 729.0 **FAIL** / 58.0 |
| gilded_autumn/join | desktop | 62.4 / 47.2 | 82.0 / 80.0 |
| gilded_autumn/trade | desktop | 47.3 / 47.2 | 38.0 / 39.0 |
| alpine_opal/home | desktop | 47.8 / 47.1 | 154.0 / 50.0 |
| alpine_opal/join | desktop | 116.9 / 146.9 | 131.0 / 159.0 |
| alpine_opal/trade | desktop | 61.7 / 77.4 | 260.0 **WARN** / 76.0 |

640 trusted tap samples, 72 split-stream checks and eight clock probes completed. Chromium native CLS is 0 throughout the split checks. WebKit exposes no native LayoutShift entries; its maximum measured frame-by-frame displacement is 0 px, not a native CLS claim. Positive page errors and hydration errors are 0 throughout the tap/stream checks and four positive clock probes. All four negative clock controls triggered the expected hydration errors. All idle medians pass. The sole warning without failure is WebKit desktop Alpine Opal trade loading CTA at 260 ms.

One browser pass was continued from its fingerprinted checkpoint after the command process exited with signal 143 at 256 saved taps; completed samples were reused, not repeated. No timing result was discarded or replaced. The source fingerprint matched before continuation. Transport, selectors, control behavior and settle logic were unchanged.

Focused tests: 24 passed across `ssr-smoke-ab-gates.test.ts` and `amethyst-ssr-lindsey.test.ts` (the latter generates the offline fixtures). New/updated harness coverage includes slow legacy taps passing, legacy page/hydration errors passing, legacy theme mismatch failing, measurement/missing evidence failures, and loading/idle thresholds.

Full suite: **6109 passed / 75 failed / 6 skipped**, versus **6106 / 75 / 6** (+3 passing tests). Exactly one full-suite invocation ran after the browser pass, with two workers and an external-socket guard. **New failing names: none. New suite-load errors: none.** The same four pre-existing suite-load errors remain: `prelaunch/prelaunch-crawl-metadata.test.ts`, `remy-communications-schema-contract.test.ts`, `sparkle-finder-public-show-window-migration.test.ts`, and `thanksgiving-migration.test.ts`. All 733 test files represented in the baseline remain represented in this result. Counts and comparison are in [test-summary.json](test-summary.json). No repeated full run.

No deployment, alias operation, Smoke/Live access, external database access, environment/settings changes, secret disclosure, legacy/frozen asset edit or Chrome extension change. The full test process used an external-socket block; browser requests were confined to the ephemeral loopback server. No build or additional full matrix was run.

Open Brain capture unavailable: no `capture_thought` tool is exposed after discovery. This report is the short repository vault closeout.

Next-session prompt: Verify the current GitHub tip of `codex/ssr-per-rep-allowlist`, read this report, and keep PR #169 draft. The harness change is code-only; the known WebKit/Linux pending-play Pause quirk was retained. Any deployment, Smoke/Live, DB or environment work requires a separately authorized task. Do not repeat completed full runs or chase minor visual/timing differences.
