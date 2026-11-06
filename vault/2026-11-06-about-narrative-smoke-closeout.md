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
