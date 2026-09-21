# Team Management single-person editor

## Final release receipt

- Live application SHA: `d5f248d25e51165e4d636ca48ada54e35a57d8d6`.
- Manual Vercel: `dpl_AZCM7ZhUWo4ohNMQMyqVegk2ZRkp`, READY; canonical
  `www.yoursparklesuite.com` and apex `yoursparklesuite.com` verified on it.
- Production build and 144 focused tests passed. Local desktop/390px phone
  checks passed; no framework overlay or relevant console errors.
- Live authorized-demo Team Management: unchanged Photo Test details saved and
  that exact card stayed selected. Empty new-card name produced validation
  without creating a member. Lead, Photo Test, Steve, Gracie Bot and Jane all
  retained their exact pre-release photo URLs, including Louis's later edits.
- Jane's existing private onboarding history, fresh-link, Messages and Archive
  controls remained available. No onboarding link was created or replaced.
- Photo Test's existing polish result, original restore, current-skin refresh
  and 1-of-4 attempt count remained available. No paid generation was requested.
- Public demo `/amethyst/Join.html?c=ac3e643a-6ccf-4400-8230-662f63a07f3e#team`
  retained all five people. Production landing remained stable; authenticated
  Workspace identity was correct, with no checkout/account changes.
- Existing useful Workspace tab retained. Codespace confirmed Shutdown.
- Louis requested final GitVault/Open Brain updates after release. This final
  notes commit does not deploy or alter application code. The live app stays at
  `d5f248d2`; pull the latest notes tip before future work. Await user feedback.

Louis accepted the live team-photo feature after his own smoke test, then approved
consolidating Workspace Team Management without losing functionality.

## Approved interaction

- One person selector (including You — Team Lead) and Add team member use the
  same editor. Photo, Details & Links, and Private Onboarding are separate views.
- Team-wide settings remain available in Team I manage. Earlier unattached
  onboarding links stay available. Framing and photo requirements are expandable.
- Existing upload/replace/remove, framing, polish, restore/approval, retry/help,
  socials, visibility, order, removal and private onboarding tools are retained.
- Unsaved person changes prompt Keep editing / Discard and switch in the page.
  In-flight photo operations lock person switching; tab changes retain framing.
- New drafts clear the prior ID AND optional photo/crop/bio/location/order fields.
  Successful saves keep the exact returned member ID selected. Visibility/order
  saves update the selected draft, preventing a later details save undoing them.
- Lead profile/legacy roster synchronization keeps its existing behavior. All
  member selection and photo editing use the exact member ID, never list index.

## Scope and checks

Base: GitHub `daebc6a60834364e2684693e4bacb4ce47dd6171`, approved branch
`codex/nic-nac-trade-hardening`. Windows primary checkout/unknown dirty files and
protected extension material were not changed. An isolated source copy under
`.codex-worktrees/team-editor` was checked in `/workspaces/team-photo-polish`
in the existing Codespace. No database migration, photo reassignment, automatic
generation, retry-budget change, new dependency or public-site template change.

Focused tests: 144 passing across dashboard, photo framing and exact-photo
identity suites. Browser local synthetic sample verified selector, section
switching, unsaved-details warning (keep and discard), clean new draft, private
onboarding controls, framing retention across tabs, framing save and desktop/
390px phone layout. Console clean in the final local check. No paid images.
Legacy static tests were updated to select a person rather than expect every
editor simultaneously. The first production build caught a nullable callback
type; it was fixed before release. Final build/release receipt is recorded below
in project state/Open Brain after verification.

One native browser confirm stalled the initial local test tab. The new switching
warning is inline instead, visibly tested; existing destructive confirmations
were not changed. Do not treat the stalled tab as a product data failure.

## Reviewer path and limitations

Local: `/nic-nac?section=team-management&conversationId=team-editor-local-review`
on the private forwarded localhost preview. Existing sample mode: no uploads or
provider calls; reload resets sample changes. Do not expose this development mode
as a production authentication bypass. Production uses the normal authenticated
Team Management route. Louis previously explicitly authorized his signed-in demo
in this same session; no credentials, checkout or billing changes are in scope.

Post-release check: choose the retained Photo Test card, confirm photo mapping,
open each section, save unchanged details, switch to the lead/other existing
people and confirm their photos, open Add without creating unwanted live data.
No extra AI generation is needed. Full new-person CRUD, onboarding messages and
outlier hardening are not exhaustively repeated for this UI-only draft.
