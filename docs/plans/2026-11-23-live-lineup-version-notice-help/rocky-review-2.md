# Rocky plan review, round 2 of 2 (FINAL): version notice + help guide + PR C label
This review covers /workspace/plans/live-lineup-version-notice-help-plan.md (v2) and the addendum. I checked them against the worktree /workspace/ss-plan-1123 @ 9667296a.
- Done Mon Nov 23, 2026, around 11:10 AM ET.
- Static only: 0 builds, 0 tests, 0 loads, 0 DB queries.

## Verdict: Approve with changes
- PR B and PR A are approved as written. Every round-1 blocker and nit is handled in v2 (see the table).
- PR C has three real problems: two user-facing and one cost. Each has an exact fix to paste into the PR C prompt.
- Everything else is a fix-it-yourself note.

## Round-1 items vs v2 (Reported, plan line numbers)
| Item | v2 evidence | Status |
|---|---|---|
| B1: don't reinstall; Developer mode first | L56-61, checklist L93, prompt L282 | Done |
| B2: builder can't open box paths | Staging branch L234-239 + Q5, prompts L274/L301/L325 | Done (needs Louis's OK, Q5) |
| R3: drop the Smoke preview | PR A "Smoke page loads: 0" L317; preview gone | Done |
| Nit 1: plain `<a>` | L126-127, L308 | Done |
| Nit 2: details via refs | L84, L285 | Done |
| Nit 3: search terms | L80, L94, L284 | Done |
| Nit 4: drop params on leave | L85, L92 | Done |
| Nit 5: published rule | L287 | Done |
| Nit 6: store delay | L61 | Done |
| Nit 7: nowrap / ≥2 rows | L125 | Done |
| Nit 8: support view | L129, L145, L308 | Done |
| Nit 9: fallback URL | L277, L303, L327 | Done |
| Nit 10: Smoke ref+SHA intentional, no-access stop | L243-245, L342 | Done |
| Nit 11: one self-review | L294, L318, L344 | Done |

## PR C root cause: confirmed (Reported, git)
- 13e75644, "feat(lineup): condense empty public queues into calendar row":
  - Its timestamp is 2026-10-02 21:17 UTC, which is 5:17 PM EDT.
  - It added `renderEmpty()` to public/amethyst/live-lineup.js and stripped the old headed empty branches from homepage/trade/join.jsx.
  - Its plan doc `docs/plans/2026-10-02-compact-public-lineup.md:16` says "Compact calendar row, no lineup heading/status/time/button".
- feb4b94b (Nov 17, 9:22 PM ET) put "I have an open lineup." into that row.
- The centering CSS is real. Both `.hp-lineup-idle-inner` (homepage.css:6871) and `.hp-trade-preview-inner` (:1696-1698) use `max-width:1280px; margin:0 auto`.
- That 13e75644 was a direct push with no PR is Likely. I didn't check the PR association.

## Blockers (PR C; exact fixes to paste into prompt §9)
1. **Reusing `.hp-ticker-label` makes the label unreadable on 5 dark themes (user-facing).**
   - Those themes set the label **color** with an unscoped selector, but its **background** only inside `.hp-ticker-row`. Examples:
     - fall-owl.css:63 sets `:is(…, .hp-ticker-label, …) { color:#fff3e4 }`;
     - fall-owl.css:66-69 sets `.hp-ticker-row .hp-ticker-label { background:#291a29 }`.
   - The lineup label isn't inside `.hp-ticker-row`, so it would get the base `background:#ffffff` (homepage.css:1165-1181) plus cream text. That's near-invisible on:
     - fall-owl (63/66);
     - midnight-rose (60/63);
     - gobble-and-fizz (68/71);
     - silver-bells (66/69);
     - starlight-christmas-hollow (66/69).
   - The same split exists in rose-champagne, pearl-rose, sunset-beach and pie-please. There the text is dark on white, so it's readable, but it doesn't match the Announcements label.
   - halloween-pumpkin-witch:55 sets the background only for `.hp-ticker-row:not(.reverse)`.
   - These are holiday themes that are in season now.
   - Fix (paste): "Keep `hp-ticker-label hp-lineup-label`. In every theme CSS where a background or color rule is scoped to `.hp-ticker-row .hp-ticker-label` or `.hp-ticker-row:not(.reverse) .hp-ticker-label`, add `, <same prefix> .hp-lineup-label` to that rule (never the `.reverse` rules). That covers fall-owl, midnight-rose, gobble-and-fizz, silver-bells, starlight-christmas-hollow, rose-champagne, pearl-rose, sunset-beach (both blocks, L57 and L299), pie-please and halloween-pumpkin-witch. Do it in the public/amethyst copies and in any served legacy snapshot copy (Blocker 2). Add a CSS test: for every theme file with a scoped `.hp-ticker-row .hp-ticker-label` rule, the same declaration block also selects `.hp-lineup-label`. Don't use `transparent` (tests/amethyst-homepage-template.test.ts:380)."
   - No hero or label animation targets `.hp-ticker-label`. I grepped for animation and transition rules, so there's no motion risk.
2. **The "legacy" copies PR C edits aren't what legacy customers get, and the planned Smoke check reads the same wrong copies (user-facing: an incomplete fix that would look verified).**
   - Every rep not in `REP_RENDER_V2_SLUGS` gets the legacy renderer ("Everyone else keeps legacy", lib/amethyst/rep-render-version.ts:10-14).
   - The legacy renderer serves each asset by manifest. `source:'snapshot'` assets come from **lib/amethyst/legacy/assets/**, and `shared` assets from public/amethyst (lib/amethyst/legacy/public-asset-response.ts:144-151).
   - lib/amethyst/legacy/manifest.json marks `live-lineup.js`, `homepage.css`, `homepage.jsx`, `trade.jsx`, `join.jsx`, `join-runtime.js`, `trade.css`, `join.css` and the theme CSS (e.g. `fall-owl.css`) as **snapshot**, with sha256 hashes. tests/rep-render-version.test.ts:46 "preserves every frozen Live asset byte for byte" guards them.
   - SSR (allowlisted reps) uses lib/amethyst/v2/*.jsx plus public/amethyst/live-lineup.js and CSS (scripts/build-amethyst-ssr.mjs:28-38).
   - `public/amethyst/homepage|trade|join.jsx` are served to **no** Live customer. They feed only `/skin-preview` (lib/amethyst/skin-preview.ts:521-531) and the layout-lock hashes.
   - So the prompt's "legacy public/amethyst/homepage.jsx…" edits plus the `/skin-preview` geometry pass would pass while legacy-path customers see no change.
   - The running log already flagged this: "two customer runtime copies exist and differ … change both or prove one dead". Answer: both are live, for different reps.
   - Fix (paste): "Served copies:
     - SSR reps: lib/amethyst/v2/{homepage,trade,join}.jsx + public/amethyst/live-lineup.js + public/amethyst CSS.
     - Legacy reps: lib/amethyst/legacy/assets/{live-lineup.js,homepage.jsx,trade.jsx,join.jsx,join-runtime.js,homepage.css,trade.css,join.css,<theme>.css}, frozen by lib/amethyst/legacy/manifest.json and tests/rep-render-version.test.ts.

     Ask Louis one question before building: label for legacy reps too (edit the snapshot copies, update their manifest sha256/bytes, and update the frozen-asset test receipt under the same approval), or SSR reps only? Report which reps are on SSR as a count, without names. Keep the public/amethyst/*.jsx edits so /skin-preview and the layout locks stay consistent. Don't treat /skin-preview as proof for legacy reps; verify legacy with one load of a non-allowlisted public site per width."
3. **The Smoke matrix is unbounded (cost).** §2C and prompt L343 ask for every preset ID (16+) × 3 pages × 3 widths × 4 states. That's about 576 page loads, plus 12 SSR-layout loads, 8 screenshots and a Lighthouse run. There's no stated count, and it breaks "one load per page per version per device".
   - Fix (paste): "Smoke budget, **24 loads + 1 Lighthouse**, geometry asserts + screenshots from the same loads:
     - (a) the default skin, Home, 4 lineupReview states × 390/344/1440 = 12;
     - (b) dark-theme spot check, Home, `empty` state at 390, on fall-owl, midnight-rose, gobble-and-fizz, silver-bells and starlight-christmas-hollow = 5;
     - (c) the 4 SSR layouts on /dudesfizzfest at 1440 = 4;
     - (d) one non-allowlisted legacy public site at 390/344/1440 = 3 (only if Louis chose legacy too; otherwise 0).

     Theme coverage beyond (b) comes from the CSS test in Blocker 1, not from loads. Trade and Join share renderEmpty and the CSS, and the unit tests cover them."

## Answers to the addendum's pokes
- **(a) Reuse `.hp-ticker-label` or a separate class:** reuse is right for typography and per-theme colors, but only with Blocker 1's selector additions. A separate class would mean recreating ~10 theme color pairs by hand.
- **(b) Are legacy/assets served?** Yes, to every non-allowlisted rep (Blocker 2).
- **(c) Layout-lock wording:** the fixture records approvals as named objects (`approvedSharedChange`, `approvedAboutNarrativeChange`, …, with date/base/approval/previousSha256/sha256). Note F-C2.
  - The locks are public/amethyst/homepage.css plus `SparkleSuiteHeaderStack`, `Ticker`, `Header` and `LiveQueueStrip` in public/amethyst/{homepage,trade,join}.jsx.
  - v2 LiveQueueStrip isn't locked.
  - public/amethyst/homepage.css currently has the same sha256 as the legacy snapshot (b5e58af6…). After PR C they'll differ unless Louis chooses legacy too.
- **(d) 344px:** the label box is 124px (min-width + 14/22 padding, homepage.css:1297-1300), which leaves about 204px for content.
  - "I have an open lineup." fits on one line.
  - "Check the calendar for the next show." plus the icon and arrow wraps to 2 lines, and 3 with the next-show line.
  - That makes the row-height change between states bigger than today's, and a polling state change counts toward CLS. Note F-C3.
- **(e) Budget:** see Blocker 3.

## Fix-it-yourself notes (paste into the matching prompt)
### PR B (prompt §7)
```
Fix-it-yourself notes (Rocky round 2, PR B):
- If cursor/live-lineup-guide-staging does not exist when you start, stop and report (Louis has not approved Q5). Do not recreate it.
- The 4 images are 1072x1117 (01, jpg), 560x1126 (02), 560x792 (03), 780x566 (04). Use these as next/image width/height. Keep the files byte-identical so the email can hot-link them.
- The guide's "Need a hand?" button must reuse onContactSupport. In the support view, render it as text with no button.
```
### PR A (prompt §8)
```
Fix-it-yourself notes (Rocky round 2, PR A):
- extensionStatus is already validated client-side (show-control.ts:156-164). Do not add a second version regex in the UI. Use workerVersion/latestPublishedVersion/updateNeeded as given.
- Put the notice in its own element after the status row, with role="status". Leave the existing role="alert" warnings (LiveLineupShowControls.tsx:84) alone.
- The test render for Louis comes from the unit test (renderToStaticMarkup at 390 width class names). Attach it to the PR as an image only if you can produce it without a page load.
```
### PR C (prompt §9), on top of Blockers 1-3
```
Fix-it-yourself notes (Rocky round 2, PR C):
- F-C1 Root cause wording: 13e75644 timestamp is 2026-10-02 21:17 UTC (5:17 PM EDT). Say "direct push (no PR found)" only if you confirmed it; otherwise "no PR referenced".
- F-C2 Layout lock receipt: add a named object like the existing ones, e.g. "approvedLiveLineupLabelChange": {date:"2026-11-23", base:"<your base SHA>", approval:"Louis, 10:37 AM ET: restore the LIVE LINEUP left label on the public lineup bar (plan section 2C)", locks:[{path,function,previousSha256,sha256}...]}. Change only the lock entries PR C touches. Every other lock stays byte-identical. If Louis did not explicitly OK the exact design, list this under Spec corrections and ask before merging.
- F-C3 No layout jump: at <=640px give the lineup row one min-height that fits the tallest common state (calendar prompt on 2 lines at 344px, about 56px) in every state, so polling state changes don't grow or shrink the row. Keep the label at x=0 in all states, and keep the SSR fallback markup identical to renderEmpty().
- F-C4 The label is visible text. Keep each section's aria-label (or match it to "Live Lineup") and put no duplicate "Live Lineup" heading in the populated state. The populated head (.hp-trade-preview-head) becomes the label.
- F-C5 The live dot inside the label: no animation when prefers-reduced-motion is set.
- F-C6 /skin-preview/[skin]/[page] takes skin-preview IDs (lib/amethyst/skin-preview.ts), not appearance preset IDs. Map the 5 dark themes in Blocker 3(b) to their skin-preview IDs, or use /dudesfizzfest?ssrReviewTheme=<preset> for any that have no skin-preview.
- F-C7 Report which reps get which renderer as a count only (SSR allowlist size vs legacy), never names.
```

## Prompt-rule check for the new PR C prompt (§9)
These pass:
- one paste-ready block;
- the skill line and the fallback URL (L326-327);
- named tests (4 files, ≤3 runs);
- fix-it-yourself with Spec corrections (L339);
- release steps stop on failure with no fix loop;
- no show, heartbeat or no-show-window gates;
- Live only on Louis's go (plan §3.4, prompt "Do not deploy to Live");
- one self-review, then stop (L344);
- no Store upload.

It **fails** on the stated load count (Blocker 3). "Only what changed" is fine: it checks only the lineup row.

## Learnings for the running log (to list, not push)
- **Reported (code):** public sites use two renderers. SSR v2 is only for reps in `REP_RENDER_V2_SLUGS`. Every other rep gets frozen snapshot copies from lib/amethyst/legacy/assets (manifest `source:'snapshot'`, byte-locked by tests/rep-render-version.test.ts).
- **Reported (code):** `public/amethyst/{homepage,trade,join}.jsx` are served to no Live customer. They feed /skin-preview and the layout locks only, so /skin-preview checks don't prove the legacy path.
- **Reported (code):** several theme files set the ticker label color with an unscoped selector but its background only inside `.hp-ticker-row`. Any reuse of `.hp-ticker-label` outside a ticker row needs the scoped rules extended.
- **Reported (git):** the public lineup label was removed on purpose on Oct 2 (13e75644, "no lineup heading") to make the empty row compact. Later wording changes (#207) inherited the headless row.
