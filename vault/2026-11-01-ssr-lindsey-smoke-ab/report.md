# Lindsey Smoke A/B — revised 94-load report

**Complete.** The oversized pass was stopped at99 loads at Louis's request and was not resumed. Replacement: exactly52 works loads +42 speed loads, zero reruns, no tap-timing matrix, idle taps or desktop speed repeats.

- New SSR A: **13/13 rows PASS;26/26 device views PASS**, all observed CLS 0. Current B: **3/13 rows PASS;12/26 device views PASS**.
- All52 works loads: HTTP 200, correct milehighfizz path/SSR marker/theme; **zero page, console or hydration errors**. B has8 missing-control failures and6 CLS failures (0.187–0.299). No application fix was made.
- A is faster on **7/7 home medians**. These are three observed phone loads per cohort, not a guarantee of future load times.

| Row | New SSR A | Current B | B failure |
|---|---|---|---|
| Fall Owl / Home | PASS | FAIL | phone: Pause/Play control missing; desktop: Pause/Play control missing |
| Midnight Rose / Home | PASS | FAIL | phone: Pause/Play control missing; desktop: Pause/Play control missing |
| Rose Gold / Home | PASS | FAIL | phone: Pause/Play control missing; desktop: Pause/Play control missing |
| Gilded Autumn / Home | PASS | PASS | — |
| Gilded Autumn / Join | PASS | FAIL | phone: CLS 0.196 |
| Gilded Autumn / Dance Floor | PASS | FAIL | desktop: CLS 0.299 |
| Pumpkin Witch / Home | PASS | FAIL | desktop: CLS 0.187 |
| Pumpkin Witch / Join | PASS | FAIL | desktop: CLS 0.252 |
| Pumpkin Witch / Dance Floor | PASS | PASS | — |
| Amethyst / Home | PASS | PASS | — |
| Alpine Opal / Home | PASS | FAIL | phone: Pause/Play control missing; desktop: Pause/Play control missing |
| Alpine Opal / Join | PASS | FAIL | phone: CLS 0.240 |
| Alpine Opal / Dance Floor | PASS | FAIL | desktop: CLS 0.295 |

| Home theme | A median LCP | B median LCP |
|---|---:|---:|
| Fall Owl | 4.232 s | 12.152 s |
| Midnight Rose | 3.776 s | 11.964 s |
| Rose Gold | 3.724 s | 13.580 s |
| Gilded Autumn | 2.520 s | 12.492 s |
| Pumpkin Witch | 2.172 s | 13.284 s |
| Amethyst | 1.900 s | 12.812 s |
| Alpine Opal | 3.800 s | 12.380 s |

## Method and preserved state

Phone: 390×844,80ms latency,1.6Mbps down/750Kbps up,4×CPU; fresh context/cache disabled. Works: one load per row/cohort/device; native CLS through font readiness (bounded 5s) +2s, then one Pause click and one Play click on homes. Speed: three alternating fresh phone loads per home/cohort; native LCP through font readiness (bounded 5s) +5s; no wait for the window load event or video completion. Desktop works only: 1440×900,20ms/10Mbps/1×CPU. Early body-class diagnostics in raw data are informational and are not an added pass/fail gate under Louis's revised criteria.

- Exact application: 320951fc4e8dd08391d259630a2b8fc47f1e8305. CLI 65.9.0, whoami louis-2849; unchanged binding retry:RESULT: SMOKE BINDING OK, exit 0.
- A:dpl_3HV4hEooc71gMpZ633zhcwjkTvB5. B:dpl_x35TwSXW3M6rdR5hLtckQLtSuawm. Both retained. All earlier required 12-GET control sets passed.
- Alias before/rollback:dpl_2tsBNUCP3cFyvf9Au155cMTX3s51. Final sparkle-suite-smoke.vercel.app remains on **dpl_3HV4hEooc71gMpZ633zhcwjkTvB5 (A)**. B haszero aliases.
- Preset independently read back after the check: **halloween_pumpkin_witch / amethyst / zoom**. It was already original, so no database write was needed.
- Nothing on Live: no Live project/DB/key access, provider send/checkout, merge or Live deployment. No application code, committed harness/gates or project settings changed.

Evidence: [raw 94 loads](revised-94-results.json), [summary and samples](report.json), [CSV](results.csv), [preset read-back](preset-final-readback.json), [alias check](final-alias-check.json). Old partial evidence is retained separately and excluded from these medians.
