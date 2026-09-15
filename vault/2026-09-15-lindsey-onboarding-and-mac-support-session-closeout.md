# Lindsey onboarding and Mac support session closeout — September 15, 2026

## Objective completed

Completed the requested Mac/Chrome Live Queue guidance, Mile High Fizz domain
move, Lindsey onboarding preparation, personalized guide correction, and
onboarding-email formatting standardization. No email was sent.

## Completed work

1. **Mac Live Queue guidance**
   - Help & Resources now has the plain-English Mac setup guidance in commits
     `21c66978` and `a2ac6778`.
   - Confirmed wording: Live Queue works in Google Chrome on a Mac or Windows
     computer; iPhone and iPad cannot run the browser extension. Help &
     Resources is the setup path.
   - No extension, Store, installed-extension, or live-queue state was
     changed.

2. **Mile High Fizz custom domain**
   - Lindsey's `milehighfizz.com` authority was moved from the Readdy Route 53
     delegation to Vercel DNS. The public customer site is now served through
     Sparkle Suite at the apex and `www` host.
   - See `2026-09-15-mile-high-fizz-dns-cutover.md` for the authoritative DNS
     evidence and propagation context.

3. **Lindsey readiness and onboarding materials**
   - Audited Lindsey as an active customer with an unlocked Workspace and a
     valid $0 grandfathered family entitlement. No billing, checkout,
     subscription, credential, customer-data, or queue mutation was made.
   - Published the personalized Mile High Fizz walkthrough at:
     `https://mile-high-fizz-sparkle-suite-welcome.louis526569.chatgpt.site`
   - The guide is the Kelly / Sparkly Butterflies long-form walkthrough format,
     not a generic starter page. It includes the Mac/Chrome Live Queue note.
   - Lindsey's Gmail draft, `Lindsey, your Sparkle Suite Workspace walkthrough`,
     remains unsent and links to that guide.

4. **Canonical onboarding standards**
   - Commit `0c1636ab` makes the Kelly long-form guide the single canonical
     rep-welcome format. Generic feature-card, short starter, and
     checklist-first replacements are prohibited.
   - Commit `efbc4226` makes Kelly's readable Workspace onboarding email the
     required email format. It adds the reusable
     `.agents/skills/sparkle-suite-email/assets/workspace-onboarding-email-template.md`
     and requires a visual Gmail check because plain text replacement can be
     flattened into a wall of text.

## Key decisions and lessons

- Treat Mac computers as supported for Live Queue only through Google Chrome;
  Safari investigation for Bri remains a separately authorized task.
- Customer-facing guides and onboarding emails are operational customer service
  materials, not generic marketing pages or dense copy blocks.
- Reuse Kelly's established structures while substituting only verified
  rep-specific facts; never copy a paid billing plan to a $0 grandfathered
  account.
- A saved Gmail text value is not proof of formatting. The compose window must
  visibly show real paragraph breaks and headings.
- The published guide and email remain separate: public guides contain no
  credentials or private meeting details; private email drafts may contain
  recipient-specific links only as authorized.
- Preserve the unrelated dirty workspace and protected extension overlay. Do
  not reset, clean, stash, bulk stage, change the Chrome Web Store, touch
  extension code, or alter live queues.

## Current provenance

- Repository: `C:\Users\louis\sparkle-suite-repo`
- Remote: `https://github.com/louis623/sparkle-suite.git`
- Allowlisted branch: `codex/nic-nac-trade-hardening`
- Current documentation/skill tip: `efbc4226db6c00578f4d3540742d12612cfa54e4`
- Current deployed Live Lineup application remains commit
  `c827df4f0bd6ef0661e3671051fe95e990b1ccf0`, READY deployment
  `dpl_CyTUoervEnsJt7V9R1R2zoNKyXSC`.

## Next session

Open `https://www.yoursparklesuite.com/control-center` inside the Codex desktop
app and stand by for Louis's next instruction. Do not repeat this completed
work, send Lindsey's draft, change production, investigate Bri/Safari, or
touch any Live Queue extension or live queue state unless Louis explicitly
asks.
