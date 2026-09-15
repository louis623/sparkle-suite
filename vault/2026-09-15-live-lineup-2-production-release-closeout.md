# Sparkle Suite Live Lineup 2.0 production release closeout

Date: September 15, 2026

## Outcome

Sparkle Suite Live Queue extension 2.0.0 is published as the unlisted Chrome
Web Store item `kmodgfffflplfdlkkhadgimmobplhoih`. The additive Live Lineup 2
database contract and the exact verified application source are live on the
Sparkle Suite customer domains. The release was performed only after Louis
confirmed there were no active shows.

No personal or customer account was used. No billing, email, DNS, customer
queue, Some Dude AI, or unrelated customer-data change was made. The large
unrelated dirty workspace—including `artifacts/`, `test-results/`, Nic-Nac,
Finder, messaging, skin, and Control Center work—was not reset, cleaned,
stashed, staged, or overwritten. Release work used isolated clean clones.

## Immutable provenance

- GitHub: `louis623/sparkle-suite`
- Release branch: `codex/nic-nac-trade-hardening`
- Exact released app/source commit:
  `6611d0a930d592b7220dc437fb0c0e39964071d2`
- Release-history repair commit message: `chore: restore applied migration history`
- Chrome extension source commit:
  `d2377d869218c4a307334681cb541f0a98fa63c7`
- Extension 2.0.0 ZIP SHA-256:
  `24c28df76ee5caeaa4bc08233213c5c8d0af7004b08d0b95b19274059057c129`
- Retained emergency 1.0.1 ZIP SHA-256:
  `05e0e8d4c652dc6391522046d67abba3b1a3ed36ea127ba9511d7aa8b4dc0a0b`
- Production deployment: `dpl_F8U8TSPb8foS2CKZ78XjzSCS4EH7`
- Production deployment URL:
  `sparkle-suite-ar6pi307c-louis-2849s-projects.vercel.app`
- Compatibility bridge deployment: `dpl_Hn1Ha85WYXvdBTdgVxZbTBhao6Bm`
- Preserved previous production deployment: `dpl_34vLS6MRQEtnCTJ8J4fQmpfETw76`

The three migration files added by `6611d0a9` restore exact Git source for
migrations already present in production history; they do not represent new
database changes. Their production SQL was byte-verified after normalizing the
two trailing newline bytes.

## Database release

Linked Supabase project: `bqhzfkgkjyuhlsozpylf`.

The dry run required `--include-all` because the two approved timestamps
precede later recorded migrations. The dry run listed only, and the release
applied only:

- `20260910000100_live_lineup_v2.sql`
- `20260910000200_reviewer_live_lineup_reset.sql`

Post-apply history matched the repository. Read-only verification confirmed
RLS on `live_lineup_states`, `live_lineup_show_archives`,
`live_lineup_publisher_tokens`, and the preserved legacy `live_queue`; all six
expected Lineup functions and the expected indexes exist. The legacy table was
preserved with its 27 rows.

## Verification evidence

On exact commit `6611d0a9`, the branch guard passed, 48 test files passed, 802
tests passed with one intentional skip, the real extension-to-app E2E passed,
selected Lineup lint passed, `git diff --check` passed, and the exact Next.js
production build passed. The full two-session PostgreSQL concurrency harness
could not be rerun in the clean Codespace because `initdb`/`pg_ctl` are absent;
its wrapper passed and the core/migration bytes were unchanged from the frozen
receipt whose harness passed.

Both `https://www.yoursparklesuite.com` and the apex resolve to the exact new
deployment. Landing, privacy, Brittany platform/custom-domain home, join, and
trade routes returned 200. The public lineup API returned 200. Publish without
a token returned 401, invalid origin returned 403, and an unauthenticated
Workspace mutation returned 401. The compatibility bridge returned the
expected public/offline behavior and rejected an unauthenticated publisher.

## Explicit limitations and follow-up

1. The protected synthetic Workspace smoke reset stopped safely with
   `REVIEWER_SMOKE_IDENTITY_MIGRATION_REQUIRED`. The existing reviewer auth
   identity lacks the required server-owned `sparkle-suite-reviewer-v1` scope.
   Do not reset a password, auto-retag it, use Louis's account, or use a
   customer account. A separate exact-identity migration requires explicit
   approval before the logged-in visual smoke can be completed.
2. One live Stripe `customer.subscription.updated` webhook event failed with
   the pre-existing handler's non-Error `Unknown error` path. It was the only
   failed webhook event in the inspected 24-hour window and recorded three
   attempts. The application runtime diff between previous production
   `4071ff55` and released `6611d0a9` contains no webhook or other runtime file,
   so this is not a Live Lineup release regression. Investigate separately;
   do not mutate billing or customer data as part of this closeout.
3. Chrome blocks automation of its own Web Store surfaces, so the published
   dashboard state was visibly confirmed but the installed Store copy's update
   cycle was not forced or reloaded. Do not force an extension reload during a
   show.
4. GitHub/default-production branch consolidation remains separate. The
   temporary photo-rarity branch has a unique docs-only Vault commit while the
   full application history is on the trade-hardening branch. Do not delete,
   merge, or change GitHub/Vercel branch settings without Louis's explicit
   coordinated approval and without first preserving the dirty local work.

## Lessons retained

- Release from an isolated exact-commit clone when the shared workspace is
  dirty; never clean or stage unrelated work to make a release convenient.
- Treat the extension, additive database contract, compatibility bridge, and
  active application as one coordinated release with explicit no-show timing.
- A Git push is provenance only. Manual Vercel deployment and exact alias/live
  verification are required.
- A safe reviewer fixture must fail closed when its auth metadata does not
  match the supported identity contract.
- Post-release error scans can surface unrelated operational debt. Prove the
  runtime diff before attributing a coincident error to the release.

## September 15 post-release Workspace visibility correction

Louis correctly reported that the promised Live Lineup side card was not
visible on the Workspace homepage. The component, owner APIs, drag/drop logic,
and bounded internal scroller were deployed, but the card had been placed in
an obsolete `renderActiveWorkspaceSection()` home branch. The current homepage
uses `ConceptHomeWorkspace` through a separate final render path, so the old
branch was unreachable. This was a real release defect, not browser caching or
rep error.

The obsolete branch was removed and the existing `LiveLineupCard` was mounted
beside `ConceptHomeWorkspace` in the actual homepage path. Desktop uses the
existing two-column `homeWithLineup` grid; widths at or below the existing
740px container breakpoint stack to one column. The card remains capped at
480px / 70dvh with its own vertical scroller, so a long queue does not extend
the Workspace page unnecessarily.

Regression coverage now renders the default Workspace homepage and requires
both the `Scrollable live lineup` region and the visible drag/reorder
instructions. Focused Workspace/compatibility tests passed (15 passed, one
intentional skip), the active-branch guard passed in the authorized clean
Codespace, `git diff --check` passed, and the exact Next.js 16.2.1 production
build passed.

- Fix commit: `8f2ca26990d0e184901eab64b3f5d660c38f590c`
- Corrected production deployment: `dpl_DYKVKfGw58hpeseUEgfoxPVLiJtj`
- Deployment URL: `sparkle-suite-ez8ygv1ek-louis-2849s-projects.vercel.app`

All Suite and active customer aliases resolve to the corrected READY
deployment. The Suite apex redirects to `www`, Suite and Brittany public checks
returned 200, and the corrected deployment's post-release scan found no HTTP
500 responses. Logged-in visual smoke still requires the separately approved
synthetic reviewer identity migration; no personal or customer account was
used to bypass that boundary.
