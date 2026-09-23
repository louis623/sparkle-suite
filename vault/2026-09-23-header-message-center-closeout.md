# Sparkle Suite header and Message Center closeout — September 23, 2026

## Source and live release

- GitHub `louis623/sparkle-suite`, branch `codex/nic-nac-trade-hardening`, is the source of truth. Work used a disposable clone from the verified remote tip. The persistent Windows checkout and its dirty files were not cleaned or treated as release source.
- Current live application SHA: `d0b604a11206c3ad507d9a81774165d33b2971c7` (test-only follow-up), Ready Vercel deployment `dpl_39HqosSyvNtgyW9DcefskNvsSNxx`. Both `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com` resolve to it; the apex redirects to `www`. The latest customer-visible product change was `ebd49c1ecb288f38293b8a8f63a12d0fe24a8db7`. Git documentation commits after the product deployment are history, not separate releases.
- This was one manual production release per verified product tip. Git push alone did not publish. The existing customer-site aliases moved with the normal Vercel project release; no separate domain or preview lane was introduced.

## What was built

1. The Workspace header replaces the redundant **Team I belong to** chip with **Report a bug**. That button opens the existing Help/Support composer with **Report a problem** selected. Team membership and Team Management data remain intact.
2. The header labels the code **LIVE LINEUP CODE** and provides a Copy control with confirmation. This is a Workspace affordance only; no Live Lineup Chrome extension, pairing, or live-show synchronization code was changed. Louis plans a separate Live Lineup update later.
3. The rep Message Center makes new-rep onboarding/team conversations recognizable and replyable in place, without hunting through My Team. It adds clearer participant/context labels, All/Needs reply handling, search, pagination, and an inbox/detail layout that keeps history and Reply visible together while scrolling independently on desktop.
4. A genuine new inbound reply returns an archived conversation to the recipient's main Inbox. Merely archived threads stay archived until then. System/status, self-sent, suppressed-unread, and pre-archive activity do not reopen it. The one already-unread onboarding conversation meeting this rule was restored without changing its messages or unread count.
5. Control Center has one-to-one owner-to-rep direct messages, separate from broadcast, Support, and Rep Network. Only the interactive Control Center owner session can compose them. Owner messages can include up to three validated JPEG/PNG/WebP images (8 MB each); images use a private bucket, scoped signed reads, staging cleanup, and a stop flag that blocks both sends and upload-ticket creation while leaving reads available.
6. The older unapplied September 18 waitlist service-role migration was found redundant after current production privilege and live waitlist/MCP checks. It was preserved as retired historical SQL and removed from the executable migration queue; it was never represented as applied. The Message Center migrations `20260923002000`, `20260923010000`, and `20260923130000` are applied.

## Verification and limits

- Focused tests, targeted lint, guarded local and Vercel builds/TypeScript checks, migration checks, rollback-only synthetic database trials, and private-route anonymous denials passed at the relevant product tips. A later image-path regression covers staged PNG -> private final object -> direct-message RPC -> attachment readback; three focused suites passed 16 tests. The rollback-only production attachment trial showed rep unread 1, owner unread 0, then zero persisted test messages/attachments.
- Louis expressly authorized his Dudes Fizzfest / `louis@neonrabbit.net` demo Workspace account for the rep-side review. On the exact live `www` domain, Report a bug opened the preselected problem composer; code Copy confirmed; Jane's no-email demo onboarding conversation appeared in the Inbox/Needs reply; an in-place, clearly labeled QA reply saved and displayed, cleared Needs reply, and search found the thread. The visual pass caught a reply-pane scrolling defect; `ebd49c1` corrected it and the live page was rechecked. No real rep was emailed by that QA reply.
- Public `www`/apex roots, health, and representative customer Join routes returned 200 after the latest release. Unauthenticated owner-direct API returned 401. Vercel reports Ready at the exact SHA on both Suite domains.
- **Not yet visually proven:** an interactive Control Center owner-session image send, followed by image receipt/read and reply in an isolated demo rep Workspace, then owner readback. Control Center has an independent username/password session; the authorized rep demo session does not grant owner access. No password, cookie, protected token, or customer message was extracted or altered to bypass it. Automated and rollback-only tests are not a substitute for this end-to-end check. The older broad dashboard test file has four unrelated baseline failures; do not claim the entire repository test suite is green.

## Decisions and lessons

- Keep owner direct messages one-to-one and private, not an extension of broadcasts. Preserve established Support and Team flows; avoid a second hidden reply destination.
- Archive behavior required Louis's explicit product choice. He chose automatic Inbox return on a genuine inbound reply, with non-inbound/historical exclusions.
- A passing API or database smoke does not prove a usable UI: the authorized live click-through found and resolved the reply-pane scrolling problem.
- Existing production behavior and privilege evidence can make a pending migration unnecessary. Retire such SQL with provenance rather than applying it just because it is old, or erasing it without a record.
- Respect the rep Workspace / owner Control Center authentication boundary. Do not infer owner access from Louis's demo Workspace login; keep the final owner-image exchange explicitly unverified until performed through the normal owner session.
- GitHub is authoritative even when a local checkout is dirty. Preserve local state; verify remote branch, exact SHA, deployment, and live aliases before claims or changes.

## Louis follow-up

The authoritative live Sparkle Suite Control Center Task List item is `2baa9931-7787-4594-a838-c2b38d1cd662`, **“Louis: smoke-test header and Message Center updates, including private image send”** (open, owner Louis). Its notes provide the live-domain click-through for the whole release and call out the unverified owner-image send/rep receipt/reply. The earlier onboarding-message bug `b83da8cf-c235-4c62-bd6d-d37e84823a41` is complete after the live demo reply acceptance. Do not substitute this vault note for the live Task List item.
