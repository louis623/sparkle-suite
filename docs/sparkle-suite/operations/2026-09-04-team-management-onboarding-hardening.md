# Team Management native onboarding operator guide

## Product boundaries

- Public Join Team remains the customer-site `/join` page and is never changed
  by creating a private onboarding link.
- Private New Rep Onboarding is a token-protected Sparkle Suite experience at
  `/onboarding/[inviteSlug]?invite=<opaque-token>`.
- The readable slug is presentation only. The opaque token authorizes access,
  and only its SHA-256 hash is stored.
- Business/site name, managed team name, and team-lead display name come from
  the owning workspace. They must never be copied from another tenant.
- Team Management is included with every active Sparkle Suite workspace.

## Native link creation

No external Site, DNS change, per-rep environment variable, or online operator
is required. Saving a hidden team-member card and selecting **Create onboarding
link** creates the participant, private token, canonical workspace conversation,
and a native Sparkle Suite URL immediately.

New and replacement links always use
`https://www.yoursparklesuite.com/onboarding/...` in production. Browser
`baseUrl` input is ignored. Local development may use its localhost request
origin so the same workflow can be tested without production side effects.

The previously issued Brittany ChatGPT Site origin remains on the exact CORS
compatibility allowlist so those links continue to load progress and messages.
It is not eligible for new links, is not a default for other reps, and its
tokens are not rotated during this release.

Private pages carry route metadata and response headers for
`noindex, nofollow, noarchive`, use `Cache-Control: private, no-store`, use
`Referrer-Policy: no-referrer`, are disallowed by `robots.txt`, and never
appear in the sitemap.

## Synthetic reviewer smoke

Use the supported reviewer workspace. Never create a real recruit invite merely
to test this workflow.

1. Open `/start`, enter reviewer mode, and open **Workspace → Team
   Management**.
2. Save a hidden synthetic card named `Alex Reviewer`. Confirm the public
   Join Team visibility remains off.
3. Select **Create onboarding link**. Confirm the URL is on the live Sparkle
   Suite domain, includes `/onboarding/`, and contains an opaque `invite`
   query token.
4. Open the link. Confirm the synthetic participant plus that reviewer
   workspace's lead, business, and team identity appear. No customer-specific
   name from another workspace may appear.
5. Mark one checklist step complete and refresh. Confirm the completion remains.
6. Send a harmless synthetic question. Confirm it appears in the owning
   workspace's Team Management/Message Center thread, then send a synthetic
   team-lead reply and confirm it appears on the private page.
7. Replace the link. Confirm the old link is invalid, the new link works, and
   the same progress and message history remain.
8. Archive the participant. Confirm the latest link becomes invalid while the
   hidden/public card boundary is unchanged.
9. Reset reviewer mode so all synthetic participant, conversation, progress,
   message, and card rows are removed in dependency-safe order.

Release only after focused tests, the production build, and this complete
synthetic workflow on Smoke. Live-domain alias checks happen after Louis
approves one promote. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.
