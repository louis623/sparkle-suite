# SSR parity and speed verification — October 30, 2026

Status: STOPPED SSR LCP budget failure comparative baseline incomplete ORIGINAL restored

**STOPPED at the first performance row.** Sunset Beach phone home SSR observed median LCP is **29.236 s**, conclusively above the 3 s requirement; all five SSR raw CLS sums are zero. The legacy observed-window median of **14.780 s is provisional** because its hero media was not ready when contexts closed. The earlier slower-than-legacy conclusion is withdrawn. No fair final relative-speed proof or complete deployed visual-parity claim is made. ORIGINAL was restored and independently read back; no further measurements or application-code/deployment/alias changes followed.

| Flyer timing flake with isolated-pass evidence | Base pass ms | Isolated pass ms | Recorded full timeout ms | Resumed full ms / status |
| --- | ---: | ---: | ---: | --- |
| flyer render renders gobble_and_fizz inside the safe zones and the QR decodes | 2112.478 | 2319.773 | 5025.000 | 3069.863 / passed |
| short-link QR on every shared theme decodes PNG and JPG for every theme and center mark, including a 30% JPEG resave | 516996.141 | 474402.287 | 600015.000 | 508914.790 / passed |
| flyer render renders amber inside the safe zones and the QR decodes | 2089.874 | 1698.391 | 5276.085 | 1662.913 / passed |
| flyer render renders velvet inside the safe zones and the QR decodes | 2074.681 | 1863.782 | 5585.961 | 1479.921 / passed |
| flyer render shrinks a long show title instead of cutting it off | 2472.359 | 1553.627 | 5039.555 | 1678.927 / passed |
| flyer render closes the tagline and website slots when they are absent, and prints a custom domain | 2331.462 | 3124.916 | 5322.000 | 5322.040 / failed |

The resumed full suite completed. Verification gate: PASS — zero unapproved new failing names or errors. Approved exceptions apply only to unchanged flyer timeout failures supported by isolated passes.

The initial two requested cases were rerun individually, then Louis explicitly authorized one additional fresh isolated tagline/domain test after the full suite. It passed in 3124.916 ms. Its retained earlier file-only pass of 2920.214 ms is also preserved. The earlier three accepted cases use their retained isolated-file timings. Evidence is recorded in flyer-timing-flakes.json and the isolated JSON files. Native checks and all limits remain unchanged. Timeout exceptions require the exact case-matched console error; Vitest's JSON reporter stored STACK_TRACE_ERROR for the resumed timeout, while its console explicitly records “Test timed out in 5000ms.” No QR assertion failure is exempted.

NEW_HEAD: 057665f5ed7a56fccbb70442e4691ee51cee2960. Starting head: 04601fb6b89d1bb64d53be3a34e988bf80b0dbc5.

## Fixes

- Home now uses the existing pinned legacy font files and weights. The hero font is preloaded from the same embedded resource and decoded from the head. Existing utility-page font loading remains in place.
- Empty Dance Floor state is rendered into the initial body class using the same computed board state as React, preventing the 38 px reverse-ticker removal after hydration.
- Pause buttons retain their initial width when reduced motion changes Pause to Play, preventing the right-aligned controls from shifting.
- Amethyst uses opening-poster.webp; Sunset Beach uses hero-approved.png. Pause/Play and reduced-motion handling are retained.
- Legacy pages, frozen assets, flyer implementation/timeouts and VM limits remain unchanged.

## Local checks

TypeScript, production build and focused 389/389 checks passed. All 69 focused layout-parity cases passed. Local synthetic comparison: all 28 home heading pairs match legacy fonts, weights, height and wrapping at 1440/390; all SSR views CLS 0. All 12 targeted shift probes CLS 0. The local frozen-JSX fixture is a visual reference only, never the legacy speed baseline.

Full-suite comparison: {"baseline":{"passed":6036,"failed":76,"skipped":5,"total":6117,"files":728},"current":{"complete":true,"passed":6043,"failed":77,"skipped":5,"total":6125,"files":729},"gatePass":true,"newFailureNames":["flyer render closes the tagline and website slots when they are absent, and prints a custom domain"],"approvedTimingFlakes":["flyer render closes the tagline and website slots when they are absent, and prints a custom domain"],"unapprovedNewFailures":[],"newErrors":[],"newUnhandled":[]}. The first focused attempt executed zero tests because Windows sandbox cache renames returned EPERM; the unchanged elevated run passed all 389. No VM or flyer limit was raised. The original six assertion corrections remain documented in ../report.md; this task changes the obsolete no-home-font assertion to require the requested embedded fonts.

## Six retained assertion corrections

| Case | Before | Now | Why the rendered page was already correct |
| --- | --- | --- | --- |
| Custom-domain home | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing the `data-ssr-review-label` attribute. | The string occurred in an inlined CSS selector; there was no review-label element. The SSR marker, custom-domain canonical, `/trade` and `/join` links, and empty rendering slug checks already passed. |
| Custom-domain Dance Floor | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing that attribute. | The same shared CSS selector was present, with no label element. Its SSR marker, canonical, links and rendering-identity checks already passed. |
| Custom-domain Join | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing that attribute. | The same CSS-only occurrence caused the failure. Its SSR marker, canonical, links and rendering-identity checks already passed; the separate Join-visibility denial case also passed. |
| MHF home, `sparkle_rise` | Looked for the contiguous substring `WITH LINDSEY` anywhere in the serialized hero HTML. | Selects the `p.mhf-hero-with` content, removes HTML comments only, and requires its entire text to equal `WITH LINDSEY`. | React serialized the visible text as `WITH <!-- -->LINDSEY`. The complete hero-tree comparison against frozen legacy already passed before this assertion. |
| MHF home, `still` | Looked for the same contiguous substring in the serialized hero HTML. | Requires the exact paragraph text after removing comments only. | The same React comment separated the two correct text nodes. The complete frozen-vs-SSR hero-tree comparison already passed. |
| MHF home, `none` | Looked for the same contiguous substring in the serialized hero HTML. | Requires the exact paragraph text after removing comments only. | The same non-visible comment caused the failure; the complete legacy hero-tree comparison already passed. |

## Smoke provenance

A: {"id":"dpl_8DfMaFhJ24ZS8tWjXfAnsmP2LC88","url":"sparkle-suite-smoke-6xrldu4ja-louis-2849s-projects.vercel.app","projectId":"prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ","head":"057665f5ed7a56fccbb70442e4691ee51cee2960","branch":"codex/ssr-per-rep-allowlist","state":"READY","target":null,"observedAt":"2026-10-31T01:08:33.564Z"}.

B: {"id":"dpl_2ytZHWnguyyg1oDu2VSu8V5Z3coj","url":"sparkle-suite-smoke-lk3695v6o-louis-2849s-projects.vercel.app","projectId":"prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ","head":"057665f5ed7a56fccbb70442e4691ee51cee2960","branch":"codex/ssr-per-rep-allowlist","state":"READY","target":null,"observedAt":"2026-10-31T01:13:21.396Z","aliasCount":0}.

Alias before / rollback: dpl_5DM79yJh9NNFYEzH9QQyWsgNM6Pc. Alias after: {"alias":"sparkle-suite-smoke.vercel.app","deploymentId":"dpl_8DfMaFhJ24ZS8tWjXfAnsmP2LC88","projectId":"prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ","url":"sparkle-suite-smoke-6xrldu4ja-louis-2849s-projects.vercel.app","changed":true,"newDeployments":2,"head":"057665f5ed7a56fccbb70442e4691ee51cee2960","previousDeploymentId":"dpl_5DM79yJh9NNFYEzH9QQyWsgNM6Pc"}.

Original: halloween_pumpkin_witch. Final readback: {"rep_id":"a0683f86-a19b-4ee5-a8d1-16dd015371ee","public_site_slug":"milehighfizz","appearance_preset":"halloween_pumpkin_witch","customer_site_template":"amethyst","hero_animation_type":"zoom","readbackVerified":true,"writeRequiredAtCloseout":true,"readbackAt":"2026-10-31T01:27:56.778Z","restoredFrom":"sunset_beach","benchmarkAppearanceUpdates":1,"benchmarkRestorationUpdates":1,"restorationConnectorErrorBeforeSuccessfulRetry":true}.

Before the fixes, six guarded appearance-only diagnostic changes tested Fall Owl, Pumpkin Cat, Pie Please, Alpine Opal and Gobble & Fizz, then restored ORIGINAL. The final readback required no write. No benchmark theme changes were started and no other manual database fields were changed.

## Method and results

Actual 14 community themes approved by Louis, Alpine Opal last. Five fresh contexts per renderer and row, alternating SSR then legacy. Desktop 1440×900 unthrottled; phone 390×844, 150 ms latency, 1.6 Mbps down / 0.75 Mbps up, 4× CPU. Both immutable deployment origins receive the same existing automation bypass, scoped only to those exact hosts; the normal Smoke alias separately passed all 12 GET rechecks. No forms, tracking POSTs, WebSockets or service workers. LCP/CLS observers start before page scripts. CLS uses the largest session with less than one second between shifts and less than five seconds total; the raw shift sum is also retained and every SSR run must have raw sum zero. The attempted first-visible-hero method sampled animation frames and font visibility; its validity issue is disclosed below, so it is not a certified first-visible-hero result. Raw paint candidates, layout-shift sources, navigation/resource timings and long tasks are preserved.

Recorded five-pair rows: 1/84. Fully validated comparative rows: 0/84. NOT RUN means no completed five-run pair, never a passing inference. Required: SSR median LCP <2 s desktop / <3 s phone, no slower than legacy, every SSR run CLS 0. Reduced-motion checks are separate from normal-speed samples. The first row failed the independent SSR budget; the remaining 83 rows and separate reduced-motion/deployed visual matrix were not run.

| Theme | Page | Device | SSR median LCP s | Legacy median LCP s | SSR median CLS | Legacy median CLS | SSR / legacy first visible hero s | Result |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| amethyst | home | desktop | — | — | — | — | — / — | NOT RUN |
| amethyst | home | phone | — | — | — | — | — / — | NOT RUN |
| amethyst | trade | desktop | — | — | — | — | — / — | NOT RUN |
| amethyst | trade | phone | — | — | — | — | — / — | NOT RUN |
| amethyst | join | desktop | — | — | — | — | — / — | NOT RUN |
| amethyst | join | phone | — | — | — | — | — / — | NOT RUN |
| fall_owl_harvest_moon | home | desktop | — | — | — | — | — / — | NOT RUN |
| fall_owl_harvest_moon | home | phone | — | — | — | — | — / — | NOT RUN |
| fall_owl_harvest_moon | trade | desktop | — | — | — | — | — / — | NOT RUN |
| fall_owl_harvest_moon | trade | phone | — | — | — | — | — / — | NOT RUN |
| fall_owl_harvest_moon | join | desktop | — | — | — | — | — / — | NOT RUN |
| fall_owl_harvest_moon | join | phone | — | — | — | — | — / — | NOT RUN |
| gilded_autumn | home | desktop | — | — | — | — | — / — | NOT RUN |
| gilded_autumn | home | phone | — | — | — | — | — / — | NOT RUN |
| gilded_autumn | trade | desktop | — | — | — | — | — / — | NOT RUN |
| gilded_autumn | trade | phone | — | — | — | — | — / — | NOT RUN |
| gilded_autumn | join | desktop | — | — | — | — | — / — | NOT RUN |
| gilded_autumn | join | phone | — | — | — | — | — / — | NOT RUN |
| gobble_and_fizz | home | desktop | — | — | — | — | — / — | NOT RUN |
| gobble_and_fizz | home | phone | — | — | — | — | — / — | NOT RUN |
| gobble_and_fizz | trade | desktop | — | — | — | — | — / — | NOT RUN |
| gobble_and_fizz | trade | phone | — | — | — | — | — / — | NOT RUN |
| gobble_and_fizz | join | desktop | — | — | — | — | — / — | NOT RUN |
| gobble_and_fizz | join | phone | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_cat | home | desktop | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_cat | home | phone | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_cat | trade | desktop | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_cat | trade | phone | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_cat | join | desktop | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_cat | join | phone | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_witch | home | desktop | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_witch | home | phone | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_witch | trade | desktop | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_witch | trade | phone | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_witch | join | desktop | — | — | — | — | — / — | NOT RUN |
| halloween_pumpkin_witch | join | phone | — | — | — | — | — / — | NOT RUN |
| midnight_rose | home | desktop | — | — | — | — | — / — | NOT RUN |
| midnight_rose | home | phone | — | — | — | — | — / — | NOT RUN |
| midnight_rose | trade | desktop | — | — | — | — | — / — | NOT RUN |
| midnight_rose | trade | phone | — | — | — | — | — / — | NOT RUN |
| midnight_rose | join | desktop | — | — | — | — | — / — | NOT RUN |
| midnight_rose | join | phone | — | — | — | — | — / — | NOT RUN |
| pearl_rose | home | desktop | — | — | — | — | — / — | NOT RUN |
| pearl_rose | home | phone | — | — | — | — | — / — | NOT RUN |
| pearl_rose | trade | desktop | — | — | — | — | — / — | NOT RUN |
| pearl_rose | trade | phone | — | — | — | — | — / — | NOT RUN |
| pearl_rose | join | desktop | — | — | — | — | — / — | NOT RUN |
| pearl_rose | join | phone | — | — | — | — | — / — | NOT RUN |
| pie_please | home | desktop | — | — | — | — | — / — | NOT RUN |
| pie_please | home | phone | — | — | — | — | — / — | NOT RUN |
| pie_please | trade | desktop | — | — | — | — | — / — | NOT RUN |
| pie_please | trade | phone | — | — | — | — | — / — | NOT RUN |
| pie_please | join | desktop | — | — | — | — | — / — | NOT RUN |
| pie_please | join | phone | — | — | — | — | — / — | NOT RUN |
| rose_champagne | home | desktop | — | — | — | — | — / — | NOT RUN |
| rose_champagne | home | phone | — | — | — | — | — / — | NOT RUN |
| rose_champagne | trade | desktop | — | — | — | — | — / — | NOT RUN |
| rose_champagne | trade | phone | — | — | — | — | — / — | NOT RUN |
| rose_champagne | join | desktop | — | — | — | — | — / — | NOT RUN |
| rose_champagne | join | phone | — | — | — | — | — / — | NOT RUN |
| rose_gold | home | desktop | — | — | — | — | — / — | NOT RUN |
| rose_gold | home | phone | — | — | — | — | — / — | NOT RUN |
| rose_gold | trade | desktop | — | — | — | — | — / — | NOT RUN |
| rose_gold | trade | phone | — | — | — | — | — / — | NOT RUN |
| rose_gold | join | desktop | — | — | — | — | — / — | NOT RUN |
| rose_gold | join | phone | — | — | — | — | — / — | NOT RUN |
| sparkle_suite_morganite | home | desktop | — | — | — | — | — / — | NOT RUN |
| sparkle_suite_morganite | home | phone | — | — | — | — | — / — | NOT RUN |
| sparkle_suite_morganite | trade | desktop | — | — | — | — | — / — | NOT RUN |
| sparkle_suite_morganite | trade | phone | — | — | — | — | — / — | NOT RUN |
| sparkle_suite_morganite | join | desktop | — | — | — | — | — / — | NOT RUN |
| sparkle_suite_morganite | join | phone | — | — | — | — | — / — | NOT RUN |
| sunset_beach | home | desktop | — | — | — | — | — / — | NOT RUN |
| sunset_beach | home | phone | 29.236 | 14.780† | 0 | 0.07673507413528274 | UNVERIFIED | FAIL — SSR budget |
| sunset_beach | trade | desktop | — | — | — | — | — / — | NOT RUN |
| sunset_beach | trade | phone | — | — | — | — | — / — | NOT RUN |
| sunset_beach | join | desktop | — | — | — | — | — / — | NOT RUN |
| sunset_beach | join | phone | — | — | — | — | — / — | NOT RUN |
| alpine_opal | home | desktop | — | — | — | — | — / — | NOT RUN |
| alpine_opal | home | phone | — | — | — | — | — / — | NOT RUN |
| alpine_opal | trade | desktop | — | — | — | — | — / — | NOT RUN |
| alpine_opal | trade | phone | — | — | — | — | — / — | NOT RUN |
| alpine_opal | join | desktop | — | — | — | — | — / — | NOT RUN |
| alpine_opal | join | phone | — | — | — | — | — / — | NOT RUN |

† Legacy is an observed-window value, not a settled median baseline. Its five captures had no hero loadeddata event; the fifth video was still at currentTime 0 while play was pending. The readiness helper inspected [data-hero-media] backgrounds but missed legacy .hp-hero-media, and skipped an opacity-zero video before its first frame. Raw observations are preserved in benchmark-sunset_beach.json; measurement-audit.json records these limitations. No comparative speed conclusion is valid from this row.

First visible hero is **not certified**: the RAF heuristic incorrectly treated unloaded, unused faces of a font family as potentially blocking the heading. Raw median estimates (SSR5.700s / legacy14.728s) remain for audit only. Actual earliest observed hero LCP-paint candidates have medians SSR2.736s / legacy14.780s; these are browser paint observations, not a guarantee of the very first visible hero pixel. No measurement was silently replaced or rerun.

Runs over 10 s in LCP, first visible hero or total observation: 10; see over-10s-runs.json for critical-path evidence. Total observation includes the fixed three-second settling window after load, fonts and video readiness; it is distinct from visible-paint time. Cold starts must not be inferred solely from a slow request. Sunset Beach phone home is measured first because its approved PNG is 2,753,789 bytes; Alpine Opal remains last.

All ten recorded LCP values exceed 10 s, including the provisional legacy observations. **SSR cause:** the 2,753,789-byte approved PNG is the final observed LCP element in each run; its recorded resource duration is 27.144–27.914s while video playback also starts. In run5 the PNG downloads for27.564s and paints at29.116s; document TTFB is0.102s. This is a media-transfer bottleneck, not evidence of a server cold start. Parallel-video bandwidth competition is an inference, not independently isolated. **Legacy:** the recorded window includes Babel/development React transfer and5.780–9.377s of main-thread long tasks; media had not settled, so final media cost is unknown. Host load before the first browser run was63% CPU, with about3.90GB free memory and no task build/test worker; its exact effect cannot be isolated from these samples.

## Visual evidence

See benchmark-*.json for the captured platform fonts, styles, heading dimensions, links and footer. No deployed reduced-motion records were created after the stop; the local reduced-motion checks are separate. Gallery: gallery.html. Captures from independent video playback are not frame-synchronized. Retained SSR Pause/Play controls may differ where legacy had none; their retained width under reduced motion is deliberate to prevent CLS.

For the captured fifth Sunset/phone pair, heading font/weight/size/line-height/letter-spacing, exact heading bounds and line rectangles, paragraph/CTA/footer styles, platform fonts and links match. The snapshots differ in media readiness and Play/Pause label: SSR media is playing with the approved image visible; legacy media was still pending. That does not establish final settled visual parity. The rest of the deployed matrix is unverified. Local28 heading pairs and12 targeted shift probes remain separate local evidence.

Gallery screenshots include the unsettled legacy media state and are labeled accordingly. No normal-speed result is inferred from the local frozen-JSX visual fixture.

## Boundaries

No Live deploy, promotion, alias operation, environment read/change or database connection performed. No project environment/settings changes. Only deployment-scoped overrides may be used. No merge; PR #169 stays draft.

The browser traces include the existing public https://www.yoursparklesuite.com/icon favicon GET. No Live credentials or direct Live database/API configuration access were used; source platform-host branding returns before the customer-data lookup. This public asset read is disclosed rather than described as zero Live HTTP requests. Successful manual appearance changes in this task: six pre-fix diagnostics/restoration plus one Sunset benchmark selection and one ORIGINAL restoration. The first restoration call returned a connector error; a read confirmed Sunset remained, then one guarded retry restored ORIGINAL and a separate SELECT verified it. No blind duplicate write or additional theme run occurred.

- [Smoke home](https://sparkle-suite-smoke.vercel.app/milehighfizz)
- [Smoke Dance Floor](https://sparkle-suite-smoke.vercel.app/milehighfizz/trade)
- [Smoke Join](https://sparkle-suite-smoke.vercel.app/milehighfizz/join)
