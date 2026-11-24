# Rocky review, round 1 of 2: My Website redesign plan

**Verdict: BLOCK (round 1).** The direction is right and it matches Louis's picks: Concept A, plus C's Try it on pop-up and C's In season / Year-round grouping. Four things would hurt real reps or their data as written (R1–R4). The rest is prompt rules and spec gaps (R5–R8) plus notes. Round 2 checks only R1–R8.

Inputs: plan.md, rocky-brief.md, current-state.md, gaps.md, concepts-summary.md and the A/C PNGs (A 390/880/1440, C try-on 390/1440, C checklist 1440), all viewed.
Code: /workspace/ss-website-audit at HEAD b8fd4646d338 (confirmed), read only. Skills read: .agents/skills/sparkle-nic-nac-agent-architecture, sparkle-suite-production-smoke, vault/README.
Counts: 0 builds, 0 tests, 0 page loads, 0 DB queries, 0 model calls. Only this file was written.

Plan §0 file/line claims check out: SiteSettingsCard DashboardPlaceholder.tsx:9697; handlers at 4475/4527/4662/4685/4749; preview at 6819; hasSiteSettingsUnsavedChanges at 2554; beacon and GA4 at public-asset-response.ts:519–520 and legacy :515–516; ssrReviewTheme in homepage-smoke-review.ts:18–31; skin-preview headers at route.ts:34–38; isAmethystSkinSelectionAvailableToRep at skin-access.ts:51. Section registration is at :234, not ~262 (nit).

## Required changes (blockers first)

### R1. BLOCK: Try it on breaks or shows the wrong theme for legacy-rendered reps. Chunk 1 is only proven on an SSR rep.
- **Reported:**
  - `renderAmethystPublicAssetResponse` uses SSR only when the slug is in `REP_RENDER_V2_SLUGS` (rep-render-version.ts:10–24). Every other rep gets `renderLegacy` (public-asset-response.ts:558–581).
  - The legacy page loads its data in the browser through `data-template-src` → `/api/amethyst/homepage-template` (legacy/public-asset-response.ts:395–400). There, the theme comes from the API, not from an in-memory override. The only theme swap is the Smoke-only `ssrReviewTheme` (homepage-smoke-review.ts:18–31).
  - Under the copied CSP `connect-src 'none'`, that fetch is blocked, so the legacy preview is blank or half-built.
  - The copied CSP's `script-src` (skin-preview route.ts:38) also has no `${origin}`. The real page's own scripts would be blocked too, unless they're inlined.
  - The sample preview works only because it stubs `fetch` with fixture JSON (skin-preview.ts:452).
  - Smoke's allowlist includes `dudesfizzfest` (vault/session-log.md:12), so every Chunk 1 check passes while Live legacy reps break.
- **Paste into Chunk 1 items:** "10. **Renderer parity.** The preview builds the page on the server for every rep, whether or not their slug is in REP_RENDER_V2_SLUGS, using the SSR renderer with the theme override applied to the template data in memory. The finished document must need no browser fetch for its main content. Data that loads after open shows the plan's placeholder (risk 7). Do not change the public allowlist or the public route. Write the preview's CSP for this page; do not copy skin-preview's. Allow `script-src` and `style-src` for `${origin}` and the exact hosts the SSR page needs; keep `connect-src 'none'`, `form-action 'none'`, `frame-ancestors 'self'` and `object-src 'none'`. For reps whose live site still uses the legacy renderer, the pop-up shows: 'Preview uses our newest page engine; small spacing differences from your live site are possible.'"
- **Paste into Chunk 1 checklist:** "- [ ] A Smoke rep NOT in REP_RENDER_V2_SLUGS (named in the report) gets a full preview in the swapped theme (homepage, trade, join) with zero CSP violations in the console."

### R2. BLOCK: the iframe sandbox and the rep's identity must be stated exactly (rep isolation and session safety).
- **Reported:**
  - The plan says only "sandboxed frame" (plan.md:59).
  - The public render path works out the rep from the request (`resolveAmethystRequestRepId(request)`, public-asset-response.ts:613) and checks Join visibility from the request target (:604–606).
  - The settings API uses `getPaidNicNacContext` (api/nic-nac/site-settings/route.ts:17, 42).
- **Paste into Chunk 1 items:**
  - "11. **Identity.** repId and slug come only from `getPaidNicNacContext()` and are passed as `repIdOverride`/`publicSiteSlugOverride`. No rep, slug, `c` or host value from the query or headers is honored. Unpaid or locked accounts get 401/403, the same as the settings API. Join renders only if this rep's own Join page is turned on (same rule as live); otherwise it shows 'Your Join page is off.'"
  - "12. **Frame.** Embed the way skin-preview does it (skin-preview.ts:614): `srcdoc` with `sandbox="allow-scripts"` ONLY. Never `allow-same-origin`, `allow-forms`, `allow-popups` or `allow-top-navigation`; links inside the preview do nothing. Give the iframe `title="Preview of your site in <Theme>"` and `referrerpolicy="no-referrer"`. The no-beacon/no-GA4 option is a typed server-only argument, never read from the URL or headers."
- **Paste into Chunk 1 checklist:**
  - "- [ ] `?rep=`, `?c=` or `?slug=` pointing at another Smoke rep still shows MY site."
  - "- [ ] The iframe has exactly `sandbox="allow-scripts"`."
  - "- [ ] Public `/dudesfizzfest` still has the beacon and gtag."

### R3. BLOCK: removing Hero motion "for standard layouts" removes a working control for legacy reps, and On/Off can lose a saved value.
- **Reported:**
  - Only the v2 renderer forces the theme's own motion: `applyHomepageTheme`, v2/homepage.jsx:3758–3759.
  - The legacy homepage has no such override. It reads the rep's value on the standard hero (legacy/assets/homepage.jsx:866–869, 3849–3850); preset values are applied only from the dev tweak panel (:3868–3871).
  - The custom layouts read only on/off (`still`/`none` → off: v2/homepage.jsx:3485, 3624, 3708).
  - The server accepts `still | sparkle_rise | soft_glow` (site-settings.ts:584–595).
- **Paste over Chunk 4 items 1–2:** "`heroMotionApplies` = (rep is on a custom layout) OR (rep's slug is not v2-rendered per `repRenderV2Enabled`). Legacy standard reps keep today's 3-choice control under the label 'Hero motion'. Custom-layout reps get the On/Off switch: Off saves `still`; On saves their previous non-still value if they had one, otherwise `sparkle_rise`. Leaving the switch alone sends nothing. If a legacy rep later moves to v2, the control hides itself; the stored value stays."
- **Paste into Chunk 4 checklist:** "- [ ] Unit: heroMotionApplies is true for a non-allowlisted standard rep, false for an allowlisted standard rep, true for each custom layout. A soft_glow custom-layout rep who toggles Off then On ends with soft_glow."

### R4. BLOCK: name every control in the 3b map; today Email and two more aren't placed.
- **Reported:** these are in today's page but not in the 3b section map (plan.md:103):
  - Email (DashboardPlaceholder.tsx:9949; shows in the Join page footer Contact).
  - Britt-only "Show the About Brittany and Sparkle Moments section" (:10186).
  - The "Preview customer site" button (:9867).
- The 3b catch-all line and the §2 check (plan.md:115) would catch the gap, but only after the build.
- **Paste into the 3b item 1 map:**
  - 1 Top bar: add the emoji buttons and "Link selected words".
  - 4 What is a Bomb Party: add "Live reveal video + caption".
  - 5 About you: add "photo caption, Remove photo, short-video captions + Remove video, Britt-only 'Show the About Brittany and Sparkle Moments' switch, media help text".
  - 6 Sign-up & discount: add "switch, code, message".
  - 7 Footer & socials: add "**Email** (Shows on: Join page Contact), each social's Show on site / Show in hero, Team I belong to".
- **Paste into 3a item 2:** "The **Preview customer site** button stays in the header card next to View my site, renamed 'Preview saved site'. Same handler, `handleOpenCustomerSitePreview`."

### R5. REQUIRED: the build prompt rules break the efficiency standard.
- plan.md:161 uses a different Modern Web Guidance line and says "Stop on failure — no fix loops". That's the release/deploy rule; it contradicts the build fix-it-yourself rule. The plan also has no "Spec corrections I made" section, no "one paste-ready block", and no named test files (plan.md:49, "Unit tests for the route").
- **Paste over plan.md:161:** "**Every build prompt is ONE paste-ready block per chunk** with repo, branch, base SHA, this chunk's items and checklist verbatim, and the file paths. It includes, word for word: 'Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task.' (fallback: https://developer.chrome.com/docs/modern-web-guidance). Build rule: if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under **Spec corrections I made**, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates. Deploy rule: if the one Smoke deploy fails, stop and report; no fix-redeploy loop. Run only the named test files for the chunk, plus CI. One self-review pass, then stop. Test only what this chunk changed. No show-state or show-timing gates."
- **Paste the named tests per chunk:**
  - Chunk 1: `tests/nic-nac/site-preview-route.test.ts` (auth/paid, theme allowlist, identity ignores query, headers/CSP, no beacon/GA4, legacy-slug rep renders SSR).
  - Chunk 2: `tests/nic-nac/theme-season-grouping.test.ts` (Oct 15 / Nov 23 / Jan 10, Eastern midnight edges, saved theme first, unavailable saved theme) and `tests/nic-nac/theme-studio-card.test.tsx` (radio semantics, Use/Keep draft only, no codes).
  - Chunk 3a: `tests/nic-nac/site-save-bar.test.tsx`.
  - Chunk 3b: `tests/nic-nac/site-settings-layout-map.test.tsx` (every current control id present).
  - Chunk 4: `tests/nic-nac/hero-motion-applies.test.ts`.
  - Changed: `tests/nic-nac-dashboard-placeholder.test.ts` and `tests/nic-nac/workspace-control-tips.test.ts` (they reference `site-settings-save-status` / `save-site-settings`).

### R6. REQUIRED: Galaxy Z Fold 6 cover screen and fold/unfold.
- **Reported:** the plan tests 390 / ~880 / 1440 (plan.md:155).
- **Likely:** the Fold 6 cover screen is narrower than 390 (about 360–375 CSS px) and very tall; the inner screen is about 880 wide and close to square.
- At the narrower width, the sticky bar ("3 unsaved changes · Discard · Save & publish") plus the Workspace tab bar plus the bottom sheet are the tightest fit.
- **Paste into §3:** "Screens: Fold 6 cover at the device's real CSS width (record it, about 360–375), Fold 6 inner (~880), 1440. At the cover width the save bar is one row or wraps without covering the tab bar or the focused field (use `scroll-padding-bottom` equal to the bar height). Open Try it on at cover width, then resize to inner width with it still open: it stays usable or turns into the inner layout, and focus survives. Same load budgets. Swap the 390 loads for cover-width loads; don't add loads."

### R7. REQUIRED: spec gaps that would make the builder guess.
- **a. Chips vs grouping (plan.md:57).**
  - A's mockups show filter chips (All / Holiday / Fall / Everyday / Colors / Halloween); Louis picked C's grouping.
  - Paste: "No filter chips. The studio shows **In season now**, then **Year-round**, using C's headings. 'Show all N themes' expands Year-round on phone."
- **b. Try it on contents (plan.md:60).** The C mockups show Home / Dance Floor / Join tabs and "Hold to compare with Silver Bells".
  - Paste: "The pop-up has Home / Dance Floor / Join tabs, plus a close (X) button, Back to themes and Use this theme. **No hold-to-compare** in this pass (pointer-only, not keyboard-accessible); it goes on the follow-up list."
- **c. Saved theme not on offer.** A retired theme (Rose Quartz), or a private grant that was later revoked.
  - Paste: "If the saved theme isn't in skin-options, show it first as 'Live now (no longer offered)', selected, with no unsaved change. Picking another theme is a one-way change, and the notice line says so."
- **d. Cost and speed of preview renders.** The 0.2s criterion (plan.md:69) can't be met by a server render.
  - Paste: "The card selection shows within 0.2s. The preview shows its loading state at once, abort the previous request on a new tap, and keep each theme's preview cached for the session. The new preview's main content shows in under 2.5s on phone. Videos in preview: poster only, `preload="none"`."
  - The 880+ panel loads the preview after the cards are interactive (at idle), never before.

### R8. REQUIRED: Discard and the save bar must say what they can't undo.
- **Reported:** photo upload stores the file at once, and Remove video saves at once (DashboardPlaceholder.tsx:4662–4679; current-state.md:67).
- **Paste into 3a item 3:** "Discard resets text and switch edits only. A photo uploaded but not saved stays uploaded and isn't published; Remove video is already saved. The confirm says: 'Discard N unsaved changes? Uploaded photos stay in your library; removed videos stay removed.'"

## Notes (fix-it-yourself in the build; no re-review)
1. **Team I manage (plan.md:127, 139).**
   - **Reported:** Team Management edits the same parent draft (DashboardPlaceholder.tsx:7140–7142), and My Website saves the whole normalized draft (:4703). The server patch is partial (site-settings.ts:597), so leaving teamName and recruitingLink out of the My Website save is safe.
   - Do that, and don't count Team Management draft edits in the My Website unsaved count.
2. **Footer tagline note (plan.md:131).** Also show "Also shows under your headline if that line is empty" for grandfathered legacy sites (current-state.md:46), not only Britt with Bling and Mile High Fizz.
3. **Leave warning.** `beforeunload` covers refresh and close only. Also guard in-app navigation away from /nic-nac (Next router links) with the same confirm.
4. **Nic-Nac writes.** The `update_site_setting` tool can write while the page is open. After a Nic-Nac write, refresh the saved values without clobbering the draft (existing behavior; just don't regress it).
5. **a11y basics.**
   - Theme cards: a real radio group with a visible legend, plus a focus ring that passes contrast on pink.
   - Dialog: native `showModal`, Esc and the X close it, and focus goes back to the card. Swipe-down closing is extra, not the only way.
   - The save bar's count is `role="status"`. Section headers are `<summary>` with their status chip in the name text.
   - Reduced motion turns off the sheet slide and card animations.
6. **Season windows.** Compute the Eastern date with Intl (`America/New_York`) on the client. The Christmas and Thanksgiving overlap (Nov 15–30) shows both in In season now, as in the C mockup.
7. **Thumbnails.** 480px webp with fixed aspect ratio and `loading=lazy`. The first row in view loads eagerly with `fetchpriority=low`. No 19-iframe gallery.
8. **Mile High Fizz.** Chunks 1–4 change labels only. Email, Business name and Team name keys and values are untouched (agrees with plan.md:146). Chunk 5 stays unscheduled. Keep the "API payload diff shows the same field names" check (plan.md:140).
9. **No show state.** Upcoming shows is read-only text plus an Open Calendar link, with no show data loaded (plan.md:106). Good. No show-timing gates anywhere.
10. **Rollout (plan.md:164–165).** Combined Smoke, then Live only on Louis's words, then the rollback ID. Fine. Use the production-smoke skill's reviewer-smoke path; never Louis's personal account.
11. **CI baseline (plan.md:157).** State the base SHA the baseline was taken on. Re-baseline if the branch tip moves past b8fd4646.
12. **Nit:** `SECONDARY_WORKSPACE_SECTIONS` is at :234, not ~262 (current-state.md:11).

## What's already right
- It matches Louis's pick. B's live text preview is out of scope.
- No public `?previewTheme` (plan.md:36). Beacon and GA4 skipped in preview, with a 0-visit check (plan.md:43). The private theme gets a 404. No migrations (correct: the save path is a partial patch).
- Load budgets are stated per chunk (plan.md:158). Test only what changed (plan.md:154). One Rocky review per run (plan.md:160). Customer pages are byte-diffed in Chunk 1 (plan.md:47).
- The 3a/3b split is right. The dependencies are 1 → 2 (preview route) and 3a → 3b (the save bar sits under the moved sections); chunk 4 depends on 3b's map.
