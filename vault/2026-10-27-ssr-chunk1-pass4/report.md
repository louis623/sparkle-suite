# SSR Chunk 1 — Pass 4, October 27, 2026

The deferred-placeholder fix works in this light round: no false empty messages, no layout movement when the data arrives, correct EDT times, one H1 and no hydration errors. This is **not a release-ready claim**. The full suite has one reappearing old asset failure compared with pass 3, and incidental desktop first-paint observations were slow. No unrelated fixes or further deployments were made.

## Job 1 — housekeeping completed first

Each command used Vercel CLI 59.25.4, the exact deployment ID and --yes. The first public preview was removed first. Every command confirmed “Success! Removed 1 deployment.”

| Order | Deployment | Project | Result |
|---|---|---|---|
| 1 | dpl_Czyd9FXC4VJ2ykGSCHB78KMmvUt4 | sparkle-suite | REMOVED |
| 2 | dpl_DLFp9TpR6AYPUrkeUh2WuBFBFR3G | sparkle-suite-smoke | REMOVED |
| 3 | dpl_B86CVEHpXhkCrA6aW8oNyUNTU43r | sparkle-suite-smoke | REMOVED |
| 4 | dpl_BQf77goaaYrAyJDMGvwj6KWqhTxs | sparkle-suite-smoke | REMOVED |
| 5 | dpl_HshDECTPjwevxWE1F7PbSnZGaycW | sparkle-suite-smoke | REMOVED |

After removal, and again after pass 4, **yoursparklesuite.com returned HTTP 200** (redirecting to www) and **sparkle-suite-smoke.vercel.app returned HTTP 200**. Live remains dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P / 3f175871. Smoke remains dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z / 22ba7df6. Protected dpl_FR1uJtcKBdNkrMZJLEG6nsriufKn is still READY. No other deployment was removed; no manual alias, project environment or project settings changes.

## Job 2 — results, then STOP

| Step | Result | Evidence |
|---|---|---|
| 1. Deferred versus loaded-empty unit test | PASS | All **5 new regression tests passed**, including real SSR markup: missing data produces neutral slots; loaded-empty listings produce the original empty copy. Loaded-empty events retain the existing hidden-calendar behavior. Guard tests prove the delay/theme flags cannot enable on production or another rep. |
| 2. Full suite once; zero new failing names | **FAIL versus immediate parent; PASS versus original 8827f151 baseline** | **5,625 pass / 52 fail / 6 skip**, 5,683 total, 719 files. Parent 9dbbd229: 5,621 / 51 / 6, 5,678 total. One old asset failure reappeared. Original 8827f151: 5,589 / 52 / 5, 5,646 total; **0 new failing names** against that originally agreed baseline. Both comparisons are preserved. |
| 3. One Smoke-data preview | PASS | One Git-sourced deployment, **dpl_9GjHdFfQRh8KzTggV3EF8E4r9ktr**, preview project prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ. No Live data/keys used. No second deployment. |
| 4. Five delayed loads without false empty copy | PASS | **5/5** loads returned x-sparkle-page-data: deferred with SSR markers. **0** “Dancers will appear here” or empty-calendar messages while pending. Mutation observations covered the pending interval. Reserved geometry was unchanged in all **11/11** round loads. |
| 5. Three desktop / three slow-phone sanity runs | PASS for requested checks | **3/3 desktop + 3/3 phone**: HTTP 200, styled first paint, correct EDT times, exactly **1 H1**, **0 hydration errors**. Desktop CLS **0.00005498** each; phone CLS **0** each, all below 0.05. |

The reappearing failure is **tests/fall-owl-share-card.test.ts — “BlingwithKrissiG monogram ships the path-drawn mark as a PNG raster of the vector source.”** It is already in the 8827f151 failure inventory. No artwork or asset files changed in this pass, and it was not rerun or repaired. Its runner output reports STACK_TRACE_ERROR; a cause was not isolated within this scope. Initialization failures were compared using the same [initialization] label as the baseline, not omitted.

The full suite ran **once, 17.84 minutes**, with no database/provider credentials in the test environment. All five new tests were included in that run. TypeScript, focused tests and the guarded production asset prebuild passed. The full-suite baseline counts and failing names are in [full-suite-comparison.json](full-suite-comparison.json). The test window, bounded from initial patch creation before the first test through the last browser result, was **30.4 minutes**, below one hour.

## Preview and exact settings

[Preview homepage](https://sparkle-suite-smoke-cixlj4pu1-louis-2849s-projects.vercel.app/dudesfizzfest)

Branch: **codex/ssr-chunk1-fizzfest-home**. Tested deployment commit: **f19488407063b2220193163c7f46b30248d8a922**, parent **9dbbd2296e3161523090277465c34fca8f556b19**. There is one new pass-4 commit. Its final amendment adds only this vault evidence; application/tests/QA bytes remain identical to the tested SHA. There is no deployment after that amendment.

The deployment-only **SSR_PREVIEW_PAGE_DATA_DELAY_MS** flag adds **5 seconds** to the optional page-data reads and the browser completion endpoint. The normal 50 ms server budget remains. The flag requires the preview environment, exact preview-project ID and dudesfizzfest identity. Smoke is saved as Sunset Beach; Louis explicitly approved **SSR_PREVIEW_THEME_OVERRIDE** to select Pumpkin Cat in memory so the existing SSR renderer can exercise these Smoke reads. Saved settings and content were never changed.

Desktop: **1440×1200**, CPU 1×, unthrottled network. Phone: **390×900**, CPU **4× slowdown**, download **200,000 bytes/s**, upload **93,750 bytes/s**, latency **150 ms**. Fresh headless Chromium contexts, cache disabled, en-US locale, America/New_York zone. Five deferred desktop loads plus three desktop and three phone sanity loads; no taps, other-rep/custom-domain comparisons, large timing sets or forms. All browser non-GET/HEAD requests were blocked.

Smoke’s existing shows were **Tuesday Oct 27, 8:00 PM EDT** and **Saturday Oct 31, 7:00 PM EDT**, correct on all final captures. No test data was seeded. The only application credentials retained were **NEXT_PUBLIC_SUPABASE_ANON_KEY** and **SUPABASE_SERVICE_ROLE_KEY**, both read from Smoke’s preview project. **NEXT_PUBLIC_SUPABASE_URL** is also Smoke’s binding. No Live project values were retrieved for this deployment.

All other inherited project-defined credentials were blanked through deployment-only overrides, including **CRON_SECRET, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, OPENAI_API_KEY, CONTROL_CENTER_SESSION_SECRET, CARD_QR_APPROVAL_SECRET, GA4_READER_SERVICE_ACCOUNT_JSON, PUBLIC_SITE_VISIT_SALT, REMY_MCP_BEARER_TOKEN, SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN, SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN, SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN**. No SMS credential is bound; the pre-show SMS/email flags are blanked. These names are listed as empty, not as active credentials.

Vercel-provided credential/encrypted-environment names include **VERCEL_AUTOMATION_BYPASS_SECRET, VERCEL_DEPLOYMENT_KEY, VERCEL_HASH_SALT, VERCEL_OIDC_TOKEN, VERCEL_ENV_ENC_KEY, VERCEL_ENCRYPTED_ENV_CONTENT, VERCEL_ENCRYPTED_ENV_FILENAME**. No values are recorded. [Every deployment/build environment name and state](environment-variable-names.md) is saved: **181 names in each list**.

## Scope and layout behavior

Missing trades and missing events are tracked separately, so a completed empty read can use its legitimate empty state even if another read is late. The Dance Floor row keeps its existing dimensions. Missing calendar data also leaves the small calendar strip neutral. When events were missing on the initial response, two **42rem (672px)** card slots are retained through the swap; oversized card content can scroll within its slot. This sizing applies to the deferred path; a fully loaded initial response keeps the existing layout.

Measured example: desktop grid **880×672px**, top **1406.859375px**, unchanged after load; phone grid **342×1368px**, top **1430.921875px**, unchanged. The following section and total document height were also unchanged. No global CSS, public homepage JSX, header, signup, favorite, analytics, database or other-rep feature was changed. [Exact implementation file list](files-changed.txt).

The first-paint observer found SSR content with themed fonts, dark background and loaded styles, supported by screenshots. There were **0 page errors**, **0 console errors** and **0 hydration errors** in these eleven loads.

**Speed limitation:** incidental desktop first-contentful-paint observations were **9.236, 3.404 and 18.052 seconds**; phone was **2.004, 1.828 and 1.988 seconds**. These are FCP observations from three sanity runs, **not LCP measurements**. No speed threshold was part of this pass’s light checklist, and no speed/release claim is made. The desktop delay was not diagnosed or fixed after the round. No report-image processing overlapped the browser tests.

## Evidence

- [Phone placeholder → Smoke data](events-swap-phone.jpg); [desktop placeholder → Smoke data](events-swap-desktop.jpg).
- [Phone pending](sanity-phone-0-pending.png) / [loaded](sanity-phone-0-loaded.png); [desktop pending](sanity-desktop-0-pending.png) / [loaded](sanity-desktop-0-loaded.png).
- [First deferred load pending](deferred-desktop-0-pending.png) / [loaded](deferred-desktop-0-loaded.png).
- [Raw eleven-load results](browser-results.json), [summary](summary.json), [deployment receipt](deployment.json), [environment names](environment-variable-names.md), [housekeeping receipt](housekeeping.json).

Project settings/environment metadata were byte-identical before and after. Live, Smoke and the protected production deployment remain intact. No database writes, signup, favorite or other form submissions. No fixes, extra measurement runs or deployments after the light round. **STOPPED.**
