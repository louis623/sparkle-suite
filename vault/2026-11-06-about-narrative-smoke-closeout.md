# Shared About narrative fix — PR only, Smoke blocked

Base: production a668c05d9a123432ca9481dd4fc27d977443b12c, READY dpl_CRiJKCQDCK3kyCPK9GdhEDNp2Vra. Verified GitHub remote tip directly; disposable clean clone, branch codex/about-narrative-smoke. No persistent checkout synchronization.

Fix preserves all saved paragraphs through shared mapping, targeting and both bootstrap paths, including application to arbitrary paragraph slots. Keeps empty legacy slots for short bios, 1200-character validation, normalization, placeholder/name privacy filters, preferences and layouts. Setup preview draft About/schedule copy fills only an unsaved bio; a saved bio is not replaced. No per-rep exception or migration. Inspected seed/template paths: fixed preview-example paragraphs do not consume saved narratives; left unchanged. Existing rep-welcome operator checklist and its reference now require full saved/public bio comparison, including the final paragraph, respecting hidden sections.

## Bounded validation

One Vitest invocation, exactly six selected cases passed in tests/amethyst-preview-template-data.test.ts and tests/amethyst-homepage-template.test.ts; 105 other cases skipped. Covers seven paragraphs at 1200 characters, formatting/visibility, targeted onboarding, both bootstrap serialization paths/privacy and all-slot application/placeholder filtering. No rerun, full suite, build, typecheck or unrelated checks. Command: node node_modules/vitest/vitest.mjs run tests/amethyst-preview-template-data.test.ts tests/amethyst-homepage-template.test.ts -t 'About narrative regression' --reporter=json --outputFile=.local/about-audit/focused-tests.json.

## Pre-release Live audit

Authoritative Live reps table: 14 active rows, 8 customers and 6 demo/internal. Audited every customer plus Louis with one document load each (9 total). Prior task's failed HTTP tool path diagnosed without document loads: sandbox DNS denied/ENOTFOUND; authorized external curl succeeded. All 9 HTTP200, no redirects or retries, all cache-control:no-store. Runtime rep identities match roster. Saved responses retained only in ignored .local/about-audit; no customer database export.

| Rep/site | Saved → public nonempty paragraphs | Result on current Live |
| --- | --- | --- |
| Katelin / maingemco.com | 7 → 3 | Confirmed affected, paragraphs4–7 absent |
| Brianna / brisglowtique.com | 4 → 3 | Confirmed affected, paragraph4 absent |
| Lindsey / milehighfizz.com | 4 → 3 | Confirmed affected, paragraph4 absent |
| Kelly / sparklybutterflies.com | 6 → 3 | Confirmed affected, paragraphs4–6 absent |
| Heather / theblingkitchen.com | 3 → 3 | Correct saved narrative retained |
| Kim / goforthebling.com | 3 → 3 | Correct saved narrative retained |
| Louis / yoursparklesuite.com/dudesfizzfest | 1 → 1 | Correct saved narrative retained |
| Kristin / blingwithkrissig.com | no saved narrative | No saved narrative mismatch; fallback only |
| Brittany / brittwithbling.com | no saved narrative | No saved narrative mismatch; fallback only |

Four confirmed payload mismatches, three complete saved narratives, two without saved narrative. No storage loss observed. Katelin’s three About video destinations remain present; no playback audit.

Visibility correction: an unset about_1.sectionVisible maps to showAboutSection:false but that flag is only consulted by the bespoke BrittWithBling renderer; standard layouts consult t.showAbout. All nine retained responses contain the About section and showAbout:true. Do not call Brianna/Lindsey/Kelly intentionally hidden merely from the unset flag. No preference changed. No browser visual checks in this fix run; computed CSS, interaction/collapse and hydration behavior on those Live sites remain unverified.

Other active demo/internal accounts (not audit targets): Britt Test Rep has public slug sparkle-reviewer-preview and no saved narrative; no load. Gracie Smoke, Lane accounting viewer, LOC Synthetic Reviewer and Nic-Nac Support have no configured domain/slug and no saved narrative; not applicable to public bio comparison. Gracie account work stayed separate. No impersonation or reviewer mode.

## Smoke blocker and remaining work

Stable Smoke currently serves dpl_Hes53WeU3h8zkMiSPzxtat1LH53g / e19744d7dba304d3d900b09b8135a2cdfef2804b, the prior photo-guardrails build expressly left in place. User says not to displace occupied Smoke. Zero deployments, zero alias/environment changes, zero Smoke page loads or synthetic account writes. No fixed Smoke URL or tested deployment exists yet.

Expected after shared fix: every valid saved paragraph reaches public data for all existing/future reps, and existing layouts/preferences continue to control display. This is proven by the six focused cases only, not by a released site. When Smoke is released for this task: one deployment of the exact approved PR tip, disposable synthetic seven-paragraph bio plus three video links, two total loads (phone legacy, desktop current), verify final paragraph and all links, then stop. No automatic test rerun. Live release still needs Rocky review and Louis approval.

Actual this fix run:6 selected cases/1 invocation/0 failures,9 Live document attempts/9 responses,0 Smoke loads,0 browser loads,0 deploys,0 rep content/preferences changed,1 final diff/receipt review. No merge or Live deployment.


## November 6 continuation — one deployment failed at layout lock

Louis released Smoke for PR181 and authorized replacing the prior build, exactly one deployment and two browser loads, no test reruns/merge/Live. Attempted exact application2631e9058094e6bc62d8d5aeb5c99d31e7b5fd4d on Smoke preview projectprj_VTY0rpz2O3VBJqJv69iBz8tzLexQ. Deploymentdpl_8mgNqJTMakxWShfoTdqbM6kKK9mH (sparkle-suite-smoke-oqurm4842-louis-2849s-projects.vercel.app) is ERROR. Branch guard passed. npm prebuild stopped at skin:layout-check: the source hash for lib/amethyst/preview-template-data.ts differs from tests/fixtures/customer-site-layout-lock.json. Next build/typecheck and browser validation were never reached. The shared About data change is approved; its layout-lock receipt was not updated in PR181. No guard bypass, baseline edit, source fix or deployment retry occurred in this continuation.

Stable Smoke alias independently remains dpl_Hes53WeU3h8zkMiSPzxtat1LH53g / e19744d7. No alias moved; Live untouched. Smoke bindings and anon/service-role key project references were verified in-process without exposing values. Two new demo-class synthetic records (805characters/sevenparagraphs/three video links, one legacy and one current) were prepared in Smoke only; both auth users/reps and dependent data were removed after failure with exact identity guards and zero-rep readback. No existing rep content/preferences changed. Deployment-only allowlist addition was limited to the fresh current fixture; project environment was not changed.

Actual continuation totals:1deployment attempt/1ERROR/0alias moves/0browser document loads/0tests rerun/0merges/0Live deploys. Previous six focused tests remain passed; no new browser proof. Next step needs approval for a corrected layout-lock receipt and a new deployment attempt, followed by the same two Smoke loads. Do not call Smoke-passed or ready.


## November 6 final continuation — approved receipt, READY Smoke, fixture failure

Louis explicitly authorized the layout-lock receipt update and one additional Smoke deployment, with the six passed tests not rerun. Followed .agents/skills/sparkle-suite-skin-builder/references/skin-contract.md: explicit shared-change approval plus recorded resulting behavior. Inspected the mapper diff against production a668c05d; only About split/type/targeting/onboarding-saved-bio handling differs. Used the unchanged hashLockedSource function (LF-normalized SHA256) to update exactly one lock: lib/amethyst/preview-template-data.ts,69274daea4748791ab4f31f00136c18ed9f10f42f5d9edb198234dedd713514d→550021cd2b554634105a9e51d619b81020e278da9aad89fddc914a56646edaa3. Ten other lock entries and guard source unchanged. Added approval/result metadata. Normal unchanged guard passes all11locks. Receipt/application commit13e3143f564d844c9ece8cebd41a13b60e049e6e pushed. No six-case rerun.

One additional preview deployment succeeded: READY dpl_GF3sznXNx28Bn5ag8L2t5G3BJN1m / https://sparkle-suite-smoke-h6onu3ai9-louis-2849s-projects.vercel.app. Independent metadata confirms exact13e3143f/projectprj_VTY0rpz2O3VBJqJv69iBz8tzLexQ. Build branch guard,11layoutlocks,Next production compile,TypeScript and45static pages passed. Moved only sparkle-suite-smoke.vercel.app and independently confirmed exact deployment. Previous dpl_Hes53WeU3h8zkMiSPzxtat1LH53g remains rollback. No Live domain, project environment, merge or Live deployment change.

Browser check FAILED from an agent fixture-setup mistake: synthetic slugs about-pr181-legacy-nov6/about-pr181-current-nov6 include hyphens, but validatePublicSiteSlug only accepts letters/numbers. First phone390x844 Chrome load of https://sparkle-suite-smoke.vercel.app/about-pr181-legacy-nov6#about returned Not found. Same invalid current slug would also be rejected and filtered out of the V2 allowlist, so second load was not spent on a known-invalid setup. No navigation retry, fixture fix, further deployment, or false pass. Seven-paragraph/final-paragraph/three-link visual checks are UNVERIFIED; no product regression inferred from the invalid fixture. Screenshot capture timed out, no screenshot evidence available; viewport reset succeeded.

Chrome preflight initially used the wrong tab API (tabs.get for an unclaimed user tab). Required read-only audit confirmed extension installed/enabled, authoritative direct registry entry and manifest/host target exist, latest runtime26.1103.31037, running native hosts. Correct selected extension connection then passed fresh user.openTabs→exactclaim→title/URL. No personal workspace DOM was inspected or modified; public synthetic pages only, no impersonation/reviewer mode. This is not evidence of a website or user Chrome defect.

Both fresh805-character/seven-paragraph/three-video-link synthetic fixtures were cleaned after failure with exact identity guards; cleanup receipt readback remaining reps0. Existing rep content/preferences untouched. Current continuation counts:1additional deployment/1READY/1alias move,1of2browser document attempts (404),0test reruns,0merges,0Live deploys. Across both deploy continuations:2attempts (ERROR thenREADY),1browserload. Not Smoke-passed or Live-ready. Next: validate alphanumeric synthetic slugs BEFORE creation, use the valid current slug in a newly authorized deployment-only allowlist, then obtain authorization for the replacement deployment and two clean browser loads. Do not auto-retry.


## November 6 — corrected synthetic Smoke checks passed

- Corrected only ignored fixture/deployment helpers; application source unchanged. Actual validatePublicSiteSlug/buildPublicSitePath and parseRepRenderV2Allowlist/repRenderV2Enabled accepted aboutpr181legacynov6 and aboutpr181currentnov6 before seeding/deploy. Previous immutable deployment could not enable the valid current slug, so used the one newly authorized deployment. Test-only runtime/build allowlist exactly dudesfizzfest,milehighfizz,aboutpr181currentnov6; legacy absent/current present. Existing project environment and all production configuration untouched. One local helper module-loader error occurred before validation/data/deploy/browser execution; corrected before any such action.
- Exact SHA1aa732f4da420c2222e7d95e1c10634ca49abc65 deployed once to Smoke preview as READYdpl_2P6FbPEw9Ex2Qt3TEu8NnDAuBw9D (sparkle-suite-smoke-5kf9bhra4-louis-2849s-projects.vercel.app). Only sparkle-suite-smoke.vercel.app moved; independent alias/metadata readback matches. Previousdpl_GF3sznXNx28Bn5ag8L2t5G3BJN1m retained rollback.
- Exactly2Chrome document loads, no reloads/HTTP document checks: /aboutpr181legacynov6#about at actual390x844CSS (legacy homepage.jsx/serverRendered:false) and /aboutpr181currentnov6#about at1440x1000CSS (compiled/homepage.js/serverRendered:true). Both render all7paragraphs exactly matching the saved805-character synthetic narrative, including finalparagraph, and all3expected video links are displayed. Viewport sizing adjusted in the same loaded document to account for browser zoom; no extra navigation. No playback claim: third synthetic TikTok embed says unavailable, link still present. No form submit/provider action.
- Both fresh demo users/reps cleaned with exact identity guards. Independent Smoke DB readback: reps0/site_settings0/subscriptions0 for both fixture IDs. Existing rep data/preferences untouched; no impersonation/reviewer mode. Chrome latest-runtime list/exactclaim/title+URL preflight passed. Viewport reset. Screenshot proof committed at docs/sparkle-suite/qa/2026-11-06-about-pr181/{phone-legacy,desktop-current}.jpg; raw DOM receipt stays ignored .local/about-smoke/corrected-browser-results.json.
- This continuation:1deployment/1READY/1Smokealiasmove/2of2browserloads passed/0test reruns/0merges/0Live deploys. Original6focused cases remain passed; no broader test/performance/physical-device claim. About fix now has bounded Smoke proof. PR181 remains draft/unmerged; Live requires Rocky review and Louis approval. This successful receipt supersedes prior invalid-fixture/blocked Smoke status; do not automatically deploy again or reseed cleaned fixtures.
