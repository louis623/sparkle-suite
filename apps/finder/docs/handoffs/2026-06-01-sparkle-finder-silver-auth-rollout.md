# Sparkle Finder Silver Auth Rollout Handoff

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

Created: 2026-06-01

> Updated 2026-06-13: The `/shop` and `/affiliate-disclosure` launch guidance in this historical handoff is superseded. Sparkle Finder beta launch should use `/photo-setup` as the plain non-affiliate resource guide, keep `/shop` and `/affiliate-disclosure` removed/404, and follow `docs/deployments/2026-06-15-sparkle-finder-beta-launch-runbook.md`.

## Status

DONE_WITH_CONCERNS: implementation through Silver/auth smoke tests is in the branch, but production rollout is blocked by missing external configuration.

This handoff does not claim a production deployment. It records what is ready, what is missing, and the exact launch path once Louis supplies credentials.

## Current Branch And Site

- Branch: `codex-sparkle-finder-v1`
- Live domain: `https://yoursparklefinder.com`
- Vercel project from `.vercel/project.json`: `sparkle-finder-dev`
- Most recent implemented commit before Task 12: `758ceb5 test: assert account silver trial smoke copy`

## What Is Implemented Locally

Silver/auth/billing foundation has been built and smoke-tested locally before this rollout-docs step:

- One account per person with Silver as an entitlement state.
- New users begin with a 45-day Silver trial.
- Trial downgrade path to Free is modeled.
- Paid Silver target is `$4.99/month`.
- Sparkle Suite reps can receive included Silver through rep entitlement mapping.
- Reps use the same account/profile experience as collectors, with visible rep identity.
- Signup/sign-in/account routes exist.
- Phone/privacy/consent copy exists, with promotional SMS separated from account phone use.
- Stripe checkout, billing portal, and webhook routes are scaffolded.
- Supabase Auth/Postgres schema and RLS migration exist locally.
- Smoke coverage was updated for signup/account privacy copy and Silver trial copy.

## What Is Not Done

- Production deployment has not been run for this work.
- Remote Supabase migrations have not been applied.
- Supabase is not linked locally.
- Vercel production environment variables are absent.
- Stripe live product, price, and webhook configuration still need to be verified or created.
- Supabase Auth email templates and redirect allow-list still need to be configured in the dashboard.
- Live route inspection has not been performed for the new auth/billing behavior.

## Blockers Found

`supabase migration list --linked` failed:

```text
Cannot find project ref. Have you run supabase link?
```

`npx vercel env ls` reported no environment variables for the linked `sparkle-finder-dev` project.

These blockers prevent a responsible production rollout because auth, database writes, Stripe checkout, and Stripe webhook membership updates depend on production Supabase and Stripe configuration.

## Required Environment Variables

Add these to Vercel Production before deployment:

- `NEXT_PUBLIC_SITE_URL=https://yoursparklefinder.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SILVER_PRICE_ID`

`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` must stay server-only.

Detailed environment notes are in:

- `docs/deployments/sparkle-finder-silver-auth-env-vars.md`

## Credential-Ready Rollout Commands

After Louis supplies Supabase and Stripe production values:

```powershell
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase migration list --linked
supabase db push
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add STRIPE_WEBHOOK_SECRET production
npx vercel env add STRIPE_SILVER_PRICE_ID production
npx vercel env ls
npx vercel --prod --yes
```

If the Supabase project is already managed by another migration workflow, confirm the remote migration state before running `supabase db push`.

## Supabase Dashboard Checklist

- Official Supabase SSR auth docs checked:
  - `https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs`
  - `https://supabase.com/docs/guides/auth/auth-email-templates`
- Confirm Site URL is `https://yoursparklefinder.com`.
- Add redirect allow-list entry for `https://yoursparklefinder.com/**`.
- Add `https://www.yoursparklefinder.com/**` if the `www` domain remains public.
- Configure Confirm signup and Magic link email templates for the SSR confirm route.
- Confirm the app's route expects `token_hash`, `type`, and optional `next`.
- Suitable Confirm signup target, subject to dashboard verification:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account
```

- Suitable Magic link target, subject to dashboard verification:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/silver?from=signup
```

- Do not rely only on Supabase's default `{{ .ConfirmationURL }}` redirect flow for SSR confirmation, because Sparkle Finder exchanges `token_hash` directly at `/auth/confirm`.
- Confirm signup-created rows get a 45-day trial in `sparkle_finder_memberships`.
- Confirm RLS is enabled on all Sparkle Finder account tables.
- Confirm users can only read/write their own profile, consent, membership, and collection rows.

## Stripe Dashboard Checklist

- Create or confirm live `Silver Membership` product.
- Create or confirm recurring monthly `$4.99/month` price.
- Store the live recurring price ID in `STRIPE_SILVER_PRICE_ID`.
- Enable Billing Portal.
- Create production webhook endpoint:

```text
https://yoursparklefinder.com/api/stripe/webhook
```

- Subscribe to:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Store the webhook signing secret in `STRIPE_WEBHOOK_SECRET`.

## Live Inspection Checklist

After deployment, inspect the live custom domain:

- `/auth/sign-up`: shows 45-day Silver trial, email, phone, state, privacy acknowledgement, and optional promotional email/SMS controls.
- `/auth/sign-up`: promotional SMS is unchecked by default.
- `/auth/sign-up`: phone copy says phone is for account verification, recovery, trial protection, or security, not marketing by default.
- `/auth/sign-in`: production page does not expose development preview powers.
- Email confirmation link lands through `/auth/confirm` and safely redirects to `/account` or the intended in-app path.
- `/account`: signed-in user sees current Silver state, trial timing, phone/privacy controls, and billing CTA if applicable.
- `/silver`: anonymous users remain gated; signed-in Silver trial users can access Silver surfaces.
- `/photo-setup`: renders the plain non-affiliate photo setup guide.
- `/shop` and `/affiliate-disclosure`: remain removed/404.
- Navigation labels show Guest, Trial Silver, Silver, Rep Silver, or Free appropriately.
- Stripe checkout starts only for an authenticated user.
- Stripe webhook updates paid membership only after verified webhook delivery.
- Rep-included Silver does not require a separate account.
- Rep identity appears as a marker on the same profile/account experience.

## Guardrails To Preserve

- Do not publish affiliate links, exact product selections, live prices, copied reviews, ratings, or retailer images.
- Do not reintroduce shop, paid-link, or affiliate storefront surfaces unless Louis explicitly reopens that strategy.
- Sparkle Finder is a discovery hub, not a jewelry marketplace.
- Do not introduce customer-to-customer transaction language during this rollout.
- Do not imply official Bomb Party affiliation.
- Phone number collection is for identity, recovery, verification, trial abuse prevention, and security notices.
- Promotional SMS and promotional email are optional, separate consents.
- Promotional SMS must remain unchecked by default.
- Sparkle Finder does not sell customer personal information.

## Recommended Next Move

Louis should supply or confirm:

- Supabase project ref, production URL, publishable key, and service role key.
- Stripe live secret key.
- Stripe live `$4.99/month` Silver price ID.
- Stripe webhook signing secret after endpoint creation.
- Confirmation that production auth emails should land on `/account` after verification.

Then run the rollout commands, inspect the live checklist, and only then mark Silver auth/billing production-ready.
