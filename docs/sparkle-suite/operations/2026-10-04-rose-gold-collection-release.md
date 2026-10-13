# Rose Gold collection release — October 4, 2026

Louis approved the collection for Community use, then clarified that the
existing Rose Gold theme must keep RG-01. The already approved Rose Champagne
design and animation are assigned RG-04; they are not redesigned or regenerated.

| Code | Label | Stable preset ID | Release behavior |
| --- | --- | --- | --- |
| RG-01 | Rose Gold | `rose_gold` | Original appearance restored from exact Git source `2e20ab4459ef3ff5b694bb63246ac349fb68adc3`. |
| RG-02 | Midnight Rose | `midnight_rose` | Approved design and animation retained. |
| RG-03 | Pearl Rose | `pearl_rose` | Approved design and animation retained. |
| RG-04 | Rose Champagne | `rose_champagne` | Approved Champagne design and animation retained under an independent identity. |

Existing accounts are not automatically switched. RG-04 carries the original
base `bg-rose-gold-paper` class as well as its unique `bg-rose-champagne` gate,
preserving inherited Trade pill styling. Champagne overrides and video runtime
require the new gate and preset ID. Original RG-01 receives neither. The
Amethyst layout, content, typography, header, tickers and Live Lineup are unchanged.

All approved video/poster bytes remain unchanged. No new Higgsfield request,
charge reservation or generation is made for renumbering. Existing media
provenance remains in each theme's asset directory; Champagne's historical
RG-01 references describe its creation before this identity clarification.

## Preserve existing Live work

Live deployment `dpl_G1eCPC2snLrBKBWkHyNAMHBRTQ8x` records an unpublished
local commit `9c94189a622c4b4ec6e679a1e758da6d7f0851c7`. Its uploaded source
was inspected before changing production. Of 2,627 input files, 2,614 matched
the exact `2e20ab44` baseline; the thirteen differences were identified.

The eleven non-archive differences were recovered from GitHub and verified
against the actual Live input SHA-1 hashes before incorporation:

- Coffee/help source and tests: PR 53, `e36a3d11515d89eef1fc537dd4a1eca5f0cd4ccd`.
- Existing read-only LOC launch-notify source, tests and environment example:
  PR 63, `b33602aaa440ddf056b29e484261bc82f45d1ebf`.

The existing LOC test also requires its original Finder schema file. That file
is restored from PR 63 solely as a source/test dependency; `apps/finder/` is
excluded from the Suite deployment. No Finder database migration or deployment
is performed. The two retiring vault diary files are not copied into this release.

## Database and release sequence

The three additive migrations `20261004000100`, `20261004000200`, and
`20261004000300` add Community catalog rows for Midnight, Pearl and Champagne.
They preserve every previous allowed preset, guard conflicting policies and do
not update existing account selections. Apply only the missing migrations to
the confirmed target database, with bounded locks, then verify policies,
selection counts and migration history.

Verify the revised identity on Smoke first. Live requires a fresh build of the
reviewed GitHub source using Live configuration; never promote a Smoke artifact.
Preserve existing Live cron definitions, Git auto-deploy setting and domain
redirects. Confirm both Suite domains and the existing customer-domain aliases
resolve to the exact fresh deployment after release.

## Repeatable review

1. Open the theme sample paths under `/skin-preview/rose_gold/homepage`,
   `/skin-preview/midnight_rose/homepage`, `/skin-preview/pearl_rose/homepage`
   and `/skin-preview/rose_champagne/homepage`; use their Dance Floor, Join and
   Preferences tabs. Sample previews are labeled and do not submit real orders
   or marketing consent. Reload resets unsaved preview state.
2. Using the established synthetic reviewer, open
   `/nic-nac?section=site-settings`. Confirm all four distinct codes/labels,
   select and save RG-04, then reload. Verify the original RG-01 remains separate.
3. Check the synthetic customer page at phone/tablet/desktop widths, video
   Pause/Play, Still and reduced motion, and navigation to the other pages.
4. Restore the reviewer's recorded prior theme/motion values and save/reload.

Use synthetic accounts and block provider/customer side effects. Do not reset
credentials, enable protected reviewer controls, or use a personal account to
work around unavailable reviewer access. Record any unavailable signed-in Live
check explicitly rather than claiming it passed.

Builder verification: 413 unique assertions across 22 files, TypeScript,
scoped lint (one existing warning), Join rebuild, and all eleven original
layout locks passed. Existing Coffee/help/LOC tests were also run; the initial
missing schema-fixture failure was resolved by restoring its exact Git source.
Final independent review, deployed verification and release provenance are
recorded separately in Core Memory.
