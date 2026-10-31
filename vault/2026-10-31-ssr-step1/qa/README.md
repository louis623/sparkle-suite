These are offline synthetic fixtures, derived from the verified PR head and the existing `vault/2026-10-30-ssr-per-rep/qa/` harness. They do not start Next routes, contact Supabase, submit forms, or make deployments. Original SSR source is pinned to `53c43d0bc2f8033066bb56aad2ecdbd1c91bf90f`; frozen legacy JSX is bundled with the same local production React shim. This deliberately removes legacy's development/Babel startup. It is a layout/behavior reference and a local payload benchmark, never a deployed speed baseline.

From the clean repository root:

```sh
npm ci
npm run build:amethyst:ssr
python3 vault/2026-10-31-ssr-step1/qa/prepare.py
npx tsx .tmp-qa/generate.ts
node .tmp-qa/server.cjs
```

In another terminal, run `node .tmp-qa/stress.cjs`, `node .tmp-qa/speed.cjs`, `node .tmp-qa/motion.cjs`, or `node .tmp-qa/decorations.cjs`. The installed Playwright package path is recorded in the scripts. Adjust that local package import if necessary; this does not require a product dependency or a project environment change. Motion scripts also accept a process-only `PLAYWRIGHT_PACKAGE` override.

Review entry: `http://127.0.0.1:4398/review?theme=alpine_opal&page=trade&renderer=ssr`. Other renderer values are `before` and `legacy`; supported pages are `homepage`, `trade`, and `join`. All preset IDs are supported. The visible synthetic-review label persists. Do not submit forms. APIs are same-origin fixture responses only, and browser routes abort other application hosts. Speed/stress scripts fulfill font-provider stylesheets from the already pinned local font records; they do not call the providers.

Regenerate to reset; each capture opens a new browser context. No database reset is involved. Stop the loopback server when done. `stream=1` deliberately splits the HTML after H1 and delays the remainder 250ms, to reproduce a partially parsed hero; these stress scores are not the original Smoke scores. `gzip=1` enables compressed HTML for the separate trade timing comparison. Phone: 390×844, 80ms latency, 1600kbps, 4× CPU; desktop: 1440×900, 20ms, 10000kbps, 1× CPU. Three cold-context timing samples per renderer/device alternate renderer order. These are measurements under local runner load, not CDN, database, or server cold-start measurements.

The full suite runs existing isolated in-memory PGlite fixtures. The process-only `network-guard.cjs` used for builds/tests blocks application/database hosts; it permits local sockets and Google font files needed by Next's build. It changes no project settings. No VM limits, test assertions outside the requested SSR contracts, or timeouts are relaxed.
