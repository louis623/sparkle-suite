# Nic-Nac Photo/Rarity Isolated Release Scope

**Status:** implemented, migrated, repaired, released, and verified from the
isolated branch. The protected Live Lineup/Kelly work remained excluded.

## Provenance boundary

- Repository: `C:\Users\louis\sparkle-suite-repo`
- GitHub: `louis623/sparkle-suite`
- Pre-Lineup base: `d77b64a2b3a760f75fbaa61bf05c5b871706756a`
- Protected remote commits that must remain undeployed:
  - `d2377d869218c4a307334681cb541f0a98fa63c7` — Live Lineup hardening
  - `89087998686952a0347f4391f7028e7a3ad657db` — Live Lineup privacy updates
- Intended isolated branch after owner approval:
  `codex/nic-nac-photo-rarity-repair`

The exact release allowlist is
`tests/manifests/nic-nac-photo-rarity-release.txt`. Any path outside that file
is excluded. The allowlist is sorted, unique, and tested against protected
Live Lineup, extension, reviewer-smoke, required-setup, Kelly, and site paths.

## Overlapping files requiring selective extraction

Only these two intended files were also changed by the protected commits
between the pre-Lineup base and the current remote tip:

1. `lib/services/types.ts`
2. `tests/amethyst-trade-template.test.ts`

Their Nic-Nac rarity/photo hunks must be applied onto the pre-Lineup base
without the Live Lineup hunks. They may not be copied wholesale from either
the dirty checkout or the protected remote tip. Every other implementation
file in the allowlist can be transferred as a whole-file Nic-Nac change after
confirming its base hash.

Pinned blob lineage and permitted selective changes:

- `lib/services/types.ts`: base blob `e28a262ba6b30e8d4c5353f09ea17a12d6edd548`,
  protected-tip blob `e982a318410257801d8f5dfe89e3de214a1aebe9`, isolated
  release blob `6365a30fffa58ca674270828a489f3a92cbaef65`. The only
  permitted additions are `JewelryRarityClassification` and its fields on the
  listing design/listing, catalog/non-item add inputs, resolved design, and
  design-creation input contracts.
- `tests/amethyst-trade-template.test.ts`: base blob
  `a69e3c55538993c1db73bd36a794eab7e46fca4f`, protected-tip blob
  `9357b5c5f47fd3f7ec2b1340463a93bf0ca75274`, isolated release blob
  `e416d27f3358d00541ea552cd6b529619d76ec23`. The only permitted changes
  make descriptive Diamond wording expect the ordinary tier and add explicit
  Diamond/Unicorn classification assertions.

`public/amethyst/trade.jsx` was initially investigated because it is present
in the protected commit and contains tier UI language. Its working bytes have
no Nic-Nac-only delta relative to the protected tip, so it is deliberately not
in this release.

## Explicit exclusions

- Every Live Lineup application, migration, test, extension, package, and
  release-runbook file.
- Reviewer-smoke Live Lineup reset/identity work.
- Required-setup Live Lineup components and routing.
- Kelly account, onboarding, site, domain, or customer data.
- `sites/`, `.codex-policy-update/`, `logo/`, generated Amethyst join runtime,
  email signatures, `artifacts/`, `test-results/`, and unrelated vault history.
- Package-lock/package changes unless a fresh isolated build proves a new
  dependency is actually required. The current implementation uses existing
  dependencies and does not require one.

## Release gates after branch authorization

1. Create the coordinated active branch from the exact pre-Lineup base and
   update the branch register, machine allowlist, GitHub default, and Vercel
   production branch together.
2. Apply only the allowlisted whole files and the two reviewed selective
hunks. Confirm the resulting diff contains no excluded path or protected
   behavior.
3. Run branch safety, focused Suite/Finder tests, full relevant regression,
   selected lint, TypeScript/builds, migration contract tests, dry-run repair
   hash checks, and a clean-checkout production build.
4. Commit and push the exact verified isolated tip. Confirm Git push creates no
   automatic deployment.
5. Apply only migration
   `20260913000100_nic_nac_photo_rarity_hardening.sql`, then manually deploy
   that exact commit and bind both customer domains to the same deployment.
6. Run the supported synthetic reviewer workflow on the live domain, including
   label readability, clear boxed jewelry, photo-role separation, centering,
   consecutive distinct submissions, and Standard/Diamond/Unicorn behavior.
7. Apply the 11-row Heather manifest and one-row ER38483 manifest with the
   explicit apply token. Read back database rows and published hashes.
8. Re-audit all 58 current listing dispositions and visually confirm the nine
   corrected public cards. Retain before/after receipts; do not rewrite the 49
   listings already verified correct.

## Completed release evidence

- The branch was created from the pinned pre-Lineup base, pushed, and made the
  coordinated GitHub/Vercel production branch. The two protected Live Lineup
  commits and their routes are absent from the release.
- Suite verification passed 1,221 Nic-Nac tests (one intentional skip), the
  configured 245-test suite, a 20-test route-context set, the focused release
  set, and a production build. Finder passed 778 tests, lint, and its
  production build.
- Migration `20260913000100_nic_nac_photo_rarity_hardening.sql` was applied
  directly and recorded without rewriting the unrelated remote-only migration
  ledger. Readback found zero non-standard design or listing classifications.
- The guarded manifests processed 12 reviewed rows: nine exact photo
  replacements and three explicit retains. Every row passed identity, hash,
  published-object, and database-readback checks. No other row was eligible
  for mutation.
- The post-repair audit still contained all 58 current listings. Disposition:
  nine repaired, three explicitly retained, and 46 untouched. Ten complete
  contact-sheet pages were visually reviewed; every current public photo was
  jewelry-facing, clear, presentable, and adequately centered. Remaining exact
  duplicate groups are six same-item-number physical duplicates, never
  cross-item photo reuse.
- A disposable Suite reviewer completed label OCR, boxed jewelry-photo
  acceptance, an explicit Standard rarity answer, and Dance Floor publication
  on the canonical live domain. The created listing and reviewer records were
  removed by the smoke cleanup.
- The first Finder alias attempt exposed an empty deployment because the root
  `.vercelignore` excluded `apps/finder`. Direct canonical checks caught the
  404 before closeout. The corrected monorepo-root upload produced a full
  Finder build and restored `/` and `/auth/sign-in` to HTTP 200; an anonymous
  Nic-Nac POST fails closed with HTTP 401. The secured model smoke remains
  unavailable to the terminal because its production bearer is intentionally
  write-only; no personal or customer account was substituted.
