# FAIL — Smoke SSR + Finder browser rerun

Existing preview reused; no rebuild or redeploy. CLS limit is strictly below **0.01**, measured without rounding before comparison. Displayed CLS uses four decimals.

- Candidate: `dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j`, READY at preflight, application SHA `ca6af2e6607d541f662d9aeeec6986c83ef8528b`.
- Branch at start: `e59b624e9e2a5891494bf53c9c58a0b7e5af2e64`, `codex/release-ssr-finder`. All follow-up changes are vault evidence only.
- Draft PR [#166](https://github.com/louis623/sparkle-suite/pull/166), kept draft and unmerged.
- Matrix fully measured **110/156**; **111 attempted**, 1 incomplete attempt, 45 not attempted (3a 111/138 attempted, 3b 0/18). Maximum CLS **0.0001** (unrounded 0.00007330246913580247).
- Stop: **Rose Champagne Dance Floor, desktop**, navigation started **18:44:16 EDT** and returned `net::ERR_TIMED_OUT`. **No HTTP status or SSR measurement was available**; no 503 or application SSR regression is asserted. The runner treated the unavailable response as a hard stop. Remaining checks were skipped, not retried. The underlying application/network cause has not been isolated.
- Alias `sparkle-suite-smoke.vercel.app`: rollback `dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc` -> candidate `dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j`, verified **10/29/26, 6:18:31 PM EDT**.
- Hard-failure rollback to **`dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc`** verified **10/29/26, 6:52:39 PM EDT**.
- Final alias target: **`dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc`**, reread **10/29/26, 6:52:39 PM EDT**.

Only the Smoke alias moved. No Live deployment/project/env/key/database operations, sign-in, form submission, signup, swap, trade or favorite action. All application traffic was GET-only; non-GET attempts, tracking, direct Live database APIs and WebSockets were blocked. Public media GETs were permitted. No secret, cookie, authenticated share URL or environment value is saved.

The initial automatic local-CLI rollback failed. Two connector restoration requests then timed out in automatic permission review; neither confirmed a change. A read-only local CLI check confirmed the candidate was still assigned at **18:52:03 EDT**. The bounded local CLI restoration succeeded and reread the recorded rollback at **18:52:39 EDT**. This recovery changed only the same Smoke alias; no other deployment, alias or project setting changed.

All **110 completed matrix loads** returned **200**, had the SSR marker, stayed below the new CLS limit, and passed the first-paint style probe. **0 audio-autoplay events**, **0 submissions**, and **0 non-GET request attempts** were observed. The separate default-home cold load also returned 200 with SSR, CLS 0 and styled content. No application fixes were made. Investigation/fix effort is not estimated in this measurement-only scope.

## Results

| Step | Result | Exact counts |
|---|---|---|
| 3a | **FAIL** | measured 110; attempted 111; expected 138; hardFailures 1; otherFailures 10; overBudget 11 |
| 3b | **FAIL** | measured 0; attempted 0; expected 18; hardFailures 0; otherFailures 0; overBudget 0 |
| 3c | **FAIL** | warmSamples 0; expectedWarm 60; coldSamples 1; expectedCold 2; overBudgetWarm 0 |
| 3d | **FAIL** | candidateLoads 0; liveComparisonLoads 0; matchingControlSets 0 |
| 3e | **FAIL** | measured 0; expected 3 |

Failures in unperformed sections mean **not verified** after the stop, not an observed failure on every skipped page. There are **45 unattempted matrix loads plus 1 incomplete attempt**, so **46/156 lack complete measurements**. The ten other failed cases below concern motion; the eleven over-budget cases can overlap them.

## Motion findings

- Halloween Pumpkin Cat and Gilded Autumn Dance Floor/Join, both desktop and phone: **8 loads** had no observed hero motion and no visible Pause/Play control. Those interactions are recorded as unavailable, not passing.
- Pearl Rose and Sunset Beach Home on phone: **2 loads** had no advancing hero playback in the initial 400 ms comparison. Pause and Play worked afterward. This distinguishes initial autoplay from visitor-triggered playback.
- Reduced-motion requests left hero animation/video running in **38/110** preference checks. Each result is recorded below; all playing media remained muted. The test requested the preference after initial playback, not as a fresh reduced-motion page navigation.

## Cold starts — separate from warm samples

The first request of the run was a default Smoke homepage cold request. No cold request is included in a warm median. Controlled QA idle was at least 15 minutes before that request; other visitors cannot be observed. One first-request default-home desktop cold sample per host was planned. Additional default routes/profiles use a recorded warmup followed by five warm samples.

| Site/path/profile | H1 | FCP | LCP | Request TTFB |
|---|---:|---:|---:|---:|
| Smoke /dudesfizzfest desktop | 7.810 s | 7.724 s | 7.888 s | 0.043 s |

## Warm timings — Smoke beside Live

Median of five samples; range is minimum–maximum. Desktop H1/LCP must each be below 2 s; emulated slow-phone H1/LCP each below 3 s.

| Page | Profile | Smoke samples / H1 / LCP | Live samples / H1 / LCP |
|---|---|---|---|
| /dudesfizzfest | desktop | 0/5; not run | 0/5; not run |
| /dudesfizzfest | phone | 0/5; not run | 0/5; not run |
| /dudesfizzfest/trade | desktop | 0/5; not run | 0/5; not run |
| /dudesfizzfest/trade | phone | 0/5; not run | 0/5; not run |
| /dudesfizzfest/join | desktop | 0/5; not run | 0/5; not run |
| /dudesfizzfest/join | phone | 0/5; not run | 0/5; not run |

## Pages over budget

**Formal warm samples: 0.**

No measured over-budget cases in this category; see completion counts before interpreting.

**Theme/layout matrix samples (not formal warm samples): 11.**

- Smoke /dudesfizzfest/trade [neon_butterfly] phone: H1 1.952 s, LCP 3.804 s.
- Smoke /dudesfizzfest/join [neon_butterfly] phone: H1 1.924 s, LCP 3.716 s.
- Smoke /dudesfizzfest [halloween_pumpkin_cat] phone: H1 1.188 s, LCP 3.688 s.
- Smoke /dudesfizzfest [gilded_autumn] phone: H1 1.200 s, LCP 3.948 s.
- Smoke /dudesfizzfest/join [gilded_autumn] phone: H1 1.864 s, LCP 3.264 s.
- Smoke /dudesfizzfest [midnight_rose] phone: H1 1.927 s, LCP 3.184 s.
- Smoke /dudesfizzfest [gobble_and_fizz] phone: H1 1.148 s, LCP 3.272 s.
- Smoke /dudesfizzfest [pie_please] phone: H1 1.520 s, LCP 3.912 s.
- Smoke /dudesfizzfest [pearl_rose] phone: H1 1.466 s, LCP 3.764 s.
- Smoke /dudesfizzfest/join [sunset_beach] phone: H1 3.834 s, LCP 4.120 s.
- Smoke /dudesfizzfest [rose_champagne] phone: H1 6.109 s, LCP 7.816 s.

## Motion, first paint and method

Isolated signed-out Chromium 153.0.8010.12. The Browser plugin was not available; cached Playwright was used, without dependency installation. Desktop 1440×900, CPU unthrottled. **Phone is emulated**: 390×844, 4× CPU, 150 ms latency, 1.6 Mbps down, cache off. Desktop cache remained enabled. Service workers were blocked. CDP Fetch enforced GET-only requests without Playwright HTTP routing disabling the desktop cache.

Native PerformanceObservers record FCP/LCP and CLS (maximum session window, recent-input shifts excluded); a requestAnimationFrame probe records first in-viewport H1. Timing is captured before interactions. The first visible H1 must have loaded stylesheet rules and non-default typography; first/final critical-style comparisons and first-paint screenshots support the plain-text-flash check. First-paint screenshots may precede the hero text while the styled header is already visible; this is reported separately from an unstyled flash.

Pause -> Play is tested by clicking only the native hero motion button, followed by video/CSS animation and visitor-intent checks. Reduced motion is requested afterward and its actual effect is recorded; no media is forcibly paused by the test.

Reduced-motion request left hero animation/video running in **38/110** measured preference checks. This is a reported compatibility issue, not one of the user-defined hard stops.

- Smoke /dudesfizzfest [amethyst] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [amethyst] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [gnome_garden] desktop: 12 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [gnome_garden] phone: 8 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/trade [gnome_garden] desktop: 13 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/trade [gnome_garden] phone: 9 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/join [gnome_garden] desktop: 13 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/join [gnome_garden] phone: 9 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [neon_butterfly] desktop: 34 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [neon_butterfly] phone: 22 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/trade [neon_butterfly] desktop: 34 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/trade [neon_butterfly] phone: 22 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/join [neon_butterfly] desktop: 34 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/join [neon_butterfly] phone: 22 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [halloween_pumpkin_witch] desktop: 5 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [halloween_pumpkin_witch] phone: 5 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/trade [halloween_pumpkin_witch] desktop: 5 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/trade [halloween_pumpkin_witch] phone: 5 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/join [halloween_pumpkin_witch] desktop: 5 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest/join [halloween_pumpkin_witch] phone: 5 running hero animations, 0 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [halloween_pumpkin_cat] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [halloween_pumpkin_cat] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [gilded_autumn] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [gilded_autumn] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [midnight_rose] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [midnight_rose] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [fall_owl_harvest_moon] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [fall_owl_harvest_moon] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [gobble_and_fizz] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [gobble_and_fizz] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [pie_please] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [pie_please] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [pearl_rose] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [pearl_rose] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [sunset_beach] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [sunset_beach] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [rose_champagne] desktop: 0 running hero animations, 1 playing hero videos; all playing media muted true.
- Smoke /dudesfizzfest [rose_champagne] phone: 0 running hero animations, 1 playing hero videos; all playing media muted true.

## Every measured page load

Detailed state, shift events, media, reduced-motion result, first-paint and final screenshot paths are in `results.json`. This table includes cold/warmup/warm/comparison loads separately from the 156-load theme/layout matrix.

| # | Group | Page/theme/profile | HTTP | SSR | CLS | H1 ms | FCP ms | LCP ms | Styled | Motion | Pause/Play | Reduced motion honored |
|---|---|---|---:|---|---:|---:|---:|---:|---|---|---|---|
| 1 | 3c-cold | Smoke /dudesfizzfest desktop | 200 | true | 0.0000 | 7810.0 | 7724.0 | 7888.0 | true | not run | not run / not run | not run |
| 2 | 3a | Smoke /dudesfizzfest [amethyst] desktop | 200 | true | 0.0000 | 1096.0 | 1096.0 | 1184.0 | true | true | true / true | false |
| 3 | 3a | Smoke /dudesfizzfest [amethyst] phone | 200 | true | 0.0000 | 1361.8 | 1128.0 | 1624.0 | true | true | true / true | false |
| 4 | 3a | Smoke /dudesfizzfest/trade [amethyst] desktop | 200 | true | 0.0000 | 724.0 | 724.0 | 724.0 | true | true | true / true | true |
| 5 | 3a | Smoke /dudesfizzfest/trade [amethyst] phone | 200 | true | 0.0000 | 1540.0 | 1540.0 | 1540.0 | true | true | true / true | true |
| 6 | 3a | Smoke /dudesfizzfest/join [amethyst] desktop | 200 | true | 0.0000 | 836.0 | 836.0 | 836.0 | true | true | true / true | true |
| 7 | 3a | Smoke /dudesfizzfest/join [amethyst] phone | 200 | true | 0.0000 | 1676.0 | 1676.0 | 1676.0 | true | true | true / true | true |
| 8 | 3a | Smoke /dudesfizzfest [sparkle_suite_morganite] desktop | 200 | true | 0.0000 | 764.0 | 764.0 | 764.0 | true | true | true / true | true |
| 9 | 3a | Smoke /dudesfizzfest [sparkle_suite_morganite] phone | 200 | true | 0.0000 | 1476.0 | 1476.0 | 1476.0 | true | true | true / true | true |
| 10 | 3a | Smoke /dudesfizzfest/trade [sparkle_suite_morganite] desktop | 200 | true | 0.0000 | 684.0 | 684.0 | 684.0 | true | true | true / true | true |
| 11 | 3a | Smoke /dudesfizzfest/trade [sparkle_suite_morganite] phone | 200 | true | 0.0000 | 1756.0 | 1756.0 | 1756.0 | true | true | true / true | true |
| 12 | 3a | Smoke /dudesfizzfest/join [sparkle_suite_morganite] desktop | 200 | true | 0.0000 | 960.0 | 960.0 | 960.0 | true | true | true / true | true |
| 13 | 3a | Smoke /dudesfizzfest/join [sparkle_suite_morganite] phone | 200 | true | 0.0000 | 2016.0 | 2016.0 | 2016.0 | true | true | true / true | true |
| 14 | 3a | Smoke /dudesfizzfest [black_diamond] desktop | 200 | true | 0.0000 | 648.0 | 648.0 | 648.0 | true | true | true / true | true |
| 15 | 3a | Smoke /dudesfizzfest [black_diamond] phone | 200 | true | 0.0000 | 1236.0 | 1236.0 | 1236.0 | true | true | true / true | true |
| 16 | 3a | Smoke /dudesfizzfest/trade [black_diamond] desktop | 200 | true | 0.0000 | 808.0 | 808.0 | 808.0 | true | true | true / true | true |
| 17 | 3a | Smoke /dudesfizzfest/trade [black_diamond] phone | 200 | true | 0.0000 | 1848.0 | 1848.0 | 1848.0 | true | true | true / true | true |
| 18 | 3a | Smoke /dudesfizzfest/join [black_diamond] desktop | 200 | true | 0.0000 | 772.0 | 772.0 | 772.0 | true | true | true / true | true |
| 19 | 3a | Smoke /dudesfizzfest/join [black_diamond] phone | 200 | true | 0.0000 | 2344.0 | 2344.0 | 2344.0 | true | true | true / true | true |
| 20 | 3a | Smoke /dudesfizzfest [moonstone] desktop | 200 | true | 0.0000 | 736.0 | 736.0 | 736.0 | true | true | true / true | true |
| 21 | 3a | Smoke /dudesfizzfest [moonstone] phone | 200 | true | 0.0000 | 1200.0 | 1200.0 | 1200.0 | true | true | true / true | true |
| 22 | 3a | Smoke /dudesfizzfest/trade [moonstone] desktop | 200 | true | 0.0000 | 712.0 | 712.0 | 712.0 | true | true | true / true | true |
| 23 | 3a | Smoke /dudesfizzfest/trade [moonstone] phone | 200 | true | 0.0000 | 1728.0 | 1728.0 | 1728.0 | true | true | true / true | true |
| 24 | 3a | Smoke /dudesfizzfest/join [moonstone] desktop | 200 | true | 0.0000 | 752.0 | 752.0 | 752.0 | true | true | true / true | true |
| 25 | 3a | Smoke /dudesfizzfest/join [moonstone] phone | 200 | true | 0.0000 | 2020.0 | 2020.0 | 2020.0 | true | true | true / true | true |
| 26 | 3a | Smoke /dudesfizzfest [alpine_opal] desktop | 200 | true | 0.0000 | 700.0 | 700.0 | 700.0 | true | true | true / true | true |
| 27 | 3a | Smoke /dudesfizzfest [alpine_opal] phone | 200 | true | 0.0000 | 1220.0 | 1220.0 | 1220.0 | true | true | true / true | true |
| 28 | 3a | Smoke /dudesfizzfest/trade [alpine_opal] desktop | 200 | true | 0.0000 | 792.0 | 792.0 | 792.0 | true | true | true / true | true |
| 29 | 3a | Smoke /dudesfizzfest/trade [alpine_opal] phone | 200 | true | 0.0000 | 2268.0 | 2268.0 | 2268.0 | true | true | true / true | true |
| 30 | 3a | Smoke /dudesfizzfest/join [alpine_opal] desktop | 200 | true | 0.0000 | 836.0 | 836.0 | 836.0 | true | true | true / true | true |
| 31 | 3a | Smoke /dudesfizzfest/join [alpine_opal] phone | 200 | true | 0.0000 | 2320.0 | 2320.0 | 2320.0 | true | true | true / true | true |
| 32 | 3a | Smoke /dudesfizzfest [emerald_garden] desktop | 200 | true | 0.0000 | 804.0 | 804.0 | 804.0 | true | true | true / true | true |
| 33 | 3a | Smoke /dudesfizzfest [emerald_garden] phone | 200 | true | 0.0000 | 1116.0 | 1116.0 | 1116.0 | true | true | true / true | true |
| 34 | 3a | Smoke /dudesfizzfest/trade [emerald_garden] desktop | 200 | true | 0.0000 | 808.0 | 808.0 | 808.0 | true | true | true / true | true |
| 35 | 3a | Smoke /dudesfizzfest/trade [emerald_garden] phone | 200 | true | 0.0000 | 2748.0 | 2748.0 | 2748.0 | true | true | true / true | true |
| 36 | 3a | Smoke /dudesfizzfest/join [emerald_garden] desktop | 200 | true | 0.0000 | 756.0 | 756.0 | 756.0 | true | true | true / true | true |
| 37 | 3a | Smoke /dudesfizzfest/join [emerald_garden] phone | 200 | true | 0.0000 | 2900.0 | 2900.0 | 2900.0 | true | true | true / true | true |
| 38 | 3a | Smoke /dudesfizzfest [gnome_garden] desktop | 200 | true | 0.0000 | 732.0 | 732.0 | 848.0 | true | true | true / true | false |
| 39 | 3a | Smoke /dudesfizzfest [gnome_garden] phone | 200 | true | 0.0000 | 1312.0 | 1312.0 | 1620.0 | true | true | true / true | false |
| 40 | 3a | Smoke /dudesfizzfest/trade [gnome_garden] desktop | 200 | true | 0.0000 | 676.0 | 676.0 | 756.0 | true | true | true / true | false |
| 41 | 3a | Smoke /dudesfizzfest/trade [gnome_garden] phone | 200 | true | 0.0000 | 1808.0 | 1808.0 | 2476.0 | true | true | true / true | false |
| 42 | 3a | Smoke /dudesfizzfest/join [gnome_garden] desktop | 200 | true | 0.0000 | 688.0 | 688.0 | 688.0 | true | true | true / true | false |
| 43 | 3a | Smoke /dudesfizzfest/join [gnome_garden] phone | 200 | true | 0.0000 | 1916.0 | 1916.0 | 2076.0 | true | true | true / true | false |
| 44 | 3a | Smoke /dudesfizzfest [neon_butterfly] desktop | 200 | true | 0.0000 | 692.0 | 692.0 | 848.0 | true | true | true / true | false |
| 45 | 3a | Smoke /dudesfizzfest [neon_butterfly] phone | 200 | true | 0.0000 | 1380.0 | 1380.0 | 2432.0 | true | true | true / true | false |
| 46 | 3a | Smoke /dudesfizzfest/trade [neon_butterfly] desktop | 200 | true | 0.0000 | 696.0 | 696.0 | 772.0 | true | true | true / true | false |
| 47 | 3a | Smoke /dudesfizzfest/trade [neon_butterfly] phone | 200 | true | 0.0000 | 1952.0 | 1952.0 | 3804.0 | true | true | true / true | false |
| 48 | 3a | Smoke /dudesfizzfest/join [neon_butterfly] desktop | 200 | true | 0.0000 | 1188.0 | 1188.0 | 1188.0 | true | true | true / true | false |
| 49 | 3a | Smoke /dudesfizzfest/join [neon_butterfly] phone | 200 | true | 0.0000 | 1924.0 | 1924.0 | 3716.0 | true | true | true / true | false |
| 50 | 3a | Smoke /dudesfizzfest [halloween_pumpkin_witch] desktop | 200 | true | 0.0000 | 968.0 | 968.0 | 1092.0 | true | true | true / true | false |
| 51 | 3a | Smoke /dudesfizzfest [halloween_pumpkin_witch] phone | 200 | true | 0.0000 | 1279.0 | 908.0 | 1680.0 | true | true | true / true | false |
| 52 | 3a | Smoke /dudesfizzfest/trade [halloween_pumpkin_witch] desktop | 200 | true | 0.0000 | 836.0 | 836.0 | 876.0 | true | true | true / true | false |
| 53 | 3a | Smoke /dudesfizzfest/trade [halloween_pumpkin_witch] phone | 200 | true | 0.0000 | 1928.0 | 1928.0 | 2396.0 | true | true | true / true | false |
| 54 | 3a | Smoke /dudesfizzfest/join [halloween_pumpkin_witch] desktop | 200 | true | 0.0000 | 860.0 | 860.0 | 860.0 | true | true | true / true | false |
| 55 | 3a | Smoke /dudesfizzfest/join [halloween_pumpkin_witch] phone | 200 | true | 0.0000 | 1956.0 | 1956.0 | 2716.0 | true | true | true / true | false |
| 56 | 3a | Smoke /dudesfizzfest [halloween_pumpkin_cat] desktop | 200 | true | 0.0000 | 684.0 | 684.0 | 736.0 | true | true | true / true | false |
| 57 | 3a | Smoke /dudesfizzfest [halloween_pumpkin_cat] phone | 200 | true | 0.0000 | 1188.0 | 1188.0 | 3688.0 | true | true | true / true | false |
| 58 | 3a | Smoke /dudesfizzfest/trade [halloween_pumpkin_cat] desktop | 200 | true | 0.0000 | 728.0 | 728.0 | 728.0 | true | false | not run / not run | true |
| 59 | 3a | Smoke /dudesfizzfest/trade [halloween_pumpkin_cat] phone | 200 | true | 0.0000 | 1808.0 | 1808.0 | 1808.0 | true | false | not run / not run | true |
| 60 | 3a | Smoke /dudesfizzfest/join [halloween_pumpkin_cat] desktop | 200 | true | 0.0000 | 832.0 | 832.0 | 832.0 | true | false | not run / not run | true |
| 61 | 3a | Smoke /dudesfizzfest/join [halloween_pumpkin_cat] phone | 200 | true | 0.0000 | 1652.0 | 1652.0 | 1652.0 | true | false | not run / not run | true |
| 62 | 3a | Smoke /dudesfizzfest [gilded_autumn] desktop | 200 | true | 0.0000 | 644.0 | 644.0 | 752.0 | true | true | true / true | false |
| 63 | 3a | Smoke /dudesfizzfest [gilded_autumn] phone | 200 | true | 0.0000 | 1200.0 | 1200.0 | 3948.0 | true | true | true / true | false |
| 64 | 3a | Smoke /dudesfizzfest/trade [gilded_autumn] desktop | 200 | true | 0.0000 | 800.0 | 800.0 | 800.0 | true | false | not run / not run | true |
| 65 | 3a | Smoke /dudesfizzfest/trade [gilded_autumn] phone | 200 | true | 0.0000 | 1748.0 | 1748.0 | 1748.0 | true | false | not run / not run | true |
| 66 | 3a | Smoke /dudesfizzfest/join [gilded_autumn] desktop | 200 | true | 0.0000 | 812.0 | 812.0 | 812.0 | true | false | not run / not run | true |
| 67 | 3a | Smoke /dudesfizzfest/join [gilded_autumn] phone | 200 | true | 0.0000 | 1864.0 | 1864.0 | 3264.0 | true | false | not run / not run | true |
| 68 | 3a | Smoke /dudesfizzfest [rose_gold] desktop | 200 | true | 0.0001 | 672.0 | 672.0 | 672.0 | true | true | true / true | true |
| 69 | 3a | Smoke /dudesfizzfest [rose_gold] phone | 200 | true | 0.0000 | 1472.0 | 1472.0 | 1472.0 | true | true | true / true | true |
| 70 | 3a | Smoke /dudesfizzfest/trade [rose_gold] desktop | 200 | true | 0.0000 | 756.0 | 756.0 | 756.0 | true | true | true / true | true |
| 71 | 3a | Smoke /dudesfizzfest/trade [rose_gold] phone | 200 | true | 0.0000 | 1788.0 | 1788.0 | 1788.0 | true | true | true / true | true |
| 72 | 3a | Smoke /dudesfizzfest/join [rose_gold] desktop | 200 | true | 0.0000 | 780.0 | 780.0 | 780.0 | true | true | true / true | true |
| 73 | 3a | Smoke /dudesfizzfest/join [rose_gold] phone | 200 | true | 0.0000 | 2176.0 | 2176.0 | 2176.0 | true | true | true / true | true |
| 74 | 3a | Smoke /dudesfizzfest [midnight_rose] desktop | 200 | true | 0.0001 | 700.0 | 700.0 | 864.0 | true | true | true / true | false |
| 75 | 3a | Smoke /dudesfizzfest [midnight_rose] phone | 200 | true | 0.0000 | 1926.7 | 1584.0 | 3184.0 | true | true | true / true | false |
| 76 | 3a | Smoke /dudesfizzfest/trade [midnight_rose] desktop | 200 | true | 0.0000 | 868.0 | 868.0 | 868.0 | true | true | true / true | true |
| 77 | 3a | Smoke /dudesfizzfest/trade [midnight_rose] phone | 200 | true | 0.0000 | 2544.0 | 2544.0 | 2544.0 | true | true | true / true | true |
| 78 | 3a | Smoke /dudesfizzfest/join [midnight_rose] desktop | 200 | true | 0.0000 | 1116.0 | 1116.0 | 1116.0 | true | true | true / true | true |
| 79 | 3a | Smoke /dudesfizzfest/join [midnight_rose] phone | 200 | true | 0.0000 | 2144.0 | 2144.0 | 2560.0 | true | true | true / true | true |
| 80 | 3a | Smoke /dudesfizzfest [fall_owl_harvest_moon] desktop | 200 | true | 0.0000 | 616.0 | 616.0 | 732.0 | true | true | true / true | false |
| 81 | 3a | Smoke /dudesfizzfest [fall_owl_harvest_moon] phone | 200 | true | 0.0000 | 1331.5 | 1044.0 | 1912.0 | true | true | true / true | false |
| 82 | 3a | Smoke /dudesfizzfest/trade [fall_owl_harvest_moon] desktop | 200 | true | 0.0000 | 680.0 | 680.0 | 680.0 | true | true | true / true | true |
| 83 | 3a | Smoke /dudesfizzfest/trade [fall_owl_harvest_moon] phone | 200 | true | 0.0000 | 2056.0 | 2056.0 | 2056.0 | true | true | true / true | true |
| 84 | 3a | Smoke /dudesfizzfest/join [fall_owl_harvest_moon] desktop | 200 | true | 0.0000 | 1012.0 | 1012.0 | 1012.0 | true | true | true / true | true |
| 85 | 3a | Smoke /dudesfizzfest/join [fall_owl_harvest_moon] phone | 200 | true | 0.0000 | 2028.0 | 2028.0 | 2028.0 | true | true | true / true | true |
| 86 | 3a | Smoke /dudesfizzfest [gobble_and_fizz] desktop | 200 | true | 0.0000 | 624.0 | 624.0 | 760.0 | true | true | true / true | false |
| 87 | 3a | Smoke /dudesfizzfest [gobble_and_fizz] phone | 200 | true | 0.0000 | 1148.0 | 1148.0 | 3272.0 | true | true | true / true | false |
| 88 | 3a | Smoke /dudesfizzfest/trade [gobble_and_fizz] desktop | 200 | true | 0.0000 | 636.0 | 636.0 | 636.0 | true | true | true / true | true |
| 89 | 3a | Smoke /dudesfizzfest/trade [gobble_and_fizz] phone | 200 | true | 0.0000 | 1872.0 | 1872.0 | 1872.0 | true | true | true / true | true |
| 90 | 3a | Smoke /dudesfizzfest/join [gobble_and_fizz] desktop | 200 | true | 0.0000 | 832.0 | 832.0 | 832.0 | true | true | true / true | true |
| 91 | 3a | Smoke /dudesfizzfest/join [gobble_and_fizz] phone | 200 | true | 0.0000 | 1736.0 | 1736.0 | 1736.0 | true | true | true / true | true |
| 92 | 3a | Smoke /dudesfizzfest [pie_please] desktop | 200 | true | 0.0000 | 696.0 | 696.0 | 860.0 | true | true | true / true | false |
| 93 | 3a | Smoke /dudesfizzfest [pie_please] phone | 200 | true | 0.0000 | 1520.5 | 1240.0 | 3912.0 | true | true | true / true | false |
| 94 | 3a | Smoke /dudesfizzfest/trade [pie_please] desktop | 200 | true | 0.0000 | 768.0 | 768.0 | 768.0 | true | true | true / true | true |
| 95 | 3a | Smoke /dudesfizzfest/trade [pie_please] phone | 200 | true | 0.0000 | 2008.0 | 2008.0 | 2008.0 | true | true | true / true | true |
| 96 | 3a | Smoke /dudesfizzfest/join [pie_please] desktop | 200 | true | 0.0000 | 848.0 | 848.0 | 848.0 | true | true | true / true | true |
| 97 | 3a | Smoke /dudesfizzfest/join [pie_please] phone | 200 | true | 0.0000 | 2076.0 | 2076.0 | 2076.0 | true | true | true / true | true |
| 98 | 3a | Smoke /dudesfizzfest [pearl_rose] desktop | 200 | true | 0.0000 | 648.0 | 648.0 | 732.0 | true | true | true / true | false |
| 99 | 3a | Smoke /dudesfizzfest [pearl_rose] phone | 200 | true | 0.0000 | 1466.3 | 1116.0 | 3764.0 | true | false | true / true | false |
| 100 | 3a | Smoke /dudesfizzfest/trade [pearl_rose] desktop | 200 | true | 0.0000 | 1008.0 | 1008.0 | 1008.0 | true | true | true / true | true |
| 101 | 3a | Smoke /dudesfizzfest/trade [pearl_rose] phone | 200 | true | 0.0000 | 2128.0 | 2128.0 | 2128.0 | true | true | true / true | true |
| 102 | 3a | Smoke /dudesfizzfest/join [pearl_rose] desktop | 200 | true | 0.0000 | 960.0 | 960.0 | 1100.0 | true | true | true / true | true |
| 103 | 3a | Smoke /dudesfizzfest/join [pearl_rose] phone | 200 | true | 0.0000 | 2696.0 | 2696.0 | 2784.0 | true | true | true / true | true |
| 104 | 3a | Smoke /dudesfizzfest [sunset_beach] desktop | 200 | true | 0.0000 | 812.0 | 812.0 | 1116.0 | true | true | true / true | false |
| 105 | 3a | Smoke /dudesfizzfest [sunset_beach] phone | 200 | true | 0.0000 | 2296.0 | 2296.0 | 2816.0 | true | false | true / true | false |
| 106 | 3a | Smoke /dudesfizzfest/trade [sunset_beach] desktop | 200 | true | 0.0000 | 908.0 | 908.0 | 908.0 | true | true | true / true | true |
| 107 | 3a | Smoke /dudesfizzfest/trade [sunset_beach] phone | 200 | true | 0.0000 | 2404.0 | 2404.0 | 2404.0 | true | true | true / true | true |
| 108 | 3a | Smoke /dudesfizzfest/join [sunset_beach] desktop | 200 | true | 0.0000 | 1324.0 | 1324.0 | 1752.0 | true | true | true / true | true |
| 109 | 3a | Smoke /dudesfizzfest/join [sunset_beach] phone | 200 | true | 0.0000 | 3833.9 | 2248.0 | 4120.0 | true | true | true / true | true |
| 110 | 3a | Smoke /dudesfizzfest [rose_champagne] desktop | 200 | true | 0.0000 | 1052.0 | 1052.0 | 1252.0 | true | true | true / true | false |
| 111 | 3a | Smoke /dudesfizzfest [rose_champagne] phone | 200 | true | 0.0000 | 6108.8 | 3732.0 | 7816.0 | true | true | true / true | false |
| 112 | 3a | Smoke /dudesfizzfest/trade [rose_champagne] desktop | missing | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | unmeasured | not run | not run / not run | not run |

## Finder

**0/3 GET checks run**, skipped after the stop. One read-only SELECT on the Smoke project found an existing catalog item for availability's required `designId`; no data was created or changed. Louis confirmed using an existing Smoke catalog item. The saved fixture is for that unperformed valid-parameter GET; the bare availability path was never requested.

## Memory and closeout

Vault evidence is saved under this rerun directory. Actual Open Brain MCP capture succeeded, returning "Captured as observation — SSR, Performance, Quality Assurance"; confirmation is in `open-brain-closeout.json`. Evidence is committed and pushed only to the release branch; no application changes, rebuild or redeploy. The requested [PR #166 result comment](https://github.com/louis623/sparkle-suite/pull/166#issuecomment-6510429570) is posted, preserving draft status; receipt is in `pr-comment.json`. No remaining application checks or fixes are attempted under this stopped run.
