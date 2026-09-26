# Sparkle Finder Monday Beta Launch Runbook

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

Created: 2026-06-13
Target beta publish date: 2026-06-15

## Launch Scope

Beta launch includes:

- Public landing, photo setup guide, privacy policy, and terms.
- Dedicated Sparkle Finder account creation/sign-in through the dedicated Supabase project.
- 45-day Silver trial for new customer accounts.
- Free/Silver gated hub access.
- Master Jewelry Library, live shows, the Dance Floor, public Sparkle Showcase, Silver Sparkle Showcase tools, and Showcase Studio intake.
- Plain, non-affiliate photo setup resource link only.

Beta launch excludes unless explicitly re-approved before launch:

- Customer-to-customer trading, buy/sell, marketplace, escrow, shipping, or fulfillment.
- Affiliate shop, paid links, exact product recommendation surfaces, copied reviews, ratings, live prices, or retailer imagery.
- Shared customer auth through Neon Rabbit HQ, Sparkle Suite, or any non-Finder product auth pool.

## Hard Gates Before Public Beta

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run smoke:sparkle-finder`
- `npx tsx scripts/check-sparkle-suite-finder-api.ts`
- `npx vercel env ls` confirms required production vars.
- `supabase migration list` or Supabase dashboard review confirms remote schema/migration history before any future migration push.
- Fresh browser smoke passes on the deployed beta URL.
- Louis completes one real Google account signup/sign-in smoke.

## Required Production Environment

Vercel project: `sparkle-finder-dev`

Required before beta:

- `NEXT_PUBLIC_SITE_URL=https://yoursparklefinder.com` or the approved beta URL.
- `NEXT_PUBLIC_SUPABASE_URL` for dedicated project `pzksocboqauqjdtsgpdp`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SPARKLE_SUITE_FINDER_API_BASE_URL`.
- `SPARKLE_SUITE_FINDER_INTAKE_API_URL`.
- `SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN`.

Required before paid Silver checkout is exposed:

- `STRIPE_SECRET_KEY`.
- `STRIPE_WEBHOOK_SECRET`.
- `STRIPE_SILVER_PRICE_ID`.
- `SPARKLE_FINDER_ENABLE_PAID_BILLING=true`.
- Stripe Billing Portal enabled.
- Stripe webhook endpoint: `https://yoursparklefinder.com/api/stripe/webhook`.

For the Monday beta, keep `SPARKLE_FINDER_ENABLE_PAID_BILLING=false`. Stripe can be prepared and smoked separately, but paid checkout and the billing portal must stay fail-closed until Louis explicitly flips this flag after Stripe verification.

## Supabase/Auth Checklist

- Dedicated project ref is `pzksocboqauqjdtsgpdp`.
- Do not use shared ref `bqhzfkgkjyuhlsozpylf` for Sparkle Finder customer auth.
- Site URL points to the approved Sparkle Finder beta/production URL.
- Redirect allow-list includes:
  - `https://yoursparklefinder.com/**`
  - `https://sparkle-finder-dev.vercel.app/**` if the dev alias remains a beta entry point.
  - local callback URLs only for local testing.
- Google provider is enabled and routes through the dedicated project callback.
- Confirm signup template:
  - `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account`
- Magic link template:
  - `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/silver?from=signup`
- Real signup creates `sparkle_finder_profiles`, `sparkle_finder_memberships`, and consent rows with a 45-day Silver trial.

## Smoke Matrix

Anonymous:

- `/` renders public landing and no fixture jewelry cards.
- `/photo-setup` renders the setup guide and plain Amazon resource link.
- `/shop` returns 404.
- `/affiliate-disclosure` returns 404.
- `/dashboard`, `/library`, `/live-shows`, `/rep-boards`, and `/silver` show the sign-in wall.
- `/showcase/sparkle-mama` renders public Sparkle Showcase.

Real signed-in customer:

- `/account` shows account details, privacy copy, trial state, and billing notices when present.
- `/library` shows Sparkle Suite-backed catalog data or honest empty/failure state, not silent fixture fallback.
- `/library/[itemId]` shows Silver Nic-Nac controls for a Silver trial user.
- `/live-shows` shows Sparkle Suite-backed live/upcoming shows or honest empty state.
- `/silver` shows Sparkle Showcase tools and Showcase Studio.
- Showcase Studio can submit one test intake to the approved Suite/Nic-Nac endpoint.
- `/billing/checkout` and `/billing/portal` redirect to `/account?error=paid_billing_disabled` while `SPARKLE_FINDER_ENABLE_PAID_BILLING=false`.

Responsive:

- Desktop and mobile homepage.
- Mobile sign-up/sign-in.
- Mobile library filters.
- Mobile Silver/Showcase Studio.
- Mobile public Showcase.

## Post-Smoke Decision

Launch as beta only when:

- No P0/P1 code or configuration blockers remain.
- Any remaining P2 items are documented as beta caveats.
- Louis has completed at least one real signup/sign-in smoke and accepts the beta behavior.
