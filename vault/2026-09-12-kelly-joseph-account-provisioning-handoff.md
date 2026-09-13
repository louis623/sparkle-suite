# Kelly Joseph / Sparkly Butterflies — account provisioning handoff

## Completed

- Created Kelly Joseph's real Sparkle Suite **customer** account for **Sparkly Butterflies** as founder **#2**.
- Provisioned the standard customer-site path at `https://www.yoursparklesuite.com/sparklybutterflies` with the existing Amethyst template and default `amethyst` appearance preset.
- Set the account to active, dashboard-unlocked full Workspace access, founder pricing metadata of $50/month, and the public-site slug `sparklybutterflies`.
- Enabled Team Management with an active internal entitlement. It has no Stripe provider identifiers and is eligible for the upline team/onboarding controls.
- Confirmed the record is in the live Control Center Customer Database (six customer accounts total), with no Stripe customer or provider subscription attached.
- Browser-verified the public Home and Dance Floor routes. Home reflects Kelly's approved business name, TikTok handle, and confirmed Tue–Fri 10:00 AM MST / Sunday 12:00 PM MST schedule; the Dance Floor is correctly empty for a newly provisioned account.

## Intentionally not done

- No Stripe customer, checkout, invoice, payment link, provider subscription, or charge.
- No custom butterfly, pink, glitter, unicorn, or bling skin work; that is a separate later pass.
- No custom shop URL, customer list, or personal About content.
- No downline accounts or placeholder participants. Two future downlines remain warm leads until names are supplied.
- No sales, billing, onboarding-email, or custom-content communication was sent. A transparent support-access notice and completion record were sent in the Workspace Message Center during the later read-only smoke test.

## Remaining operator/rep work

1. Give Kelly her first-sign-in instructions and the temporary password through an approved private channel; do not place credentials in this vault or a public guide.
2. Complete the five About/intake questions and add the resulting customer-facing copy, schedule, shop link, and optional media.
3. Confirm the two downline names and create their accounts only when they are ready.
4. Handle the founder agreement and any Stripe billing action separately with Louis's action-time authorization.
5. Run the first authenticated Team Management upline walkthrough once Kelly is available; no fake participant was created as a test.

## Verification notes

- The customer profile shows: active customer, founder, active monthly access, $50 monthly metadata, public slug, TikTok, and dashboard-unlocked setup.
- Team Management is verified from its durable entitlement record and the application access rule: `active` (or `manual_beta`) is enabled.
- The direct public `/sparklybutterflies/join` request was blocked by the local browser client, so it was not claimed as browser-smoked in this session.

## Follow-up verification — September 12, 2026

- Provisioned Kelly's Live Queue code through the real Sparkle Suite service and confirmed its presence in both the classic Control Center and the LOC customer record. The code itself is intentionally omitted from this handoff.
- Rechecked classic Control Center and LOC: both show the same active Sparkly Butterflies customer, active founder subscription, dashboard-unlocked setup, default Amethyst site, and Live Queue readiness.
- Started a transparent, disclosed support session with Louis's approval, then verified the live Workspace as Kelly: correct public-site identity, Live Queue panel/code and setup guidance, and an enabled Team Management panel with team name `Sparkly Butterflies`, Join Team preview, and private onboarding controls.
- The support session was closed immediately after read-only verification. Its customer-visible completion record states that Live Queue setup was completed and Workspace access was verified.

## Custom domain connection — September 12, 2026

- Connected `sparklybutterflies.com` and `www.sparklybutterflies.com` to the existing live Sparkle Suite Vercel project. Vercel verified the apex configuration against the project without a deployment, alias move, or application-code release.
- Updated only the newly parked web DNS records at the registrar: the two Vercel apex A records and the Vercel `www` CNAME. The existing nameservers, DMARC record, and provider system records were preserved.
- Applied an exact identity-guarded production mapping from the active Sparkly Butterflies customer record to `sparklybutterflies.com`; the customer remains active and classified as `customer`.
- Browser-smoked `https://sparklybutterflies.com/` and `/trade`: both served Kelly's live tenant copy, and public navigation remains on the customer domain. `https://www.sparklybutterflies.com/` resolves to the same site.
- The browser client blocks direct `/join` navigation with `ERR_BLOCKED_BY_CLIENT`; this is the same local client limitation previously observed on the platform URL, not a DNS or Vercel routing failure. The custom-domain Home, Trade, metadata, and dynamic social-card endpoint are live; recheck Join from an unaffected browser before declaring a full three-route browser proof.
- The current shared Sparkle Suite default favicon and dynamic customer-domain Open Graph image are in use. No bespoke brand art was fabricated before Kelly supplies approved assets.
