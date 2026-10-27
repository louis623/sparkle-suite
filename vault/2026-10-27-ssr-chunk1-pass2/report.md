# SSR Chunk 1, Pass 2 — stopped after one measurement round

Louis: the demo loads much faster, keeps your original header and saved still hero, and shows the correct viewer time zone after hydration. It is **not ready to ship**. Early phone taps are slow, the first phone frame has an empty hero, and the moved v2 source introduced garbled punctuation. Strict byte-parity and fallback-to-Live checks also fail. Nothing was fixed after measurement, and no further deployment was made.

## Deployment and scope

- Application commit: `fd013765658ae26fede0a8a95bb1c66f01d50819`, branch `codex/ssr-chunk1-fizzfest-home`, repository `louis623/sparkle-suite`.
- [SSR preview](https://sparkle-suite-smoke-okwp813nm-louis-2849s-projects.vercel.app/dudesfizzfest): `dpl_DLFp9TpR6AYPUrkeUh2WuBFBFR3G`.
- [Empty-allowlist preview](https://sparkle-suite-smoke-atb55a972-louis-2849s-projects.vercel.app/dudesfizzfest): `dpl_B86CVEHpXhkCrA6aW8oNyUNTU43r`.
- Both READY deployments came from the same Git source/SHA in preview project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`. No source upload, production deployment, promotion, manual alias command, project-setting change, project-environment change, or database write. Vercel automatically generated the branch preview alias; the second preview became its latest deployment. Use the immutable URLs above.
- Existing Vercel Authentication was retained. Existing Live data connection variables were supplied only to these two deployments, as approved. The existing preview project's analytics configuration was not changed.
- Both Live domains still resolve to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P` / `3f175871`. The existing Smoke address still resolves to `dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z` / `22ba7df6`. Non-secret project/configuration metadata matched before and after.
- Signup, favorites, analytics behavior and TikTok fixes were excluded. Browser checks blocked application non-GET/HEAD requests. No signup or favorite was submitted.

## Exact measurement settings

One deployed round, Chrome headless, fresh browser context per navigation, cache disabled, locale `en-US`. Phone: **390×900**, mobile/touch, **4× CPU**, **200,000 bytes/s download**, **93,750 bytes/s upload**, **150 ms latency**. Desktop: **1440×1200**, touch enabled, **1× CPU**, no network throttle. The desktop height keeps the original motion control in view.

Five performance navigations per profile and origin in `America/New_York`; medians below use those preselected cohorts. One additional visual navigation per profile/origin in `America/Los_Angeles`. The extra Pacific phone preview screenshot run recorded LCP **3.428 s**; it is not part of the five-run performance cohort and is not evidence that every phone load is below 2.5 s.

Inputs: one native CDP touch per fresh navigation, each requested control at **0/100/200/500/1000/2000 ms after FCP**, five repetitions per slot: **120 attempts**, all registered. Response latency includes the whole dispatch-to-paint interval (`timeOrigin + painted - dispatch epoch`), not just click-handler time. Event Timing entries were also retained. Shop navigation was prevented for timing, so this does not certify its destination load. Original Live has no Sound or menu toggle; none was added.

The FCP callback was late on the throttled phone: **30/120 dispatches were over 200 ms late**, maximum **725.9 ms**. Thus every planned slot was attempted, but the earliest real-time windows were **not fully covered**. The harness correction to fresh navigation per tap was insufficient to establish the requested early-window guarantee. This limitation is a failure, not a skipped/pass result.

## Acceptance results

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 1 | Slow-phone LCP ≤2.5 s | PASS | Median **2.000 s**, n=5; Live **13.316 s**. |
| 2 | Desktop LCP <2 s | PASS | Median **1.452 s**, n=5; Live **3.172 s**. |
| 3 | Every tap ≤200 ms; full early coverage | FAIL | Desktop max **178.8 ms**. Phone max **760.3 ms**; **23/60** phone taps >200 ms. Thirty dispatches >200 ms late. Worst phone slot medians: Shop/FCP **572.4 ms**, Play/+100 ms **521.3 ms**. |
| 4 | CLS ≤0.05 | PASS | **0.000** median and maximum for both preview performance cohorts, n=5 each. Live medians 0.02363 desktop / 0.02584 phone. |
| 5 | Styled, nonblank first content frame | FAIL | Desktop first content is complete. Phone frame at **2.024 s FCP** has styled header but empty hero; hero LCP paints at **2.344 s**, a **320 ms** gap. Ordinary pre-navigation blank frames are not counted as the failure. |
| 6 | Visually identical at 390/1440, Eastern/Pacific | FAIL | All **4** show-time/header comparisons match: e.g. **8 PM EDT / 5 PM PDT**. Full screenshots expose garbled dash characters in discount rows and reveal copy in v2. Moving ticker phase also differs between independent captures. |
| 7 | Original header, one H1 | PASS | Header DOM matches in **4/4** width/zone comparisons; **1 H1** in each. |
| 8 | Saved hero motion matches Live | PASS | Saved **still**, **Play animation**, `aria-pressed=false`, video paused at **0 s**, in all **12** completed preview performance/visual navigations. All **60** Play taps changed the label/state to Pause. |
| 9 | No hydration errors; console no worse than Live | PASS | **132/132** preview navigations kept SSR and the original hero node; **0** page errors and **0** hydration/#418/#423/#425 errors. Desktop's **4** distinct console message types also occur on Live (TikTok/CSP/403/policy); **0** new types. Phone performance cohorts had 0 console errors. |
| 10 | No development React/Babel | PASS | **0** development React/Babel script requests on the enabled preview. Production React bundle used. Live still requests both old scripts. |
| 11 | All other reps/custom domains home/trade/join byte-identical | FAIL | **3/33** slug responses match, all matching reviewer 404s; **30** differ. **0/21** custom-domain probes match: the forwarded-host probe reaches preview root/404 routes, so actual custom-domain parity is unproven. Complete roster: 12 slugs including the allowlisted demo, 7 custom domains. |
| 12 | Skin/landing/community/portfolio/chasing/source parity | FAIL | **4/74** text responses match: public JSX plus **3 encoded variants**, all HTTP 200 with the same ETag. **56** skin, **11** community, landing and chasing responses differ first at embedded CSP origin; portfolio differs at deployment ID. Separately, **5/5 gnome images** return 200 with identical bytes/ETags. www→apex regression test passes. |
| 13 | Full suite: no new failures vs 8827f151 | PASS | **0 new failures** by file/test identity, including file initialization. Baseline **5,588 pass / 54 fail / 4 skip**; candidate **5,618 / 48 / 5**. TypeScript and prebuild passed. |
| 14 | Deployed allowlist removal restores today's page | FAIL | Actual second deployment has empty allowlist: HTTP **200**, SSR absent. Its SHA-256 differs from Live. Functional return to legacy works; exact-Live requirement fails. |
| 15 | Deployed forced render failure restores today's page | FAIL | Protected failure header on enabled preview returns HTTP **200**, SSR absent; bytes exactly equal the empty-allowlist deployment, but differ from Live. |
| 16 | Metadata/shop/location unchanged | PASS | Title, description, canonical, JSON-LD including location, and shop name match in **4/4** width/zone comparisons. Shop: **Fizz Festival**. |
| 17 | Warm TTFB close to Live; report both | FAIL | Five warm requests after warm-up: preview median **1.143 s**, Live **0.346 s** — **3.30×**, **+796 ms**. R7's close-to-Live goal is not met. |

## Failure evidence and limits

**Phone input:** native Event Timing also reached **656 ms**. The worst recorded taps overlap hydration; the 760 ms sample hydrated at approximately 3.154 s and painted its Pause state at 3.333 s. The page-thread FCP notification arrived late, so no claim is made about successful taps in the missed early windows. Complete five-run slot medians are in `input-slots.md`.

**First frame:** the phone LCP image resource loaded at approximately 1.990 s but painted at 2.344 s; hydration was later, at 3.131 s. This shows an image/paint gap before hydration; no more specific cause was established in this pass.

**Visual encoding:** the moved `lib/amethyst/v2/homepage.jsx` contains eight occurrences of misdecoded dash-prefix text; the pinned Live source and Pass 1 source contain zero. The screenshots show the resulting garbled characters. This is a Pass 2 regression caught by visual review after measurement. It was deliberately left unfixed under the stop rule.

**Strict hashes:** no origin, deployment-ID, or analytics normalization was used. Non-listed slug differences begin at an extra `sparkle-rep-ga4` snippet. Existing `rep-ga4-tag.ts` uses the preview smoke measurement ID on Vercel hosts while excluding platform hosts. Skin/community/landing/chasing HTML embeds the current origin in its CSP; `/portfolio` embeds its deployment ID. These host/build-dependent differences prevent exact raw-byte certification on these URLs. The forwarded-host custom-domain probe did not exercise the intended custom-domain routes; it is an evidence gap, not proof that Live custom domains regressed. Analytics and routing were not altered after measurement.

Both legacy fallback hashes are `7b2ba1da9351df549418fd2d1a66d223b7035684ad899884fdc022d148f1a271`; Live is `90a4774b0e1f240051604c8d22230abcaff1de29bdfd923546411ab2980bcf79`. The existing preview GA policy is a likely explanation, consistent with the non-listed responses, but fallback bodies were not separately saved for a byte-offset diagnosis. No extra request round was run to investigate.

Warm TTFB remains slower despite parallel data reads and a 15-second template-only cache. The round did not isolate database, rendering, or preview-authentication time; lineup state is never cached.

## Full tests and changed files

Full Suite Vitest runs used the same installed dependencies, one worker, and no file exclusion: baseline **711 files / 5,646 tests**, candidate **716 files / 5,671 tests**. All 48 candidate failures were already failing by name on the baseline. The additional skip is the environment-dependent Live parity test; its deployed HTTP checks ran in this round and failed as reported. Baseline/candidate failure names are in `full-suite-comparison.json`. Four additional isolated hydration/time-zone/early-intent browser cases passed before deployment. Final TypeScript had no errors; prebuild included all 11 layout-lock checks.

Changed areas: v2 JSX moved outside public; public JSX restored; source route/proxy removed; saved-zone-to-viewer-zone state transition; saved still motion; parallel bootstrap and template-only cache; allowlist normalization/data status check; preview-only failure probe; frozen shared-image resolution; build entry; portable preview branch guard; tests and QA harness. Exact paths: [files-changed.txt](files-changed.txt). No signup, favorites, analytics, TikTok, font, poster, or database changes.

## Review artifacts

- [Raw measurements/hashes](results.json), [summary](summary.json), [provenance](provenance.json), [full-suite comparison](full-suite-comparison.json).
- [Desktop Eastern](side-by-side-desktop-New_York.jpg), [Desktop Pacific](side-by-side-desktop-Los_Angeles.jpg).
- [Phone Eastern](side-by-side-slow-phone-New_York.jpg), [Phone Pacific](side-by-side-slow-phone-Los_Angeles.jpg).
- [Desktop filmstrip](filmstrip-desktop.jpg), [Phone filmstrip](filmstrip-slow-phone.jpg).
- [Desktop event/copy detail](shows-about-desktop-New_York.jpg), [Phone Pacific event/copy detail](shows-about-slow-phone-Los_Angeles.jpg).

Next chunk only: repair v2 text encoding; make early input scheduling independent of the busy page thread and verify real Shop navigation; investigate hydration/input work and initial mobile image paint; establish an approved custom-host/raw-byte comparison method; investigate the remaining server latency. No new feature work was added.
