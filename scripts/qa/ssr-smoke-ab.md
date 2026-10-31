# Deferred Smoke A/B acceptance

This runner is for the separately authorized Smoke run. Code-only work must not run it. It never deploys, moves aliases, submits forms, writes a database, or contacts Live.

Use an external config with `candidate` and `legacy`, each containing an immutable Smoke deployment `origin` and its exact 40-character `sha`, plus `runs` (minimum five). Both deployments must contain the guarded review-theme support; an older legacy deployment that ignores the query is invalid. The runner verifies project, READY status, hostname and SHA through a field-selected API wrapper. The resulting report records the exact legacy SHA and the fixed **12000ms** settle interval. There is no SSR-53 baseline anymore.

The approved runner consumes existing `VERCEL_TOKEN` and `VERCEL_AUTOMATION_BYPASS_SECRET` internally. Never put them in a config, command line, report, tool output or console. Raw metadata and browser error text are suppressed. The runner inspects only the Smoke alias; it rejects mutable or Live origins. This code-only task does not authorize any of those reads.

```sh
node scripts/qa/ssr-smoke-ab.cjs /tmp/ssr-ab-config.json /tmp/ssr-ab-results.json
```

Use the installed Playwright module (or the runner's `PLAYWRIGHT_MODULE` path option) and Chromium. Each sample has a fresh browser context, disabled cache and normal motion. Desktop is 1440×900, 20ms/10Mbps/1×CPU; phone is 390×844, 80ms/1.6Mbps/4×CPU. At least five alternating runs per renderer/profile/case are mandatory.

The fixed cases retain Pumpkin Cat, Fall Owl, Midnight Rose and Rose Gold home; Pearl Rose and Midnight Rose join; Alpine Opal trade; and Amethyst home. They add only Gilded Autumn home/join/trade and Alpine Opal home/join, both on the Mile High Fizz layout. Fixture routes use `/dudesfizzfest`, the guarded `ssrReviewTheme` and `ssrReviewLayout` query, and grouped lineup presentation. Only the three exact integrity-pinned React/Babel URLs required by frozen legacy HTML are additionally allowed for that cohort; arbitrary CDN/provider URLs remain blocked. The actual runtime theme must match after load in **both** cohorts; a label or URL alone is insufficient. Legacy HTML is still rendered by the frozen renderer and frozen scripts; its unchanged template-loader request passes the guarded theme/layout selection to the normal template API. No bootstrap is inlined or extra data read added to the legacy HTML path. Normal/customer/Live responses are unchanged.

Every case's candidate FCP and LCP median must be no slower than legacy on each profile. Every candidate paint sample must have exactly zero CLS. Any page exception, console hydration error (including React #418/#423/#425), missing measurement, duplicate run or incomplete cohort fails. Candidate absolute LCP must be **<2000ms desktop / <2500ms phone**. Only the hard-coded phone table waives that absolute speed target: Gilded Autumn home/join, Alpine Opal home/join/trade, all on MHF. These waivers never skip legacy comparisons, CLS, errors or taps.

Taps use trusted pointer input and measure pointerdown timestamp through the second requestAnimationFrame after click, a conservative next-paint bound. Each applicable action has a fresh load in each phase: **loading** starts as soon as its control is visible and its controller binds, before any load/idle wait, then observes DOM completion, fonts and hydration (an early Pause can keep the media load event pending); **idle** starts after load, fonts and the 12-second settle interval. Play requires a preparatory trusted Pause when initially playing (that unmeasured setup tap does not wait for Playwright animation stability); its measured tap is the first opportunity to Play. The report records whether the document was still loading. Every action/device/phase/renderer median must be ≤200ms. Pause/Play/sound must change real control state; nav/CTA must receive a trusted click with an href. Link navigation is prevented and no forms are submitted.

`ssr-ab-cases.cjs` hard-codes actual controls and selectors. Neither cases, selectors, waivers nor settle time can be overridden by config. Motion/sound are required only where the authored page has them: Amethyst and Fall Owl home have both; Gilded Autumn home has motion; Alpine MHF home has the SSR aurora control (the frozen legacy page has none). Join/trade on MHF have neither motion nor sound controls. Every page still requires nav and its primary CTA (the Trade Shop button). The retained Pearl Rose and Midnight Rose SSR join controls are required, as are Midnight Rose and Pumpkin Cat home motion controls; Rose Gold has an SSR motion control, without a frozen legacy counterpart. Missing required controls fail; there is no runtime skip for missing selectors.

Offline gate tests (no service reads):

```sh
npx vitest run tests/ssr-smoke-ab-gates.test.ts tests/amethyst-ssr-fallback.test.ts
```

The local Lindsey regression uses only synthetic fixtures and a temporary loopback server:

```sh
npx vitest run tests/amethyst-ssr-lindsey.test.ts
node scripts/qa/ssr-local-lindsey.cjs /path/to/playwright /tmp/lindsey-browser.json [webkit-executable]
```

It checks pre-H1 and post-H1 stream splits with a 400ms transport gap, Chromium and Playwright WebKit, phone and desktop, plus a client clock skew of +400 days. It requires native Chromium CLS=0, zero frame-by-frame movement of the headline/copy/CTA/control in both engines, and no page/hydration errors. WebKit does not expose native LayoutShift entries; the report explicitly records the geometry measurement in pixels instead of inventing a WebKit CLS. It also measures five fresh local taps per applicable action/phase/device/engine. Loading fixtures hold only the trailing closing body bytes for 1200ms (3000ms for Play preparation) so input is measured while loading; no application animation is held. Local idle checks wait for hero video playback to advance at least one second, plus 300ms after load/fonts, and are regression checks, not the deferred throttled A/B speed comparison. Each sample uses a fresh context; regenerating fixtures resets the synthetic data. Append `resume` after the WebKit executable to continue a fingerprinted partial local report: identical fixture/runtime bytes and valid unique completed samples are required, and every missing sample is still mandatory. A fresh run records its fingerprint before measurement. Clock negative controls are rerun on resume. Timing failures remain in the report; all twelve table rows are produced before the runner exits nonzero for any median above 200ms.
