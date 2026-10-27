# SSR Chunk 1 — Pass 3, October 27, 2026

Louis: the garbled text is repaired. Show times use the visitor's zone before hydration, the saved still hero stays still and silent, and template changes appear on the next render. The page now waits at most **50 ms after the fresh template is ready** for the parallel page-data reads; anything unfinished loads in the browser.

This pass is **not ready for release**. Tap latency failed. The complete parity claim also failed verification. The measured speed medians passed, with a disclosed host-contention limitation. Work stopped after the one measurement round: no subsequent fixes, measurements or deployments.

## Deployments and provenance

- [ON preview](https://sparkle-suite-smoke-6vbqvxhoy-louis-2849s-projects.vercel.app/dudesfizzfest): dpl_BQf77goaaYrAyJDMGvwj6KWqhTxs.
- [OFF / empty allowlist preview](https://sparkle-suite-smoke-nprho5x5b-louis-2849s-projects.vercel.app/dudesfizzfest): dpl_HshDECTPjwevxWE1F7PbSnZGaycW.
- Both are Git-sourced builds of **f5adfbb05409774a5c760d5055adcaabe6ec05f6**, branch codex/ssr-chunk1-fizzfest-home, in preview project **prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ**. This pass has one commit over parent 6f1459c0; its final amendment adds vault evidence only. The tested application, tests, harness and normalizer remain identical to f5adfbb0. No redeployment follows the amendment.
- The approved Live data connection was supplied through deployment-only overrides. Live, apex and Smoke aliases were verified unchanged. Project configuration and environment key metadata were identical before/after. No manual alias changes, database writes, form submissions, signup or favorite actions occurred. All browser non-GET/HEAD requests were blocked.
- [Every environment variable, names only](environment-variable-names.md): **175 environment keys and 175 build keys on each deployment**. The seven deployment override names were NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, REP_RENDER_V2_SLUGS, SSR_PREVIEW_PROBE_SECRET, SPARKLE_RELEASE_BRANCH, SPARKLE_RELEASE_REPOSITORY. Values and credentials are excluded from this vault.
- [PR description draft](pr-description-draft.md) explicitly names the standalone **PR #154 revert, 8827f151ed4f8bf339de28740a4e0b792aecd11d**. PR #156 was not continued or merged.

## Acceptance

| # | Check | Result | Evidence / numbers |
|---|---|---|---|
| 1 | Zero garbled sequences; 390/1440 Eastern/Pacific screenshots | PASS | 0 in private source, compiled artifact, served JS and all 120 response HTML samples. Raw and Unicode-escaped regression cases covered. Four visual configurations saved below. |
| 2 | Everything except /dudesfizzfest homepage matches Live using permitted normalization | **FAIL** | **152/158** comparisons matched. 35/35 slug routes, 21/21 like-for-like custom-domain renderer routes, 56/56 skin routes, 11/11 community previews, 5/5 frozen images. Six comparisons failed; details below. |
| 3 | Forced-error fallback hash equals OFF | PASS | Both HTTP 200, SSR absent. Identical raw SHA-256 **7b2ba1da9351df549418fd2d1a66d223b7035684ad899884fdc022d148f1a271**. |
| 4 | Alternating response times; median delta ≤100 ms, p90 delta ≤250 ms, fallback ≤1% | PASS | **60 ON + 60 OFF**. ON median **565.4 ms**, OFF **528.9 ms**, delta **+36.5 ms**. ON p90 **704.0 ms**, OFF **654.6 ms**, delta **+49.4 ms**. Full-page fallback **0/60 (0%)**. |
| 5 | Phone LCP ≤2.5 s, desktop <1.5 s, CLS ≤0.05 | PASS* | Ten runs each. Phone median **2.190 s**, desktop **1.298 s**. CLS median/max **0/0** in both cohorts. *Host-contention caveat below; these are observed medians, not a clean controlled certification.* |
| 6 | Event Timing taps max ≤200 ms including hydration | **FAIL** | **140 attempts**. Desktop max **592 ms**, phone **968 ms**. **65/140** attempts had an Event Timing entry >200 ms; one desktop Shop attempt lacked a click/entry. Hydration coverage was incomplete and QA observer errors occurred; details below. |
| 7 | Pacific pre-hydration screenshot has no Eastern time; final correct PDT; CLS ≤0.05 | PASS | Both sizes showed **5:00 PM PDT / 5:00 AM PDT** before hydration and afterward, no EDT; CLS **0**. Pre-hydration markers were unset. Missing-browser-zone labelled fallback also passed isolated tests. |
| 8 | Next-render saved-setting test without Live writes | PASS | Automated mocked loader changes the setting between successive renders; **2 reads**, second render gets changed setting. Template cache removed. No Live writes. |
| 9 | Full suite: zero new failing names vs base | PASS | Base 8827f151: **5,589 pass / 52 fail / 5 skip**, 5,646 total. Candidate: **5,621 pass / 51 fail / 6 skip**, 5,678 total. **0 new failing names**. TypeScript and guarded prebuild pass. |
| 10 | Saved still, no sound, one H1, zero hydration errors | PASS | All 20 performance navigations: saved still, Play animation, paused, time 0, muted, 0 playing audio; exactly **1 H1**. **0 React hydration/#418/#423/#425 errors** across 164 preview browser navigations. Twenty QA-injected observer errors are disclosed separately. |

## Exact measurement settings

Clean headless Chromium contexts, touch enabled, en-US locale, browser cache disabled, separate fresh context per navigation. Desktop **1440 × 1200**, CPU 1×, no network throttle. Phone **390 × 900**, CPU **4× slowdown**, download **200,000 bytes/s**, upload **93,750 bytes/s**, latency **150 ms**. Performance/input zone: America/New_York. Separate screenshots: America/New_York and America/Los_Angeles. Ten LCP runs per profile. HTTP cohort: 60 alternating pairs, after warmup. No samples were discarded.

Input windows were 0/100/200/500/1000/2000 ms after first contentful paint, five attempts per control/profile/window, plus five attempts targeted at hydration for each control/profile. The metric is **PerformanceEventTiming.duration**, including pointer and click entries; dispatch-time differences were not used. Shop navigation was prevented so only native click handling and paint were measured. The saved Live header has no separate menu toggle and the still hero exposes Play animation; no extra controls were added.

## Failures and verification limitations

**Parity:** Four actual custom-domain homepages contain a google-site-verification meta tag absent from the preview's internal customer-site renderer: theblingkitchen.com, brisglowtique.com, brittwithbling.com and sparklybutterflies.com. Those bytes cannot be stripped under the allowed normalizations. All 21 like-for-like internal domain-renderer comparisons matched, but actual-host parity is not certified. Marketing root and /portfolio also failed: the committed normalizer misses Next 16 opaque/non-hex chunk hashes (for example 0n8bbz5plj2v~.css versus 0v.fajp3r5_lf.css). The script was not changed after measurement, and no stronger parity claim is made. Inventory was the same-day existing 12 real slugs / 7 domains; no database inventory query or write was performed in this pass.

The public /amethyst/homepage.jsx and three encoded variants matched Live **raw bytes and ETag** (W/"55be92b32870a75a6a96f6f9d4dbf180"). Landing demo, demo redirect and chasing-unicorns matched. The private v2 source stays outside public/; compiled JS is the allowlisted path's runtime. The normalizer is committed at scripts/qa/normalize-rep-response.cjs and leaves content, tenant paths and whitespace intact except the GA insertion newline.

**Input:** Desktop Shop max 592 ms (15 attempts >200), Play/Pause max 472 ms (11 >200). Phone Shop max 968 ms (19 >200), Play/Pause max 664 ms (20 >200). Event Timing records show main-thread scheduling/presentation delays around hydration, so the inline handler alone does not satisfy the 200 ms requirement. Targeted hydration overlaps were desktop Shop 4/5, Play 3/5; phone Shop 3/5, Play 0/5. No claim is made that every hydration window was covered.

The QA script's hydration-targeted phase lacks the qaFirstPaint binding invoked by its FCP observer, yielding **20 “window.qaFirstPaint is not a function” errors**. Event Timing and touch records still exist, but this weakens the input verification. There was one missing desktop Shop click/entry. Application React hydration errors were zero; this is not a claim of zero console errors. Blocked non-read requests and existing third-party/embed failures also produce resource/console errors. The QA observer bug was not repaired after measurement.

**Host contention:** Report-image processing was mistakenly started before the round ended and overlapped the first phone navigation, beginning 2026-10-27T16:27:50.585Z; the last image write was 16:28:00.185Z, about **9.6 s** later. It may also have affected late desktop input samples. This should have waited. Processing was stopped; all ten runs were retained and none rerun. Phone LCPs in ms: **5524, 3692, 9276, 1768, 2000, 1760, 1936, 2032, 2348, 2392**. Desktop: **4088, 1224, 1360, 1212, 1256, 1340, 1396, 1716, 1256, 1148**. Thus the threshold medians pass in this observed cohort, while a clean controlled confirmation remains open for a future authorized pass.

In raw browser rows, the numeric origin field is performance.timeOrigin (an instrumentation naming collision), not the URL. Cohort order, SSR markers, navigation records and screenshot filenames establish origin attribution. The offline summary accounts for this; the tested harness was not changed afterward.

## Changes and validation

The v2 file was reconstructed from **b9d707d081ec4290ecb24372a39f1591e7fa6b25:public/amethyst/homepage.jsx** with raw git stdout, then UTF-8 logic edits; no PowerShell text conversion. Protected with lib/amethyst/v2/** -text. Rebuilt compiled/homepage.js. Added raw/escaped garbling tests, pre-paint local-time placeholders/fill, early-motion handoff preservation, a **50 ms** data budget, deferred browser data completion and next-render cache regression. Removed the 15-second template cache and portable branch bypass. Restored the original template assertion. Existing parallel data reads remain; lineup is never cached. The 50 ms budget starts after the fresh template, not before it, so it does not guarantee total TTFB.

Partial page-data deferral was **14/60 ON responses (23.3%)**; this is browser completion of late data, distinct from full-page legacy fallback (**0%**). Successful reads are retained. Deferred visibility is local state and never invokes the editor save path.

Full suite comparison ran on the same Linux Node 22.16.0 runtime, installed locked dependencies, and no database/provider credentials. Base: 711 files; candidate: 718 files. One old asset test no longer failed, without an asset change; existing failures remain and are listed by name in [full-suite-comparison.json](full-suite-comparison.json). **112 focused tests**, TypeScript and guarded prebuild passed. Twelve isolated browser cases covered full/deferred data, Eastern/Pacific/missing zone and early motion taps with no label reset or hydration errors. Seventy deployed Play/Pause records also show no repeated Play label after the click.

Exact implementation file list: [files-changed.txt](files-changed.txt). Major files: lib/amethyst/v2/homepage.jsx; public/amethyst/compiled/homepage.js; homepage-bootstrap-response.ts; homepage-data-budget.ts; homepage-first-paint.ts; homepage-local-time.ts; public-asset-response.ts; removed homepage-template-cache.ts; .gitattributes; active-branch config/guard/register; focused tests; committed input QA and response normalizer. Evidence-only final additions are confined to this vault folder.

## Screenshots and raw evidence

| View / browser zone | Live vs preview | Before vs after hydration | Event-time detail |
|---|---|---|---|
| 390 / Eastern | [side by side](live-comparison-phone-New_York.jpg) | [side by side](hydration-comparison-phone-New_York.jpg) | [event crop](events-hydration-comparison-phone-New_York.jpg) |
| 390 / Pacific | [side by side](live-comparison-phone-Los_Angeles.jpg) | [side by side](hydration-comparison-phone-Los_Angeles.jpg) | [event crop](events-hydration-comparison-phone-Los_Angeles.jpg) |
| 1440 / Eastern | [side by side](live-comparison-desktop-New_York.jpg) | [side by side](hydration-comparison-desktop-New_York.jpg) | [event crop](events-hydration-comparison-desktop-New_York.jpg) |
| 1440 / Pacific | [side by side](live-comparison-desktop-Los_Angeles.jpg) | [side by side](hydration-comparison-desktop-Los_Angeles.jpg) | [event crop](events-hydration-comparison-desktop-Los_Angeles.jpg) |

Twelve full-resolution original PNGs are beside this report. Existing images were inspected: styled hero/header and show punctuation are intact; Pacific event crops show PDT before/after. Header DOM is identical to Live in all four visual configurations. Moving ticker positions differ because captures occur at different animation times, so pixel-for-pixel screenshot identity is not claimed.

[Raw round](results.json), [summary](summary.json), [measurement caveats](measurement-notes.json), [provenance](provenance.json), [predeployment validation](predeployment.md), [full-data browser cases](local-browser.json), [deferred-data browser cases](local-deferred-browser.json). No fixes or extra measurements followed these findings. Candidate ideas for a later chunk are limited to investigating hydration input blocking, repairing the QA observer/coverage and extending allowed hash recognition; none was implemented here.
