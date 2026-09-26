# Sparkle Finder Silver Auth Membership Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> Superseded on 2026-06-13 for shop/affiliate verification steps. Current Sparkle Finder beta launch should verify `/photo-setup`, and `/shop` plus `/affiliate-disclosure` should remain removed/404.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fixture-only preview access with a real account, Silver trial, entitlement, consent, billing, and rep-included membership foundation for Sparkle Finder.

**Architecture:** Keep one account per person. Model Silver as an entitlement/access state (`silver_trial`, `silver_paid`, `silver_rep_included`, `free`) instead of a separate account type, and calculate access through a single service boundary used by routes/components. Use Supabase Auth/Postgres for identity and customer-owned state, Stripe for paid Silver billing, and a Sparkle Suite rep-link adapter for included rep Silver access.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase Auth/Postgres/RLS with `@supabase/ssr`, Stripe Checkout/Billing, Vitest, Playwright smoke tests, Sparkle Suite fixture adapters until production Sparkle Suite data sync is wired.

---

## Source Decisions

Build from these locked decisions:

- `docs/decisions/2026-05-31-silver-membership-and-rep-identity.md`
- `docs/decisions/current-assumptions.md`
- `docs/business/2026-05-29-business-plan-and-revenue-model.md`
- `docs/research/monetization-concepts.md`

Key rules:

- New users start with a 45-day Silver trial.
- Trial users downgrade to Free if they do not pay or qualify for rep-included Silver.
- Paid Silver target price is `$4.99/month`.
- Active Sparkle Suite reps receive included Silver through a Silver Membership Billing Credit or equivalent entitlement.
- Rep data connects automatically from Sparkle Suite, not through a billing-credit code.
- Reps use one unified account/profile experience with normal Silver access plus visible rep identity.
- Phone numbers may be collected for identity, recovery, verification, trial abuse prevention, and security notices.
- Phone numbers do not imply marketing SMS consent.
- Promotional email and promotional SMS consent are separate optional opt-ins.
- Sparkle Finder does not sell customer personal information.

## Current State To Preserve

The repo currently has fixture-backed local preview auth in:

- `lib/sparkle-finder/auth.ts`
- `app/auth/sign-in/page.tsx`
- `app/auth/preview/[mode]/route.ts`
- `app/(hub)/layout.tsx`
- `app/(hub)/silver/page.tsx`

The existing local preview route can remain as a development fallback while real auth is introduced, but public copy should shift away from "preview account" once real auth screens are available.

Do not disturb the untracked `public/sparkle-finder-smoke-test.html`.

## External Docs Checked

Before implementation, re-check current docs because Supabase and Stripe change:

- Supabase SSR guide: `https://supabase.com/docs/guides/auth/server-side`
- Supabase Next.js user management/Auth guide: `https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs`
- Supabase changelog: `https://supabase.com/changelog`
- Stripe subscription/trial docs: `https://docs.stripe.com/billing/subscriptions/trials`
- Stripe Checkout subscription docs: `https://docs.stripe.com/payments/checkout`

Important implementation notes from current Supabase docs:

- Use `@supabase/ssr` for cookie-based SSR auth.
- Prefer PKCE/server-side flows.
- Protect pages with server-verified user data; do not trust spoofable client session state.
- Do not use user-editable `user_metadata` for authorization decisions.
- Enable RLS on exposed tables and write policies intentionally.

## File Map

Create or modify these units:

- `lib/sparkle-finder/membership.ts`: pure entitlement calculation from account, trial, subscription, and rep-link state.
- `lib/sparkle-finder/account-types.ts`: account, membership, consent, rep-link TypeScript types.
- `lib/sparkle-finder/account-service.ts`: server-facing service API for the current account.
- `lib/sparkle-finder/auth.ts`: keep compatibility wrapper while moving real behavior to account service.
- `lib/supabase/client.ts`: browser Supabase client.
- `lib/supabase/server.ts`: server Supabase client.
- `proxy.ts`: Supabase SSR token refresh/proxy for Next.js 16.
- `app/auth/sign-up/page.tsx`: real account signup form.
- `app/auth/sign-in/page.tsx`: real sign-in page, with local preview links hidden behind development mode.
- `app/auth/confirm/route.ts`: Supabase email confirmation endpoint.
- `app/account/page.tsx`: account, trial, consent, phone, and billing status page.
- `app/account/actions.ts`: server actions for consent, phone updates, and profile basics.
- `app/billing/checkout/route.ts`: creates Stripe Checkout Session for paid Silver.
- `app/billing/portal/route.ts`: opens Stripe Billing Portal.
- `app/api/stripe/webhook/route.ts`: updates membership from Stripe webhooks.
- `components/account/SignupForm.tsx`: email, phone, display name, and consent UI.
- `components/account/AccountPreferences.tsx`: communication consent and phone/account controls.
- `components/account/SilverStatusPanel.tsx`: current Silver state, trial countdown, downgrade/upgrade CTA.
- `components/account/RepBadge.tsx`: visible rep identity marker.
- `supabase/migrations/[cli-generated-timestamp]_sparkle_finder_accounts.sql`: tables, constraints, RLS, functions/triggers.
- `tests/sparkle-finder/membership.test.ts`: pure membership tests.
- `tests/sparkle-finder/account-service.test.ts`: account state mapping tests.
- `tests/sparkle-finder/auth-routes.test.ts`: route rendering and gating tests.
- `tests/smoke/sparkle-finder-home.spec.ts`: update auth smoke to real signup/sign-in boundaries.

## Data Model

Create these tables in Supabase. Names are intentionally explicit so future agents do not collapse customer and rep concepts incorrectly.

### `sparkle_finder_profiles`

One row per Supabase auth user.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `display_name text not null`
- `email text not null`
- `phone_e164 text`
- `phone_verified_at timestamptz`
- `state text`
- `tiktok_handle text`
- `bio text default '' not null`
- `profile_visibility text not null default 'private' check (profile_visibility in ('private','sparkle_finder'))`
- `is_rep boolean not null default false`
- `sparkle_suite_rep_id text unique`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `sparkle_finder_memberships`

One row per user, recording why they do or do not currently have Silver.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `access_state text not null check (access_state in ('silver_trial','silver_paid','silver_rep_included','free'))`
- `silver_source text not null check (silver_source in ('trial','stripe','sparkle_suite_rep','manual','none'))`
- `trial_started_at timestamptz`
- `trial_ends_at timestamptz`
- `silver_started_at timestamptz`
- `silver_ends_at timestamptz`
- `stripe_customer_id text unique`
- `stripe_subscription_id text unique`
- `rep_credit_code text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `sparkle_finder_communication_consents`

Separate consent from account identity.

Columns:

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `account_email_required boolean not null default true`
- `account_sms_allowed boolean not null default false`
- `promotional_email_opt_in boolean not null default false`
- `promotional_email_consented_at timestamptz`
- `promotional_sms_opt_in boolean not null default false`
- `promotional_sms_consented_at timestamptz`
- `privacy_acknowledged_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `sparkle_finder_collection_items`

Move fixture collection state toward user-owned persistence.

Columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `jewelry_item_id text not null`
- `state text not null check (state in ('owned','wishlist','private_note_only'))`
- `note text default '' not null`
- `is_highlighted boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### RLS Policy Shape

Every public schema table must enable RLS.

Policies:

- Users can `select`, `insert`, and `update` their own `sparkle_finder_profiles` row.
- Users can `select` and `update` their own `sparkle_finder_memberships` row only for non-billing local fields if needed; Stripe/rep updates should use server-only service role code.
- Users can `select` and `update` their own `sparkle_finder_communication_consents` row.
- Users can `select`, `insert`, `update`, and `delete` their own `sparkle_finder_collection_items`.
- Public rep discovery should use a later security-invoker view or server service, not broad table access.

## Task Plan

### Task 1: Lock Membership And Consent Types

**Files:**

- Create: `lib/sparkle-finder/account-types.ts`
- Create: `lib/sparkle-finder/membership.ts`
- Test: `tests/sparkle-finder/membership.test.ts`

- [ ] Add failing tests for 45-day trial access.

```ts
expect(getSilverAccessState({
  accessState: "silver_trial",
  trialEndsAt: "2026-07-15T00:00:00.000Z",
  now: "2026-06-15T00:00:00.000Z",
}).hasSilverAccess).toBe(true);
```

- [ ] Add failing tests for expired trial downgrade.

```ts
expect(getSilverAccessState({
  accessState: "silver_trial",
  trialEndsAt: "2026-07-15T00:00:00.000Z",
  now: "2026-07-16T00:00:00.000Z",
}).effectiveState).toBe("free");
```

- [ ] Add failing tests for paid and rep-included Silver.

```ts
expect(getSilverAccessState({ accessState: "silver_paid", now: "2026-06-15T00:00:00.000Z" }).hasSilverAccess).toBe(true);
expect(getSilverAccessState({ accessState: "silver_rep_included", now: "2026-06-15T00:00:00.000Z" }).hasSilverAccess).toBe(true);
```

- [ ] Implement the minimal pure TypeScript types and `getSilverAccessState`.
- [ ] Run `npm run test -- tests/sparkle-finder/membership.test.ts`.
- [ ] Commit with `feat: model sparkle finder silver access states`.

### Task 2: Add Supabase Schema And RLS

**Files:**

- Create: `supabase/migrations/[cli-generated-timestamp]_sparkle_finder_accounts.sql`
- Test: `tests/sparkle-finder/membership.test.ts`

- [ ] Run `supabase --help` and `supabase migration --help` to confirm CLI syntax.
- [ ] Create the migration with `supabase migration new sparkle_finder_accounts`.
- [ ] Add the four tables from the Data Model section.
- [ ] Add `updated_at` trigger function in a private or controlled location.
- [ ] Enable RLS on every new table.
- [ ] Add policies listed in the RLS Policy Shape section.
- [ ] Add a trigger that creates a profile, membership, and consent row when an auth user is created. The membership row should set `access_state='silver_trial'`, `silver_source='trial'`, `trial_started_at=now()`, and `trial_ends_at=now() + interval '45 days'`.
- [ ] Run `supabase migration list --local`.
- [ ] If a local database is available, run the migration and verify `select`/`insert` behavior with an authenticated test user.
- [ ] Commit with `feat: add sparkle finder account schema`.

### Task 3: Add Supabase SSR Auth Boundary

**Files:**

- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `proxy.ts`
- Modify: `lib/sparkle-finder/auth.ts`
- Test: `tests/sparkle-finder/auth-routes.test.ts`

- [ ] Confirm current Supabase SSR docs before coding.
- [ ] Add browser and server client helpers using `@supabase/ssr`.
- [ ] Add `proxy.ts` to refresh auth cookies for routes that need account state.
- [ ] Keep local preview auth available only when `NODE_ENV !== "production"` or a dedicated preview env flag is set.
- [ ] Add tests that anonymous users still see the sign-in wall for hub routes.
- [ ] Add tests that the account service returns anonymous state when Supabase env vars are absent.
- [ ] Run `npm run test -- tests/sparkle-finder/auth-routes.test.ts`.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: add supabase auth boundary`.

### Task 4: Build Real Signup And Sign-In UX

**Files:**

- Create: `components/account/SignupForm.tsx`
- Create: `app/auth/sign-up/page.tsx`
- Modify: `app/auth/sign-in/page.tsx`
- Create: `app/auth/confirm/route.ts`
- Test: `tests/sparkle-finder/auth-routes.test.ts`

- [ ] Build signup fields: display name, email, phone, state, password or magic-link choice, privacy acknowledgement, optional promotional email checkbox, optional promotional SMS checkbox.
- [ ] Show nearby phone copy: "Used for account verification, recovery, and trial protection. Not sold. Marketing texts are optional."
- [ ] Keep promotional SMS unchecked by default.
- [ ] Create the email confirmation route with Supabase token hash exchange.
- [ ] Update sign-in page copy away from local preview as the primary path.
- [ ] Keep local preview controls in a development-only panel.
- [ ] Test that signup copy includes phone/privacy language.
- [ ] Test that promotional SMS is not preselected in rendered markup.
- [ ] Run `npm run test -- tests/sparkle-finder/auth-routes.test.ts`.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: add sparkle finder signup flow`.

### Task 5: Add Account Service And Replace Hardcoded Silver Preview

**Files:**

- Create: `lib/sparkle-finder/account-service.ts`
- Modify: `app/page.tsx`
- Modify: `app/(hub)/layout.tsx`
- Modify: `app/(hub)/silver/page.tsx`
- Modify: `components/layout/SparkleFinderNav.tsx`
- Test: `tests/sparkle-finder/account-service.test.ts`

- [ ] Implement `getCurrentSparkleFinderAccount()` as the single server-side account lookup.
- [ ] Map Supabase profile, membership, consent, and rep-link fields into the existing `SparkleFinderAccountState` shape plus new membership details.
- [ ] Replace hardcoded `customer-silver-sparkle-mama` homepage rendering with current signed-in account data when available.
- [ ] Preserve fixture/demo rendering only on the public homepage for anonymous visitors; authenticated hub and Silver routes must use the current account service.
- [ ] Show nav status as Trial Silver, Silver, Rep Silver, Free, or Guest.
- [ ] Test trial, paid, rep-included, expired-trial, and anonymous account mapping.
- [ ] Run `npm run test -- tests/sparkle-finder/account-service.test.ts`.
- [ ] Run `npm run test`.
- [ ] Commit with `feat: use real account state for silver access`.

### Task 6: Add Account Page, Trial Countdown, And Consent Controls

**Files:**

- Create: `app/account/page.tsx`
- Create: `app/account/actions.ts`
- Create: `components/account/SilverStatusPanel.tsx`
- Create: `components/account/AccountPreferences.tsx`
- Test: `tests/sparkle-finder/auth-routes.test.ts`

- [ ] Show current access state and trial end date.
- [ ] Show "45-day Silver trial" countdown when `effectiveState='silver_trial'`.
- [ ] Show upgrade CTA when trial is nearing expiration or has downgraded to Free.
- [ ] Add consent controls for promotional email and promotional SMS.
- [ ] Add phone update UI with clear privacy copy.
- [ ] Store consent timestamps when a user opts in.
- [ ] Clear promotional consent timestamp when a user opts out while retaining an audit field if a later compliance plan adds one.
- [ ] Test account page renders privacy/consent labels.
- [ ] Test Free users see upgrade CTA after expired trial mapping.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: add account and consent controls`.

### Task 7: Add Stripe Paid Silver

**Files:**

- Create: `app/billing/checkout/route.ts`
- Create: `app/billing/portal/route.ts`
- Create: `app/api/stripe/webhook/route.ts`
- Create: `lib/sparkle-finder/billing.ts`
- Modify: `components/account/SilverStatusPanel.tsx`
- Test: `tests/sparkle-finder/billing.test.ts`

- [ ] Confirm current Stripe Checkout and Billing docs before coding.
- [ ] Add env vars to `.env.example` if present, otherwise document in plan notes: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_SILVER_PRICE_ID`, `NEXT_PUBLIC_SITE_URL`.
- [ ] Create Checkout Session for subscription mode using the configured `$4.99/month` price.
- [ ] Do not create a second 45-day Stripe trial for users who already consumed the Sparkle Finder trial unless Louis explicitly approves.
- [ ] Create Billing Portal route for subscription management.
- [ ] Handle Stripe webhooks for checkout completed, subscription updated, subscription deleted, invoice paid, and invoice payment failed.
- [ ] Update `sparkle_finder_memberships` to `silver_paid` when subscription is active.
- [ ] Downgrade to `free` at subscription end if no rep-included entitlement is active.
- [ ] Test webhook mapping with signed fixture events.
- [ ] Run `npm run test -- tests/sparkle-finder/billing.test.ts`.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: add paid silver billing`.

### Task 8: Add Sparkle Suite Rep-Included Silver Adapter

**Files:**

- Create: `lib/sparkle-finder/rep-entitlements.ts`
- Create: `components/account/RepBadge.tsx`
- Modify: `lib/sparkle-finder/account-service.ts`
- Modify: `components/silver/SilverCollectorSpace.tsx`
- Test: `tests/sparkle-finder/account-service.test.ts`

- [ ] Add adapter shape for active Sparkle Suite rep status: `sparkleSuiteRepId`, `businessName`, `subscriptionStatus`, `publicDiscoveryEnabled`.
- [ ] Back the first adapter with fixture data in `lib/fixtures/sparkle-finder-fixtures.ts`, then add a separate integration task later when Sparkle Suite core read-through access is approved.
- [ ] If `subscriptionStatus='active'`, map membership to `silver_rep_included`.
- [ ] Show rep identity marker on profile/account surfaces.
- [ ] Confirm profile UX uses one account/profile experience, not a split customer-versus-rep account.
- [ ] Do not require the rep billing credit code to connect rep data.
- [ ] Test active rep gets Silver and rep badge.
- [ ] Test inactive rep without paid Silver falls back to Free or trial state based on membership dates.
- [ ] Run `npm run test`.
- [ ] Commit with `feat: add rep included silver entitlement`.

### Task 9: Persist Silver Profile And Collection State

**Files:**

- Modify: `lib/sparkle-finder/customer-state.ts`
- Modify: `components/silver/ProfileEditor.tsx`
- Modify: `components/silver/CollectionManager.tsx`
- Modify: `app/(hub)/silver/page.tsx`
- Test: `tests/sparkle-finder/entitlements.test.ts`

- [ ] Replace local preview state saves with Supabase-backed server actions.
- [ ] Keep Silver-only write gates using `hasSilverAccess`.
- [ ] Allow Free users to view limited account/profile state according to the already locked Free-versus-Silver split.
- [ ] Persist collection states: owned, wishlist, private note only, highlighted.
- [ ] Preserve existing fixture behavior only for development fallback.
- [ ] Test Silver trial, paid Silver, and rep-included Silver can save profile/collection.
- [ ] Test Free cannot save Silver-only profile/collection actions.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Commit with `feat: persist silver profile and collection`.

### Task 10: Trial Expiration And Notification Scaffold

**Files:**

- Create: `lib/sparkle-finder/trial-notifications.ts`
- Create: `tests/sparkle-finder/trial-notifications.test.ts`
- Modify: `docs/research/open-questions.md`

- [ ] Add pure helper to compute notification milestones: 7 days before, 3 days before, 1 day before, day of expiration, and downgrade confirmation.
- [ ] Keep actual email sending behind an adapter; do not send SMS for launch.
- [ ] Add test cases for each milestone.
- [ ] Add account page notices for upcoming expiration.
- [ ] Document that email is first alert channel and SMS waits for explicit consent/cost controls.
- [ ] Run `npm run test -- tests/sparkle-finder/trial-notifications.test.ts`.
- [ ] Commit with `feat: scaffold silver trial notifications`.

### Task 11: Update Smoke Tests And Deployment Checks

**Files:**

- Modify: `tests/smoke/sparkle-finder-home.spec.ts`
- Modify: `tests/sparkle-finder/routes.test.ts`
- Modify: `scripts/smoke-sparkle-finder.ts`
- Create: `verification/sparkle-finder/silver-auth-smoke-report.md`

- [ ] Update smoke tests to verify the new shop card remains present.
- [ ] Update smoke tests to verify account/signup routes show 45-day Silver trial copy.
- [ ] Verify phone privacy copy appears on signup/account screens.
- [ ] Verify promotional SMS checkbox is unchecked by default.
- [ ] Verify hub routes still gate anonymous users.
- [ ] Verify a development Silver account can access Silver routes.
- [ ] Run `npm run lint`.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run smoke:sparkle-finder`.
- [ ] Commit with `test: update sparkle finder silver auth smoke`.

### Task 12: Production Rollout

**Files:**

- Create: `docs/deployments/sparkle-finder-silver-auth-env-vars.md`
- Create: `docs/handoffs/2026-05-31-sparkle-finder-silver-auth-rollout.md`

- [ ] Add required Vercel env vars for Supabase and Stripe.
- [ ] Apply Supabase migration to the linked project.
- [ ] Configure Supabase Auth email template for SSR confirmation.
- [ ] Configure Stripe webhook endpoint for production.
- [ ] Deploy with `npx vercel --prod --yes`.
- [ ] Inspect live `/auth/sign-up`, `/auth/sign-in`, `/account`, `/shop`, and `/silver`.
- [ ] Confirm no affiliate links or exact products were accidentally introduced.
- [ ] Confirm no customer-to-customer trading or marketplace copy was introduced.
- [ ] Write rollout handoff with deployment URL, commands, env vars configured, and remaining credential dependencies.
- [ ] Commit with `docs: record sparkle finder silver auth rollout`.

## Known Credential And Product Gates

These may block full production behavior and should be surfaced before execution:

- Supabase project URL and publishable key must be configured in Vercel.
- Supabase migrations require project access.
- Phone verification requires a chosen SMS/phone auth provider and explicit consent copy; do not fake production verification.
- Stripe product/price ID for `$4.99/month` Silver must exist before paid checkout works.
- Stripe webhook secret must be configured before webhook verification works.
- Sparkle Suite rep data sync needs either existing data access or a fixture-backed adapter until Sparkle Suite core integration is approved.

## Self-Review Notes

Spec coverage:

- 45-day default Silver trial: Tasks 1, 2, 4, 5, 6, 10, 11.
- Free downgrade: Tasks 1, 2, 5, 6, 10.
- Paid `$4.99/month` Silver: Task 7.
- Sparkle Suite rep included Silver: Task 8.
- Unified rep/customer identity: Tasks 5, 8, 9.
- Phone privacy and consent: Tasks 2, 4, 6, 11.
- Real auth replacing preview behavior: Tasks 3, 4, 5.
- Existing shop/Diamonds changes preserved: Task 11 and rollout checks.

Execution recommendation:

- Use subagent-driven development.
- Run one task at a time.
- Commit after every passing task.
- Keep local preview auth until real auth smoke passes, then hide it from production.
