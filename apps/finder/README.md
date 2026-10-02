# Sparkle Finder

Sparkle Finder is the customer and collector application in the Sparkle Suite
repository.

## Repository And Deployment

- Active Git repository: `C:\Users\louis\sparkle-suite-repo`
- Application root: `apps\finder`
- Vercel project: `sparkle-finder-dev`
- Vercel Root Directory: `apps/finder`
- Production branch: `codex/nic-nac-trade-hardening`
- Production domain: `https://yoursparklefinder.com`

**Smoke-first ship lane (locked 2026-09-26):** deploy and verify Finder on Smoke (staging Supabase, demo accounts), stack small updates there, then one Louis-approved live promote. Do not treat a merge as `vercel --prod`. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.

Run Finder build, test, and deployment commands from this directory. Commit and
push from the shared repository root. Sparkle Finder remains independently
deployed with its own authentication, Supabase project, environment variables,
domains, and Vercel project. The retained standalone repository at
`C:\Users\louis\sparkle-finder-repo` is rollback evidence only.

## Working Name

Use `Sparkle Finder` as the working customer-facing product name.

Brand relationship: `Sparkle Finder by Sparkle Suite`.

The local mark should be an `SF` circular seal inspired by the Sparkle Suite `S` seal. The look and feel should follow the main Sparkle Suite brand system, not the Amethyst skin/template.

The locked UI direction is the updated Concept 2 homepage mockup: an editorial Sparkle Finder discovery hub with the `SF` circular seal, `Today across Sparkle Suite` agenda panel, discovery cards, Silver Collector Space, customer profile preview, collection preview, and Nic-Nac `find this for me` module.

## Product Direction

The future customer side is a collector/community surface for Bomb Party customers connected to the Sparkle Suite ecosystem. The recurring vision from Open Brain and local planning docs includes:

- secured free customer discovery hub
- Sparkle Suite rep directory
- master live calendar for Sparkle Suite reps
- aggregated Dance Floor browsing for rep dancers
- searchable jewelry library powered by the existing Sparkle Suite jewelry database
- Diamonds & Unicorns Library powered by Bomb Party's own diamond/unicorn labels
- traffic paths back to rep sites and shows
- plain photo setup guidance for Showcase Studio uploads, including an optional non-affiliate light-box resource link
- optional Silver Membership for Nic-Nac Collector Assist
- Silver customer profile and collection features
- parked future expansion for customer-to-customer trading and community features

## Boundary

This repo is for:

- Open Brain and Neon Rabbit source collation
- product research and competitive notes
- v1 customer discovery hub planning
- trust, compliance, marketplace, and operations research
- customer-side architecture planning
- future prototype plans after the research/design phase

This repo is not for:

- active `neon-rabbit-core` launch work
- current rep-side Dance Floor implementation
- generated marketing assets
- fake UI/product screenshots
- live SMS, Stripe, marketplace, shipping, or payment-provider actions

## Start Here

- `docs/context/open-brain-findings.md`
- `docs/context/neon-rabbit-source-map.md`
- `docs/research/initial-research-brief.md`
- `docs/research/open-questions.md`
- `docs/research/proof-of-ownership-and-trust.md`
- `docs/research/monetization-concepts.md`
- `docs/handoffs/2026-05-29-session-close-sparkle-finder-planning.md`
- `docs/plans/2026-05-28-customer-platform-build-plan.md`
- `docs/superpowers/plans/2026-05-29-sparkle-finder-v1-build.md`
- `docs/design/2026-05-29-homepage-mockup-direction.md`
- `docs/business/2026-05-29-business-plan-and-revenue-model.md`
- `docs/decisions/current-assumptions.md`
- `docs/decisions/2026-05-29-sparkle-finder-branding.md`
- `docs/decisions/customer-trade-workflow-decisions.md`

## Current Posture

Sparkle Finder is an active production application. Preserve its separate auth,
data, and deployment boundaries while coordinating related work from the shared
Sparkle Suite repository.

## Silver Billing Env

Task 7's server-only Stripe scaffold expects:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SILVER_PRICE_ID`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Paid checkout is disabled unless checkout, Stripe webhook verification, and Supabase service-role membership writes are all configured. Without the service role key and Supabase URL, Stripe webhooks fail closed instead of trying to update paid membership rows through the publishable Supabase client.
