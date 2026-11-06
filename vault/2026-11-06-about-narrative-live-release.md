# PR181 Live release attempt — merged, not deployed

Date: November 6, 2026. Louis explicitly approved merging PR181 and shipping the About narrative fix to Live, then explicitly waived Rocky review for this PR. No broader workflow change was authorized.

## Approved source and merge
- Repo: louis623/sparkle-suite; clean disposable clone C:/Users/louis/sparkle-suite-repo/.codex-worktrees/about-narrative-smoke.
- Production branch: codex/nic-nac-trade-hardening.
- Approved Smoke source: 1aa732f4da420c2222e7d95e1c10634ca49abc65; passed deployment dpl_2P6FbPEw9Ex2Qt3TEu8NnDAuBw9D.
- PR head 8f7b28663b681d43cfc41ba88b184edd538da950 adds only two synthetic screenshots and the receipt beyond approved Smoke source. No substantive changes or conflicts appeared.
- PR181 merged at 2026-11-06T16:10:21Z as 3953884567802d9694ae837929d9d233887b80c7. Merge tree exactly equals approved PR head.
- Production photo guardrails, all eleven layout locks and guard implementation unchanged from approved PR; only the previously approved mapper hash receipt differs from pre-fix production. No guard bypass.

## One production deployment attempt stopped before deployment creation
- Intended existing Live project: sparkle-suite / prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3; team louis-2849s-projects.
- Command started 2026-11-06T16:11:12.127Z: Vercel CLI65.9.0/Node24.14.1, deploy --prod --skip-domain --archive=tgz --yes, explicit project/team and merge-SHA/branch metadata. No runtime/build environment overrides, no Smoke fixtures or test-only allowlists.
- Local preparation continued for roughly17minutes with no Vercel deployment record. Observed >10.3GB filesystem reads, >388,000 read operations and about7GB working memory despite tracked source totaling487,221,884bytes. Actual internal cause and exact upload manifest remain unknown; no application build failure was observed.
- Agent stopped the exact CLI child process to prevent an indefinite/unverified upload from completing later. Wrapper exited1; its complete captured diagnostic output is only the CLI version banner. No second attempt, promotion, alias move, rollback, cache refresh or configuration/data change.
- Independent post-stop deployment query for merge SHA returns zero records. Therefore no new deployment ID/URL, Ready status or serving-merge confirmation is available. Do not describe PR181 as Live.

## Existing Live / rollback target
- READY dpl_CRiJKCQDCK3kyCPK9GdhEDNp2Vra, source a668c05d9a123432ca9481dd4fc27d977443b12c.
- Provenance URL: https://sparkle-suite-o6498gnn2-louis-2849s-projects.vercel.app.
- Both yoursparklesuite.com and www.yoursparklesuite.com independently still assigned to this deployment after stopping; apex redirect to www preserved.
- Customer URL: https://www.yoursparklesuite.com. No rollback needed because Live never moved. Preserve this deployment as rollback target for a later authorized release.

## Bounded validation and trackers
- Katelin / maingemco.com: UNVERIFIED after merge; no new deployment to check.
- Brianna / brisglowtique.com: UNVERIFIED after merge; no new deployment to check.
- Lindsey / milehighfizz.com: UNVERIFIED after merge; no new deployment to check.
- Kelly / sparklybutterflies.com: UNVERIFIED after merge; no new deployment to check.
- Actual release-run counts:1local deploy command/0Vercel deployment records/0alias moves/0public document loads/0browser document loads/0test reruns. Existing passed six focused cases and two synthetic Smoke checks were not repeated. No saved-text/public comparison or final-paragraph verification in this Live attempt; no video/playback check, login, reviewer mode, rep-content or visibility edit.
- Existing PR Tracker Page is inaccessible to connected Pages search/list (only unrelated tutorial returned). Keep PR181 in flight because it is not Live. Outstanding after a later successful release: remove it from in-flight work and attach the merge/deployment/4-rep receipt.
- Existing live Control Center Task List was inspected read-only in the already authenticated tab, with no navigation/login. The requested bio-truncation task could not be located in accessible UI or targeted authoritative Task List queries; do not change the unrelated completed Kim About task. Actual bio task remains incomplete; locate it and attach the eventual successful release receipt. Separate video-link and Gracie-account investigations remain untouched.
- Stop. A later authorized run must diagnose bounded local packaging before another deployment; do not automatically retry, rerun passed tests or spend public-check loads against old Live.


## November 6 recovery — LIVE, four saved/public comparisons passed

This section supersedes the earlier blocked-release status above. Louis authorized diagnosis and up to two recovery deployment attempts, with no test reruns/new Smoke/review, no application behavior or production setting/data changes.

### Confirmed local preparation cause
- The installed Vercel CLI65.9.0 resolves an ancestor .vercel/repo.json before the nearest Git root: findRepoRoot, getProjectLinkFromRepoLink and getProjectLink in its dist/chunks/chunk-OZPBJWYU.js.
- Primary workspace C:/Users/louis/sparkle-suite-repo/.vercel/repo.json (dated June4) links Live project prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3 at directory ".". The release clone has no per-directory .vercel/project.json to take precedence.
- A read-only invocation of the actual installed resolver from the clean release clone reproduced repoRoot=C:/Users/louis/sparkle-suite-repo, projectRootDirectory=".", despite git rev-parse --show-toplevel correctly returning the nested release clone. The explicit --project selected the project, not an isolated upload root.
- That parent root contains48 checkout directories under .codex-worktrees; its .vercelignore lacks a .codex-worktrees exclusion. CLI file-tree preparation includes this local material (and the parent dirty checkout), explaining the >10GB reads/~7GB memory. This was a local source/root-selection problem, not a failing application build or the approved About code. No parent content or local link was changed.
- Used the existing documented manual Git-source Vercel process instead (docs/sparkle-suite/operations/2026-10-17-fall-owl-release.md). Local untracked checkout/artifact directories are absent from committed Git inputs; no new packaging exclusions or application/configuration changes were needed. Existing .vercelignore still applied on the build host (385 ignored files removed), preserving required inputs.

### Verified release provenance
- Recovery attempt1 of maximum2: manual Vercel Git-source create_deployment, existing Live project/team, target production, gitSource ref codex/nic-nac-trade-hardening plus exact sha7460a63271ed781e037072da971f8bfc8eba12ab; withLatestCommit:false.
- Deployed SHA7460a632 contains approved merge3953884567802d9694ae837929d9d233887b80c7. Their diff is only vault/2026-11-06-about-narrative-live-release.md and vault/session-log.md from the previous closeout; application tree unchanged. No additional packaging code change.
- READY dpl_ByYrsxYEctXQAXQTRosGSfNF2Ar5, provenance https://sparkle-suite-22wl1g4vd-louis-2849s-projects.vercel.app; customer https://www.yoursparklesuite.com.
- Build log independently confirms "Cloning github.com/louis623/sparkle-suite (Branch: codex/nic-nac-trade-hardening, Commit:7460a63)", source/build root /vercel/path0. Branch guard passed, all11approved layout-lock checks passed, optimized production compilation and remaining normal build completed. No guard disabled/bypassed and no tests rerun.
- Existing production project settings/env used unchanged; no projectSettings/runtime/build-env overrides, Smoke fixture slug or test-only allowlist in the deployment request. Photo guardrails unchanged.
- Both Suite aliases independently confirmed on exact new deployment after the four checks; apex redirect to www preserved. The four rep domain aliases also confirmed before document loads. Existing production domains were assigned through normal Vercel production deployment; no manual alias rewrites.
- Rollback retained: dpl_CRiJKCQDCK3kyCPK9GdhEDNp2Vra / a668c05d9a123432ca9481dd4fc27d977443b12c / https://sparkle-suite-o6498gnn2-louis-2849s-projects.vercel.app. No rollback needed.

### Exactly four current saved/public checks
Read-only Live query selected only the four known active customer identities and current narratives. Each received one anonymous public document GET; no redirect following/retry/cookies/login/JS/video interaction. All HTTP200 and cache-control:no-store. Compared normalized full saved narrative with public embedded About paragraph array; exact matches and last paragraph retained:
| Rep/site | Saved characters | Saved/public paragraphs | Result |
| --- | ---: | ---: | --- |
| Katelin / maingemco.com | 972 | 7/7 | PASS, all paragraphs/final retained |
| Brianna / brisglowtique.com | 1142 | 4/4 | PASS, all paragraphs/final retained |
| Lindsey / milehighfizz.com | 993 | 4/4 | PASS, all paragraphs/final retained |
| Kelly / sparklybutterflies.com | 1173 | 6/6 | PASS, all paragraphs/final retained |

Four of four formerly affected reps now have complete saved narrative in the public response. No storage loss or data repair; no cache invalidation needed. This is public-response verification, not a new visual/device/playback or broad workflow pass; the approved two synthetic Smoke checks were not repeated.

### Counts and tracker closeout
- This recovery:1of2authorized deployment attempts,1READY,4public document loads,0browser document loads,0test reruns,0new Smoke pass. Across initial release plus recovery:2deployment commands/attempts,1stopped locally/1READY Vercel record,4public loads. No rep/account/data/preference edit or production configuration/cache change; no fixtures created.
- PR181 release receipt updated to LIVE. PR Tracker Page remains inaccessible through connected Pages search (only unrelated tutorial); no companion Page selected. Outstanding exact edit: remove PR181 from in-flight work and record deployed7460a632/dpl_ByYrsxYEctXQAXQTRosGSfNF2Ar5, approved merge39538845, rollbackdpl_CRiJKCQDCK3kyCPK9GdhEDNp2Vra and4/4full/final-paragraph checks.
- Existing Control Center Task List title/details search again found no bio-truncation task; unrelated completed Kim About task not changed. Outstanding: locate the actual public About/bio truncation task and mark complete with this receipt. Do not complete separate video-link or Gracie-account investigations.
- Final alias readbacks and public checks completed within15minutes of release; status confirmed at11:36EST (16:36UTC), November6. Stop after reporting; no extra deployment/load or unrelated announcement.
