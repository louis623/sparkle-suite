# Mile High Fizz Hybrid Site Migration Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Lindsey's Mile High Fizz public site inside Sparkle Suite so it looks and reads like Mile High Fizz, while Trade Board, live queue, calendar, announcements, Nic-Nac, site settings, and workspace behavior remain standard Sparkle Suite systems.

**Architecture:** This is a custom Mile High Fizz public-site presentation, not a generic skin preset and not a fork of Sparkle Suite mechanics. The public routes should render Mile High Fizz-specific layout/content sections and brand styling, but data and operations must continue to flow through normal rep-scoped Sparkle Suite services. Lindsey's workspace remains standard Sparkle Suite.

**Tech Stack:** Next.js App Router, React/TypeScript, Supabase/Postgres, existing Sparkle Suite Amethyst/public-site services, Nic-Nac tools, Vercel deployment, current live `https://milehighfizz.com/` as source of truth.

---

## Locked Requirements

- `https://milehighfizz.com/` is the source of truth for visual direction, content, language, imagery, and Join My Team content.
- The result should look like Mile High Fizz on the outside and use Sparkle Suite machinery underneath.
- Public site pages for this pass:
  - Home
  - Trade Board
  - Join My Team
  - External Shop link
  - External TikTok/Live link
  - External Facebook/VIP link
- Remove from the migrated public navigation and phase-one page set:
  - Diamonds/Unicorns
  - FAQ
- Homepage order:
  1. Mile High Fizz hero, recreated as close as possible to the current site
  2. Sparkle Suite live queue component using Lindsey's existing/current queue data
  3. Sparkle Suite calendar component
  4. Robust About section preserving as much current wording/content as practical
  5. CTA/supporting sections for Shop, Join My Team, TikTok/Live, Facebook/VIP, Trade Board
- Header and announcement ticker can use the new Sparkle Suite pattern.
- Announcement ticker text must be Sparkle Suite-managed so Lindsey can change it later.
- Trade Board must be its own page, functionally the same as every other Sparkle Suite Trade Board, visually dressed in Mile High Fizz branding.
- Join My Team must be recreated inside Sparkle Suite as close as possible visually and content-wise.
- Calendar and live queue should use current Sparkle Suite standards and Lindsey's actual data.
- Lindsey's internal workspace remains standard Sparkle Suite.
- Nic-Nac should be able to update normal content/settings/branding/copy/links/announcements for Lindsey like any normal rep.
- Nic-Nac should not be able to accidentally remove the custom Mile High Fizz structure or convert the site back to a generic template.
- Do not move DNS or cut over `milehighfizz.com` until Louis explicitly approves after review.
- Do not touch Chrome Web Store settings or local Sparkle Suite extension/live-queue protected files.

## File Structure

Use implementation repo only: `C:\Users\louis\sparkle-suite-repo`.

Likely files to inspect or modify:

- `lib/amethyst/preview-rep.ts` - rep/domain/slug resolution for public previews and eventual custom domain.
- `lib/amethyst/request-rep-target.ts` - customer-site API target resolution for hydration, Trade Board refresh, signup, unsubscribe, trade requests.
- `lib/amethyst/preview-template-data.ts` - current public template data assembly.
- `lib/amethyst/homepage-template-data.ts` - homepage section data mapping.
- `lib/amethyst/trade-template-data.ts` - Trade Board page data mapping.
- `lib/amethyst/join-template-data.ts` - current Join page data mapping if it exists.
- `lib/amethyst/appearance-presets.ts` - only if the current renderer requires a preset token for Mile High Fizz styling; this must not become a generic selectable skin.
- `components` or `app` public-site template files - exact files should be identified by searching for current Amethyst homepage/trade/join renderers.
- `app/api/amethyst/trade-board/route.ts` - verify Lindsey context survives public Trade Board refresh.
- `app/api/amethyst/trade-requests/route.ts` or equivalent - verify trade requests stay rep-scoped.
- `lib/services/site-settings.ts` - allow Lindsey/Nic-Nac to edit normal fields without breaking protected structure.
- `lib/nic-nac` site-settings tools - ensure normal editable fields remain writable.
- `tests/amethyst-homepage-template.test.ts`
- `tests/amethyst-preview-template-data.test.ts`
- `tests/amethyst-trade-template.test.ts`
- `tests/amethyst-join-template.test.ts` or create if missing.
- `tests/mile-high-fizz-public-site.test.ts` or create focused tests if existing Amethyst tests would become too broad.
- `tests/amethyst-trade-board-route.test.ts`
- `tests/nic-nac-site-settings.test.ts` or existing Nic-Nac customization tests.
- `docs/sparkle-suite` help or migration notes only if a rep-facing note is needed after implementation.

---

### Task 1: Source Audit And Asset Inventory

**Files:**
- Read only: `https://milehighfizz.com/`
- Create: `docs/handoffs/mile-high-fizz-source-audit.md` if the active repo already stores migration handoffs there, otherwise keep notes in the binder.

- [ ] **Step 1: Capture current live-site pages**

Open and screenshot:

```text
https://milehighfizz.com/
https://milehighfizz.com/join-my-team
```

If the Join URL differs, discover it from the live navigation and record the actual URL.

- [ ] **Step 2: Inventory public navigation**

Record current public nav labels and target URLs. Mark each as one of:

```text
keep-internal: Home, Trade Board, Join My Team
keep-external: Shop, TikTok/Live, Facebook/VIP
remove: Diamonds/Unicorns, FAQ
```

- [ ] **Step 3: Inventory content and images**

For each homepage section, record:

```text
section_name:
  keep: yes/no
  migration_target: hero/live_queue/calendar/about/cta/remove
  copy_priority: exact/mostly-preserve/summarize/remove
  image_assets: source URLs or screenshot references
  notes: what makes it feel like Mile High Fizz
```

- [ ] **Step 4: Inventory Join My Team**

Record Join page:

```text
hero copy
section headings
body copy
CTA labels
CTA URLs
images/backgrounds
form or external link behavior
```

- [ ] **Step 5: Do not commit code**

This task is discovery-only. Commit only an audit document if the implementation flow needs one.

---

### Task 2: Public-Site Contract And Tests

**Files:**
- Create or modify: `tests/mile-high-fizz-public-site.test.ts`
- Modify as needed: `tests/amethyst-preview-template-data.test.ts`
- Modify as needed: `tests/amethyst-homepage-template.test.ts`
- Modify as needed: `tests/amethyst-trade-template.test.ts`
- Create or modify: `tests/amethyst-join-template.test.ts`

- [ ] **Step 1: Write failing tests for page scope**

Add tests that assert Mile High Fizz public nav contains exactly the intended internal pages and external CTAs:

```ts
expect(navLabels).toEqual([
  'Home',
  'Trade Board',
  'Join My Team',
  'Shop',
  'TikTok/Live',
  'Facebook/VIP',
])
expect(navLabels).not.toContain('Diamonds and Unicorns')
expect(navLabels).not.toContain('FAQ')
```

- [ ] **Step 2: Write failing tests for homepage order**

Add a test that extracts section IDs from the Mile High Fizz homepage data and asserts:

```ts
expect(sectionIds).toEqual([
  'hero',
  'liveQueue',
  'calendar',
  'about',
  'callsToAction',
])
```

- [ ] **Step 3: Write failing tests for Mile High Fizz brand source**

Assert the homepage data includes:

```ts
expect(site.businessName).toBe('Mile High Fizz')
expect(site.repName).toMatch(/Lindsey/i)
expect(site.brandMode).toBe('mile_high_fizz_custom')
expect(homepage.hero.title).toMatch(/Mile High Fizz|Fizz/i)
expect(homepage.copyTone).toMatch(/fizz|reveal|spark/i)
```

- [ ] **Step 4: Write failing tests for protected custom structure**

Assert normal site settings can change editable copy/links, but cannot remove the Mile High Fizz structure:

```ts
expect(editableFields).toContain('announcementText')
expect(editableFields).toContain('heroHeadline')
expect(editableFields).toContain('shopUrl')
expect(protectedFields).toContain('publicSiteStructure')
expect(protectedFields).toContain('mileHighFizzJoinPageEnabled')
```

- [ ] **Step 5: Run tests and verify failure**

Run:

```bash
npm exec vitest run tests/mile-high-fizz-public-site.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts
```

Expected: tests fail because custom Mile High Fizz public structure does not exist yet.

- [ ] **Step 6: Commit tests**

```bash
git add tests/mile-high-fizz-public-site.test.ts tests/amethyst-preview-template-data.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts
git commit -m "test: define Mile High Fizz hybrid site contract"
```

---

### Task 3: Mile High Fizz Public Configuration Model

**Files:**
- Modify: `lib/amethyst/preview-template-data.ts`
- Modify: `lib/services/site-settings.ts`
- Modify: Nic-Nac site settings tool files under `lib/nic-nac/`
- Modify: Supabase types or migrations only if a new durable field is required.
- Test: `tests/mile-high-fizz-public-site.test.ts`
- Test: `tests/nic-nac-site-settings.test.ts` or closest existing test.

- [ ] **Step 1: Prefer existing fields first**

Map existing site settings into:

```ts
type MileHighFizzEditableContent = {
  announcementText: string
  heroHeadline: string
  heroSubheadline: string
  aboutCopy: string
  shopUrl: string
  tiktokUrl: string
  facebookVipUrl: string
  brandColors: {
    primary: string
    accent: string
    background: string
    text: string
  }
}
```

If equivalent fields already exist, use them. Add new fields only for content the current model cannot represent.

- [ ] **Step 2: Add protected structure marker**

Represent custom structure as a server-owned value, for example:

```ts
publicSiteStructure: 'mile_high_fizz_hybrid'
```

This field can be read by renderers and admin logic, but Nic-Nac should not offer structure-changing writes.

- [ ] **Step 3: Allow Nic-Nac to edit normal content**

Ensure Nic-Nac can update:

```text
business/display copy
announcement text
hero copy
about copy
brand colors
image references
shop link
TikTok/live link
Facebook/VIP link
```

Ensure Nic-Nac cannot update:

```text
publicSiteStructure
route list
custom page component selection
Join page enabled/disabled state
```

- [ ] **Step 4: Run model tests**

```bash
npm exec vitest run tests/mile-high-fizz-public-site.test.ts tests/nic-nac-site-settings.test.ts
```

Expected: content edits pass; protected structure writes are rejected or ignored.

- [ ] **Step 5: Commit**

```bash
git add lib/amethyst/preview-template-data.ts lib/services/site-settings.ts lib/nic-nac tests/mile-high-fizz-public-site.test.ts tests/nic-nac-site-settings.test.ts
git commit -m "feat: add protected Mile High Fizz public structure"
```

---

### Task 4: Homepage Hybrid Build

**Files:**
- Modify: existing public homepage renderer under `app` or `components`.
- Modify: `lib/amethyst/homepage-template-data.ts`
- Modify: `lib/amethyst/preview-template-data.ts`
- Test: `tests/amethyst-homepage-template.test.ts`
- Test: `tests/mile-high-fizz-public-site.test.ts`

- [ ] **Step 1: Implement hero close to source**

Build the Mile High Fizz hero using source-site copy, imagery, colors, type feel, and layout. Header/ticker should use Sparkle Suite's current pattern, with Mile High Fizz styling.

Required hero behavior:

```text
recognizable as the current Mile High Fizz hero
responsive on mobile and desktop
primary CTA to Shop
secondary CTA to TikTok/Live or Trade Board
no Diamonds/Unicorns or FAQ CTAs
```

- [ ] **Step 2: Add live queue homepage section**

Use existing Sparkle Suite live queue component/service. Do not fork live queue logic. Pass Lindsey's rep context and existing sync code through the normal data path.

- [ ] **Step 3: Add calendar homepage section**

Use existing Sparkle Suite calendar component/service. Keep its behavior standard and style it with Mile High Fizz tokens.

- [ ] **Step 4: Add robust About section**

Preserve as much source-site wording as practical. The section lives on the homepage and must not become its own page for this phase.

- [ ] **Step 5: Add CTA section**

Include CTAs for:

```text
Shop
Join My Team
TikTok/Live
Facebook/VIP
Trade Board
```

- [ ] **Step 6: Run homepage tests**

```bash
npm exec vitest run tests/amethyst-homepage-template.test.ts tests/mile-high-fizz-public-site.test.ts
```

Expected: homepage order, brand contract, nav, and source-content expectations pass.

- [ ] **Step 7: Commit**

```bash
git add app components lib/amethyst/homepage-template-data.ts lib/amethyst/preview-template-data.ts tests/amethyst-homepage-template.test.ts tests/mile-high-fizz-public-site.test.ts
git commit -m "feat: build Mile High Fizz hybrid homepage"
```

---

### Task 5: Branded Standard Trade Board Page

**Files:**
- Modify: Trade Board public renderer under `app` or `components`.
- Modify: `lib/amethyst/trade-template-data.ts`
- Test: `tests/amethyst-trade-template.test.ts`
- Test: `tests/amethyst-trade-board-route.test.ts`

- [ ] **Step 1: Keep Trade Board behavior standard**

Verify no new Mile High Fizz trade tables, routes, or tool forks are added. The page must use existing rep-scoped:

```text
trade_listings
trade_requests
Trade Board refresh API
trade request submission API
```

- [ ] **Step 2: Apply Mile High Fizz presentation**

Style the standard Trade Board page with Mile High Fizz:

```text
colors
background feel
typography feel
CTA language where tenant-safe
header/nav/ticker
```

- [ ] **Step 3: Preserve current Trade Board UX**

Do not change:

```text
listing grid behavior
filters/search
request flow
trade request screenshot support
rep ownership checks
hydration/API refresh behavior
```

- [ ] **Step 4: Run Trade Board tests**

```bash
npm exec vitest run tests/amethyst-trade-template.test.ts tests/amethyst-trade-board-route.test.ts
```

Expected: standard Trade Board behavior passes with Mile High Fizz rep context and branding.

- [ ] **Step 5: Commit**

```bash
git add app components lib/amethyst/trade-template-data.ts tests/amethyst-trade-template.test.ts tests/amethyst-trade-board-route.test.ts
git commit -m "feat: brand Mile High Fizz trade board"
```

---

### Task 6: Join My Team Recreation

**Files:**
- Create or modify: Mile High Fizz Join page renderer under `app` or `components`.
- Create or modify: `lib/amethyst/join-template-data.ts`
- Test: `tests/amethyst-join-template.test.ts`
- Test: `tests/mile-high-fizz-public-site.test.ts`

- [ ] **Step 1: Recreate source page content**

Build Join My Team as an internal Sparkle Suite page that closely preserves:

```text
headings
body copy
CTA labels
visual hierarchy
images/backgrounds
Lindsey/Mile High Fizz language
links/forms from the current source site
```

- [ ] **Step 2: Preserve external join behavior**

If the current source Join page sends people to an external Bomb Party/team/signup URL, keep that final CTA target. Do not invent a Sparkle Suite recruiting flow unless the current app already has one that matches Lindsey's process.

- [ ] **Step 3: Apply Mile High Fizz site shell**

Use the same public header, announcement ticker, footer, and brand styling as the homepage.

- [ ] **Step 4: Run Join page tests**

```bash
npm exec vitest run tests/amethyst-join-template.test.ts tests/mile-high-fizz-public-site.test.ts
```

Expected: Join route renders, Diamonds/Unicorns and FAQ remain absent, and Join source content expectations pass.

- [ ] **Step 5: Commit**

```bash
git add app components lib/amethyst/join-template-data.ts tests/amethyst-join-template.test.ts tests/mile-high-fizz-public-site.test.ts
git commit -m "feat: recreate Mile High Fizz join page"
```

---

### Task 7: Public Routing And API Context

**Files:**
- Modify: `lib/amethyst/preview-rep.ts`
- Modify: `lib/amethyst/request-rep-target.ts`
- Modify: relevant public route files under `app`
- Test: `tests/amethyst-preview-rep.test.ts`
- Test: `tests/public-site-slug-route.test.ts`
- Test: `tests/amethyst-trade-board-route.test.ts`

- [ ] **Step 1: Verify route set**

Expected preview/staging routes:

```text
/milehighfizz
/milehighfizz/trade
/milehighfizz/join
```

Expected future domain routes after approval:

```text
https://milehighfizz.com/
https://milehighfizz.com/trade
https://milehighfizz.com/join
```

- [ ] **Step 2: Preserve public context through refreshes**

All client-side API calls must carry enough context to keep Lindsey's rep target:

```text
Trade Board refresh
trade request submit
announcement/signup/join audience routes
unsubscribe
calendar refresh
live queue refresh
```

- [ ] **Step 3: Fail closed on missing rep context**

If a Mile High Fizz route cannot resolve Lindsey's rep, it must not silently show demo/default inventory or another rep's data.

- [ ] **Step 4: Run routing tests**

```bash
npm exec vitest run tests/amethyst-preview-rep.test.ts tests/public-site-slug-route.test.ts tests/amethyst-trade-board-route.test.ts
```

Expected: slug/custom-domain/referrer/context resolution passes.

- [ ] **Step 5: Commit**

```bash
git add lib/amethyst/preview-rep.ts lib/amethyst/request-rep-target.ts app tests/amethyst-preview-rep.test.ts tests/public-site-slug-route.test.ts tests/amethyst-trade-board-route.test.ts
git commit -m "fix: preserve Mile High Fizz public context"
```

---

### Task 8: Visual QA And Responsive Polish

**Files:**
- Modify: CSS/template/component files touched in Tasks 4-6.
- Optional test: Playwright visual smoke if the repo has existing screenshot tests.

- [ ] **Step 1: Start local app**

```bash
npm run dev
```

Expected: local server starts on available port.

- [ ] **Step 2: Capture desktop and mobile screenshots**

Use Playwright to inspect:

```text
/milehighfizz
/milehighfizz/trade
/milehighfizz/join
```

Viewports:

```text
1440x1000
1280x800
390x844
```

- [ ] **Step 3: Check visual acceptance**

Pass criteria:

```text
first impression is Mile High Fizz, not generic Sparkle Suite
hero is recognizable against current milehighfizz.com
header/ticker use Sparkle Suite standard pattern
live queue/calendar/trade board still look usable and standard
Join page looks like the current Join page, adapted into Suite shell
no FAQ or Diamonds/Unicorns visible
no text overlap
no card-in-card clutter
no excessive blank side gaps at 100% desktop zoom
mobile nav is usable
```

- [ ] **Step 4: Fix only visual defects**

Keep changes scoped to layout/styling/template data. Do not rewrite services during visual QA.

- [ ] **Step 5: Commit**

```bash
git add app components lib/amethyst
git commit -m "fix: polish Mile High Fizz responsive public site"
```

---

### Task 9: Workspace/Nic-Nac Regression

**Files:**
- Modify only if tests reveal a bug: `lib/nic-nac`
- Modify only if tests reveal a bug: `lib/services/site-settings.ts`
- Test: existing Nic-Nac/site settings/required setup tests.

- [ ] **Step 1: Verify Lindsey workspace remains standard**

Smoke:

```text
dashboard loads
site settings loads
calendar loads
Trade Board workspace loads
Nic-Nac loads
no required setup loop
```

- [ ] **Step 2: Verify Nic-Nac editable fields**

Using reviewer/synthetic session where possible, verify Nic-Nac can update:

```text
announcement text
shop link
TikTok/live link
Facebook/VIP link
hero/about copy if exposed
brand colors/images if exposed
```

- [ ] **Step 3: Verify protected structure**

Confirm Nic-Nac cannot accidentally:

```text
remove Join page
restore FAQ
restore Diamonds/Unicorns
switch Mile High Fizz to a generic public template
break Trade Board route
```

- [ ] **Step 4: Run focused tests**

```bash
npm exec vitest run tests/nic-nac-required-setup-client.test.ts tests/nic-nac-site-settings.test.ts tests/self-serve-required-setup.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit if fixes were needed**

```bash
git add lib/nic-nac lib/services/site-settings.ts tests/nic-nac-site-settings.test.ts tests/nic-nac-required-setup-client.test.ts tests/self-serve-required-setup.test.ts
git commit -m "fix: protect Mile High Fizz structure in Nic-Nac settings"
```

---

### Task 10: Build, Deploy, Stable Demo, And Review

**Files:**
- No code changes expected unless verification finds defects.

- [ ] **Step 1: Run focused tests**

```bash
npm exec vitest run tests/mile-high-fizz-public-site.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts tests/amethyst-trade-board-route.test.ts tests/nic-nac-site-settings.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run full build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 3: Deploy to Vercel**

```bash
npx vercel --prod
```

Expected: Vercel deployment is ready.

- [ ] **Step 4: Promote stable demo alias**

Point `https://sparkle-suite-demo.vercel.app` to the intended deployment before telling Louis it is ready to review.

- [ ] **Step 5: Smoke stable demo**

Use `sparkle-suite-demo-smoke` and reviewer/synthetic sessions. Verify:

```text
https://sparkle-suite-demo.vercel.app/milehighfizz
https://sparkle-suite-demo.vercel.app/milehighfizz/trade
https://sparkle-suite-demo.vercel.app/milehighfizz/join
```

Pass criteria:

```text
Mile High Fizz visual identity is obvious
hero is close to current source site
Trade Board uses standard functionality and Lindsey context
live queue uses Lindsey's current queue data
calendar renders through standard Sparkle Suite component
announcement ticker uses managed text
Join page recreated closely
FAQ and Diamonds/Unicorns are gone
workspace remains standard Sparkle Suite
Nic-Nac can edit normal settings
```

- [ ] **Step 6: Commit any smoke fixes**

If fixes are required:

```bash
git add <changed-files>
git commit -m "fix: address Mile High Fizz review smoke"
```

- [ ] **Step 7: Push**

```bash
git push
```

Expected: branch is pushed with all migration commits.

---

### Task 11: Louis Review And Domain Cutover Gate

**Files:**
- Update: binder `vault/session-log.md`
- Update: binder `vault/project-state.md`
- Update: binder `vault/open-items.md`

- [ ] **Step 1: Give Louis review URLs**

Provide:

```text
stable demo homepage
stable demo Trade Board
stable demo Join My Team
current live milehighfizz.com for comparison
```

- [ ] **Step 2: Collect review feedback**

Do not move DNS during review. Categorize feedback as:

```text
must-fix-before-domain
nice-to-fix-after-domain
content Lindsey can edit later
```

- [ ] **Step 3: Cutover only after explicit approval**

Do not attach/move `milehighfizz.com` unless Louis explicitly says to cut over the domain.

- [ ] **Step 4: After cutover, smoke production domain**

Verify:

```text
https://milehighfizz.com/
https://milehighfizz.com/trade
https://milehighfizz.com/join
```

No Sparkle demo/default content should appear.

- [ ] **Step 5: Update memory and handoff**

Record:

```text
final deployment URL
stable demo target
domain status
Lindsey rep id
live queue status
known remaining content edits
```

---

## Acceptance Criteria

- The public site feels like Mile High Fizz first.
- Sparkle Suite mechanics remain standard under the surface.
- Hero closely recreates current `milehighfizz.com`, with Sparkle Suite header/ticker pattern.
- Homepage order is hero, live queue, calendar, About, CTAs.
- About content preserves as much current wording/content as practical.
- Trade Board is a standard Sparkle Suite Trade Board on its own Mile High Fizz-branded page.
- Join My Team is recreated inside Sparkle Suite as close as possible visually and content-wise.
- Diamonds/Unicorns and FAQ are removed from phase one.
- Announcement ticker uses Sparkle Suite-managed text.
- Lindsey's workspace remains standard Sparkle Suite.
- Nic-Nac can edit normal content/settings and cannot accidentally remove protected custom structure.
- Lindsey's current live queue data is preserved.
- No DNS/domain cutover happens without Louis's explicit approval.

## Risks And Guardrails

- Do not treat this as a generic skin preset.
- Do not fork Trade Board, calendar, live queue, or Nic-Nac behavior for Mile High Fizz.
- Do not create duplicate Lindsey rep records.
- Do not silently show demo/default rep data if Mile High Fizz context is missing.
- Do not touch Chrome extension/live queue protected files.
- Avoid copying private or inaccessible source assets unless Louis provides them; use public live-site assets first.
- Keep the original live site active until Louis approves the Sparkle Suite version.

## Self-Review

- Spec coverage: Covers source-of-truth audit, custom public presentation, hero, live queue, calendar, About, CTAs, Trade Board, Join page, removed pages, Nic-Nac editability, protected structure, workspace behavior, stable demo review, and DNS gate.
- Placeholder scan: No `TBD`, `TODO`, or vague implementation-only placeholders remain.
- Type consistency: Uses the same terms throughout: `mile_high_fizz_hybrid`, Mile High Fizz, Lindsey, Trade Board, live queue, calendar, Join My Team, protected structure, editable content.
