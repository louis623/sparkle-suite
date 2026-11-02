# PR169 Smoke verification — checks complete; quality gates failed

All requested pages/themes were exercised, including normal/reduced motion and the MHF keyboard video control. The code is on normal Smoke. **This is not ready for Live:** half the LCP observations miss their targets, layout movement remains, and SSR home fonts/static art differ from legacy. No visual/performance fixes were made during this matrix.

- Head: `04601fb6b89d1bb64d53be3a34e988bf80b0dbc5`; [draft PR169](https://github.com/louis623/sparkle-suite/pull/169).
- One preview: `dpl_5DM79yJh9NNFYEzH9QQyWsgNM6Pc`, READY 10/30/2026, 4:35:37 PM ET, exact head above.
- [Immutable deployment provenance](https://sparkle-suite-smoke-1s0yytiob-louis-2849s-projects.vercel.app) in Smoke project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`.
- Normal Smoke alias: `dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j` → `dpl_5DM79yJh9NNFYEzH9QQyWsgNM6Pc`; 12 candidate and 12 plain-alias GET checks passed before/after the one authorized alias move.
- ORIGINAL restored and independently read back 2026-10-30T23:01:31.668Z: `halloween_pumpkin_witch` / stored template `amethyst` / hero `zoom`.
- No Live deploy/env/alias/DB changes, project env/settings changes, merge, site POSTs, sign-in, signup or form/trade submissions. Only MHF Smoke appearance_preset was manually changed. Stored template/layout was never changed: Alpine Opal derives the MHF hybrid layout from her preset/profile. Evidence is uncommitted.

[Open the local comparison gallery](gallery.html). Select a theme, page and desktop/phone. Screenshots are also available under screenshots/; legacy screenshots under legacy-screenshots/; 14 side-by-side contact sheets under comparisons/.

## What changed

1. Parity hashing strips carriage returns with html.replace(/\r/g, ""). Before motion edits, all 69 raw HTML comparisons matched; normalization alone changed no HTML. Later authorized motion markup/CSS changes refreshed the expected fixture. Windows checks passed; Linux was not executed locally.
2. Both customer_page_ssr_failed paths include page, public gate slug, rep ID, error name and message; no customer PII fields were added.
3. Custom-domain SSR tests prove the real sparkle-site-visit element and correct rep ID on all three pages, with empty rendering slug and custom-origin links/canonicals.
4. Reduced-motion video fixes: amethyst, halloween_pumpkin_cat, gilded_autumn, midnight_rose, fall_owl_harvest_moon, gobble_and_fizz, pie_please, pearl_rose, sunset_beach, rose_champagne. Forced CSS overrides were corrected for gnome_garden, neon_butterfly and halloween_pumpkin_witch. All 23 preset preference cases passed. Smoke exposes 14 community themes; the other nine presets were not browser-tested on Smoke.
5. MHF aurora has a native, keyboard-focusable corner Pause/Play button, exact accessible labels, 3px visible focus outline and no normal-motion layout movement from its controls. Reduced-motion arrival starts paused with Play. Legacy assets and flyer code/timeouts remain unchanged.

## Local tests and VM investigation

TypeScript, full production build, all 69 parity cases and the new tests passed. Full suite: **6,036 pass / 76 fail / 5 skip**, versus **6,007 / 80 / 5** baseline; **zero new failing names**. The three approved flyer timing cases and the long existing flyer sweep passed in this run. Four existing suite-load errors and the prelaunch request-scope error remain. The one authorized follow-up commit was pushed; no additional application changes were made after it.

The outer-failure test double was corrected with permission to await its supplied template-data promise, matching the real helper. No assertion requirement or timeout was weakened.

The same production VM limits apply during tests: 300 ms bootstrap/runtime, 500 ms renderToString, 100 ms page-theme application. A timeout returns the rep-specific frozen legacy document with HTTP 200 through the existing catch/best-effort fallback; home also has a five-second overall SSR budget. It loses SSR first paint for that request. No limit was raised.

| Isolated run | Pass | Fail | Failed themes/layouts | CPU average | CPU peak |
| --- | ---: | ---: | --- | ---: | ---: |
| Base1 | 69 | 0 | None | 31.49% | 42.05% |
| Base2 | 69 | 0 | None | 28.08% | 40.02% |
| Base3 | 69 | 0 | None | 23.37% | 28.88% |
| Fixed1 | 69 | 0 | None | 39.04% | 39.22% |
| Fixed2 | 69 | 0 | None | 46.35% | 46.35% |
| Fixed3 | 69 | 0 | None | 49.8% | 50.67% |

Base was exact 9abac55e in a separate clean worktree, with the same locked dependencies. CPU had only two samples per short run on eight logical processors. Node activity was observed throughout, PowerShell observer activity in early runs, and Chrome averaged 3.08% whole-machine CPU during Fixed3. Recorded total CPU did not saturate. Earlier failing runs had no CPU evidence; these six passing runs did not establish the timeouts as pre-existing flakes. Louis explicitly resumed Step2 unchanged. Raw evidence is in vm-investigation/.

## Deployment overrides

REP_RENDER_V2_SLUGS=dudesfizzfest,milehighfizz. All 39 required names were passed at runtime and build: three verified Smoke DB bindings, five non-secret Smoke/release flags, 31 empty inherited values. Neither forbidden SSR preview override was set. Existing automation bypass only; none was created. Names only:

- `CARD_QR_APPROVAL_SECRET`
- `CARD_QR_FULFILLMENT_EMAIL`
- `CONTROL_CENTER_OWNER_EMAILS`
- `CONTROL_CENTER_SESSION_SECRET`
- `CRON_SECRET`
- `GA4_READER_SERVICE_ACCOUNT_JSON`
- `GA4_SMOKE_TEST_MEASUREMENT_ID`
- `INTERNAL_OPERATOR_EMAILS`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SPARKLE_ENVIRONMENT`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `OPENAI_API_KEY`
- `PUBLIC_SITE_VISIT_SALT`
- `REMY_MCP_BEARER_TOKEN`
- `REP_RENDER_V2_SLUGS`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `SIGNWELL_SEND_ENABLED`
- `SPARKLE_ENVIRONMENT`
- `SPARKLE_FINDER_CONTROL_CENTER_USAGE_URL`
- `SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN`
- `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN`
- `SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN`
- `SPARKLE_FIZZ_TEST_SEND`
- `SPARKLE_LAB_MANUAL_RUNS_ENABLED`
- `SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED`
- `SPARKLE_LAB_WEEKLY_RUNS_ENABLED`
- `SPARKLE_PRE_SHOW_EMAIL_ENABLED`
- `SPARKLE_PRE_SHOW_SMS_ENABLED`
- `SPARKLE_RELEASE_BRANCH`
- `SPARKLE_RELEASE_REPOSITORY`
- `SPARKLE_REVIEWER_SMOKE_MODE`
- `SPARKLE_SELF_SERVE_ENABLED`
- `SPARKLE_STRIPE_TEST_BUYER_MODE`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TEAM_PHOTO_POLISH_ENABLED`

## Required GET controls

| Path | Candidate HTTP / SSR | Plain Smoke HTTP / SSR | Result |
| --- | --- | --- | --- |
| /milehighfizz | 200 / yes | 200 / yes | PASS |
| /milehighfizz/trade | 200 / yes | 200 / yes | PASS |
| /milehighfizz/join | 200 / yes | 200 / yes | PASS |
| /dudesfizzfest | 200 / yes | 200 / yes | PASS |
| /dudesfizzfest/trade | 200 / yes | 200 / yes | PASS |
| /dudesfizzfest/join | 200 / yes | 200 / yes | PASS |
| /blingkitchen | 200 / no | 200 / no | PASS |
| /blingkitchen/trade | 200 / no | 200 / no | PASS |
| /blingkitchen/join | 200 / no | 200 / no | PASS |
| /smokecodex | 200 / no | 200 / no | PASS |
| /smokecodex/trade | 200 / no | 200 / no | PASS |
| /smokecodex/join | 200 / no | 200 / no | PASS |

## Theme × page results

Desktop: 1440×900, unthrottled. Phone: 390×844, simulated 150ms latency, 1.6Mbps down, 0.75Mbps up and 4× CPU slowdown. Fresh headless contexts; metrics after load, fonts ready and 1.8 seconds. These are single observations on this PC, not medians, real-device or guaranteed cold-start measurements. Non-GET requests, tracking and WebSockets were blocked. No personal Chrome session was used.

All 84 rows passed HTTP/SSR/saved-theme and reduced-motion paused-state checks. Theme means the correct saved preset/layout, palette and theme media; it does not imply perfect font/art parity. D/P = desktop/phone. CLS is shown for normal and reduced motion separately. LCP is seconds, normal motion only; targets <2 D / <3 P. Overall PASS requires those checks, both LCP targets, zero recorded CLS, and no unapproved visual difference in the comparison. Intended aurora Pause/reduced-motion improvements are accepted changes.

| Theme | Page | HTTP D/P | SSR D/P | Theme D/P | Motion paused D/P | CLS normal D/P | CLS reduced D/P | LCP D/P s | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| amethyst | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 3.396 / 2.248 | FAIL |
| amethyst | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 0.896 / 2.344 | FAIL |
| amethyst | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.156 / 2.792 | FAIL |
| fall_owl_harvest_moon | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000373 | 4.360 / 2.356 | FAIL |
| fall_owl_harvest_moon | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.392 / 4.336 | FAIL |
| fall_owl_harvest_moon | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.580 / 5.420 | FAIL |
| gilded_autumn | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 4.748 / 5.248 | FAIL |
| gilded_autumn | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.332 / 3.680 | FAIL |
| gilded_autumn | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 2.608 / 4.800 | FAIL |
| gobble_and_fizz | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 5.280 / 5.232 | FAIL |
| gobble_and_fizz | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.904 / 2.580 | FAIL |
| gobble_and_fizz | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000281 | 0.000000 / 0.000000 | 2.596 / 3.356 | FAIL |
| halloween_pumpkin_cat | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000105 | 21.036 / 3.824 | FAIL |
| halloween_pumpkin_cat | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.428 / 3.804 | FAIL |
| halloween_pumpkin_cat | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.688 / 3.184 | FAIL |
| halloween_pumpkin_witch | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | not observed / 4.544 | FAIL |
| halloween_pumpkin_witch | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.038391 | 0.022929 / 0.036595 | 1.576 / 5.948 | FAIL |
| halloween_pumpkin_witch | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 2.080 / 5.252 | FAIL |
| midnight_rose | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 4.640 / 3.892 | FAIL |
| midnight_rose | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.548 / 4.096 | FAIL |
| midnight_rose | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.812 / 4.168 | FAIL |
| pearl_rose | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 4.460 / 5.680 | FAIL |
| pearl_rose | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.920 / 5.404 | FAIL |
| pearl_rose | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.800 / 4.480 | FAIL |
| pie_please | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000207 | 4.164 / 3.424 | FAIL |
| pie_please | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 1.060 / 2.580 | FAIL |
| pie_please | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.072 / 3.032 | FAIL |
| rose_champagne | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 2.748 / 6.092 | FAIL |
| rose_champagne | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 0.888 / 3.072 | FAIL |
| rose_champagne | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.676 / 2.828 | FAIL |
| rose_gold | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 2.400 / 1.728 | FAIL |
| rose_gold | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.048954 | 0.022929 / 0.036595 | 0.700 / 2.452 | FAIL |
| rose_gold | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 0.816 / 2.556 | FAIL |
| sparkle_suite_morganite | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 2.560 / 1.668 | FAIL |
| sparkle_suite_morganite | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 0.772 / 2.512 | FAIL |
| sparkle_suite_morganite | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 0.896 / 2.816 | FAIL |
| sunset_beach | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 2.784 / 1.936 | FAIL |
| sunset_beach | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022929 / 0.036595 | 0.022929 / 0.036595 | 0.840 / 2.852 | FAIL |
| sunset_beach | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 1.000 / 16.400 | FAIL |
| alpine_opal | Home | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 4.756 / 3.336 | FAIL |
| alpine_opal | Dance Floor | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.022958 / 0.036648 | 0.022958 / 0.036648 | 0.920 / 1.972 | FAIL |
| alpine_opal | Join | 200 / 200 | yes / yes | yes / yes | OK / OK | 0.000000 / 0.000000 | 0.000000 / 0.000000 | 0.948 / 2.048 | PASS |

The Alpine desktop home table uses the approved recheck. Its preserved first observation was LCP **2.752s**, normal CLS **0**, reduced CLS **0.000059576**. The recheck recorded LCP **4.756s**. The initial helper incorrectly checked the video src attribute instead of its resolved nested source; only that lookup was corrected with approval. Requirements/timeouts/page code were unchanged; first-pass JSON remains intact.

LCP targets met: **42/84**. Positive normal CLS: **29/84**; positive reduced CLS: **31/84**. Only **20/84** device rows meet LCP plus zero normal/reduced CLS, before visual parity. Max normal CLS **0.048954**. Max LCP **21.036s** (Pumpkin Cat desktop home); Sunset Beach phone Join **16.400s**. Pumpkin Witch desktop home had no observed LCP entry and is treated as missing/failing, not zero-second performance. Causes and regression attribution were not established.
Overall theme/page rows passing both devices, metrics and parity: **1/42**.
Captured page runtime errors: **0**.

## Visual differences by theme and page

Comparisons use the prior Smoke deployment dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j against normal Smoke, with the same actual saved MHF themes/public data. All 42 page pairs matched recorded heading text, hero CTA text/links, lineup text and footer text/links, plus sampled declared font/color/size/background styles. All normal video URLs matched. That does not erase the actual rendered-font differences below. CDP font measurements are desktop; desktop/phone screenshots were reviewed for wrapping, media, controls and footer. Motion frames, witch positions, sparkles and ticker offsets are not synchronized.

| Theme | Page | Actual rendered font differences (legacy → SSR) | Other observed differences |
| --- | --- | --- | --- |
| amethyst | Home | heading: Italiana → Times New Roman | Phone home heading wraps to two lines in SSR versus one line in legacy.; Legacy nebula-only opening-poster.webp versus SSR unicorn hero-poster.webp; static/reduced appearance differs |
| amethyst | Dance Floor | None measured | Extra SSR Pause animation control |
| amethyst | Join | None measured | Extra SSR Pause animation control |
| fall_owl_harvest_moon | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | No other difference noted in captured views |
| fall_owl_harvest_moon | Dance Floor | None measured | Extra SSR Pause animation control |
| fall_owl_harvest_moon | Join | None measured | Extra SSR Pause animation control |
| gilded_autumn | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | No other difference noted in captured views |
| gilded_autumn | Dance Floor | None measured | No other difference noted in captured views |
| gilded_autumn | Join | None measured | No other difference noted in captured views |
| gobble_and_fizz | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | No other difference noted in captured views |
| gobble_and_fizz | Dance Floor | None measured | Extra SSR Pause animation control |
| gobble_and_fizz | Join | None measured | Extra SSR Pause animation control |
| halloween_pumpkin_cat | Home | None measured | No other difference noted in captured views |
| halloween_pumpkin_cat | Dance Floor | None measured | No other difference noted in captured views |
| halloween_pumpkin_cat | Join | None measured | No other difference noted in captured views |
| halloween_pumpkin_witch | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy.; Legacy witch image uses Next image optimizer; SSR uses direct witch.webp; captured artwork matches |
| halloween_pumpkin_witch | Dance Floor | None measured | Legacy witch image uses Next image optimizer; SSR uses direct witch.webp; captured artwork matches |
| halloween_pumpkin_witch | Join | None measured | Legacy witch image uses Next image optimizer; SSR uses direct witch.webp; captured artwork matches |
| midnight_rose | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy. |
| midnight_rose | Dance Floor | None measured | Extra SSR Pause animation control |
| midnight_rose | Join | None measured | Extra SSR Pause animation control |
| pearl_rose | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy. |
| pearl_rose | Dance Floor | None measured | Extra SSR Pause animation control |
| pearl_rose | Join | None measured | Extra SSR Pause animation control |
| pie_please | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy. |
| pie_please | Dance Floor | None measured | Extra SSR Pause animation control |
| pie_please | Join | None measured | Extra SSR Pause animation control |
| rose_champagne | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy. |
| rose_champagne | Dance Floor | None measured | Extra SSR Pause animation control |
| rose_champagne | Join | None measured | Extra SSR Pause animation control |
| rose_gold | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy. |
| rose_gold | Dance Floor | None measured | Extra SSR Pause animation control |
| rose_gold | Join | None measured | Extra SSR Pause animation control |
| sparkle_suite_morganite | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | No other difference noted in captured views |
| sparkle_suite_morganite | Dance Floor | None measured | Extra SSR Pause animation control |
| sparkle_suite_morganite | Join | None measured | Extra SSR Pause animation control |
| sunset_beach | Home | heading: Playfair Display → Georgia; paragraph: DM Sans 9pt → Segoe UI; cta: DM Sans 9pt → Segoe UI Semibold | Desktop home heading wraps to two lines in SSR versus one line in legacy.; Legacy CSS hero-approved.png still versus explicit SSR hero-poster.webp video-frame still; wave/shore frame differs |
| sunset_beach | Dance Floor | None measured | Extra SSR Pause animation control |
| sunset_beach | Join | None measured | Extra SSR Pause animation control |
| alpine_opal | Home | paragraph: DM Sans 9pt → Segoe UI Black; cta: DM Sans 9pt → Segoe UI Black | Intended new corner Pause/Play control and paused reduced arrival; prior raw legacy plays under reduce |
| alpine_opal | Dance Floor | None measured | No other difference noted in captured views |
| alpine_opal | Join | None measured | No other difference noted in captured views |

DM Sans 9pt is the font-family name reported by Chrome, not a claim that the CTA is set to 9pt. The computed CSS declarations often match while the fonts actually used differ. MHF title uses Brush Script MT in both renderers; Pacifico is unavailable in both on this machine.

Under reduced motion, all SSR heroes were paused, with no active hero animations recorded. The prior legacy aurora continued playing on desktop and phone. Legacy Rose Gold and Morganite homes each retained five CSS twinkle animations reported as running with 0.01ms duration; this is not evidence of sustained video motion. Other recorded legacy reduced views had no running hero motion. Legacy was not changed.

Additional existing quality issues, present in both renderers:

- rose_gold / Home, Dance Floor, Join: Pale heading text and Join body copy have visibly low contrast against pale backgrounds in both legacy and SSR. Existing shared theme quality issue, not an SSR difference.
- sparkle_suite_morganite / Join: White Join heading/body copy on a pale card is visibly low contrast in both legacy and SSR. Existing shared theme quality issue, not an SSR difference.

These findings were reported without page fixes, as requested. Exact remediation cost has not been estimated.

## Original six assertion corrections

All six cases pass after the corrections. No application or compiled page code changed: hashes of every changed application/compiled file remained identical across this correction. See `assertion-corrections.json` for the exact case names and results.

| Case | Before | Now | Why the rendered page was already correct |
| --- | --- | --- | --- |
| Custom-domain home | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing the `data-ssr-review-label` attribute. | The string occurred in an inlined CSS selector; there was no review-label element. The SSR marker, custom-domain canonical, `/trade` and `/join` links, and empty rendering slug checks already passed. |
| Custom-domain Dance Floor | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing that attribute. | The same shared CSS selector was present, with no label element. Its SSR marker, canonical, links and rendering-identity checks already passed. |
| Custom-domain Join | Rejected any occurrence of `data-ssr-review-label` anywhere in the HTML string. | Rejects an actual HTML opening tag bearing that attribute. | The same CSS-only occurrence caused the failure. Its SSR marker, canonical, links and rendering-identity checks already passed; the separate Join-visibility denial case also passed. |
| MHF home, `sparkle_rise` | Looked for the contiguous substring `WITH LINDSEY` anywhere in the serialized hero HTML. | Selects the `p.mhf-hero-with` content, removes HTML comments only, and requires its entire text to equal `WITH LINDSEY`. | React serialized the visible text as `WITH <!-- -->LINDSEY`. The complete hero-tree comparison against frozen legacy already passed before this assertion. |
| MHF home, `still` | Looked for the same contiguous substring in the serialized hero HTML. | Requires the exact paragraph text after removing comments only. | The same React comment separated the two correct text nodes. The complete frozen-vs-SSR hero-tree comparison already passed. |
| MHF home, `none` | Looked for the same contiguous substring in the serialized hero HTML. | Requires the exact paragraph text after removing comments only. | The same non-visible comment caused the failure; the complete legacy hero-tree comparison already passed. |

The corrections preserve the intended element/text requirements. The MHF check is now confined to the correct paragraph and requires exact text, rather than accepting a match anywhere in the hero. No other assertion was removed or relaxed in this correction.

The corrected focused run passed 466 cases. Its only three failures are the same pre-existing Pantry byte assertions captured at base `968f7425`; all six cases above passed.



## Three explicitly approved original timing flakes

No flyer code, checks or timeouts changed. All three passed at base/in isolation and timed out at the original quiet full run. They passed in the final follow-up full suite.

| Exact test | Base pass ms | Isolated pass ms | Original quiet full timeout ms |
| --- | ---: | ---: | ---: |
| flyer render renders amber inside the safe zones and the QR decodes | 2089.874 | 1698.391 | 5276.085 |
| flyer render renders velvet inside the safe zones and the QR decodes | 2074.681 | 1863.782 | 5585.961 |
| flyer render shrinks a long show title instead of cutting it off | 2472.359 | 1553.627 | 5039.555 |

## Instrumentation, provenance and restoration

The initial candidate vercel curl error was CLI65.2 forwarding --non-interactive to native curl, before an HTTP request. With explicit approval, the helper was corrected to use the exact URL and existing bypass; all required GET gates then passed. The Alpine source-attribute helper issue was corrected separately with explicit approval. No customer page code was changed to make either helper pass.

All 14 legacy comparison commands emitted completion and saved 210 records (168 legacy normal/reduced views plus 42 SSR style comparisons). The terminal helper retained readline input after finishing; only its verified task-owned PID was closed. ORIGINAL had already been restored, so the old finally handler’s stale Alpine guard affected zero rows. Independent final readback proves exact ORIGINAL; see restored-original-final.json. These operational cleanup details do not replace any page check.

There were 31 successful MHF Smoke appearance_preset updates across the original matrix/restoration, approved Alpine rerun, legacy comparisons and final restoration. No other manual row/field updates, schema changes or project configuration changes were made. Existing isolated PGlite fixture permission applies to the earlier local test suite. No additional commit, push or deployment followed the single application commit/deployment.

## Review links

- [Smoke home](https://sparkle-suite-smoke.vercel.app/milehighfizz)
- [Smoke Dance Floor](https://sparkle-suite-smoke.vercel.app/milehighfizz/trade)
- [Smoke Join](https://sparkle-suite-smoke.vercel.app/milehighfizz/join)
- The live Smoke links show the restored ORIGINAL Pumpkin Witch theme. Use gallery.html for the captured Alpine Opal and other themes. No theme-override query flag was used.
- Local evidence folder: C:/Users/louis/sparkle-suite-repo/.codex-worktrees/ssr-per-rep-allowlist-disposable/vault/2026-10-30-ssr-per-rep/smoke/
- Gallery: gallery.html; raw metrics: theme-*.json; comparison data: legacy-comparison-data.json; screenshots/; legacy-screenshots/; comparisons/.
