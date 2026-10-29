# FAIL — combined SSR + Finder Smoke release candidate

The first valid desktop Amethyst Home check failed the required zero-CLS gate. The candidate is not accepted. Smoke was restored to the recorded rollback deployment before reporting; no further application tests or fixes were attempted.

Customers and reps have no new Live workflow from this session. No Live deploy, environment change, database access, provider action, rep sign-in, production-branch push or PR merge was performed. The candidate remains a hosted READY Smoke preview and PR #166 remains a draft.

## Candidate and final alias

- Repository/branch: `louis623/sparkle-suite` / `codex/release-ssr-finder`.
- Clean checkout: `C:/Users/louis/sparkle-suite-repo/.codex-worktrees/release-ssr-finder`.
- Base: `cb4f48608a6c31282df597b02ef7c4a3cd74b2c5`; exact merged #165 head: `afd182466dfd83709b9ca90bc7c6c57aa1ab2f70`; #161 docs completion: `0c2167b4`.
- Local merge commits: `2236e5c0`, `71d49eb5`. Allowlist commit: `c4e66b41083c7d8526ad59448011552bf5697409`.
- Tested application tree: `c4e66b41`; deployed evidence tip: `ca6af2e6607d541f662d9aeeec6986c83ef8528b`. Subsequent vault-only closeout does not change the application.
- Draft PR: [#166](https://github.com/louis623/sparkle-suite/pull/166), into `codex/nic-nac-trade-hardening`. **Do not merge without Louis's explicit OK.**
- One preview: `dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j`, project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, target `preview`, state `READY`.
- Final Smoke alias: `sparkle-suite-smoke.vercel.app` -> **`dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc`**, restored/verified **October 29, 2026, 18:03:40 EDT**, independently reread at **18:05:09 EDT**.
- Both immutable deployment identities/URLs are preserved in `deployment-provenance.json` for provenance only. No authenticated share URLs or credential values are stored.

## Acceptance checklist

| # | Result | Criterion | Exact evidence |
|---|---|---|---|
| 1 | **PASS** | Exact source tree | 20/20 required commits present; 2 conflict-free merges; one allowlist commit; 0 application diff against afd18246 excluding vault/config. |
| 2 | **PASS** | Allowlist | Exactly 2 semantic additions against cb4f4860: release active-branch entry and its Smoke preview rule. |
| 3 | **PASS** | Build and traces | npm ci/build exit 0; local/hosted tracing warnings 0/0; 250 manifests; 0 missing inputs; maximum rep 54,046,353 bytes; largest 140,697,711 bytes. |
| 4 | **PASS** | TypeScript and lint | tsc exit 0; lint 203 -> 213 errors; exactly 10 permitted new errors, all listed in local-gates.md. |
| 5 | **PASS** | Specified test-name/hash criterion | Full suites once each: base 5687/5598/84/5, candidate 5987/5895/87/5 (total/pass/fail/skip). Exactly 3 permitted new names. Rerun 18 total/14 pass/4 fail; all 7 frozen hashes pass; required pages 3/3 pass. The suite remains red. |
| 6 | **PASS** | One draft PR | PR #166 into codex/nic-nac-trade-hardening; draft, open and unmerged. No #160-#165 edits. |
| 7 | **PASS** | One Smoke preview | dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j READY, preview, exact ca6af2e6607d541f662d9aeeec6986c83ef8528b; 39 override names, 3 validated Smoke bindings, 31 blanks, 5 nonsecret settings; 0 forbidden flags or nonempty inherited provider values. |
| 8 | **PASS** | Smoke alias and rollback | 1 unique alias affected: sparkle-suite-smoke.vercel.app. Two assignments and two restorations, all recorded below. Final target dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc verified. No other alias/domain moved. |
| 9 | **FAIL** | All themes and layouts | 1/156 planned loads measured; first desktop Amethyst Home failed CLS 0.00007330246913580247 (required 0). 0 full-case passes, 1 hard failure, 155 loads not run. Phone 0/78; custom layouts 0/18. Pause/Play/reduced-motion checks stopped before interaction. |
| 10 | **FAIL** | Warm/cold speed and Live comparison | Formal warm samples 0 on Smoke and 0 on Live; qualifying 15-minute-idle cold samples 0. First desktop matrix sample H1 4.0442 s/FCP 3.960 s/LCP 4.420 s, over desktop target; it is not labeled a qualifying cold or formal warm sample. |
| 11 | **FAIL** | Legacy marker/control comparisons | 0 legacy routes compared with Live after the hard stop. The 7 offline frozen-renderer hashes pass, but do not replace these unperformed browser comparisons. |

Finder GET checks: **NOT RUN, 0/3**, because the first theme triggered the mandatory stop. Empty Smoke data was not changed.

## Actual measured load

URL at measurement: `https://sparkle-suite-smoke.vercel.app/dudesfizzfest?ssrReviewTheme=amethyst`. This alias now serves the rollback, not the candidate.

| Field | Observed result |
|---|---|
| Profile | Desktop 1440 x 900, Chromium 153.0.8010.12, no CPU/network throttle |
| HTTP / SSR marker | 200 / present |
| CLS | **0.00007330246913580247**, at navigation +5,288.1 ms; required exactly 0 |
| H1 visible | 4,044.2 ms, estimated by first visible animation frame |
| FCP / LCP | 3,960 ms / 4,420 ms |
| Request TTFB | 40.6 ms; this is not the required 15-minute-idle cold sample |
| First-paint styling | Critical-style probe matches final values; first-paint capture has styled header/background before the hero text appears |
| Hero video at capture | Playing, currentTime 7.412 s, autoplay/loop/playsInline true, muted/defaultMuted true |
| Audio autoplay | false |
| Horizontal overflow | 0 px |
| Forms / blocked write requests | 0 submissions; 0 non-GET attempts observed |
| Pause -> Play / reduced motion | Not run after the mandatory CLS stop; no interaction result is claimed |

First-paint and failed-state captures are in `screenshots/001-amethyst-standard-home-desktop-first-paint.jpg` and `screenshots/001-amethyst-standard-home-desktop-failed.jpg`. Both were visually inspected. The full per-load record is `browser-matrix.json`. The exact cause of the shift and delayed main content has not been isolated. No repair was attempted under this stop-only scope.

## Alias event history — October 29, ET

Candidate = `dpl_GiWDLGcGSti6AgGUevQ5gWHYx16j`; rollback = `dpl_EgnK4DUaNnQwn9gHbTij4MVL69nc`. Every event affected only `sparkle-suite-smoke.vercel.app`.

| Time ET | Change | Reason |
|---|---|---|
| 17:56:25 | Rollback -> candidate | Initial authorized assignment |
| 17:58:35 | Candidate -> rollback | The test runner unnecessarily required a platform cookie before any theme page opened |
| 18:03:13 | Rollback -> same candidate | Ordinary credential-free GET had confirmed the alias is public; corrected runner resumed step 8, without another deployment |
| 18:03:40 | Candidate -> rollback | Actual first-load CLS hard stop; target reread and verified |

The initial runner error measured **0 application acceptance loads**. It was corrected only in the local QA helper after a credential-free GET returned 200 with an SSR marker and no Vercel login page. The corrected run measured one real page and stopped on its native CLS result. No application source, flags, data, project settings or provider objects were changed to bypass a failed acceptance condition.

## Local gates and known failures

- `npm ci` and build exit 0; build 119.131 s. Local and hosted whole-project tracing warnings: **0 / 0**. All **250** manifests measured, **0** missing inputs. Six requested rep traces are 54.044001–54.046353 MB; maximum **54,046,353 bytes**. Largest function **140,697,711 bytes**. Every individual requested route size is in `local-gates.md` and `function-traces.json`.
- Standalone `tsc --noEmit`: exit **0**, 59.870 s. Lint **203 -> 213 errors**, exactly the **10** permitted new Trade/Join errors; each file/rule/line is in `local-gates.md` and `lint-comparison.json`.
- Full Vitest suites ran **once each**, sequentially, same PC/dependencies/dummy-only environment/one worker. Base **5,687 total / 5,598 pass / 84 fail / 5 skip**, 720 files, **1,692.842 s**. Candidate **5,987 / 5,895 / 87 / 5**, 723 files, **1,713.444 s**. No resolved failed names and no new file-level failures.
- The only three additional full-suite failed names are the permitted mandatory-render-failure test and the two permitted cold-template/cold-renderer timing tests. See `test-comparison.json` for the exact name diff.
- Requested two-file rerun at `--testTimeout=90000`: **18 total / 14 pass / 4 fail / 0 skip**, **208.619 s**. All **7/7** frozen-Live renderer hashes pass; required-pages file **3/3** pass. The two existing bootstrap cases and the two permitted cold-render cases remain failed. The suite is not fully green.
- Install audit: **33** untriaged dependency advisories (**7 low, 11 moderate, 12 high, 3 critical**). No dependency changes/audit fixes were made.

## Environment and request safety

Exactly **39** deployment-only override names were used: **3** validated Smoke bindings, **5** non-secret settings, **31** empty inherited settings. The previous 41-name set lost the two explicitly prohibited SSR preview flags. The URL and both JWT claims were checked locally against the Smoke project; no database connection was used for credential validation. No inherited provider/Live value was non-empty. No project environment setting was edited.

Used environment names (values intentionally omitted):

```
CARD_QR_APPROVAL_SECRET
CARD_QR_FULFILLMENT_EMAIL
CONTROL_CENTER_OWNER_EMAILS
CONTROL_CENTER_SESSION_SECRET
CRON_SECRET
GA4_READER_SERVICE_ACCOUNT_JSON
GA4_SMOKE_TEST_MEASUREMENT_ID
INTERNAL_OPERATOR_EMAILS
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SPARKLE_ENVIRONMENT
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
OPENAI_API_KEY
PUBLIC_SITE_VISIT_SALT
REMY_MCP_BEARER_TOKEN
REP_RENDER_V2_SLUGS
RESEND_API_KEY
RESEND_FROM_EMAIL
SIGNWELL_SEND_ENABLED
SPARKLE_ENVIRONMENT
SPARKLE_FINDER_CONTROL_CENTER_USAGE_URL
SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN
SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN
SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN
SPARKLE_FIZZ_TEST_SEND
SPARKLE_LAB_MANUAL_RUNS_ENABLED
SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED
SPARKLE_LAB_WEEKLY_RUNS_ENABLED
SPARKLE_PRE_SHOW_EMAIL_ENABLED
SPARKLE_PRE_SHOW_SMS_ENABLED
SPARKLE_RELEASE_BRANCH
SPARKLE_RELEASE_REPOSITORY
SPARKLE_REVIEWER_SMOKE_MODE
SPARKLE_SELF_SERVE_ENABLED
SPARKLE_STRIPE_TEST_BUYER_MODE
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
TEAM_PHOTO_POLISH_ENABLED
```

Browser tests used an isolated signed-out profile, service workers blocked, and routing that denies non-GET requests, analytics and direct Live database/API traffic. Public media GETs remained allowed. No user Chrome cookies/profile storage were inspected or copied. No rep account was used.

The emulated phone configuration (390 x 844, 4x CPU, 150 ms latency, 200,000 B/s down, cache disabled) was prepared and its CDP commands preflighted, but **no phone webpage was loaded** before the desktop stop. No phone-performance claim is made.

## Skipped under the hard stop

- Remaining **155** theme/layout loads, including every phone load and all three custom-layout groups.
- Formal five-warm-sample desktop/phone runs on Smoke and Live; all 15-minute-idle cold samples. No old measurements were substituted.
- Legacy rep marker/button/link/input/form comparisons. The seven offline hashes do not replace those checks.
- All three Finder GET/JSON-shape checks.

No further testing, fixes, alias assignments, merges, deployment or Live action is authorized by this report. A new scoped instruction is needed to investigate the first-paint/layout-shift failure.

## Memory closeout

The actual Open Brain MCP capture succeeded on October 29, 2026, before 18:11:56 EDT. It returned: "Captured as observation — release candidate, browser acceptance, failed tests". The observation records the failed gate, exact source/deployment, verified rollback, skipped checks and stop-only next step. This vault evidence and the short session-log entry are committed and pushed only to the release branch.
