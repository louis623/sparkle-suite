# PR #169 — Step 1 only, October 31, 2026

Code/evidence only on `louis623/sparkle-suite`, `codex/ssr-per-rep-allowlist`. GitHub branch and draft PR head independently matched `53c43d0bc2f8033066bb56aad2ecdbd1c91bf90f` before work in the clean disposable worktree `/workspace/repos/sparkle-suite-ssr`. NEW_HEAD is the single commit containing this note; the exact SHA is printed and independently read back from GitHub in the final handoff. No merge or release is included.

Read the responsive-heroes companion note and the existing QA directory. `vault/2026-10-30-ssr-per-rep/smoke/responsive-heroes/report.md` does **not** exist on this branch. No results from that missing report are inferred.

## Four changes

1. **Alpine Opal Dance Floor:** the actual local request inventory has no aurora video, home poster, or hero raster. The SSR critical path did carry authoring whitespace/comments from shared CSS, unused Pacifico/Great Vibes/Cormorant font declarations from home/other skins, and the same embedded heading font in both its face and preload. Trade now selects only its actual primary families plus the shared chrome's fixed Playfair face, embeds each critical face once, and starts their decode immediately after the title, before shared CSS. A build-generated whitespace-minified copy retains every shared selector, value, and rule order. Fonts remain embedded to preserve their original first-paint metrics. Native complete-markup readiness also prevents a fast compressed response from painting a partial trade hero. No data query, resolver, analytics, VM timeout or saved setting changed.

   Same synthetic content before/after: HTML **509,877 → 387,185 bytes** (24.1% less); gzip **178,481 → 130,525**; Brotli **123,268 → 117,894**. Embedded font occurrences **3 → 2**. Original font files/weights are retained, including custom heading settings and the chrome's Playfair fallback. Final phone screenshots retain the original appearance.

2. **Amethyst still:** the SSR scene config incorrectly used `opening-poster.webp` as its foreground still. It now uses the original `hero-poster.webp`, matching the legacy unicorn. The roughly 35KB original needs no derivative. Normal startup, visitor Pause and reduced motion retain that still; the unchanged video automatically starts, advances and loops when motion is permitted. The legacy CSS's ambient blurred background is preserved.

3. **Pumpkin Witch timing:** an SSR `animation: ... 5.8s ... !important` shorthand overrode the original `--1`/`--2` duration rules. Removing that shorthand lets the original stylesheet own durations **5.8 / 7.1 / 6.4 / 5.8 seconds**, with exact delays **−0.8 / −3.1 / −1.9 / −4.7 seconds**. Desktop/phone legacy and SSR computed styles agree; autoplay, persistent looping motion and reduced-motion behavior remain intact.

4. **CLS:** partial HTML delivery exposed centered hero text/cards before all their copy/actions existed; label changes could also resize positioned controls. SSR-only zero-height invisible label lines reserve the longer Pause/Enable footprints from initial markup. The affected surfaces use native `rel=expect blocking=render` readiness until the complete server tree and early label controller have parsed. This reserves the real first layout rather than guessing fixed heights or waiting for hydration. The [HTML standard](https://html.spec.whatwg.org/multipage/links.html#link-type-expect) defines this parsing guard. Final hero and H1 rectangles match the original SSR for all seven targeted probes.

   The controlled split occurs after H1 with a 250ms continuation delay. Its scores deliberately stress streaming and **are not the prior Smoke scores**:

   | Target | Shifting element in original SSR | Local stress before → after |
   | --- | --- | --- |
   | Fall Owl home desktop | `.hp-hero-inner` | 0.02528 → 0 |
   | Midnight Rose home desktop | `.hp-hero-inner` | 0.04590 → 0 |
   | Pearl Rose Join phone | `.jp-hero-card`, utility motion control | 0.23785 → 0 |
   | Rose Gold home phone | `.hp-hero-inner` | 0.07911 → 0 |
   | Fall Owl home phone, reduced | `.fow-controls` shrinks/expands | 0.000944 → 0 |
   | Pumpkin Cat home phone, reduced | Original Smoke event not reproduced locally; centered control footprint and complete-tree guard applied | 0 → 0 |
   | Midnight Rose Join phone, reduced | `.jp-hero-card`, utility motion control | 0.23785 → 0 |

   The separate 24-case named-surface/device/preference probe also recorded CLS **0 in all 24**. Pumpkin Cat's exact reported Smoke shift still requires attribution/readback in Step 3; this report does not pretend a missing local shift was traced. One unscoped Witch desktop diagnostic had a partial-hero shift of 0.01941 under uncompressed streaming; no new cross-theme CLS acceptance claim is made for it.

## Local measurements and checks

- TypeScript and production build: passed. Layout lock: all 11 unchanged checks passed. Focused SSR/header/layout suite: **552 passed / 0 failed / 0 skipped**, including 69 strict full-response snapshots refreshed for the intended SSR changes and eight added passing tests.
- Final full suite: **6,059 passed / 75 failed / 6 skipped** (eight new passing tests; +8 / −1 / +1 versus the recorded totals; zero new failing names versus the fresh baseline). Recorded prior totals: **6,051 / 76 / 5**. Fresh unchanged-head baseline on this Linux runner: **6,051 / 75 / 6**. The sixth existing optional skip uses a Windows Chrome path absent here; the suite was not altered to force it on. Exact current failure names are compared against that fresh same-run baseline, because the named 76-failure responsive-heroes report is unavailable.
- Four suite-load errors are already in the unchanged-head baseline: `remy-communications-schema-contract`, `sparkle-finder-public-show-window-migration`, `thanksgiving-migration`, and `prelaunch/prelaunch-crawl-metadata`. Missing repository fixtures/migrations and existing assertions remain out of scope. All **42/42** flyer-render cases and the other 19 flyer-named checks passed in the final full run. No flyer flakes required isolation, and there are no new failing names to list.
- Video: **44 device/preference checks passed** across ten shared video themes plus MHF's original aurora. All 22 normal cases autostarted, advanced, and wrapped after seeking near the loop boundary; all 22 reduced-motion cases stayed paused at time zero. CSS motion: **16 probes passed**, with advancing/looping persistent layers and reduced-motion stills. Entrance choreography is unchanged.
- Three paired cold-context trade samples per renderer/device, compressed HTML, pinned local font-provider fixtures, Chrome 156.0.8078.47: desktop median LCP **legacy 1.992s / original SSR 0.648s / final SSR 0.456s**; phone **legacy 5.976s / original SSR 1.176s / final SSR 0.996s**. Final SSR CLS **0 in all six timing samples**. The fixture removes legacy's development/Babel startup and does not include CDN, real data/TTFB, or Vercel cold starts; samples ran under local runner load. These results support the payload change but do **not** establish deployed acceptance against the supplied 0.676s/2.568s legacy targets.
- Full post-release speed/CLS and the original content/viewport/reduced-motion cases must be confirmed by the separately scoped Smoke Steps 2–3. Native parsing-guard behavior was checked in this Chrome only. No deployment was created to obtain these measurements.

## Evidence, limits and closeout

[Evidence and resettable local harness](2026-10-31-ssr-step1/qa/README.md), [trade samples](2026-10-31-ssr-step1/trade-timings.json), [shift sources and bounds](2026-10-31-ssr-step1/shift-traces.json), [24-case CLS probe](2026-10-31-ssr-step1/layout-checks.json), [video checks](2026-10-31-ssr-step1/video-checks.json), [CSS motion checks](2026-10-31-ssr-step1/decoration-checks.json), [witch computed timing](2026-10-31-ssr-step1/witch-timing.json), and [test comparison](2026-10-31-ssr-step1/checks.json). Phone comparisons place original SSR left and final SSR right; Amethyst's unicorn is the intended visible change.

No Vercel CLI deployment, alias change, project env/settings operation, Smoke/Live database connection, production URL request, merge, or Live change was performed. Existing full-suite SQL tests used only their isolated in-memory PGlite fixtures. Legacy pages, original/frozen assets, extension, flyer code/timeouts, and VM limits remain unchanged. Regenerated shared style/runtime JSON normalizes CRLF to LF on Linux; outside the SSR-owned stylesheet that is serialization only.

Repo-vault write: this single closeout. Open Brain capture could not be made: tool discovery exposed no `capture_thought`/Open Brain capability. No substitute external diary was written.

Next-session prompt: Resume from the single Step-1 NEW_HEAD on `codex/ssr-per-rep-allowlist`, draft PR #169. Read this note and its evidence. Steps 2 (Smoke deployments) and 3 (Smoke re-tests) were **not run**; use Louis's separate next-run instructions. Nothing here authorizes Live, a merge, a database change, or a project-setting change.
