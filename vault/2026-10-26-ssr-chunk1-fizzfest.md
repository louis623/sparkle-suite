# SSR Chunk 1 — October 26, 2026

Louis authorized a fresh `codex/ssr-chunk1-fizzfest-home` from production e78fa626, a separate revert of PR #154 (8827f151), and ONE Vercel preview for dudesfizzfest only. Live remains pinned to 3f175871 / dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P. Do not continue or merge #156.

Louis subsequently approved a PUBLIC preview because project preview protection is disabled; do not change project settings. No Smoke, Live, aliases, project env, or database changes except the specifically authorized one test signup/favorite. Do not fix anything after the single deployed measurement round.

Implementation: frozen Live renderer/assets with exact original URLs; only the server-verified dudesfizzfest homepage can use the empty-by-default allowlist. Production React SSR/hydration, fixed first-paint locale/timezone/time, original locked header, selected Pumpkin Cat and base styles, inline bootstrap, early native Pause handling; error or >1.5s returns exact Live HTML. No audio/header/signup/migration/poster changes from #156.

Pre-preview verification: TypeScript PASS, 75 focused tests PASS, 11 layout locks PASS. Existing dependency cache is used locally after all direct dependency versions matched package-lock; the stalled install was preserved under ignored .local/incomplete-dependencies. Vercel builds from the lockfile.

Known acceptance constraints: original Pumpkin Cat has no Sound button, original header has links rather than menu toggle; preview host policy suppresses rep GA4. Neither was changed. Public roster completeness and custom-domain request equivalence must not be assumed from partial comparisons.

## Final result — one preview, one measurement round, stopped

The homepage is server-rendered with rep data inlined and production React hydrates while retaining the initial hero and Shop nodes. The original header is unchanged. Median LCP passes the requested targets, but this chunk does NOT pass acceptance overall and is NOT ready for Live. No fixes were made after measurements.

- Branch: `codex/ssr-chunk1-fizzfest-home`, fresh from production branch commit `e78fa626c443124ba11725dc93d32e859985ffa4`.
- Standalone PR #154 revert: `8827f151`.
- Deployed implementation: `b9d707d081ec4290ecb24372a39f1591e7fa6b25`.
- Public preview approved explicitly by Louis: https://sparkle-suite-mjz5dnmbs-louis-2849s-projects.vercel.app/dudesfizzfest
- Deployment: `dpl_Czyd9FXC4VJ2ykGSCHB78KMmvUt4`, project `prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`, READY, preview target, no aliases.
- Deployment-only runtime environment: `REP_RENDER_V2_SLUGS=dudesfizzfest`. No project settings or project environment variables changed.
- Final Vercel lookup confirmed BOTH Suite domains still resolve to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`, source `3f175871674e42dbc62d18419318941ea6a49935`; existing customer aliases remain there. No Smoke, production, alias, or database changes. Zero test signup/favorite writes.

## Measurement method and limitations

One completed round on the READY deployment: five cold no-input performance navigations and five separate startup-input navigations per profile. Desktop: 1440 x 900, CPU 1x. Slow phone: 390 x 900, CPU 4x, 150 ms latency, download 200,000 B/s (1.6 Mbps), upload 93,750 B/s. Browser cache disabled; clean headless Chrome contexts. Browser timezone America/Los_Angeles. LCP and input runs are separated because input ends LCP observation. The first performance run per profile records a filmstrip (every fifth compositor frame); all runs wait 15 seconds after DOMContentLoaded before final observation. Only two Live reference screenshots were read, with no writes.

Input attempts are anchored to FCP at 0, 200, 500, 1,000, 2,000 and 4,000 ms, for Pause, Shop, Sound and menu. Missing controls and late dispatches remain recorded. This harness did NOT establish complete early-window coverage: desktop Pause is outside the viewport, and sequential CDP round trips caused late attempts. Observed Event Timing durations cannot be presented as proof that every requested tap passed. Shop navigation was prevented by the measurement listener, so these durations are not destination-load timings. The phone Live screenshot used a 390 px desktop context rather than mobile emulation; exact device-equivalent visual parity is therefore also unproven.

Two initial observations hit Vercel's "Deployment is building" interstitial before API READY. They are INVALID, preserved separately, and excluded from every reported number. No app changes occurred between those invalid observations and the one actual application measurement round. Earlier CLI attempts rejected an unsupported flag and an oversized upload before creating any deployment; only one deployment was created, from a clean Git archive of the recorded commit.

## Acceptance table

FAIL includes blocked or unverified requirements; local test results are not substituted for deployed evidence.

| # | Requirement | Result | Evidence / limitation |
|---|---|---|---|
| 1 | Slow-phone LCP <= 2.5 s | PASS | Median **2.484 s**, n=5. Runs: 2.232, 2.580, 2.484, 2.668, 2.220 s. Two runs exceed 2.5 s. |
| 2 | Desktop LCP < 2.0 s | PASS | Median **1.392 s**, n=5. Runs: 18.808, 1.656, 1.348, 1.392, 1.364 s. Large first-run outlier retained; its cause is not established. |
| 3 | Every Pause/Sound/menu/Shop tap <= 200 ms, no skipped windows | FAIL | Median of each run's maximum observed event duration: desktop **48 ms**, phone **80 ms**; worst **112/88 ms**, n=5 each. Desktop records 6/12 existing-control clicks per run, phone 12/12. Sound/menu absent: 60 missing attempts per profile. Existing-control dispatches >100 ms late: desktop 6, phone 40. Cannot prove every first-paint window. |
| 4 | CLS <= 0.05 | PASS | Median and maximum **0.000**, all 10 performance runs. |
| 5 | No blank/plain-text first frame | PASS | First captured content frame is fully themed in both filmstrips; no blank or plain-text content frame observed. Sampling every fifth frame cannot exclude a flash between samples. |
| 6 | Visually identical at 390/1440 px | FAIL | Side-by-side captures saved. Event time differs: Live **5:00 PM PDT**, preview **8:00 PM EDT**, same LA browser timezone. Preview motion control also says Pause while Live says Play. Fixed first-paint timezone persists visibly. |
| 7 | Original header, exactly one H1 | PASS | Header outerHTML equals Live at both widths; **1 H1** in all 10 performance runs. |
| 8 | Hero autoplay | PASS | Video advances in all 10 runs: desktop **5.042 s**, phone **4.276–4.971 s**; readyState 4. Desktop observed during rest/end state, phone playing. Existing theme has no Sound control/audio. |
| 9 | GA4 page_view and visit beacon once | FAIL | **0 page_view / 0 visit** observed. Existing policy suppresses GA4 on vercel.app and visit tracking for headless user agents. |
| 10 | TikTok embeds work | FAIL | **2 player iframes** present, but playback not verified. Captures show unloaded panels; desktop has permission-policy and HTTP 403 errors. Cannot attribute every error to a particular iframe. |
| 11 | Real test signup saves | FAIL | **0 writes; blocked.** Existing POST invokes shared outbox processing (up to 25 jobs), which can affect unrelated records/messages beyond the one authorized signup. No POST change or submission made. |
| 12 | Favorite saves | FAIL | **0 writes; unverified.** No safe persisted test identity established within the permitted write scope. |
| 13 | Zero React #418/#423/#425 or console errors | FAIL | **0 React hydration errors**, **0 page exceptions**, but **13 desktop console errors** across performance/input runs (10 accelerometer policy, 3 HTTP 403). Phone: 0. |
| 14 | No development React/Babel | PASS | **0** development React/Babel script loads; production React bundle. Exactly **4** stylesheets: 3 base + Pumpkin Cat. **0** second homepage-template requests. |
| 15 | Every other rep byte-identical, all slugs/domains | FAIL | **7/7 known slug** raw SHA-256 pairs match Live. **0/7 custom-domain comparison** pairs match using preview /customer-site/home?c=domain; origin/routing are not equivalent to real custom hosts. Roster completeness unproven. Hash test correctly fails overall. |
| 16 | Removing allowlist slug restores Live | FAIL | **0 deployed toggle tests** under one-deployment constraint. Local tests pass exact fallback equality with empty allowlist. Deployed proof not claimed. |
| 17 | Forced render failure returns Live | FAIL | **0 deployed fault injections**. Local throw/timeout/fallback tests pass, including 1,500 ms budget; no fault endpoint added. Deployed proof not claimed. |
| 18 | Metadata/shop/location unchanged | PASS | Title, description, canonical and JSON-LD exactly match Live at both widths, including shop name/location. Title: "Fizz Festival | Live jewelry reveals and Dance Floor". |

## Evidence files

Local evidence directory: `C:/Users/louis/.codex/visualizations/2026/10/27/01a17afa-e154-7353-a2c1-ba8a95acdc21`.

- `ssr-chunk1-ready/results.json`: complete raw actual-round observations, attempts, console output, metadata and frame timestamps.
- `ssr-chunk1-ready/summary.json`: calculated medians and aggregate counts.
- `ssr-chunk1-ready/desktop-side-by-side.png`, `slow-phone-side-by-side.png`: Live left, preview right; original full-page PNGs retained.
- `ssr-chunk1-ready/desktop-filmstrip.png`, `slow-phone-filmstrip.png`: first 12 captured frames; original JPEG frames retained.
- `ssr-chunk1-ready/calendar-comparison.png`: timezone mismatch crop, Live left.
- `ssr-chunk1-parity.json`: raw response SHA-256 pairs and partial-inventory marker.
- `ssr-chunk1/`: invalid pre-READY observations, excluded.
- Worktree `.local/focused-results.json`, `.local/measurement-ready.log`, `.local/parity-test-result.json`, `.local/deployment-output.log`: local test and execution records.

## Files changed

Exact full path inventory is in [2026-10-26-ssr-chunk1-files.txt](2026-10-26-ssr-chunk1-files.txt), generated from production branch base through the deployed commit. The 120 changed paths include the standalone PR #154 revert and frozen snapshot, so Pantry/Trade/test removals in that inventory belong to the requested revert, not new SSR scope.

Main implementation groups:

- `lib/amethyst/legacy/*`, `scripts/snapshot-rep-render-v1.mjs`, `.gitattributes`: pinned Live renderer and 140-entry asset manifest; preserve source bytes.
- `lib/amethyst/rep-render-version.ts`, `homepage-render-safety.ts`, `homepage-first-paint.ts`, `public-asset-response.ts`: homepage-only allowlist, SSR/bootstrap, 1.5-second exact fallback.
- `scripts/amethyst-server-entry.ts`, `amethyst-browser-entry.ts`, `build-amethyst-ssr.mjs`, `lib/amethyst/generated/homepage-server.cjs`, `package.json`, `next.config.ts`: production server/browser bundles and build inclusion.
- `public/amethyst/homepage.jsx`, `public/amethyst/compiled/{homepage,react,tweaks-panel}.js`: hydration, deterministic initial render and early Pause handoff; original header preserved.
- `app/api/amethyst/homepage-source/route.ts`, `proxy.ts`: serve frozen JSX bytes to legacy paths while the demo uses compiled hydration.
- Focused allowlist/fallback/SSR/route/template tests and deployed raw-response hash integration test; three approved QA scripts.
- Branch approval config/register and vault records. No migrations, signup POST, analytics worker, font inlining/self-hosting, CSS-delivery split, header redesign, hero-audio work, or posters.

## Stop and future work

Stopped after the single round. Do not treat median LCP passes as overall acceptance. Do not merge or promote this branch or #156. Future chunk decisions may address local-time restoration after hydration, accurate viewport-safe early tap scheduling, preview-safe analytics/side-effect testing, real custom-host parity and a complete roster, deployed flag/fault proof, and TikTok error attribution. Those are notes only; no fixes or extra deployment were performed.
