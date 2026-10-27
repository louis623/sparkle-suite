# SSR Chunk 1 — Pass 5, October 27, 2026

**The count/height fixes work, but the desktop empty-case swap fails CLS: 0.13693707 versus<0.01.** The other three count cases and all six real-data sanity loads pass. No post-round fixes or deployments were made.

One fix: after late page data arrives, the events section uses the loaded array's visibility/count. Empty data removes the entire section and heading; populated data renders its exact count without retained empty slots or a two-card cap. The fixed42rem height/overflow apply only while data is pending; loaded cards return to their normal layout. The on-time path remains unchanged.

## Requested checks

| Step | Result | Evidence |
|---|---|---|
| 1. Unit transitions | PASS | Four new tests passed, including late0/1/3 events in the same evaluated production module, removal of reservations/fixed height, and preservation of the on-time view. Nine focused tests passed including the five existing deferred-data guards. |
| 2. Full suite once versus8827f151 | PASS | 5629 pass / 52 fail / 6 skip; 5687 tests, 720 files. **0 new failing names** versus8827f151. Full run18.96min. Known flaky monogram rerun: once; 1 passed, 0 failed. |
| 3. One Smoke-data preview | PASS | One Git deployment in prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ; Smoke bindings only; existing5s delay and approved in-memory Pumpkin Cat override. No saved data/settings changes. |
| 4. Empty/one-event deployed cases | FAIL | Four cases: zero and one event at1440and390px. Maximum swap CLS **0.13693707**, required<0.01. False “Dancers will appear here” copies **0**. Per-case counts/gaps below. |
| 5. Three desktop + three phone sanity loads | PASS | Six real-response loads; maximum desktop CLS **0.00005498**, phone **0.00000000**, required≤0.05. Styled first paint, exactly oneH1 and zero hydration errors are checked in every load. |

All existing failures are retained in [full-suite-comparison.json](full-suite-comparison.json); this is a zero-new-failures gate, not an all-green full suite. TypeScript and guarded production prebuild passed. The only permitted rerun was the known BlingwithKrissiG monogram test if it failed; no full-suite rerun. The complete testing window, bounded from initial patch creation before the first test through the final browser result, was **30.4min**, below one hour.

The desktop-empty case's overall CLS was also0.13693707. Step5's CLS numbers refer specifically to the six unfiltered real-data sanity loads, not to that failing fixture case.

## Deployed cases

| Profile | Loaded events | Section present | Cards | Reservations | Remaining events area | Natural card heights | Swap CLS | Result |
|---|---|---|---|---|---|---|---|---|
| desktop | 0 | false | 0 | 0 | 0px | — | 0.13693707 | FAIL |
| desktop | 1 | true | 1 | 0 | 962.265625px | 474.328125px | 0.00005498 | PASS |
| phone | 0 | false | 0 | 0 | 0px | — | 0.00000000 | PASS |
| phone | 1 | true | 1 | 0 | 1008.15625px | 557.984375px | 0.00000000 | PASS |

For the empty case, the entire section including “Mark your calendar” is absent, so no residual calendar area remains; the measured reservation/gap is0px rather than a hidden oversized box. The one-event case has one real card, no empty slot and no fixed height/min-height/overflow inline style. The three-event unit case verifies there is no front-end two-event cap.

**Failure evidence:** desktop-empty removes a1159.9375px section, and document height drops from5363px to4203px. The observed CLS coincides with that collapse, pointing to following content moving upward into view. The phone-empty case also removes its section but records zero CLS. No additional attribution trace or investigation was run after this light round. [Desktop empty before/after viewport](desktop-empty-viewport.jpg).

The deployed empty/one cases use **the actual Smoke completion response**, filtered only in the test browser to a zero/one-event subset with corresponding visibility/count/calendar-link fields. The initial server response and existing delay path are real deployed code. No database rows, saved shows or server settings were altered, and no count-fixture feature was added to the application. The six sanity loads use the real unmodified Smoke response.

## Preview, commit and settings

[Preview homepage](https://sparkle-suite-smoke-34g65ne2x-louis-2849s-projects.vercel.app/dudesfizzfest) — **dpl_HqUE7kiDatd9EiYWWfpSxt1u4NTd**.

Branch codex/ssr-chunk1-fizzfest-home. Tested application commit **285d282ad5f40d6a1c7bb62445c2158936ac8762**, parent **376d2be392f8347738fccd991cb0ce2f3ea7cdab**. One new pass-5 commit; its final amendment adds only vault evidence, with application/tests/harness unchanged from the deployed SHA. No deployment follows that evidence amendment.

Desktop **1440×1200**, CPU1×, no network throttle. Phone **390×900**, CPU4× slowdown, download200,000bytes/s, upload93,750bytes/s,150ms latency. Fresh headless Chromium contexts, disabled cache, en-US, America/New_York. Four fixture cases plus three desktop/three phone sanity loads, one round only. No tap tests, other-rep/custom-domain comparisons, large timing cohorts or form submissions. Every non-GET/HEAD browser request was blocked.

Existing deployment-only SSR_PREVIEW_PAGE_DATA_DELAY_MS adds5s; SSR_PREVIEW_THEME_OVERRIDE reuses Louis's approved in-memory Pumpkin Cat presentation because Smoke is saved as Sunset Beach. These existing flags and the saved Smoke data were not changed in application code. All application credentials come from Smoke; other inherited provider/cron/integration credentials are empty deployment overrides. [Environment-variable names only](environment-variable-names.md).

Project settings/environment metadata were identical before/after. Live, Smoke alias and the protected deployment IDs remain unchanged. No Live keys, database writes, signup/favorite or other form submission. No post-round fixes, reruns or deployments. **STOPPED.**

## Evidence

[Raw ten-load results](browser-results.json), [summary](summary.json), [test comparison](full-suite-comparison.json), [deployment receipt](deployment.json), [implementation files](files-changed.txt).

- Empty: [desktop pending](cases-desktop-empty-pending.png) / [loaded](cases-desktop-empty-loaded.png); [phone pending](cases-phone-empty-pending.png) / [loaded](cases-phone-empty-loaded.png).
- One event: [desktop pending](cases-desktop-one-pending.png) / [loaded](cases-desktop-one-loaded.png); [phone pending](cases-phone-one-pending.png) / [loaded](cases-phone-one-loaded.png).
- Real Smoke data: [desktop](sanity-desktop-0-loaded.png), [phone](sanity-phone-0-loaded.png).

This light round does not certify LCP, tap latency or broad page parity. No extra testing was added to those areas.
