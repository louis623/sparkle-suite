# PR #156 — preview-only quality pass

**Preview verification complete for the listed performance, autoplay and rendering checks. Full-suite failures still prevent a Production Quality Standard sign-off. No release approval is requested.**

Louis requested a second pass on the existing branch and PR. Suite, Beacon and Rocky review this preview before Smoke. No Smoke or Live deployment, promotion, account mutation, or alias reassignment is authorized in this pass.

## Candidate and release boundary

- Repository: `louis623/sparkle-suite`.
- Worktree: `C:/Users/louis/sparkle-suite-repo/.codex-worktrees/hero-autoplay-smoke`.
- Branch: `codex/hero-autoplay-smoke`; PR #156 targets `codex/nic-nac-trade-hardening`.
- Application candidate: `fba6acda25a46e64747c01601d23066099f2eb84`.
- Preview: https://sparkle-suite-smoke-ku4fukcnv-louis-2849s-projects.vercel.app . Vercel authentication is required.
- Preview deployment: `dpl_2PPW1Wcf5kToQ7Pwjdmr9odVEZEY`, target `null` (Preview). The project is named `sparkle-suite-smoke`; that name does not mean the Smoke alias was moved.
- Both Live domains remain on `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`.
- `sparkle-suite-smoke.vercel.app` remains on `dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z`.

## Customer behavior

Every theme starts its existing animation by default, including when an old rep record contains `Still`/`none`. The stored record is not rewritten. The old Still choice is labeled **Theme default (autoplay)**. Visitor pause/resume remains available on themes with those controls, and reduced-motion preferences are respected.

Unicorn, Fall Owl and Sunset Beach are the three existing themes with audio tracks. They attempt audible autoplay. If Chrome rejects it, motion continues muted and sound is retried on the first page tap or Enter/Space activation. Explicit pause/mute intent cancels that retry. Silent themes do not acquire invented sound. [Chrome's autoplay policy](https://developer.chrome.com/blog/autoplay/) can prevent audible playback before a gesture; earlier permission or media engagement explains why an established visitor may have heard sound automatically.

## Changes and risks

The earlier investigation is preserved in [the first-pass report](2026-10-25-hero-autoplay-smoke.md). The real Fizz Festival record contains `heroMotion: still`; commit `e5e40653a0383f7b8a9232702c08fd65a31c5c76` (August 15) began applying that saved value after theme defaults. Its save date is unknown. Default sample animation still worked on the October 12, rollback, and #154 deployments, so the evidence does not establish a universal autoplay failure introduced by #154. The landing preview separately forced videos muted in `5365533d` (October 6). This PR fixes those paths together with the precompiled-page performance work.

- Re-encoded approved scene pixels into responsive 720/1440 WebP delivery files; original art remains intact. Sunset's phone background fell from 68,322 to 36,644 bytes, with a 25,798-byte first-paint poster. Its desktop background fell from 295,582 to 140,706 bytes.
- Deliver only selected theme assets. Embed selected Google Latin font faces and matching fallback metrics so visible text does not wait through a stylesheet/font waterfall. Existing Fontshare delivery stays on its CDN.
- Hydrate the actual server-rendered page instead of replacing it. Deterministic sparkle positions avoid random server/browser differences. The first client render uses the server's locale/timezone and timestamp, then switches to visitor-local dates. UTC, New York and Tokyo checks confirm that the server hero node is retained.
- Keep Sunset's poster visible before scripts execute. Neon Butterfly waits for hydration before its observer adds decorations. Preview SVG conversion also waits until hydration finishes.
- Preserve precompiled production scripts and selected theme runtime ordering from the #154 repair. No Babel or React development runtime is introduced on deployed pages.
- Add a shared first-gesture audio fallback, with disposal and explicit-control cancellation.
- Reserve the existing phone hero height and final headline width in Garnet, Amber and Rose Quartz. Weight-specific font fallback metrics prevent late font swaps and button wrapping from recentering the hero. The final typography and shared layout stylesheet are preserved.
- Overlap independently guarded public homepage reads while settings, calendar, lineup and metadata load. Results remain request-local; no rep data cache was introduced. An intermediate attempt touched a locked template and was rejected by the build. That file was restored exactly; the final implementation is in request-loading modules and all 11 locks pass without baseline changes.
- Queue the existing analytics consent, page-view configuration and shop-click events immediately, then download the Google Analytics library after first contentful paint. A double-animation-frame DOM-ready fallback supports browsers without paint observation. This avoids competing with initial HTML/artwork; very short visits can leave before an asynchronous analytics download completes, so the timing change is a review risk. Analytics identity and consent rules are unchanged.

Risks are server/browser agreement, observer timing, image crop/quality, font metrics, and audio intent after a blocked autoplay attempt. Tests cover rep isolation, motion lifecycle, first-gesture behavior, cross-timezone hydration and unchanged shared layout. All 11 shared layout locks remain unchanged.

The existing Fontshare font picker requires a separate rights review under its current SaaS/font-selector terms. This pass does not redistribute those proprietary binaries or assert a license grant. The cost of that review or any licensing change is not established. See `public/amethyst/fonts/README.md`.

## Verification method

Fresh installed Chrome 155.0.8059.81 contexts, empty preferences/cache, strict user-activation audio policy. Phone: 360×800, DPR 1, touch, 4× CPU slowdown, 150 ms latency, 1.6 Mbps download and 0.75 Mbps upload. Desktop: 1440×900, DPR 1, no throttling. Runs are serial, after the full-suite workers stop.

Five cold loads per theme/profile. Reported LCP includes outer navigation time plus the sandbox child offset; it is not merely the child-document clock. CLS uses the standard maximum session window. No clicks occur before timing collection ends. First-run filmstrips use CDP navigation start, not the first screenshot, as time zero. Functional interaction runs are separate from LCP measurement.

Phone provenance: the 20 passing themes measured on `7d5874c9` retain those five-run samples. Their delivered styles and font markup are byte-for-byte identical on `4d5459f4`, verified in `unaffected-delivery.json`. Only Garnet, Amber and Rose Quartz delivery changed; their five-run phone samples were replaced with new measurements of `4d5459f4`. Desktop measurements use `4d5459f4` throughout. Original failed samples remain in the local evidence; none were silently discarded. This is a laboratory comparison, not a field Core Web Vitals claim.

The subsequent `df58c555` and `fba6acda` changes affect public request loading, rep analytics scheduling and their tests. Analytics is already excluded from theme-preview routes. Theme-preview rendering, styles, browser scripts, fonts and images are unchanged, so the 230 per-theme timing samples are retained with explicit provenance. The final rep route is measured separately after those changes.

The real Live public projection for `/dudesfizzfest` was read into an ignored local fixture. It identifies Fizz Festival and saved `heroMotion: still`; all 23 theme defaults render as motion-on. No rep data was copied into a new externally reachable preview endpoint. Browser checks of these fixtures cover actual saved settings without mutating the account.

All 23 saved-settings desktop browser cases pass: autonomous motion, existing pause/resume and sound controls, first-tap sound retry, and no hydration errors. The preview project's actual `/dudesfizzfest` record remains **The Dudes Fizzfest / Sunset Beach**, while the Live record is **Fizz Festival / Pumpkin Cat**. Neither account was edited; their speed measurements must not be presented as an identical-data comparison.

The exact saved Pumpkin Cat selection also passes the slow-phone autoplay/pause/resume check. This uses a loopback-only copy of the existing public projection, not a freshly seeded rep account.

## Per-theme results

All 23 themes pass both five-run median gates. Phone LCP: **1.162–1.928 seconds**; desktop LCP: **0.567–1.077 seconds**. Maximum median CLS is **0.0357 phone / 0.0293 desktop**. Sunset Beach is **1.743 seconds phone / 0.929 seconds desktop**. Its slowest phone sample was **2.573 seconds**, retained in the evidence.

See the [complete 23-theme table, all five samples, and 46 first-paint filmstrips](hero-autoplay-pass2-evidence/README.md). Both settled contact sheets and every filmstrip were visually reviewed. No unstyled public-index flash or content disappearance after the first themed paint was observed. Filmstrips retain the initial network wait; this is not a claim of content at time zero.

The final preview's existing `/dudesfizzfest` route also passes five-run medians: **1.984s phone LCP / 0 CLS**, **1.024s desktop LCP / 0.0104 CLS**. The first phone load after deployment was 2.776s; the remaining four were 1.904–2.016s. Before the final request-loading and analytics changes this route measured 2.788s phone median, then 2.572s after the request-loading change alone. Keep the cold outlier visible; the requested median gate passes, not every individual load.

For historical context, the [first-pass report](2026-10-25-hero-autoplay-smoke.md#load-measurements) preserves the rolled-back Live measurements and the earlier 7.256s Sunset Smoke measurement. Those were single-run diagnostics at 390px, and sample-preview clocks excluded outer navigation. They are not a five-run, same-profile comparison with this 360px pass; no speedup percentage is asserted from them.

The deployed `/marketing/demo-themes/sunset_beach.webp`, compiled homepage, 720/1440 WebP backgrounds and lightweight poster all return 200 with bytes identical to the repository. The production build remains precompiled; no Babel or React development request was observed.

All **46 final preview functional cases pass** (23 desktop, 23 slow phone): automatic motion, existing pause/resume controls, sound-first attempts, first-page-tap audio fallback and mute. Maximum observed control-event duration is **104ms on each profile**. UTC, New York and Tokyo checks preserve the original server hero node with no hydration errors. [Control evidence](hero-autoplay-pass2-evidence/controls.json), [saved-settings proof](hero-autoplay-pass2-evidence/saved-settings-proof.json), [hydration](hero-autoplay-pass2-evidence/hydration.json), [test comparison](hero-autoplay-pass2-evidence/test-comparison.json), [deployed assets](hero-autoplay-pass2-evidence/preview-assets.json), and [real-route samples](hero-autoplay-pass2-evidence/real-route-summary.json) are checked in for review.

## Full-suite comparison

Base `e78fa626c443124ba11725dc93d32e859985ffa4`: 5,579 passed, 65 failed, 4 skipped, 1 unfinished assertion. Neither initial full run completed `workspace-card-qr-flyer.test.ts`; the verified worker processes were stopped. An isolated one-worker check of that file also did not finish within three minutes. This does not establish whether it is hung or just unusually slow.

The final candidate rerun excluded that unfinished file. With the last contract, font, request-loading and analytics changes separately rechecked: 5,593 passed, 51 failed, 4 skipped. There are no new failing assertion identities relative to base. Two import failures also occur on base: a missing historical waitlist migration and missing `app/robots` module. This is **not a clean full-suite pass**. The 159 tests in the contract recheck, 54 font/first-paint/layout/theme tests, 167 motion lifecycle tests, 16 Neon theme/readability tests, 152 request-loading/identity/layout tests, and 34 final analytics/identity/layout tests pass. Those focused counts overlap and must not be added together. The final Vercel production build and TypeScript checks pass.

The remaining baseline failures and unfinished QR check require a separate test-repair investigation before a blanket production-quality claim. No paid service is required for that investigation; its implementation effort has not been estimated.

## Evidence location

Artifact root: `C:/Users/louis/.codex/visualizations/2026/10/25/01a173ff-7ba2-7c11-a2d8-ba1b00d8f53f/pass2/`.

- `verified-performance/`: complete 230 per-run metrics, 46 first-run filmstrips, settled screenshots and aggregate table. `median-five/` preserves the original three failing phone themes; `font-fixed-preview/` contains their corrected five-run samples.
- `hydration-final.json`: final preview UTC/New York/Tokyo server-node retention checks.
- `saved-settings.json`, `saved-settings-verified/`: actual saved public settings, rendered and exercised locally; all 23 pass. Rep fixtures and their screenshots are kept local.
- `actual-route-verified/`: five phone and five desktop measurements plus first-run filmstrips of the final rep route. `actual-route/` and `actual-route-final/` preserve the two intermediate performance misses.
- `preview-assets.json`: deployed asset identity checks, including the landing theme picture.
- `final-controls/`: all 46 final preview autoplay/control results, screenshots and filmstrips.
- `base-suite.json`, `final-suite.json`, `final-contract-recheck.json`, `test-comparison.json`: full baseline/candidate results and explicit limitations.

## Repeating the checks

Use the same installed Chrome and an empty context for each sample. `PLAYWRIGHT_MODULE` may point to the bundled runtime's Playwright package. Authenticate the protected preview using the existing Vercel project identity, for example `vercel env run --project prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ --scope louis-2849s-projects -- node ...`. The helper scopes that short-lived identity to the exact preview origin; do not export credentials, disable preview protection, or create a public rep-data fixture.

- Timings: `node scripts/qa/hero-performance.cjs PREVIEW OUTPUT phone THEMES 5`, then the same command with `desktop`. `THEMES` is the comma-separated list of all 23 IDs in the results table. Run serially without a test suite or another browser matrix competing for CPU/network.
- Controls: `node scripts/qa/hero-autoplay-matrix.cjs PREVIEW OUTPUT desktop`, then `phone`. Omitting the theme argument checks all 23.
- Hydration: `node scripts/qa/hero-hydration.cjs PREVIEW OUTPUT.json`.
- Real saved settings: place the public homepage-template projection in an ignored `.local/` file; run `tsx scripts/qa/hero-saved-settings.ts INPUT http://127.0.0.1:3005`, start `node scripts/qa/hero-saved-settings-server.cjs`, and run the control matrix against that loopback origin. The builder rejects externally hosted fixture origins. Never commit or upload the generated rep fixtures.
- Assets: `node scripts/qa/hero-preview-assets.cjs PREVIEW OUTPUT.json` checks exact deployed bytes, including the Sunset marketing picture.
- Summaries: `node scripts/qa/summarize-hero-performance.cjs OUTPUT APPLICATION_SHA` and `node scripts/qa/compare-hero-tests.cjs ARTIFACT_ROOT`. The latter explicitly combines the full run with focused rechecks; it does not claim a clean full-suite pass.

## Exact rollback

This pass moves no release alias. To withdraw it, stop reviewing this immutable preview; Smoke and pinned Live already remain on their previous deployments. The pre-pass PR checkpoint is `459b51f8360e432ec712a6aa9db2f04ae7437e96`. App changes in this pass are `fb1c0669`, `86c04d94`, `cf889ecb`, `7d5874c9`, `4d5459f4`, `df1a07ea`, `df58c555`, and `fba6acda`; revert those in reverse order if withdrawing the code. Do not promote, unpin, or change Live as part of a preview rollback.

Lesson: server-rendering must be tested across timezones and with real saved settings. A fast sample with fresh preferences does not prove hydration, rep delivery, or controller ordering. Keep the slower samples and count the whole navigation.
