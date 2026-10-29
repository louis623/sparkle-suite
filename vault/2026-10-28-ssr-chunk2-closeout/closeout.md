# SSR chunk 2 — Dance Floor and Join, October 28, 2026

- Demo-only SSR implementation is in draft [PR #163](https://github.com/louis623/sparkle-suite/pull/163), targeting codex/ssr-all-themes. **Acceptance is not met. Smoke was restored to the requested rollback. No Live release or PR merge.**
- Final app: 7fa6fbe69922f1802068e2f91efe5a40d6beb7cb. Final Smoke candidate: dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc. Current Smoke alias and rollback: dpl_8Z9xfABn8F7WkSPMHKdNYE7NpTek. Only the Smoke project and its existing 41 deployment-only overrides were used; Smoke Supabase pukemqiwlyqmyytxkdmo, inherited Live/provider keys empty. No project/env setting changes or migrations.
- Speed remains below the required standard: the six-theme run recorded a 9.160s cold desktop load and intermittent phone/data delays. The complete 72-load run was on c4f6c374; final 7fa6fbe6 received local Gnome/browser checks and a fresh 184-case authenticated HTTP matrix on its unique protected Smoke URL, not another full representative run. The two last fixes do not resolve the measured cold/data latency.

## Final behavior

Trade and Join reuse the homepage theme/CSS table, production React runtime, shared HeroMotionScene and early native controls. Actual jewelry, calendar, roster and join content are assembled before first paint. Existing compact utility banners remain compact; homepage video heroes were not transplanted into them. Decorations/sparkles animate regardless of saved Still, with visitor Pause/Play. Utility Gnome now has a continuous two-pixel bob instead of a finite entrance; homepage Gnome is unchanged.

A slow required utility data read no longer invokes the homepage's five-second legacy fallback. Real rendering failure returns an explicit 503 rather than a browser-Babel page. Homepage keeps its established five-second safety boundary. Two integration cases exceed 5.25 seconds and still return SSR; a failure case verifies 503.

Original utility fonts are pinned with licenses and decoded from embedded critical faces before body layout, preserving typography and removing the font swap shift. Local before/after geometry matched all four saved-theme desktop/phone comparisons exactly. The shared homepage does not receive these fonts. Homepage art fixes are limited to the Pumpkin Cat 1200 poster/high-priority image and lossless Neon Butterfly WebPs without preloads.

Smoke-only ?ssrReviewTheme=... works on all three pages; ?ssrReviewLayout=standard|mile_high_fizz|britt_with_bling|bling_kitchen is optional. Fixtures are visibly labeled and never save settings. The normal alias is currently rolled back, so these final utility SSR results are historical candidate evidence, not a ready review surface.

## Final page × theme × layout matrix

PASS means HTTP 200, ssr response header, correct theme, server tree and selected page CSS. It does not certify every theme's visual quality or speed; Rocky's full pass remains pending. Final protected unique-URL candidate dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc; 184 cases, 0 failures.

| Page | Theme | Standard | MileHighFizz | BrittWithBling | BlingKitchen | Fallback reason |
|---|---|---|---|---|---|---|
| Dance Floor | amethyst | PASS | PASS | PASS | PASS | None |
| Dance Floor | sparkle_suite_morganite | PASS | PASS | PASS | PASS | None |
| Dance Floor | black_diamond | PASS | PASS | PASS | PASS | None |
| Dance Floor | moonstone | PASS | PASS | PASS | PASS | None |
| Dance Floor | alpine_opal | PASS | PASS | PASS | PASS | None |
| Dance Floor | emerald_garden | PASS | PASS | PASS | PASS | None |
| Dance Floor | gnome_garden | PASS | PASS | PASS | PASS | None |
| Dance Floor | neon_butterfly | PASS | PASS | PASS | PASS | None |
| Dance Floor | halloween_pumpkin_witch | PASS | PASS | PASS | PASS | None |
| Dance Floor | halloween_pumpkin_cat | PASS | PASS | PASS | PASS | None |
| Dance Floor | gilded_autumn | PASS | PASS | PASS | PASS | None |
| Dance Floor | rose_gold | PASS | PASS | PASS | PASS | None |
| Dance Floor | midnight_rose | PASS | PASS | PASS | PASS | None |
| Dance Floor | fall_owl_harvest_moon | PASS | PASS | PASS | PASS | None |
| Dance Floor | gobble_and_fizz | PASS | PASS | PASS | PASS | None |
| Dance Floor | pie_please | PASS | PASS | PASS | PASS | None |
| Dance Floor | pearl_rose | PASS | PASS | PASS | PASS | None |
| Dance Floor | sunset_beach | PASS | PASS | PASS | PASS | None |
| Dance Floor | rose_champagne | PASS | PASS | PASS | PASS | None |
| Dance Floor | garnet | PASS | PASS | PASS | PASS | None |
| Dance Floor | amber | PASS | PASS | PASS | PASS | None |
| Dance Floor | velvet | PASS | PASS | PASS | PASS | None |
| Dance Floor | rose_quartz | PASS | PASS | PASS | PASS | None |
| Join | amethyst | PASS | PASS | PASS | PASS | None |
| Join | sparkle_suite_morganite | PASS | PASS | PASS | PASS | None |
| Join | black_diamond | PASS | PASS | PASS | PASS | None |
| Join | moonstone | PASS | PASS | PASS | PASS | None |
| Join | alpine_opal | PASS | PASS | PASS | PASS | None |
| Join | emerald_garden | PASS | PASS | PASS | PASS | None |
| Join | gnome_garden | PASS | PASS | PASS | PASS | None |
| Join | neon_butterfly | PASS | PASS | PASS | PASS | None |
| Join | halloween_pumpkin_witch | PASS | PASS | PASS | PASS | None |
| Join | halloween_pumpkin_cat | PASS | PASS | PASS | PASS | None |
| Join | gilded_autumn | PASS | PASS | PASS | PASS | None |
| Join | rose_gold | PASS | PASS | PASS | PASS | None |
| Join | midnight_rose | PASS | PASS | PASS | PASS | None |
| Join | fall_owl_harvest_moon | PASS | PASS | PASS | PASS | None |
| Join | gobble_and_fizz | PASS | PASS | PASS | PASS | None |
| Join | pie_please | PASS | PASS | PASS | PASS | None |
| Join | pearl_rose | PASS | PASS | PASS | PASS | None |
| Join | sunset_beach | PASS | PASS | PASS | PASS | None |
| Join | rose_champagne | PASS | PASS | PASS | PASS | None |
| Join | garnet | PASS | PASS | PASS | PASS | None |
| Join | amber | PASS | PASS | PASS | PASS | None |
| Join | velvet | PASS | PASS | PASS | PASS | None |
| Join | rose_quartz | PASS | PASS | PASS | PASS | None |

## Desktop and slow-phone timings

72 loads: two pages × six themes × two profiles × three fresh contexts, cache disabled. Phone: 390×900, CPU 4×, 150ms latency, 200,000 B/s download, 93,750 B/s upload. Desktop: 1440×1000. Main-content time is the later of FCP and the first frame with sized H1, selected styles and loaded fonts. These are 7fa6fbe6's immediately preceding c4f6c374 measurements; the final mandatory-SSR/Gnome corrections were checked separately.

| Page | Theme | Desktop median / max | Phone median / max | Completed / attempted |
|---|---|---|---|---|
| trade | pearl_rose | 0.928s / 9.160s | 2.199s / 2.232s | 6 / 6 |
| trade | sunset_beach | 0.900s / 0.996s | 2.207s / 2.310s | 6 / 6 |
| trade | neon_butterfly | 1.076s / 1.076s | 2.284s / 3.488s | 5 / 6 |
| trade | gnome_garden | 0.896s / 0.948s | 2.093s / 2.093s | 5 / 6 |
| trade | halloween_pumpkin_cat | 0.864s / 0.912s | 1.804s / 1.812s | 6 / 6 |
| trade | sparkle_suite_morganite | 0.964s / 1.020s | 2.016s / 2.022s | 6 / 6 |
| join | pearl_rose | 0.948s / 0.960s | 2.887s / 6.425s | 6 / 6 |
| join | sunset_beach | 1.128s / 1.348s | 3.478s / 8.235s | 6 / 6 |
| join | neon_butterfly | 0.952s / 0.952s | 2.966s / 21.366s | 5 / 6 |
| join | gnome_garden | 1.032s / 1.304s | 2.698s / 2.874s | 6 / 6 |
| join | halloween_pumpkin_cat | 1.004s / 1.148s | 2.272s / 2.534s | 6 / 6 |
| join | sparkle_suite_morganite | 1.412s / 3.754s | 2.248s / 2.264s | 6 / 6 |

The complete run had 3 legacy-fallback/hydration timeouts, 16 combined speed/shift failures, and zero CLS in completed samples. Raw functional flags also include the old finite Gnome entrance and aborted optional lineup reads. Final local Gnome run: 12 loads, 0 failures for continuous loops and Pause/Play. The final normal-alias browser run was blocked by automatic approval review after the failed speed gate; it was stopped before collecting usable evidence. Final unique-URL verification used authenticated Vercel curl with the protected-deployment access skill, without moving any alias or changing protection settings. Full raw measurements and reasons accompany this report.

The cold SSR log measured templateReadyMs=3852.9 and totalMs=3988.95, within an approximately 8.36s function request. Earlier route/request time is not isolated. Other traces showed metadata waiting about 7.75s and required-data reads hitting the former five-second deadline. Do not attribute all delay to one cause. Removing legacy fallback fixes response consistency, not the latency.

## Art and interaction evidence

Three slow-phone homepage art samples per theme before/after. halloween_pumpkin_cat: median LCP 4.924s → 3.824s; neon_butterfly: median LCP 3.884s → 3.632s. These samples were taken before utility-only font/boundary follow-ups; homepage markup remains unchanged by those follow-ups. Neon wing files total 255,829 → 152,438 bytes, with identical visible pixels and alpha. No Neon wing preload links remain. Small samples do not establish universal performance.

Smoke search/no-match/reset and More filters passed. One marked synthetic request returned 201, showed confirmation and a 200 receipt, then was denied through the existing RPC to release its reservation; its test notification was removed. Request ID 6729fe29-6e41-4325-bda3-daf0a29a28cf. No receipt token or credentials recorded. Join FAQ toggles and its existing recruiting/learn-more links were inspected without external enrollment. There is no favorites control or internal Join signup form in these sources; those requested checks cannot be claimed.

Six non-demo Smoke routes, including /blingkitchen/in-the-pantry, have identical before/after response hashes. Original public trade.jsx/join.jsx and frozen legacy assets remain byte-identical. Primary dirty checkout and its local production commits were preserved.

Automatic approval review rejected reassigning the normal Smoke alias to the final candidate because acceptance had already failed and doing so conflicted with the rollback requirement. It was not retried or bypassed. The alias remained on dpl_8Z9xfABn8F7WkSPMHKdNYE7NpTek.

## Tests, provenance and limits

- Full suite ONCE at d527d2a8: 5,908 passed, 56 failed, six skipped; 5,970 tests in 722 files. Fifty-two failing names match the recorded baseline. Four new failures depended on old bundle globals in amethyst-late-events; the same production entry is now evaluated with test-only private access and all four pass in focused checks. Raw full suite is not green and was not repeated.
- Final focused required-SSR/customer-page/event set: 192 passed, including 184 theme/layout render cases and delayed-data/error handling. Earlier shared header/layout/homepage set: 131 passed; font/event/header set: 303 passed. No new unresolved failing name is known after focused repairs.
- Local tsc was blocked by missing @resvg/resvg-js, jsqr and qrcode in the machine's dependency tree. Hosted normal Next builds completed READY, including TypeScript and function packaging, with no size rejection. Final candidate SHA verified against its Vercel metadata.
- Previous candidates: dpl_JDyWsGbJ4r9eFMopKhM3AExQgFVQ (typography regression), dpl_E3py5kdRFyigjKparUSfyMM5gh7Y (font decode shift), dpl_EZym5qVhodTL6nLuyQ3583Am9hjE (font shift fixed; cold/data delays and legacy cutoff exposed). All were superseded/restored; no Live alias moved.
- Remaining: profile and fix cold/variable route, metadata and required-data latency; rerun the scoped speed acceptance; Rocky's full every-theme/art/device review. No Live approval requested or inferred.
