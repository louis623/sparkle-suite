# FAIL — SSR + Finder checks-only acceptance resume

The existing READY preview was reused. No rebuild, redeploy, application code changes, environment edits or database writes. Timing and motion findings are nonblocking follow-ups under this resume's rules; required HTTP/SSR/CLS/audio/styling, JSON validation and legacy control comparisons determine the check results below.

**Smoke's complete theme/layout SSR matrix and Finder checks pass. Whole-run acceptance fails on the Live comparison baseline and preserved legacy pages:** CLS exceeds 0.01, the Live dudesfizzfest pages lack the requested SSR marker, Mile High Fizz Pantry is unavailable on both sites, and six available legacy control sets differ. These observations do not by themselves prove a new SSR-renderer regression. Their causes and repair effort were not investigated in this checks-only scope.

- Candidate `dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j`, application SHA `ca6af2e6607d541f662d9aeeec6986c83ef8528b`. Branch started `36b1a6ee4459f846c62a9da229c53baae1c91150`.
- **156/156 cases covered**, **156 with complete HTTP/CLS measurements**: **110 carried unchanged**, **46 newly attempted**. None of the previous 110 was requested again.
- Maximum CLS across measured page loads: **0.2516** (unrounded 0.25156257565345297); required below 0.01.
- Smoke theme/layout matrix maximum CLS: **0.0001**; all 156 matrix loads passed HTTP/SSR/CLS/styling/audio checks.
- Network retries: **0**, from **138** new navigation/API attempts; **0** cases exhausted all three tries. Every attempt is listed below and in results.json.
- Only `sparkle-suite-smoke.vercel.app` moved; the recorded rollback is `dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc`.

## Alias evidence — Eastern time

| Event | Target | Time ET |
|---|---|---|
| Assign candidate | dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j | 10/29/26, 8:06:25 PM EDT |
| Verify candidate | dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j | 10/29/26, 8:06:25 PM EDT |
| Restore recorded rollback | dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc | 10/29/26, 8:37:00 PM EDT |
| Verify rollback | dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc | 10/29/26, 8:37:03 PM EDT |
| Independently reconfirm | dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc | 10/29/26, 8:37:06 PM EDT |
| Additional independent Vercel MCP lookup | dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc | 10/29/26, 8:40:13 PM EDT |

No Live alias, deployment, environment or database was changed. Live requests were signed-out public GETs for comparison. Non-GETs, tracking, direct Live database APIs and WebSockets were blocked; public media GETs were allowed. Smoke's existing catalog designId was reused from the prior confirmed read-only fixture, without a new database query.

The guard blocked **359 third-party TikTok POST/OPTIONS attempts** before transmission. Live comparisons therefore reflect the requested GET-only conditions, including restricted third-party embed traffic. Counts can also depend on Smoke/Live content; no causal explanation for the mismatches is claimed. **0 form submissions, 0 observed audio-autoplay events and 0 plain-text-flash detections** were recorded. No direct Live database access was allowed.

## Checks 3a–3e

| Step | Result | Exact counts |
|---|---|---|
| 3a | **PASS** | covered 138; fullyMeasured 138; expected 138; carried 110; new 28; hard 0; exhaustedNetwork 0; timingMisses 12; motionFollowups 10 |
| 3b | **PASS** | covered 18; fullyMeasured 18; expected 18; carried 0; new 18; hard 0; exhaustedNetwork 0; timingMisses 7; motionFollowups 9 |
| 3c | **FAIL** | Smoke 30; Live 30; LiveCold 1; warmTimingMisses 25 |
| 3d | **FAIL** | compared 8; bothHTTP200 7; matchingAvailableCounts 1; empty404CountSetsMatching 1; expected 8 |
| 3e | **PASS** | validParameterGETs 3; bareValidationGETs 1; expected 3 valid + 1 bare |

All checks ran to completion despite hard findings. There are **50 hard-failing page loads across 20 names**, including the five additional Live warmups; the raw record retains **86 individual reasons** because a page can fail both SSR-marker and CLS criteria. The two 404 Pantry responses are unavailable pages, not measured speed misses. Their all-zero control counts are not counted as a successful legacy comparison: **1/7 available pairs matches; 6/7 differ; 1/8 pairs is unavailable**.

## Hard fails by name

- Live /dudesfizzfest desktop: missing SSR marker; CLS >= 0.01; 6 loads; maximum CLS 0.0209.
- Live /dudesfizzfest phone: missing SSR marker; CLS >= 0.01; 6 loads; maximum CLS 0.0277.
- Live /dudesfizzfest/trade desktop: missing SSR marker; CLS >= 0.01; 6 loads; maximum CLS 0.1374.
- Live /dudesfizzfest/trade phone: missing SSR marker; CLS >= 0.01; 6 loads; maximum CLS 0.0516.
- Live /dudesfizzfest/join desktop: missing SSR marker; CLS >= 0.01; 6 loads; maximum CLS 0.1605.
- Live /dudesfizzfest/join phone: missing SSR marker; CLS >= 0.01; 6 loads; maximum CLS 0.0950.
- Smoke /blingkitchen desktop: CLS >= 0.01; 1 loads; maximum CLS 0.2024.
- Live /blingkitchen desktop: CLS >= 0.01; 1 loads; maximum CLS 0.2009.
- Smoke /blingkitchen/trade desktop: CLS >= 0.01; 1 loads; maximum CLS 0.0846.
- Live /blingkitchen/trade desktop: CLS >= 0.01; 1 loads; maximum CLS 0.0444.
- Smoke /blingkitchen/join desktop: CLS >= 0.01; 1 loads; maximum CLS 0.2510.
- Live /blingkitchen/join desktop: CLS >= 0.01; 1 loads; maximum CLS 0.2430.
- Smoke /milehighfizz desktop: CLS >= 0.01; 1 loads; maximum CLS 0.1971.
- Live /milehighfizz desktop: CLS >= 0.01; 1 loads; maximum CLS 0.0286.
- Smoke /milehighfizz/trade desktop: CLS >= 0.01; 1 loads; maximum CLS 0.0828.
- Live /milehighfizz/trade desktop: CLS >= 0.01; 1 loads; maximum CLS 0.1545.
- Smoke /milehighfizz/join desktop: CLS >= 0.01; 1 loads; maximum CLS 0.2516.
- Live /milehighfizz/join desktop: CLS >= 0.01; 1 loads; maximum CLS 0.0551.
- Smoke /milehighfizz/in-the-pantry desktop: HTTP 404; 1 loads; maximum CLS 0.0000.
- Live /milehighfizz/in-the-pantry desktop: HTTP 404; 1 loads; maximum CLS 0.0000.

Live-origin findings are comparison-baseline observations, not changes made by this candidate. SSR marker assertions follow the requested dudesfizzfest rule on those measured Live pages too.

## Exhausted network cases

**None.** The prior Rose Champagne timeout is historical; its resumed result is in the combined table.

## Timing misses by name

Cold requests are separated below. Every non-cold measured load over its H1 or LCP budget is listed, including carried results, warmups and legacy comparisons. Thresholds: desktop strictly below 2 s; emulated slow phone strictly below 3 s. Matrix observations are single theme/layout loads, not five-sample formal warm medians.

| Page/theme/profile | Group/sample | H1 | LCP |
|---|---|---:|---:|
| Smoke /dudesfizzfest/trade [neon_butterfly] phone | 3a | 1.952 s | 3.804 s |
| Smoke /dudesfizzfest/join [neon_butterfly] phone | 3a | 1.924 s | 3.716 s |
| Smoke /dudesfizzfest [halloween_pumpkin_cat] phone | 3a | 1.188 s | 3.688 s |
| Smoke /dudesfizzfest [gilded_autumn] phone | 3a | 1.200 s | 3.948 s |
| Smoke /dudesfizzfest/join [gilded_autumn] phone | 3a | 1.864 s | 3.264 s |
| Smoke /dudesfizzfest [midnight_rose] phone | 3a | 1.927 s | 3.184 s |
| Smoke /dudesfizzfest [gobble_and_fizz] phone | 3a | 1.148 s | 3.272 s |
| Smoke /dudesfizzfest [pie_please] phone | 3a | 1.520 s | 3.912 s |
| Smoke /dudesfizzfest [pearl_rose] phone | 3a | 1.466 s | 3.764 s |
| Smoke /dudesfizzfest/join [sunset_beach] phone | 3a | 3.834 s | 4.120 s |
| Smoke /dudesfizzfest [rose_champagne] phone | 3a | 6.109 s | 7.816 s |
| Smoke /dudesfizzfest/trade [rose_champagne] desktop | 3a | 8.068 s | 8.068 s |
| Smoke /dudesfizzfest [gilded_autumn / mile_high_fizz] phone | 3b | 2.570 s | 4.944 s |
| Smoke /dudesfizzfest/join [gilded_autumn / mile_high_fizz] phone | 3b | 2.684 s | 3.728 s |
| Smoke /dudesfizzfest [halloween_pumpkin_cat / britt_with_bling] phone | 3b | 1.702 s | 4.508 s |
| Smoke /dudesfizzfest/trade [halloween_pumpkin_cat / britt_with_bling] phone | 3b | 7.884 s | 7.884 s |
| Smoke /dudesfizzfest/join [halloween_pumpkin_cat / britt_with_bling] phone | 3b | 7.746 s | 8.104 s |
| Smoke /dudesfizzfest [halloween_pumpkin_witch / bling_kitchen] phone | 3b | 2.779 s | 4.140 s |
| Smoke /dudesfizzfest/trade [halloween_pumpkin_witch / bling_kitchen] phone | 3b | 6.925 s | 12.548 s |
| Smoke /dudesfizzfest phone | 3c-warmup | 1.359 s | 3.980 s |
| Smoke /dudesfizzfest phone | 3c-warm #1 | 1.224 s | 3.704 s |
| Smoke /dudesfizzfest phone | 3c-warm #2 | 0.972 s | 3.624 s |
| Smoke /dudesfizzfest phone | 3c-warm #3 | 1.144 s | 3.648 s |
| Smoke /dudesfizzfest phone | 3c-warm #4 | 1.370 s | 3.800 s |
| Smoke /dudesfizzfest phone | 3c-warm #5 | 1.450 s | 4.000 s |
| Live /dudesfizzfest desktop | 3c-warm #1 | 0.720 s | 2.420 s |
| Live /dudesfizzfest desktop | 3c-warm #2 | 0.804 s | 2.564 s |
| Live /dudesfizzfest desktop | 3c-warm #3 | 0.680 s | 2.612 s |
| Live /dudesfizzfest desktop | 3c-warm #4 | 0.568 s | 2.312 s |
| Live /dudesfizzfest desktop | 3c-warm #5 | 0.624 s | 2.200 s |
| Live /dudesfizzfest phone | 3c-warmup | 2.268 s | 14.428 s |
| Live /dudesfizzfest phone | 3c-warm #1 | 2.184 s | 15.272 s |
| Live /dudesfizzfest phone | 3c-warm #2 | 2.220 s | 14.256 s |
| Live /dudesfizzfest phone | 3c-warm #3 | 2.148 s | 15.484 s |
| Live /dudesfizzfest phone | 3c-warm #4 | 2.216 s | 15.080 s |
| Live /dudesfizzfest phone | 3c-warm #5 | 2.220 s | 14.964 s |
| Live /dudesfizzfest/trade desktop | 3c-warmup | 0.680 s | 2.048 s |
| Live /dudesfizzfest/trade desktop | 3c-warm #1 | 0.764 s | 2.156 s |
| Live /dudesfizzfest/trade desktop | 3c-warm #4 | 0.884 s | 2.268 s |
| Live /dudesfizzfest/join desktop | 3c-warm #2 | 0.840 s | 2.388 s |
| Live /dudesfizzfest/join desktop | 3c-warm #4 | 2.048 s | 2.252 s |
| Live /dudesfizzfest/join desktop | 3c-warm #5 | 0.868 s | 2.320 s |
| Live /dudesfizzfest/join phone | 3c-warmup | 1.828 s | 4.812 s |
| Live /dudesfizzfest/join phone | 3c-warm #1 | 1.900 s | 5.032 s |
| Live /dudesfizzfest/join phone | 3c-warm #2 | 1.840 s | 4.804 s |
| Live /dudesfizzfest/join phone | 3c-warm #3 | 1.796 s | 4.700 s |
| Live /dudesfizzfest/join phone | 3c-warm #4 | 1.912 s | 4.852 s |
| Live /dudesfizzfest/join phone | 3c-warm #5 | 1.820 s | 4.668 s |
| Smoke /blingkitchen desktop | 3d | 4.676 s | 6.580 s |
| Live /blingkitchen desktop | 3d | 0.976 s | 3.580 s |
| Smoke /blingkitchen/trade desktop | 3d | 0.704 s | 2.688 s |
| Live /blingkitchen/trade desktop | 3d | 0.632 s | 2.304 s |
| Live /blingkitchen/join desktop | 3d | 1.676 s | 2.060 s |
| Smoke /blingkitchen/in-the-pantry desktop | 3d | 0.868 s | 2.044 s |
| Live /blingkitchen/in-the-pantry desktop | 3d | 0.948 s | 2.136 s |
| Smoke /milehighfizz desktop | 3d | 0.664 s | 2.364 s |
| Live /milehighfizz desktop | 3d | 0.612 s | 2.540 s |

## Default warm timing: Smoke beside Live

Median of five; parentheses show minimum–maximum. Samples follow a recorded warmup. The Live desktop homepage cold request also served as that profile/path warmup. Desktop browser cache was enabled; phone cache was off.

| Path | Profile | Smoke H1 / LCP | Live H1 / LCP |
|---|---|---|---|
| /dudesfizzfest | desktop | 5/5; 0.708 s (0.640 s–0.788 s) / 0.772 s (0.672 s–0.848 s) | 5/5; 0.680 s (0.568 s–0.804 s) / 2.420 s (2.200 s–2.612 s) |
| /dudesfizzfest | phone | 5/5; 1.224 s (0.972 s–1.450 s) / 3.704 s (3.624 s–4.000 s) | 5/5; 2.216 s (2.148 s–2.220 s) / 15.080 s (14.256 s–15.484 s) |
| /dudesfizzfest/trade | desktop | 5/5; 0.864 s (0.664 s–1.172 s) / 0.864 s (0.664 s–1.172 s) | 5/5; 0.764 s (0.736 s–0.884 s) / 1.876 s (1.824 s–2.268 s) |
| /dudesfizzfest/trade | phone | 5/5; 1.512 s (1.364 s–1.660 s) / 1.512 s (1.364 s–1.660 s) | 5/5; 2.092 s (2.004 s–2.280 s) / 2.092 s (2.004 s–2.280 s) |
| /dudesfizzfest/join | desktop | 5/5; 0.680 s (0.664 s–0.756 s) / 0.680 s (0.664 s–0.756 s) | 5/5; 0.868 s (0.836 s–2.048 s) / 2.252 s (1.568 s–2.388 s) |
| /dudesfizzfest/join | phone | 5/5; 1.636 s (1.484 s–1.764 s) / 1.636 s (1.484 s–1.764 s) | 5/5; 1.840 s (1.796 s–1.912 s) / 4.804 s (4.668 s–5.032 s) |

## Cold homepage samples

The prior Smoke cold sample is carried, not remeasured. The new Live cold sample was the first agent Live request after at least 15 minutes of controlled idle; unrelated visitors cannot be observed.

| Site/source | Started | H1 | FCP | LCP | TTFB |
|---|---|---:|---:|---:|---:|
| Smoke (prior) | 10/29/26, 6:18:57 PM EDT | 7.810 s | 7.724 s | 7.888 s | 42.5 ms |
| Live (new) | 10/29/26, 8:19:33 PM EDT | 1.608 s | 1.608 s | 3.852 s | 44.4 ms |

## Legacy control comparisons

Counts are buttons / links / inputs / forms; no form was submitted.

| Path | Smoke HTTP/SSR/counts | Live HTTP/SSR/counts | Match |
|---|---|---|---|
| /blingkitchen | 200 / false / 6 / 40 / 3 / 1 | 200 / false / 6 / 72 / 3 / 1 | false |
| /blingkitchen/trade | 200 / false / 1 / 23 / 0 / 0 | 200 / false / 33 / 55 / 1 / 0 | false |
| /blingkitchen/join | 200 / false / 7 / 31 / 0 / 0 | 200 / false / 7 / 63 / 0 / 0 | false |
| /blingkitchen/in-the-pantry | 200 / false / 62 / 13 / 0 / 0 | 200 / false / 62 / 13 / 0 / 0 | true |
| /milehighfizz | 200 / false / 2 / 15 / 3 / 1 | 200 / false / 8 / 26 / 3 / 1 | false |
| /milehighfizz/trade | 200 / false / 1 / 13 / 0 / 0 | 200 / false / 0 / 17 / 0 / 0 | false |
| /milehighfizz/join | 200 / false / 7 / 18 / 0 / 0 | 200 / false / 6 / 24 / 0 / 0 | false |
| /milehighfizz/in-the-pantry | 404 / false / 0 / 0 / 0 / 0 | 404 / false / 0 / 0 / 0 / 0 | not comparable (non-200) |

## Finder GETs and expected bare-route validation

The bare availability request explicitly expects 400; it is not an unexpected non-200 hard fail. Only shape/type/key/count summaries are retained, not full records.

```json
[
  {
    "endpoint": "reps",
    "path": "/api/public/finder/reps",
    "expectedStatus": 200,
    "attemptIds": [
      135
    ],
    "status": 200,
    "jsonObject": true,
    "schemaValid": true,
    "topLevelKeys": [
      "schemaVersion",
      "generatedAt",
      "reps",
      "nextCursor"
    ],
    "schemaVersion": 1,
    "arrays": {
      "reps": {
        "count": 0,
        "itemKeys": []
      }
    },
    "hardFailures": []
  },
  {
    "endpoint": "live-shows",
    "path": "/api/public/finder/live-shows",
    "expectedStatus": 200,
    "attemptIds": [
      136
    ],
    "status": 200,
    "jsonObject": true,
    "schemaValid": true,
    "topLevelKeys": [
      "shows"
    ],
    "schemaVersion": null,
    "arrays": {
      "shows": {
        "count": 0,
        "itemKeys": []
      }
    },
    "hardFailures": []
  },
  {
    "endpoint": "availability",
    "path": "/api/public/finder/availability?designId=00e63bbe-ce49-401a-a375-c6b636646816",
    "expectedStatus": 200,
    "attemptIds": [
      137
    ],
    "status": 200,
    "jsonObject": true,
    "schemaValid": true,
    "topLevelKeys": [
      "schemaVersion",
      "requestedItem",
      "exactMatches",
      "similarMatches",
      "exactPageInfo",
      "similarPageInfo"
    ],
    "schemaVersion": 2,
    "arrays": {
      "exactMatches": {
        "count": 0,
        "itemKeys": []
      },
      "similarMatches": {
        "count": 0,
        "itemKeys": []
      }
    },
    "requestedItemKeys": [
      "designId",
      "itemNumber",
      "designName",
      "collectionName",
      "collectionYear",
      "jewelryType",
      "material",
      "mainStone",
      "bpMsrp",
      "canonicalPhotoUrl",
      "rarityClassification",
      "searchTags",
      "availableListingCount",
      "availableLeadCount",
      "availableDancerCount"
    ],
    "hardFailures": []
  },
  {
    "endpoint": "availability-bare",
    "path": "/api/public/finder/availability",
    "expectedStatus": 400,
    "attemptIds": [
      138
    ],
    "status": 400,
    "jsonObject": true,
    "schemaValid": true,
    "topLevelKeys": [
      "error"
    ],
    "schemaVersion": null,
    "arrays": {},
    "errorMessage": "designId is required.",
    "hardFailures": []
  }
]
```

## Motion and reduced-motion follow-ups

**19** matrix cases have initial-motion or Pause/Play findings, and **48** reduced-motion preference changes left hero playback running. These follow-ups do not stop or independently fail this resume. Preference changes were requested after initial playback; they are not fresh reduced-motion navigations.

- Smoke /dudesfizzfest/trade [halloween_pumpkin_cat] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/trade [halloween_pumpkin_cat] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [halloween_pumpkin_cat] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [halloween_pumpkin_cat] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/trade [gilded_autumn] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/trade [gilded_autumn] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [gilded_autumn] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [gilded_autumn] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest [pearl_rose] phone: Hero motion not observed.
- Smoke /dudesfizzfest [sunset_beach] phone: Hero motion not observed.
- Smoke /dudesfizzfest/trade [gilded_autumn / mile_high_fizz] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/trade [gilded_autumn / mile_high_fizz] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [gilded_autumn / mile_high_fizz] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [gilded_autumn / mile_high_fizz] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest [halloween_pumpkin_cat / britt_with_bling] phone: Hero motion not observed.
- Smoke /dudesfizzfest/trade [halloween_pumpkin_cat / britt_with_bling] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/trade [halloween_pumpkin_cat / britt_with_bling] phone: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [halloween_pumpkin_cat / britt_with_bling] desktop: Hero motion not observed; Pause/Play control unavailable.
- Smoke /dudesfizzfest/join [halloween_pumpkin_cat / britt_with_bling] phone: Hero motion not observed; Pause/Play control unavailable.

## Combined 156-load table

Carried screenshot paths point to the immutable prior rerun directory. The original raw values and source row numbers are preserved; no prior load was remeasured. All new failures remain in the table. Detailed media states, style probes, animation states and screenshot paths are in results.json.

| # | Source | Theme/layout/page/profile | HTTP | SSR | CLS | H1 ms | FCP ms | LCP ms | Styled | Hero video muted | Audio autoplay | Motion | Pause/Play | Reduced honored | Attempts |
|---|---|---|---:|---|---:|---:|---:|---:|---|---|---|---|---|---|---|
| 1 | carried #2 | Smoke /dudesfizzfest [amethyst] desktop | 200 | true | 0.0000 | 1096.0 | 1096.0 | 1184.0 | true | true | false | true | true / true | false | prior |
| 2 | carried #3 | Smoke /dudesfizzfest [amethyst] phone | 200 | true | 0.0000 | 1361.8 | 1128.0 | 1624.0 | true | true | false | true | true / true | false | prior |
| 3 | carried #4 | Smoke /dudesfizzfest/trade [amethyst] desktop | 200 | true | 0.0000 | 724.0 | 724.0 | 724.0 | true | N/A | false | true | true / true | true | prior |
| 4 | carried #5 | Smoke /dudesfizzfest/trade [amethyst] phone | 200 | true | 0.0000 | 1540.0 | 1540.0 | 1540.0 | true | N/A | false | true | true / true | true | prior |
| 5 | carried #6 | Smoke /dudesfizzfest/join [amethyst] desktop | 200 | true | 0.0000 | 836.0 | 836.0 | 836.0 | true | N/A | false | true | true / true | true | prior |
| 6 | carried #7 | Smoke /dudesfizzfest/join [amethyst] phone | 200 | true | 0.0000 | 1676.0 | 1676.0 | 1676.0 | true | N/A | false | true | true / true | true | prior |
| 7 | carried #8 | Smoke /dudesfizzfest [sparkle_suite_morganite] desktop | 200 | true | 0.0000 | 764.0 | 764.0 | 764.0 | true | N/A | false | true | true / true | true | prior |
| 8 | carried #9 | Smoke /dudesfizzfest [sparkle_suite_morganite] phone | 200 | true | 0.0000 | 1476.0 | 1476.0 | 1476.0 | true | N/A | false | true | true / true | true | prior |
| 9 | carried #10 | Smoke /dudesfizzfest/trade [sparkle_suite_morganite] desktop | 200 | true | 0.0000 | 684.0 | 684.0 | 684.0 | true | N/A | false | true | true / true | true | prior |
| 10 | carried #11 | Smoke /dudesfizzfest/trade [sparkle_suite_morganite] phone | 200 | true | 0.0000 | 1756.0 | 1756.0 | 1756.0 | true | N/A | false | true | true / true | true | prior |
| 11 | carried #12 | Smoke /dudesfizzfest/join [sparkle_suite_morganite] desktop | 200 | true | 0.0000 | 960.0 | 960.0 | 960.0 | true | N/A | false | true | true / true | true | prior |
| 12 | carried #13 | Smoke /dudesfizzfest/join [sparkle_suite_morganite] phone | 200 | true | 0.0000 | 2016.0 | 2016.0 | 2016.0 | true | N/A | false | true | true / true | true | prior |
| 13 | carried #14 | Smoke /dudesfizzfest [black_diamond] desktop | 200 | true | 0.0000 | 648.0 | 648.0 | 648.0 | true | N/A | false | true | true / true | true | prior |
| 14 | carried #15 | Smoke /dudesfizzfest [black_diamond] phone | 200 | true | 0.0000 | 1236.0 | 1236.0 | 1236.0 | true | N/A | false | true | true / true | true | prior |
| 15 | carried #16 | Smoke /dudesfizzfest/trade [black_diamond] desktop | 200 | true | 0.0000 | 808.0 | 808.0 | 808.0 | true | N/A | false | true | true / true | true | prior |
| 16 | carried #17 | Smoke /dudesfizzfest/trade [black_diamond] phone | 200 | true | 0.0000 | 1848.0 | 1848.0 | 1848.0 | true | N/A | false | true | true / true | true | prior |
| 17 | carried #18 | Smoke /dudesfizzfest/join [black_diamond] desktop | 200 | true | 0.0000 | 772.0 | 772.0 | 772.0 | true | N/A | false | true | true / true | true | prior |
| 18 | carried #19 | Smoke /dudesfizzfest/join [black_diamond] phone | 200 | true | 0.0000 | 2344.0 | 2344.0 | 2344.0 | true | N/A | false | true | true / true | true | prior |
| 19 | carried #20 | Smoke /dudesfizzfest [moonstone] desktop | 200 | true | 0.0000 | 736.0 | 736.0 | 736.0 | true | N/A | false | true | true / true | true | prior |
| 20 | carried #21 | Smoke /dudesfizzfest [moonstone] phone | 200 | true | 0.0000 | 1200.0 | 1200.0 | 1200.0 | true | N/A | false | true | true / true | true | prior |
| 21 | carried #22 | Smoke /dudesfizzfest/trade [moonstone] desktop | 200 | true | 0.0000 | 712.0 | 712.0 | 712.0 | true | N/A | false | true | true / true | true | prior |
| 22 | carried #23 | Smoke /dudesfizzfest/trade [moonstone] phone | 200 | true | 0.0000 | 1728.0 | 1728.0 | 1728.0 | true | N/A | false | true | true / true | true | prior |
| 23 | carried #24 | Smoke /dudesfizzfest/join [moonstone] desktop | 200 | true | 0.0000 | 752.0 | 752.0 | 752.0 | true | N/A | false | true | true / true | true | prior |
| 24 | carried #25 | Smoke /dudesfizzfest/join [moonstone] phone | 200 | true | 0.0000 | 2020.0 | 2020.0 | 2020.0 | true | N/A | false | true | true / true | true | prior |
| 25 | carried #26 | Smoke /dudesfizzfest [alpine_opal] desktop | 200 | true | 0.0000 | 700.0 | 700.0 | 700.0 | true | N/A | false | true | true / true | true | prior |
| 26 | carried #27 | Smoke /dudesfizzfest [alpine_opal] phone | 200 | true | 0.0000 | 1220.0 | 1220.0 | 1220.0 | true | N/A | false | true | true / true | true | prior |
| 27 | carried #28 | Smoke /dudesfizzfest/trade [alpine_opal] desktop | 200 | true | 0.0000 | 792.0 | 792.0 | 792.0 | true | N/A | false | true | true / true | true | prior |
| 28 | carried #29 | Smoke /dudesfizzfest/trade [alpine_opal] phone | 200 | true | 0.0000 | 2268.0 | 2268.0 | 2268.0 | true | N/A | false | true | true / true | true | prior |
| 29 | carried #30 | Smoke /dudesfizzfest/join [alpine_opal] desktop | 200 | true | 0.0000 | 836.0 | 836.0 | 836.0 | true | N/A | false | true | true / true | true | prior |
| 30 | carried #31 | Smoke /dudesfizzfest/join [alpine_opal] phone | 200 | true | 0.0000 | 2320.0 | 2320.0 | 2320.0 | true | N/A | false | true | true / true | true | prior |
| 31 | carried #32 | Smoke /dudesfizzfest [emerald_garden] desktop | 200 | true | 0.0000 | 804.0 | 804.0 | 804.0 | true | N/A | false | true | true / true | true | prior |
| 32 | carried #33 | Smoke /dudesfizzfest [emerald_garden] phone | 200 | true | 0.0000 | 1116.0 | 1116.0 | 1116.0 | true | N/A | false | true | true / true | true | prior |
| 33 | carried #34 | Smoke /dudesfizzfest/trade [emerald_garden] desktop | 200 | true | 0.0000 | 808.0 | 808.0 | 808.0 | true | N/A | false | true | true / true | true | prior |
| 34 | carried #35 | Smoke /dudesfizzfest/trade [emerald_garden] phone | 200 | true | 0.0000 | 2748.0 | 2748.0 | 2748.0 | true | N/A | false | true | true / true | true | prior |
| 35 | carried #36 | Smoke /dudesfizzfest/join [emerald_garden] desktop | 200 | true | 0.0000 | 756.0 | 756.0 | 756.0 | true | N/A | false | true | true / true | true | prior |
| 36 | carried #37 | Smoke /dudesfizzfest/join [emerald_garden] phone | 200 | true | 0.0000 | 2900.0 | 2900.0 | 2900.0 | true | N/A | false | true | true / true | true | prior |
| 37 | carried #38 | Smoke /dudesfizzfest [gnome_garden] desktop | 200 | true | 0.0000 | 732.0 | 732.0 | 848.0 | true | N/A | false | true | true / true | false | prior |
| 38 | carried #39 | Smoke /dudesfizzfest [gnome_garden] phone | 200 | true | 0.0000 | 1312.0 | 1312.0 | 1620.0 | true | N/A | false | true | true / true | false | prior |
| 39 | carried #40 | Smoke /dudesfizzfest/trade [gnome_garden] desktop | 200 | true | 0.0000 | 676.0 | 676.0 | 756.0 | true | N/A | false | true | true / true | false | prior |
| 40 | carried #41 | Smoke /dudesfizzfest/trade [gnome_garden] phone | 200 | true | 0.0000 | 1808.0 | 1808.0 | 2476.0 | true | N/A | false | true | true / true | false | prior |
| 41 | carried #42 | Smoke /dudesfizzfest/join [gnome_garden] desktop | 200 | true | 0.0000 | 688.0 | 688.0 | 688.0 | true | N/A | false | true | true / true | false | prior |
| 42 | carried #43 | Smoke /dudesfizzfest/join [gnome_garden] phone | 200 | true | 0.0000 | 1916.0 | 1916.0 | 2076.0 | true | N/A | false | true | true / true | false | prior |
| 43 | carried #44 | Smoke /dudesfizzfest [neon_butterfly] desktop | 200 | true | 0.0000 | 692.0 | 692.0 | 848.0 | true | N/A | false | true | true / true | false | prior |
| 44 | carried #45 | Smoke /dudesfizzfest [neon_butterfly] phone | 200 | true | 0.0000 | 1380.0 | 1380.0 | 2432.0 | true | N/A | false | true | true / true | false | prior |
| 45 | carried #46 | Smoke /dudesfizzfest/trade [neon_butterfly] desktop | 200 | true | 0.0000 | 696.0 | 696.0 | 772.0 | true | N/A | false | true | true / true | false | prior |
| 46 | carried #47 | Smoke /dudesfizzfest/trade [neon_butterfly] phone | 200 | true | 0.0000 | 1952.0 | 1952.0 | 3804.0 | true | N/A | false | true | true / true | false | prior |
| 47 | carried #48 | Smoke /dudesfizzfest/join [neon_butterfly] desktop | 200 | true | 0.0000 | 1188.0 | 1188.0 | 1188.0 | true | N/A | false | true | true / true | false | prior |
| 48 | carried #49 | Smoke /dudesfizzfest/join [neon_butterfly] phone | 200 | true | 0.0000 | 1924.0 | 1924.0 | 3716.0 | true | N/A | false | true | true / true | false | prior |
| 49 | carried #50 | Smoke /dudesfizzfest [halloween_pumpkin_witch] desktop | 200 | true | 0.0000 | 968.0 | 968.0 | 1092.0 | true | N/A | false | true | true / true | false | prior |
| 50 | carried #51 | Smoke /dudesfizzfest [halloween_pumpkin_witch] phone | 200 | true | 0.0000 | 1279.0 | 908.0 | 1680.0 | true | N/A | false | true | true / true | false | prior |
| 51 | carried #52 | Smoke /dudesfizzfest/trade [halloween_pumpkin_witch] desktop | 200 | true | 0.0000 | 836.0 | 836.0 | 876.0 | true | N/A | false | true | true / true | false | prior |
| 52 | carried #53 | Smoke /dudesfizzfest/trade [halloween_pumpkin_witch] phone | 200 | true | 0.0000 | 1928.0 | 1928.0 | 2396.0 | true | N/A | false | true | true / true | false | prior |
| 53 | carried #54 | Smoke /dudesfizzfest/join [halloween_pumpkin_witch] desktop | 200 | true | 0.0000 | 860.0 | 860.0 | 860.0 | true | N/A | false | true | true / true | false | prior |
| 54 | carried #55 | Smoke /dudesfizzfest/join [halloween_pumpkin_witch] phone | 200 | true | 0.0000 | 1956.0 | 1956.0 | 2716.0 | true | N/A | false | true | true / true | false | prior |
| 55 | carried #56 | Smoke /dudesfizzfest [halloween_pumpkin_cat] desktop | 200 | true | 0.0000 | 684.0 | 684.0 | 736.0 | true | true | false | true | true / true | false | prior |
| 56 | carried #57 | Smoke /dudesfizzfest [halloween_pumpkin_cat] phone | 200 | true | 0.0000 | 1188.0 | 1188.0 | 3688.0 | true | true | false | true | true / true | false | prior |
| 57 | carried #58 | Smoke /dudesfizzfest/trade [halloween_pumpkin_cat] desktop | 200 | true | 0.0000 | 728.0 | 728.0 | 728.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 58 | carried #59 | Smoke /dudesfizzfest/trade [halloween_pumpkin_cat] phone | 200 | true | 0.0000 | 1808.0 | 1808.0 | 1808.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 59 | carried #60 | Smoke /dudesfizzfest/join [halloween_pumpkin_cat] desktop | 200 | true | 0.0000 | 832.0 | 832.0 | 832.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 60 | carried #61 | Smoke /dudesfizzfest/join [halloween_pumpkin_cat] phone | 200 | true | 0.0000 | 1652.0 | 1652.0 | 1652.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 61 | carried #62 | Smoke /dudesfizzfest [gilded_autumn] desktop | 200 | true | 0.0000 | 644.0 | 644.0 | 752.0 | true | true | false | true | true / true | false | prior |
| 62 | carried #63 | Smoke /dudesfizzfest [gilded_autumn] phone | 200 | true | 0.0000 | 1200.0 | 1200.0 | 3948.0 | true | true | false | true | true / true | false | prior |
| 63 | carried #64 | Smoke /dudesfizzfest/trade [gilded_autumn] desktop | 200 | true | 0.0000 | 800.0 | 800.0 | 800.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 64 | carried #65 | Smoke /dudesfizzfest/trade [gilded_autumn] phone | 200 | true | 0.0000 | 1748.0 | 1748.0 | 1748.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 65 | carried #66 | Smoke /dudesfizzfest/join [gilded_autumn] desktop | 200 | true | 0.0000 | 812.0 | 812.0 | 812.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 66 | carried #67 | Smoke /dudesfizzfest/join [gilded_autumn] phone | 200 | true | 0.0000 | 1864.0 | 1864.0 | 3264.0 | true | N/A | false | false | unavailable / unavailable | true | prior |
| 67 | carried #68 | Smoke /dudesfizzfest [rose_gold] desktop | 200 | true | 0.0001 | 672.0 | 672.0 | 672.0 | true | N/A | false | true | true / true | true | prior |
| 68 | carried #69 | Smoke /dudesfizzfest [rose_gold] phone | 200 | true | 0.0000 | 1472.0 | 1472.0 | 1472.0 | true | N/A | false | true | true / true | true | prior |
| 69 | carried #70 | Smoke /dudesfizzfest/trade [rose_gold] desktop | 200 | true | 0.0000 | 756.0 | 756.0 | 756.0 | true | N/A | false | true | true / true | true | prior |
| 70 | carried #71 | Smoke /dudesfizzfest/trade [rose_gold] phone | 200 | true | 0.0000 | 1788.0 | 1788.0 | 1788.0 | true | N/A | false | true | true / true | true | prior |
| 71 | carried #72 | Smoke /dudesfizzfest/join [rose_gold] desktop | 200 | true | 0.0000 | 780.0 | 780.0 | 780.0 | true | N/A | false | true | true / true | true | prior |
| 72 | carried #73 | Smoke /dudesfizzfest/join [rose_gold] phone | 200 | true | 0.0000 | 2176.0 | 2176.0 | 2176.0 | true | N/A | false | true | true / true | true | prior |
| 73 | carried #74 | Smoke /dudesfizzfest [midnight_rose] desktop | 200 | true | 0.0001 | 700.0 | 700.0 | 864.0 | true | true | false | true | true / true | false | prior |
| 74 | carried #75 | Smoke /dudesfizzfest [midnight_rose] phone | 200 | true | 0.0000 | 1926.7 | 1584.0 | 3184.0 | true | true | false | true | true / true | false | prior |
| 75 | carried #76 | Smoke /dudesfizzfest/trade [midnight_rose] desktop | 200 | true | 0.0000 | 868.0 | 868.0 | 868.0 | true | N/A | false | true | true / true | true | prior |
| 76 | carried #77 | Smoke /dudesfizzfest/trade [midnight_rose] phone | 200 | true | 0.0000 | 2544.0 | 2544.0 | 2544.0 | true | N/A | false | true | true / true | true | prior |
| 77 | carried #78 | Smoke /dudesfizzfest/join [midnight_rose] desktop | 200 | true | 0.0000 | 1116.0 | 1116.0 | 1116.0 | true | N/A | false | true | true / true | true | prior |
| 78 | carried #79 | Smoke /dudesfizzfest/join [midnight_rose] phone | 200 | true | 0.0000 | 2144.0 | 2144.0 | 2560.0 | true | N/A | false | true | true / true | true | prior |
| 79 | carried #80 | Smoke /dudesfizzfest [fall_owl_harvest_moon] desktop | 200 | true | 0.0000 | 616.0 | 616.0 | 732.0 | true | true | false | true | true / true | false | prior |
| 80 | carried #81 | Smoke /dudesfizzfest [fall_owl_harvest_moon] phone | 200 | true | 0.0000 | 1331.5 | 1044.0 | 1912.0 | true | true | false | true | true / true | false | prior |
| 81 | carried #82 | Smoke /dudesfizzfest/trade [fall_owl_harvest_moon] desktop | 200 | true | 0.0000 | 680.0 | 680.0 | 680.0 | true | N/A | false | true | true / true | true | prior |
| 82 | carried #83 | Smoke /dudesfizzfest/trade [fall_owl_harvest_moon] phone | 200 | true | 0.0000 | 2056.0 | 2056.0 | 2056.0 | true | N/A | false | true | true / true | true | prior |
| 83 | carried #84 | Smoke /dudesfizzfest/join [fall_owl_harvest_moon] desktop | 200 | true | 0.0000 | 1012.0 | 1012.0 | 1012.0 | true | N/A | false | true | true / true | true | prior |
| 84 | carried #85 | Smoke /dudesfizzfest/join [fall_owl_harvest_moon] phone | 200 | true | 0.0000 | 2028.0 | 2028.0 | 2028.0 | true | N/A | false | true | true / true | true | prior |
| 85 | carried #86 | Smoke /dudesfizzfest [gobble_and_fizz] desktop | 200 | true | 0.0000 | 624.0 | 624.0 | 760.0 | true | true | false | true | true / true | false | prior |
| 86 | carried #87 | Smoke /dudesfizzfest [gobble_and_fizz] phone | 200 | true | 0.0000 | 1148.0 | 1148.0 | 3272.0 | true | true | false | true | true / true | false | prior |
| 87 | carried #88 | Smoke /dudesfizzfest/trade [gobble_and_fizz] desktop | 200 | true | 0.0000 | 636.0 | 636.0 | 636.0 | true | N/A | false | true | true / true | true | prior |
| 88 | carried #89 | Smoke /dudesfizzfest/trade [gobble_and_fizz] phone | 200 | true | 0.0000 | 1872.0 | 1872.0 | 1872.0 | true | N/A | false | true | true / true | true | prior |
| 89 | carried #90 | Smoke /dudesfizzfest/join [gobble_and_fizz] desktop | 200 | true | 0.0000 | 832.0 | 832.0 | 832.0 | true | N/A | false | true | true / true | true | prior |
| 90 | carried #91 | Smoke /dudesfizzfest/join [gobble_and_fizz] phone | 200 | true | 0.0000 | 1736.0 | 1736.0 | 1736.0 | true | N/A | false | true | true / true | true | prior |
| 91 | carried #92 | Smoke /dudesfizzfest [pie_please] desktop | 200 | true | 0.0000 | 696.0 | 696.0 | 860.0 | true | true | false | true | true / true | false | prior |
| 92 | carried #93 | Smoke /dudesfizzfest [pie_please] phone | 200 | true | 0.0000 | 1520.5 | 1240.0 | 3912.0 | true | true | false | true | true / true | false | prior |
| 93 | carried #94 | Smoke /dudesfizzfest/trade [pie_please] desktop | 200 | true | 0.0000 | 768.0 | 768.0 | 768.0 | true | N/A | false | true | true / true | true | prior |
| 94 | carried #95 | Smoke /dudesfizzfest/trade [pie_please] phone | 200 | true | 0.0000 | 2008.0 | 2008.0 | 2008.0 | true | N/A | false | true | true / true | true | prior |
| 95 | carried #96 | Smoke /dudesfizzfest/join [pie_please] desktop | 200 | true | 0.0000 | 848.0 | 848.0 | 848.0 | true | N/A | false | true | true / true | true | prior |
| 96 | carried #97 | Smoke /dudesfizzfest/join [pie_please] phone | 200 | true | 0.0000 | 2076.0 | 2076.0 | 2076.0 | true | N/A | false | true | true / true | true | prior |
| 97 | carried #98 | Smoke /dudesfizzfest [pearl_rose] desktop | 200 | true | 0.0000 | 648.0 | 648.0 | 732.0 | true | true | false | true | true / true | false | prior |
| 98 | carried #99 | Smoke /dudesfizzfest [pearl_rose] phone | 200 | true | 0.0000 | 1466.3 | 1116.0 | 3764.0 | true | true | false | false | true / true | false | prior |
| 99 | carried #100 | Smoke /dudesfizzfest/trade [pearl_rose] desktop | 200 | true | 0.0000 | 1008.0 | 1008.0 | 1008.0 | true | N/A | false | true | true / true | true | prior |
| 100 | carried #101 | Smoke /dudesfizzfest/trade [pearl_rose] phone | 200 | true | 0.0000 | 2128.0 | 2128.0 | 2128.0 | true | N/A | false | true | true / true | true | prior |
| 101 | carried #102 | Smoke /dudesfizzfest/join [pearl_rose] desktop | 200 | true | 0.0000 | 960.0 | 960.0 | 1100.0 | true | N/A | false | true | true / true | true | prior |
| 102 | carried #103 | Smoke /dudesfizzfest/join [pearl_rose] phone | 200 | true | 0.0000 | 2696.0 | 2696.0 | 2784.0 | true | N/A | false | true | true / true | true | prior |
| 103 | carried #104 | Smoke /dudesfizzfest [sunset_beach] desktop | 200 | true | 0.0000 | 812.0 | 812.0 | 1116.0 | true | true | false | true | true / true | false | prior |
| 104 | carried #105 | Smoke /dudesfizzfest [sunset_beach] phone | 200 | true | 0.0000 | 2296.0 | 2296.0 | 2816.0 | true | true | false | false | true / true | false | prior |
| 105 | carried #106 | Smoke /dudesfizzfest/trade [sunset_beach] desktop | 200 | true | 0.0000 | 908.0 | 908.0 | 908.0 | true | N/A | false | true | true / true | true | prior |
| 106 | carried #107 | Smoke /dudesfizzfest/trade [sunset_beach] phone | 200 | true | 0.0000 | 2404.0 | 2404.0 | 2404.0 | true | N/A | false | true | true / true | true | prior |
| 107 | carried #108 | Smoke /dudesfizzfest/join [sunset_beach] desktop | 200 | true | 0.0000 | 1324.0 | 1324.0 | 1752.0 | true | N/A | false | true | true / true | true | prior |
| 108 | carried #109 | Smoke /dudesfizzfest/join [sunset_beach] phone | 200 | true | 0.0000 | 3833.9 | 2248.0 | 4120.0 | true | N/A | false | true | true / true | true | prior |
| 109 | carried #110 | Smoke /dudesfizzfest [rose_champagne] desktop | 200 | true | 0.0000 | 1052.0 | 1052.0 | 1252.0 | true | true | false | true | true / true | false | prior |
| 110 | carried #111 | Smoke /dudesfizzfest [rose_champagne] phone | 200 | true | 0.0000 | 6108.8 | 3732.0 | 7816.0 | true | true | false | true | true / true | false | prior |
| 111 | new | Smoke /dudesfizzfest/trade [rose_champagne] desktop | 200 | true | 0.0000 | 8068.0 | 8068.0 | 8068.0 | true | N/A | false | true | true / true | true | 1 |
| 112 | new | Smoke /dudesfizzfest/trade [rose_champagne] phone | 200 | true | 0.0000 | 1972.0 | 1972.0 | 1972.0 | true | N/A | false | true | true / true | true | 2 |
| 113 | new | Smoke /dudesfizzfest/join [rose_champagne] desktop | 200 | true | 0.0000 | 1296.0 | 1296.0 | 1296.0 | true | N/A | false | true | true / true | true | 3 |
| 114 | new | Smoke /dudesfizzfest/join [rose_champagne] phone | 200 | true | 0.0000 | 2364.0 | 2364.0 | 2468.0 | true | N/A | false | true | true / true | true | 4 |
| 115 | new | Smoke /dudesfizzfest [garnet] desktop | 200 | true | 0.0000 | 896.0 | 896.0 | 896.0 | true | N/A | false | true | true / true | true | 5 |
| 116 | new | Smoke /dudesfizzfest [garnet] phone | 200 | true | 0.0000 | 1272.0 | 1272.0 | 1272.0 | true | N/A | false | true | true / true | true | 6 |
| 117 | new | Smoke /dudesfizzfest/trade [garnet] desktop | 200 | true | 0.0000 | 760.0 | 760.0 | 760.0 | true | N/A | false | true | true / true | true | 7 |
| 118 | new | Smoke /dudesfizzfest/trade [garnet] phone | 200 | true | 0.0000 | 2956.0 | 2956.0 | 2956.0 | true | N/A | false | true | true / true | true | 8 |
| 119 | new | Smoke /dudesfizzfest/join [garnet] desktop | 200 | true | 0.0000 | 784.0 | 784.0 | 784.0 | true | N/A | false | true | true / true | true | 9 |
| 120 | new | Smoke /dudesfizzfest/join [garnet] phone | 200 | true | 0.0000 | 2412.0 | 2412.0 | 2412.0 | true | N/A | false | true | true / true | true | 10 |
| 121 | new | Smoke /dudesfizzfest [amber] desktop | 200 | true | 0.0000 | 704.0 | 704.0 | 704.0 | true | N/A | false | true | true / true | true | 11 |
| 122 | new | Smoke /dudesfizzfest [amber] phone | 200 | true | 0.0000 | 1448.0 | 1448.0 | 1448.0 | true | N/A | false | true | true / true | true | 12 |
| 123 | new | Smoke /dudesfizzfest/trade [amber] desktop | 200 | true | 0.0000 | 676.0 | 676.0 | 676.0 | true | N/A | false | true | true / true | true | 13 |
| 124 | new | Smoke /dudesfizzfest/trade [amber] phone | 200 | true | 0.0000 | 2416.0 | 2416.0 | 2416.0 | true | N/A | false | true | true / true | true | 14 |
| 125 | new | Smoke /dudesfizzfest/join [amber] desktop | 200 | true | 0.0000 | 728.0 | 728.0 | 728.0 | true | N/A | false | true | true / true | true | 15 |
| 126 | new | Smoke /dudesfizzfest/join [amber] phone | 200 | true | 0.0000 | 2684.0 | 2684.0 | 2684.0 | true | N/A | false | true | true / true | true | 16 |
| 127 | new | Smoke /dudesfizzfest [velvet] desktop | 200 | true | 0.0000 | 732.0 | 732.0 | 732.0 | true | N/A | false | true | true / true | true | 17 |
| 128 | new | Smoke /dudesfizzfest [velvet] phone | 200 | true | 0.0000 | 1064.0 | 1064.0 | 1064.0 | true | N/A | false | true | true / true | true | 18 |
| 129 | new | Smoke /dudesfizzfest/trade [velvet] desktop | 200 | true | 0.0000 | 772.0 | 772.0 | 772.0 | true | N/A | false | true | true / true | true | 19 |
| 130 | new | Smoke /dudesfizzfest/trade [velvet] phone | 200 | true | 0.0000 | 2308.0 | 2308.0 | 2308.0 | true | N/A | false | true | true / true | true | 20 |
| 131 | new | Smoke /dudesfizzfest/join [velvet] desktop | 200 | true | 0.0000 | 1120.0 | 1120.0 | 1120.0 | true | N/A | false | true | true / true | true | 21 |
| 132 | new | Smoke /dudesfizzfest/join [velvet] phone | 200 | true | 0.0000 | 2180.0 | 2180.0 | 2180.0 | true | N/A | false | true | true / true | true | 22 |
| 133 | new | Smoke /dudesfizzfest [rose_quartz] desktop | 200 | true | 0.0000 | 656.0 | 656.0 | 656.0 | true | N/A | false | true | true / true | true | 23 |
| 134 | new | Smoke /dudesfizzfest [rose_quartz] phone | 200 | true | 0.0000 | 1448.0 | 1448.0 | 1448.0 | true | N/A | false | true | true / true | true | 24 |
| 135 | new | Smoke /dudesfizzfest/trade [rose_quartz] desktop | 200 | true | 0.0000 | 760.0 | 760.0 | 760.0 | true | N/A | false | true | true / true | true | 25 |
| 136 | new | Smoke /dudesfizzfest/trade [rose_quartz] phone | 200 | true | 0.0000 | 2500.0 | 2500.0 | 2500.0 | true | N/A | false | true | true / true | true | 26 |
| 137 | new | Smoke /dudesfizzfest/join [rose_quartz] desktop | 200 | true | 0.0000 | 908.0 | 908.0 | 908.0 | true | N/A | false | true | true / true | true | 27 |
| 138 | new | Smoke /dudesfizzfest/join [rose_quartz] phone | 200 | true | 0.0000 | 2516.0 | 2516.0 | 2516.0 | true | N/A | false | true | true / true | true | 28 |
| 139 | new | Smoke /dudesfizzfest [gilded_autumn / mile_high_fizz] desktop | 200 | true | 0.0000 | 723.8 | 596.0 | 1144.0 | true | true | false | true | true / true | false | 29 |
| 140 | new | Smoke /dudesfizzfest [gilded_autumn / mile_high_fizz] phone | 200 | true | 0.0000 | 2570.0 | 1436.0 | 4944.0 | true | true | false | true | true / true | false | 30 |
| 141 | new | Smoke /dudesfizzfest/trade [gilded_autumn / mile_high_fizz] desktop | 200 | true | 0.0000 | 1132.0 | 1132.0 | 1132.0 | true | N/A | false | false | unavailable / unavailable | true | 31 |
| 142 | new | Smoke /dudesfizzfest/trade [gilded_autumn / mile_high_fizz] phone | 200 | true | 0.0000 | 2724.0 | 2724.0 | 2724.0 | true | N/A | false | false | unavailable / unavailable | true | 32 |
| 143 | new | Smoke /dudesfizzfest/join [gilded_autumn / mile_high_fizz] desktop | 200 | true | 0.0000 | 752.0 | 752.0 | 848.0 | true | N/A | false | false | unavailable / unavailable | true | 33 |
| 144 | new | Smoke /dudesfizzfest/join [gilded_autumn / mile_high_fizz] phone | 200 | true | 0.0000 | 2684.0 | 2684.0 | 3728.0 | true | N/A | false | false | unavailable / unavailable | true | 34 |
| 145 | new | Smoke /dudesfizzfest [halloween_pumpkin_cat / britt_with_bling] desktop | 200 | true | 0.0001 | 820.0 | 820.0 | 884.0 | true | true | false | true | true / true | false | 35 |
| 146 | new | Smoke /dudesfizzfest [halloween_pumpkin_cat / britt_with_bling] phone | 200 | true | 0.0000 | 1701.7 | 1228.0 | 4508.0 | true | true | false | false | true / true | false | 36 |
| 147 | new | Smoke /dudesfizzfest/trade [halloween_pumpkin_cat / britt_with_bling] desktop | 200 | true | 0.0000 | 1212.0 | 1212.0 | 1212.0 | true | N/A | false | false | unavailable / unavailable | true | 37 |
| 148 | new | Smoke /dudesfizzfest/trade [halloween_pumpkin_cat / britt_with_bling] phone | 200 | true | 0.0000 | 7884.0 | 7884.0 | 7884.0 | true | N/A | false | false | unavailable / unavailable | true | 38 |
| 149 | new | Smoke /dudesfizzfest/join [halloween_pumpkin_cat / britt_with_bling] desktop | 200 | true | 0.0000 | 1472.0 | 1472.0 | 1472.0 | true | N/A | false | false | unavailable / unavailable | true | 39 |
| 150 | new | Smoke /dudesfizzfest/join [halloween_pumpkin_cat / britt_with_bling] phone | 200 | true | 0.0000 | 7745.6 | 3072.0 | 8104.0 | true | N/A | false | false | unavailable / unavailable | true | 40 |
| 151 | new | Smoke /dudesfizzfest [halloween_pumpkin_witch / bling_kitchen] desktop | 200 | true | 0.0000 | 1320.0 | 1320.0 | 1664.0 | true | N/A | false | true | true / true | false | 41 |
| 152 | new | Smoke /dudesfizzfest [halloween_pumpkin_witch / bling_kitchen] phone | 200 | true | 0.0000 | 2779.3 | 2308.0 | 4140.0 | true | N/A | false | true | true / true | false | 42 |
| 153 | new | Smoke /dudesfizzfest/trade [halloween_pumpkin_witch / bling_kitchen] desktop | 200 | true | 0.0000 | 1728.0 | 1728.0 | 1884.0 | true | N/A | false | true | true / true | false | 43 |
| 154 | new | Smoke /dudesfizzfest/trade [halloween_pumpkin_witch / bling_kitchen] phone | 200 | true | 0.0000 | 6924.8 | 4812.0 | 12548.0 | true | N/A | false | true | true / true | false | 44 |
| 155 | new | Smoke /dudesfizzfest/join [halloween_pumpkin_witch / bling_kitchen] desktop | 200 | true | 0.0000 | 1120.0 | 1120.0 | 1180.0 | true | N/A | false | true | true / true | false | 45 |
| 156 | new | Smoke /dudesfizzfest/join [halloween_pumpkin_witch / bling_kitchen] phone | 200 | true | 0.0000 | 1926.5 | 1572.0 | 2124.0 | true | N/A | false | true | true / true | false | 46 |

## Every new navigation/API attempt

Retries apply only to network errors without an HTTP response, up to three tries with 15 seconds between them. Receiving HTTP then timing out waiting for DOM readiness preserves the HTTP result and available measurements. Hard fails were recorded without stopping subsequent checks.

| Attempt | Page | Try | Started ET | HTTP | Outcome | Retry wait | Error |
|---|---|---:|---|---:|---|---|---|
| 1 | 3a Smoke rose_champagne /trade desktop  | 1 | 10/29/26, 8:06:32 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 2 | 3a Smoke rose_champagne /trade phone  | 1 | 10/29/26, 8:06:50 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 3 | 3a Smoke rose_champagne /join desktop  | 1 | 10/29/26, 8:07:05 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 4 | 3a Smoke rose_champagne /join phone  | 1 | 10/29/26, 8:07:16 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 5 | 3a Smoke garnet home desktop  | 1 | 10/29/26, 8:07:32 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 6 | 3a Smoke garnet home phone  | 1 | 10/29/26, 8:07:43 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 7 | 3a Smoke garnet /trade desktop  | 1 | 10/29/26, 8:07:58 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 8 | 3a Smoke garnet /trade phone  | 1 | 10/29/26, 8:08:09 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 9 | 3a Smoke garnet /join desktop  | 1 | 10/29/26, 8:08:25 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 10 | 3a Smoke garnet /join phone  | 1 | 10/29/26, 8:08:36 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 11 | 3a Smoke amber home desktop  | 1 | 10/29/26, 8:08:51 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 12 | 3a Smoke amber home phone  | 1 | 10/29/26, 8:09:02 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 13 | 3a Smoke amber /trade desktop  | 1 | 10/29/26, 8:09:17 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 14 | 3a Smoke amber /trade phone  | 1 | 10/29/26, 8:09:28 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 15 | 3a Smoke amber /join desktop  | 1 | 10/29/26, 8:09:44 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 16 | 3a Smoke amber /join phone  | 1 | 10/29/26, 8:09:54 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 17 | 3a Smoke velvet home desktop  | 1 | 10/29/26, 8:10:10 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 18 | 3a Smoke velvet home phone  | 1 | 10/29/26, 8:10:21 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 19 | 3a Smoke velvet /trade desktop  | 1 | 10/29/26, 8:10:36 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 20 | 3a Smoke velvet /trade phone  | 1 | 10/29/26, 8:10:47 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 21 | 3a Smoke velvet /join desktop  | 1 | 10/29/26, 8:11:05 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 22 | 3a Smoke velvet /join phone  | 1 | 10/29/26, 8:11:17 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 23 | 3a Smoke rose_quartz home desktop  | 1 | 10/29/26, 8:11:32 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 24 | 3a Smoke rose_quartz home phone  | 1 | 10/29/26, 8:11:43 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 25 | 3a Smoke rose_quartz /trade desktop  | 1 | 10/29/26, 8:11:59 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 26 | 3a Smoke rose_quartz /trade phone  | 1 | 10/29/26, 8:12:10 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 27 | 3a Smoke rose_quartz /join desktop  | 1 | 10/29/26, 8:12:26 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 28 | 3a Smoke rose_quartz /join phone  | 1 | 10/29/26, 8:12:38 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 29 | 3b Smoke gilded_autumn home desktop  | 1 | 10/29/26, 8:12:54 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 30 | 3b Smoke gilded_autumn home phone  | 1 | 10/29/26, 8:13:06 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 31 | 3b Smoke gilded_autumn /trade desktop  | 1 | 10/29/26, 8:13:25 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 32 | 3b Smoke gilded_autumn /trade phone  | 1 | 10/29/26, 8:13:35 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 33 | 3b Smoke gilded_autumn /join desktop  | 1 | 10/29/26, 8:13:51 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 34 | 3b Smoke gilded_autumn /join phone  | 1 | 10/29/26, 8:14:01 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 35 | 3b Smoke halloween_pumpkin_cat home desktop  | 1 | 10/29/26, 8:14:16 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 36 | 3b Smoke halloween_pumpkin_cat home phone  | 1 | 10/29/26, 8:14:27 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 37 | 3b Smoke halloween_pumpkin_cat /trade desktop  | 1 | 10/29/26, 8:14:47 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 38 | 3b Smoke halloween_pumpkin_cat /trade phone  | 1 | 10/29/26, 8:14:59 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 39 | 3b Smoke halloween_pumpkin_cat /join desktop  | 1 | 10/29/26, 8:15:24 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 40 | 3b Smoke halloween_pumpkin_cat /join phone  | 1 | 10/29/26, 8:15:36 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 41 | 3b Smoke halloween_pumpkin_witch home desktop  | 1 | 10/29/26, 8:16:02 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 42 | 3b Smoke halloween_pumpkin_witch home phone  | 1 | 10/29/26, 8:16:15 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 43 | 3b Smoke halloween_pumpkin_witch /trade desktop  | 1 | 10/29/26, 8:16:37 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 44 | 3b Smoke halloween_pumpkin_witch /trade phone  | 1 | 10/29/26, 8:16:51 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 45 | 3b Smoke halloween_pumpkin_witch /join desktop  | 1 | 10/29/26, 8:17:34 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 46 | 3b Smoke halloween_pumpkin_witch /join phone  | 1 | 10/29/26, 8:17:45 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 47 | 3c-cold Live default home desktop  | 1 | 10/29/26, 8:19:33 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 48 | 3c-warmup Smoke default home desktop  | 1 | 10/29/26, 8:19:43 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 49 | 3c-warm Smoke default home desktop 1 | 1 | 10/29/26, 8:19:53 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 50 | 3c-warm Smoke default home desktop 2 | 1 | 10/29/26, 8:20:02 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 51 | 3c-warm Smoke default home desktop 3 | 1 | 10/29/26, 8:20:11 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 52 | 3c-warm Smoke default home desktop 4 | 1 | 10/29/26, 8:20:20 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 53 | 3c-warm Smoke default home desktop 5 | 1 | 10/29/26, 8:20:29 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 54 | 3c-warmup Smoke default home phone  | 1 | 10/29/26, 8:20:38 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 55 | 3c-warm Smoke default home phone 1 | 1 | 10/29/26, 8:20:51 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 56 | 3c-warm Smoke default home phone 2 | 1 | 10/29/26, 8:21:04 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 57 | 3c-warm Smoke default home phone 3 | 1 | 10/29/26, 8:21:17 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 58 | 3c-warm Smoke default home phone 4 | 1 | 10/29/26, 8:21:30 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 59 | 3c-warm Smoke default home phone 5 | 1 | 10/29/26, 8:21:44 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 60 | 3c-warmup Smoke default /trade desktop  | 1 | 10/29/26, 8:21:57 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 61 | 3c-warm Smoke default /trade desktop 1 | 1 | 10/29/26, 8:22:06 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 62 | 3c-warm Smoke default /trade desktop 2 | 1 | 10/29/26, 8:22:16 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 63 | 3c-warm Smoke default /trade desktop 3 | 1 | 10/29/26, 8:22:25 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 64 | 3c-warm Smoke default /trade desktop 4 | 1 | 10/29/26, 8:22:34 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 65 | 3c-warm Smoke default /trade desktop 5 | 1 | 10/29/26, 8:22:43 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 66 | 3c-warmup Smoke default /trade phone  | 1 | 10/29/26, 8:22:52 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 67 | 3c-warm Smoke default /trade phone 1 | 1 | 10/29/26, 8:23:07 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 68 | 3c-warm Smoke default /trade phone 2 | 1 | 10/29/26, 8:23:20 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 69 | 3c-warm Smoke default /trade phone 3 | 1 | 10/29/26, 8:23:33 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 70 | 3c-warm Smoke default /trade phone 4 | 1 | 10/29/26, 8:23:45 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 71 | 3c-warm Smoke default /trade phone 5 | 1 | 10/29/26, 8:23:58 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 72 | 3c-warmup Smoke default /join desktop  | 1 | 10/29/26, 8:24:11 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 73 | 3c-warm Smoke default /join desktop 1 | 1 | 10/29/26, 8:24:20 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 74 | 3c-warm Smoke default /join desktop 2 | 1 | 10/29/26, 8:24:29 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 75 | 3c-warm Smoke default /join desktop 3 | 1 | 10/29/26, 8:24:38 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 76 | 3c-warm Smoke default /join desktop 4 | 1 | 10/29/26, 8:24:47 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 77 | 3c-warm Smoke default /join desktop 5 | 1 | 10/29/26, 8:24:56 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 78 | 3c-warmup Smoke default /join phone  | 1 | 10/29/26, 8:25:05 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 79 | 3c-warm Smoke default /join phone 1 | 1 | 10/29/26, 8:25:18 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 80 | 3c-warm Smoke default /join phone 2 | 1 | 10/29/26, 8:25:30 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 81 | 3c-warm Smoke default /join phone 3 | 1 | 10/29/26, 8:25:43 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 82 | 3c-warm Smoke default /join phone 4 | 1 | 10/29/26, 8:25:56 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 83 | 3c-warm Smoke default /join phone 5 | 1 | 10/29/26, 8:26:09 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 84 | 3c-warm Live default home desktop 1 | 1 | 10/29/26, 8:26:21 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 85 | 3c-warm Live default home desktop 2 | 1 | 10/29/26, 8:26:31 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 86 | 3c-warm Live default home desktop 3 | 1 | 10/29/26, 8:26:40 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 87 | 3c-warm Live default home desktop 4 | 1 | 10/29/26, 8:26:50 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 88 | 3c-warm Live default home desktop 5 | 1 | 10/29/26, 8:27:00 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 89 | 3c-warmup Live default home phone  | 1 | 10/29/26, 8:27:09 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 90 | 3c-warm Live default home phone 1 | 1 | 10/29/26, 8:27:28 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 91 | 3c-warm Live default home phone 2 | 1 | 10/29/26, 8:27:46 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 92 | 3c-warm Live default home phone 3 | 1 | 10/29/26, 8:28:05 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 93 | 3c-warm Live default home phone 4 | 1 | 10/29/26, 8:28:24 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 94 | 3c-warm Live default home phone 5 | 1 | 10/29/26, 8:28:43 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 95 | 3c-warmup Live default /trade desktop  | 1 | 10/29/26, 8:29:02 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 96 | 3c-warm Live default /trade desktop 1 | 1 | 10/29/26, 8:29:12 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 97 | 3c-warm Live default /trade desktop 2 | 1 | 10/29/26, 8:29:21 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 98 | 3c-warm Live default /trade desktop 3 | 1 | 10/29/26, 8:29:31 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 99 | 3c-warm Live default /trade desktop 4 | 1 | 10/29/26, 8:29:40 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 100 | 3c-warm Live default /trade desktop 5 | 1 | 10/29/26, 8:29:50 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 101 | 3c-warmup Live default /trade phone  | 1 | 10/29/26, 8:29:59 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 102 | 3c-warm Live default /trade phone 1 | 1 | 10/29/26, 8:30:18 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 103 | 3c-warm Live default /trade phone 2 | 1 | 10/29/26, 8:30:36 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 104 | 3c-warm Live default /trade phone 3 | 1 | 10/29/26, 8:30:54 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 105 | 3c-warm Live default /trade phone 4 | 1 | 10/29/26, 8:31:12 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 106 | 3c-warm Live default /trade phone 5 | 1 | 10/29/26, 8:31:31 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 107 | 3c-warmup Live default /join desktop  | 1 | 10/29/26, 8:31:49 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 108 | 3c-warm Live default /join desktop 1 | 1 | 10/29/26, 8:31:59 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 109 | 3c-warm Live default /join desktop 2 | 1 | 10/29/26, 8:32:09 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 110 | 3c-warm Live default /join desktop 3 | 1 | 10/29/26, 8:32:19 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 111 | 3c-warm Live default /join desktop 4 | 1 | 10/29/26, 8:32:28 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 112 | 3c-warm Live default /join desktop 5 | 1 | 10/29/26, 8:32:39 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 113 | 3c-warmup Live default /join phone  | 1 | 10/29/26, 8:32:49 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 114 | 3c-warm Live default /join phone 1 | 1 | 10/29/26, 8:33:03 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 115 | 3c-warm Live default /join phone 2 | 1 | 10/29/26, 8:33:17 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 116 | 3c-warm Live default /join phone 3 | 1 | 10/29/26, 8:33:31 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 117 | 3c-warm Live default /join phone 4 | 1 | 10/29/26, 8:33:45 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 118 | 3c-warm Live default /join phone 5 | 1 | 10/29/26, 8:33:59 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 119 | 3d Smoke blingkitchen home desktop  | 1 | 10/29/26, 8:34:12 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 120 | 3d Live blingkitchen home desktop  | 1 | 10/29/26, 8:34:27 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 121 | 3d Smoke blingkitchen /trade desktop  | 1 | 10/29/26, 8:34:39 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 122 | 3d Live blingkitchen /trade desktop  | 1 | 10/29/26, 8:34:49 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 123 | 3d Smoke blingkitchen /join desktop  | 1 | 10/29/26, 8:34:58 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 124 | 3d Live blingkitchen /join desktop  | 1 | 10/29/26, 8:35:08 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 125 | 3d Smoke blingkitchen /in-the-pantry desktop  | 1 | 10/29/26, 8:35:18 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 126 | 3d Live blingkitchen /in-the-pantry desktop  | 1 | 10/29/26, 8:35:28 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 127 | 3d Smoke milehighfizz home desktop  | 1 | 10/29/26, 8:35:38 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 128 | 3d Live milehighfizz home desktop  | 1 | 10/29/26, 8:35:47 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 129 | 3d Smoke milehighfizz /trade desktop  | 1 | 10/29/26, 8:35:58 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 130 | 3d Live milehighfizz /trade desktop  | 1 | 10/29/26, 8:36:07 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 131 | 3d Smoke milehighfizz /join desktop  | 1 | 10/29/26, 8:36:17 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 132 | 3d Live milehighfizz /join desktop  | 1 | 10/29/26, 8:36:26 PM EDT | 200 | HTTP response measured | 0 ms |  |
| 133 | 3d Smoke milehighfizz /in-the-pantry desktop  | 1 | 10/29/26, 8:36:36 PM EDT | 404 | HTTP response measured | 0 ms |  |
| 134 | 3d Live milehighfizz /in-the-pantry desktop  | 1 | 10/29/26, 8:36:44 PM EDT | 404 | HTTP response measured | 0 ms |  |
| 135 | 3e reps | 1 | 10/29/26, 8:36:53 PM EDT | 200 | API response measured | 0 ms |  |
| 136 | 3e live-shows | 1 | 10/29/26, 8:36:53 PM EDT | 200 | API response measured | 0 ms |  |
| 137 | 3e availability | 1 | 10/29/26, 8:36:53 PM EDT | 200 | API response measured | 0 ms |  |
| 138 | 3e availability-bare | 1 | 10/29/26, 8:36:54 PM EDT | 400 | API response measured | 0 ms |  |

## Method, safety and closeout

Isolated signed-out Chromium 153.0.8010.12, cached Playwright, no package installation. Browser plugin unavailable; personal Chrome was not used. Desktop 1440×900; **emulated** phone 390×844, 4× CPU, 150 ms latency, 1.6 Mbps down, cache off. Each page was measured before any motion-control interaction using the same native CLS/FCP/LCP and H1 frame probes as the prior 110 loads. CLS is maximum session-window CLS, excluding recent-input shifts; thresholds use unrounded numbers. First-paint style probes and screenshots support styling checks. No forced pauses or UI repair was applied.

No secrets, cookies, environment values or authenticated share URLs were saved. No forbidden SSR environment flag was set. Only the two approved review query parameters were used for theme/layout overrides. No app code changes, rebuild/redeploy, Live change, account sign-in, submission or database write. Source remains the existing preview application SHA; evidence-only commits go to codex/release-ssr-finder.

Actual Open Brain MCP capture succeeded: "Captured as observation — SSR, Finder Checks, Smoke Tests"; receipt is in `open-brain-closeout.json`. The requested [PR #166 result comment](https://github.com/louis623/sparkle-suite/pull/166#issuecomment-6512039605) is posted; receipt is in `pr-comment.json`. PR166 remains draft and unmerged. Vault evidence and the short session log are committed and pushed only to the release branch. No further application work is performed under this completed checks-only run.
