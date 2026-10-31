Run only during a separately authorized Smoke A/B session. This script has **not** been run for the code-only Rocky fixes. It creates no deployment, moves no alias, changes no environment and accesses no database directly. All measurements use read-only demo fixtures; non-GET/HEAD requests and third-party application/provider hosts are blocked. Navigation defaults are prevented: the tap metric covers trusted input dispatch through control/click processing and the following presentation opportunity, rather than a destination's page-load latency.

Supply three already-created, immutable deployments belonging to the Smoke project:

```json
{
  "runs": 5,
  "candidate": { "origin": "https://CANDIDATE.vercel.app", "sha": "FULL_FIXED_SHA" },
  "legacy": { "origin": "https://SSR_OFF.vercel.app", "sha": "FULL_LEGACY_COHORT_SHA" },
  "baseline53": { "origin": "https://BASELINE.vercel.app", "sha": "53c43d0bc2f8033066bb56aad2ecdbd1c91bf90f" }
}
```

Use the runner's existing server-side Vercel API credential and, if required, its automation access credential through `VERCEL_TOKEN` and `VERCEL_AUTOMATION_BYPASS_SECRET`. Never put either in the config or command line. The script consumes those values internally; raw metadata, headers, credentials and browser errors are never printed or persisted. Alias and deployment metadata are read through one strict field-selection wrapper. Only the Smoke alias is inspected, without modifying it. The project ID, exact SHAs, READY state and immutable hostname must match before browser access. Mutable Smoke aliases and all Live origins are rejected. The candidate must serve SSR with the review label; the legacy cohort must serve the non-SSR root.

```sh
PLAYWRIGHT_MODULE=/path/to/playwright node scripts/qa/ssr-smoke-ab.cjs /tmp/ssr-ab-config.json /tmp/ssr-ab-results.json
```

The runner uses Chromium on desktop (1440×900, 20ms, 10Mbps, 1×CPU) and phone (390×844, 80ms, 1.6Mbps, 4×CPU), with a fresh context and disabled cache per sample. Five or more alternating runs are mandatory. Pause, Play, sound, primary navigation and primary CTA are tested on both Amethyst and Fall Owl in candidate and legacy, separately for each device. The metric starts at the trusted pointerdown event timestamp and ends at the second animation frame after click processing, conservatively covering the next paint opportunity. A Pause/Play/sound action must change its actual pressed state; links must receive a trusted click with an href. A finished legacy video is restarted before the measured Pause action. The native nav/CTA defaults are prevented for provider safety; destination speed is not asserted. Selectors can be overridden with `selectors[renderer][theme] = {motion,sound,nav,cta}` for an existing legacy cohort's class names. Missing controls or incomplete samples fail closed.

Each device/control/cohort median must be ≤200ms. All seven named pages' FCP medians must be no slower than the pinned `53c43d0b` cohort; Alpine Opal Trade's LCP median must be no slower than legacy. Page load/font readiness and a further 12-second observation window precede timing capture. Any absent/invalid measurement, missing cohort, navigation error or page exception fails the run. Output includes the complete samples, sanitized provenance and every gate; a failed gate exits nonzero. Do not merge or release on a failed/incomplete run.

Fixture routes are `/dudesfizzfest[/{join|trade}]?ssrReviewTheme=…&ssrReviewLayout=standard`, with `mile_high_fizz` for Alpine Opal Trade. The existing preview/project/demo/database restrictions remain intact. Repeating the script resets browser contexts; it needs no data reseed and submits no forms. Offline gate tests run with `npx vitest run tests/ssr-smoke-ab-gates.test.ts` and never contact Vercel or Smoke.
