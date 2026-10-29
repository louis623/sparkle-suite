# Combined SSR + Finder candidate — completed local gates

This is intermediate evidence, not release acceptance. Smoke only; no Live release is authorized.

Source: `louis623/sparkle-suite`, branch `codex/release-ssr-finder`.
Verified remote base: `cb4f48608a6c31282df597b02ef7c4a3cd74b2c5`.
Merged exact heads: `afd182466dfd83709b9ca90bc7c6c57aa1ab2f70` and `0c2167b4`.
Merge commits: `2236e5c0` and `71d49eb5`; no conflicts.
Allowlist commit: `c4e66b41083c7d8526ad59448011552bf5697409`.

- All 20 required input commits are ancestors of the candidate.
- The application diff against `afd18246`, excluding vault and the allowlist, is empty.
- The allowlist diff against `cb4f4860` contains exactly one active branch entry and one Smoke preview rule. No other policy changes remain.
- The original dirty checkout was preserved. Candidate work uses an isolated clean checkout from the fetched remote base.
- `npm ci`: exit 0, 571 packages added. Existing dependency audit reports 33 advisories: 7 low, 11 moderate, 12 high, 3 critical. No dependency changes or audit fixes were made.
- `npm run build`: exit 0 in 119.131 seconds, using dummy credentials and the guard's supported manual Smoke-preview provenance. No guard bypass.
- Whole-project tracing warning matches: **0**. Manifests measured: **250**. Missing traced files: **0**.
- Standalone TypeScript check: exit **0**, 59.870 seconds.
- Lint: base **203 errors / 1,506 warnings**; candidate **213 errors**. Exactly **10** additional errors, all within the explicitly permitted set. Diagnostics were compared after normalizing checkout paths and code-frame line offsets; no lint run was repeated.

Build-generated line-ending differences were restored to the exact committed source bytes before the remaining gates. Build logs and trace measurements describe the actual completed build.

## Function trace sizes

Sizes sum the files listed relative to each `.nft.json`. MB is decimal; MiB is binary.

| Trace under `.next/server` | Files | Bytes | MB | MiB |
|---|---:|---:|---:|---:|
| `app/[publicSiteSlug]/route` | 478 | 54,044,419 | 54.044419 | 51.540774 |
| `app/[publicSiteSlug]/trade/route` | 478 | 54,044,458 | 54.044458 | 51.540812 |
| `app/[publicSiteSlug]/join/route` | 478 | 54,044,781 | 54.044781 | 51.541120 |
| `app/[publicSiteSlug]/in-the-pantry/route` | 478 | 54,044,625 | 54.044625 | 51.540971 |
| `app/customer-site/[page]/route` | 478 | 54,046,353 | 54.046353 | 51.542619 |
| `app/amethyst/[...asset]/route` | 478 | 54,044,001 | 54.044001 | 51.540376 |
| `app/api/public/finder/reps/route` | 219 | 4,147,855 | 4.147855 | 3.955703 |
| `app/api/public/finder/availability/route` | 219 | 4,149,012 | 4.149012 | 3.956806 |
| `app/api/public/finder/live-shows/route` | 219 | 4,147,337 | 4.147337 | 3.955209 |
| Largest: `app/control-center/support/[sessionId]/page` | 770 | 140,697,711 | 140.697711 | 134.179793 |

All six requested rep-related functions are below 60,000,000 bytes. The largest is below 250,000,000 bytes.

## Each additional lint error

| File | Line | Rule | Diagnostic |
|---|---:|---|---|
| `lib/amethyst/v2/join.jsx` | 1198 | `react/no-unescaped-entities` | Unescaped apostrophe |
| `lib/amethyst/v2/join.jsx` | 1201 | `react/no-unescaped-entities` | Unescaped apostrophe |
| `lib/amethyst/v2/join.jsx` | 1203 | `react/no-unescaped-entities` | Unescaped apostrophe |
| `lib/amethyst/v2/join.jsx` | 1348 | `react/no-unescaped-entities` | Unescaped apostrophe |
| `lib/amethyst/v2/join.jsx` | 1438 | `react/jsx-no-undef` | `window` is not defined |
| `lib/amethyst/v2/trade.jsx` | 1523 | `react-hooks/immutability` | This value cannot be modified |
| `lib/amethyst/v2/trade.jsx` | 1733 | `react-hooks/immutability` | This value cannot be modified |
| `lib/amethyst/v2/trade.jsx` | 1907 | `react/no-unescaped-entities` | Unescaped apostrophe |
| `lib/amethyst/v2/trade.jsx` | 1924 | `react/no-unescaped-entities` | Unescaped apostrophe |
| `lib/amethyst/v2/trade.jsx` | 2110 | `react/jsx-no-undef` | `window` is not defined |

Full-suite results, timing-file reruns, PR, deployment, alias move and browser acceptance must be recorded separately after completion. None is implied by this note.

## Completed baseline suite

The exactly-once full suite on `cb4f4860` completed in **1,692.842 seconds**: **5,687 total, 5,598 passed, 84 failed, 5 skipped**, across **720 files**. There are 84 failed assertion names and two failed files without failed assertion names (`tests/remy-communications-schema-contract.test.ts` and `tests/prelaunch/prelaunch-crawl-metadata.test.ts`). These file-level errors must also be compared against the candidate.

The existing flyer suite consumed **790.894 seconds** and reported one failure among 42 tests. The full suite was not restarted or repeated. The candidate is run separately on the same PC, with the same installed lockfile dependencies, dummy-only environment and `--maxWorkers=1`. Vitest's default cached sequencing is retained; it prioritizes prior failures and longer files.

## Completed candidate comparison and requested rerun

The exactly-once candidate suite completed in **1,713.444 seconds**: **5,987 total, 5,895 passed, 87 failed, 5 skipped**, across **723 files**. The 84 baseline failed names remain; none resolved. The two file-level load errors are unchanged. Exactly three additional failed names appear, all explicitly permitted by the prompt:

- `tests/amethyst-ssr-fallback.test.ts`: “keeps SSR when a cold template read exceeds the old 1.5 second total budget”.
- `tests/amethyst-ssr-fallback.test.ts`: “keeps SSR when the first renderer load takes longer than the former safety budget”.
- `tests/amethyst-ssr-required-pages.test.ts`: “returns an explicit temporary error instead of legacy HTML on mandatory render failure”.

The two specified files were rerun once with `--testTimeout=90000`: **18 tests, 14 passed, 4 failed, 0 skipped**, **208.619 seconds**. All **7/7 frozen-Live hash tests pass**: milehighfizz, brisglowtique, goforthebling, brittwithbling, theblingkitchen, blingwithkrissig and sparklybutterflies. The required-pages file passes **3/3**.

The rerun remains red: both existing bootstrap throw/timeout cases and the two explicitly permitted cold-render cases fail. The cold cases return HTML without the SSR marker under this dummy-credential test setup. These are material limitations, not a fully green suite. No unlisted failed name appears. The user's stated comparison/hash criterion passes; actual Smoke browser acceptance is still required before calling the candidate accepted.
