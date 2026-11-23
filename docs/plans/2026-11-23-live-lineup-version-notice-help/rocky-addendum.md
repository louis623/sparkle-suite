# Addendum for Rocky, round 2 of 2 (final): PR C + round-1 fixes
Plan is now v2: /workspace/plans/live-lineup-version-notice-help-plan.md. v1 backup: .v1.md. Written Nov 23, 2026, ~11:30 AM ET. Code: /workspace/ss-plan-1123 @ 9667296a (read-only; history deepened to Aug 15 for the pickaxe).

## New: PR C, the public-site "LIVE LINEUP" label (plan section 2C, prompt section 9)
- **What Louis asked for (10:37 AM ET):** on the public site, the Live Lineup bar should start with its own label box at the left, like ANNOUNCEMENTS and DANCE FLOOR, with everything listed to the right of it. Today "I have an open lineup." floats about a fifth of the way across.
- **Root cause:**
  - **13e75644** (Oct 2, direct push, no PR; docs/plans/2026-10-02-compact-public-lineup.md): it replaced the empty/offline/loading strips with a shared `renderEmpty()` in public/amethyst/live-lineup.js whose contract said "no lineup heading".
  - **PR #207** (feb4b94b, merged Nov 17): it put "I have an open lineup." into that headless row.
  - **Why it floats:** the lineup row is centered (`max-width:1280px; margin:auto`, homepage.css ~L6871 / L1696), while the ticker rows are full-bleed with an absolute `.hp-ticker-label` at left:0 (~L1152-1185).
- **The fix:**
  - The same label `<span class="hp-ticker-label hp-lineup-label">` goes first in all four states. Reusing the class means per-theme label colors carry over; `.hp-lineup-label` sets it back to static flex.
  - The row becomes full-bleed flex, with content left-aligned right after the label.
  - The SSR fallback markup has to equal `renderEmpty()` so hydration causes no shift.
  - It covers v2 SSR plus legacy homepage/trade/join and every layout through `SparkleSuiteHeaderStack` (Mile High Fizz, Britt with Bling, Bling Kitchen, standard).
  - Layout-lock entries are refreshed only for the changed functions and CSS, under Louis's approval.
- **Checks:** a scripted geometry pass on Smoke's public review routes (`/skin-preview/...?lineupReview=…` and `/dudesfizzfest?ssrReviewTheme&ssrReviewLayout`) at 390/344/1440, 8 screenshots, and 1 Lighthouse run. No sign-in needed.
- **Please poke at:**
  - (a) reusing `.hp-ticker-label` vs a separate class, given theme overrides like macies-christmas-globe's `.hp-ticker-label` color and the ticker's white label background on dark lineup rows;
  - (b) whether `lib/amethyst/legacy/assets/*` copies are still served;
  - (c) the layout-lock refresh wording;
  - (d) the phone layout (124px label + content to the right at 344px);
  - (e) whether the scripted matrix is a reasonable budget.

## Round-1 changes made
- **B1:** the update steps now start with "Don't remove the extension. Removing it erases your Live Lineup connection code." Developer mode → Update is the main step. Restart and Check for updates are moved to a "2.0.13 or newer" line. The store-delay line is added (nit 6).
- **B2:**
  - A staging branch `cursor/live-lineup-guide-staging` (plan, guide source text and alt texts, 4 images under public/sparkle-suite/help/live-lineup/) is what all prompts point to. It needs Louis's OK (Q5).
  - The alternative is Codex on the box.
  - The PR B prompt lists the image sizes inline.
- **R3:** `?lineupVersionPreview` is dropped. PR A uses a static test render, plus optional screenshots attached to the PR. PR A Smoke loads: 0.
- **Nits:**
  - 1: plain `<a>`, not next/link; optional in-app onClick.
  - 2: details opened via refs.
  - 3: help-resources.test.ts:196-200 terms kept, and 'stale lineup' changed deliberately and listed under Spec corrections.
  - 4: guide/part/src dropped on leave; no re-scroll on Back.
  - 5: the guide version follows the published rule.
  - 7: ≥ 2 rows at 390×700 and nowrap versions.
  - 8: support/read-only view shows the notice text without the link.
  - 9: the Modern Web Guidance fallback URL is in all 3 prompts.
  - 10: the plan states the Smoke ref+SHA is intentional; with no Vercel access, the agent stops after the PR and CI.
  - 11: "One self-review pass, then stop." is in all 3 prompts.
- **New questions for Louis:** Q4 (label also on the no-show calendar row; the plan says yes) and Q5 (OK to push the staging branch).

Please write your round-2 review to /workspace/plans/live-lineup-version-notice-help-plan.rocky-review-2.md. This is the last round: whatever is left goes into the build prompts as fix-it-yourself notes.

## v3 (after round 2, ~11:40 AM ET): how round 2 was folded in (no further review rounds)
- **Blocker 1 (dark-theme labels):** the `.hp-lineup-label` selector is added to the scoped non-reverse label rules in 10 public/amethyst theme files, plus a new CSS test.
- **Blocker 2 (legacy):** Louis decided at 11:12 AM ET: fast pages only. Suite verified 9 of 9 active reps serve SSR on Home, Trade and Join (`data-ssr` present). PR C doesn't touch `lib/amethyst/legacy/**`, the manifest or `rep-render-version.test.ts`. The public/amethyst/*.jsx copies are edited only to keep /skin-preview and the layout locks consistent.
- **Blocker 3 (budget):** capped at 24 loads + 1 Lighthouse, on real public pages only (no /skin-preview): 9 + 5 + 4 + 3 = 21.
- **F-C1 to F-C7, plus the PR A and PR B notes:** pasted into the prompts word for word. They cover the fixed min-height at 344px, the named approval object in the layout-lock fixture, and preset IDs for `ssrReviewTheme`.
- **Prompts:** `/workspace/plans/live-lineup-prompt-pr-{b,a,c}.md`. Staging branch: `cursor/live-lineup-guide-staging`.
