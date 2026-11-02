# Lindsey signup discount — Smoke only, November 2

Louis approved Smoke only. No Live project, Live environment, Live database, Live alias, account or provider object was read or changed. Do not merge or promote this PR without separate approval.

## Source and deployment

- Repository: `C:\Users\louis\sparkle-suite-repo`, remote `louis623/sparkle-suite`.
- One new branch: `codex/signup-discount-smoke`, isolated in `.codex-worktrees/signup-discount-smoke`, from exact production base `a94bae3ba2e4b253f8100fcb26a58347e10b5c87`.
- PR: https://github.com/louis623/sparkle-suite/pull/171 (draft, unmerged).
- Runtime feature commit: `1fac4b688abc081b3a8d6b94b0a355a135329713`. Browser-tested source tip: `051e90038c8a9edece403e52448036a519ffc863`; its additional change preserves the existing 69 full-HTML theme snapshots by excluding exactly eight fingerprinted, approved discount CSS rules. No baseline hashes were refreshed.
- Final source tip: `595547ba4383d34c6ca23a9ac9ec34de8ebb0c50` additionally synchronizes the public source with the already-tested legacy/v2 placement and updates two stale script-version assertions. The four SSR/legacy/runtime asset files are byte-identical to the four passed browser checks; no passed view was repeated.
- Final Smoke deployment: `dpl_CtNKmL7hNtJs5msptKUuXGpAGniA`, `sparkle-suite-smoke-c0pua228u-louis-2849s-projects.vercel.app`, READY. Project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, team `team_kvcmZ4RlZB0Hah65NE3280x5`, preview environment.
- Smoke alias confirmed on that deployment: https://sparkle-suite-smoke.vercel.app . Review Lindsey at https://sparkle-suite-smoke.vercel.app/milehighfizz .
- Only PR #158's discount work from `5a3c3a44` and DOM fix `274fd399` was carried over, plus equivalent v2 bootstrap/UI/styles and the actually served legacy snapshot. No unrelated #156/#159 changes. The legacy manifest records only this approved signup exception. Extension files untouched.
- Existing branch guard used, with the new branch/worktree allowlisted and Vercel deployments restricted to Smoke / preview. GitHub default and Live production branches unchanged.

## Smoke database and configuration

Only database `pukemqiwlyqmyytxkdmo` was used. Both pulled Supabase JWTs were checked to identify that project. No credentials are recorded here.

`20261025223000_ss_signup_discount_code.sql` was already present in Smoke migration history with both nullable columns and both format checks. The exact idempotent DDL was re-executed on Smoke without creating duplicate migration history. Undo remains `supabase/manual/20261025223000_ss_signup_discount_code_undo.sql`.

The exact #158 identity check returned **one row** before any data update: Smoke Lindsey `a0683f86-a19b-4ee5-a8d1-16dd015371ee`, slug `milehighfizz`, expected email. An identity- and row-count-guarded update saved `MILEHIGHFIZZCUSTOMER` / `Your 15% off code`. Initial saved offer was `15% off`; the UI supports both the phrase and complete heading.

Smoke preview now has `REP_RENDER_V2_SLUGS=dudesfizzfest,milehighfizz`, saved and independently read back with the comma intact. No other project environment variable changed. This setting was absent in Smoke preview before the task. Smoke has no Git connection, so branch-scoped environment variables are unsupported.

Important CLI lesson: Vercel CLI 65.9.0 converted comma-separated `--env` / `--value` input into a space-separated value. The first candidate therefore used legacy rendering. Store comma-containing values through stdin and verify the readback. First candidate `dpl_4eEZnwERFCFivLJttRDfaN17eZZA` is retained unaliased; an unconfigured follow-up `dpl_FLWkFbZTDnkUTSuqTZs8dyFy61kw` was canceled. Candidate AUy was browser-tested successfully; final source candidate CtNK now holds the Smoke alias.

## Browser evidence and load accounting

Anonymous Playwright Chromium, no personal Chrome session. Browser skill was not listed, so the frontend testing skill's ordinary Playwright path was used. Desktop 1440x1000; phones 390x844 with touch/mobile emulation, 4x CPU slowdown, 150 ms latency and 1.6 Mbps downlink. All Live domains/Live database requests were blocked before network access. The existing absolute Live favicon reference was answered locally with an empty response during the final checks; no Live favicon request was sent.

**Four final checks passed; eight actual loads total.** No passed view was repeated. Four retained failures explain the additional loads: two Lindsey renderer failures caused by the malformed CLI allowlist, one Lindsey signup failure caused by existing blank-note handling, and one BlingKitchen no-code case with third-party media console errors. The latter was replaced by an active, empty-media Smoke QA rep. Fizzfest was loaded once.

| Final case | URL path | Result |
| --- | --- | --- |
| Lindsey phone | `/milehighfizz` | Server and DOM SSR markers; signup 201; heading/code correct; actual clipboard equals `MILEHIGHFIZZCUSTOMER`; zero page/console/resource errors |
| Lindsey desktop | `/milehighfizz` | Same result, actual clipboard verified |
| No-code QA rep phone | `/qap3amethyst` | Legacy path; signup 201; normal confirmation; no discount; zero page/console/resource errors |
| Fizzfest phone | `/dudesfizzfest` | SSR, Pumpkin Cat theme, muted video playing at time 1.630136, motion control present, zero page/console/resource errors |

Final Lindsey phone FCP 2.784s / LCP 3.420s / CLS 0; desktop FCP 0.868s / LCP 1.120s / CLS 0. Fizzfest phone FCP 1.916s / LCP 2.480s / CLS 0. The legacy QA phone LCP was 18.756s / CLS 0.0321. These are single functional-check samples, not medians. Do not claim every performance target passed or that legacy speed was improved.

Screenshots, all failures, server HTML and exact metrics: `C:\Users\louis\.codex\visualizations\2026\11\02\01a19cf5-7c06-7df0-98f1-84ae3bd133dd\signup-discount-results.json` and adjacent PNGs. Committed evidence is also under `docs/sparkle-suite/qa/2026-11-02-signup-discount-smoke/` (four screenshots plus sanitized results/cleanup receipt). Main proof: `lindsey-phone-success.png`, `lindsey-desktop-success.png`, `no-code-phone-success.png`, `fizzfest-phone-home.png`.

### Existing defects discovered, outside this patch

The form calls notes optional and serializes empty notes as null, while Smoke's `customer_audience.jewelry_notes` is NOT NULL. The empty-note signup returned SQLSTATE 23502 and created no row. Successful synthetic signups used a short test note. No unrelated application or schema fix was made, and Live was not inspected to infer its state. BlingKitchen's media embeds produced permission-policy and external 403 console errors, while the signup itself returned 201 and showed no discount. Neither issue was hidden or repaired in this PR.

## Cleanup confirmed

The following four task-owned `customer_site_signup` rows were deleted, with UUID, source, rep, email and creation-time guards. Their four change-log rows and four queued outbox entries were also deleted; there were no generated publications. Independent post-delete counts were **0 signups / 0 change logs / 0 outbox**.

| Rep | Email | Deleted row |
| --- | --- | --- |
| milehighfizz | signup-discount-phone-20261102@example.com | f7806e09-5d2f-4bea-9648-4c936eb7fa5a |
| milehighfizz | signup-discount-desktop-20261102@example.com | a128a100-aaed-44e9-a25b-d2c01eebd30d |
| blingkitchen, failed media-console case | signup-discount-no-code-20261102@example.com | e9152901-185e-4e72-99a8-fbb3819e4aa0 |
| qap3amethyst | signup-discount-no-code-20261102@example.com | 73992045-2b28-4222-bac5-71ae082ded7f |

Lindsey's Smoke code/offer remains saved. Rep themes/motion settings were read back unchanged: Lindsey Pumpkin Witch / zoom; Fizzfest Pumpkin Cat / still; BlingKitchen Pumpkin Witch / sparkle_rise; QA amethyst / still. No Live changes.

## Automated verification

Normal production build passed compilation, TypeScript, all 44 static pages, branch guard and all 11 shared-layout locks. Focused verification: 266 passed / two documented existing missing-migration-file failures; no new failures. All 69 full-HTML layout snapshots then passed against unchanged baseline hashes with only exact approved discount styles excluded.

Full local pass completed once: **6,206 passed / 83 failed / 5 skipped**. Of those failures, 73 match the known-failure list; three were the source-copy/version assertions subsequently corrected (focused correction run: 80 passed / one existing known failure). Seven additional local failures are in unchanged Dance Floor photo fallback, pantry script bytes, Midnight Rose migration, flyer rendering (three cases) and Message Center RLS assertions. These seven were absent in the first Linux full CI run. No unrelated failure baselines, production files, or timeouts were changed.

First full Linux CI run at 051e9003: 6,210 passed / 78 failed / six skipped, consisting of 75 documented known failures plus the three subsequently corrected assertions. Final corrected source CI run: canceled after Louis objected to overtesting. No additional full suite or browser check is authorized by this closeout. The completed full local result above is retained honestly; do not claim the full suite was green..

## Exact Live work requiring separate approval

Nothing in this section was executed. This PR is not approved for Live. Rocky review, Louis's demo on Live, and Louis's explicit Live approval remain required before any rep rollout.

1. Review/merge the exact approved PR into the still-current production branch, preserving newer approved production work if the base advances. Build a **Live-configured** candidate. Never promote the Smoke-keyed artifact into Live.
2. On Live database `bqhzfkgkjyuhlsozpylf`, apply only `supabase/migrations/20261025223000_ss_signup_discount_code.sql`, and verify both nullable columns and both checks. Do not run unrelated pending migrations. Its destructive undo drops both columns and every saved code; use it only under separate rollback authority.
3. Run the original #158 check below on Live, and stop unless it returns exactly one row. Do not use Smoke Lindsey's UUID to identify Live Lindsey.

```sql
SELECT r.id, r.email, r.public_site_slug, r.custom_domain, r.business_name,
       s.signup_discount_code, s.signup_discount_offer
FROM public.reps r
LEFT JOIN public.site_settings s ON s.rep_id = r.id
WHERE lower(r.email) = 'lindseychapman1188@gmail.com'
   OR r.public_site_slug = 'milehighfizz'
   OR lower(r.custom_domain) IN ('milehighfizz.com', 'www.milehighfizz.com');
```

4. After the one-row identity result and exact rollout approval, update only the matching settings row. Assert exactly one row updated, and read it back:

```sql
UPDATE public.site_settings AS settings
SET signup_discount_code = 'MILEHIGHFIZZCUSTOMER',
    signup_discount_offer = 'Your 15% off code',
    updated_at = now()
FROM public.reps AS rep
WHERE settings.rep_id = rep.id
  AND rep.public_site_slug = 'milehighfizz'
  AND lower(rep.email) = 'lindseychapman1188@gmail.com'
RETURNING settings.rep_id, signup_discount_code, signup_discount_offer;
```

5. After Rocky review and the demo-only Live gate, promote the separately built Live-configured candidate only with Louis's approval. Confirm both Suite aliases resolve to that exact candidate, verify the affected customer workflow on the exact Live domain, remove synthetic signup artifacts, and recheck within 15 minutes. Preserve the currently served Live deployment before any alias movement. The blank-notes defect requires separate disposition before calling general signup readiness complete.

## Smoke rollback

Restore only `sparkle-suite-smoke.vercel.app` to recorded previous `dpl_3HV4hEooc71gMpZ633zhcwjkTvB5` / `sparkle-suite-smoke-j8fn9gm9x-louis-2849s-projects.vercel.app`. Existing immutable builds retain their own environment. If separately reverting configuration for future Smoke builds, the previous preview SSR variable was absent. Previous Lindsey Smoke code was the same with offer `15% off`. No rollback was requested or run.

## Louis’s final testing direction

Louis objected to overtesting after the feature/browser checks and cleanup were complete. Stop further tests and cancel the remaining CI run. The 13 figure referred to CI minutes, and 6,206 was the number of individual automated tests that passed, not browser visits. Actual browser loads remain eight. Future checks should stay narrow and follow Louis’s stated load/test limits; do not expand into unrelated suites or fixes. Closeout/evidence-only commit uses [skip ci] so recording the receipt does not launch another full test run. No further deployment is needed for documentation.
