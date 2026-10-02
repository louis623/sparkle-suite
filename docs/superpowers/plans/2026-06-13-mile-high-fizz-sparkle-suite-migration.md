# Mile High Fizz Sparkle Suite Migration Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Mile High Fizz as a branded Sparkle Suite tenant/workspace and customer-facing site at `milehighfizz.com`, preserving Lindsey's brand and real operational data while using the standard Sparkle Suite workspace, calendar, live queue, Trade Board, support, reminders, and customer-audience systems.

**Architecture:** Mile High Fizz is not a standalone app and not a custom Trade Board fork. It should be a normal Sparkle Suite `rep_id` tenant for Lindsey Chapman, with `reps`, `site_settings`, `calendar_events`, `live_queue`, `trade_listings`, `trade_requests`, customer audience, support, and Nic-Nac data all scoped to Lindsey's existing real rep record. The public site should reuse the existing Amethyst/public customer-site system where possible, with Mile High Fizz-specific branding/content layered through tenant data and targeted assets.

**Tech Stack:** Next.js App Router, Supabase/Postgres with RLS, existing Sparkle Suite services, Amethyst public-site renderer, Nic-Nac tools, Vercel deployments, Google/Ready.ai/Readdy as source handoff only where required for assets or signup export.

---

## Locked Assumptions

- Source site is `https://milehighfizz.com/`.
- Final production domain should remain `milehighfizz.com`.
- Build and test behind Sparkle Suite preview/staging first; do not cut over the domain until smoke tests pass.
- Lindsey / `@lindze1188` is the real rep owner.
- Lindsey is already known in HQ and likely has existing Sparkle Suite/Supabase records; verify and reuse before creating anything.
- Current live queue data is real and must be preserved or connected, not discarded.
- Email/SMS signups can be transferred from Ready.ai/Readdy later when Louis is ready.
- Phase one drops current `Diamonds and Unicorn`, `FAQ`, and `Join My Team` rebuild work.
- Mile High Fizz uses the same standard Sparkle Suite Trade Board every rep uses. No custom board model, no per-show board fork.
- Do not touch Chrome Web Store settings or local Sparkle Suite Chrome extension code.

## True Open Inputs

- Ready.ai/Readdy access/export is only needed when importing non-public assets, old signup rows, or private site copy not visible on the public site.
- Final DNS/domain cutover needs Louis approval after staging smoke passes.
- If Lindsey has private brand assets that are not on the public site, those need to be handed over before final visual polish.

---

## File Structure

Likely files to modify in the active implementation repo `C:\Users\louis\sparkle-suite-repo`:

- `lib/amethyst/preview-rep.ts` - confirm/reuse public-site resolution by `public_site_slug`, `custom_domain`, and ready/paid access.
- `lib/amethyst/preview-template-data.ts` - map Lindsey/Mile High Fizz site settings into public homepage/trade content.
- `lib/amethyst/homepage-template-data.ts` - only if the existing template lacks needed Mile High Fizz fields.
- `lib/amethyst/trade-template-data.ts` - only if copy/metadata needs tenant-safe refinement.
- `lib/amethyst/public-asset-response.ts` - if canonical/domain routing needs Mile High Fizz-specific path support.
- `lib/amethyst/host-routing.ts` - add/verify `milehighfizz.com` domain candidate behavior if current helpers do not cover it.
- `lib/services/site-settings.ts` - ensure the Control Center can save all Mile High Fizz branding/social/shop fields.
- `lib/services/calendar.ts` - reuse existing event/show service; add tests only if Mile High Fizz exposes a missed timezone/show case.
- `lib/services/live-queue.ts` - preserve/connect Lindsey's existing live queue sync code and data.
- `lib/services/trade-board.ts` - no product fork; only touch if smoke finds a standard rep-scoped Trade Board issue.
- `lib/prelaunch/client-account.ts` or a new migration/seed helper - attach Lindsey's existing real rep record to the launch/public-site state without duplication.
- `tests/amethyst-preview-rep.test.ts` - cover `milehighfizz.com`, slug, paid/ready gating, and no duplicate fallback.
- `tests/amethyst-preview-template-data.test.ts` - cover Mile High Fizz branding, social links, shop/watch links, and phase-one page suppression.
- `tests/amethyst-trade-board-route.test.ts` and `tests/amethyst-trade-template.test.ts` - ensure Lindsey sees standard rep-scoped Trade Board data.
- `tests/live-queue-party-filter.test.ts` or `tests/live-show-smoke.test.ts` - ensure Lindsey's live queue remains scoped and visible.
- `tests/public-site-slug-route.test.ts` - cover final public route behavior for `milehighfizz.com`.
- `docs/superpowers/plans/2026-06-13-mile-high-fizz-sparkle-suite-migration.md` - this plan.

---

### Task 1: Read-Only Identity And Data Audit

**Files:**
- Read: `supabase/migrations/006_sparkle_suite_schema.sql`
- Read: `supabase/migrations/005_live_queue.sql`
- Read: `supabase/migrations/20260605210000_ss_public_site_slug.sql`
- Read: `supabase/migrations/044_ss_nic_nac_show_sessions.sql`
- Read: `lib/amethyst/preview-rep.ts`
- Read: `lib/services/live-queue.ts`
- Read: `lib/services/calendar.ts`
- Read: `lib/services/trade-board.ts`

- [ ] **Step 1: Verify Lindsey's existing records before writing anything**

Run a read-only Supabase query for likely Lindsey identifiers:

```sql
select id, auth_user_id, email, display_name, business_name, custom_domain, public_site_slug, shop_link, streaming_links
from public.reps
where lower(email) in ('lindseychapman1188@gmail.com')
   or lower(display_name) like '%lindsey%'
   or lower(business_name) like '%mile high fizz%'
   or lower(custom_domain) in ('milehighfizz.com', 'www.milehighfizz.com')
   or lower(public_site_slug) in ('milehighfizz', 'mile-high-fizz');
```

Expected: one real Lindsey/Mile High Fizz rep record or no record. If multiple real candidates exist, stop and reconcile manually before any migration write.

- [ ] **Step 2: Verify existing live queue rows**

```sql
select id, rep_id, sync_code, queue, last_updated, created_at
from public.live_queue
where rep_id = '<lindsey_rep_id>'
order by created_at asc;
```

Expected: preserve the first/active sync code and queue. Do not create a replacement queue if one exists.

- [ ] **Step 3: Verify existing event, Trade Board, support, and audience data**

```sql
select count(*) as calendar_events from public.calendar_events where rep_id = '<lindsey_rep_id>';
select count(*) as trade_listings from public.trade_listings where rep_id = '<lindsey_rep_id>';
select count(*) as customer_audience from public.customer_audience where rep_id = '<lindsey_rep_id>';
select count(*) as support_reports from public.support_reports where rep_id = '<lindsey_rep_id>';
```

Expected: counts are captured in the implementation notes. Empty counts are okay; unexpected non-empty counts become migration safety checks.

- [ ] **Step 4: Commit nothing**

This task is audit-only. Do not commit or deploy from this task.

---

### Task 2: Lindsey Tenant Attachment

**Files:**
- Modify or create a small idempotent script only if needed: `scripts/mile-high-fizz/attach-lindsey-tenant.ts`
- Test: `tests/mile-high-fizz-tenant-attachment.test.ts`

- [ ] **Step 1: Write failing tests for idempotent attachment**

Cover these cases:

```ts
it('updates an existing Lindsey rep without creating a duplicate', async () => {
  // Given a rep with Lindsey email or Mile High Fizz business name
  // expect the helper to set public_site_slug/custom_domain/site settings on that row.
})

it('does not overwrite live queue rows when Lindsey already has a sync code', async () => {
  // Given an existing live_queue row
  // expect no new row and the existing sync_code returned.
})

it('creates missing workspace support rows idempotently', async () => {
  // Given site_settings or notification preferences are missing
  // expect upsert by rep_id, not duplicate rows.
})
```

- [ ] **Step 2: Implement the attachment helper**

The helper should:

- Find Lindsey by email, business name, existing domain, or slug.
- Refuse to proceed if more than one candidate is found.
- Set `business_name = 'Mile High Fizz'`.
- Set `display_name = 'Lindsey Chapman'` unless the existing record already has a better non-placeholder value.
- Set `custom_domain = 'milehighfizz.com'`.
- Set `public_site_slug = 'milehighfizz'`.
- Set social/streaming links for TikTok `@lindze1188`, Facebook, and VIP group if already known.
- Set shop link to Lindsey's Bomb Party store if already known; otherwise preserve the current value and flag it for Ready.ai/source review.
- Upsert `site_settings` by `rep_id`.
- Ensure a `live_queue` sync code only if none exists.

- [ ] **Step 3: Run targeted tests**

Run:

```bash
npm exec vitest run tests/mile-high-fizz-tenant-attachment.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add scripts/mile-high-fizz/attach-lindsey-tenant.ts tests/mile-high-fizz-tenant-attachment.test.ts
git commit -m "feat: attach Mile High Fizz tenant safely"
```

---

### Task 3: Public Site Routing For Mile High Fizz

**Files:**
- Modify: `lib/amethyst/host-routing.ts`
- Modify: `lib/amethyst/preview-rep.ts`
- Modify: `app/amethyst/[...asset]/route.ts` if host/path routing needs adjustment
- Test: `tests/amethyst-preview-rep.test.ts`
- Test: `tests/public-site-slug-route.test.ts`

- [ ] **Step 1: Add failing tests for domain and slug resolution**

Tests must prove:

- `milehighfizz.com` resolves to Lindsey's rep row by `custom_domain`.
- `www.milehighfizz.com` resolves to the same row.
- `/amethyst/Homepage.html?c=milehighfizz` resolves by `public_site_slug` if the request supplies a slug.
- Unpaid/unready unrelated reps remain blocked.
- Lindsey can be served if she has either a paid workspace row or a ready launch build row.

- [ ] **Step 2: Implement only the missing routing behavior**

Reuse `resolveAmethystPreviewRep`, `loadRepByCustomDomain`, and `loadRepByPublicSiteSlug`. Do not add a hardcoded Lindsey bypass unless tests prove the generic routing cannot support launch safely.

- [ ] **Step 3: Run routing tests**

```bash
npm exec vitest run tests/amethyst-preview-rep.test.ts tests/public-site-slug-route.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/amethyst/host-routing.ts lib/amethyst/preview-rep.ts app/amethyst/[...asset]/route.ts tests/amethyst-preview-rep.test.ts tests/public-site-slug-route.test.ts
git commit -m "feat: route Mile High Fizz public site through Sparkle Suite"
```

---

### Task 4: Mile High Fizz Public Branding And Page Scope

**Files:**
- Modify: `lib/amethyst/preview-template-data.ts`
- Modify: `lib/amethyst/homepage-template-data.ts` only if needed
- Modify: `lib/amethyst/trade-template-data.ts` only if needed
- Test: `tests/amethyst-preview-template-data.test.ts`
- Test: `tests/amethyst-homepage-template.test.ts`
- Test: `tests/amethyst-trade-template.test.ts`

- [ ] **Step 1: Write failing tests for Mile High Fizz content**

Tests must assert:

- Business name renders as `Mile High Fizz`.
- Public rep name renders as `Lindsey`.
- TikTok link points to `@lindze1188`.
- Watch-live CTA points to Lindsey's active TikTok link when configured.
- Shop/order CTA points to Lindsey's Bomb Party store when configured.
- Homepage keeps Mile High Fizz feel: live reveals, fizz parties, magical/sparkly language.
- Trade Board page title is `Mile High Fizz - Trade Board`.
- Phase-one nav does not expose `FAQ`, `Join My Team`, or `Diamonds and Unicorn`.

- [ ] **Step 2: Implement tenant-driven content mapping**

Use `site_settings`, `reps.shop_link`, `reps.streaming_links`, and required setup draft data. Prefer data-driven fields over Lindsey-specific code. If the current template cannot hide join/FAQ links per tenant, add a tenant-safe page visibility/config option in `site_settings` or the template data layer.

- [ ] **Step 3: Run template tests**

```bash
npm exec vitest run tests/amethyst-preview-template-data.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/amethyst/preview-template-data.ts lib/amethyst/homepage-template-data.ts lib/amethyst/trade-template-data.ts tests/amethyst-preview-template-data.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts
git commit -m "feat: brand Mile High Fizz public site"
```

---

### Task 5: Standard Trade Board Integration

**Files:**
- Prefer no changes: `lib/services/trade-board.ts`
- Modify only if needed: `lib/amethyst/trade-board-listings.ts`
- Modify only if needed: `app/api/amethyst/trade-board/route.ts`
- Test: `tests/amethyst-trade-board-route.test.ts`
- Test: `tests/amethyst-trade-template.test.ts`
- Test: `tests/nic-nac/trade-board-tools.test.ts`

- [ ] **Step 1: Write tests proving no custom board fork**

Tests must assert:

- The public Mile High Fizz Trade Board reads `trade_listings` where `rep_id = Lindsey`.
- Removed listings are not public unless the existing service intentionally includes a recovery status for workspace tools.
- Customer trade requests use the same `trade_requests` route/service and preserve rep ownership.
- Nic-Nac `list_my_trade_board`, `add_listing`, `remove_listing`, `approve_trade`, and `reject_trade` work for Lindsey like every other rep.

- [ ] **Step 2: Fix only standard-service gaps**

If a test fails, fix the generic service or public adapter. Do not create `mile_high_fizz_trade_board`, `lindsey_trade_board`, or a show-specific board model.

- [ ] **Step 3: Run targeted tests**

```bash
npm exec vitest run tests/amethyst-trade-board-route.test.ts tests/amethyst-trade-template.test.ts tests/nic-nac/trade-board-tools.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit if changes were needed**

```bash
git add lib/amethyst/trade-board-listings.ts app/api/amethyst/trade-board/route.ts tests/amethyst-trade-board-route.test.ts tests/amethyst-trade-template.test.ts tests/nic-nac/trade-board-tools.test.ts
git commit -m "fix: keep Mile High Fizz on standard trade board"
```

---

### Task 6: Calendar, Live Queue, And Show Session Interop

**Files:**
- Prefer no changes: `lib/services/calendar.ts`
- Prefer no changes: `lib/services/live-queue.ts`
- Modify only if needed: `lib/nic-nac/show-sessions.ts`
- Test: `tests/nic-nac/calendar-service.test.ts`
- Test: `tests/nic-nac/calendar-tools.test.ts`
- Test: `tests/live-queue-party-filter.test.ts`
- Test: `tests/live-show-smoke.test.ts`

- [ ] **Step 1: Write Lindsey-specific regression tests using generic services**

Tests must assert:

- Lindsey's timezone is `America/Denver` unless a more exact value exists in her record.
- Upcoming shows list on the public site from `calendar_events`.
- Live shows remain visible even when `event_time` is already in progress.
- Existing `live_queue` sync code is reused.
- Show sessions can attach `calendar_event_id` and `live_queue_sync_code`.

- [ ] **Step 2: Fix any generic service gaps**

Do not add Lindsey-only calendar logic. If the calendar/public adapter misses Mile High Fizz, fix the rep-scoped adapter.

- [ ] **Step 3: Run event/queue tests**

```bash
npm exec vitest run tests/nic-nac/calendar-service.test.ts tests/nic-nac/calendar-tools.test.ts tests/live-queue-party-filter.test.ts tests/live-show-smoke.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Commit if changes were needed**

```bash
git add lib/services/calendar.ts lib/services/live-queue.ts lib/nic-nac/show-sessions.ts tests/nic-nac/calendar-service.test.ts tests/nic-nac/calendar-tools.test.ts tests/live-queue-party-filter.test.ts tests/live-show-smoke.test.ts
git commit -m "fix: verify Mile High Fizz show interop"
```

---

### Task 7: Ready.ai/Readdy Content And Signup Transfer

**Files:**
- Create if needed: `scripts/mile-high-fizz/import-ready-signups.ts`
- Test: `tests/mile-high-fizz-ready-signups.test.ts`
- Docs: `docs/handoffs/mile-high-fizz-ready-export-notes.md` or binder handoff if export is manual

- [ ] **Step 1: Wait for Louis to provide/export Ready.ai/Readdy data**

This task is intentionally blocked until export data exists. Expected import fields:

- name
- email
- phone
- email consent
- SMS consent
- source page/form
- created/submitted timestamp

- [ ] **Step 2: Write import tests**

Tests must assert:

- Imports attach to Lindsey's `rep_id`.
- Duplicate email/phone entries are merged or skipped according to the existing customer-audience rules.
- SMS consent and email consent remain separate.
- Missing phone does not block email-only rows.
- Missing email does not block SMS-only rows when phone consent exists.

- [ ] **Step 3: Implement the import helper**

Use existing customer-audience service/routes where possible. Do not write directly to tables if a service already normalizes consent and unsubscribe state.

- [ ] **Step 4: Run import tests**

```bash
npm exec vitest run tests/mile-high-fizz-ready-signups.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/mile-high-fizz/import-ready-signups.ts tests/mile-high-fizz-ready-signups.test.ts docs/handoffs/mile-high-fizz-ready-export-notes.md
git commit -m "feat: import Mile High Fizz ready signups"
```

---

### Task 8: Workspace Smoke And Public Smoke

**Files:**
- Modify only if needed: `lib/launch-readiness/live-show-smoke.ts`
- Modify only if needed: `lib/launch-readiness/multi-rep-isolation-smoke.ts`
- Test: `tests/multi-rep-isolation-smoke.test.ts`
- Test: `tests/phase-11-smoke-manifest.test.ts`

- [ ] **Step 1: Run local targeted tests**

```bash
npm exec vitest run tests/amethyst-preview-rep.test.ts tests/amethyst-preview-template-data.test.ts tests/amethyst-trade-board-route.test.ts tests/nic-nac/calendar-service.test.ts tests/live-queue-party-filter.test.ts tests/multi-rep-isolation-smoke.test.ts
```

Expected: all tests pass.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 3: Deploy preview**

```bash
npx vercel --prod
```

Expected: Vercel deployment reaches `Ready`.

- [ ] **Step 4: Smoke workspace**

Use reviewer/synthetic account paths, not Louis's personal account, unless Louis explicitly chooses otherwise. Verify:

- Lindsey can open Control Center.
- Site settings show Mile High Fizz data.
- Calendar can list/add/update/cancel a test show without touching real show data.
- Live queue sync code exists and queue snapshot reads correctly.
- Trade Board lists Lindsey-scoped pieces only.
- Nic-Nac can read calendar, live queue, and Trade Board tools for Lindsey.
- Help & Resources/support form submits against Lindsey's rep context.

- [ ] **Step 5: Smoke public site**

Verify preview/staging:

- Homepage loads with Mile High Fizz branding.
- Trade Board page loads.
- Shop/order CTA works.
- Watch-live CTA works.
- FAQ, Join My Team, and Diamonds/Unicorn pages are not promoted in phase-one navigation.
- Events/upcoming shows show Lindsey's data.
- Customer trade request flow reaches the standard Trade Board request path.

- [ ] **Step 6: Commit smoke manifest updates if needed**

```bash
git add lib/launch-readiness/live-show-smoke.ts lib/launch-readiness/multi-rep-isolation-smoke.ts tests/multi-rep-isolation-smoke.test.ts tests/phase-11-smoke-manifest.test.ts
git commit -m "test: add Mile High Fizz launch smoke coverage"
```

---

### Task 9: Domain Cutover

**Files:**
- Vercel project/domain settings
- DNS records for `milehighfizz.com`
- Docs/handoff update in binder or HQ

- [ ] **Step 1: Confirm cutover with Louis**

Do not change DNS/domain routing without explicit approval after preview smoke passes.

- [ ] **Step 2: Attach domain to Sparkle Suite deployment**

Use Vercel domain tooling to attach:

- `milehighfizz.com`
- `www.milehighfizz.com`

Expected: both route to the Sparkle Suite deployment and resolve to Lindsey's tenant by `custom_domain`.

- [ ] **Step 3: Production smoke**

Verify:

- `https://milehighfizz.com/` returns Mile High Fizz homepage.
- `https://milehighfizz.com/amethyst/Trade.html` or final equivalent returns Mile High Fizz Trade Board.
- Canonical metadata points to the Mile High Fizz domain.
- No Sparkle Suite demo/default rep content appears.
- Lindsey workspace continues to read the same `rep_id`.

- [ ] **Step 4: Update records**

Update binder/HQ handoff with:

- deployment URL
- domain status
- Lindsey rep id
- live queue sync code status
- known Ready.ai/Readdy import status
- remaining phase-two pages: FAQ, Join My Team, Diamonds/Unicorn

---

## Phase-One Acceptance Criteria

- Mile High Fizz is served as a branded Sparkle Suite public site.
- Lindsey has a normal Sparkle Suite workspace/control-center path.
- Lindsey's existing live queue data is preserved or connected.
- The public Trade Board uses standard Sparkle Suite rep-scoped Trade Board data.
- Calendar/events, live queue, show sessions, customer audience, support, reminders, and Nic-Nac tools work against Lindsey's real `rep_id`.
- `FAQ`, `Join My Team`, and `Diamonds and Unicorn` are not part of the phase-one rebuild.
- Site is smoke-tested in preview before `milehighfizz.com` cutover.
- No duplicate Lindsey rep record is created.

## Risks And Guardrails

- Lindsey is a real rep with live operational data. Avoid destructive test data writes unless using clearly marked synthetic events/listings that are cleaned up.
- The current live queue/extension flow is protected live-show material. Do not modify extension code for this migration.
- Current Mile High Fizz is the origin/prototype site. Preserve brand equity, but do not preserve old technical architecture.
- Ready.ai/Readdy may contain private assets and signups not visible publicly. Treat it as a source handoff, not a prerequisite for the architecture.
- If the generic Amethyst template cannot support Mile High Fizz polish cleanly, extend the tenant template system; do not hardcode Lindsey throughout the app.

## Self-Review

- Spec coverage: public site, workspace, Trade Board, calendar, live queue, support, customer audience, domain cutover, and Ready.ai/Readdy handoff are covered.
- Placeholder scan: no `TBD` or vague "handle edge cases" steps remain.
- Type consistency: plan uses existing names from the inspected codebase: `reps`, `site_settings`, `calendar_events`, `live_queue`, `trade_listings`, `trade_requests`, `public_site_slug`, `custom_domain`, and `rep_id`.
