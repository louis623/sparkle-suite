# Sparkle Suite Live Lineup 2.0 full-session historical closeout

Date: September 15, 2026  
Repository: `C:\Users\louis\sparkle-suite-repo`  
GitHub: `louis623/sparkle-suite`  
Authoritative branch: `codex/nic-nac-trade-hardening`

## Executive outcome

The multi-session Live Lineup reliability program moved from a fragile
name-array scraper into a versioned, tenant-scoped Live Lineup 2 system across
the Chrome extension, database, application APIs, Workspace, and public
customer sites. Chrome Web Store extension 2.0.0 is Published - unlisted. The
two additive Live Lineup migrations and the compatible application are live.
The Workspace homepage now visibly includes the promised bounded, scrollable
Live Lineup card beside Nic-Nac, with rep-controlled reordering and recovery
actions. GitHub and Vercel branch controls now point to the same sole
authoritative branch.

The final verified production application remains deployment
`dpl_DYKVKfGw58hpeseUEgfoxPVLiJtj`, built from the corrected source line that
includes `8f2ca269`. The final housekeeping commit is
`ac263b50755e09ab5489f9067a3e5347d6f6fdbb`; it changed branch controls and
documentation only and did not create a deployment or move an alias.

## Why the hardening was necessary

The September 5 weekend incident exposed several interacting weaknesses:

- Brittany's migrated account initially pointed at a newly generated unused
  queue while her extension still published to her grandfathered queue.
- An unchanged but healthy queue did not send a heartbeat because the old
  extension deduplicated the names array. At 208 seconds old, a real 35-name
  lineup crossed the 180-second public freshness cutoff and disappeared.
- Public pages loaded only an initial snapshot, so an already-open page could
  remain stale after the backend recovered.
- Checkbox changes, delayed table rendering, header/filter changes, and long
  mutation bursts could miss or postpone the old fast sync path.
- Multiple matching tabs or devices could publish competing snapshots with no
  authoritative publisher lease, show generation, or monotonic ordering.
- Temporary loading, filtered, malformed, or zero-row states could be mistaken
  for a trustworthy empty lineup and overwrite good data.
- Sender timestamps controlled freshness; public backing-table reads exposed
  more writer context than the public display required; and the popup's green
  state could overstate actual acknowledged connectivity.

The September 5 Brittany-only polling/retention mitigation was useful emergency
continuity, but it was deliberately not treated as the permanent solution.

## What was built

### Extension 2.0

- Preserves the three absolute safety rules: never refresh or navigate the Bomb
  Party page, never modify its DOM, and never show alert/confirm/prompt dialogs.
- Uses deliberate source selection and explicit party/show scope rather than
  treating every matching tab as an equal publisher.
- Separates queue parsing from publishing and distinguishes readiness states
  such as loading/not-ready/invalid/ready-empty/ready-nonempty.
- Uses a private, revocable publisher credential, ordered sequence,
  acknowledgment, retry, heartbeat, and pause state instead of the old shared
  sync-secret/name-array-only contract.
- Keeps latest-desired state through lost acknowledgments and restart, rejects
  stale generations/sequences, and prevents competing publishers from silently
  winning.
- Reports honest connecting/connected/delayed/offline/error health based on
  recent server acknowledgment rather than merely being toggled on.

### Backend and data contract

- Added tenant-scoped current lineup state, show archives, publisher tokens,
  server-authoritative timing, leases/generations, monotonic sequencing,
  idempotent mutation contracts, and rate/credential boundaries.
- Stores publisher credentials only as non-reversible hashes and supports
  expiry and revocation.
- Preserves the legacy `live_queue` table and its 27 rows for staged
  compatibility; the migration was additive rather than destructive.
- Added a read-only fail-safe compatibility mode that preserves public/legacy
  reads and revocation while disabling owner mutations and new credential
  issuance if the main application must be withdrawn.
- Added a guarded synthetic reviewer reset contract that fails closed unless
  the auth identity has the server-owned reviewer scope.

### Workspace experience

- Added the Live Lineup card to the actual `ConceptHomeWorkspace` homepage
  beside Nic-Nac on laptop-sized layouts and stacked on narrower layouts.
- The card is capped at 480px / 70dvh and scrolls internally, so a long queue
  does not extend the entire Workspace page.
- Reps can reorder customers with drag-and-drop and supported keyboard/tap
  controls, hold customers who temporarily leave, return them later, mark a
  reveal, undo it, and manage show start/end/carry-forward and archive recovery.
- Added publisher controls, pairing/readiness guidance, explicit health, and
  actionable state instead of a misleading always-green connection indicator.

### Customer-facing sites

- Home, Join, and Trade surfaces use the shared Live Lineup runtime and update
  promptly rather than depending on a single initial snapshot.
- Public output exposes only intended first names, positions, and public status.
  It does not expose order/party IDs, publisher IDs, credentials, held entries,
  or private recovery history.
- Connection freshness progresses honestly through connected, delayed, and
  offline states while last-known-good data is protected from uncertain parser
  states.
- Kelly's customer-facing lineup also received a separate branded readability
  improvement without changing the Live Lineup data behavior.

### Privacy and Store disclosures

- The Sparkle Suite `/privacy` policy was updated September 13 to accurately
  describe selected-source access, stable order/party identifiers, private
  pairing credentials, sequence/acknowledgment/health data, private archives,
  retention, revocation, and the narrower anonymous public display.
- Chrome Web Store privacy declarations were aligned with the actual 2.0
  behavior; the extension does not claim remote code and remains free/unlisted.
- Store item ID: `kmodgfffflplfdlkkhadgimmobplhoih`.

## Source, package, and release provenance

- Hardened 140-file source commit:
  `d2377d869218c4a307334681cb541f0a98fa63c7`.
- Extension manifest version: `2.0.0`.
- Strict 12-file Store ZIP SHA-256:
  `24c28df76ee5caeaa4bc08233213c5c8d0af7004b08d0b95b19274059057c129`.
- Retained emergency 1.0.1 ZIP SHA-256:
  `05e0e8d4c652dc6391522046d67abba3b1a3ed36ea127ba9511d7aa8b4dc0a0b`.
- Chrome Web Store status: Published - unlisted, version 2.0.0.
- Supabase project: `bqhzfkgkjyuhlsozpylf`.
- Additive migrations applied:
  `20260910000100_live_lineup_v2.sql` and
  `20260910000200_reviewer_live_lineup_reset.sql`.
- Exact application/source release commit:
  `6611d0a930d592b7220dc437fb0c0e39964071d2`.
- Initial 2.0 production deployment:
  `dpl_F8U8TSPb8foS2CKZ78XjzSCS4EH7`.
- Verified compatibility bridge:
  `dpl_Hn1Ha85WYXvdBTdgVxZbTBhao6Bm`.
- Workspace homepage correction commit:
  `8f2ca26990d0e184901eab64b3f5d660c38f590c`.
- Current corrected production deployment:
  `dpl_DYKVKfGw58hpeseUEgfoxPVLiJtj`.
- Preserved pre-release production reference:
  `dpl_34vLS6MRQEtnCTJ8J4fQmpfETw76`.

## Verification completed

- The frozen release gate passed 48 test files / 802 tests with one intentional
  skip on exact release source, plus the real extension-to-application E2E,
  selected lint, JavaScript syntax, prohibited navigation/DOM/dialog scans,
  diff integrity, and the exact Next.js production build.
- Earlier frozen hardening receipts also passed real PostgreSQL multi-session
  concurrency tests covering publisher races, tenant locking, issue-time caps,
  reset/issuance serialization, and stale packet rejection.
- The strict ZIP verifier binds the package to the exact committed source and
  requires all 12 expected files, including the parser/publisher helpers.
- Post-migration reads verified expected Lineup tables, functions, indexes,
  grants, RLS, and the preserved legacy table.
- Public and security smoke verified Suite/customer routes, public reads,
  unauthenticated mutation rejection, bad-origin rejection, and publisher-token
  rejection without leaking private details.
- The homepage correction added a rendered regression test that requires the
  actual default Workspace page to contain the scrollable Live Lineup region
  and visible reorder instructions. Focused correction tests passed 15 with one
  intentional skip, plus the guarded production build.
- Final live checks confirmed both Suite domains and active customer aliases on
  the corrected READY deployment; Suite www/apex and Brittany returned 200.

## Important defect found after release

The first 2.0 application deployment contained the Live Lineup component,
owner APIs, reorder logic, and styles, but the component had been mounted in an
obsolete `renderActiveWorkspaceSection()` home branch. The current homepage
uses `ConceptHomeWorkspace` through another final render path, so the promised
card was invisible. Louis's report was correct; this was neither caching nor
user error.

The obsolete branch was removed and the existing card was mounted in the real
homepage path. The durable lesson is that source-presence tests are inadequate
for user-visible promises: tests must render the actual default route and assert
the promised visible region.

## Branch and worktree reconciliation

- A later read-only deep audit covered all known branches, worktrees, remote
  history, and unreachable commits. No missing application runtime was found on
  a dead or stale branch.
- `codex/nic-nac-trade-hardening` is now the sole allowlisted active branch, the
  GitHub default, local `origin/HEAD`, and Vercel Production Branch Tracking
  branch.
- GitHub prevents force pushes and deletion while retaining Louis's normal
  direct-push workflow; no mandatory PR/status gate was added.
- Preservation tags were pushed:
  `archive/2026-09-15/nic-nac-photo-rarity-final` at `5a1aa7ec` and
  `rescue/2026-09-15/pre-release-autostash` at `9b87c752`.
- Consolidation commit `ac263b50755e09ab5489f9067a3e5347d6f6fdbb`
  passed eight focused policy tests, the branch guard, and `git diff --check`.
- Changing branch-control settings created no Vercel deployment, moved no
  alias, ran no migration, and changed no production/customer data.

## Protected and unrelated work preserved

The shared root was heavily dirty throughout this program. Release operations
used isolated exact-source clones/Codespaces. Nothing was bulk staged, reset,
cleaned, stashed, or overwritten. In particular, preserve:

- `artifacts/` and `test-results/`;
- unrelated Nic-Nac, Finder, messaging, skin, Control Center, and marketing work;
- separate secondary worktrees and their uncommitted files;
- the local `chrome-extension/` overlay, which reflects protected pre-2.0
  working evidence and must not be mistaken for the committed/published 2.0
  source or casually reset.

Any future cleanup must be task-by-task, with exact provenance and explicit
authorization. Old branches are historical evidence, not release candidates.

## Key decisions

1. Treat extension, additive schema, compatibility bridge, application, and
   customer sites as one coordinated release, scheduled only in a confirmed
   no-live-show window.
2. Stage Store review using manual publication so Google review time cannot
   force an unsafe application cutover; publish the approved client only after
   the compatible backend/application are ready.
3. Keep the migration additive and preserve legacy reads/data. Never break the
   installed 1.0.1 fleet before Store 2.0 propagation.
4. Use server time, tenant ownership, revocable hashed credentials, leases,
   show generations, and ordered idempotent packets as the authority boundary.
5. Never infer healthy connection merely from an enabled toggle or empty queue.
6. Never bypass reviewer authentication or use Louis's/customer accounts for
   acceptance testing.
7. A Git push is provenance, not a release. Manual exact-tip Vercel deployment
   and live-domain verification remain required.
8. Keep Stripe/billing incidents outside Live Lineup unless a runtime diff and
   direct evidence establish causation.
9. Maintain one authoritative active branch and preserve historical tips before
   changing branch controls; control-plane alignment is not a deployment.

## Lessons learned

- Quiet queues need independent acknowledged heartbeats; change detection and
  connection health are different facts.
- Empty is a business state, not proof that a parser is ready or a publisher is
  healthy. Loading, invalid, filtered, partial, and ready-empty must remain
  distinct.
- Multiple tabs/computers require a server-authorized publisher lease and
  monotonic ordering; browser-local locks are insufficient.
- Public presentation should use a minimal read model rather than exposing a
  writable backing identifier.
- A compatibility bridge must exist before public extension publication because
  Store rollback is neither instantaneous nor guaranteed across every browser.
- Package verification must bind exact source files and helper dependencies,
  not merely check the manifest version or ZIP filename.
- Release from clean isolated source when a shared workspace is dirty. Never
  make unrelated work disappear for convenience.
- User-visible acceptance must exercise the actual route/render tree. A
  component existing in source or a test inspecting strings does not prove the
  feature is visible.
- Post-release telemetry may expose unrelated debt. Compare runtime diffs before
  blaming the release.
- Chrome/Web Store automation is inherently restricted. Use visible confirmation
  and never claim upload, review, or publication from an unconfirmed click.

## Explicit residual items

- Do not claim signed-in Workspace visual acceptance yet. The protected
  synthetic reviewer identity lacks the required server-owned
  `sparkle-suite-reviewer-v1` metadata; correcting it is a separate,
  exact-identity migration requiring explicit approval.
- In a future no-show window, confirm a naturally updated Store-installed
  browser reports 2.0.0 and run the authorized real Bomb Party proof. Do not
  force an extension reload during a show.
- Investigate the isolated failed Stripe `customer.subscription.updated`
  webhook separately. The released Lineup runtime did not modify the webhook
  handler, and no billing/customer mutation is authorized by this record.
- Reconcile unrelated dirty root files and secondary worktrees only in future
  explicitly scoped sessions. Do not bulk clean them.

## Safety boundary of this historical closeout

This record itself performs no deployment, migration, Store change, extension
install/reload, queue mutation, account action, billing action, DNS change, or
customer-data change. It consolidates already-verified history for future
operators and agents.
