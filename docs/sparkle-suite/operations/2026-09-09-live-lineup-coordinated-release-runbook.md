# Live Lineup coordinated release and rollback runbook

Status: **prepared only; not authorized or executed**
Owner gate: Louis must approve each release phase and confirm that no live show is running.

## Release objective

Release the additive Live Lineup v2 database, the compatible Sparkle Suite application, and the compatible Sparkle Suite Live Queue extension without interrupting an active show or stranding new required-setup users between incompatible versions.

This is one coordinated release. A green source build is not permission to push, migrate, deploy, package, upload, submit, publish, install, reload, or change a live queue.

## Immutable safety boundaries

- Work only from `louis623/sparkle-suite`, branch `codex/nic-nac-trade-hardening`.
- The final release authority is one exact, tested, committed Git SHA. Do not release a dirty tree.
- Extension source, packaging, and Store work occur only in the approved GitHub Codespace.
- Never touch the Some Dude AI extension or listing.
- Never reload, navigate, or mutate the Bomb Party page from the content script; never use `alert`, `confirm`, or `prompt`.
- Preserve the legacy `live_queue` table, legacy extension package/version, v1 data, prior Vercel deployment, and additive v2 schema as rollback evidence.
- Never drop or reverse the additive migration during an incident. Roll application/extension behavior back while leaving history intact.
- Use the supported synthetic reviewer path. Do not use Louis's personal account or a customer account and do not bypass authentication.
- `www.yoursparklesuite.com` is the canonical live review target; the apex must resolve to the same deployment.

## Why Store review comes first

The new required-setup flow requires a verified v2 publisher. Existing completed accounts remain valid, but a new setup user cannot finish that step with the currently published legacy extension. The compatible Store update must therefore be reviewed and **staged for manual publishing** before the database/application cutover.

Chrome's current documented staged-publish flow leaves the existing published version unchanged during review. After approval, the staged version can be manually published within 30 days. Do not select automatic publish-on-approval. References:

- <https://developer.chrome.com/docs/webstore/update#submit-the-update>
- <https://developer.chrome.com/docs/webstore/api/reference/rest/v2/publishers.items/publish>
- <https://developer.chrome.com/docs/webstore/rollback>

## Release record — fill before action

| Evidence | Required value |
| --- | --- |
| Local repo | `C:\Users\louis\sparkle-suite-repo` |
| GitHub repo | `louis623/sparkle-suite` |
| Branch | `codex/nic-nac-trade-hardening` |
| Final combined Git SHA | `TBD — must equal pushed branch tip and deployed source` |
| Prior production deployment ID and URL | `TBD — capture before any deploy/alias action` |
| Suspected/failed new deployment ID and URL | `TBD — preserve before any alias rollback` |
| Tested v2 compatibility-bridge deployment | `TBD — must retain /api/live-lineup/publish if the Store update has shipped` |
| Intended Vercel project | `sparkle-suite` / `prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3` / `team_kvcmZ4RlZB0Hah65NE3280x5` |
| Production domains | `www.yoursparklesuite.com`, `yoursparklesuite.com` |
| Supabase project | `neon-rabbit-core` / `bqhzfkgkjyuhlsozpylf` |
| v2 migration SHA-256 | `ee7e7eb9aa644f11e57d5e44188a09859d09ac3480407f8c2e434629f79ee4a0` |
| Reviewer-reset migration SHA-256 | `c00cdf7c16b3f5ff854df3a89b610fc47e6a74f07602d943f8c6aafea7397f57` |
| Store item ID | `kmodgfffflplfdlkkhadgimmobplhoih` |
| Currently published extension version | `1.0.1` — read-only verified September 12, 2026 on public item `kmodgfffflplfdlkkhadgimmobplhoih` (listing updated June 13, 2026) |
| Staged extension version | `2.0.0` release candidate; not uploaded, submitted, approved, or published until the corresponding receipt fields below are completed |
| Extension ZIP SHA-256 and file inventory | `TBD` |
| Previous-version emergency package SHA-256 | `TBD — required recovery artifact, not instant fleet rollback` |
| Store review/staged status | `TBD` |
| Known production/live-show browser profiles | `TBD — owner and intended next-show time for each` |
| Exact package verifier | `scripts/verify-live-lineup-extension-package.mjs` + `tests/manifests/sparkle-live-lineup-extension-package.txt`; focused adversarial unit gate passes, final ZIP receipt remains `TBD` |
| Consolidated extension-to-app E2E harness | Passed in the approved combined Codespace checkout at base HEAD `d77b64a2`; rerun after every source change and against the final committed SHA |
| Quiet-window start/end and approver | `TBD` |

Stop if any target differs. An opened dashboard, a remembered deployment, or a matching page title is not proof.

## Phase 0 — quiet-window and provenance gate

- [ ] Louis explicitly confirms no live Sparkle Suite show is running and authorizes the named phase.
- [ ] Read `AGENTS.md`, all four current Vault memory files, `LIVE_EXTENSION_SAFETY.md`, the production-smoke skill, and the July 31 production rollback/checkout incident.
- [ ] Verify local path, remote, allowlisted branch, local HEAD, origin tip, and dirty/staged files.
- [ ] Inventory every Lineup file and classify shared files/hunks; preserve unrelated `sites/`, `artifacts/`, `test-results/`, Finder, LOC, and Control Center work.
- [ ] In the Codespace, record branch/HEAD and SHA-256 fingerprints for all ten protected extension/test files before consolidation.
- [ ] Inspect GitHub branch/default-branch state, Vercel production branch/project, Supabase project/migration list, and the exact Sparkle Suite Store item. Do not open or edit Some Dude AI.
- [ ] Report and capture repo path, remote, branch, exact HEAD, Vercel project, currently served immutable deployment ID/URL, every alias/domain that could move, and any suspected/failed new deployment ID/URL before changing an alias.
- [ ] Confirm the installed production extension version and that no test/unpacked copy is active in a live-show profile.
- [ ] Inventory every known production/live-show browser profile, its Store-installed extension ID/version, owner, and next intended show. Do not inspect cookies, saved passwords, or personal data.

Any mismatch, active show, unexpected auth/checkout, dirty-file ambiguity, or unavailable rollback target is a stop condition.

## Phase 1 — consolidate and freeze one source SHA

Use the approved Codespace as the combined release workspace so the protected extension is never copied into or edited from the local binder.

The ten protected Codespace paths are exactly:

- `chrome-extension/background.js`
- `chrome-extension/content.js`
- `chrome-extension/manifest.json`
- `chrome-extension/popup.css`
- `chrome-extension/popup.html`
- `chrome-extension/popup.js`
- `chrome-extension/publisher-client.js`
- `chrome-extension/queue-parser.js`
- `scripts/live-lineup-pg-concurrency.mjs`
- `tests/sparkle-extension-worker-v2.test.cjs`

1. Produce a scoped patch of the local application/migration/test changes. Exclude unrelated files and secrets.
2. Apply and review that patch in the Codespace without overwriting the protected extension draft. Recompute the protected-file fingerprints and explain every intended difference.
3. Resolve shared-file hunks deliberately. Do not use a broad checkout, reset, clean, or copy operation.
4. Bump the Sparkle Suite extension manifest to a version greater than the currently published version only after Louis authorizes package preparation.
5. Run the exact frozen gates. Store their complete outputs and hashes against the final SHA:
   - consolidated-checkout note: the current application-only baseline is 48 files / 801 tests (800 passed, 1 intentionally skipped); the frozen September 8 v1 defect-characterization audit is intentionally excluded because it exercises the protected legacy extension source, while the v2 extension/app E2E gate runs separately in the approved consolidated checkout;
   - allowlisted-branch check: `npm run branch:check -- --operation live-lineup-release` must name `louis623/sparkle-suite` and `codex/nic-nac-trade-hardening` and exit 0;
   - complete Lineup application manifest: on Windows, `$tests = Get-Content tests\manifests\live-lineup-release.txt; npx --no-install vitest run $tests`; in Codespace, `xargs npx --no-install vitest run < tests/manifests/live-lineup-release.txt`; the current application-only baseline is 48 files / 801 tests (800 passed, 1 intentionally skipped; the frozen v1 audit and unrelated LOC waitlist test are deliberately excluded);
   - extension fake-network/parser/worker/popup suite: `node tests/sparkle-extension-worker-v2.test.cjs`;
   - JavaScript syntax: `node --check` separately for `background.js`, `content.js`, `publisher-client.js`, and `queue-parser.js`;
   - prohibited navigation scan: `grep -En "reload|location\\.reload|location\\.href|location\\.replace" chrome-extension/content.js` must return no match;
   - prohibited DOM-write scan: `grep -En "document\\.createElement|appendChild|innerHTML|insertAdjacentHTML" chrome-extension/content.js` must return no match;
   - prohibited dialog scan: `grep -En "alert\\(|confirm\\(|prompt\\(" chrome-extension/content.js` must return no match;
   - exact manifest host/permission checks are asserted by `node tests/sparkle-extension-worker-v2.test.cjs`; before Store upload, run `node scripts/verify-live-lineup-extension-package.mjs --archive=<exact-zip> --inventory=tests/manifests/sparkle-live-lineup-extension-package.txt --source-dir=chrome-extension --expected-version=<approved-version>` and retain its SHA-256/version/inventory/per-file-source receipt. The verifier must prove every packaged byte matches the reviewed same-checkout source, every manifest reference is present, permissions/hosts are exact, and no file outside the approved inventory is included;
   - PostgreSQL migration/PGlite tests plus `node scripts/live-lineup-pg-concurrency.mjs --fixture-root=<fresh-owned-socket-only-fixture> --user=<fixture-superuser> --migration=supabase/migrations/20260910000100_live_lineup_v2.sql`; the current harness has ten named concurrency groups covering fourteen executed scenarios and must exit 0;
   - selected production ESLint: on Windows, `$files = Get-Content tests\manifests\live-lineup-eslint.txt; npx --no-install eslint $files`; in Codespace, `xargs npx --no-install eslint < tests/manifests/live-lineup-eslint.txt`; then `git diff --check`. The manifest deliberately excludes giant shared files with documented pre-existing unrelated lint failures (`DashboardPlaceholder.tsx`, `lib/services/types.ts`); their Lineup behavior remains covered by the fixed regression manifest, TypeScript build, and scoped diff review;
   - exact `npm run build`;
   - synthetic consolidated source → worker → API → Workspace → shared public runtime journey: `npx --no-install vitest run tests/live-lineup-extension-app-e2e.test.ts`. It is intentionally absent from the application-only manifest and must fail closed until the approved Codespace `publisher-client.js` and worker are present in the same checkout. For read-only forensic execution before consolidation, `SPARKLE_LIVE_LINEUP_EXTENSION_SOURCE_DIR` is accepted only when both `SPARKLE_LIVE_LINEUP_EXTENSION_PUBLISHER_SHA256` and `SPARKLE_LIVE_LINEUP_EXTENSION_WORKER_SHA256` exactly match the files; that mode does not replace the final same-checkout gate. Only an actual passing combined-checkout run satisfies release readiness.
6. The synthetic journey must cover restart/lost acknowledgment, competing tabs, explicit party/show selection, generation changes, stale packets, Hold/Return/reorder/Reveal/Undo, empty and missing data, credential revoke/expiry, customer privacy, custom-domain identity, and honest delayed/offline states.
7. Commit only the reviewed release scope. Verify a clean release tree, exact commit SHA, and hashes. Push only after Louis's explicit push approval.
8. Preserve and retest the implemented server-controlled Live Lineup read-only safety mode in the final combined SHA. A second deployment of that exact SHA, built with the safety mode enabled, is the compatibility bridge: it must retain the v2 `/api/live-lineup/publish` contract and public/legacy reads while disabling Workspace owner mutations. Record its immutable deployment ID, identical Git SHA, environment-mode receipt, and build evidence. The pre-v2 production deployment is not a safe alias rollback target after any installed client has upgraded.

If any source changes after a gate, invalidate downstream evidence and rerun the affected gates.

## Phase 2 — package and obtain staged Store approval

This phase changes the Sparkle Suite Store draft and requires action-time confirmation immediately before upload and submission.

1. Package from the clean, exact combined Git SHA in the Codespace.
2. Confirm `manifest.json` is at the ZIP root and the ZIP contains every referenced worker/helper/UI/icon file, with no source maps, secrets, tests, temporary files, or unrelated project files.
3. Record ZIP filename, size, SHA-256, manifest version, permissions, host permissions, and file inventory.
4. Before browser-side upload, load the current bundled Chrome runtime, list tabs, claim the exact returned Sparkle Suite item tab, and complete a harmless title/URL/DOM read. Verify the item name and ID `kmodgfffflplfdlkkhadgimmobplhoih`. If this fails, follow the `AGENTS.md` extension/registry/native-host audit and stop; never select another visible item.
5. Upload to the **existing** Sparkle Suite item `kmodgfffflplfdlkkhadgimmobplhoih` only.
6. Repeat the Chrome preflight and item-name/ID verification immediately before submission. Choose deferred/manual publishing; do not use default automatic publish-on-approval.
7. Submit for review only after Louis confirms the final action. Record submitted version, timestamp, and status in OpenBrain and the Vault.
8. While review is pending, do not migrate, deploy the mandatory setup, publish, install, or reload. The currently published extension remains unchanged.
9. When status becomes approved/staged, verify the staged version and its expiry date. If it is rejected or expires, stop and return to source review; do not improvise a live workaround.

Before Store submission, retain and hash a tested previous-version emergency package in the approved Codespace/recovery location. It is mandatory recovery material, but it does not provide instant fleet rollback. Installing or loading any unpacked package still requires separate action-time confirmation and a non-live profile.

The package verifier and consolidated E2E harness recorded above must exist and pass before this phase. A prose checklist or two disconnected component tests cannot satisfy either gate.

## Phase 3 — coordinated production cutover

Begin only when the compatible Store package is approved and staged, Louis reconfirms a no-live-show window, and the exact combined Git SHA is pushed.

### 3A. Database — additive first

1. Run a read-only `supabase migration list` and capture the before state.
2. Reconfirm the project ref is `bqhzfkgkjyuhlsozpylf`.
3. Recompute both migration hashes from the frozen release SHA and compare them with the release record.
4. Run `supabase db push --dry-run` against the linked project. Its exact ordered pending set must contain only these two files, with no extra or missing migration:
   - `20260910000100_live_lineup_v2.sql`
   - `20260910000200_reviewer_live_lineup_reset.sql`
5. Stop if the dry-run differs. Otherwise apply that exact reviewed set and retain the command output.
6. Verify the post-apply migration list, tables, indexes, function signatures, RLS enablement, grants, Realtime/legacy invariants, and that `live_queue` remains intact.
7. Run read-only tenant/isolation and legacy-fallback probes. Do not seed or alter a customer.

If the database step fails, stop. Leave any successfully applied additive objects in place, preserve logs, keep the old app/extension live, and diagnose exact migration state before retrying.

### 3B. Application — exact manual deployment

1. Deploy the clean exact combined SHA once to Vercel production; automatic Git deployment creation remains disabled.
2. Record deployment ID, immutable deployment URL, Git SHA, build result, and creation time.
3. Verify the intended deployment owns both production aliases. Do not move an alias until the deployment is Ready and provenance matches.
4. Before publishing the extension, verify:
   - landing-page stability and no delayed redirect;
   - reviewer-smoke entry and correct non-personal workspace identity;
   - required setup and Help & Resources;
   - Workspace Live Lineup card layout, bounded internal scroll, controls, and honest connection state;
   - public Home/Join/Trade routes on canonical and representative custom-domain paths;
   - legacy published extension traffic remains readable;
   - v2 publish endpoint rejects absent/invalid credentials and unrelated origins without leaking details;
   - no new production 5xx or auth/checkout regression.
5. Without moving production aliases or touching customer data, smoke the compatibility-bridge deployment against the now-applied production v2 schema. Prove its exact Git SHA matches the main deployment, `/api/live-lineup/publish` retains its authenticated contract, public/legacy reads remain available, and Workspace owner mutation returns the fixed safety-mode response.

If application verification fails, immediately return both aliases to the captured prior deployment, keep the staged extension unpublished, and leave the additive schema intact.

### 3C. Extension — manual publish last

This is the last externally consequential release action and requires confirmation immediately before clicking Publish.

1. Reconfirm exact Sparkle Suite item ID, staged version/hash, application deployment ID/SHA, compatibility-bridge deployment, database migration state, every known production profile, and no live show.
2. Repeat the mandatory Chrome preflight: current runtime, tab listing, exact Sparkle Suite item claim, harmless read, and visible item-name/ID verification. Stop on failure.
3. Manually publish the already-approved staged version.
4. Do not touch Some Dude AI and do not change listing visibility, countries, pricing, permissions, or unrelated metadata.
5. Record the visible publish confirmation and Store status. A click without confirmation is not completion.
6. Allow the normal update cycle; never force-reload a live-show browser.
7. Keep the operational no-show blackout open until every known production/live-show profile is visibly on a coherent Store-installed version and passes its pre-show check. A mix of legacy profiles is supported by the app, but a profile with mixed v2 worker/content-script state is not cleared for a show.

## Phase 4 — post-release acceptance

Use only a safe synthetic reviewer and, with separate install/reload confirmation, a non-live test browser profile.

- [ ] Verify the Store-installed copy reports the expected extension ID/version; an unpacked build alone is insufficient.
- [ ] Pair a disposable publisher, deliberately select the synthetic show/party scope, and confirm the first snapshot.
- [ ] Verify restart recovery, lost-ack recovery, competing-tab exclusion, stale-show stop, revoke, and expiry behavior.
- [ ] Verify Workspace drag/drop plus keyboard/tap reordering, Hold/Return, Reveal/Undo, show start/end/carry, archive recovery, and bounded scrolling without extending the page.
- [ ] Verify public Home/Join/Trade update promptly and identically, hide private IDs/Hold/credentials, and age through connected → delayed → offline honestly.
- [ ] Verify empty queue, missing source table, malformed packet, network failure, and recovery states remain professional and do not crash pages.
- [ ] Verify both Sparkle Suite domains resolve to the exact deployment and representative customer domains return expected content.
- [ ] Reset the synthetic reviewer through the guarded reset path and prove no residue. Never reset a real account.
- [ ] Check production logs/metrics for 5xx, repeated conflicts, rate limiting, auth failures, or abnormal publish volume.
- [ ] Record final deployment, commit, migration, extension version, Store status, reviewer session type, exact live paths, rollback references, and residual limitations in both OpenBrain and the Vault.

## Rollback matrix

| Failure point | Immediate action | What stays |
| --- | --- | --- |
| Before Store submission | Stop; discard/rework only the draft package | Published extension, production app, database |
| Store pending/rejected | Keep old version published; cancel/rework draft if authorized | Production app/database unchanged |
| Migration failure | Stop before app deploy; inspect exact partial state | Old app/extension; additive objects and logs preserved |
| App build/deploy not Ready | Do not move aliases or publish extension | Prior aliases, old extension, additive schema |
| App live smoke fails before extension publish | Return both aliases to captured prior deployment | Staged extension unpublished; additive schema preserved |
| Extension publish defect | Keep shows stopped; trigger Chrome Web Store rollback to the previous package with the required higher rollback version; verify every affected profile actually downgrades | Keep the v2-capable app/compatibility bridge and additive schema live during client rollback |
| Cross-layer incompatibility after publish | Roll Store package back first. Do not return aliases to the pre-v2 deployment while any affected profile may still run v2; use the tested v2 compatibility bridge if the main app must be withdrawn | Additive schema/history, v2 endpoint compatibility, and incident evidence |
| One synthetic/test publisher misbehaves | Revoke only that exact credential and verify lease invalidation | Other tenants/devices untouched |

Chrome documents that Store rollback republishes the previous package under a new, higher version and then uses the normal update cycle. It is not instantaneous on every installed browser. Never promise immediate client rollback, return aliases to a deployment lacking `/api/live-lineup/publish` while a v2 client may remain, force browser reloads during shows, or delete v2 tables to simulate rollback.

## Hard stop conditions

Stop without improvising if any of these occur:

- a live show starts or its status is uncertain;
- repo/branch/SHA/project/item/domain provenance does not match;
- the combined release tree is dirty or contains unrelated work;
- staged Store publishing is unavailable or automatic publication cannot be ruled out;
- a tested v2 compatibility-bridge deployment is missing before public extension release;
- the staged package is not approved, has expired, or its hash/version differs;
- a personal/customer account is the only available smoke path;
- an established account reaches `checkout_required` or Stripe;
- migration state is ambiguous, production logs show unexplained 5xx, or aliases disagree;
- any known live-show profile has mixed or unverified extension identity/version;
- rollback deployment/package evidence is missing.

## Definition of done

The release is complete only when the exact Git SHA, migrations, Vercel deployment, both aliases, Store item/version, Store-installed extension, synthetic reviewer workflow, public customer routes, cleanup, and rollback references are all verified and recorded. A source test, raw deployment URL, HTTP 200, dashboard click, unpacked extension, or Store submission alone is insufficient.
