# Plan v3 (final): Live Lineup "out of date" notice + help guide + public Live Lineup label (PR C)
v1 written Nov 23, 2026, ~10:50 AM ET. v2 ~11:30 AM ET: adds PR C (Louis, 10:37 AM ET) and Rocky round-1 changes (review: live-lineup-version-notice-help-plan.rocky-review.md). v3 ~11:40 AM ET: folds in Rocky round 2 (rocky-review-2.md, final round) and Louis's 11:12 AM ET call that PR C changes the fast pages only. Backups: .v1.md, .v2.md. Approved to plan by Louis (10:28 AM ET): "Yeah, I'm good with that. Go ahead and write it up as a plan and get it to Rocky to review, please."
Repo louis623/sparkle-suite, branch codex/nic-nac-trade-hardening, base 9667296a (PR #219 squash, Live dpl_CGKaeCk65aEMq7hPWmZhApgJM36T).
Three small PRs, one per chunk: PR B (help guide) first, then PR A (notice; it links to the guide). PR C (public-site Live Lineup label) is independent and can run alongside either. Builder: Cursor cloud agent (Codex is low on usage).
The rep email goes out only after all three are Live. Bunny sends it via Resend after Louis approves.

## 0. What already exists (checked in code at 9667296a + one read-only SELECT on the Live DB)

**Most of the version logic is already built.** PR A mostly adds UI.

- **Release config (what "newest" means):** `lib/live-lineup/release.ts` exports `LIVE_LINEUP_RELEASE = {protocol:1, version:'2.0.13', publishedAt:'2026-11-22T13:13:00.000Z', rolloutEnabled:true}` (published Nov 22, 8:13 AM ET). It's code, not a DB table. It's served publicly at `app/api/live-lineup/release/route.ts`. The 2.0.10 config Louis remembers was replaced by 2.0.13. The extension manifest is also 2.0.13 (`chrome-extension/manifest.json`).
- **Where the rep's version is reported:**
  - New path (2.0.13+): table `public.live_lineup_show_controls.worker_version` (plus `reader_version`, `last_extension_seen_at`), written by RPC `public.live_lineup_control_checkin(...)` from `supabase/migrations/20261121190000_live_lineup_show_control.sql`, called in `lib/live-lineup/service.ts` ~L317-330.
  - Legacy path (2.0.6 / 2.0.11 / 2.0.12, which never call the check-in RPC): table `public.live_lineup_states`, JSON `state->>'sourceVersion'`.
- **Comparison is already done server-side:** `lib/live-lineup/show-control.ts` `projectShowControl()` (~L105-145):
  - `workerVersion = row.worker_version ?? state.sourceVersion` (only if it matches `^\d+(\.\d+){1,3}$`)
  - `latestPublishedVersion = LIVE_LINEUP_RELEASE.version` only when `rolloutEnabled` is on and `publishedAt <= now`, otherwise null
  - `updateNeeded = workerVersion && latestPublishedVersion && compareShowVersions(worker, latest) < 0`
  - It's returned on every Workspace lineup snapshot as `snapshot.extensionStatus` (`service.ts` L58-64, L137-138) and validated client-side (`isLineupExtensionStatus`, `live-lineup-client.ts` L50).
- **Today's UI for this:** only a plain text line inside `LiveLineupExtensionDetails` (`app/nic-nac/components/LiveLineupShowControls.tsx` L66-75): "Extension update needed — running X; latest Y." No link, easy to miss.
- **Front-page card:** `DashboardPlaceholder.tsx` L7904 renders `<LiveLineupCard compact …>` in the left rail. The full tool is at L8344, using the same component. The card has a fixed height (`LiveLineupCard.module.css` L5 `height: min(480px, 70dvh)`; the rail has its own fixed height). So anything added inside the card doesn't push the page.
- **Live DB snapshot (read-only, aggregate, no names), ~10:45 AM ET:**
  - 2.0.13 on the new path: 2 reps
  - 2.0.12 legacy: 1 rep
  - 2.0.11 legacy: 2 reps
  - 2.0.6 legacy: 3 reps
  - `demo-1.0.0` (Fizz Festival demo): 1, which fails the version regex, so it will never show the notice

  So 6 reps would see the notice today.
- **The help section today:**
  - Workspace section `help-resources` (`?section=help-resources`) renders `HelpResourcesCard` (`DashboardPlaceholder.tsx` ~L9288).
  - The content is static code in `lib/services/help-resources.ts` (13 workflow guides plus a feature index). The same data feeds Nic-Nac (`lib/nic-nac/tools/get-help-resources.ts`) and `/api/nic-nac/resources`.
  - Guides are text-only `<details>` accordions grouped by section ("Live Shows" holds Live Lineup). There's no image support and no deep link to a single guide.
  - Live Lineup entries:
    - `use-live-queue-during-show` ("Use Live Lineup during a show"). This one is stale: no Start/Stop Show, no auto-end, no Needs attention, no grouped customers or Customer card, and it still says "ask support when the lineup looks stale".
    - `use-live-lineup-on-a-mac`. Still accurate.
  - The separate DB-backed "Learn" library (`workspace_resources`, `WorkspaceResourceLibrary.tsx`) is NOT used here. Publishing there writes to the Live DB and announces to reps.

**What "redone" means for the Live Lineup entry:** the stale `use-live-queue-during-show` guide is replaced in place, keeping its id so Nic-Nac and search keep working. It becomes "How to run your show with Live Lineup": the email content with screenshots, plus an "update your extension" part the notice links to. The Mac guide stays as it is.

## 1. PR B: Live Lineup help guide (ships first)

**Files:**
- new `lib/live-lineup/how-to-guide.ts`: content only, one source of truth
- new `app/nic-nac/components/LiveLineupHowToGuide.tsx` and its `.module.css`
- `app/nic-nac/components/DashboardPlaceholder.tsx`: HelpResourcesCard and deep-link handling only
- `lib/services/help-resources.ts`: the one entry
- new `public/sparkle-suite/help/live-lineup/` with 4 images
- tests: `tests/help-resources.test.ts` (title list) and new `tests/live-lineup-how-to-guide.test.tsx`

1. **Content module** (`how-to-guide.ts`), taken from `/workspace/live-lineup-rep-email/copy.md` (plain-text part) and `email.html`:
   - **"What's new":** the 7 bullets, word for word except: drop the email-only intro and apology, the sign-off, and "Hi there".
   - **"How to run your show with Live Lineup":** Before you go live (1-4), During your show (5-8), When you're done (9-10).
     - Step 2's "Extension 2.0.13" must read `LIVE_LINEUP_RELEASE.version` so it never goes stale, using the same "published" rule as `latestPublishedVersion` (rollout on and `publishedAt <= now`). If it isn't published yet, the step says "the newest version" with no number.
   - **"If your Workspace says your extension is out of date"** (anchor id `update-extension`), short. Order matters: the reps who see the notice are on versions before 2.0.13, which have no Check for updates button and no update-on-startup, so the manual Update is the main step.
     - First line, bold: **"Don't remove the extension. Removing it erases your Live Lineup connection code."**
     - (1) On your computer, open Chrome and go to `chrome://extensions`.
     - (2) Turn on **Developer mode** (top right), press **Update**, then turn Developer mode back off.
     - (3) Open your Bomb Party Live Party Orders page. The notice clears once the extension reports the new version.
     - "On 2.0.13 or newer, this usually happens by itself when Chrome starts, and the extension has a Check for updates button."
     - "Updates can take a few hours to show up after we release one."
     - [Louis confirms the wording, see Q2.]
   - **"Need a hand?":** Report a bug at the top of your Workspace, or Workspace Support. The button reuses the existing `onContactSupport`. In the support view it renders as text with no button.
   - Guide text source: `docs/plans/2026-11-23-live-lineup-version-notice-help/guide-source.md` on the staging branch.
   - **Screenshots:** 4 images with the same alt text and captions as the email, placed where the email places them. Shot 05 (customer site after Start Show) is not shipped as a placeholder: no empty box on the site (see Q1).
2. **Images:**
   - Copy the 4 images from the staging folder `docs/plans/2026-11-23-live-lineup-version-notice-help/images/` (branch `cursor/live-lineup-guide-staging`) into `public/sparkle-suite/help/live-lineup/` with the same file names. Keep them byte-identical (each ≤ 200 KB). Sizes: 01 1072×1117 jpg, 02 560×1126, 03 560×792, 04 780×566.
   - Keep them PNG/JPG on purpose: the email will load these exact public URLs (`https://www.yoursparklesuite.com/sparkle-suite/help/live-lineup/<file>`). That settles the open image-hosting question with no Storage or Blob write.
   - The guide renders them with `next/image`, which already serves avif/webp per `next.config.ts`. Use explicit width/height (real pixel sizes), `sizes` for 1 column, and lazy loading.
   - None show a real rep or customer (fictional data and the demo site; see notes.md section 3).
3. **Where it renders:**
   - In HelpResourcesCard's "Live Shows" group, the entry with id `use-live-queue-during-show` renders `<LiveLineupHowToGuide>` instead of the generic Goal/Use this when/Steps body.
   - It's in the same list position, with a small "Updated" tag. No second, duplicate entry.
   - Phone: one column, images full width (max 560px), text ≥ 16px equivalent to the existing guide body.
4. **`help-resources.ts` entry** (so Nic-Nac answers match the guide):
   - Keep id `use-live-queue-during-show`.
   - Title "How to run your show with Live Lineup". Summary: one line.
   - `steps` and `beforeYouStart` come from the content module, not copied by hand.
   - `stillStuck` drops "Ask support when the lineup looks stale".
   - Update the title list in `tests/help-resources.test.ts`.
   - Search terms: `tests/help-resources.test.ts:196-200` maps 'assigned code', 'Web Store', 'Chrome', 'stale lineup' and 'empty' to this guide id. Keep 'assigned code', 'Web Store' and 'Chrome' in the new text. Deliberately change the 'stale lineup' row (for example to 'Start Show' or 'out of date'), and list that change under Spec corrections.
5. **Deep link:** `/nic-nac?section=help-resources&guide=live-lineup` (optional `&part=update`).
   - It opens the Help tab, opens the Live Shows group, opens the guide, and scrolls the guide (or the `update-extension` part) into view with focus.
   - Accept only these exact values; ignore anything else.
   - Open the native `<details>` by setting `.open = true` through refs inside the deep-link effect: group first, then guide, then rAF → `scrollIntoView` → `focus({preventScroll:true})` on the summary or part heading. Don't use a controlled `open` prop, or React will fight the rep's own toggles.
   - `syncWorkspaceSectionSearch` (DashboardPlaceholder.tsx:432-447) already keeps unknown params. The new work: drop `guide`, `part` and `src` when leaving `help-resources`. Going Back must not re-scroll unexpectedly.
   - Same scroll pattern as `WorkspaceResourceLibrary`'s `?resource=`.

**PR B acceptance checklist**
- [ ] Help & Resources → Live Shows shows "How to run your show with Live Lineup" (tag "Updated") in place of the old guide. The Mac guide is unchanged. There's no other duplicate.
- [ ] The guide text matches the email sections (renamed title used). The version in step 2 comes from `LIVE_LINEUP_RELEASE`. There's no apology or sign-off, and no internal ids, PR numbers or rep names.
- [ ] All 4 screenshots load from `/sparkle-suite/help/live-lineup/`, with alt text and width/height set, and no broken image. There's no placeholder box for shot 05.
- [ ] Deep link `?section=help-resources&guide=live-lineup` opens and scrolls to the guide. `&part=update` lands on the update steps. Junk values do nothing. Leaving Help drops `guide`/`part`/`src`.
- [ ] Update steps start with "Don't remove the extension…", and Developer mode → Update is the main step.
- [ ] Nic-Nac/search for "live lineup", "assigned code", "Web Store" and "Chrome" returns the new guide. The 'stale lineup' test row was changed on purpose and is listed under Spec corrections.
- [ ] Phone 390px: one column, no horizontal scroll, images fit, tap targets ≥ 44px.
- [ ] Fold cover screen 344px: same as phone, and nothing clipped or overflowing.
- [ ] Desktop 1440px: guide readable, images capped at 560px, the help panel layout unchanged otherwise.
- [ ] Core Web Vitals on /nic-nac (Help tab): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (Lighthouse mobile, 1 run). Guide images don't load until the guide is opened.
- [ ] Keyboard: details/summary operable, focus visible. Headings in order.
- [ ] Tests: `tests/help-resources.test.ts` and the new guide test pass. CI shows no new failures vs the known baseline.

## 2. PR A: "out of date" notice on the Live Lineup card (ships after PR B is Live)

**Files:**
- `app/nic-nac/components/LiveLineupShowControls.tsx` (`LiveLineupExtensionDetails`)
- `app/nic-nac/components/LiveLineupCard.module.css`
- `app/nic-nac/components/LiveLineupCard.tsx` (only to pass `readOnly` down)
- tests: `tests/live-lineup-show-control-ui.test.tsx` (extend)

There are no server, SQL or release-config changes. The server already sends `extensionStatus.updateNeeded` and `latestPublishedVersion`. v1's Smoke preview param is dropped (Rocky #3): a client component can't check the server-only Smoke marker. Tests cover the states instead.

1. **Show rule:** render the notice only when all of these are true:
   - `snapshot.authorized`
   - `extension.updateNeeded === true`
   - `workerVersion` is set
   - `latestPublishedVersion` is set

   Because of that:
   - Current reps see nothing.
   - Reps with no reported version (or the `demo-1.0.0` demo) see nothing. This is the accepted v1 edge case.
   - If the rollout is off or `publishedAt` is in the future, nobody sees it.
   - If the worker is newer than the release, nobody sees it.
2. **Copy:**
   - Title: **"Your Live Lineup extension is out of date"**
   - Line: "You have {worker}. The newest is {latest}." Version numbers use `white-space:nowrap`.
   - Link: **"How to update"**, a plain `<a href="/nic-nac?section=help-resources&guide=live-lineup&part=update">` (not `next/link`).
     - On /nic-nac, its onClick switches the section in-app (`setActiveSection('help-resources')` plus the params), with the href kept as the no-JS fallback.
     - If wiring that callback down is more than one prop, the plain full-page link is acceptable. The section is read from the URL at init.
   - **Support view** (`SupportWorkspaceClient`, which renders the same card read-only): show the notice text without the link, because the link would take staff to their own /nic-nac. Use the existing `readOnly`/`liveLineupReadOnly` signal.
   - The old "Extension update needed — running X; latest Y." string is removed.
3. **Place:**
   - Inside `LiveLineupExtensionDetails`, directly under the version/status row. That covers the front-page compact card and also the full tool, since it's the same component.
   - Not in any header.
   - Amber like `.showWarning`, not red. `role="status"`. Not dismissible in v1.
4. **No layout jump:**
   - It renders in the same commit as the first snapshot: no separate fetch, effect, timer or animation.
   - It sits inside the fixed-height card, so the card's outer size never changes.
   - On short phones (70dvh card) the lineup list must still show at least 2 rows with the notice present.
5. **Clears by itself:** after the rep updates and the extension reports, the next snapshot has `updateNeeded:false`.
6. **What Louis sees before Live:** the PR includes a test-rendered static HTML of the card with the notice. If the builder can render it in a browser, it also attaches 3 screenshots (390 / 344 / 1440). No Smoke preview param.

**PR A acceptance checklist**
- [ ] Older reported version (2.0.6, 2.0.11 or 2.0.12 vs 2.0.13): the notice shows on the front-page card with the exact copy and both versions.
- [ ] Shows nothing for: 2.0.13, no reported version, `demo-1.0.0`, rollout off, `publishedAt` in the future, worker newer than latest, or unauthorized.
- [ ] "How to update" lands on the guide's update steps. It's not a `next/link`. In the support view it's text-only with no link.
- [ ] Not in any header. Amber, not red. `role="status"`.
- [ ] No layout jump: same render as the first snapshot, card outer height unchanged, at least 2 lineup rows visible at 390×700, and no layout-shift entry from the notice.
- [ ] Phone 390px: wraps cleanly, link tap target ≥ 44px, Start/Stop and Full lineup still visible.
- [ ] Fold cover screen 344px: no overflow or clipping, and versions don't break mid-number.
- [ ] Desktop 1440px (and 1024px): fits the rail card, and the list still scrolls.
- [ ] Core Web Vitals on /nic-nac home stay at LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 (Lighthouse mobile, 1 run, only if the builder has a sign-in).
- [ ] Tests cover older / current / null worker / `demo-1.0.0` / null latest / unauthorized / readOnly without link, plus a static render snapshot. CI shows no new failures vs the known baseline.

## 2C. PR C: restore a "LIVE LINEUP" label box on the public-site lineup bar (Louis, 10:37 AM ET)

**What Louis saw:** the Fizz Festival demo public site at desktop width.
- The ANNOUNCEMENTS and DANCE FLOOR bars each start with a label box at the far left edge.
- The Live Lineup bar has no label. "I have an open lineup." floats about a fifth of the way across.

**Root cause (git, confirmed by Rocky round 2):**
1. **13e75644 "feat(lineup): condense empty public queues into calendar row"** (2026-10-02 21:17 UTC = 5:17 PM EDT; no PR referenced, and a GitHub PR search for the SHA found none).
   - It added a shared `renderEmpty()` to `public/amethyst/live-lineup.js` and removed the headed empty/offline/loading branches of `LiveQueueStrip`.
   - Its plan, `docs/plans/2026-10-02-compact-public-lineup.md:16`, says "Compact calendar row, **no lineup heading**/status/time/button". So the label was removed on purpose to make the row compact.
2. **PR #207** (feb4b94b, merged Nov 17, 9:24 PM ET) put "I have an open lineup." into that headless row. 2.0.13 (0a1d967) kept it.
3. **Why it floats:**
   - The lineup row is centered: `.hp-lineup-idle-inner` (homepage.css:6871) and `.hp-trade-preview-inner` (:1696-1698) use `max-width:1280px; margin:0 auto`.
   - The ticker rows are full-bleed, with an absolutely positioned `.hp-ticker-label` at `left:0` (homepage.css ~L1152-1185; 124px at ≤640, L1297-1300).

**Scope: fast pages only (Louis, 11:12 AM ET: "there shouldn't be any reps on the slow older pages").**
- **Verified by Suite before handoff:** all 9 active reps serve the fast (SSR v2) pages on Home, Trade and Join, with `data-ssr` markers present. That's 9 SSR and 0 legacy.
- **PR C does NOT edit** `lib/amethyst/legacy/**`, `lib/amethyst/legacy/manifest.json` or its hashes, or `tests/rep-render-version.test.ts`. The legacy snapshot stays byte-for-byte frozen.
- **Served files on the fast path, which PR C changes:**
  - `lib/amethyst/v2/homepage.jsx` `LiveQueueStrip` (~L1697), `v2/trade.jsx` (~L1022), `v2/join.jsx` (~L817).
  - `public/amethyst/live-lineup.js` `renderEmpty()` (~L263-281). SSR runs it server-side via `lib/amethyst/page-first-paint.ts` and bundles it into `lib/amethyst/generated/page-runtimes.json`.
  - `public/amethyst/homepage.css` and the theme CSS in `public/amethyst/`. SSR inlines them at build (`scripts/build-amethyst-ssr.mjs` L14).
  - Rebuild the generated SSR assets with `npm run build:amethyst:ssr`.
- **Not served to any Live customer, kept consistent:** `public/amethyst/{homepage,trade,join}.jsx` feed only `/skin-preview` and the layout locks.
  - Edit their `LiveQueueStrip` the same way so previews and locks stay consistent, and refresh only those lock entries.
  - Don't rebuild or edit `public/amethyst/join-runtime.js` unless its entry imports a changed file. Say which.
- **Custom layouts:** every homepage layout goes through `SparkleSuiteHeaderStack` → `LiveQueueStrip` (v2/homepage.jsx ~L3444-3474: Mile High Fizz ~L3487, Britt with Bling ~L3626, Bling Kitchen ~L3685, standard ~L3986).

**The fix:**
1. **One label in every state** (calendar/no show, open-empty, delayed, names waiting):
   - `<span class="hp-ticker-label hp-lineup-label">Live Lineup</span>`, first in the row.
   - `.hp-lineup-label` resets it to `position:static; flex:none; align-self:stretch`.
   - In the populated state, the old `.hp-trade-preview-head` becomes this label. There's no duplicate "Live Lineup" heading (F-C4).
   - Each section keeps its `aria-label`, or matches it to "Live Lineup".
   - The live dot sits inside the label only while active or populated, and doesn't animate under `prefers-reduced-motion` (F-C5).
2. **Dark-theme label fix (Rocky blocker 1):**
   - Several themes color the label with an unscoped selector but set its background only under `.hp-ticker-row`. On its own, the label would get a white background with cream text.
   - In every `public/amethyst/` theme CSS rule scoped to `.hp-ticker-row .hp-ticker-label` or `.hp-ticker-row:not(.reverse) .hp-ticker-label`, add `, <same prefix> .hp-lineup-label`. Never add it to the `.reverse` rules.
   - Files and lines:
     - fall-owl.css:66
     - midnight-rose.css:63
     - gobble-and-fizz.css:71
     - silver-bells.css:69
     - starlight-christmas-hollow.css:69
     - rose-champagne.css:57
     - pearl-rose.css:63
     - sunset-beach.css:57 and :299
     - pie-please.css:80
     - halloween-pumpkin-witch.css:55
   - Don't use `transparent` (tests/amethyst-homepage-template.test.ts:380).
   - New CSS test: for every theme file with a scoped `.hp-ticker-row .hp-ticker-label` / `:not(.reverse)` rule, the same declaration block also selects `.hp-lineup-label`.
3. **Full-bleed row:**
   - `display:flex; align-items:stretch`, edge to edge, with no `max-width:1280px`/`margin:auto` on the lineup row.
   - Content starts right after the label and lists rightward: prompt or summary, then pills (horizontal scroll inside the content area), then "View full lineup" and the updated time. Those last two may wrap to a second line inside the content area only.
4. **Phone and no layout jump (F-C3):**
   - At ≤640px the label is 124px, which leaves about 204px at 344px.
   - Give the lineup row one fixed `min-height` in every state, sized for the tallest common state (the calendar prompt on 2 lines at 344px, about 56px). Polling state changes then don't grow or shrink the row.
   - Keep 44px touch targets.
   - The label stays at x=0 in all states.
   - The SSR fallback markup in each v2 `LiveQueueStrip` is identical to `renderEmpty()`, so hydration causes no shift.
5. **Layout lock (F-C2):**
   - In `tests/fixtures/customer-site-layout-lock.json`, add a named object like the existing ones, for example `"approvedLiveLineupLabelChange": {date:"2026-11-23", base:"<base SHA>", approval:"Louis, 2026-11-23 10:37 AM ET: restore the LIVE LINEUP left label on the public lineup bar (plan section 2C); 11:12 AM ET: fast pages only", locks:[{path,function,previousSha256,sha256}…]}`.
   - Change only the lock entries PR C touches (`public/amethyst/homepage.css` and the `LiveQueueStrip` hashes in public/amethyst/{homepage,trade,join}.jsx). Every other lock stays byte-identical.
   - After PR C, public `homepage.css` will no longer match the legacy snapshot's sha256. That's expected and recorded.
6. **Don't change:** lineup data, ordering, privacy, polling, calendar link logic, ticker rows, header, the Dance Floor bar, or anything under `lib/amethyst/legacy/`.

**PR C acceptance checklist**
- [ ] On real public fast pages, the Live Lineup bar starts with a "LIVE LINEUP" label box at the far left, the same size, font, case and spacing as ANNOUNCEMENTS. Covered for calendar and live states on Smoke, and for all 4 states by tests.
- [ ] Content starts right after the label and lists rightward. Nothing is centered or floating at 1440.
- [ ] Dark themes (fall owl, midnight rose, gobble and fizz, silver bells, starlight christmas hollow): label background and text match their Announcements label and are readable (WCAG AA). The CSS test covers every theme file.
- [ ] Custom layouts: Mile High Fizz, Britt with Bling, Bling Kitchen, and standard.
- [ ] Phone 390px: label 124px on the left, content to its right, no horizontal page scroll, tap targets ≥ 44px.
- [ ] Fold cover screen 344px: nothing clipped, the calendar prompt wraps inside the content area, and the row keeps its fixed min-height.
- [ ] Desktop 1440px: label at the left edge in line with the other two labels.
- [ ] No layout jump: the label position is the same in SSR HTML and the hydrated DOM. Row height is fixed across states at ≤640px. CLS ≤ 0.1 on the public homepage, with no layout-shift entry from the lineup row.
- [ ] Core Web Vitals on the Smoke demo homepage (Lighthouse mobile, 1 run): LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, no worse than the prior Smoke deployment.
- [ ] Legacy untouched: `git diff --stat` shows nothing under `lib/amethyst/legacy/`. `tests/rep-render-version.test.ts` is unchanged and passes.
- [ ] Layout lock: only PR C's entries changed, with the named approval object. Everything else is byte-identical.
- [ ] Tests pass: `tests/customer-site-header.test.ts`, `tests/public-live-lineup-runtime.test.ts`, `tests/public-live-lineup.test.ts`, `tests/customer-site-layout-lock.test.ts`, `tests/rep-render-version.test.ts` (unchanged) and the new theme-label CSS test. All 4 states are rendered in tests through v2 `LiveQueueStrip` + `renderEmpty()`. CI shows no new failures vs the known baseline.

**Smoke check for PR C: real public-site loads only (no /skin-preview). Cap: 24 loads + 1 Lighthouse.** Geometry asserts and screenshots come from the same loads.
- (a) Smoke demo `/dudesfizzfest`, Home, Trade, Join at 390/344/1440, in whatever lineup state Smoke has: 9 loads.
- (b) Dark-theme spot check, Home at 390, via `/dudesfizzfest?ssrReviewTheme=<preset>` (real SSR path, Smoke-only read-only fixture): `fall_owl_harvest_moon`, `midnight_rose`, `gobble_and_fizz`, `silver_bells`, `starlight_christmas_hollow`. 5 loads. These are appearance preset IDs; `ssrReviewTheme` takes preset IDs, not skin-preview IDs (F-C6).
- (c) The 4 layouts at 1440: `/dudesfizzfest?ssrReviewTheme=amethyst&ssrReviewLayout=standard|mile_high_fizz|britt_with_bling|bling_kitchen`. 4 loads.
- (d) Smoke `/milehighfizz` Home at 390/344/1440 (second real slug that `smokeReviewSelection` allows): 3 loads.
- Total 21 of 24, plus 1 Lighthouse mobile run on the demo homepage. Geometry asserts: label left = 0, content left ≥ label right, no horizontal overflow, same label x and row height before and after hydration.
- States Smoke can't show (open, names, delayed) are covered by tests. After Live, Louis can see the open state himself by pressing Start Show on the Fizz Festival demo.
- Report renderer use as a count only (F-C7): 9 SSR / 0 legacy, no names.

## 3. Release (each PR; release steps stop on failure, no fix loop)
0. **Builder access:**
   - Branch `cursor/live-lineup-guide-staging` (off `codex/nic-nac-trade-hardening` at 9667296a; Louis approved the push at 11:17 AM ET) contains only `docs/plans/2026-11-23-live-lineup-version-notice-help/`:
     - this plan
     - the addendum
     - Rocky's reviews
     - `guide-source.md`
     - `images/01-04`
   - Each prompt names that branch and commit. No deploy and no PR come from the staging branch itself.
   - PR builds branch from production; PR B copies the images in. Don't merge the staging branch.
1. **Build:** run only the named tests (≤ 3 runs), open the PR, and let CI run. Pass = no new failures vs the known baseline.
2. **Smoke:**
   - First record the current Smoke deployment ID (sparkle-suite-smoke, team louis-2849s-projects).
   - Then deploy the PR head via the Vercel API `create_deployment` with gitSource ref `codex/nic-nac-trade-hardening` and the PR head SHA, and confirm READY.
   - That ref plus a PR SHA is intentional: it's how #219 reached Smoke, so it passes `scripts/check-active-branch.mjs`. It isn't a bypass.
   - If the agent has no Vercel access, it stops after the PR and CI and reports. It must not look for credentials.
3. **Builder Smoke check budgets:**
   - PR B: 3 loads + 1 Lighthouse, only with an existing Smoke reviewer sign-in, otherwise "not checked".
   - PR A: 0 loads (test render).
   - PR C: 21 loads (cap 24) + 1 Lighthouse, on public pages.
4. **Live only on Louis's go:** merge, deploy to Live (sparkle-suite), confirm READY and that the page loads. Record the prior Live deployment ID for rollback. Don't merge or close anything without being asked.
5. **Any failed check:** stop and report with evidence. No fix-redeploy loop.

## 4. Email follow-up (after A, B and C are Live; not part of any PR)
- **Already done on the box:** the section is renamed "How to run your show with Live Lineup" in `email.html` and `copy.md`, and the H1 and subject end "…and how to run your show". Backups are `*.pre-title-rename.*`.
- **Later:**
  - Swap the 4 `img/` srcs to the PR B public URLs.
  - Point the button to `/nic-nac?section=help-resources&guide=live-lineup&src=email`.
  - Change the "Need a hand?" line to: "If your Live Lineup card says your extension is out of date, tap How to update."
  - Retake screenshot 04 after PR C is Live so it shows the new label. Shot 05 is taken after PR C too.
  - Re-render the previews, get Louis's approval, and hand it to Bunny.

## 5. Open questions for Louis (one line each)
- Q1: Ship the help guide without screenshot 05 and add it later, or wait for your screenshot (taken after PR C is Live)?
- Q2: OK with these update steps: "Don't remove the extension", then chrome://extensions → Developer mode → Update, then open Party Orders?
- Q3: OK that the notice shows on both the front-page card and the full Live Lineup page (same component)?
- Q4: Should the "LIVE LINEUP" label also show when there's no show (the "Check the calendar" row)? The plan says yes.
- (Q5 answered 11:17 AM ET: push the staging branch. Legacy answered 11:12 AM ET: fast pages only.)

## 6. Out of scope
Reps with no reported version, a dismiss button, emails or messages triggered by the notice, any change to the release config or extension, the DB-backed Learn library, changes to lineup data or ticker rows, and anything under `lib/amethyst/legacy/`.

## 7-9. Build prompts
The three paste-ready prompts are kept as separate files with Suite (`/workspace/plans/live-lineup-prompt-pr-b.md`, `-pr-a.md`, `-pr-c.md`) and copied below for reference. They name this branch and its commit.

### PR B prompt (file: /workspace/plans/live-lineup-prompt-pr-b.md)
```
Repo: louis623/sparkle-suite. Branch a new PR branch from codex/nic-nac-trade-hardening at its current tip (say the SHA; plan written at 9667296a).
Staging material (read-only; do not merge it): branch cursor/live-lineup-guide-staging, the tip commit, folder docs/plans/2026-11-23-live-lineup-version-notice-help/:
- plan.md section 1 (PR B)
- guide-source.md (guide text, captions, alt texts, update steps)
- images/01-extension-start-stop.jpg (1072x1117), images/02-workspace-live-lineup.png (560x1126), images/03-workspace-needs-attention.png (560x792), images/04-customer-site-after-stop.png (780x566)
Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task.
If the modern-web-guidance skill is not installed for you, read https://developer.chrome.com/docs/modern-web-guidance and follow it.

Build PR B exactly as plan section 1 describes:
- copy the 4 images byte-identical from the staging folder to public/sparkle-suite/help/live-lineup/ (same names; the email will hot-link them)
- new lib/live-lineup/how-to-guide.ts (single content source; step 2 version reads LIVE_LINEUP_RELEASE.version only when rollout is on and publishedAt <= now, else "the newest version")
- new app/nic-nac/components/LiveLineupHowToGuide.tsx (+ .module.css), next/image with the width/height above, lazy, alt text from guide-source.md
- update-extension part: first line "Don't remove the extension. Removing it erases your Live Lineup connection code."; main steps chrome://extensions -> Developer mode -> Update -> Developer mode off -> open Live Party Orders; then the 2.0.13+ line and "Updates can take a few hours to show up after we release one."
- HelpResourcesCard (app/nic-nac/components/DashboardPlaceholder.tsx ~L9288): entry id use-live-queue-during-show renders the new guide in place, tag "Updated"; no duplicate; Mac guide unchanged
- lib/services/help-resources.ts: keep id, retitle "How to run your show with Live Lineup", steps/beforeYouStart from the content module; update the tests/help-resources.test.ts title list; keep 'assigned code', 'Web Store', 'Chrome' searchable; deliberately change the 'stale lineup' row (~L196-200) and list it under Spec corrections
- deep link ?section=help-resources&guide=live-lineup[&part=update]: exact values only; open the group and guide <details> via refs (.open = true, no controlled open prop), then rAF scrollIntoView + focus({preventScroll:true}); syncWorkspaceSectionSearch drops guide/part/src when leaving help-resources; Back must not re-scroll
- no placeholder for shot 05; no apology/sign-off; no rep names, ids or PR numbers in rep-facing text
New test tests/live-lineup-how-to-guide.test.tsx: sections + 4 images with alt; version follows the published rule; deep-link parse exact values; params dropped on leave.

Fix-it-yourself: when you find a clear bug or a spec/code contradiction, fix it if the fix keeps the intended behavior, list it under "Spec corrections I made", and keep going. Stop and ask only if a fix would change what reps or Louis see or do.
Fix-it-yourself notes (Rocky round 2, PR B):
- If cursor/live-lineup-guide-staging (the tip commit) does not exist when you start, stop and report. Do not recreate it.
- Use the image sizes above as next/image width/height. Keep the files byte-identical so the email can hot-link them.
- The guide's "Need a hand?" button must reuse onContactSupport. In the support view, render it as text with no button.

Test budget: tests/help-resources.test.ts + tests/live-lineup-how-to-guide.test.tsx only, at most 3 runs. Do not run the full suite.
Open a PR. CI must show no new failures vs the known baseline.
Release (stop on any failure, report evidence, no fix loop): record the current sparkle-suite-smoke deployment ID, then deploy the PR head to sparkle-suite-smoke (team louis-2849s-projects) via Vercel API create_deployment with gitSource ref codex/nic-nac-trade-hardening and the PR head SHA (intentional; this is how Smoke deploys of PR commits pass scripts/check-active-branch.mjs); confirm READY. If you have no Vercel access, stop after the PR and CI and report; do not look for credentials. Do not deploy to Live, do not merge.
Smoke check budget: 3 page loads (390, 344, 1440 on /nic-nac?section=help-resources&guide=live-lineup) + 1 Lighthouse mobile, only if you already have the Smoke reviewer sign-in; otherwise write "not checked". Never print secrets.
One self-review pass, then stop.
Report: PR link, head SHA, tests and run count, CI result, prior and new Smoke deployment IDs + URL, plan section 1 checklist pass/fail/not checked, Spec corrections I made.
```

### PR A prompt (file: /workspace/plans/live-lineup-prompt-pr-a.md)
```
Repo: louis623/sparkle-suite. Only after PR B is Live: branch from codex/nic-nac-trade-hardening at the tip that includes PR B (say the SHA).
Plan: branch cursor/live-lineup-guide-staging, the tip commit, file docs/plans/2026-11-23-live-lineup-version-notice-help/plan.md, section 2 (PR A). Read-only; do not merge that branch.
Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task.
If the modern-web-guidance skill is not installed for you, read https://developer.chrome.com/docs/modern-web-guidance and follow it.

Build PR A exactly as section 2 describes. Touch only app/nic-nac/components/LiveLineupShowControls.tsx, app/nic-nac/components/LiveLineupCard.module.css, app/nic-nac/components/LiveLineupCard.tsx (only to pass readOnly or an in-app navigate callback) and tests/live-lineup-show-control-ui.test.tsx. No server, SQL or release-config changes: use snapshot.extensionStatus.updateNeeded / workerVersion / latestPublishedVersion as they are. No Smoke preview param.
- Show only when snapshot.authorized && updateNeeded && workerVersion && latestPublishedVersion.
- Copy: "Your Live Lineup extension is out of date" / "You have {worker}. The newest is {latest}." (versions nowrap) / link "How to update".
- Link: plain <a href="/nic-nac?section=help-resources&guide=live-lineup&part=update"> (not next/link); onClick may switch the section in-app with the href as fallback. Read-only/support view: notice text without the link.
- Remove the old "Extension update needed — running X; latest Y." string.
- Inside LiveLineupExtensionDetails under the status row; amber (like .showWarning), no animation, same commit as the snapshot (no extra fetch/effect/timer); card outer height unchanged; list still shows >= 2 rows at 390x700.
Tests: older/current/null worker/"demo-1.0.0"/null latest/unauthorized/readOnly-no-link, plus one static HTML render of the card with the notice.

Fix-it-yourself: clear bugs or spec/code contradictions you fix if behavior stays as intended; list under "Spec corrections I made". Stop and ask only if a fix changes what reps or Louis see or do.
Fix-it-yourself notes (Rocky round 2, PR A):
- extensionStatus is already validated client-side (lib/live-lineup/show-control.ts:156-164). Do not add a second version regex in the UI. Use workerVersion/latestPublishedVersion/updateNeeded as given.
- Put the notice in its own element after the status row, with role="status". Leave the existing role="alert" warnings (LiveLineupShowControls.tsx:84) alone.
- The test render for Louis comes from the unit test (renderToStaticMarkup with the 390-width class names). Attach it to the PR as an image only if you can produce it without a page load.

Test budget: tests/live-lineup-show-control-ui.test.tsx only, at most 3 runs. Do not run the full suite.
Open a PR. CI must show no new failures vs the known baseline.
Release (stop on any failure, report evidence, no fix loop): record the current sparkle-suite-smoke deployment ID, then deploy the PR head to sparkle-suite-smoke (team louis-2849s-projects) via Vercel API create_deployment with gitSource ref codex/nic-nac-trade-hardening and the PR head SHA (intentional; this is how Smoke deploys of PR commits pass scripts/check-active-branch.mjs); confirm READY. If you have no Vercel access, stop after the PR and CI and report; do not look for credentials. Do not deploy to Live, do not merge.
Smoke page loads: 0. Never print secrets.
One self-review pass, then stop.
Report: PR link, head SHA, tests and run count, CI result, prior and new Smoke deployment IDs + URL, plan section 2 checklist pass/fail/not checked, Spec corrections I made.
```

### PR C prompt (file: /workspace/plans/live-lineup-prompt-pr-c.md)
```
Repo: louis623/sparkle-suite. Branch from codex/nic-nac-trade-hardening at its current tip (say the SHA; plan written at 9667296a). Independent of PR A and PR B.
Plan: branch cursor/live-lineup-guide-staging, the tip commit, file docs/plans/2026-11-23-live-lineup-version-notice-help/plan.md, section 2C (PR C). Read-only; do not merge that branch.
Use the modern-web-guidance skill for all web, front-end, performance and accessibility work in this task.
If the modern-web-guidance skill is not installed for you, read https://developer.chrome.com/docs/modern-web-guidance and follow it.

Goal: on the public site, the Live Lineup bar starts with a "LIVE LINEUP" label box at the far left, matching the ANNOUNCEMENTS label, and everything in the bar starts just right of it and lists rightward. Background: 13e75644 (Oct 2) replaced the headed empty strips with a headless, centered renderEmpty() row ("no lineup heading"); PR #207 (feb4b94b) put "I have an open lineup." into it. The row is centered by max-width:1280px; margin:auto, while the ticker rows are full-bleed.
Scope: fast (SSR v2) pages only. Louis, 11:12 AM ET: no reps are on the legacy pages (verified: 9 SSR / 0 legacy). Do NOT edit anything under lib/amethyst/legacy/, lib/amethyst/legacy/manifest.json or its hashes, or tests/rep-render-version.test.ts.
Do:
- Served fast-path files: lib/amethyst/v2/{homepage,trade,join}.jsx LiveQueueStrip, public/amethyst/live-lineup.js renderEmpty(), public/amethyst/homepage.css and the public/amethyst theme CSS. Rebuild generated SSR assets with npm run build:amethyst:ssr.
- Also edit LiveQueueStrip in public/amethyst/{homepage,trade,join}.jsx the same way (they feed /skin-preview and the layout locks only). Don't touch public/amethyst/join-runtime.js unless its entry imports a changed file; say which.
- Add <span class="hp-ticker-label hp-lineup-label">Live Lineup</span> as the first child in every state (calendar, empty/open, delayed, populated). In the populated state it replaces .hp-trade-preview-head: no duplicate "Live Lineup" heading. Keep each section's aria-label (or match it to "Live Lineup"). The live dot sits inside the label only while active/populated; no animation under prefers-reduced-motion. Keep the calendar link logic and copy.
- CSS: .hp-lineup-label { position:static; flex:none; align-self:stretch }. The lineup row is full-bleed flex like .hp-ticker-row (no max-width/margin:auto on the lineup row); content left-aligned right after the label; pills scroll inside the content area; link + updated time may wrap to a second line inside the content area only. <=640px: label 124px like the ticker; one fixed min-height for the lineup row in every state, sized for the tallest common state (calendar prompt on 2 lines at 344px, about 56px); 44px touch targets.
- Dark-theme label fix: keep hp-ticker-label hp-lineup-label. In every public/amethyst theme CSS rule scoped to ".hp-ticker-row .hp-ticker-label" or ".hp-ticker-row:not(.reverse) .hp-ticker-label", add ", <same prefix> .hp-lineup-label" to that rule (never the .reverse rules): fall-owl.css:66, midnight-rose.css:63, gobble-and-fizz.css:71, silver-bells.css:69, starlight-christmas-hollow.css:69, rose-champagne.css:57, pearl-rose.css:63, sunset-beach.css:57 and :299, pie-please.css:80, halloween-pumpkin-witch.css:55. Don't use transparent (tests/amethyst-homepage-template.test.ts:380).
- New CSS test: for every public/amethyst theme file with a scoped .hp-ticker-row .hp-ticker-label (or :not(.reverse)) rule, the same declaration block also selects .hp-lineup-label.
- SSR fallback markup in each v2 LiveQueueStrip must match renderEmpty() exactly (no hydration shift).
- Don't change lineup data, ordering, privacy, polling, ticker rows, header or the Dance Floor bar.
Tests: update tests/customer-site-header.test.ts, tests/public-live-lineup-runtime.test.ts, tests/public-live-lineup.test.ts, tests/customer-site-layout-lock.test.ts for the label in all 4 states (render through v2 LiveQueueStrip + renderEmpty); add the theme-label CSS test; tests/rep-render-version.test.ts must pass unchanged.

Fix-it-yourself: clear bugs or spec/code contradictions you fix if behavior stays as intended; list under "Spec corrections I made". Stop and ask only if a fix changes what reps, customers or Louis see beyond this goal.
Fix-it-yourself notes (Rocky round 2, PR C):
- F-C1 Root cause wording: 13e75644 is 2026-10-02 21:17 UTC (5:17 PM EDT); say "no PR referenced" (a GitHub PR search for the SHA found none).
- F-C2 Layout lock receipt: in tests/fixtures/customer-site-layout-lock.json add a named object like the existing ones: "approvedLiveLineupLabelChange": {date:"2026-11-23", base:"<your base SHA>", approval:"Louis, 2026-11-23 10:37 AM ET: restore the LIVE LINEUP left label on the public lineup bar (plan section 2C); 11:12 AM ET: fast pages only", locks:[{path,function,previousSha256,sha256}...]}. Change only the lock entries PR C touches (public/amethyst/homepage.css and the LiveQueueStrip hashes in public/amethyst/{homepage,trade,join}.jsx); every other lock byte-identical. Public homepage.css will then differ from the legacy snapshot hash; that is expected.
- F-C3 No layout jump: fixed lineup-row min-height at <=640px in every state; label at x=0 in all states; SSR fallback identical to renderEmpty().
- F-C4 No duplicate heading; the populated head becomes the label.
- F-C5 Live dot: no animation under prefers-reduced-motion.
- F-C6 ssrReviewTheme takes appearance preset IDs (fall_owl_harvest_moon, midnight_rose, gobble_and_fizz, silver_bells, starlight_christmas_hollow), not skin-preview IDs. Do not use /skin-preview for verification.
- F-C7 Report renderer use as counts only (SSR vs legacy), never names.

Test budget: the test files named above only, at most 3 runs. Do not run the full suite.
Open a PR. CI must show no new failures vs the known baseline.
Release (stop on any failure, report evidence, no fix loop): record the current sparkle-suite-smoke deployment ID, then deploy the PR head to sparkle-suite-smoke (team louis-2849s-projects) via Vercel API create_deployment with gitSource ref codex/nic-nac-trade-hardening and the PR head SHA (intentional; this is how Smoke deploys of PR commits pass scripts/check-active-branch.mjs); confirm READY. If you have no Vercel access, stop after the PR and CI and report; do not look for credentials. Do not deploy to Live, do not merge.
Smoke check: real public-site loads only, no /skin-preview. Cap 24 loads + 1 Lighthouse; geometry asserts (label left = 0, content left >= label right, no horizontal overflow, same label x and row height before/after hydration) and screenshots from the same loads:
(a) https://sparkle-suite-smoke.vercel.app/dudesfizzfest Home/Trade/Join at 390/344/1440 = 9;
(b) /dudesfizzfest?ssrReviewTheme=<id> Home at 390 for fall_owl_harvest_moon, midnight_rose, gobble_and_fizz, silver_bells, starlight_christmas_hollow = 5;
(c) /dudesfizzfest?ssrReviewTheme=amethyst&ssrReviewLayout=standard|mile_high_fizz|britt_with_bling|bling_kitchen at 1440 = 4;
(d) /milehighfizz Home at 390/344/1440 = 3.
Total 21 loads. 1 Lighthouse mobile on the demo homepage. States Smoke doesn't show are covered by tests. Public pages only; no sign-in. Never print secrets.
One self-review pass, then stop.
Report: PR link, head SHA, files changed (confirm nothing under lib/amethyst/legacy/), tests and run count, CI result, prior and new Smoke deployment IDs + URL, geometry results per load, screenshots, Lighthouse numbers, renderer counts, plan section 2C checklist pass/fail/not checked, Spec corrections I made.
```
