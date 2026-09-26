# Sparkle Finder Silver Auth Environment Readiness

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

Created: 2026-06-01

## Current Status

Production rollout is not complete. Updated June 13, 2026 after the launch-readiness audit:

- Sparkle Finder customer auth must use the dedicated Sparkle Finder Supabase project, not the old shared Neon Rabbit/Sparkle Suite project.
- Dedicated Sparkle Finder project ref: `pzksocboqauqjdtsgpdp`.
- The old shared project ref `bqhzfkgkjyuhlsozpylf` is explicitly blocked by runtime guardrails and must not be used for Sparkle Finder customer auth, OAuth redirects, Site URL, service-role writes, or customer user pools.
- Vercel currently has public Supabase, service-role, Sparkle Suite API, and Showcase Studio intake variables configured for Development/Production as applicable; Stripe live billing variables and the paid-billing exposure flag are still missing. Monday beta should keep paid Silver checkout disabled with `SPARKLE_FINDER_ENABLE_PAID_BILLING=false`.

- Production deployment has not been run for the Silver auth/billing work.
- Remote Supabase migrations were applied through the authenticated Supabase SQL Editor because local Supabase CLI auth is unavailable.
- Local Supabase is not linked. `supabase migration list --linked` failed with: `Cannot find project ref. Have you run supabase link?`
- The linked Vercel project is `sparkle-finder-dev`.
- Production Vercel env now includes `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser/server Supabase auth.
- Development Vercel env now includes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Preview Vercel env is not configured yet because `sparkle-finder-dev` does not have a connected Git repository, so Vercel rejected branch-scoped preview env setup.
- Stripe production env vars and `SPARKLE_FINDER_ENABLE_PAID_BILLING` are still not configured in Vercel.
- Supabase CLI management access is not authenticated in this local session. `supabase projects list -o json` reached the API and returned `Unauthorized`.
- Google Auth is enabled in Supabase. Public Auth settings return `external.google=true`.
- Supabase redirect allow-list now includes Sparkle Finder production callback/confirm URLs and `http://127.0.0.1:3000/**`.
- Google OAuth start is verified: Supabase returns `302` to Google for `https://yoursparklefinder.com/api/auth/callback?next=/account`.
- Remote schema is verified: `sparkle_finder_profiles` returns `200 OK` through Supabase REST after the SQL Editor migration run and PostgREST schema reload.
- Latest implemented Silver/auth smoke commit before this rollout document: `758ceb5 test: assert account silver trial smoke copy`.

## Required Vercel Environment Variables

Configure these in Vercel before a production deploy. Production values should be set for the Production environment first. Preview and Development can be added after Louis decides whether they should point at the same Supabase project or a separate staging project.

| Variable | Scope | Required For | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public browser/server | Auth redirects, billing return URLs | Production value: `https://yoursparklefinder.com`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public browser/server | Supabase Auth and client reads | From the linked Supabase project API settings. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public browser/server | Supabase browser/server client | Use the publishable/anon key, not the service role key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Stripe webhook membership writes and server-rendered canonical catalog reads | Keep out of client code. Required for webhook-driven paid Silver updates. Also lets Sparkle Finder read the shared Sparkle Suite jewelry catalog without changing Sparkle Suite RLS policies. |
| `STRIPE_SECRET_KEY` | Server only | Checkout, billing portal, webhook API reads | Use the live key for production rollout. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signature verification | From the production webhook endpoint configured in Stripe. |
| `STRIPE_SILVER_PRICE_ID` | Server only | Paid Silver checkout | Recurring monthly price ID for the Silver Membership product. Target price is `$4.99/month`. |
| `SPARKLE_FINDER_ENABLE_PAID_BILLING` | Server only | Paid checkout exposure | Keep `false` for Monday beta. Set to `true` only after Stripe checkout, portal, and webhook smoke tests pass and Louis approves paid Silver exposure. |

Do not deploy full production paid auth/billing until all required variables are present and `SPARKLE_FINDER_ENABLE_PAID_BILLING=true` is intentionally set. The current code is designed to fail closed for paid billing when the exposure flag is off, or when Stripe or Supabase service-role configuration is missing.

## Vercel Commands

Use these after Louis supplies production values. The public production auth values listed above have already been added to Vercel; the remaining server-only values still need to be added before paid billing rollout:

```powershell
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add STRIPE_SECRET_KEY production
npx vercel env add STRIPE_WEBHOOK_SECRET production
npx vercel env add STRIPE_SILVER_PRICE_ID production
npx vercel env add SPARKLE_FINDER_ENABLE_PAID_BILLING production
npx vercel env ls
```

Expected production values:

```text
NEXT_PUBLIC_SITE_URL=https://yoursparklefinder.com
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase publishable or anon key>
SUPABASE_SERVICE_ROLE_KEY=<supabase service role key>
STRIPE_SECRET_KEY=<stripe live secret key>
STRIPE_WEBHOOK_SECRET=<stripe live webhook signing secret>
STRIPE_SILVER_PRICE_ID=<stripe recurring monthly price id>
SPARKLE_FINDER_ENABLE_PAID_BILLING=false
```

## Supabase Requirements

Official Supabase SSR auth docs checked for this rollout:

- `https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs`
- `https://supabase.com/docs/guides/auth/auth-email-templates`

Link the local project before applying the migration:

```powershell
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase migration list --linked
supabase db push
```

The remote project must receive the Sparkle Finder account schema migration that creates and protects:

- `sparkle_finder_profiles`
- `sparkle_finder_memberships`
- `sparkle_finder_communication_consents`
- `sparkle_finder_collection_items`
- account creation trigger for the default 45-day Silver trial
- RLS policies for user-owned profile, membership, consent, and collection rows

Sparkle Finder catalog reads:

- Sparkle Finder reads the shared Sparkle Suite catalog from `collections`, `jewelry_designs`, and available `trade_listings`.
- Sparkle Suite remains the jewelry-loading/admin source of truth.
- Sparkle Finder should not create or update `collections`, `jewelry_designs`, or `trade_listings` during this phase.
- The Finder server-side catalog adapter prefers `SUPABASE_SERVICE_ROLE_KEY` so public catalog pages can render canonical jewelry rows without loosening Sparkle Suite RLS policies.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in Vercel and local `.env.local`. Never prefix it with `NEXT_PUBLIC_`.
- `sparkle_finder_collection_items.jewelry_item_id` should now store the canonical `jewelry_designs.id` for real saved collection records.

Supabase Auth configuration:

- Site URL should be `https://yoursparklefinder.com`.
- Redirect allow-list should include `https://yoursparklefinder.com/**`.
- If `www` remains a public entry point, also allow `https://www.yoursparklefinder.com/**`.
- OAuth callback redirect URL should include `https://yoursparklefinder.com/api/auth/callback`.
- Password signup confirmation and magic-link emails should target Sparkle Finder's server-side confirm route.
- The current confirm route expects `token_hash`, `type`, and optional `next`.
- Supabase SSR email-template docs support `TokenHash` for custom server-side auth links.
- A suitable production Confirm signup template target is:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account
```

- A suitable production Magic link template target is:

```text
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/silver?from=signup
```

Verify exact template placement and variable names in the Supabase dashboard before enabling templates. Do not rely only on Supabase's default `{{ .ConfirmationURL }}` redirect flow for SSR confirmation, because Sparkle Finder's `/auth/confirm` route exchanges `token_hash` directly.

## Google OAuth for Sparkle Finder

Supabase Auth must have Google enabled before the `Continue with Google` button works outside local mocked tests.

Required Supabase Auth redirect URLs:

- `http://localhost:3000/api/auth/callback`
- `http://127.0.0.1:3000/api/auth/callback`
- `https://yoursparklefinder.com/api/auth/callback`
- Any approved Vercel preview URL plus `/api/auth/callback` when preview OAuth testing is needed

Supabase management API values needed to complete this from the CLI/API:

- Project ref: `pzksocboqauqjdtsgpdp`
- Site URL: `https://yoursparklefinder.com`
- Redirect URLs: include `https://yoursparklefinder.com/api/auth/callback`, `https://yoursparklefinder.com/auth/confirm`, and approved local/preview equivalents.
- Google provider: enable Google and set the approved Google Client ID/Secret in Supabase Auth provider configuration.

Current public Auth settings check:

```powershell
$anon = "<NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY>"
curl.exe -L `
  https://pzksocboqauqjdtsgpdp.supabase.co/auth/v1/settings `
  -H "apikey: $anon"
```

Relevant result as of 2026-06-05 after Chrome dashboard setup:

```json
{
  "external": {
    "email": true,
    "google": true
  },
  "disable_signup": false,
  "mailer_autoconfirm": true
}
```

OAuth start verification:

```powershell
$anon = "<NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY>"
$redirect = [System.Uri]::EscapeDataString("https://yoursparklefinder.com/api/auth/callback?next=/account")
curl.exe -s -D - -o NUL `
  "https://pzksocboqauqjdtsgpdp.supabase.co/auth/v1/authorize?provider=google&redirect_to=$redirect" `
  -H "apikey: $anon"
```

Expected result: `HTTP/1.1 302 Found` with `Location: https://accounts.google.com/...`.

If this ever needs to be redone without dashboard access, when a Supabase access token with `auth_config_write` and `project_admin_write` is available, the hosted Supabase Management API accepts these Auth configuration fields:

```powershell
$headers = @{
  Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN"
  "Content-Type" = "application/json"
}

$body = @{
  site_url = "https://yoursparklefinder.com"
  uri_allow_list = "https://yoursparklefinder.com/api/auth/callback,https://yoursparklefinder.com/auth/confirm,http://localhost:3000/api/auth/callback,http://127.0.0.1:3000/api/auth/callback"
  external_google_enabled = $true
  external_google_client_id = $env:GOOGLE_CLIENT_ID
  external_google_secret = $env:GOOGLE_CLIENT_SECRET
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Patch `
  -Uri "https://api.supabase.com/v1/projects/pzksocboqauqjdtsgpdp/config/auth" `
  -Headers $headers `
  -Body $body
```

Do not commit or paste the Google Client Secret. Keep it in the Supabase provider configuration or an approved secret manager only.

Google Cloud OAuth:

- Create or reuse an OAuth client for Sparkle Finder web auth.
- Add the Supabase project callback URL shown in the Supabase Google provider screen to Google authorized redirect URIs.
- Store the Google Client ID and Client Secret only in Supabase provider configuration or approved server-side environment configuration.

App environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Do not expose Supabase service-role keys to the browser.

## Stripe Requirements

Create or verify in live Stripe:

- Product: `Silver Membership`
- Price: recurring monthly, `$4.99/month`
- Production price ID stored as `STRIPE_SILVER_PRICE_ID`
- Billing Portal enabled for subscription management
- Production webhook endpoint:

```text
https://yoursparklefinder.com/api/stripe/webhook
```

Webhook events needed by the current server route:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`.

## Deployment Command

After Vercel env vars are present, Supabase is linked, migrations are applied, Supabase Auth is configured, and Stripe webhook/product setup is complete:

```powershell
npx vercel --prod --yes
```

Record the production deployment URL and verify the custom domain alias before calling the rollout complete.

## Privacy And Product Guardrails

- Phone numbers may be collected for identity, recovery, verification, trial abuse prevention, and security notices.
- Phone number collection does not create promotional SMS consent.
- Promotional email and promotional SMS must stay separate optional opt-ins.
- Promotional SMS must remain unchecked by default.
- Do not send SMS marketing without explicit consent and a chosen compliant provider.
- Do not sell customer personal information.
- Do not publish affiliate links, exact product selections, live prices, copied reviews, ratings, or retailer images.
- Sparkle Finder should not present a shop, paid links, or an affiliate storefront unless Louis explicitly reopens that strategy.
- Sparkle Finder remains a discovery hub, not a jewelry marketplace.
- Do not imply official Bomb Party affiliation.
