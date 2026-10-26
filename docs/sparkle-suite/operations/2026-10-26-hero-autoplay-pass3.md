# PR #156 pass 3: real rep routes, preview only

Preview evidence is recorded below. **This candidate does not yet meet the complete Production Quality Standard. Do not release it to Smoke or Live.**

- Existing PR: https://github.com/louis623/sparkle-suite/pull/156
- Branch: `codex/hero-autoplay-smoke`
- Measured application: `c42b6c8683ad1bc0f6c7c16d05f48033d32e6148`
- Preview: https://sparkle-suite-smoke-heuiayc2a-louis-2849s-projects.vercel.app
- Preview deployment: `dpl_4Grf4F7z1FhFRTKXpy8eWVFgkupy`, target Preview, project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`.
- Live remains pinned to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`. Smoke remains `dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z`. Neither alias was changed.

## Customer behavior

Every theme starts its existing motion automatically, including a rep with a legacy saved Still/none setting. This intentionally overrides that legacy value at render time without rewriting the rep's saved row. The visitor's pause/resume controls remain functional. Browser reduced-motion preferences remain respected.

Amethyst/Unicorn, Fall Owl and Sunset Beach are the three themes with existing soundtracks. They attempt audible autoplay; if the browser rejects it, motion continues muted and sound retries on the first page tap or supported keyboard interaction. Explicit mute/pause cancels pending automatic sound. The other 20 themes have no soundtrack; this PR does not invent one. No website can promise audible autoplay in a fresh browser that blocks it.

## Corrections and risks

1. Pumpkin Witch now uses the Neon Butterfly hydration guard. It cannot decorate or remove hero nodes while `SPARKLE_FIRST_PAINT` is active. Early imperative DOM changes were forcing React to discard its server tree. This is independent of the older saved-Still autoplay regression.
2. Server HTML retains the business H1, rep/business sentence, public location and show-days copy. The deleted Mile High Fizz and Glowtique assertions are restored. The decorative marketing headline is H2. This changes heading semantics intentionally; it preserves the existing visible theme design.
3. Bootstrap/render exceptions and deadlines fall back to the original client-only HTML with HTTP 200. Five tests cover bootstrap throw, bootstrap timeout, renderer throw, a real VM CPU timeout and a successful settings read that finishes after the old bootstrap timer would have expired. The latter regression fails against the old code and passes after the deadline starts once mandatory reads finish; optional feature reads still start in parallel. Fallback is availability protection, not a claim that the slower client-only path meets the normal SSR performance target.
4. Show dates use the event's timezone, with tests across New York, Los Angeles and Tokyo. The server emits one ticker sentence. The client adds the visual looping copies after hydration.
5. Fonts and full stylesheets are cacheable assets; only selected critical styles and font-face declarations remain inline. Critical heading resets, positioned scene layers and custom-site selectors are preserved. Font metric fallbacks and reserved hero geometry constrain reflow. HTTP resource hints announce selected critical fonts and fixed images early.
6. The server hero paints before enhancement work starts. A buffered LCP observer releases full-style fetching and analytics after the first hero candidate paints. React/controllers start after all full styles apply, preventing an unstyled controller frame. Pointer/key input, hidden-page handling and a bounded deadline prevent a stuck enhancement path. Tests cover the image gate and escape paths. Full CSS must continue to have all above-fold rules represented in the critical subset; future style changes must run the build and visual checks.
7. Sunset's poster is painted once instead of downloading a covered background. The 360px video uses a 1.23 MB rendition instead of the 4.62 MB desktop source; its existing audio is copied unchanged. SSIM against the source is 0.9605. Desktop keeps the original source. Video quality and first paint require visual review, not only byte-size assertions.
8. Neon retains its button text node to avoid a child-list observer rescan. Explicit compositor hints were also tried, but repeated Windows phone checks still exceeded 200ms (216–272ms); an isolated software-rendering diagnostic also failed. The hints are not proven to improve response time, and the tap gate remains open. Amethyst controls avoid redundant poster/attribute mutations that restarted media and added tap work. Shared icons are inline SVG paths, eliminating the cross-origin fragment error on protected previews.
9. GA queues consent/config immediately and loads automatically after hero paint, without a click or a fixed long delay. Hidden/page-exit handling releases the loader too. Ultra-short visits that end before any network response cannot be guaranteed; actual preview page-view requests are recorded by the browser checks.
10. Below-fold social players load within 200px of the viewport instead of relying only on the browser's much wider lazy-load threshold. BlingKitchen's four TikTok players no longer compete with its initial hero. Player URLs, mute controls and visible autoplay behavior are retained. Gnome has narrow-phone scene and decoration renditions totaling about 19 KB instead of 92 KB; original art remains available for desktop and print.
11. Phone scene posters use responsive renditions; All seven movie-poster themes retain sufficient intrinsic poster resolution for their tall hero and compress it as AVIF. Sunset uses a 16.6 KB AVIF opening frame. Neon sign cutouts use pixel-identical lossless WebP, about 40% smaller. Critical font preloads now match the requested family and CSS weight-selection rules rather than accidentally choosing a companion family.
12. `PRODUCTION_STANDARD.md` is the canonical standard; its duplicate was removed. Branch allowlisting uses portable relative worktree paths.

Each product correction has its own commit. PR #154's precompiled production runtime remains in place; browser Babel and React development builds are not restored.

## Evidence protocol

Final application Windows checks: **48/48 retained the original server hero and heading**, across 24 real routes and both profiles, with zero React #418/#423, other hydration or unsafe-SVG errors. This includes `/milehighfizz` and `/blingkitchen`. Every theme's motion progressed automatically. Maximum observed CLS was **0.0193 phone / 0.0167 desktop**. The combined functional/tap gate passed **47/48**: Neon phone recorded **208ms**, above the 200ms requirement. Maximum desktop interaction was **144ms**. Repeated Neon phone diagnostics also exceeded 200ms; this is not waived as an outlier. These single functional-run values are separate from the five-run Lighthouse table.

Supplemental Linux software-rendering checks also retained all 48 server trees without hydration errors. Their tap gates failed for Neon phone (232ms), Neon desktop (536ms), Amethyst desktop (488ms) and BlingKitchen desktop (208ms). Those results are preserved in the `*-linux-supplemental.json` files; they are not substituted for or hidden behind the Windows results. The candidate cannot claim the interaction limit across all tested rendering environments.

All **48 final Windows functional filmstrips were visually inspected**. The first content is styled; no subsequent plain-text flash or page disappearance was observed. Initial blank time remains: Windows actual-throttle phone FCP ranged **1.176–3.660s**, versus **0.652–1.488s** desktop. Rose Gold was the slowest phone first paint; its trace contains a 2.370s initial layout of 467 objects under CPU throttling. This is a remaining startup concern, even though the isolated Lighthouse medians pass. Some artwork/font completion occurs after first styled content. Do not claim literally zero blank time or that every actual-phone observation was under 2.5s.

Final HTTP assertions on all **24/24 routes passed**: server-rendered 200 pages, business H1, rep sentence and public location when configured, no UTC show text, no embedded font binaries and no development runtime. HTML was **85,717–110,546 raw bytes**, with a **16,984–20,370-byte Brotli estimate**. Actual Lighthouse transfer sizes are preserved in the table JSON. HTML remains `no-store`; hashed fonts/full styles return `public, max-age=31536000, immutable`. The Sunset marketing WebP returned 200 and matched the repository SHA-256.

GA `page_view` requests were observed automatically on all 48 Windows checks: **4.240–6.921s phone / 1.088–2.889s desktop** after navigation. This proves automatic loading, not that every visit shorter than those intervals is counted. Earlier short-visit delivery remains an acceptance gap. BlingKitchen's deferred TikTok frame loaded its poster after scrolling, but the player did not expose playable media within the browser test window; external playback/mute behavior remains unverified. No claim of hearing audio on a physical device is made.

The matrix uses actual `/<slug>` routes, not `/skin-preview` or theme preview pages. It covers 23 themes and a second Pumpkin Witch route, for 24 routes per profile. The preview database contains labeled, non-live QA reps for themes without an existing preview rep. No Live account or provider object was changed.

The preview `/dudesfizzfest` copy now uses the preserved public Fizz Festival business name, long headline and saved Still value. It retains its preview Sunset Beach theme to reproduce the reported slow route. The preserved Live public projection uses Pumpkin Cat; therefore this is an exact copy of the regression-relevant saved fields, not a claim that the entire preview account is identical to Live. Every synthetic theme fixture also retains saved Still.

Lighthouse uses a fresh Chrome process for every sample, 360×800 phone with its standard simulated slow-4G/4×-CPU settings, and 1440×900 desktop with Lighthouse desktop settings. The complete matrix runs in temporary isolated Linux Vercel Sandboxes, four vCPUs each, Google Chrome 156.0.8078.47 and Lighthouse 13.5.0. Environment metadata accompanies the results. Five samples are retained per route/profile, including outliers. These lab results are not directly comparable with earlier Windows or single-run Live measurements. Separate Windows Chrome 155 browser checks use actual CDP network/CPU throttling, empty contexts, retained server-node identity, React error collection, media progression and button interaction timing. Isolated Linux functional checks are supplemental, since software rendering materially changes animation presentation cost.

Raw local evidence root: `C:/Users/louis/.codex/visualizations/2026/10/25/01a173ff-7ba2-7c11-a2d8-ba1b00d8f53f/pass3/`. Earlier `diagnostic*` runs are investigations, not acceptance evidence. Blocked-GA/CSS diagnostics are explicitly excluded. Lighthouse thumbnail timestamps describe the captured trace, not a physical slow-phone filmstrip.

## Per-theme timing and visual proof

The [real-route table and filmstrips](hero-autoplay-pass3-evidence/README.md) contain **all 240 Lighthouse samples**: 24 routes × five runs × two profiles. Every route passes the requested median gates: **phone LCP 1.071–2.297s**, **desktop LCP 0.377–0.614s**, phone CLS medians **0**, desktop CLS medians at most **0.000424**. Maximum individual CLS was **0.000802 phone / 0.011963 desktop**, also below 0.05. Both medians and maxima are retained; no slow sample was discarded. The table also lists the separate Windows FCP/LCP/CLS observations and all 48 actual-loading filmstrips, plus 48 Lighthouse thumbnail strips.

One Mile High Fizz desktop post-Lighthouse DOM snapshot lacked the SSR marker. This snapshot occurs after Lighthouse's back/forward-cache audit navigates away and reloads the page; it is not a response-HTML fallback detector. Its measured document was 99,692 bytes and its final screenshot was correctly themed. The observation is retained as inconclusive rather than relabeled as either a successful SSR response or a proven fallback. Separate response-HTML and retained-node checks passed.

Earlier rolled-back Live figures remain in the [original report](2026-10-25-hero-autoplay-smoke.md). They were single Windows observations with different content/profile settings; the new isolated-Linux median table is **not** an apples-to-apples Live speedup percentage.

## Repeatable reviewer path

Open the immutable preview through authorized Vercel access. Use the table’s real slug links, especially `/dudesfizzfest`, `/milehighfizz` and `/blingkitchen`. The `qap3*` routes are labeled preview fixtures, not Live reps. Start in an empty browser context, capture initial loading before clicking, then pause/resume and test mute on the three audio themes. Reload or close the context to reset the visitor controls; these checks do not submit forms or change rep settings. The QA scripts obtain ephemeral preview access through the Vercel CLI and send that credential only to the exact preview origin; no token is stored in the report.

## Full-suite comparison

Base `e78fa626`: 5,579 passed, 65 failed, four skipped and one unfinished assertion. Full run on `fb561132`, final focused replacements and the unchanged isolated QR matrix: 5,674 passed, 50 failed and four skipped. There are no new failing assertion identities. Both also have the same two import failures (missing waitlist migration and `@/app/robots`).

The final focused set passed 217 tests; TypeScript passed. The full isolated QR/flyer matrix passed all 42 tests, including every theme/center-mark PNG, JPEG and recompressed JPEG decode. Its full duration was 699 seconds. The earlier apparent new QR failures were resource-contention/time-budget failures and passed in isolation.

The complete current full run excluding the unchanged QR/flyer file finished with 5,630 passes, 50 failures and four skips. Adding the 42-test isolated QR proof and the final deadline and Neon control regressions yield the comparison above. [Machine-readable comparison and failing assertion names](hero-autoplay-pass3-evidence/test-comparison.json). This is not a clean green full-suite run. The remaining 50 existing failures and two import errors remain a production quality blocker and require a separate repair/investigation pass. No production-ready claim is made.

## Remaining quality gates and cost of finishing

- Reduce Neon's phone interaction cost below 200ms and resolve the slow actual-throttle startup observations. The current CSS hints and browser-only diagnostics did not establish a reliable fix; further rendering/profile work and repeat checks are required.
- Verify earlier GA delivery for short visits and actual TikTok playback/mute behavior. Loading a player poster is insufficient proof.
- Repair or substantiate the 50 baseline test failures and two import failures; do not remove assertions merely to make the suite green.
- Implement and verify the demo-only Live gate before any production promotion. This is additional release implementation work, not an existing capability.

These are engineering and verification work, not approval to release. Temporary isolated test machines were used for the complete timing matrix; their evidence is downloaded and they are stopped after completion. No new application service dependency was introduced. No reliable time/cost estimate is asserted for the unresolved profiling and baseline-test work.

## How this happened and the lesson

The original saved-Still override was introduced by `e5e40653a0383f7b8a9232702c08fd65a31c5c76` on August 15 ("preserve saved hero motion"), before PR #154. The original investigation reproduced Fizz Festival stopped on the preserved October 12 deployment; it did not establish when the account saved Still, or reproduce a universal #154 autoplay failure. [Original investigation and sound history](2026-10-25-hero-autoplay-smoke.md). Adding server first paint then exposed a separate lifecycle problem: Pumpkin Witch decorated the DOM before React hydrated it. Theme-preview tests also missed real rep content costs, notably BlingKitchen's social players. The corrective lesson is to test real rep routes with persisted settings and actual content, retain server-node identity as an assertion, and inspect filmstrips as well as medians. A fast theme sample alone is insufficient release evidence.

## Release boundary and rollback

Suite, Beacon and Rocky review the immutable preview before Smoke. No Smoke or Live release is authorized here. There is currently **no implemented demo-only Live gate** for this shared renderer. A global promotion would change every rep; that must be addressed before the standing demo-first release order can be followed.

See the [exact rollback and 15-minute recheck procedure](2026-10-26-pr156-release-rollback.md). The preserved command, documented but not executed, is:

```powershell
vercel promote dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P
```

After a future authorized release, the 15-minute recheck covers all 15 customer-facing aliases, the project alias and every active Live rep from a fresh inventory. Roll back first if anything is wrong.
