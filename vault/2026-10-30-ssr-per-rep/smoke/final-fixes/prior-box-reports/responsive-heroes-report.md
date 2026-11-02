# SSR responsive hero Smoke report

Status: **COMPLETE — assess misses below**. 84/84 rows completed; 64 pass all performance criteria. No quality miss stops the matrix. This report is not Live approval.

**Not ready for Live.** All 84 rows completed: 64 PASS / 20 FAIL. Criteria overlap: 16 budget misses, four rows with nonzero raw SSR CLS, two slower Alpine Dance Floor medians, and one incomplete settled legacy baseline (Pearl Rose phone Dance Floor). SSR is no slower on 81/83 comparable rows. All 22 SSR video/device checks autoplay, advance and change frames without a click; all 28 Pause/Play checks pass. The strict animation probe passes 25/28: natural wraps were not observed for Gilded Autumn and Alpine Opal phone, and Pumpkin Witch desktop's finite entrance finished during the probe. All 22 decoded A/B video frames and normal crop/style comparisons match. ORIGINAL is restored and independently read back. [Every retained performance miss and observed contributor](quality-misses.md).

NEW_HEAD: **53c43d0bc2f8033066bb56aad2ecdbd1c91bf90f**, one pushed fix commit over 057665f5ed7a56fccbb70442e4691ee51cee2960; branch codex/ssr-per-rep-allowlist. [Draft PR #169](https://github.com/louis623/sparkle-suite/pull/169), unmerged. Earlier evidence commit remains in history.

## Changes and image audit

Responsive AVIF/WebP derivatives use the exact approved Sunset frame and witch source art, with no art generation or crop redesign. Original PNG/WebP files and frozen legacy assets are untouched. Sizes 640/1080/1600/original are never upscaled beyond the original 1672/1659px widths. Native picture/srcset, explicit dimensions, high fetch priority and a matching type-aware preload are used. Join CSS keeps its original gradients/crop with responsive image-set. Home avoids a duplicate CSS request and uses the same top-aligned phone composition as legacy.

The still decodes and paints, then its unchanged video loads and autoplays automatically without a click. Muted/inline/looping sources, Pause/Play and reduced-motion intent are preserved. MHF aurora code is unchanged. No static replacement, click gate or default pause is introduced. Source files/bytes, derivative dimensions/hashes and offline rebuild inputs are in lib/amethyst/generated/hero-images.json and scripts/build-ssr-hero-images.mjs.

| Theme | Raster file | Original dimensions | Before bytes | Phone AVIF / WebP bytes | Desktop AVIF / WebP bytes |
| --- | --- | --- | ---: | ---: | ---: |
| amethyst | /amethyst/skins/am01-unicorn/opening-poster.webp | 1310 × 704 | 17,352 | unchanged | unchanged |
| fall_owl_harvest_moon | /amethyst/skins/fall-owl/hero-poster.webp | 1280 × 720 | 133,388 | unchanged | unchanged |
| gilded_autumn | /amethyst/skins/gilded-autumn/hero-poster.webp | 1204 × 764 | 199,500 | unchanged | unchanged |
| gobble_and_fizz | /amethyst/skins/gobble-and-fizz/hero-poster.webp | 1280 × 720 | 207,024 | unchanged | unchanged |
| halloween_pumpkin_cat | /amethyst/skins/halloween-pumpkin-cat/hero-desktop-1672.webp | 1672 × 941 | 176,890 | unchanged | unchanged |
| halloween_pumpkin_cat | /amethyst/skins/halloween-pumpkin-cat/hero-desktop-1200.webp | 1200 × 675 | 106,774 | unchanged | unchanged |
| halloween_pumpkin_witch | /amethyst/skins/halloween-pumpkin-witch/hero-desktop.webp | 1672 × 941 | 177,682 | unchanged | unchanged |
| halloween_pumpkin_witch | /amethyst/skins/halloween-pumpkin-witch/witch.webp | 1659 × 948 | 424,580 | 64469 / 73068 | 245626 / 363324 |
| halloween_pumpkin_witch | /amethyst/skins/halloween-pumpkin-witch/hero-mobile.webp | 836 × 471 | 53,380 | unchanged | unchanged |
| midnight_rose | /amethyst/skins/midnight-rose/hero-poster.webp | 1280 × 720 | 114,902 | unchanged | unchanged |
| pearl_rose | /amethyst/skins/pearl-rose/hero-poster.webp | 1280 × 720 | 154,476 | unchanged | unchanged |
| pie_please | /amethyst/skins/pie-please/hero-poster-v4.webp | 1280 × 720 | 187,622 | unchanged | unchanged |
| rose_champagne | /amethyst/skins/rose-champagne/hero-poster.webp | 1280 × 720 | 124,112 | unchanged | unchanged |
| sunset_beach | /amethyst/skins/sunset-beach/hero-approved.png | 1672 × 941 | 2,753,789 | 75714 / 83864 | 331784 / 414220 |

The audit covered all 14 themes × three pages × two sizes. Rose Gold, Sparkle Suite Morganite and bespoke Alpine Opal have no raster hero still in this fixture (CSS/aurora). The unmodified Aurora MP4 is 4,238,213 bytes. Inline SVG/CSS decorations are retained. Full reference detail: image-audit-visible-before.json. All variant byte counts: hero-images manifest. AVIF PSNR >=40.1dB; WebP >=35.3dB, visually reviewed at the target sizes. Witch AVIF alpha RMSE <0.7/255; WebP alpha is lossless. These are derivative fidelity checks, not a claim of bit-identical lossy pixels.

## Tests

TypeScript and production build passed. Final focused set: 396/396, including 69 strict complete-response parity cases and seven new image/readiness cases. Complete full suite: **6051 passed / 76 failed / 5 skipped**, versus 6043 / 77 / 5. 6132 cases, 731 files. Gate PASS: zero unapproved new failed names, suite-load errors or unhandled errors. Existing failures/errors remain documented in full-suite-comparison.json; the previously failing optional-slot flyer now passes. All 42 flyer cases pass in the current full run, so no new timing exception/isolation was needed. Two workers reduce shared CPU contention; all assertions, timeouts and VM guards remain unchanged. Initial native-poster checks now require the approved standalone still, staged original video URL and no eager video fetch; strict HTML hashes were refreshed for those intended SSR changes. Final benchmark-only readiness assertions also pass, including zero additional image fetches. Local 48 video preference/device checks passed; local runtime also identified the legacy Alpine reduced-motion issue, which is reported separately from SSR.

| Flyer case | Base ms | Prior isolated ms | Prior full timeout ms | Current full ms / status |
| --- | ---: | ---: | ---: | --- |
| renders gobble_and_fizz inside the safe zones and the QR decodes | 2112.4779 | 2319.7729 | 5025 | 2571.5536 / passed |
| decodes PNG and JPG for every theme and center mark, including a 30% JPEG resave | 516996.14099999995 | 474402.2868 | 600015 | 497031.13279999996 / passed |
| renders amber inside the safe zones and the QR decodes | 2089.874 | 1698.391 | 5276.085 | 1796.8624000000054 / passed |
| renders velvet inside the safe zones and the QR decodes | 2074.681 | 1863.782 | 5585.961 | 2001.2037999999957 / passed |
| shrinks a long show title instead of cutting it off | 2472.359 | 1553.627 | 5039.555 | 2300.591099999998 / passed |
| closes the tagline and website slots when they are absent, and prints a custom domain | 2331.461599999995 | 3124.9156 | 5322 | 3572.9526000000187 / passed |

Historical accepted timing flakes are shown for traceability only; all current cases above passed unchanged. No flyer code or timeout edits.

## Deployment and boundaries

Exactly two Smoke Preview deployments of NEW_HEAD, same 39 deployment-only overrides (31 blank inherited values, three verified Smoke DB bindings, five flags). No Vercel project env/settings changes.

- A SSR: dpl_2tsBNUCP3cFyvf9Au155cMTX3s51, https://sparkle-suite-smoke-hfum0jomi-louis-2849s-projects.vercel.app; allowlist dudesfizzfest,milehighfizz.
- B legacy: dpl_EYUQ94js6PDN455gxqQxntuAFT1W, https://sparkle-suite-smoke-imyin77zg-louis-2849s-projects.vercel.app; allowlist dudesfizzfest only, unaliased and accessed solely with the existing origin-scoped automation bypass.
- Only sparkle-suite-smoke.vercel.app moved: rollback dpl_8DfMaFhJ24ZS8tWjXfAnsmP2LC88 -> A. A candidate 12 GET controls passed before the move, followed by 12 normal-domain controls; B's 12 controls pass with MHF Home/Trade/Join SSR markers absent. Receipts: A-candidate-controls.json (12/12), A-alias-controls.json (12/12), B-candidate-controls.json (12/12).
- No Live deployment/promotion/alias/env read/change, direct Live DB access, merge, personal-account use, message/send/checkout/provider action or project configuration change. Browser routes block Live platform requests (including the inherited favicon), wrong database origins, writes/analytics and websockets. No browser Babel/React-dev code is added to SSR; B remains the untouched legacy reference.
- Smoke database is pukemqiwlyqmyytxkdmo. Manual writes only fixed milehighfizz rep a0683f86-a19b-4ee5-a8d1-16dd015371ee appearance_preset, with template amethyst and motion zoom guarded and read back after each change. ORIGINAL halloween_pumpkin_witch restored and independently read back at 2026-10-31T13:35:11.438Z.

## Method and full speed matrix

Desktop 1440×900 unthrottled; phone 390×844, 150ms latency, 1.6Mbps down / 0.75Mbps up, CPU4×. Five fresh contexts per renderer, alternating A1/B1 through A5/B5. Same immutable deployment/bypass method on A and B, same saved theme throughout each group, Alpine last. Browser plugin unavailable; isolated Playwright Chrome, no personal Chrome profile/session. No build/test workers during measurements; per-theme host-load snapshots retained. Fonts, all native CSS backgrounds (including legacy descendants/pseudos) and actual first video frames settle before collection, then a three-second observation window. Readiness never initiates another image download or skips a video for opacity zero. A completed legacy one-shot counts as settled; looping is evaluated separately. Reduced-motion behavior failures are retained as failures, not silently waived. A median is omitted if all five observations were not settled. First-visible heuristics retained in raw diagnostics are uncertified and are not used in this report.

Both device profiles use deviceScaleFactor 1, matching the prior benchmark. LCP and CLS observers start at navigation; readiness does not reset metrics or remove earlier layout shifts. A stable theme/background/video/font signature must remain ready for three continuous seconds. The first three theme groups ran before an overnight pause; the remaining groups resumed October 31. Valid observations were retained, and every A/B pair remained on the same saved theme. Theme-start host CPU snapshots ranged from 4% to 54%. Other desktop applications were active; these are not guaranteed-idle-host measurements.

Pearl Rose phone Dance Floor legacy attempt 1 timed out waiting for its heading under the unchanged 30s limit. The failed attempt is retained alongside all completed attempts. That row has five settled SSR observations and four settled legacy observations, so its legacy median is omitted and the row fails. Following an orchestration tool interruption, the saved theme, guarded fields, alias A and B's zero aliases were independently reverified before the remaining attempts resumed. The interruption and original trace are recorded in orchestration-interruption.json and instrumentation-attempts/pearl-rose-phone-trade-heading-timeout.json. No attempt was replaced because it was slow or failed.

Fall Owl desktop Home originally discovered a late CSS background at the final readiness check in paired runs 1, 3 and 4. Those three complete A/B pairs are archived in instrumentation-attempts/fall_owl_harvest_moon-initial.json and row.uncountedPairs, with their original metrics and SHA receipt retained. Only those unready pairs were refilled; the two valid pairs and the actual nonzero SSR CLS sample were kept. No speed or CLS miss was discarded. Any corresponding original >10s LCP remains in the outlier ledger.

Pass requires SSR median <2s desktop / <3s phone, raw SSR CLS exactly zero in every run, and SSR median no slower than the settled legacy median. CLS columns show session-window medians. 149 individual observed LCPs exceed 10s; each run and contributing resource/long-task evidence is retained in over-10s-runs.json. Resource duration is not assumed to isolate download, and TTFB is not automatically called a cold start.

| Theme | Page | Device | SSR LCP s | Settled legacy LCP s | SSR CLS median / max | Legacy CLS | <2s / <3s | CLS 0 | No slower | Result |
| --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| amethyst | home | desktop | 0.948 | 2.240 | 0 / 0 | 0.000597628 | PASS | PASS | PASS | PASS |
| amethyst | home | phone | 1.760 | 11.744 | 0 / 0 | 0.0112303 | PASS | PASS | PASS | PASS |
| amethyst | trade | desktop | 0.740 | 1.932 | 0 / 0 | 0.0322430 | PASS | PASS | PASS | PASS |
| amethyst | trade | phone | 1.708 | 10.532 | 0 / 0 | 0.116296 | PASS | PASS | PASS | PASS |
| amethyst | join | desktop | 0.760 | 1.872 | 0 / 0 | 0.00119829 | PASS | PASS | PASS | PASS |
| amethyst | join | phone | 1.844 | 3.148 | 0 / 0 | 0.0525886 | PASS | PASS | PASS | PASS |
| fall_owl_harvest_moon | home | desktop | 0.740 | 2.292 | 0 / 0.0000733025 | 0.137352 | PASS | FAIL | PASS | FAIL |
| fall_owl_harvest_moon | home | phone | 2.108 | 13.088 | 0 / 0 | 0.146903 | PASS | PASS | PASS | PASS |
| fall_owl_harvest_moon | trade | desktop | 0.696 | 1.932 | 0 / 0 | 0.192273 | PASS | PASS | PASS | PASS |
| fall_owl_harvest_moon | trade | phone | 1.864 | 10.488 | 0 / 0 | 0.0687231 | PASS | PASS | PASS | PASS |
| fall_owl_harvest_moon | join | desktop | 0.736 | 1.268 | 0 / 0 | 0.0570009 | PASS | PASS | PASS | PASS |
| fall_owl_harvest_moon | join | phone | 1.984 | 3.168 | 0 / 0 | 0.145216 | PASS | PASS | PASS | PASS |
| gilded_autumn | home | desktop | 0.740 | 2.344 | 0 / 0 | 0.0152451 | PASS | PASS | PASS | PASS |
| gilded_autumn | home | phone | 2.920 | 13.856 | 0 / 0 | 0.0522857 | PASS | PASS | PASS | PASS |
| gilded_autumn | trade | desktop | 0.712 | 1.848 | 0 / 0 | 0.154170 | PASS | PASS | PASS | PASS |
| gilded_autumn | trade | phone | 1.968 | 10.656 | 0 / 0 | 0.0753960 | PASS | PASS | PASS | PASS |
| gilded_autumn | join | desktop | 0.908 | 1.576 | 0 / 0 | 0.0550034 | PASS | PASS | PASS | PASS |
| gilded_autumn | join | phone | 3.860 | 5.096 | 0 / 0 | 0.116114 | FAIL | PASS | PASS | FAIL |
| gobble_and_fizz | home | desktop | 0.848 | 2.540 | 0 / 0 | 0.158612 | PASS | PASS | PASS | PASS |
| gobble_and_fizz | home | phone | 2.788 | 14.020 | 0 / 0 | 0.146903 | PASS | PASS | PASS | PASS |
| gobble_and_fizz | trade | desktop | 0.696 | 1.868 | 0 / 0 | 0.164448 | PASS | PASS | PASS | PASS |
| gobble_and_fizz | trade | phone | 1.920 | 10.568 | 0 / 0 | 0.0765277 | PASS | PASS | PASS | PASS |
| gobble_and_fizz | join | desktop | 0.748 | 1.200 | 0 / 0 | 0.0570071 | PASS | PASS | PASS | PASS |
| gobble_and_fizz | join | phone | 2.096 | 3.088 | 0 / 0 | 0.145216 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_cat | home | desktop | 0.756 | 2.148 | 0 / 0 | 0.00242157 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_cat | home | phone | 1.748 | 12.104 | 0 / 0 | 0.0120252 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_cat | trade | desktop | 0.672 | 1.820 | 0 / 0 | 0.0595962 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_cat | trade | phone | 1.676 | 10.936 | 0 / 0 | 0.0490045 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_cat | join | desktop | 0.696 | 1.224 | 0 / 0 | 0.0103450 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_cat | join | phone | 1.776 | 3.280 | 0 / 0 | 0.0355999 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_witch | home | desktop | 0.804 | 2.284 | 0 / 0 | 0.197141 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_witch | home | phone | 2.752 | 13.308 | 0 / 0 | 0.0737828 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_witch | trade | desktop | 0.832 | 2.128 | 0 / 0 | 0.0827688 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_witch | trade | phone | 4.780 | 14.960 | 0 / 0 | 0.114074 | FAIL | PASS | PASS | FAIL |
| halloween_pumpkin_witch | join | desktop | 0.920 | 1.440 | 0 / 0 | 0.251584 | PASS | PASS | PASS | PASS |
| halloween_pumpkin_witch | join | phone | 4.256 | 7.212 | 0 / 0 | 0.0878518 | FAIL | PASS | PASS | FAIL |
| midnight_rose | home | desktop | 0.740 | 2.300 | 0 / 0.0000733025 | 0.196633 | PASS | FAIL | PASS | FAIL |
| midnight_rose | home | phone | 2.488 | 14.876 | 0 / 0 | 0.0773098 | PASS | PASS | PASS | PASS |
| midnight_rose | trade | desktop | 0.704 | 1.796 | 0 / 0 | 0.192273 | PASS | PASS | PASS | PASS |
| midnight_rose | trade | phone | 2.364 | 12.952 | 0 / 0 | 0.0765277 | PASS | PASS | PASS | PASS |
| midnight_rose | join | desktop | 0.848 | 1.512 | 0 / 0 | 0.0570071 | PASS | PASS | PASS | PASS |
| midnight_rose | join | phone | 3.660 | 5.172 | 0 / 0 | 0.132251 | FAIL | PASS | PASS | FAIL |
| pearl_rose | home | desktop | 0.780 | 2.540 | 0 / 0 | 0.161746 | PASS | PASS | PASS | PASS |
| pearl_rose | home | phone | 2.608 | 15.516 | 0 / 0 | 0.0688464 | PASS | PASS | PASS | PASS |
| pearl_rose | trade | desktop | 0.740 | 2.296 | 0 / 0 | 0.192273 | PASS | PASS | PASS | PASS |
| pearl_rose | trade | phone | 5.124 | — | 0 / 0 | — | FAIL | PASS | — | FAIL |
| pearl_rose | join | desktop | 0.968 | 1.564 | 0 / 0 | 0.0570103 | PASS | PASS | PASS | PASS |
| pearl_rose | join | phone | 4.432 | 7.464 | 0 / 0.00253210 | 0.132251 | FAIL | FAIL | PASS | FAIL |
| pie_please | home | desktop | 1.372 | 4.280 | 0 / 0 | 0.185622 | PASS | PASS | PASS | PASS |
| pie_please | home | phone | 2.840 | 15.312 | 0 / 0 | 0.0859946 | PASS | PASS | PASS | PASS |
| pie_please | trade | desktop | 1.204 | 3.972 | 0 / 0 | 0.164464 | PASS | PASS | PASS | PASS |
| pie_please | trade | phone | 2.016 | 11.292 | 0 / 0 | 0.0765277 | PASS | PASS | PASS | PASS |
| pie_please | join | desktop | 1.132 | 1.796 | 0 / 0 | 0.0411136 | PASS | PASS | PASS | PASS |
| pie_please | join | phone | 3.376 | 5.992 | 0 / 0 | 0.141697 | FAIL | PASS | PASS | FAIL |
| rose_champagne | home | desktop | 0.816 | 2.616 | 0 / 0 | 0.161746 | PASS | PASS | PASS | PASS |
| rose_champagne | home | phone | 2.428 | 15.640 | 0 / 0 | 0.0773098 | PASS | PASS | PASS | PASS |
| rose_champagne | trade | desktop | 0.760 | 2.136 | 0 / 0 | 0.164464 | PASS | PASS | PASS | PASS |
| rose_champagne | trade | phone | 2.212 | 12.032 | 0 / 0 | 0.0765277 | PASS | PASS | PASS | PASS |
| rose_champagne | join | desktop | 0.900 | 1.536 | 0 / 0 | 0.0570071 | PASS | PASS | PASS | PASS |
| rose_champagne | join | phone | 3.736 | 5.352 | 0 / 0 | 0.132251 | FAIL | PASS | PASS | FAIL |
| rose_gold | home | desktop | 0.712 | 2.228 | 0 / 0 | 0.163125 | PASS | PASS | PASS | PASS |
| rose_gold | home | phone | 6.104 | 38.128 | 0 / 0.0436676 | 0.0764805 | FAIL | FAIL | PASS | FAIL |
| rose_gold | trade | desktop | 0.692 | 2.812 | 0 / 0 | 0.192285 | PASS | PASS | PASS | PASS |
| rose_gold | trade | phone | 2.092 | 11.756 | 0 / 0 | 0.0765277 | PASS | PASS | PASS | PASS |
| rose_gold | join | desktop | 1.172 | 1.984 | 0 / 0 | 0.0419243 | PASS | PASS | PASS | PASS |
| rose_gold | join | phone | 3.256 | 5.344 | 0 / 0 | 0.147132 | FAIL | PASS | PASS | FAIL |
| sparkle_suite_morganite | home | desktop | 1.596 | 4.364 | 0 / 0 | 0.0136496 | PASS | PASS | PASS | PASS |
| sparkle_suite_morganite | home | phone | 3.208 | 17.364 | 0 / 0 | 0.0522857 | FAIL | PASS | PASS | FAIL |
| sparkle_suite_morganite | trade | desktop | 1.328 | 4.116 | 0 / 0 | 0.125580 | PASS | PASS | PASS | PASS |
| sparkle_suite_morganite | trade | phone | 2.056 | 11.616 | 0 / 0 | 0.0753960 | PASS | PASS | PASS | PASS |
| sparkle_suite_morganite | join | desktop | 0.992 | 1.684 | 0 / 0 | 0.0369691 | PASS | PASS | PASS | PASS |
| sparkle_suite_morganite | join | phone | 2.508 | 3.792 | 0 / 0 | 0.0973493 | PASS | PASS | PASS | PASS |
| sunset_beach | home | desktop | 1.140 | 4.164 | 0 / 0 | 0.196646 | PASS | PASS | PASS | PASS |
| sunset_beach | home | phone | 8.068 | 29.188 | 0 / 0 | 0.0767351 | FAIL | PASS | PASS | FAIL |
| sunset_beach | trade | desktop | 1.492 | 4.504 | 0 / 0 | 0.164472 | PASS | PASS | PASS | PASS |
| sunset_beach | trade | phone | 4.664 | 19.996 | 0 / 0 | 0.0399326 | FAIL | PASS | PASS | FAIL |
| sunset_beach | join | desktop | 2.632 | 4.944 | 0 / 0 | 0.0411729 | FAIL | PASS | PASS | FAIL |
| sunset_beach | join | phone | 2.296 | 18.280 | 0 / 0 | 0.132251 | PASS | PASS | PASS | PASS |
| alpine_opal | home | desktop | 0.804 | 2.440 | 0 / 0 | 0.0824953 | PASS | PASS | PASS | PASS |
| alpine_opal | home | phone | 3.680 | 13.680 | 0 / 0 | 0.0478916 | FAIL | PASS | PASS | FAIL |
| alpine_opal | trade | desktop | 0.756 | 0.676 | 0 / 0 | 0.293313 | PASS | PASS | FAIL | FAIL |
| alpine_opal | trade | phone | 2.916 | 2.568 | 0 / 0 | 0.130173 | PASS | PASS | FAIL | FAIL |
| alpine_opal | join | desktop | 0.788 | 1.296 | 0 / 0 | 0.113221 | PASS | PASS | PASS | PASS |
| alpine_opal | join | phone | 3.384 | 5.276 | 0 / 0 | 0.144978 | FAIL | PASS | PASS | FAIL |

## Animation checks

Measured after performance collection, so controls/seek probes cannot affect the recorded LCP/CLS. Video currentTime/decoded frames are sampled over 3.1s; a real natural loop wrap is observed, then Pause/Play is exercised. CSS animation clocks, infinite iterations and before/after hero frames are checked. Corresponding video frames are decoded at 0.5s for source-frame and crop/style comparison. Reduced-motion full-page captures are retained for both renderers. Legacy Amethyst's source is a one-shot, not a loop; legacy Alpine may keep playing under reduced motion. These reference behaviors are not repaired or hidden by changing legacy.

The loop column requires an observed natural wrap as well as loop=true. FAIL includes a wrap not observed within the unchanged probe window; it is not silently promoted to a pass from the loop attribute alone. Reduced-motion playback and CLS are shown separately: paused videos and no running hero animations establish the motion check, while every recorded CLS and any final readiness failure remain visible. The original stricter composite reducedMotionPass flag remains unchanged in raw evidence.

The animation probe begins after the full-page capture. Legacy Midnight Rose and Pearl Rose phone videos were already playing before that capture but were paused at the subsequent probe; both the pre-capture video state and the strict post-capture failures are retained. Legacy Pumpkin Cat and Amethyst use one-shot videos, so the loop comparison fails on B. Pumpkin Witch desktop's strict CSS check includes its finite entrance animation, which finishes between snapshots on both A and B; infinite hover/sparkle clocks advance and hero frames differ. SSR's four witch sparkle clocks are 5.8s each, versus legacy 5.8/7.1/6.4/5.8s; this remaining animation-timing difference is reported despite matching still artwork. The patch leaves that sparkle markup unchanged.

| Theme | Device | A autoplay / advancing / frames | A loops | A Pause/Play | A reduced motion; CLS | B motion | B reduced motion; CLS | Matched video frame / crop |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| amethyst | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop FAIL | PASS motion; CLS 0.000597628 | PASS frame; PASS normal crop/style |
| amethyst | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop FAIL | PASS motion; CLS 0.0112303 | PASS frame; PASS normal crop/style |
| fall_owl_harvest_moon | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.290632; readiness FAIL | PASS frame; PASS normal crop/style |
| fall_owl_harvest_moon | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0.000746658 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.161949 | PASS frame; PASS normal crop/style |
| gilded_autumn | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.00215187 | PASS frame; PASS normal crop/style |
| gilded_autumn | phone | PASS / PASS / PASS | FAIL | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.0522857 | PASS frame; PASS normal crop/style |
| gobble_and_fizz | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.305799 | PASS frame; PASS normal crop/style |
| gobble_and_fizz | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.161303 | PASS frame; PASS normal crop/style |
| halloween_pumpkin_cat | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / FAIL / PASS; loop FAIL | PASS motion; CLS 0.000301071 | PASS frame; PASS normal crop/style |
| halloween_pumpkin_cat | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0.00244254 | PASS / FAIL / PASS; loop FAIL | PASS motion; CLS 0.0123516 | PASS frame; PASS normal crop/style |
| halloween_pumpkin_witch | desktop | CSS FAIL | PASS | PASS | PASS motion; CLS 0 | CSS FAIL; loop PASS | PASS motion; CLS 0.276944 | — |
| halloween_pumpkin_witch | phone | CSS PASS | PASS | PASS | PASS motion; CLS 0 | CSS FAIL; loop PASS | PASS motion; CLS 0.198921 | — |
| midnight_rose | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.147590 | PASS frame; PASS normal crop/style |
| midnight_rose | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | FAIL / FAIL / FAIL; loop FAIL | PASS motion; CLS 0.0662158 | PASS frame; PASS normal crop/style |
| pearl_rose | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.147590 | PASS frame; PASS normal crop/style |
| pearl_rose | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | FAIL / FAIL / FAIL; loop FAIL | PASS motion; CLS 0.0636280 | PASS frame; PASS normal crop/style |
| pie_please | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.255622 | PASS frame; PASS normal crop/style |
| pie_please | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.110667 | PASS frame; PASS normal crop/style |
| rose_champagne | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.149371 | PASS frame; PASS normal crop/style |
| rose_champagne | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | FAIL / FAIL / FAIL; loop FAIL | PASS motion; CLS 0.0662158 | PASS frame; PASS normal crop/style |
| rose_gold | desktop | CSS PASS | PASS | PASS | PASS motion; CLS 0 | CSS PASS; loop PASS | FAIL motion; CLS 0.147752 | — |
| rose_gold | phone | CSS PASS | PASS | PASS | PASS motion; CLS 0 | CSS PASS; loop PASS | PASS motion; CLS 0.0657638 | — |
| sparkle_suite_morganite | desktop | CSS PASS | PASS | PASS | PASS motion; CLS 0 | CSS PASS; loop PASS | PASS motion; CLS 0.146122 | — |
| sparkle_suite_morganite | phone | CSS PASS | PASS | PASS | PASS motion; CLS 0 | CSS PASS; loop PASS | PASS motion; CLS 0.0507209 | — |
| sunset_beach | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.147624 | PASS frame; PASS normal crop/style |
| sunset_beach | phone | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | FAIL / FAIL / FAIL; loop FAIL | PASS motion; CLS 0.0636280 | PASS frame; PASS normal crop/style |
| alpine_opal | desktop | PASS / PASS / PASS | PASS | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | FAIL motion; CLS 0.0648903; readiness FAIL | PASS frame; PASS normal crop/style |
| alpine_opal | phone | PASS / PASS / PASS | FAIL | PASS | PASS motion; CLS 0 | PASS / PASS / PASS; loop PASS | PASS motion; CLS 0.0503464 | PASS frame; PASS normal crop/style |

Reduced motion: all **84/84 SSR page/device views** have paused hero videos and no running scoped animations. Three retain positive SSR CLS: Fall Owl phone Home 0.000746658, Pumpkin Cat phone Home 0.00244254, and Midnight Rose phone Join 0.00135693. Legacy Alpine desktop Home keeps playing its video; legacy Rose Gold desktop Home retains running CSS animation. These failures and all readiness/CLS values are retained in the [full reduced-motion table](reduced-motion.md).

## Visual comparison and review

Every completed row captures normal and reduced views plus computed platform fonts, h1 line rectangles/wrap, paragraph/CTA/footer styles/text/links and media geometry. 1 recorded field differences; detailed values in visual-differences.json and each benchmark file. Animation-phase differences are distinguished from still/source/crop differences. Screenshots are evidence, not a claim that lossy derivatives are bit-identical.

- sparkle_suite_morganite / join / phone / normal / lines

Manual media/control review (14/14 theme contact sheets reviewed):

- amethyst / home / desktop, phone / reduced-motion: SSR opening-poster.webp is the nebula; frozen legacy displays hero-poster.webp with the unicorn. This difference already exists at starting head 057665f5; neither Amethyst still source was changed in this image-weight commit. (remaining media parity difference).
- amethyst / home / desktop, phone / reduced-motion: SSR sound control says Enable sound; legacy says Mute sound. SSR remains muted by default as previously built. (existing control-state difference).
- amethyst / join / desktop, phone / reduced-motion: SSR retains its new Play animation control; legacy has no equivalent utility control. (intentional preserved SSR control addition).
- alpine_opal / home / desktop, phone / normal and reduced motion: SSR retains its accessible background-video Pause/Play control; legacy has no such button. (intentional retained control addition).
- alpine_opal / home / desktop / reduced motion: SSR is paused at time0, while legacy continues playing and fails readiness under reduced motion. Its moving captured frame can differ from SSR's still. Legacy phone is paused at time0 in this run. (legacy reduced-motion playback difference).
- fall_owl_harvest_moon / home and join / desktop, phone / reduced-motion: SSR retains its new Play animation and sound controls where legacy omits controls in reduced motion. Composition and page spacing match. (intentional preserved SSR control addition).
- gobble_and_fizz / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation button; legacy omits this control in these screenshots. (intentional retained control addition).
- halloween_pumpkin_witch / home, trade and join / desktop, phone / reduced motion: SSR exposes its retained Play animation control; legacy omits it in these screenshots. (intentional retained control addition).
- halloween_pumpkin_witch / home / desktop, phone / normal CSS animation: SSR sparkle clocks are 5.8/5.8/5.8/5.8 seconds; legacy clocks are 5.8/7.1/6.4/5.8 seconds. The current patch leaves sparkle markup unchanged. This is a remaining animated timing difference even though the still artwork matches. (CSS motion parity difference).
- midnight_rose / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation button; legacy omits it in these screenshots. (intentional retained control addition).
- pearl_rose / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation button; legacy omits it in these screenshots. (intentional retained control addition).
- pie_please / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation control; legacy omits it in these screenshots. (intentional retained control addition).
- rose_champagne / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation control; legacy omits it in these screenshots. (intentional retained control addition).
- rose_gold / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation button; legacy omits it in these screenshots. (intentional retained control addition).
- rose_gold / home; shared SparkleFx effects where active on utilities / desktop, phone / normal animation: Legacy SparkleFx randomizes particle positions, delay, duration and size per mount. Existing SSR SparkleFx uses deterministic values with the same counts and ranges. Individual particle positions and phases therefore differ. Neither implementation changed in this commit. (existing particle-render variation).
- rose_gold / home / desktop / reduced motion: Legacy retains running scoped hero CSS animation; SSR has no running hero animation. This reference reduced-motion failure remains recorded. (legacy reduced-motion playback difference).
- sparkle_suite_morganite / home and join / desktop, phone / reduced motion: SSR exposes its retained Play animation button; legacy omits it in these screenshots. (intentional retained control addition).
- sparkle_suite_morganite / home; shared SparkleFx effects where active on utilities / desktop, phone / normal animation: Legacy SparkleFx randomizes particle position, delay, duration and size per mount; existing SSR uses deterministic values with matching counts and ranges. Individual positions and phases vary. Neither source changed in this commit. (existing particle-render variation).
- sparkle_suite_morganite / join / phone / normal: The second heading-line rectangle differs by 0.015625 CSS px in x and width. Both renderers have the same fonts, two-line wrap, y position and line height. The exact comparison difference is retained. (subpixel heading geometry).
- sunset_beach / join / desktop, phone / reduced motion: SSR exposes its retained Play animation control; legacy omits it in these screenshots. (intentional retained control addition).
- sunset_beach / home / desktop, phone / reduced motion: The retained SSR Play animation button is 117.71875 CSS px wide versus legacy 108.75px. Both Enable wave sound buttons are 132.109375px. This changes the control-group alignment slightly; the requirement and button code were preserved. (retained control geometry difference).

[All individual >10s runs and observed contributors](over-10s.md). [Gallery](gallery.html). Normal review links after ORIGINAL restoration: [Mile High Fizz Home](https://sparkle-suite-smoke.vercel.app/milehighfizz), [Dance Floor](https://sparkle-suite-smoke.vercel.app/milehighfizz/trade), [Join](https://sparkle-suite-smoke.vercel.app/milehighfizz/join). No Live rep is switched on by this task. Both the one-commit and two-deployment caps are exhausted.
