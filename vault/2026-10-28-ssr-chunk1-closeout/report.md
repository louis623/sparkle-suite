# SSR Chunk 1 cold first-load pass — October 28, 2026

Smoke acceptance PASS, commit 09e46db08d7761940a22543059bc7bbb23df4453, unmerged PR161. Current Smoke dpl_HEaABdWqCtia5EY1YJvYKttXA5To. Prior/rollback dpl_4QeShF4D7bGWA6beRoEAqbSXoNR7. Both Live aliases confirmed unchanged at dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P.

The former 1.5s total budget included mandatory template/metadata work and imported the renderer afterward. The fix prepares immutable runtime code during parallel reads, uses a bounded 5s total budget and logs per-step timings plus deadline/error fallback reasons. Optional page data still has its unchanged 50ms budget; the same five-second Smoke delay produces deferred SSR. No data cache was added.

The previous deployment's exact silent failure cannot be proved retrospectively. Controlled 1.7s template and first-render regressions confirm the old budget mechanism, but the measured new cold bundle was not itself slow enough to explain the previous failure. First deployed cold request: bundle31.026ms, runtime prepared43.886ms, template ready385.013ms, metadata486.199ms, bootstrap486.735ms, renderer486.765ms, renderToString19.878ms, total512.422ms. Another cold instance383.242ms. Warm totals188.264/289.724/313.784/349.523/395.123ms, median313.784ms. These are server SSR-work times. The browser artifact's early navigation ttfbMs field is not used as a server-response measurement.

Full suite once, one worker, no concurrent builds:5632pass52existingfail6skip,5690tests720files1080.42s. Zero new failing names vs original52 or c8 baseline. Existing root-route runtime error remains. New cold-template and first-render tests pass; full fallback file15/15. Earlier focused16/16 passed before second cold-render test was added. Flyer checks passed within this full run. No extra full run.

First application request after deployment/alias move was desktop1; no homepage warmup. Logs confirmed cold:true. Browser policy required activation for audible autoplay; no tap occurred before playback. All non-GET/HEAD browser requests blocked. Pause/Play tested only after zero-tap autoplay and deferred data completion. No hydration, page or console errors in any load.

| Load | HTTP | Header | Playing muted before tap | Decoded frames | Pause/Play | CLS |
|---|---:|---|---|---:|---|---:|
| Desktop1 first |200|deferred|PASS|275|PASS|0.00006597|
| Desktop2 |200|deferred|PASS|173|PASS|0.00006597|
| Desktop3 |200|deferred|PASS|185|PASS|0.00006597|
| Desktop4 |200|deferred|PASS|188|PASS|0.00006597|
| Phone1 |200|deferred|PASS|83|PASS|0|
| Phone2 |200|deferred|PASS|79|PASS|0|
| Phone3 |200|deferred|PASS|79|PASS|0|

Desktop1440x1000 unthrottled. Phone390x900 Chromium emulation,4xCPU,200000B/s download,93750B/s upload,150ms latency,cache disabled,new context each load,America/New_York/en-US. Pantry /blingkitchen/in-the-pantry200 with content (13484bytes). No rollback needed. Same41Smoke-only overrides; Smoke database pukemqiwlyqmyytxkdmo only,31empty overrides. No project-level env/settings changes, database writes, forms, theme/layout/header/pantry/other-skin/next.config/.vercelignore changes. Test Codespace stopped.

Screenshots desktop-playing.png and phone-playing.png were visually inspected. Raw browser results results.json; request timings runtime-request-logs.txt; full suite ssr-cold-full.json/log and ssr-cold-full-comparison.json in parent directory. STOP after this measurement round.
