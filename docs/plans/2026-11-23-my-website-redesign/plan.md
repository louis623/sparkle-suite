# My Website redesign: build plan (round 2)

Status: **plan only.** No code, PRs, deploys or database writes have been made.
Repo: `louis623/sparkle-suite`. Production branch: `codex/nic-nac-trade-hardening`. **Base SHA: `b8fd4646d338`** (tip on Nov 23, 5:54 PM ET). If the tip has moved when a chunk starts, re-take the CI baseline on the new tip and record both SHAs. Smoke project: `sparkle-suite-smoke`.
Louis's pick (Nov 23, 8:06 PM ET): **Concept A, plus C's "Try it on" pop-up and C's "In season now / Year-round" grouping.**
Round 1 version kept at `ref/plan-round1.md`. Rocky's round 1 findings and where each was fixed: `rocky-fixes-1.md`.

## 0. Goal and final design

**Goal.** Turn Tools → "Customer-facing site setup" into **My Website**: a polished page where the theme sits at the top and reps can see their own site in a new theme *before* saving. The rest of the controls follow the order customers scroll the site.

**Final design** (mockups are in this folder):
- Base layout: `concept-A-theme-studio.html` with `concept-A-theme-studio-390.png`, `-880.png` and `-1440.png`: header card with the site address, the "things left to finish" strip, the **Choose your theme** studio, the numbered homepage sections, the **Other pages** group and the sticky save bar.
- From C: the **Try it on** pop-up (`concept-C-tryon-390.png`, `concept-C-tryon-1440.png`), the main way to preview on a phone, and the **In season now / Year-round** headings (C's "Pick your look" step in `concept-C-guided-checklist-1440.png`).
- **Differences from the mockups (these win over the pictures):** no filter chips (A's All / Holiday / Fall / Everyday / Colors / Halloween row is dropped); no "Hold to compare" in Try it on (follow-up list).
- Not in scope: C's step-by-step page layout, and B's live text preview.

**What the code already gives us** (checked at `b8fd4646`):
- Page: `SiteSettingsCard` in `app/nic-nac/components/DashboardPlaceholder.tsx:9697`. Handlers in the same file: draft 4475, upload 4527, remove video 4662, save 4685/4749, preview 6819, unsaved check 2554. Section registration `SECONDARY_WORKSPACE_SECTIONS` at :234.
- Theme catalog: `lib/amethyst/skin-cards.ts`. Themes a rep may pick: `GET /api/nic-nac/skin-options` → `lib/amethyst/skin-access.ts` (`isAmethystSkinSelectionAvailableToRep`, :51).
- Rep identity for Workspace APIs: `getPaidNicNacContext()` (`lib/nic-nac/auth.ts:60`), used by `app/api/nic-nac/site-settings/route.ts:17,42`.
- Public render path: `app/[publicSiteSlug]/route.ts` → `renderAmethystPublicAssetResponse` (`lib/amethyst/public-asset-response.ts`) → `lib/amethyst/preview-template-data.ts`. That path injects the visit beacon and GA4 (:519–520; legacy :515–516).
- Hardened sample preview to learn from (not copy blindly): `app/skin-preview/[skin]/[page]/route.ts` (headers :34–38) and `lib/amethyst/skin-preview.ts` (meta CSP injected into the framed document :541, fetch stub :452, `srcdoc` frame :614).

### 0.1 Renderer facts (verified Nov 23, 2026; code + public pages only, no DB queries)
1. **What `REP_RENDER_V2_SLUGS` gates** (`lib/amethyst/rep-render-version.ts`): a comma list of rep slugs. A listed slug gets the server-rendered (SSR) Homepage, Trade (Dance Floor) and Join pages together; Pantry only for Bling Kitchen. A slug not listed gets the older browser-built renderer (`renderLegacy`, `public-asset-response.ts:558`), which fetches its data from `/api/amethyst/homepage-template` after the page opens. If an SSR render throws, the public route **falls back to the older renderer** (`public-asset-response.ts:756–758`).
2. **Live value:** on Vercel project `sparkle-suite` the variable is Production-only and stored as *sensitive*, so its value can't be read (last edited Nov 3, 2026, 9:30 PM ET). I didn't try to decrypt it.
3. **What Live actually serves** (public GET of each page; SSR pages carry `data-server-rendered` and the `x-sparkle-page-data` header; older-renderer pages carry `data-template-src`): **SSR** for every real rep slug I could find in the repo: `dudesfizzfest`, `milehighfizz`, `brittwithbling`, `blingkitchen`, `goforthebling`, `maingemco`, `sparklybutterflies`, `brisglowtique`, `blingwithkrissig` (9). **Older renderer** only on demo/test slugs: `sparklebetademo`, `louisfizzfest`, `demosparklestudiod5decc`. So Louis is right that the reps are on the fast pages. The code path for an unlisted slug still exists and must stay correct (new reps get it until they're added to the list).
4. **Smoke:** the Smoke list was `dudesfizzfest,milehighfizz` (vault/2026-11-02-lindsey-signup-discount-smoke.md:25). The builder confirms the Smoke deployment's behaviour the same way as item 3 and names one Smoke rep slug that serves the older renderer.
5. **Hero motion** (`hero_animation_type`; server accepts `still | sparkle_rise | soft_glow`, `lib/services/site-settings.ts:584–595`):
   - SSR standard layout: the hero is hard-coded `data-hero-motion="on"` (`lib/amethyst/v2/homepage.jsx:905`) and `applyHomepageTheme` replaces the rep's value with the theme's own motion (:3758–3759). **The rep's choice does nothing.**
   - SSR custom layouts (Mile High Fizz :3485, Britt with Bling :3624, Bling Kitchen :3708): read the rep's value as on/off only (`still`/`none` = off).
   - Older renderer, standard layout: reads all three values (`legacy/assets/homepage.jsx:866–869`).
   - So on Live today the control only has an effect for the 3 custom-layout reps; the 3-choice control matters only for slugs not on the list.
6. **"Grandfathered" sites** (footer tagline doubles as the line under the headline when that line is empty): only Britt with Bling and Mile High Fizz (`preview-template-data.ts:558`), for both renderers.

**Scope freeze.** Each chunk's checklist below is agreed with Louis before building. Nothing gets added mid-pass. Anything new goes on the follow-up list (§7).

## 1. Chunks: one PR each, one paste-ready block each

Order and dependencies: **1 → 2** (picker needs the preview route), **3a → 3b** (save bar sits under the moved sections), **4** after 3b (uses 3b's map). Chunk 5 (Mile High Fizz) is **not scheduled**; Louis decides.

Every block below is complete on its own: paste the whole fenced block into the cloud agent. The shared rules are repeated inside each block on purpose.

### Chunk 1: Theme preview route (server only, nothing on screen yet)

```text
TASK: Sparkle Suite — My Website redesign, Chunk 1 of 5: signed-in theme preview route.
Repo louis623/sparkle-suite. Branch from codex/nic-nac-trade-hardening at base SHA b8fd4646d338 (if the tip moved, use the new tip and record both SHAs). One PR into codex/nic-nac-trade-hardening. Do not merge or close PRs. No Live deploys, no Live database writes. Smoke project: sparkle-suite-smoke.

Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task. (Fallback if the skill is unavailable: https://developer.chrome.com/docs/modern-web-guidance)

BUILD RULE: if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under "Spec corrections I made" in your report, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates.
DEPLOY RULE: if the one Smoke deploy fails, stop and report; no fix-redeploy loop.
Test only what this chunk changed. No show-state or show-timing gates anywhere. Smoke: use the production-smoke skill's reviewer-smoke path, never Louis's personal account; never print secrets.

FILES: new app/nic-nac/site-preview/route.ts; new lib/amethyst/site-preview.ts; lib/amethyst/public-asset-response.ts (typed server-only option only); tests below.

ITEMS (each is its own change):
1. New route GET /nic-nac/site-preview?theme=<id>&page=homepage|trade|join. Loads the signed-in rep's own saved settings, swaps only the theme in memory, renders, never writes. The Workspace fetches it (same-origin fetch) and shows the HTML in an iframe srcdoc (item 12). Opening the URL directly also works and gets the same headers.
2. Theme check: only IDs in AMETHYST_APPEARANCE_PRESET_IDS that isAmethystSkinSelectionAvailableToRep (lib/amethyst/skin-access.ts:51) allows for this rep. Anything else → 404.
3. Preview option on the render path: a typed server-only argument (never read from the URL or headers) that skips the visit beacon and skips GA4.
4. Sign-up form off: it shows but can't submit (form-action 'none' + submit disabled, label "Preview only").
5. Music and hero video start paused; music control disabled; videos poster only, preload="none".
6. Route response headers: Cache-Control: no-store, private; X-Robots-Tag: noindex, nofollow; Referrer-Policy: no-referrer; X-Content-Type-Options: nosniff; its own CSP (item 10).
7. No public URL change: no ?previewTheme (or similar) on customer URLs. The Smoke-only ssrReviewTheme stays as it is.
8. Live-engine header: the route sends X-Preview-Live-Engine: ssr when repRenderV2Enabled(slug) is true, otherwise legacy. Chunk 2 uses it for the notice in item 10.
9. No fallback: if the SSR render throws, the route returns 503 (no body detail). It never falls back to renderLegacy (unlike the public route, public-asset-response.ts:756–758).
10. Renderer parity. The preview builds the page on the server for every rep, whether or not their slug is in REP_RENDER_V2_SLUGS, using the SSR renderer with the theme override applied to the template data in memory. The finished document must need no browser fetch for its main content. Data that loads after open shows the plan's placeholder (risk 7). Do not change the public allowlist or the public route. Write the preview's CSP for this page; do not copy skin-preview's. Allow script-src and style-src for ${origin} and the exact hosts the SSR page needs; keep connect-src 'none', form-action 'none', frame-ancestors 'self' and object-src 'none'. Put the same policy (minus frame-ancestors, which meta tags ignore) in a <meta http-equiv="Content-Security-Policy"> at the top of the returned document, because a srcdoc document doesn't get the response headers (skin-preview.ts:541 does the same). For reps whose live site still uses the legacy renderer, the pop-up shows: 'Preview uses our newest page engine; small spacing differences from your live site are possible.' Add `<base href="${origin}/">` (or rewrite asset URLs to absolute) in the returned document; a `srcdoc` document resolves relative URLs against `about:srcdoc` (skin-preview.ts:541 adds a base for the same reason). A `srcdoc` frame also inherits the Workspace page's own CSP; if that blocks the preview, fix it in the preview document, never by loosening the Workspace CSP.
11. Identity. repId and slug come only from getPaidNicNacContext() and are passed as repIdOverride/publicSiteSlugOverride. No rep, slug, c or host value from the query or headers is honored. Unpaid or locked accounts get 401/403, the same as the settings API. Join renders only if this rep's own Join page is turned on (same rule as live); otherwise it shows 'Your Join page is off.' Trade follows the same rule with 'Your Dance Floor page is off.' Pass the renderer a clean URL built from the origin and the page path only (no query string), so Smoke's `ssrReviewTheme`/`ssrReviewLayout` (homepage-smoke-review.ts:18–31) and any other query value can't change the theme or layout past the item-2 check.
12. Frame. Embed the way skin-preview does it (skin-preview.ts:614): srcdoc with sandbox="allow-scripts" ONLY. Never allow-same-origin, allow-forms, allow-popups or allow-top-navigation; links inside the preview do nothing. Give the iframe title="Preview of your site in <Theme>" and referrerpolicy="no-referrer". (Chunk 1 ships a tiny shared helper/component for this frame; chunk 2 puts it on screen.)

ACCEPTANCE CHECKLIST (agreed before building; nothing added mid-pass):
- [ ] Signed in as Smoke rep dudesfizzfest, /nic-nac/site-preview?theme=rose_champagne&page=homepage shows MY headline, shows and photos in Rose Champagne. The live site still shows its saved theme.
- [ ] Trade and Join render in the swapped theme too. With Join turned off, page=join shows "Your Join page is off."
- [ ] A Smoke rep NOT in REP_RENDER_V2_SLUGS (Smoke's list is dudesfizzfest,milehighfizz, so any other Smoke rep works; named in the report; confirm its public page has data-template-src and no data-server-rendered) gets a full preview in the swapped theme (homepage, trade, join) with zero CSP violations in the console, and the response carries X-Preview-Live-Engine: legacy.
- [ ] ?rep=, ?c= or ?slug= pointing at another Smoke rep still shows MY site.
- [ ] Signed out → 401. Unpaid/locked → same status as GET /api/nic-nac/site-settings. Unknown theme → 404. A private theme I don't have → 404.
- [ ] Headers: no-store, private; noindex; no-referrer; CSP has connect-src 'none', form-action 'none', frame-ancestors 'self', object-src 'none'; the document starts with the meta CSP. Framing from another origin is refused.
- [ ] The iframe has exactly sandbox="allow-scripts" (checked in the helper's unit test).
- [ ] Opening the preview 3 times adds 0 site visits (Site Visits panel count unchanged; no visit beacon in the HTML) and 0 GA4 hits (no gtag in the HTML).
- [ ] Public /dudesfizzfest still has the visit beacon, and gtag if that rep has GA4 set (say which in the report).
- [ ] The sign-up form can't submit, and no request leaves the framed page (DevTools network list empty after load apart from same-origin static assets).
- [ ] No sound plays and the hero video is paused on load.
- [ ] No database row changes (saved theme and visit counts unchanged before/after).
- [ ] Customer pages byte-for-byte unchanged apart from deployment IDs: diff /dudesfizzfest and the non-listed rep's public page before and after.
- [ ] A forced SSR error returns 503, not the legacy page.
- [ ] Preview main content under 2.5s on the Fold 6 cover phone profile and under 2s on desktop.

NAMED TESTS (run only these, plus CI): tests/nic-nac/site-preview-route.test.ts (auth/paid, theme allowlist, identity ignores query, headers/CSP incl. meta CSP, no beacon/GA4, legacy-slug rep renders SSR, 503 on SSR error, X-Preview-Live-Engine).
SMOKE PAGE-LOAD BUDGET: 12. Screens: Fold 6 cover (record real CSS width, ~360–375), ~880, 1440.
REPORT: PR, Smoke deployment ID, base SHA(s), checklist pass/fail per line, named non-listed Smoke rep, screenshots at the three widths, loads used, CWV numbers, CI vs baseline, Spec corrections I made. If no off-list Smoke rep can sign in, or the Smoke `REP_RENDER_V2_SLUGS` has changed so none serves the older renderer, say so and cover the old-renderer case with the named unit test only. Don't edit Smoke env to create one.

One self-review pass, then stop.
```

### Chunk 2: Visual theme picker + seasonal grouping + Try it on

```text
TASK: Sparkle Suite — My Website redesign, Chunk 2 of 5: visual theme studio, In season now / Year-round grouping, Try it on pop-up.
Repo louis623/sparkle-suite. Branch from codex/nic-nac-trade-hardening including Chunk 1 (stacked on the combined Smoke branch), base SHA recorded in the report. One PR. Do not merge or close PRs. No Live deploys, no Live database writes. Smoke project: sparkle-suite-smoke.

Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task. (Fallback if the skill is unavailable: https://developer.chrome.com/docs/modern-web-guidance)

BUILD RULE: if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under "Spec corrections I made" in your report, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates.
DEPLOY RULE: if the one Smoke deploy fails, stop and report; no fix-redeploy loop.
Test only what this chunk changed. No show-state or show-timing gates anywhere. Smoke: production-smoke skill's reviewer-smoke path, never Louis's personal account; never print secrets.

FILES: app/nic-nac/components/DashboardPlaceholder.tsx (SiteSettingsCard theme area only); new app/nic-nac/components/ThemeStudio.tsx; new lib/amethyst/theme-seasons.ts; lib/amethyst/skin-cards.ts (new fields); public/amethyst/skins/<theme>/thumb.webp; tests below. Design reference: concept-A-theme-studio-*.png, concept-C-tryon-*.png (differences listed below win).

ITEMS (each is its own change):
1. Theme studio card at the top of the page. Replaces the theme <select>, which is removed from "Branding and visuals".
2. Theme cards: a real radio group (<fieldset> with a visible legend "Choose your theme"; <label> + radio per card; selection drawn without moving the layout; focus ring passes contrast on pink and on the Black Diamond look). Each shows thumbnail, theme name, color dots, a "Live now" chip on the saved theme, a check on the chosen one.
3. Thumbnails: 480px-wide webp, fixed aspect ratio, loading="lazy"; the first row in view loads eagerly with fetchpriority="low". Made from each theme's existing hero poster. Color-only themes (Morganite, Moonstone, Emerald Garden, Rose Gold, Garnet, Amber, Velvet, Black Diamond, Alpine Opal) get a CSS color block. No 19-iframe gallery.
4. New fields in skin-cards.ts: season (christmas / thanksgiving / halloween / none), thumb path, preview colors. No theme is renamed.
5. Grouping: no filter chips. The studio shows "In season now", then "Year-round", using C's headings. "Show all N themes" expands Year-round on phone. Season windows (Eastern date via Intl, timeZone America/New_York, computed on the client): Halloween Oct 1–31, Thanksgiving Nov 1–30, Christmas Nov 15–Dec 31; the Nov 15–30 overlap shows both. Out-of-season seasonal themes go at the end of Year-round with a small season tag. The saved theme always comes first.
6. Theme names without internal codes (no "(SB-01)"). Private themes show a short "Just for you" tag instead of "— Brittany's original custom skin".
7. Saved theme not on offer: if the saved theme isn't in skin-options, show it first as 'Live now (no longer offered)', selected, with no unsaved change. Picking another theme is a one-way change, and the notice line says so ("You can't switch back to <name> after saving.").
8. Preview panel (880 and up): uses the Chunk 1 frame helper (srcdoc, sandbox="allow-scripts" only). Fold inner: phone frame; desktop: browser frame with Home / Dance Floor / Join tabs. It loads only after the cards are interactive (at idle), never before.
9. Try it on pop-up (under 720px; on desktop it opens from a card's "Try it on" link): native <dialog> opened with showModal(), bottom sheet on phone. Contents: Home / Dance Floor / Join tabs, a close (X) button, "Back to themes" and "Use this theme". No hold-to-compare in this pass. Esc and X close it and focus returns to the card. Swipe-down closing is optional extra, never the only way. Reduced motion turns off the sheet slide and card animations. When the preview response has X-Preview-Live-Engine: legacy, the pop-up shows the notice from Chunk 1 item 10 ("Preview uses our newest page engine; small spacing differences from your live site are possible.").
10. Speed: the card selection shows within 0.2s. The preview shows its loading state at once, aborts the previous request on a new tap (AbortController), and keeps each theme+page preview cached in memory for the session. The new preview's main content shows in under 2.5s on phone.
11. "Use <theme>" sets the draft theme only; still needs Save. "Keep <current>" resets the draft theme to the saved one.
12. Notice line: "Customers keep seeing <saved theme> until you save."
13. Loading and error states: skeleton cards; if the preview fails, "Preview isn't available right now. Your theme choice still works." with a Retry button.

ACCEPTANCE CHECKLIST (agreed before building; nothing added mid-pass):
- [ ] The studio is the first card under the page header at cover width, ~880 and 1440. No filter chips anywhere.
- [ ] The Smoke rep sees exactly the themes /api/nic-nac/skin-options returns, plus the saved theme if it isn't offered.
- [ ] Unit (dates): Oct 15 → Halloween in season; Nov 23 → Thanksgiving and Christmas in season, Halloween at the end of Year-round; Jan 10 → nothing in season. 11:59 PM vs 12:00 AM Eastern on Oct 31/Nov 1 and Dec 31/Jan 1 flip correctly. Saved theme first.
- [ ] Saved theme not offered (unit + Smoke rep fixture if one exists) shows "Live now (no longer offered)", selected, 0 unsaved changes.
- [ ] Tapping a card shows the selection within 0.2s with no layout jump; the preview shows its loading state at once; tapping a second card cancels the first request; going back to a viewed theme shows it from cache with no new request.
- [ ] At cover width "Try it on" opens the pop-up with Home / Dance Floor / Join tabs. X, Back to themes and Esc close it. Focus returns to the card.
- [ ] Open Try it on at cover width, then unfold/resize to ~880 with it still open: it stays usable or turns into the inner layout, and focus survives.
- [ ] Use → 1 unsaved change, live site unchanged until Save. Keep → 0 unsaved changes. After Save the live site shows the new theme and the Live now chip moves.
- [ ] A non-listed (legacy) Smoke rep sees the engine notice in the pop-up; a listed rep doesn't.
- [ ] No internal theme codes appear anywhere on the page.
- [ ] Keyboard: arrow keys move through the radio group, visible legend and focus ring, screen reader reads "Rose Champagne, selected" (or the platform's equivalent radio announcement).
- [ ] Thumbnails cause no layout jump (CLS < 0.1). Page main content under 2.5s on phone, under 2s on desktop. The 880+ panel's preview request starts after the cards are interactive.
- [ ] The Black Diamond Workspace look still styles the new card correctly.

NAMED TESTS (run only these, plus CI): tests/nic-nac/theme-season-grouping.test.ts (Oct 15 / Nov 23 / Jan 10, Eastern midnight edges, saved theme first, unavailable saved theme); tests/nic-nac/theme-studio-card.test.tsx (radio semantics and legend, Use/Keep change the draft only, no codes, dialog close paths, abort + session cache).
SMOKE PAGE-LOAD BUDGET: 18. Screens: Fold 6 cover (record real CSS width, ~360–375), ~880, 1440.
REPORT: PR, Smoke deployment ID, base SHA, checklist pass/fail per line, screenshots at the three widths, loads used, CWV numbers, CI vs baseline, Spec corrections I made, follow-ups (hold-to-compare).

One self-review pass, then stop.
```

### Chunk 3a: Save bar, leave warning, field errors, header card

```text
TASK: Sparkle Suite — My Website redesign, Chunk 3a of 5: sticky save bar, Discard, leave warning, field errors, header card with View/Copy my site, rename to My Website.
Repo louis623/sparkle-suite. Branch from codex/nic-nac-trade-hardening including Chunks 1–2 (combined Smoke branch), base SHA recorded in the report. One PR. Do not merge or close PRs. No Live deploys, no Live database writes. Smoke project: sparkle-suite-smoke.

Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task. (Fallback if the skill is unavailable: https://developer.chrome.com/docs/modern-web-guidance)

BUILD RULE: if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under "Spec corrections I made" in your report, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates.
DEPLOY RULE: if the one Smoke deploy fails, stop and report; no fix-redeploy loop.
Test only what this chunk changed. No show-state or show-timing gates anywhere. Smoke: production-smoke skill's reviewer-smoke path, never Louis's personal account; never print secrets.

FILES: app/nic-nac/components/DashboardPlaceholder.tsx (SiteSettingsCard, save/draft handlers 2554–2575, 4475–4749, preview 6819, section label at :234); new app/nic-nac/components/SiteSaveBar.tsx; tests below.

ITEMS (each is its own change):
1. Sticky save bar (bottom on phone, sitting above the Workspace tab bar; floating on desktop). Shows the unsaved-change count ("3 unsaved changes", role="status"), a short list of what changed, Discard and "Save & publish". Hidden when nothing has changed. The page sets scroll-padding-bottom equal to the bar height so a focused field is never under it.
2. Header card: site address, "View my site ↗" (live site, new tab), "Copy link" (with "Copied" confirmation), and the existing "Preview customer site" button kept next to View my site and renamed "Preview saved site" (same handler, handleOpenCustomerSitePreview). Uses buildWorkspacePublicSiteLocation, so custom domains show when set.
3. Discard resets text and switch edits only. A photo uploaded but not saved stays uploaded and isn't published; Remove video is already saved. The confirm says: "Discard N unsaved changes? Photos you uploaded stay uploaded but won't show on your site; removed videos stay removed." Buttons: "Discard changes" / "Keep editing".
4. The old top-right "Save site settings" button and its status text are removed (replaced by the bar).
5. Leave warning: beforeunload fires while there are unsaved changes (refresh/close). In-app navigation away from /nic-nac (Next router links) asks with the same confirm. The draft still survives switching Workspace tabs, as today.
6. Save is always tappable. If something is wrong it shows the error on the field and moves focus there instead of sitting disabled.
7. Field-level checks using the server's rules: store link (full http/https URL), email (type=email, autocomplete=email), discount code and message (existing rules), social links (existing check). Errors show under the field (aria-describedby), checked on blur and on Save, cleared as fixed.
8. Server errors show in the bar ("Couldn't save. <message>") and the draft is kept.
9. Nic-Nac writes: after an update_site_setting write while the page is open, saved values refresh without clobbering the draft (today's behavior; don't regress it).
10. Page renamed "My Website" in the tab list, tools hub, and the Team Management link text ("Open Site Settings" → "Open My Website"). The site-settings URL key is unchanged.

ACCEPTANCE CHECKLIST (agreed before building; nothing added mid-pass):
- [ ] Edit 3 fields → the bar reads "3 unsaved changes" and names them. Save → "Saved", then the bar hides.
- [ ] Discard → the confirm text matches item 3 exactly; text/switch fields return to saved values; an uploaded-but-unsaved photo is not on the live site; the bar hides.
- [ ] Refresh with unsaved changes → browser warning; with none → no warning. Clicking an in-app link out of /nic-nac with unsaved changes → the same confirm.
- [ ] Store link bombparty.com/x → error under the field, focus moves there, nothing is sent to the server.
- [ ] A forced server error shows in the bar and the draft is kept.
- [ ] View my site opens the right URL (custom domain if set). Copy link copies it. Preview saved site opens the same preview as today's button.
- [ ] At cover width the bar is one row or wraps without covering the tab bar or the focused field (tab through the last three fields with the keyboard open). Not visible when nothing has changed.
- [ ] A Nic-Nac site-setting write while I have a draft refreshes the saved values and keeps my draft.
- [ ] "My Website" appears everywhere the old name did; /nic-nac?section=site-settings still works.
- [ ] Taps respond in under 0.2s with no layout jumps.

NAMED TESTS (run only these, plus CI): tests/nic-nac/site-save-bar.test.tsx (count, Discard scope and copy, always-tappable save with field focus, server error, leave guards); update tests/nic-nac-dashboard-placeholder.test.ts and tests/nic-nac/workspace-control-tips.test.ts (they reference site-settings-save-status / save-site-settings).
SMOKE PAGE-LOAD BUDGET: 12. Screens: Fold 6 cover (record real CSS width, ~360–375), ~880, 1440.
REPORT: PR, Smoke deployment ID, base SHA, checklist pass/fail per line, screenshots at the three widths, loads used, CWV numbers, CI vs baseline, Spec corrections I made.

One self-review pass, then stop.
```

### Chunk 3b: Customer-scroll layout, "Shows on" labels, checklist, links, Other pages

```text
TASK: Sparkle Suite — My Website redesign, Chunk 3b of 5: re-lay out the page in customer-scroll order with "Shows on" labels, setup checklist, Calendar/Team links and an Other pages group.
Repo louis623/sparkle-suite. Branch from codex/nic-nac-trade-hardening including Chunks 1–3a (combined Smoke branch), base SHA recorded in the report. One PR. Do not merge or close PRs. No Live deploys, no Live database writes. Smoke project: sparkle-suite-smoke.

Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task. (Fallback if the skill is unavailable: https://developer.chrome.com/docs/modern-web-guidance)

BUILD RULE: if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under "Spec corrections I made" in your report, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates.
DEPLOY RULE: if the one Smoke deploy fails, stop and report; no fix-redeploy loop.
Test only what this chunk changed. No show-state or show-timing gates anywhere; Upcoming shows loads no show data. Smoke: production-smoke skill's reviewer-smoke path, never Louis's personal account; never print secrets.

FILES: app/nic-nac/components/DashboardPlaceholder.tsx (SiteSettingsCard), app/nic-nac/components/PublicSiteVisibility.tsx, app/nic-nac/components/SocialHandlesSettings.tsx; tests below.

ITEMS (each is its own change):
1. Re-order into numbered collapsible sections (<details>/<summary>; the status chip text is part of the summary's name) in the order customers scroll. Every existing control is kept and only moved, apart from the Chunk 4 items:
   1 Top bar: Business name, Your first name, Store link, Announcements box + its emoji buttons + "Link selected words", Show announcements switch.
   2 Hero: Big headline, Line under the headline, summary of socials set to "show in hero".
   3 Upcoming shows: read-only text + Open Calendar button.
   4 What is a Bomb Party: Live reveal video + caption.
   5 About you: About title, Your story, About photo + Smart Frame, photo caption, Remove photo, 3 short videos with captions + Remove video, the Britt-only "Show the About Brittany and Sparkle Moments section" switch (shown only where it shows today, DashboardPlaceholder.tsx:10186), media help text.
   6 Sign-up & discount: switch, code, message.
   7 Footer & socials: Footer tagline, Email (Shows on: Join page Contact), social links with each one's Show on site / Show in hero, Team I belong to.
   Other pages (bottom): Dance Floor, Join Team, Live Lineup switches.
   Header card (from 3a): View my site, Copy link, Preview saved site.
2. Section headers show a one-line summary and a status chip (Done / Add photo / Fix 1 / Off).
3. A "Shows on" line under every field (e.g. Store link → "Every Shop button on your site"; Email → "Join page Contact").
4. Upcoming shows: read-only text plus Open Calendar (to section=show-calendar). No show data loaded on this page.
5. Other pages group with the Dance Floor, Join Team and Live Lineup switches, moved out of "Announcement messages". Join Team gets a Team settings link (section=team-management). Early-access gating for Join stays as it is.
6. Show announcements switch moved into section 1 next to the announcements box.
7. Setup checklist strip ("N things left to finish") under the header, from the draft only. Items: Business name, Your first name, Store link (valid), Big headline, About story, About photo, at least one social link. "Show me" opens and focuses the first missing item.
8. Desktop site-map rail (1100px and up) jumping to sections.
9. "Make existing links plain text" still shows only when old links exist; moved under the announcements box with a one-line explanation.

ACCEPTANCE CHECKLIST (agreed before building; nothing added mid-pass):
- [ ] Section order matches the homepage top to bottom, then Other pages.
- [ ] The layout-map unit test finds every current control id (including Email, the Britt-only About/Sparkle Moments switch, emoji buttons, Link selected words, reveal caption, photo caption, Remove photo, video captions, Remove video, each social's two switches, Team I belong to, Preview saved site) in exactly one section, apart from Chunk 4 items.
- [ ] Every field has a "Shows on" line.
- [ ] Smoke rep missing an About photo with a bad store link → strip reads "2 things left"; Show me opens section 1 and focuses the store link.
- [ ] Open Calendar and Team settings go to the right Workspace sections.
- [ ] Turning a page switch off and saving hides it on the live site; on again restores it; saved content is kept.
- [ ] Cover width: one column, sections collapsed except the first unfinished one. ~880: two-column fields. 1440: site-map rail visible and sticky.
- [ ] Opening/closing sections causes no layout jump; taps respond in under 0.2s.

NAMED TESTS (run only these, plus CI): tests/nic-nac/site-settings-layout-map.test.tsx (every current control id present once, section order, checklist count).
SMOKE PAGE-LOAD BUDGET: 15. Screens: Fold 6 cover (record real CSS width, ~360–375), ~880, 1440.
REPORT: PR, Smoke deployment ID, base SHA, checklist pass/fail per line, screenshots at the three widths, loads used, CWV numbers, CI vs baseline, Spec corrections I made.

One self-review pass, then stop.
```

### Chunk 4: Cleanups

```text
TASK: Sparkle Suite — My Website redesign, Chunk 4 of 5: Hero motion control follows the renderer, Team I manage de-duplicated, clearer labels, load-error Retry.
Repo louis623/sparkle-suite. Branch from codex/nic-nac-trade-hardening including Chunks 1–3b (combined Smoke branch), base SHA recorded in the report. One PR. Do not merge or close PRs. No Live deploys, no Live database writes. Smoke project: sparkle-suite-smoke.

Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task. (Fallback if the skill is unavailable: https://developer.chrome.com/docs/modern-web-guidance)

BUILD RULE: if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under "Spec corrections I made" in your report, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates.
DEPLOY RULE: if the one Smoke deploy fails, stop and report; no fix-redeploy loop.
Test only what this chunk changed. No show-state or show-timing gates anywhere. Smoke: production-smoke skill's reviewer-smoke path, never Louis's personal account; never print secrets.

FILES: app/nic-nac/components/DashboardPlaceholder.tsx; lib/services/site-settings.ts (read-only response fields); app/api/nic-nac/site-settings/route.ts (GET response only); new lib/amethyst/hero-motion-applies.ts; tests below. Background: plan §0.1 Renderer facts 5–6.

ITEMS (each is its own change):
1. heroMotionApplies = (rep is on a custom layout: Britt with Bling, Mile High Fizz, Bling Kitchen, using the same checks the renderer uses) OR (rep's slug is not v2-rendered per repRenderV2Enabled). New read-only field in GET /api/nic-nac/site-settings, computed on the server. No DB change.
2. Hero motion control follows it: custom-layout reps get a "Hero animation" On/Off switch; standard-layout reps whose slug isn't v2-rendered keep today's 3-choice control under the label "Hero motion"; v2-rendered standard reps see no control (a one-line note: "Your theme sets the hero animation."). Off saves still. On saves their previous non-still value if they had one, otherwise sparkle_rise. Leaving the switch alone sends nothing. If a rep later moves to v2, the control hides itself; the stored value stays.
3. New read-only field grandfatheredHeadlineFallback in the same GET response (true when preview-template-data.ts:558 isGrandfatheredSite is true). Drives item 8's note.
4. Team I manage: the second editor is removed. Read-only line "Team I manage: <name> · Edit in Team settings" linking to section=team-management. The My Website save leaves teamName and recruitingLink out of its payload (the server patch is partial, site-settings.ts:597), and Team Management draft edits don't count in the My Website unsaved count.
5. Team I belong to stays editable here (only edited here), in section 7, labeled "Team I belong to (shown in small print)".
6. Label: "Show name" → "Business name".
7. Label: "Display name" → "Your first name".
8. Label: "Site tagline" → "Footer tagline". When grandfatheredHeadlineFallback is true, add: "Also shows under your headline if that line is empty."
9. Label: "Hero title" → "Big headline". "Hero subtitle" → "Line under the headline".
10. Live reveal video: "Shows on: the 'It's a live jewelry reveal' block" (in section 4).
11. Load-error state gets a Retry button.
Labels only: Email, Business name and Team name keys and values are untouched (Mile High Fizz trigger, §1 Chunk 5).

ACCEPTANCE CHECKLIST (agreed before building; nothing added mid-pass):
- [ ] Unit: heroMotionApplies is true for a non-allowlisted standard rep, false for an allowlisted standard rep, true for each custom layout. A soft_glow custom-layout rep who toggles Off then On ends with soft_glow. Untouched switch → no heroAnimationType in the payload.
- [ ] Smoke: dudesfizzfest (listed, standard) sees no Hero control and the note; the named non-listed Smoke rep sees the 3-choice "Hero motion"; milehighfizz (custom, if a Smoke account exists for it; else unit only, say so) sees the On/Off switch and Off stops the hero motion on its Smoke site.
- [ ] Team I manage can't be edited on this page; the link opens Team Management; saving there updates the line here; a Team Management edit doesn't raise the My Website unsaved count; the My Website save payload has no teamName/recruitingLink.
- [ ] All renamed labels appear as listed; the API payload diff shows the same field names as before.
- [ ] The Footer tagline note shows only when grandfatheredHeadlineFallback is true.
- [ ] Retry on a forced load error reloads the settings.

NAMED TESTS (run only these, plus CI): tests/nic-nac/hero-motion-applies.test.ts (formula, On restores previous value, untouched sends nothing, grandfathered flag).
SMOKE PAGE-LOAD BUDGET: 10. Screens: Fold 6 cover (record real CSS width, ~360–375), ~880, 1440.
REPORT: PR, Smoke deployment ID, base SHA, checklist pass/fail per line, screenshots at the three widths, loads used, CWV numbers, CI vs baseline, Spec corrections I made.

One self-review pass, then stop.
```

### Chunk 5 (NOT scheduled; Louis decides): Mile High Fizz layout trigger
**Risk:** the Mile High Fizz layout switches on when the rep's **Email**, **Business name** or **Team name** text matches certain values (`lib/mile-high-fizz/profile.ts`, `isMileHighFizzSettings`). A typo fix or rename could switch a site's layout without warning.
**Proposed safe handling:** key the layout to the rep's **ID** in code (as Britt with Bling's profile does), keep the text match only as a temporary fallback that logs for a week, then remove it. No migration.
**Until then:** chunks 1–4 change labels only, never stored keys or values, so the trigger behaves exactly as today (Chunk 4 checklist: "API payload diff shows the same field names"). The preview uses the rep's real settings, so it previews whatever layout the rep really has.

## 2. Data and database
- **No migrations.** Nothing in chunks 1–4 adds, changes or removes a column or table.
- Non-database additions: the preview route (chunk 1, read-only); `season`/`thumb`/preview-color fields in `skin-cards.ts` and thumbnail files (chunk 2); read-only `heroMotionApplies` and `grandfatheredHeadlineFallback` in the GET settings response (chunk 4).
- Live database: SELECT-only for any checks. Smoke database only for Smoke saves.

## 3. Testing (per chunk)
- **The cloud agent runs Smoke itself** (project `sparkle-suite-smoke`, reviewer-smoke path from the production-smoke skill, Smoke rep `dudesfizzfest` plus the named non-listed Smoke rep where a check needs it; never Louis's personal account; never print secrets). Test **only what changed** in that chunk. Run only the chunk's named test files, plus CI.
- **Screens:** Fold 6 cover at the device's real CSS width (record it, about 360–375), Fold 6 inner (~880), 1440. At the cover width the save bar is one row or wraps without covering the tab bar or the focused field (use `scroll-padding-bottom` equal to the bar height). Open Try it on at cover width, then resize to inner width with it still open: it stays usable or turns into the inner layout, and focus survives. Same load budgets. Swap the 390 loads for cover-width loads; don't add loads.
- **Core Web Vitals bar:** main content under 2.5s on phone and under 2s on desktop; taps respond in under 0.2s; no layout jumps (CLS < 0.1). For theme taps the 0.2s applies to the card selection; the preview shows its loading state at once and its content in under 2.5s on phone (Chunk 2 item 10).
- **CI baseline** (taken on `b8fd4646d338`): 6517 passed / 326 failed / 36 skipped, plus the two known Dance Floor SQL suite-load errors and the known `2.0.13 !== 2.0.7` assertion. No new failures. If the tip has moved past `b8fd4646`, re-baseline on the new tip and report both.
- **Budgeted Smoke page loads** (stop and report if exceeded): Chunk 1: **12**. Chunk 2: **18**. Chunk 3a: **12**. Chunk 3b: **15**. Chunk 4: **10**.
- **Rocky:** one build review per chunk, covering only the report and the diff.

## 4. Build prompt rules (apply to every block in §1)
- **Every build prompt is ONE paste-ready block per chunk** with repo, branch, base SHA, this chunk's items and checklist verbatim, and the file paths. It includes, word for word: 'Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task.' (fallback: https://developer.chrome.com/docs/modern-web-guidance).
- **Build rule:** if you find a clear bug or spec/code contradiction, fix it yourself if it keeps the intended look and behavior, list it under **Spec corrections I made**, and keep going. Stop and ask only if it would change what reps or customers see beyond this plan, or loosen auth, privacy or rollout gates.
- **Deploy rule:** if the one Smoke deploy fails, stop and report; no fix-redeploy loop. (This is the only "stop on failure" rule; it is not in the build part.)
- Run only the named test files for the chunk, plus CI. Test only what this chunk changed. No show-state or show-timing gates. Don't merge or close PRs. No Live deploys or Live database writes.
- Every block ends with: **One self-review pass, then stop.**

## 5. Rollout
- Each chunk: PR → Smoke → Rocky build review. All chunks stack on one **combined Smoke branch** so Louis looks once, with everything together.
- **Live only on Louis's own words**, once, after he's seen the combined Smoke. Merges in order 1 → 2 → 3a → 3b → 4, then one deploy. Rollback is the previous deployment ID, recorded in the report.

## 6. Risks and open questions for Louis (recommended defaults in bold)
1. **Season windows:** Halloween Oct 1–31, Thanksgiving Nov 1–30, Christmas Nov 15–Dec 31 (Eastern)? **Default: yes.**
2. **Out-of-season themes:** listed at the end of Year-round with a season tag, not hidden. **Default: listed.**
3. **Look once on combined Smoke, then one Live go?** **Default: yes.**
4. **Checklist items:** the 7 in 3b item 7 (no item for an upcoming show)? **Default: yes.**
5. **Private theme tag:** "Just for you" instead of "— Brittany's original custom skin". **Default: yes.**
6. **Mile High Fizz (chunk 5):** schedule the rep-ID fix as its own PR after this work? **Default: yes, after chunk 4. Not built without your OK.**
7. **Risk, preview vs live data:** the preview blocks network calls, so anything that loads after the page opens (Dance Floor strip, lineup bar) can show placeholders. Server-rendered content (headline, shows, about, photos) is real. **Default: accept.**
8. **Risk, custom layouts:** Britt with Bling, Bling Kitchen and Mile High Fizz reps preview their own layout, so some themes look different for them. **Default: accept (it's accurate).**
9. **Risk, reps not on the SSR list:** today that's only demo/test slugs (§0.1). If a rep isn't listed, the preview uses the SSR page and says small spacing differences are possible. **Default: accept.** (Separately: should new reps be added to `REP_RENDER_V2_SLUGS` at signup? Out of scope here.)

## 7. Follow-up list (not in this pass)
- Hold-to-compare in Try it on (needs a keyboard-accessible design).
- B's live text preview.
- Swipe-down to close the pop-up, if not done as an extra in chunk 2.

## 8. Spec corrections I made (round 2, from code)
1. **Preview CSP must also be a meta tag.** A `srcdoc` frame doesn't receive the route's response headers, so the policy is repeated as a `<meta http-equiv="Content-Security-Policy">` in the document (minus `frame-ancestors`, which meta ignores), as `skin-preview.ts:541` does. (Chunk 1 item 10.)
2. **No silent fallback in the preview.** The public route falls back to the older renderer when SSR throws (`public-asset-response.ts:756–758`); the preview returns 503 and the pop-up shows its error state instead. (Chunk 1 item 9.)
3. **Dance Floor off gets the same treatment as Join off** ("Your Dance Floor page is off."), so Trade previews follow the live rule too. (Chunk 1 item 11.)
4. **How the Workspace learns which engine the live site uses:** a `X-Preview-Live-Engine` response header, so the pop-up notice needs no extra request. (Chunk 1 item 8.)
5. **Footer tagline note uses a server flag.** Rocky's note 2 suggested also covering "grandfathered legacy sites"; in code the grandfathered rule is exactly Britt with Bling or Mile High Fizz for both renderers (`preview-template-data.ts:558`). The note is driven by a read-only `grandfatheredHeadlineFallback` flag from that same check, so it can't drift. (Chunk 4 items 3 and 8.)
6. **v2 standard reps get a one-line note instead of nothing** where Hero motion used to be ("Your theme sets the hero animation."), so a rep looking for the old control isn't confused. (Chunk 4 item 2.)
7. **gtag check is conditional:** the public `/dudesfizzfest` check expects gtag only if that rep has GA4 set; the report says which. (Chunk 1 checklist.)
8. **Discard confirm buttons named:** "Discard changes" / "Keep editing". (Chunk 3a item 3.)
9. **Field name:** the saved Hero motion field is `heroAnimationType` / `hero_animation_type` (`site-settings.ts:584`). (Chunk 4.)
10. **Line references corrected:** section registration at `DashboardPlaceholder.tsx:234` (not ~262); upload handler at 4527.
