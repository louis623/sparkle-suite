---
name: sparkle-suite-rep-welcome-site
description: Create or update a personalized Sparkle Suite rep welcome and onboarding package: account preparation, public starter guide, unsent welcome-email draft, and optional Message Center welcome. Use for a newly approved rep—not public prelaunch or Team Management onboarding.
---

# Sparkle Suite Rep Welcome & Onboarding Package

Build a warm, practical, rep-specific onboarding package from verified intake data. The package helps a new rep get started; it never replaces their authenticated Workspace, turns a guide checklist into an account-attestation, or silently sends communications.

## Start with a small, verified intake

The user can begin with a name and the information they have. Before acting, resolve missing facts through the approved, read-only waitlist/intake and existing-account surfaces. Fail closed on ambiguous identity—do not choose between matching leads or accounts.

Collect or verify only what the requested pieces need:

- exact rep identity and contact for account or communication work;
- rep first name and any business/site details the rep actually supplied;
- onboarding date, time, and time-zone abbreviation;
- promotion and the source-verified monthly price after it ends;
- whether a light-box shipping address or fulfillment task already exists;
- confirmed readiness/coming-soon state for each feature named;
- any explicitly approved meeting link, public starter-guide URL, payment link, or existing Live Queue code.

Never guess a business name, account entitlement, address, price, existing account, meeting link, Live Queue code, or payment link. Keep passwords, codes, addresses, raw intake data, billing URLs, tokens, and account IDs out of public pages, source comments, templates, and project memory.

Read [references/onboarding-package.md](references/onboarding-package.md) for the component checklist and ready-to-adapt copy structure. Read the Sparkle Suite master-brand skill and the current Workspace feature state before drafting rep-facing copy.

## Work in components, with their own approval gates

Use only the pieces the user asks for. Do not make one request imply every external action.

### Account preparation

- Create or prepare an account only when the user explicitly asks. First check for an existing account and use an exact identity guard.
- Confirm whether the account is a real customer or an intentional demo/reviewer account before creation. Real approved rep onboarding must persist `account_classification=customer`; demo, reviewer, smoke, and sample accounts must explicitly persist `account_classification=demo`. Never infer demo status from incomplete onboarding, missing billing, a missing public-site slug, or absence from a name whitelist.
- After account preparation, verify the rep appears in the correct Control Center database. A real customer must appear in **Customer Database** even before setup, billing, or site customization is complete. Treat placement in **Demo Database** as a classification defect and repair the durable classification before closeout.
- Prepopulate only fields supplied by the rep’s intake or explicitly confirmed by the user. Leave unknown settings empty and identify the coverage hole.
- Before a live onboarding walkthrough, verify the existing account has the
  intended Workspace access row (subscription or onboarding trial), a reserved
  Sparkle Suite public-site slug, prepared site settings, and a reachable live
  `yoursparklesuite.com/{showname}` page. A `dashboard_unlocked` setup row or
  Customer Database placement does not prove the account or site is ready.
- If a pending onboarding trial must be active before the rep's first sign-in
  so an authorized operator can proof the Workspace and published site, obtain
  explicit approval, activate only that exact rep's existing trial, and verify
  its fixed expiration. Do not create a subscription or Stripe object as a
  workaround.
- Proof the published Home, Dance Floor, and Join routes before the meeting.
  Remove false seeded promotions or sample claims, but leave unknown personal
  story, schedule, shop, photo, and business details for the rep to supply.
- Generate or set a temporary password, private Live Queue code, or other credential only through the approved product flow. Treat it as sensitive: never put it on the public guide or in durable memory, and confirm immediately before transmitting it to the rep.
- Do not mutate billing, pricing reservations, subscription records, Stripe, DNS, production configuration, or the Live Queue extension unless the user explicitly asks for that exact action.

### Operator launch checklist

Treat the rep-facing self-serve checklist and the operator launch checklist as
two different things. The rep checklist teaches the rep; the operator checklist
prevents Sparkle Suite from overlooking launch work. Do not mark the latter
complete merely because the former has a completed setup session.

- Keep one durable, operator-only checklist per real customer in the Control
  Center when that surface is available. It belongs inside the expanded customer
  profile, not in the Demo Database or a public guide.
- Keep the operator UI intentionally simple: each item is one plain-English
  description with a done/not-done checkbox. Do not add statuses, proof notes,
  or an attestation workflow unless Louis explicitly asks to expand it.
- Do not reuse the legacy `onboarding_status` or a dashboard-unlocked flag as
  this ledger. Those answer different questions and can conceal a missing public
  site, trial, domain, or launch verification.
- Start every customer with these operator-owned checks:
  1. exact rep identity and durable `customer` classification, including
     Customer Database placement;
  2. intended Workspace access/trial or entitlement, verified without a live
     checkout or charge;
  3. public-site slug, prepared Site Settings, business/contact basics, and
     customer-facing social handles;
  4. live public Home, Dance Floor, and Join routes, including tenant-owned
     copy and no stale demo promotion or identity;
  5. Calendar and customer-show readiness: configured platform social links
     are the source for public watch actions, never event-specific URLs;
  6. Live Queue operational setup or a clear unfinished handoff—not an
     assumption that a guide was read;
  7. approved welcome communication state (drafted, sent only when separately
     authorized, or intentionally not needed);
  8. public search visibility: their public crawl files use the rep's real
     business, public routes, and domain—not a demo identity. Confirm the
     canonical metadata, favicon and sharing image, `robots.txt`,
     `sitemap.xml`, `llms.txt`, and structured data are correct before asking
     any search provider to crawl it. Submit to Google Search Console and Bing
     Webmaster Tools only with the owner's verified property access and exact
     authorization; search indexing is asynchronous and is not proof of a
     same-day result;
  9. closeout: exact live URLs checked, remaining owner/rep actions, and no
     unresolved safety-sensitive blocker.
- Use the custom-domain items only when the rep asks for that work. When it
  applies, the checklist
  must separately cover: verified domain ownership/registrar authority;
  Vercel attachment; the smallest DNS change required; an identity-guarded rep
  domain mapping; live root, Trade, and Join verification; and a stable favicon
  plus social-share card render. The final public search check must verify that
  the customer domain's sitemap contains its actual public routes and that the
  crawl files do not retain another rep's or a demo site's name. Preserve unrelated aliases, nameservers,
  forwarding, contacts, billing, and other DNS records unless Louis explicitly
  authorizes a specific change.
- Check an item only after the named work actually succeeds. An unchecked item
  is enough to show something remains open; do not substitute access, guess a
  setting, or use the rep's credentials to force completion.

### Public starter guide

Use [assets/rep-welcome-site-template.md](assets/rep-welcome-site-template.md) as the one canonical published-guide format. It is the Kelly long-form Workspace walkthrough, not a generic starter-guide pattern. Preserve its contents rail, 12-section guided walkthrough, questions, and calm closing; personalize verified facts rather than inventing a different page shape.

- Keep the schedule precise, including the confirmed time-zone abbreviation.
- Explain customer-site customization as the rep’s own work, with a guided walkthrough and help available on request; do not imply Sparkle Suite is completing it during the onboarding meeting.
- A device-local checklist is optional supporting material only. It must never replace the canonical walkthrough or imply a checked item updates the Workspace or proves a setup task is done.
- Keep deferred features as visible **Coming soon** cards, and remove them from ready-now guidance. Do not give roadmap dates.
- Link only the verified official Live Queue Chrome Web Store listing when requested. Never expose the private code or alter the protected extension.
- When Live Queue is included in a guide, plainly state the verified device path: Google Chrome on a Mac or Windows computer works; an iPhone or iPad cannot run the browser extension. Point the rep to Help & Resources for setup steps.
- A meeting link is private by default; publish it only with explicit approval. Do not create a Calendar event, invite, or transcription setting merely because the guide has a meeting card.
- Publish only when the user explicitly authorizes the public page. Build, check desktop and mobile, check console errors, exercise a navigation link, and deploy through the Sites project/version flow. Do not deploy the main Sparkle Suite app for a guide-only change. Suite app changes that ride along follow the Smoke-first lane: verify on Smoke, then one Louis-approved live promote. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`. Chrome Web Store listing updates stay gated (Smoke-installed validation, then Louis, then one Store release).

### Welcome email

- Default to an editable, unsent Gmail draft. Verify the sending mailbox before editing and do not send unless the user separately authorizes send.
- Put the optional starter-guide invitation near the top: reading ahead is welcome, not required before the meeting.
- Give clear sign-in instructions with a real hyperlink to the verified Sparkle Suite sign-in page. When approved to share credentials, identify where they are used and instruct the rep to change the temporary password after first access.
- Use actual HTML hyperlinks—not bare URLs—for the public guide, approved meeting, sign-in page, and official Chrome Web Store listing when included. Verify the saved draft remains labeled `DRAFT`.
- Include a private Live Queue code only in the private email, never the guide or Message Center. Confirm immediately before transmitting any credential, code, address, or payment link.

### Message Center welcome

- Use the authenticated Control Center Message Center composer, never a direct database write or a general broadcast workaround.
- Select the exact rep, preview the frozen audience, and verify the sample and count before publishing. For a new-rep welcome, expect exactly one recipient unless the user explicitly specifies otherwise.
- Keep the in-app message short, welcoming, and credential-free; it may link to the public starter guide.
- Publish only with explicit final approval. Verify the resulting publication’s recipient and delivered counts. State plainly that it is in-app only unless another channel was independently authorized.

### Payments and fulfillment

- State the precise introductory rate, duration, and verified post-promotion monthly price in rep-facing materials. Do not use “then-current price.”
- Create or share a payment link only when the user explicitly asks for that exact billing action. Never charge, create checkout, or move money without a separate action-time approval.
- Mention a light box only when it is part of the approved onboarding. Ask to confirm the best shipping address when needed; do not expose or collect the address in the public guide.

## Closeout

Report each requested component as prepared, published, sent, or intentionally left as a draft. Include coverage holes and exact recipient/delivery verification for Message Center. Do not claim a website, email, account, payment link, or message is complete until its destination confirms the outcome.

When a broadly useful improvement comes from a real onboarding, update this skill and its tokenized template without copying a rep’s private data. Closeout must include read-only verification of the account classification and Control Center placement. If a Control Center operator checklist is not yet implemented, record its unresolved launch checks in the session closeout and do not imply that the product has a durable checklist.
