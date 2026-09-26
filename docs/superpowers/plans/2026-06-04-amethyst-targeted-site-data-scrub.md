# Amethyst Targeted Site Data Scrub Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:subagent-driven-development` only if a task can be isolated cleanly without overlapping file edits. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every targeted Sparkle Suite customer site renders only rep/Nic-Nac/database-backed data or honest empty states, with demo/sample content limited to untargeted design previews.

**Architecture:** Add a targeted-site runtime mode derived from `?c=<repId>` or custom-domain routing. In targeted mode, Amethyst bootstrap APIs must not return demo shows, demo trade listings, fake Live Queue names, fake team members, or Sasha/Jane metadata. Keep the existing Amethyst template and skin system intact; change data boundaries and empty-state behavior, not the visual template.

**Tech Stack:** Next.js App Router, TypeScript, Supabase-backed services, public Amethyst React exports, Vitest, Vercel preview smoke testing.

---

## Scope And Rules

- Work from `C:\Users\louis\sparkle-suite-repo`, not `C:\Users\louis\sparkle-suite`.
- Do not modify Chrome Web Store settings.
- Do not modify Sparkle Suite Chrome extension files or live-show systems.
- Do not send live customer SMS/email/provider messages.
- Do not stage or modify unrelated dirty files:
  - `app/nic-nac/_shell.module.css`
  - `vault/session-log.md`
- Keep Amethyst as the only customer-site template.
- Keep Looks/skins visual-only.
- Targeted site rule: if Nic-Nac/database did not provide it, the customer site should show a neutral empty state instead of demo data.
- Untargeted demo/export rule: generic `/amethyst/*.html` pages without `?c=` may keep sample content so design review remains possible.

## File Map

- `lib/amethyst/request-rep-target.ts`  
  Resolves explicit customer target from `?c=`, `?repId=`, referer, or custom domain.

- `app/api/amethyst/homepage-template/route.ts`  
  Builds homepage bootstrap data and currently loads events without passing the rep target.

- `app/api/amethyst/trade-template/route.ts`  
  Builds Trade Board bootstrap data and already passes `repId` into listing load.

- `app/api/amethyst/trade-board/route.ts`  
  Returns live public Trade Board listings.

- `app/api/amethyst/join-template/route.ts`  
  Builds Join Team bootstrap data.

- `app/api/amethyst/customer-audience/unsubscribe/route.ts`  
  Needs target rep resolution so unsubscribes stay scoped to the current customer site.

- `app/amethyst/[...asset]/route.ts`  
  Serves static Amethyst HTML and rewrites metadata/JSON-LD. Currently rep-blind and hard-codes Jane in JSON-LD.

- `lib/amethyst/preview-template-data.ts`  
  Maps site settings and required setup draft into homepage/trade/join template data.

- `lib/self-serve/required-setup-site-draft.ts`  
  Publishes approved required setup answers on unlock. Should share draft normalization with preview rendering.

- `lib/amethyst/homepage-template-data.ts`  
  Homepage data shape and bootstrap script.

- `lib/amethyst/homepage-upcoming-shows.ts`  
  Loads upcoming shows. Currently returns demo events on missing data.

- `lib/amethyst/trade-board-listings.ts`  
  Loads public Trade Board listings. Currently returns demo listings on missing data.

- `lib/amethyst/trade-template-data.ts`  
  Trade page data shape and bootstrap script. Currently defaults listings to demo records.

- `lib/amethyst/join-template-data.ts`  
  Join page data shape and bootstrap script. Currently has demo team members.

- `public/amethyst/Homepage.html`, `Trade.html`, `Join.html`, `Unsubscribe.html`  
  Static HTML shells. Script tags currently do not carry `?c=`.

- `public/amethyst/homepage.jsx`, `trade.jsx`, `join.jsx`, `unsubscribe.jsx`  
  Locked React exports with static fallback/demo UI.

- Tests to add or modify:
  - `tests/amethyst-targeted-site-data-scrub.test.ts`
  - `tests/amethyst-homepage-upcoming-shows.test.ts`
  - `tests/amethyst-trade-template.test.ts`
  - `tests/amethyst-trade-board-route.test.ts`
  - `tests/amethyst-homepage-template.test.ts`
  - `tests/amethyst-join-template.test.ts`
  - `tests/amethyst-static-assets-route.test.ts`
  - `tests/amethyst-customer-audience-unsubscribe-route.test.ts`
  - `tests/amethyst-preview-template-data.test.ts`
  - `tests/self-serve-required-setup.test.ts`

---

### Task 1: Add Targeted-Site Regression Tests

**Files:**
- Create: `tests/amethyst-targeted-site-data-scrub.test.ts`
- Modify as needed: existing Amethyst tests listed above

- [ ] **Step 1: Add a shared forbidden-demo assertion helper**

Create a local test helper in `tests/amethyst-targeted-site-data-scrub.test.ts`:

```ts
const FORBIDDEN_TARGETED_SITE_TEXT = [
  'Sparkle by Sasha',
  "Jane's Sparkle Party",
  'Sasha Rivera',
  'Unicorn Magic Drop',
  'Birthday Bloom Ring',
  'Velvet Hour Necklace',
  'Petal Drop Earrings',
  'Aurora Stack',
  'Jamie L.',
  'Priya M.',
  'Live Tuesdays',
  '8pm CST',
  '8:00 PM CST',
]

function expectNoDemoCustomerData(serialized: string) {
  for (const value of FORBIDDEN_TARGETED_SITE_TEXT) {
    expect(serialized).not.toContain(value)
  }
}
```

- [ ] **Step 2: Add targeted homepage bootstrap test**

Mock the homepage route dependencies so `/api/amethyst/homepage-template?c=rep-clean` returns:
- rep/customer setup identity,
- no calendar events,
- no Trade Board ticker samples,
- no fake Live Queue names,
- no Sasha/Jane/default show copy.

Expected assertions:

```ts
expect(script).toContain('window.AMETHYST_HOMEPAGE_TEMPLATE_DATA')
expect(script).toContain('"businessName":"Clean Smoke Sparkle"')
expect(script).toContain('"heroSub":"A saved Nic-Nac welcome line."')
expect(script).toContain('window.AMETHYST_HOMEPAGE_EVENTS = []')
expectNoDemoCustomerData(script)
```

- [ ] **Step 3: Add targeted trade bootstrap test**

Mock `/api/amethyst/trade-template?c=rep-clean` with no listings.

Expected assertions:

```ts
expect(script).toContain('window.AMETHYST_TRADE_BOARD_LISTINGS = []')
expect(script).toContain('"contentState":"empty"')
expectNoDemoCustomerData(script)
```

- [ ] **Step 4: Add targeted join bootstrap test**

Mock `/api/amethyst/join-template?c=rep-clean`.

Expected assertions:

```ts
expect(script).toContain('"teamMembers":[]')
expect(script).toContain('"showTeam":false')
expectNoDemoCustomerData(script)
```

- [ ] **Step 5: Add targeted static HTML route test**

Call `GET` for `https://preview.example/amethyst/Homepage.html?c=rep-clean`.

Expected assertions:

```ts
expect(html).toContain('/api/amethyst/homepage-template?c=rep-clean')
expect(html).not.toContain("Jane's Sparkle Party")
expect(html).not.toContain('repName":"Jane')
```

- [ ] **Step 6: Verify tests fail before implementation**

Run:

```powershell
npm exec vitest run tests/amethyst-targeted-site-data-scrub.test.ts tests/amethyst-static-assets-route.test.ts
```

Expected: FAIL on current demo/default leakage.

---

### Task 2: Centralize Required Setup Draft Normalization

**Files:**
- Create: `lib/self-serve/required-setup-draft.ts`
- Modify: `lib/amethyst/preview-template-data.ts`
- Modify: `lib/self-serve/required-setup-site-draft.ts`
- Modify: `tests/amethyst-preview-template-data.test.ts`
- Modify: `tests/self-serve-required-setup.test.ts`

- [ ] **Step 1: Move draft parsing into one shared helper**

Create `normalizeRequiredSetupDraftState(state)` in `lib/self-serve/required-setup-draft.ts`.

It must read account basics, Look, welcome copy, about copy, and schedule from both `answers` and `generatedCopy`.

Include aliases for the fields that Nic-Nac may save:

```ts
welcomeSupportingLine: firstText(
  welcomeAnswers.supportingLine,
  welcomeAnswers.supportingWelcomeLine,
  welcomeAnswers.supportingCopy,
  welcomeAnswers.supporting,
  welcomeAnswers.subheadline,
  welcomeAnswers.subtitle,
  welcomeAnswers.heroSub,
  welcomeAnswers.line,
  welcomeAnswers.copy,
  welcomeAnswers.tagline,
  welcomeGenerated.supportingLine,
  welcomeGenerated.supportingWelcomeLine,
  welcomeGenerated.supportingCopy,
  welcomeGenerated.supporting,
  welcomeGenerated.subheadline,
  welcomeGenerated.subtitle,
  welcomeGenerated.heroSub,
  welcomeGenerated.line,
  welcomeGenerated.copy,
  welcomeGenerated.tagline,
)
```

Schedule aliases must include:

```ts
scheduleSummary: firstText(
  scheduleAnswers.scheduleSummary,
  scheduleAnswers.summary,
  scheduleAnswers.regularSchedule,
  scheduleAnswers.showSchedule,
  scheduleAnswers.schedule,
  scheduleAnswers.copy,
  scheduleAnswers.answer,
  scheduleGenerated.scheduleSummary,
  scheduleGenerated.summary,
  scheduleGenerated.regularSchedule,
  scheduleGenerated.showSchedule,
  scheduleGenerated.schedule,
  scheduleGenerated.copy,
  scheduleGenerated.answer,
)
```

- [ ] **Step 2: Use shared helper in preview rendering**

Replace the duplicated normalizer inside `lib/amethyst/preview-template-data.ts` with the shared helper.

- [ ] **Step 3: Use shared helper in unlock publishing**

Replace the duplicated normalizer inside `lib/self-serve/required-setup-site-draft.ts` with the shared helper.

- [ ] **Step 4: Add test for real Nic-Nac alias shapes**

Add a preview data test where welcome line is saved as `subheadline` and schedule is saved as `answer`.

Expected:

```ts
expect(data.homepage.heroSub).toBe('The exact saved subheadline.')
expect(data.homepage.aboutParagraphs[2]).toContain('The exact saved schedule.')
```

- [ ] **Step 5: Run focused draft tests**

```powershell
npm exec vitest run tests/amethyst-preview-template-data.test.ts tests/self-serve-required-setup.test.ts
```

Expected: PASS after implementation.

---

### Task 3: Add Targeted Runtime Mode To Bootstrap Data

**Files:**
- Modify: `lib/amethyst/homepage-template-data.ts`
- Modify: `lib/amethyst/trade-template-data.ts`
- Modify: `lib/amethyst/join-template-data.ts`
- Modify: `app/api/amethyst/homepage-template/route.ts`
- Modify: `app/api/amethyst/trade-template/route.ts`
- Modify: `app/api/amethyst/join-template/route.ts`

- [ ] **Step 1: Add a targeted flag to bootstrap scripts**

Each bootstrap script should expose page context:

```ts
export interface AmethystRuntimeContext {
  targeted: boolean
}
```

Serialize it:

```ts
`window.AMETHYST_RUNTIME_CONTEXT = ${safeScriptJson({ targeted })};`
```

- [ ] **Step 2: Compute targeted mode in routes**

In each template route:

```ts
const repId = resolveAmethystRequestRepId(request)
const targeted = Boolean(repId)
```

Pass `{ targeted }` to the bootstrap script.

- [ ] **Step 3: Set targeted tweak defaults to empty where needed**

For homepage targeted mode:

```ts
showEvents: events.length > 0,
lrqState: 'empty',
```

For trade targeted mode:

```ts
contentState: listings.length > 0 ? 'populated' : 'empty',
cardCount: listings.length,
```

For join targeted mode:

```ts
showTeam: data.teamMembers.length > 0,
teamMemberCount: data.teamMembers.length,
showPromo: Boolean(data.promoText),
```

- [ ] **Step 4: Preserve untargeted demo mode**

When `targeted === false`, existing sample/demo data may remain available for design review.

- [ ] **Step 5: Run template tests**

```powershell
npm exec vitest run tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts
```

Expected: PASS after updating expectations.

---

### Task 4: Scrub Homepage Targeted Fallbacks

**Files:**
- Modify: `lib/amethyst/homepage-template-data.ts`
- Modify: `lib/amethyst/homepage-upcoming-shows.ts`
- Modify: `app/api/amethyst/homepage-template/route.ts`
- Modify: `public/amethyst/homepage.jsx`
- Modify: `tests/amethyst-homepage-upcoming-shows.test.ts`
- Modify: `tests/amethyst-homepage-template.test.ts`

- [ ] **Step 1: Pass rep target into upcoming shows loader**

Change the route from:

```ts
loadAmethystHomepageUpcomingShows()
```

to:

```ts
loadAmethystHomepageUpcomingShows({ repId, targeted })
```

- [ ] **Step 2: Return empty events for targeted reps with no shows**

In `loadAmethystHomepageUpcomingShows`, use this behavior:

```ts
if (targeted && !result.events.length) return []
if (targeted && !rep?.id) return []
if (targeted && error) return []
```

Untargeted pages may still return `defaultAmethystHomepageEvents`.

- [ ] **Step 3: Add `heroEyebrow` and schedule-aware data**

Add `heroEyebrow` to `AmethystHomepageTemplateData` and tweak defaults.

For targeted setup:

```ts
heroEyebrow: draft.scheduleSummary
  ? `Live schedule: ${draft.scheduleSummary}`
  : 'Live schedule coming soon'
```

- [ ] **Step 4: Remove hard-coded homepage schedule**

Change `public/amethyst/homepage.jsx` from:

```jsx
<div className="hp-hero-eyebrow">Live Tuesdays · 8pm CST</div>
```

to:

```jsx
<div className="hp-hero-eyebrow">{t.heroEyebrow}</div>
```

- [ ] **Step 5: Make homepage ticker not invent Trade Board items in targeted mode**

Use runtime context:

```jsx
const RUNTIME_CONTEXT = window.AMETHYST_RUNTIME_CONTEXT || {};
```

In targeted mode, do not render the fake `trades` row unless real trade ticker data exists. Until real trade ticker data exists, render a neutral row:

```jsx
<span className="hp-ticker-empty">Trade Board listings will appear here after pieces are added.</span>
```

- [ ] **Step 6: Make homepage Live Queue empty by default for targeted mode**

Do not render fake names for targeted mode. The strip should show:

```text
Live Queue is ready. Customer names appear here when a live show is connected.
```

- [ ] **Step 7: Run homepage tests**

```powershell
npm exec vitest run tests/amethyst-homepage-template.test.ts tests/amethyst-homepage-upcoming-shows.test.ts tests/amethyst-targeted-site-data-scrub.test.ts
```

Expected: PASS.

---

### Task 5: Scrub Trade Board Targeted Fallbacks

**Files:**
- Modify: `lib/amethyst/trade-board-listings.ts`
- Modify: `lib/amethyst/trade-template-data.ts`
- Modify: `public/amethyst/trade.jsx`
- Modify: `tests/amethyst-trade-template.test.ts`
- Modify: `tests/amethyst-trade-board-route.test.ts`

- [ ] **Step 1: Return empty listings for targeted reps with no board data**

In `loadAmethystTradeBoardPreviewListings`:

```ts
if (options.repId && !rep?.id) return []
if (options.repId && !board.listings.length) return []
if (options.repId && error) return []
```

Keep `defaultAmethystTradeBoardListings` only for untargeted demo mode.

- [ ] **Step 2: Stop trade bootstrap from defaulting listings to demo data**

Change:

```ts
listings: AmethystTradeBoardListing[] = defaultAmethystTradeBoardListings
```

to:

```ts
listings: AmethystTradeBoardListing[] = []
```

Only the caller should pass demo listings for untargeted mode.

- [ ] **Step 3: Stop client-side sample generation in targeted mode**

In `public/amethyst/trade.jsx`, change:

```jsx
return buildSamples(t.cardCount);
```

to:

```jsx
if (RUNTIME_CONTEXT.targeted) return [];
return buildSamples(t.cardCount);
```

- [ ] **Step 4: Scrub trade ticker in targeted mode**

Do not render fake ticker trades for targeted mode. Show neutral empty copy or hide the Trade Board ticker row.

- [ ] **Step 5: Fix targeted empty state schedule copy**

Change empty state from:

```text
Next show: Tuesday - 8:00 PM CST
```

to:

```text
Listings will appear after this rep adds trade pieces.
```

- [ ] **Step 6: Run trade tests**

```powershell
npm exec vitest run tests/amethyst-trade-template.test.ts tests/amethyst-trade-board-route.test.ts tests/amethyst-targeted-site-data-scrub.test.ts
```

Expected: PASS.

---

### Task 6: Scrub Join Page Targeted Fallbacks

**Files:**
- Modify: `lib/amethyst/join-template-data.ts`
- Modify: `lib/amethyst/preview-template-data.ts`
- Modify: `public/amethyst/join.jsx`
- Modify: `tests/amethyst-join-template.test.ts`
- Modify: `tests/amethyst-preview-template-data.test.ts`

- [ ] **Step 1: Empty team members for targeted new reps**

For targeted previews, `teamMembers` should default to `[]` unless the rep/database provides real team member data.

- [ ] **Step 2: Hide team grid when no team data exists**

Set:

```ts
showTeam: data.teamMembers.length > 0
teamMemberCount: data.teamMembers.length
```

- [ ] **Step 3: Stop client fallback team data in targeted mode**

In `public/amethyst/join.jsx`, change:

```jsx
CONTENT.teamMembers && CONTENT.teamMembers.length > 0
  ? CONTENT.teamMembers
  : FALLBACK_TEAM
```

to:

```jsx
CONTENT.teamMembers && CONTENT.teamMembers.length > 0
  ? CONTENT.teamMembers
  : RUNTIME_CONTEXT.targeted
    ? []
    : FALLBACK_TEAM
```

- [ ] **Step 4: Scrub Join ticker and Live Queue fake data**

In targeted mode:
- hide fake Trade Board ticker trades,
- show neutral Live Queue empty state,
- avoid fake customer names.

- [ ] **Step 5: Keep join content honest**

If no join/team program data is configured, keep the page linked but neutral. Do not invent team members, team events, or promotions.

- [ ] **Step 6: Run join tests**

```powershell
npm exec vitest run tests/amethyst-join-template.test.ts tests/amethyst-targeted-site-data-scrub.test.ts
```

Expected: PASS.

---

### Task 7: Make Static HTML Metadata And Scripts Target-Aware

**Files:**
- Modify: `app/amethyst/[...asset]/route.ts`
- Modify: `public/amethyst/Homepage.html`
- Modify: `public/amethyst/Trade.html`
- Modify: `public/amethyst/Join.html`
- Modify: `public/amethyst/Unsubscribe.html`
- Modify: `tests/amethyst-static-assets-route.test.ts`
- Modify: `tests/seo/amethyst-public-metadata.test.ts` if needed

- [ ] **Step 1: Carry `?c=` into template script URLs**

In the static asset route, rewrite script tags based on the incoming request URL:

```ts
function rewriteTemplateScriptTarget(html: string, page: AmethystPublicPage, requestUrl: URL) {
  const target = requestUrl.searchParams.get('c') || requestUrl.searchParams.get('repId')
  if (!target) return html
  const endpoint = page === 'homepage'
    ? '/api/amethyst/homepage-template'
    : page === 'trade'
      ? '/api/amethyst/trade-template'
      : '/api/amethyst/join-template'
  return html.replace(
    `src="${endpoint}"`,
    `src="${endpoint}?c=${escapeHtmlAttribute(target)}"`,
  )
}
```

- [ ] **Step 2: Make metadata rep-aware for targeted pages**

For HTML requests with `?c=`, load `loadAmethystPreviewTemplateData({ repId })` and build:

```ts
title: `${businessName} - Live jewelry reveals`
description: `Shop live jewelry reveals and updates with ${businessName}.`
```

For Trade:

```ts
title: `${businessName} - Trade Board`
description: `Browse available trade pieces from ${businessName}.`
```

For Join:

```ts
title: `Join ${teamName}`
description: `Learn how to join ${teamName} with ${repName}.`
```

- [ ] **Step 3: Remove hard-coded Jane JSON-LD for targeted pages**

Use targeted template data:

```ts
repName: templateData.homepage.repName,
businessName: templateData.homepage.businessName,
shopUrl: templateData.homepage.streamLinks.shop,
```

- [ ] **Step 4: Keep untargeted metadata behavior**

Untargeted pages may keep the existing demo metadata.

- [ ] **Step 5: Run static route tests**

```powershell
npm exec vitest run tests/amethyst-static-assets-route.test.ts tests/seo/amethyst-public-metadata.test.ts tests/seo/amethyst-structured-data.test.ts
```

Expected: PASS.

---

### Task 8: Fix Customer Form Target Propagation

**Files:**
- Modify: `public/amethyst/homepage.jsx`
- Modify: `public/amethyst/trade.jsx`
- Modify: `public/amethyst/unsubscribe.jsx`
- Modify: `app/api/amethyst/customer-audience/unsubscribe/route.ts`
- Modify: `tests/amethyst-customer-audience-route.test.ts`
- Modify: `tests/amethyst-customer-audience-unsubscribe-route.test.ts`
- Modify: `tests/amethyst-trade-request-route.test.ts` if needed

- [ ] **Step 1: Add current query string to public fetches**

Create a small helper in each public React export that posts to the current target:

```jsx
function withCurrentSearch(path) {
  return `${path}${window.location.search || ""}`;
}
```

Use it for:

```jsx
fetch(withCurrentSearch("/api/amethyst/customer-audience"), ...)
fetch(withCurrentSearch("/api/amethyst/customer-audience/unsubscribe"), ...)
fetch(withCurrentSearch("/api/amethyst/trade-board"), ...)
```

- [ ] **Step 2: Resolve unsubscribe target from request**

In `app/api/amethyst/customer-audience/unsubscribe/route.ts`:

```ts
const repId = resolveAmethystRequestRepId(request)
const rep = await resolveAmethystPreviewRep(admin, {
  env: process.env,
  repId,
  select: 'id, email',
})
```

- [ ] **Step 3: Add unsubscribe route regression**

Assert `/api/amethyst/customer-audience/unsubscribe?c=rep-clean` calls resolver with `repId: 'rep-clean'`.

- [ ] **Step 4: Confirm trade request safety**

Trade requests use `listingId`, and ownership is validated by the service. No rep id should be accepted from the public request body.

- [ ] **Step 5: Run form route tests**

```powershell
npm exec vitest run tests/amethyst-customer-audience-route.test.ts tests/amethyst-customer-audience-unsubscribe-route.test.ts tests/amethyst-trade-request-route.test.ts tests/amethyst-trade-board-route.test.ts
```

Expected: PASS.

---

### Task 9: Verification And Smoke Readiness

**Files:**
- Modify: `docs/superpowers/smoke/required-setup-checkout-smoke.md`

- [ ] **Step 1: Run targeted Amethyst tests**

```powershell
npm exec vitest run tests/amethyst-targeted-site-data-scrub.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-homepage-upcoming-shows.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-trade-board-route.test.ts tests/amethyst-join-template.test.ts tests/amethyst-static-assets-route.test.ts tests/amethyst-preview-template-data.test.ts tests/amethyst-customer-audience-route.test.ts tests/amethyst-customer-audience-unsubscribe-route.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run required setup tests touched by shared draft normalization**

```powershell
npm exec vitest run tests/self-serve-required-setup.test.ts tests/nic-nac-required-setup-tools.test.ts tests/nic-nac-required-setup-prompt.test.ts tests/nic-nac-required-setup-client.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run focused smoke suite**

```powershell
npm exec vitest run tests/stripe-create-checkout-route.test.ts tests/stripe-sync-route.test.ts tests/self-serve-setup-state-route.test.ts tests/reviewer-smoke-session.test.ts tests/reviewer-smoke-ui.test.ts tests/services/live-queue.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run production build**

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 5: Deploy preview**

```powershell
npx vercel --prod
```

Use the project’s established deployment command/flow from the current branch.

- [ ] **Step 6: Browser smoke gate before approving any final preview**

For a targeted new rep final preview, verify:

```text
No Sparkle by Sasha.
No Jane's Sparkle Party.
No fake Trade Board listings.
No fake Trade Board ticker pieces.
No fake Live Queue customer names.
No fake shows.
No hard-coded Tuesday 8pm CST schedule.
No fake team members.
Title/meta match the new rep.
Trade Board is empty until listings are added.
Live Queue is empty/ready until the extension/live show provides data.
Customer signup and unsubscribe post to the targeted rep.
```

- [ ] **Step 7: Update smoke doc**

Add a “targeted customer-site no-demo-data gate” section to `docs/superpowers/smoke/required-setup-checkout-smoke.md`.

---

## Commit Plan

Use small commits:

1. `test: add targeted Amethyst no-demo-data coverage`
2. `fix: centralize required setup draft mapping`
3. `fix: scrub targeted homepage demo fallbacks`
4. `fix: scrub targeted trade board demo fallbacks`
5. `fix: scrub targeted join page demo fallbacks`
6. `fix: target Amethyst metadata and customer form routes`
7. `docs: add targeted site smoke gate`

## Subagent Guidance

Subagents are optional. Use them only if the implementation is split after Task 1 tests are in place.

Good subagent splits:
- Homepage/events/static metadata.
- Trade Board/listings/empty state.
- Join page/team/queue/ticker.
- Customer form target propagation.

Do not use subagents for overlapping edits to `preview-template-data.ts`, shared draft normalization, or the same public JSX file at the same time.

## Self-Review

- Spec coverage: Covers homepage, Trade Board, Join Team, static metadata/JSON-LD, customer signup/unsubscribe routing, and required setup draft normalization.
- Safety: Does not touch Chrome Web Store settings, Chrome extension code, live-show systems, or live customer sends.
- Product behavior: Keeps sample data available for untargeted demo/design review while making targeted paid customer sites honest and empty until real data exists.
- Testability: Adds explicit no-demo-data assertions for targeted sites and keeps manual smoke gates concrete.
