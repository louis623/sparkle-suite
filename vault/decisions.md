# Decision Log

## 2026-09-08 (ET) - Live Lineup audit precedes implementation

Louis requested a full-system audit before hardening. The completed audit is at
`docs/sparkle-suite/audits/2026-09-08-live-lineup-system-audit.md`. Recommendations
are not implemented decisions: prioritize identity/ordered writes, separate
heartbeat from content changes, then shared customer refresh and operational UI.
Preserve Brittany's grandfathered mapping and number/name-only presentation.
Do not infer authority for live queue/store/account changes from the audit.
Extension implementation remains routed through the authorized Codespace under
`LIVE_EXTENSION_SAFETY.md`; verify installed-store rollout separately from app
and Edge/schema releases. No old-commit reset or unrelated open-item pursuit.

## 2026-09-08 - Brittany's migrated About/media block is public by default

Decision: The September 5 show-night hide is reversed on Brittany's actual
customer-facing site. When Brittany has never made an explicit About-section
visibility choice, the migrated About/media block defaults to visible and the
Workspace switch reflects that state. An explicit later off choice still wins.
Existing copy and portrait may render immediately; optional short-video cards
remain absent while empty.

Reason: Louis clarified that restoring the Workspace controls alone did not
satisfy “unhide.” This keeps the grandfathered site visibly restored without
publishing broken empty cards or changing Brittany's stored customer data.

## 2026-09-08 - Brittany keeps normal site controls plus scoped legacy media controls

Decision: Treat `brittwithbling` as a grandfathered custom tenant, not a new
template or a new tool family. Brittany keeps the standard rep Site Settings,
including theme selection, and receives tenant-only controls for the existing
showcase video, About portrait, three optional short videos, and About-section
publication. Her hero image and “The Rise of Her” remain curated and static.

Explicit media visibility is stored inside the existing homepage-media JSON so
remove and hide actions are durable without a schema migration or deleting the
underlying uploaded asset. Missing legacy media may preload from current public
fallbacks, but an explicit removal always wins. Empty optional video cards do
not render.

Reason: Brittany must be able to maintain her migrated site like any other rep
without exposing the two bespoke brand assets Louis chose to keep fixed or
creating abnormal tools for future reps.

## September 8, 2026 - Consolidated memory closeout

See [session closeout and handoff](2026-09-08-session-closeout-and-handoff.md) for completed welcome/email work, live-show mitigation, final styling, decisions, lessons, and deferred items. Last session-verified app is 48615edf / dpl_GeV9T1ad1sktsRt7VUPr8y6RRvE6; not freshly checked today. This is documentation only. Next session opens Control Center read-only and stands by; no automatic work, sending, credit application, auth repair, or extension changes.

## Latest September 5 release - Brittany button polish

See [button polish closeout](2026-09-05-britt-hero-buttons-closeout.md): app 48615edf / dpl_GeV9T1ad1sktsRt7VUPr8y6RRvE6 on Brittany and Suite apex/www only. Equal hero buttons and matching gold-to-blue gradients, desktop/mobile verified. No live-show behavior changes. Earlier unresolved items remain deferred.

## September 5, 2026 - Live Lineup mitigation and Brittany-only cleanup

See [current closeout](2026-09-05-live-lineup-closeout.md): application 9e96887d / dpl_FZQJFd561g9dtBEv93gjxHb4PgJ9; automatic Live Lineup, clean numbered names, Brittany cards hidden and Dance Floor coming soon. Permanent repair remains in live Control Center Task List e453d5cc-0ac8-4d46-9dab-182a6aa723d7 for a no-live-shows window. Mile High Fizz apex/www release is blocked by existing domain configuration; no DNS changes made. Preserve saved data; do not automatically pursue deferred work.


## 2026-09-05 - Brittany's welcome guide uses her Black Diamond identity

The existing beta welcome Site is Brittany's Sparkle Suite Workspace reading
guide, not a new team rep's private onboarding page. Use her charcoal/gold Black
Diamond identity and plain-English, task-based instructions. Recognize the
familiar customer site and already-configured Live Queue; do not imply she had
the Workspace before or needs new queue setup. Clearly distinguish live in-app
messages from Coming-soon customer campaigns, and beta controls from completed
team-specific Site provisioning. Keep account credentials and meeting links in
private correspondence only. Drafting an email never authorizes sending it.

## 2026-09-05 - TikTok composition and copy preferences

Use full 1080x1920 framing with centered, prominent visuals; a correctly sized
canvas with small left-heavy content is insufficient. Preserve approved brand
and real screenshots. Deliver individual posting-ready files in marketing and,
when requested, verified copies in Downloads rather than only a ZIP.

Post titles should be hooks, not merely labels. Descriptions should be warm,
inviting, roughly a 30-second read, and explain a real customer/show use case.
Rotate angles: simple destination, brand personality, mobile, shopping clarity,
founder offer. Time-sensitive remaining counts must be rechecked before posting;
discount copy must disclose its duration and not imply queue entry reserves it.

## 2026-09-05 - Active build queue and honest founder availability

Position Sparkle Suite as building sites now, with joining the build queue free
of payment. Show only the remaining founder count, never a denominator or fake
timer. Count durable qualifying founder allocations through a read-only aggregate;
queue membership must not allocate or promise the discount. Unknown availability
uses standard pricing. Preserve first12 paid-month discount and setup disclosures.

Public Nic-Nac human questions are append-only inquiries with question-specific
reply consent, not marketing opt-in or queue enrollment. Keep them excluded from
queue-only matching and contact batches; show success only after a saved receipt.

Landing design stays within the canonical brand, uses real product captures and
reduced-motion CSS, and scopes visual changes away from protected application
surfaces. Manual releases must explicitly preserve customer aliases when only
the Suite marketing domains are in scope.

## 2026-09-05 - The approved Kim flyer is the Gnome Forest visual authority

The selected and refined second GofortheBling flyer is the source of truth for
Gnome Forest's friendly red-hatted gnome, rounded brass lanterns, olive forest,
red mushrooms, parchment, burgundy, and warm gold. Reuse or adapt that approved
artwork across Kim's flyer, customer-site skin, favicon, and social-share card;
do not replace it with a stylistically different fantasy gnome or redraw the
identity casually. Keep public text balanced and unobstructed, keep the QR code
large and separate, and mechanically verify its decoded destination.

## 2026-09-05 - Promotional email drafts remain proof-before-send

Sparkle Suite demo emails may use the approved thumbnail as a clickable visual
CTA, but the thumbnail and supporting text link must both resolve to the exact
video. Gmail's actual Compose rendering is the approval surface. Creating or
refining a draft does not authorize sending; the current-rep Live Calendar note
and Kim's surprise flyer note remain unsent until Louis proofs and explicitly
authorizes each send.

## 2026-09-05 - Customer share branding uses stable marks and skin-aware cards

Use a narrowly mapped, stable rep/business monogram for a customer-domain
favicon and let the 1200x630 share card carry the current appearance preset,
business name, approved site copy, and custom domain. For Kim, the stable `G`
mark uses Gnome Forest colors while the card reuses the approved forest,
friendly gnome, lantern, and parchment assets. Do not substitute Sparkle Suite
public branding on `goforthebling.com` or leak Kim's mark to another tenant.

Rasterize any text-bearing runtime mark before release. Local system fonts can
make SVG text appear correct while Vercel's image renderer omits the glyph;
live pixel inspection of `/icon` and `/opengraph-image` is therefore a required
release check, not an optional visual polish step.

## 2026-09-05 - Hero title and subtitle are separate rep-editable settings

Use `hero_headline` for the large first heading and `hero_subtitle` for the
supporting sentence directly beneath it. Label them **Hero title** and **Hero
subtitle** in Site Settings and expose the same names to Nic-Nac. Keep
`tagline` as a separate broader site/footer line; do not overload it as the
only way to change hero supporting copy. An explicit hero subtitle wins over
legacy tenant-specific fallback copy without changing other page content.

## 2026-09-05 - Rename the visible skin to Gnome Forest without changing its ID

The customer-facing and rep-facing name is **Gnome Forest**. Retain
`gnome_garden` and `GG-01` as stable internal identifiers, and accept former
Gnome Garden labels as compatibility aliases. This prevents existing saved
selections and preview links from breaking during the rename.

Louis separately approved activating the preset and approved hero copy for
Kim's exact `goforthebling.com` tenant. That approval did not authorize edits
to her About narrative, media, social/shop destinations, Dance Floor, signup
content, Join access, or other customer data.

## 2026-09-05 - Gnome skin follows Kim's approved second flyer, not a new art style

Use `artifacts/social/kim-goforthebling-flyers/storybook-background-v2.png`
and its second-flyer composition as visual authority. Louis explicitly rejected
an ornate/different gnome style. Match the friendly red-hatted gnome, warm brass
lanterns, olive forest, red mushrooms and parchment. Website assets are
flyer-referenced adaptations, not pixel-identical crops. The flyer is static;
website motion is subtle sway/glow/fireflies with manual pause and reduced
motion, never moving text or intrusive animation.

Keep this a visual preset of Amethyst (`gnome_garden`, GG-01), not a template
fork or behavior rewrite. Browse it through an isolated fixture preview rather
than changing a customer's saved appearance. Do not activate Kim's skin or
advance `goforthebling.com` to a newer deployment without Louis's separate
approval. Finder's separate database/selection list remains unchanged.

## 2026-09-04 - Use the approved Nic-Nac calendar thumbnail as the media baseline

Future Sparkle Suite YouTube thumbnails and related Shorts/TikTok artwork use
the approved light `NIC-NAC + LIVE CALENDAR` thumbnail as a family-resemblance
anchor, not a template that must be cloned. Preserve its warm blush/white
field, large plum serif hierarchy, restrained accent pink, one clear visual
story, generous space, and complete pink S seal with its outline.

Use the repo-local `sparkle-suite-media-creative` skill for this work. Composite
the bundled canonical seal or approved channel avatar rather than asking an
image model to redraw the mark. Any recognizable Sparkle Suite product screen
must come from a real screenshot, recording, or approved demo; generative art
may supply only truthful conceptual or surrounding visuals. Verify current
platform specifications and report final pixel dimensions and file size before
handoff.

## 2026-09-04 - Calendar descriptions are customer-facing show notes

A non-empty `calendar_events.description` is part of the public upcoming-show
card contract, not calendar-export-only metadata. Render it in the shared
Amethyst card between schedule metadata and optional promotional sections, and
use semantic card surface colors so every appearance preset remains readable.
If the description supplied the title fallback because no explicit title was
saved, show it once as the title rather than duplicating the same text as a
note. Keep the behavior in the shared component so Mile High Fizz and every
other Amethyst-based customer site inherit the same fix.

## 2026-09-04 - Team Management and Join hardening supersedes the August 31 link shape

Rocky's approved hardening plan supersedes the August 31 decision that private
onboarding URLs must omit the recruit's name and always use one Suite-owned
host. New private invite URLs use an operator-approved ChatGPT Sites base and a
readable path containing only the new rep's first name, the sending lead's first
name, and the managed-team slug when available; the opaque token remains solely
in `?invite=`. Email, phone, arbitrary paths, unapproved origins, and the retired
personal Britt host are rejected before token persistence.

Public Join and private onboarding remain separate. Targeted Join requires both
`join_team_access_enabled = true` and `show_join_page = true`; null is not opted
in. Business/show identity never substitutes for managed-team identity. Public
team-card deletion is confirmed and permanent while onboarding history retains
its participant record through the `ON DELETE SET NULL` roster reference.

## 2026-09-04 - Gmail signature visual approval is an owner gate

Gmail signature work is not complete merely because an image URL loads, Gmail
Settings shows an image, or one automated Compose preview appears plausible.
Owner visual approval of the full, brand-accurate Compose result is the
acceptance gate. Use only the approved original brand asset or a faithful
derivative made from it. In particular, Neon Rabbit uses the canonical
multicolor badge; never use a white/monochrome rabbit surrogate.

## 2026-09-04 - Never approximate the Sparkle Suite email logo

For Sparkle Suite email signatures, use the real approved exported logo asset
or exact established source—not a newly drawn approximation of the `S` seal or
wordmark. A successful image response or attachment upload is not visual
approval. Validate the actual Gmail rendering before calling a signature ready.

The provisional signature route in `6e5a553e` is intentionally not a release
candidate because Louis rejected its visual result. Do not deploy it. The
assigned mail owner should replace the draft signature only after the canonical
asset is located and checked against the familiar mark.

## 2026-09-03 - Customer crawl files are tenant-aware app routes

Decision: Serve customer-domain `sitemap.xml` and `robots.txt` from
request-aware Sparkle Suite app routes, alongside the existing tenant-aware
`llms.txt`. Never use a shared static external sitemap/robots deployment for
customer domains. The sitemap contains only the rep's real public routes; the
robots file names that same domain sitemap.

Reason: A shared static SEO rewrite served Sparkle Suite prelaunch URLs and
demo identity to customer domains. Tenant-aware files keep search and AI
discovery aligned with the public customer site.

## September 2, 2026 - Production provenance uses direct hostname resolution

For a held-domain manual Vercel release, verify each intended hostname with a
direct deployment inspection after assignment. A deployment's cached alias
array can retain stale aliases, so it is supporting evidence only—not proof
that a domain has moved or stayed put. Keep the replacement deployment and
the protected customer-domain deployment as separate provenance records.

For synthetic smoke cleanup, use the normal app-owned confirmation control.
Even when the reviewer account is safe, do not treat a model request as enough
authority to cancel a test record: obtain Louis's explicit scope and verify
the persisted result after reload. This preserves the same approval boundary
used for ordinary reps and leaves recoverable audit history.

## September 2, 2026 - Bounded migration verification and optional tool contracts

Louis authorized a temporary Responses-only Suite test key with a $3 total
cap and revocation afterward, plus replacing only the deficient reviewer
token with a strong secret. Working OpenAI keys and unrelated unused projects
remain untouched. Keep Suite/Finder policy reporting independent during the
Suite-only model migration.

Model replays proved implicit Responses strict-mode normalization could force
optional tool fields with either model. Set generation strictness explicitly
without relaxing runtime Zod validation or approvals. Require timezone-explicit
Calendar tool timestamps before execution. These are application contracts,
not phrase routing, workflow steering, or automatic replay after tool start.

## September 2, 2026 - Prefer a controlled Terra migration now, not after growth

Louis's timing decision is to pursue GPT-5.6 Terra now while there are fewer
reps and operating savings matter. Scope the change to Nic-Nac's human-default
policy at medium reasoning. Do not simultaneously lower reasoning, replace
other model tiers, rewrite prompts/tools, restore legacy routing, or add the
separately unauthorized scheduled canary. A real-model regression gate and
explicit GPT-5.4 rollback remain required; deterministic tests alone do not
prove Terra's customer-facing behavior. The prepared local change is not yet
released because current runtime credentials are write-only and unavailable
to the approved local replay runner.

## September 2, 2026 - Pressure-test the live agent; do not turn it back into scripts

**Positive smoke testing is evidence, not the finish line.** Continue to test
the released ToolLoopAgent with ordinary, unscripted rep language and genuine
mid-conversation task switches. New failures should be diagnosed from the
actual production route, model/tool trace, and visible output.

**Keep the division of responsibility.** The model decides what the rep is
trying to accomplish among its permission-scoped capabilities. Application
code enforces authorization, validation, approvals, tenant isolation,
idempotency, timeouts, and bounded recovery. Do not respond to pressure-test
failures by restoring regex intent routing, sticky tool packs, or hidden
workflow steering.

Reason: Louis's early internal-demo smoke is materially better after removing
the legacy path. The durable goal is a capable live-show coworker, so further
hardening must improve real flexibility without reintroducing the architecture
that constrained it.

---

## September 1, 2026 - One production Nic-Nac, with no silent legacy fallback

**The ToolLoopAgent is the only production conversation orchestrator.** The
legacy handler and rollout gate are retired from the application tree. Rollback
uses an explicit known-good Git/Vercel release, not a hidden per-request fork
that can leave the owner testing the wrong product.

**A successful blank turn gets one safe retry before tool execution.** This is
an execution-boundary reliability rule for every kind of request, not a phrase
router. Once any tool begins, the turn cannot be automatically replayed, which
protects writes and outbound side effects from duplication.

Reason: the new agent code had passed its tests and was deployed, but the
default-off fork still sent real production traffic to the legacy handler. A
feature that Louis cannot reach is not released, and a fallback that silently
changes architectures makes production evidence misleading.

---

## September 1, 2026 - Empty safe reads recover at the execution boundary

**Natural punctuation differences are not different jobs.** Calendar reads
must accept ordinary contractions with straight, curly, or omitted
apostrophes. This recognition can pin an unambiguous read, but it must never
turn an add, update, cancel, or other mutation into a read.

**A zero-output provider turn may not erase a safe Calendar job.** The model
and normal tool loop remain the primary path. Only after the stream finishes
with no renderable answer and no `list_my_shows` result may the application run
that read-only tool itself and render the same grounded summary. The recovery
must be tenant-scoped and appear in tool, run, and incident telemetry. If the
read fails, say so honestly and claim no change.

**Do not mistake this safety net for the complete catalog-pressure solution.**
The legacy route still exposes a large tool catalog, and the default-off agent
still uses automatic tool choice. Before broad agent rollout, prove a general
no-empty-turn contract across representative safe reads and evaluate model-
native deferred tool loading or an equivalent capability design without
reintroducing phrase routing or sticky tool packs.

Reason: the live failure combined a punctuation-sensitive recognizer with a
known provider zero-token edge. Fixing only the exact phrase would leave the
same blank-turn failure mode intact; replacing model reasoning with more
scripts would recreate the original architecture problem.

---

## September 1, 2026 - Continuity is inert facts; agent tool arguments are authoritative

**A saved workflow may provide facts but may not present itself as the current
job.** Model-facing continuity contains collected and missing facts only. The
new harness does not implicitly hand an unrecognized turn to whichever
workflow was most recently active; only a recognized immediate answer or an
explicit current request may update that workflow.

**A ToolLoopAgent write uses the validated arguments the model actually
selected.** `add_show` must not silently repair or rewrite recurrence from old
Calendar state or phrase extraction after tool selection. Legacy reconciliation
is retained only on the rollback route.

**Do not shrink the catalog with another wording router.** Direct SMS/email
sends are temporarily absent from the default harness. Reintroduction requires
a deliberate capability design; it will not be driven by regex wording. Keep
the six-step default until a real recorded job proves it insufficient.

Reason: these choices remove the remaining sources of hidden steering while
keeping application-owned validation, approval, tenant isolation, and workflow
facts intact.

---

## September 1, 2026 - The agent reasons; deterministic code guards execution

**The new Nic-Nac harness does not expose the legacy regex Calendar resolver.**
The model receives the real permission-scoped Calendar tools and chooses among
them from the current conversation. The resolver remains available only to the
default-off legacy rollback route until that route is deliberately retired.

**Durable workflow state is recoverable data, not a hidden conversational
state machine.** Keep facts bounded, valid, explicitly untrusted, and resumable;
do not let old workflow state choose the next tool. Passive replies may flow to
the most recently active workflow only. The disconnected scripted task reducer
was removed because test-only state machinery is not runtime evidence.

**Approvals are canonical capabilities, not client assertions.** Accept a
response only when its message, approval, tool, call, and input exactly match
the last server-issued request. Resume through the actual agent/tool loop so
success, failure, and follow-on work remain truthful. Destructive removals and
replacement of a different active show session require visible approval; show
replacement also requires an exact active-session guard.

Reason: Nic-Nac needs model-level flexibility at the conversational layer and
deterministic enforcement at the mutation boundary. Mixing those roles caused
the sticky, scripted behavior Louis reported and allowed tests to pass without
proving the live agent path.

---

## September 1, 2026 - Dedicated support identity and least-privilege custom-domain access

**Nic-Nac Support is a distinct, attributable operator identity, not a shared
owner session.** Its authorization is intentionally limited to the
customer-site support surface. Billing, Stripe, account control, and owner
authority remain unavailable.

**A delegated registrar role must include the explicit DNS capability before a
custom-domain migration continues.** Viewing a domain or accepting a manager
invitation is not permission to alter Host Records. Until that narrow access
is granted, do not change DNS, nameservers, ownership, registrant contacts, or
customer-domain mappings. After access arrives, inspect first, make the
smallest necessary change, retain the customer's ownership, and prove the
resolved custom-domain content and routes before completion.

Reason: Attribution and least privilege keep support activity auditable and
limit blast radius. Registrar delegation labels are not a safe substitute for
verified DNS authority, and a successful-looking command without a readable
result is not deployment or domain evidence.

---

## September 1, 2026 - Transparent support ends by operator choice, not a timer

**An active disclosed support session has no product time limit.** It remains
active across lengthy work and navigation until the operator explicitly uses
**End support access**. Do not reintroduce countdowns, sliding expiration,
background expiry jobs, or timestamp-based mutation denial as convenience
features.

**Safety is enforced by identity, capability, transparency, and deliberate
closeout.** Keep the exact operator/target binding, one-open-session guards,
CSRF credential, prohibited financial/account-control areas, visible banner,
rep start/completion notices, explicit change summary, and append-only audit
history. Authentication may still require the operator to sign in again, but
that does not silently close the support session.

**Legacy expiry data is historical evidence only.** Existing timestamps and
expired statuses remain readable for old sessions, but `expires_at` is nullable
for new sessions and must never control access. Automatic-expiry compatibility
RPCs must remain harmless.

---

## August 31, 2026 - Background refreshes must preserve Nic-Nac drafts

**Treat a support session as changed only when its stable identity changes.**
Expiration clocks, polling responses, unread-count refreshes, and other parent
rerenders must not restart Nic-Nac conversation initialization. Effects that
own conversation identity must depend on primitive session or conversation
IDs, not wrapper-object identity.

**An unsent composer draft is protected local UI state.** Background refresh
verification must include typing through at least two refresh intervals and
asserting that the value and focus remain intact. Server-response smoke alone
does not prove the rep can successfully compose a request.

---

## August 31, 2026 - Team onboarding links use a Sparkle Suite-owned host

**Use one Sparkle Suite-owned onboarding host with a managed-team path.** New
Rep Onboarding remains hosted through Codex Sites, but its public address must
not contain Louis's personal Sites workspace identifier. The durable pattern is
`onboarding.yoursparklesuite.com/<team-slug>?invite=<opaque-code>`.

**The team owns the readable portion; the invite owns access.** Normalize the
managed team name to a URL-safe slug (dropping a leading “The” for readability)
and use a cryptographically opaque per-participant invite code for distinction.
Never put a new rep's name, email, phone, or other personal information into
the link.

**Generate the address only from trusted server-side team data.** Team
Management must ignore any caller-provided base URL. Keep the older Codex Sites
origin in CORS while invites using it remain valid, then retire it only after a
separate migration/expiration decision.

---

## August 31, 2026 - New Rep Onboarding uses one progressive path and Nic-Nac first

**Show one journey, reveal depth when the rep asks for it.** The six durable
progress steps are both the overview and the detailed guide. Each step expands
in place, while supporting tips and supplies stay collapsed until needed. Do
not add a second manual that repeats the same sequence.

**Nic-Nac is the first line for routine onboarding, not a replacement for
official support or Brittany.** Curated answers should cover the common setup,
training, supplies, shipping, returns, replacements, privacy, and income-claim
questions that create avoidable team-lead work. Rule-sensitive answers must
point to current official Bomb Party material. Private account data stays out
of the guide, and an unknown question is prepared for the rep to review rather
than silently sent to Brittany.

**Keep all useful material without putting it all on the first screen.** Supply
examples, official links, safety reminders, and step details remain available,
but concise headings and closed disclosure panels protect a new rep from the
technical-manual effect.

---

## August 31, 2026 - Onboarding Nic-Nac is scoped guidance with deliberate handoff

**Nic-Nac answers from the onboarding guide, not from an unrestricted model.**
The standalone New Rep Onboarding Site uses curated answers and section links
for common setup questions. This keeps the helper predictable, cost-free, and
aligned with the same official-source hierarchy as the guide.

**Escalation prepares; the participant sends.** Unknown or sensitive questions
populate the existing Ask Brittany composer so the participant can review the
wording and deliberately send it. Nic-Nac must never silently contact Brittany,
claim that a handoff occurred, or collect passwords, verification codes,
banking data, government IDs, or other sensitive information.

**Supply links are optional comparisons, not a prescribed purchase cart.** The
historical Amazon examples may remain as convenient starting points only when
the Site labels them by timing, encourages use of suitable items already owned,
and tells reps to confirm uncertain or expensive purchases with Brittany.
Availability, price, seller, and current Bomb Party requirements may change.

---

## August 31, 2026 - New Rep Onboarding is layered, source-aware guidance

**Keep the six-step overview, put depth behind it.** A new rep should be able
to scan the whole path first, then open detailed instructions one step at a
time. The six existing progress IDs remain the durable contract so a content
upgrade does not discard participant state.

**Official sources control; Brittany supplies current team practice.** Bomb
Party University and current official policies govern training, account,
payment, shipping, return, and income information. Brittany may add current
team workflow and practical coaching. The Site organizes those sources and
routes uncertainty to Brittany; it must not silently elevate historical team
examples into current policy or promises.

**A richer guide must keep privacy and spending guardrails visible.** Do not
collect passwords, verification codes, banking details, government IDs, or
other sensitive account information in the team thread. Recommend supply
categories and readiness checks, not unnecessary purchases or unverified
vendor/pricing claims.

---

## August 30, 2026 - Public Team Card photos use staged, rep-confirmed uploads

**A profile-photo upload is not the same as publishing a card.** The team lead
must first save or download the team member's image, confirm they have
permission to publish it, upload a supported file, review the square preview,
and then deliberately save the public card. Uploading alone must never create,
update, or expose a roster card.

**Use durable Sparkle Suite media, not TikTok page hotlinks or manual photo
URLs.** Accept JPG, PNG, and WebP files at 3 MB or less and store them in the
existing rep-scoped public site media bucket. The browser and API must enforce
the same validation. The 3 MB ceiling is intentional because base64 transport
must remain below Vercel's 4.5 MB request payload limit.

**Keep the beta boundary intact.** The upload API requires paid Workspace
access plus the existing Team Management entitlement. Transparent support may
assist through the audited `team.manage` gateway, but the feature is not copied
to Kim or future reps as ordinary customer parity.

---

## August 30, 2026 - Join Team is explicitly provisioned early access

**Join Team is not ordinary customer parity.** It stays unavailable by
default, even when a customer has enabled the ordinary page preference. An
operator-provisioned entitlement is required at every public entry point and
in Workspace presentation; direct URLs must not bypass it. The approved first
cohort is Lindsey, Heather, and Brittany. Future customers, including Kim,
remain on a clear **Coming soon** state until explicitly admitted.

**Team Management is separately controlled.** Its unavailable state must not
suggest a paid upgrade or checkout path. Brittany's `manual_beta` entitlement
is independent of the Join Team cohort and remains untouched.

---

## August 30, 2026 - Membership-team identity is a shared customer-site footer contract

**Team membership and team management remain separate identities.** The saved
**Team I belong to** value is the upline/member identity and appears in the
customer-facing footer. **Team I manage** continues to drive recruiting,
Join Team ownership, and New Rep Onboarding. One must never be used as a
fallback for the other.

**Every Amethyst customer page must honor the same footer identity.** Homepage,
Dance Floor, and Join Team all consume the same optional membership-team value
and render the same `Proud member of the {name} team` line. New skins and future
accounts inherit this through shared template data mapping rather than
customer-specific profile code or static name lists.

---

## August 30, 2026 - Workspace parity excludes special entitlements, and Nic-Nac personalization is subject-aware

**Customer Workspace parity means ordinary product access, not copying every
account-specific flag.** Kim's active onboarding trial provides the same
ordinary Workspace surface Brittany receives through her subscription.
Brittany's `manual_beta` Team Management entitlement is a deliberate special
beta and must not be granted to Kim merely to make the accounts look identical.
Incomplete onboarding steps remain incomplete until Kim actually completes
them.

**One durable source must render an assigned Live Queue code everywhere.** The
Workspace header and Live Queue tool may present the existing assignment, but
support access must never create or rotate it. A second nullable profile source
must not contradict the authoritative setup-state read.

**Plain conversation should not evaluate the full Workspace tool catalog.** If
there is no routed product intent or active workflow, Nic-Nac's first model
step uses `toolChoice: none`. Routed optional work remains `auto`; required and
workflow work retains pinned or required tools and the existing approval gates.
The visible empty-output guard stays as a last-resort customer-safe recovery,
not as the expected answer path.

**Rep-name personalization uses the subject's sanitized profile data.** Simple
greetings are deterministic so `Hello` reliably receives the rep's natural
given name. During later work, Nic-Nac may use the name occasionally for a
professional personal touch, but not in every reply or mechanically. In
transparent support mode the subject rep is addressed; the operator is never
substituted.

---

## August 30, 2026 - Onboarding readiness requires a usable account and live site

**Classification and setup progress are not readiness evidence.** A real rep
can be correctly classified as `customer` and marked `dashboard_unlocked` while
their onboarding trial remains pending and their Sparkle Suite public-site slug
is absent. Those states must be verified independently.

**A scheduled onboarding walkthrough has an explicit readiness gate.** Before
closeout, confirm the intended Workspace subscription or onboarding trial, the
reserved `yoursparklesuite.com/{showname}` slug, prepared site settings, live
Home/Dance Floor/Join routes, and the Control Center customer-site/support
actions. Unknown personal content remains for the rep to supply during
onboarding.

**Pre-meeting trial activation is a narrow repair, not billing.** When Louis
explicitly needs to proof an already-prepared account before the rep's first
sign-in, only the exact existing pending onboarding trial may be activated.
Do not create a subscription, Stripe object, checkout, or charge as a shortcut.

---

## August 29, 2026 - Customer status is durable metadata, not a name whitelist

**A real approved rep is classified as a customer from account creation.** The
classification does not wait for required setup, billing, a subscription,
customization, or a public-site slug. The current customer roster is Heather,
Brittany, Kim, and Lindsey.

**Demo status must be explicit.** Reviewer, smoke, sample, test, and internal
demo creation paths must persist `demo`; ordinary operator-led and self-serve
onboarding persists `customer`. Control Center reads this durable field and
must not infer classification from names, emails, domains, slugs, setup state,
or payment state.

**Onboarding closeout includes placement verification.** The reusable rep-
welcome skill must confirm the stored classification and verify that a real rep
appears in Customer Database before the account package is called complete.

---

## August 29, 2026 - Operator support is transparent delegated access, not impersonation

**Support access uses an independent actor/subject session.** The operator is
always Louis's currently authorized Control Center identity and the subject is
one frozen eligible rep. No rep password, rep Auth cookie, hidden impersonation,
or target switching is permitted. Sessions are short-lived and end on expiry,
revocation, or target ineligibility.

**Disclosure and audit are part of authorization.** The exact rep must receive
a start notice before activation. Session history is durable even for read-only
work, mutations require an attempted audit before dispatch, uncertain outcomes
cannot be acknowledged as success, and completion produces a rep-visible notice
and history record. Support access without those controls is not an acceptable
fallback.

**The gateway is deny-by-default and the support surface is the real rep
Workspace.** Existing rep routes do not accept Control Center identity
directly. Explicitly reviewed route/method/capability combinations run inside
the frozen support request context, and the normal Workspace UI is reused so
Louis can assist through the same features and navigation as the rep. A
support-only shortcut dashboard is not acceptable.

**Only financial and account-control mutations are intentionally unavailable.**
Billing, payment, subscription, wallet funding, authentication, security, and
ownership changes remain outside support access. Their useful summaries may be
read. Existing Live Queue codes may be viewed but not created or rotated.
Provider callbacks and the rep's ordinary Nic-Nac conversation history remain
isolated. Normal setup, customer-site, customer-record, inventory, calendar,
team, Message Center, outbound, export, analytics, resource, and session-
isolated Nic-Nac work is available and audited.

**Ordinary rep and customer behavior remains unchanged.** Support-specific
behavior activates only on the separate Control Center support URL and explicit
gateway. Public customer sites remain publicly viewable; edits must occur in an
active disclosed support session.

---

## August 29, 2026 - Rep onboarding is a reusable, component-based package

**A small verified intake starts onboarding; it does not grant blanket
authority.** The rep's identity, supplied details, product readiness,
promotion, schedule, and fulfillment state are verified first. Account
preparation, public guide, email draft, Message Center welcome, payment link,
and fulfillment are separate components, activated only when Louis asks for
them.

**The public starter guide is educational and self-paced.** It helps a rep
understand the Workspace, customer-site customization, Live Queue, Nic-Nac,
and available help. It must never expose private credentials, codes, address,
or billing link, and its checklist is local-device guidance rather than proof
of actual account setup. Deferred capabilities are moved into visibly labeled
Coming soon cards.

**Credentials and communications retain independent gates.** Default welcome
email output is a verified unsent HTML draft. A Message Center welcome uses the
Control Center composer, exact-recipient preview, and final publication
approval. A password, private Live Queue code, address, payment link, meeting
link, checkout, or money movement needs its own specific authorization before
transmission or publication.

**Welcome-site changes remain separate from the main application release.** A
rep guide deploys through its dedicated Sites project after explicit public
authorization and page QA; it does not trigger a Sparkle Suite application
deployment or a change to the protected Live Queue extension.

---

## August 28, 2026 - Grok Bot gets one Sparkle Suite Control Center MCP

**Remy, Nic-Nac, Hale, and Sam share one Sparkle Suite MCP and one service
credential.** Grok Bot persona instructions describe intended use, but real
enforcement belongs in the MCP and the human Control Center approval flow. Do
not create per-agent Sparkle connectors, OAuth grants, API keys, or broad write
switches.

**The existing Sparkle Comms server is extended in place.** Retain its endpoint
and Bearer connect-card pattern so the existing card can be updated rather than
duplicated. The broken `user-Sparkle Suite` OAuth connector is not an
authentication dependency and must not be repointed or repaired as part of
this integration.

**Read-only is the default; one approved Support reply is the only live
write.** Waitlist and operator-health tools may read only the approved bounded
fields and counts. Support sending still requires a current, exact, one-time
approval in Control Center. Broadcast publication, report or lead status,
profiles, private unreported Rep Network conversations, attachments, money,
DNS, deployments, and production configuration remain unavailable.

**A health finding is an alert, not authority to fix.** Hale may read and
surface operator-health flags, but Codex does not begin a production fix or
mutation until Louis approves the finding.

---

## August 27, 2026 - Open Brain and vault require dual recording

**Open Brain is the durable cross-session diary; the repository vault is the
agent-readable project record. They are separate systems and neither replaces
the other.**

When Louis requests an Open Brain log or lock, agents must capture it with the
actual Open Brain MCP and verify success. Meaningful information for future
agents must also be recorded in the relevant vault files. Meaningful session
closeouts, decisions, lessons, blockers, verification, and next steps should
normally be written to both systems; a session is not closed until both writes
are confirmed. Do not record secrets or credentials in either ordinary Open
Brain entries or Git-tracked vault content.

---

## August 28, 2026 - GrokBot GitHub access is narrowly read-only

GrokBot's future GitHub access is limited to the single repository
`louis623/sparkle-suite`, using a fine-grained token with read-only Actions,
Contents, Issues, Metadata, and Pull-request permissions. It receives no write,
administration, secrets, deployments, webhooks, or workflow-change access.

Louis explicitly chose no expiration for this operational agent token. The
token must still be generated only with explicit action-time approval and its
value may appear only in GrokBot's masked connector field, never chat, source,
Open Brain, or the Git-tracked vault.

---

## August 25, 2026 - One repository, two isolated applications

**Sparkle Suite remains the root app and Sparkle Finder is contained at `apps\finder`.**

The repository move does not create an npm workspace, shared package graph,
shared auth system, shared database, shared deployment, or runtime import
relationship. Each app continues to build and test from its own package root.
Git commits and pushes happen from the shared Sparkle Suite repository root.

**Finder deploys from its nested application root without sharing production.**

After explicit release approval, Vercel project `sparkle-finder-dev` was linked
to `louis623/sparkle-suite` with Root Directory `apps/finder` and production
branch `codex/nic-nac-trade-hardening`. This does not combine Vercel projects,
domains, environment variables, authentication, databases, or runtime imports.
The former standalone Finder repo and pre-relocation deployment remain rollback
evidence.

---

## August 23-25, 2026 - Team identity and dancer variant/quantity rules

**The team a rep belongs to and the team a rep manages are separate facts.**

`member_team_name` identifies the team/upline the rep belongs to and may appear in the Workspace header and public-site membership copy. `team_name` identifies the rep's own managed team and is edited from Team Management; it personalizes Join Team and New Rep Onboarding. A rep may belong to somebody else's team while simultaneously managing their own. Managed-team identity does not belong in the Workspace header.

**Team onboarding must be tenant-specific, never Brittany-specific.**

Join Team, New Rep Onboarding, participant messages, and fallbacks resolve from the managing rep's saved team/business identity. Do not use Brittany, Britt With Bling, or Diamond Peak Society as general defaults. Public team cards support Whatnot alongside the existing social destinations.

**Do not invent a Bomb Party item-number suffix for a stone/color deviation.**

The external item number remains the Bomb Party number. Sparkle Suite's internal identity uses the exact catalog `design_id` plus normalized variant facts such as main stone/material. Item number alone is therefore not unique. The customer UI should distinguish the variant with human-readable stone/material, while legacy technical identifiers remain internal.

**Different variant means separate dancer; identical physical copy means quantity.**

Two pieces with the same item number but different stone/material/photo identity are separate dancers. Two truly identical physical copies owned by the same rep are one dancer with `quantity_available`. Quantity changes must be atomic and idempotent: a fresh intentional mutation increments; replaying the same rep-scoped key returns the prior result without another increment.

**Catalog facts and listing presentation have different scopes.**

A canonical catalog correction affects every user of that exact design. A rep-owned listing may have its own customer-facing photo and quantity. Nic-Nac must carry the exact selected `designId` through Jewelry Library, API, and service layers and validate item/material/stone agreement before mutation; it must not silently fall back to the first matching item number.

**Legacy `RBP` is a supported necklace prefix.**

Older genuine Bomb Party inventory cannot be rejected solely because a narrow modern-prefix allowlist omitted `RBP`. Prefix validation should aid identification, not erase legitimate legacy inventory.

**Public inventory is complete and progressively rendered.**

The server/template must provide every available dancer for the targeted rep. Search, filters, and client paging may limit what is rendered at one moment, but a fixed server query cap must not make valid inventory disappear from customer view.

**Nic-Nac must describe backend failures truthfully and resume durably.**

Storage, database, workflow, and photo-understanding failures are distinct. Do not tell a rep to take a closer photo when the save failed on the backend. Persist classified failure context, retain exact variant inputs, use durable conversation rollover, and clear client retry keys only after refreshed state is known.

**Production release metadata must remain exact even when deploying a clean detached worktree.**

For manual Vercel releases, provide the verified allowlisted branch, repository owner/slug, and exact commit as deployment-scoped metadata so `scripts/check-active-branch.mjs` passes honestly. A local Vercel prebuilt-packaging failure after a successful Next build is not permission to bypass provenance; use the normal remote builder, verify the exact deployment ID and all aliases, and inspect post-release logs.

**Real accounts are not acceptance-test infrastructure.**

Variant, quantity, retry, and public-visibility checks use rollback-only database transactions and the dedicated reviewer persona. Do not use Louis's protected internal demo account or Heather/customer accounts to work around the authenticated browser-runtime limitation.

## August 24, 2026 - ThumbAPI and Lemon Squeezy attribution

**ThumbAPI is part of the Some Dude + AI YouTube workflow, not Sparkle Suite.**

Future billing or tooling questions about `ThumbAPI`, `Thumb API`, or a `Lemon Squeezy` charge should be traced first to the `Some Dude + AI` / `AI Hustle Dashboard` YouTube-thumbnail flow in `C:\Users\louis\kalshi-repo`, not to Sparkle Suite repositories or Sparkle Suite Stripe billing.

**The relevant rollout window is July 22-24, 2026.**

Open Brain / Codex session evidence in that date range ties ThumbAPI to the shipped YouTube thumbnail generator workflow and shows active credit usage there. Treat late-July charges carrying a ThumbAPI or Lemon Squeezy descriptor as presumed related unless newer billing evidence disproves it.

## August 22-23, 2026 - responsive customer browsing and one resource hub

**Keep sticky customer chrome on desktop, but let it scroll away on phones and tablets.**

The public Dance Floor's desktop header and controls remain sticky. At `<=900px`, the customer header, announcement/live-queue stack, drawer, and filters must participate in normal document flow. The mobile goal is to reveal dancers promptly, including on foldables and tablets; it is not to compress several persistent bars into a smaller viewport.

**Resource publishing is a Blog-or-YouTube choice, not a metadata workflow.**

The Control Center Resource Publisher presents only Blog/Video plus optional title, summary, content, or YouTube URL. Storage may create safe fallback identity fields where the schema requires them, but empty author fields must not produce empty rep-facing sections. Uploaded thumbnails, categories, featured state, and “what changed” are intentionally omitted. A supplied YouTube URL uses the provider-derived thumbnail; an omitted URL is permitted but naturally has no watch link or provider image.

**Help and learning share one Workspace destination.**

The single Tools destination is **Resources & Help**. Its Learn tab holds compact Blog/Video tiles, and its Help tab holds operational guides and support. Keep legacy `help-resources` links functional by mapping them to Help; do not recreate two competing top-level resource areas.

**Treat Control Center and Workspace as separate authenticated products.**

`/control-center` is the operator surface and `/nic-nac` is the rep/customer Workspace. Opening or inspecting one cannot establish that the other is open or authenticated. Browser acceptance must use the synthetic reviewer path when it is available; no Louis or customer account workaround is authorized.

---

## August 22, 2026 - Dance Floor language and training are one product contract

**Use Dance Floor for the surface, dancer for the jewelry, and trade for the exchange.**

This vocabulary applies across rep and customer UI, public pages, accessibility text, Help & Resources, and Nic-Nac responses. Stable technical identifiers may retain legacy names when changing them would risk routes, APIs, persisted data, or integrations, but those names must not leak into active product copy.

**Written and video training follow the same mobile-first easy-button path.**

The canonical dancer-intake sequence is: start **Add dancer** or ask Nic-Nac; provide an item number or readable identification tag; provide the clear photo customers will see; provide ring size when applicable; answer only missing questions; review; and confirm. Identification evidence and the customer-facing dancer image are separate inputs. Copy changes should close a real comprehension gap, not rewrite working instructions for novelty. The companion video should show one complete example from a phone, mirror the guide's words and order, end on the visible Dance Floor result, and remain concise.

**Birthday Collection corrections update canonical catalog identity.**

When an item's collection month/year is wrong, correct the underlying catalog association and verify item number, product name, and target month/year together. Do not treat it as customer-birthday data or merely patch a rendered label. The confirmed corrections from this session are `NK12032` / **Glowing Up Glam** to **January 2026** and `ER97948` / **The Curve That Waited** to **November 2025**.

---

## August 22, 2026 - Authentication and payment are separate actions

**Signing in must never open or create Stripe checkout.**

Louis provisions each approved rep account first. The rep then signs in to the already-created workspace, which starts the fixed five-day access period on the first successful sign-in. Subscription checkout is a deliberate rep action from **Account** inside Sparkle Suite after the rep reviews and accepts the terms. Expiry or payment-required state may restrict the workspace, but it must not redirect to Stripe or create checkout merely because authentication succeeded.

**Google authentication does not establish Sparkle Suite eligibility.**

Google must show an explicit account picker. After Google authenticates an email, Sparkle Suite must independently verify that Louis provisioned a valid rep workspace. A missing identity—or an incomplete legacy onboarding row with no operator trial—must be locally signed out and shown **“No Sparkle Suite account is associated with this email.”** Normal login must not create a rep, trial, pricing reservation, or checkout session. Password login follows the same eligibility rule. Active protected/internal accounts remain valid without being forced through trial or checkout.

---

## August 22, 2026 - Workspace tool availability is broader than tool prioritization

**Every normal rep tool remains available on every authenticated Nic-Nac workspace turn.**

Latest-text and durable-workflow routing still determine which action is relevant and whether a tool call must be pinned, but they no longer decide whether an otherwise authorized capability exists on that turn. This lets a rep change from Dance Floor work to Calendar, site, customer, resource, or other supported work anywhere in a chat without losing tools after a short correction or answer.

Availability does not expand authority. Required setup keeps its restricted tools; non-workspace product contexts remain blocked by product policy; tools remain bound to the authenticated rep; service validation, row-level protections, and approval dialogs remain authoritative. A tool that is merely available must not hijack an unrelated routed workflow.

---

## August 21-22, 2026 - Live Queue public status language is audience-sensitive

**Customer-facing wording must describe the current experience, not the connector’s internals.**

- Fresh connected queue: **“Live Queue connected and ready”**.
- No queue yet: **“Live Queue will open closer to the next show.”** This intentionally does not promise a queue only at show start, because reps may open it early for pre-orders.
- Delayed synchronization: **“Live Queue is waiting for an update.”**

Do not show “stale,” “stale link,” or similar technical/failure language on public customer sites. Operational diagnostics can retain accurate technical state internally, but public presentation should be calm and actionable.

---

## August 21-22, 2026 - Clearing Nic-Nac is rep-scoped, not tab-scoped

**A Clear Conversation action retires every active persisted Nic-Nac thread for the authenticated rep.**

The client-held conversation ID cannot be treated as the sole source of truth: restored tabs or multi-device use can leave another active thread that later wins the latest-conversation lookup. Mark active rows cleared for the authenticated rep, retain rows for audit continuity, and exclude cleared threads from latest lookup and hydration. This prevents old history from returning after a future sign-in without deleting operational records.

---

## August 21, 2026 - Control Center Task List is the operational source of truth

**Use the live operator list, not Open Brain, for active work tracking**

When Louis says “Task List” or “bug tracker,” add or update the active durable list in the live Sparkle Suite Control Center. `vault\\open-items.md` is a separate project-memory backlog and must not be substituted unless he explicitly requests that document. The visible Control Center label is **Task List**.

## August 21, 2026 - Gmail identity gate and GoDaddy handoff boundary

**Verify mailbox identity before every email operation**

Use Gmail only after `get_profile` confirms `louis@neonrabbit.net`. Do not use `louischapman1@gmail.com` as a substitute and do not spoof the From address. The intended connector is now correctly attached; an unsent Brittany GoDaddy-instructions draft exists and may be edited or sent only with Louis's explicit instruction.

**Delegate access assists preparation; Brittany keeps ownership approval**

Brittany should invite **Louis Chapman** (`louis@neonrabbit.net`) as a GoDaddy **Domains Only** delegate with transfer actions. Delegate access is persistent after acceptance until the owner changes or removes it; pending invites expire in 48–72 hours. A delegate cannot accept an incoming GoDaddy domain transfer for the account owner, so Brittany must complete final approval herself. Louis has manually confirmed existing DNS-management access for `BrittWithBling.com`.

---

## August 18, 2026 - In-app browser failure is not a user-restart problem

**Preserve the requested browser surface while the runtime is broken**

The Codex in-app browser is the required surface when Louis asks to open Sparkle Suite in Codex. On August 18, the bundled Browser plugin changed from `26.810.52044` to `26.814.41407`, and bootstrap then failed with a trusted-RPC dependency path error for `browser-service.mjs`. Louis had already restarted the computer before the retry. Do not reflexively ask for another restart, do not fall back to Chrome, and do not bypass the problem by using Louis's or a customer’s authenticated session. Investigate the Codex/plugin trusted-path lifecycle and resume the requested in-app-browser action only when that surface reconnects.

---

## August 17, 2026 - Hobby-safe Message Center dispatch

**Immediate best effort plus durable daily recovery**
Vercel Hobby permits only daily cron schedules. Customer signup and resource publication therefore schedule a bounded outbox worker with Next `after()` after the successful HTTP response; this keeps the business mutation non-blocking while normally delivering promptly. The outbox remains authoritative, and the 18:00 UTC daily cron retries failures and evaluates due monthly reports across supported US timezones.

**Synthetic-only production smoke**
Production Message Center mutation smoke targets only `sparkle-reviewer+` accounts, uses deterministic `workspace-message-smoke-` identifiers, and has exact cleanup/reset. If a browser inherits Louis's or a customer session, stop without interaction rather than treating that account as reviewer evidence.

---

## August 17, 2026 - Sparkle Suite Message Center is receive-only and workspace-only

**Reps receive; trusted operators publish**
Reps cannot compose, reply, broadcast, or message one another. Louis, explicitly designated internal agents, and approved automations are the only senders. This boundary must be enforced in UI, API, service, and RLS—not merely by hiding controls.

**Standalone in-app delivery first**
The Message Center lives inside the Sparkle Suite workspace and opens from the persistent header with an unread badge. This phase has no email, SMS, browser push, or customer-facing delivery.

**One application-owned publishing path**
Owner messages, agent actions, customer-signup notices, monthly reports, and resource announcements use one audited publishing service with frozen audiences, scoped sender capabilities, idempotency, and a retryable outbox. Agents and automations do not insert message rows directly.

**Published content creates updates**
Saving a Help, FAQ, blog, or video draft does not notify reps. Publishing a new resource or a published revision creates one linked Message Center update. Monthly reports are immutable per-rep snapshots and include reliable tracked metrics plus birthdays in the new current month.

---

## August 17, 2026 - Sparkle Suite Trade Boards do not redirect TikTok Shop LIVE purchases

**A Trade Board is operational support, not a TikTok LIVE purchase escape hatch**
For a TikTok Shop-enabled BP selling LIVE, do not place a Trade Board QR code, background URL, or spoken call to scan/visit a site to buy or claim pieces. TikTok's current LIVE and Seller guidance treats off-platform purchase direction as a distribution/compliance risk. Native TikTok Shop product links carry the live purchase CTA; Sparkle Suite remains the rep workspace and post-show customer/support surface.

**Use only declared, native link surfaces when a campaign is eligible**
An official profile website link or TikTok destination link may be used only when TikTok makes it available for that account/market and the use conforms to disclosure and product rules. Do not implement disguised text, QR workarounds, redirect chains, or scripts intended to defeat platform enforcement.

## August 17, 2026 - YouTube LIVE support awaits Bomb Party's written channel approval

**Platform capability is not supplier authorization**
YouTube can technically host commerce LIVE streams with external retailer checkout and eligible product tagging. Sparkle Suite must not label a BP YouTube sale or Trade Board checkout path supported until Bomb Party confirms that independent Party Reps may use YouTube Live and identifies the exact allowed order/checkout method.

**Protect the stream as well as the sale flow**
Any eventual YouTube LIVE guidance must require original or properly licensed audio and normal advertising/endorsement disclosure. A copyright or community-guideline issue can interrupt or end a live stream.

---

## August 16, 2026 - Video embeds follow a provider contract, not generic iframe HTML

**One shared field, four explicit destinations**
Showcase and About short-video slots accept public TikTok, YouTube, Instagram Reel/video-post, and Facebook Reel/video URLs or their official embed code. Reject other hosts at save time rather than storing a value that will create an empty or misleading customer card.

**Playback claims stop at the provider boundary**
TikTok and YouTube can use Sparkle Suite's muted, looping, no-host-pause contract. Instagram and Facebook are cross-origin native players, so their controls and playback behavior remain provider-owned. Do not add an overlay or documentation that falsely claims universal mute, loop, or pause behavior.

**Workspace reference material stays visible**
The Site Settings media guidance is a short permanent card at the top of the video stack. It must not use a chevron, a maximize/minimize affordance, or hidden instructional text.

---

## August 16, 2026 - Clearing a Nic-Nac conversation is a durable rep-scoped lifecycle change

**Clear before rotating the browser identifier**
The authenticated rep's current persisted conversation must be marked cleared before the browser switches to a fresh conversation ID. A clear action that only changes local state is incomplete.

**Preserve operations history without reviving the thread**
Keep cleared message rows for audit continuity, but exclude them from latest-conversation lookup and from history hydration, including when a stale conversation URL is revisited.

---

## August 16, 2026 - Portrait framing is data, not a one-off CSS crop

**Use automatic framing first, then give the rep the last word**
On upload, use the browser Face Detector when it is available to initialize portrait focus and zoom. Store that framing with the media slot so the public card, preview, and future site renders agree. If detection is unavailable or misjudges a non-face subject, retain a clean fallback and let the rep fine-tune with compact controls; never require Louis to request code changes for an ordinary image composition.

**Existing sites use the same safe fallback**
Do not create a Heather-specific selector or image exception. Existing portrait slots without saved framing use the shared subject-forward defaults until a rep opens Site Settings and saves an adjustment.

---

## August 16, 2026 - A portrait gets exactly one visual edge

Use a single rounded outer clip for the About portrait. Do not add a second image border or nested radius inside it; that creates an offset, doubled top edge.

---

## August 16, 2026 - Portrait frames follow the supplied photo

**A clean fit is more important than a forced universal ratio**
Customer-site About portraits must not display a dark mat or empty edges merely to satisfy a preset frame. Let the image establish the card's height, keep the rounded border directly on the image, and preserve the full uploaded photo without cover-cropping.

---

## August 16, 2026 - Short embeds preserve the selected video and its controls

**Size for the provider's card, not an arbitrary thumbnail**
TikTok's published video embed card uses a 325px minimum width. Customer-site About shorts therefore use a 348px desktop card cap with a 9:16 visual canvas, rather than a 280px constrained panel that risks clipping the provider player.

**Mute through the player API, not a permanent volume lock**
TikTok's `muted=1` query setting prevents volume changes. Use a volume-controllable player URL, wait for the official player-ready message, then send `mute` and `play`. Keep the host's clear unmute/mute control available and use `loop=1` to replay the configured post.

---

## August 16, 2026 - About media is a portrait plus three short videos

**One uncropped representative image**
The About photo is a dedicated 3:4 portrait slot. Render it with `object-fit: contain`, not a cover background, so the uploaded subject is preserved rather than algorithmically cropped.

**Three video-specific cards form the second row**
The shared customer-site template always renders three 9:16 About short-video cards below the story and portrait. TikTok and YouTube Shorts are supported now; the Showcase video continues to be a separate homepage feature.

**Layout is shared, never Heather-only**
The structure belongs to the common customer-site template and Site Settings data model. It applies to current customer sites on release and is the standard for all future Sparkle Suite sites.

---

## August 15, 2026 - An About section is structured customer-site content

**Save the representation the rep supplied**
When a rep gives an About title, byline/location, and body, persist and render each as its own customer-site field. Do not flatten the content into a narrative-only value and silently discard the identity line.

**A correction retains the same authorized mutation**
After Nic-Nac reports an About update, a concise complaint that only part was saved remains the same site-edit workflow. Keep `update_site_setting` available and require it again; do not ask the rep to manually move their already-supplied copy into another UI.

**Acceptance evidence can complement—not replace—safe replay coverage**
Louis's successful retry in Heather's real conversation confirms the shipped flow met the reported need. Continue to keep deterministic route/tool tests as the repeatable gate; the known too-short reviewer token still means that a customer-account acceptance is not a substitute for an automated reviewer smoke path.

---

## August 15, 2026 - Pasted narrative is a durable site-edit continuation

**The content itself can carry the handoff**
When Nic-Nac explicitly asks a rep to send About text, a substantive prose block in the next turn is the requested site content even if it contains no site-related keyword. Route that state from conversation context, not incidental words inside the copy such as "live."

**Pin the authorized mutation for completed content handoffs**
After the requested About copy arrives, `update_site_setting` must be the first tool choice. Do not leave the model a generic required-tool choice that can select an unrelated calendar tool or return text without publishing.

---

## August 15, 2026 - Nic-Nac must keep relevant tool capabilities across task changes

**Natural customer-site language is a first-class site intent**
About narrative, website, homepage, story, bio, and hero-title requests must route to the public-site tool family. A rep should never need to learn internal setting names or paste content into a different form when Nic-Nac has the authorized mutation.

**Tool selection is composable, not a single-task lock**
Nic-Nac may expose every relevant authorized tool family in one turn—for example, site editing and calendar work together. Conversation history may retain an active workflow, but it must not suppress a newly expressed eligible task. Short corrective follow-ups must preserve the immediately relevant site workflow until it completes, is cancelled, expires, or is escalated.

---

## August 15, 2026 - Customer homepage copy and Heather-specific action rule

**Homepage headline belongs to the rep**
Every rep may set the public homepage title in Site Settings. Use the saved value when it exists; otherwise retain the business-name fallback. Do not turn a general presentation choice into a bespoke hard-coded tenant override.

**Use real platform buttons for destinations; keep onboarding-style explanation neutral**
For BlingKitchen, configured TikTok/Whatnot buttons remain the clear destination controls. The separate "First time here?" explanation should say customers watch Heather open their jewelry live, without naming or privileging particular social networks.

**Heather's Pantry is a deliberate customer-site action**
The BlingKitchen hero exposes **In the Pantry** as a second full-width action after Browse the Trade Board. It is Heather-specific and must not appear on every rep's site unless a future product rule explicitly generalizes it.

---

## August 15, 2026 - Customer hero action hierarchy

- On the standard customer homepage, keep purchase/live-watch actions together in the first hero row: Shop Bomb Party plus only the saved TikTok and/or Whatnot actions.
- Place Browse the Trade Board beneath that row as the primary, full-width action. Its width must follow the rendered first-row action group rather than a fixed platform-specific count.
- This is a layout hierarchy only: preserve all existing destinations and action labels.

---

## August 15, 2026 - Live-platform hero action rule

- Treat TikTok and Whatnot as independent primary live-show destinations on customer sites.
- Render a hero action only when that rep has saved the corresponding platform URL/handle. Render both actions when both are populated; do not use placeholder, generic, or unprovided platform actions.
- Keep platform-specific action labels clear: **Watch on TikTok** and **Watch on Whatnot** (TikTok may say **Watch TikTok Live** during a current live show).
- Apply this shared rule to every existing and future customer site, including bespoke customer homepage variants.

---

## August 15, 2026 - Saved Hero Motion takes precedence over skin defaults

**A skin sets the starting look; a rep controls the final Hero motion**
Appearance presets may establish initial visual defaults, including a recommended hero effect, but a rep's saved **Hero motion** selection is a separate persisted Site Settings control. Public template assembly must preserve that saved value after skin tokens are applied. Changing a skin must not silently reset Sparkle Rise, Soft Glow, or Still.

**Test the deployed bootstrap, not only the save response**
For settings that affect public rendering, verification must cover the whole chain: API validation/save, mapped template data, serialized bootstrap defaults, and a live rendered customer route. A successful save response alone is insufficient.

---

## August 15, 2026 - Hero animation must be a clear customer-site choice

**Soft Glow is particle-free in the hero**
The Soft Glow setting must render a visible, gentle color glow and must not compete with a stale sparkle texture or confetti layer from another appearance choice. It is an authoritative hero presentation, not merely a low-opacity effect layered beneath independent sparkles.

**Skin defaults stay intentional and test-covered**
Keep the four calm skins on Soft Glow with subtle/no texture, and keep the seven higher-energy skins on Sparkle Rise. New or modified skins must explicitly choose a compatible hero-motion/sparkle/texture profile and preserve the all-skin regression contract.

---

## August 15, 2026 - Control Center has independent operator authentication

**A separate Control Center session is required**
Control Center must authenticate independently of the Sparkle Suite Workspace account currently open in the browser. Its operator username/password is protected production configuration and produces its own HTTP-only signed session.

**Do not use the Workspace session or a static access code as a substitute**
The independent operator sign-in must neither inspect nor replace Workspace authentication. A static access code is not the product model. Protected Control Center access is granted only by its independent session; audit attribution resolves to the configured internal operator identity without making Workspace login part of the sign-in decision.

---

## August 15, 2026 - Customer social-profile and footer contract

**Whatnot is a first-class optional social field**
Store the rep-provided value with the existing social handles. A bare handle is normalized to `https://www.whatnot.com/user/<handle>`; a complete trusted URL remains usable as supplied.

**Customer social rows are saved-data-only**
Across homepage, Trade Board, and Join, show only non-empty links derived from the current rep's saved social handles. Do not render platform defaults, placeholder `#` URLs, or social icons for fields the rep has not provided.

**Profile customizations cannot bypass the social contract**
Custom tenant profiles may customize layout and content but must pass through the shared saved social collection. They must not append VIP groups, shops, marketing destinations, or duplicate social links inside the social row. Keep commerce and other navigation in their appropriate non-social locations.

**Live tenant verification is required for cross-tenant presentation changes**
A generic template passing does not prove that custom profile overrides honor the contract. Smoke the actual affected customer route and inspect the rendered links before closing a release.

---

## August 4, 2026 - Empty Customer-Site Media Is an Honest, Sized State

**Never collapse an unconfigured public media placement**
The Showcase video and About media slots retain their intended layout even without configured content and visibly say **Coming soon**. A missing or invalid TikTok URL must not leave a detached play treatment, imply a working video, or overrun neighboring content.

---

All key architectural, tooling, and operational decisions — logged with date and rationale.

---

## August 4, 2026 - Customer-Site Footer Feature Honesty

**Do not link to unfinished customer-facing destinations**
Standard customer-site footers omit Contact until there is a supported contact experience. FAQ is shown only as a clearly non-interactive **Coming soon** label until the feature is implemented. This keeps customer navigation honest without removing the visible product direction.

---

## August 4, 2026 - Waitlist Removal Safety

**Waitlist removal is permanent but deliberately hard to trigger**
Only an authenticated Control Center operator can remove a waitlist record. The visible dialog names the exact person, explains that the Control Center/Supabase waitlist row will be permanently removed, and requires a deliberate second **Delete [name]** click. No bulk-delete or one-click removal is provided.

**Waitlist removal is not account or consent management**
Deleting a waitlist record does not create, activate, or delete an account, and it does not change marketing consent elsewhere. Those flows retain their own explicit controls and audit rules.

**Historical launch and agreement records survive source deletion**
Some older waitlist entries are linked to historical launch-build and signed-agreement records. Removing the waitlist source must not delete that history or fail because its foreign-key link is cleared. The database records `source_removed_at` on each record before the waitlist deletion, allowing the historical records to remain valid archives.

---

## August 4, 2026 - Customer List Boundaries

**Customer List and future communications are separate tools**
Customer List is a usable rep-owned contact/profile workspace. Messages stays visible as its own disabled `Coming soon` communications tool, so the roster does not overpromise campaign delivery before provider, compliance, and reviewer-smoke work is ready.

**Imported contacts are not marketing opt-ins**
CSV/Excel imports can enrich or create rep-owned contact profiles, but they must never set SMS or email consent. Matching is rep-scoped, blank columns do not erase existing profile data, and conflicting email/phone matches are skipped instead of guessed or merged.

---

## August 2, 2026 - Customer-Facing Media and Narrative Ownership

**Customer-facing site setup is a destination-specific tool**
The workspace tool is named **Customer-facing site setup**, not generic Site
Settings. Its responsibility is the public customer experience, and it should
always expose a safe preview route into that site.

**Media modes must not display irrelevant controls**
Showcase is TikTok/video-only; About placements may be a photo or TikTok/video.
Captions belong solely to photos. Saving a video clears its caption in the
data contract, and the UI removes the Caption input rather than displaying it
disabled with explanatory copy.

**TikTok is inline customer-site media**
Customer-site TikTok embeds autoplay muted when visible and loop inside their
placement. Sparkle Suite supplies exactly one mute/unmute control. Native
TikTok controls stay hidden because duplicate controls caused confusing
click-through navigation away from the customer site.

**Nic-Nac owns About narrative authoring**
The durable `about_narrative` field exists for published customer-site copy,
but Customer-facing site setup is not an editor for it. Reps use the explicit
Nic-Nac handoff to talk through their story, compare polished options, and
approve a final version. Nic-Nac publishes the approved option using the
regular site-setting tool.

---

## August 2, 2026 - Beta Workspace Navigation and Live Queue Setup Boundaries

**Shared workspace changes apply account-wide**
Workspace shell, customer-site skin, and plumbing changes belong to shared
components and data contracts. They apply to all current workspaces,
demo/reviewer accounts, and future accounts unless a feature is explicitly
account-gated. Rep-specific names, sites, codes, listings, and shows remain
data, not separate implementations.

**The bottom navigation stays focused**
The primary workspace tabs are Nic-Nac, Trade Board, Calendar, and Tools.
Jewelry Library lives inside Tools. Team Management and Bulk Collection Intake
remain visible as `Coming soon` so beta testers can see the roadmap without
accessing unfinished workflows. Existing implementation is preserved rather
than deleted and must be re-smoked before either tool is re-enabled.

**Nic-Nac owns the central workspace**
The first screen reserves its center for conversation. `Add a piece` belongs
in the left rail. `Add a show` belongs in the Upcoming Show card on the right.
The redundant `Check my board` action and composer suggestion chips stay
removed because Nic-Nac can answer board questions directly.

**Live Site Preview is intentionally minimal**
The preview toolbar keeps `Back to workspace` and `Open full site`. The
separate refresh control and preview-only Nic-Nac drawer stay removed. Reps
return to the main workspace for Nic-Nac rather than maintaining a second chat
surface inside preview.

**Live Queue guidance is workspace-owned; extension behavior is protected**
Tools contains the account-generic Live Queue setup guide. It must read the
authenticated rep's stored code and reuse the canonical Chrome Web Store and
Bomb Party Party Orders links. It may explain installation, Party Filter
selection, connection verification, customer-site checking, and safe
troubleshooting. It must not generate or replace codes, modify extension
source/package or Web Store settings, mutate queue data, place/reveal orders,
refresh Bomb Party, or change the Bomb Party back office.

**Skin readability belongs to semantic surfaces**
The explainer card follows the same surface-owned primary, muted, and accent
text contract as customer-site contact/signup cards. Skin-specific section
colors may not make card copy unreadable. Static customer-site asset cache keys
must be refreshed when shared stylesheet behavior changes.

**Exact Git identity outranks convenience during network recovery**
If a normal Git push cannot reach one GitHub edge, use an ordinary Git
transport through another verified official reachable edge. Do not reconstruct
and move the protected branch through a REST fallback when line-ending,
timezone, tree, parent, author, committer, or signature normalization produces
a different commit SHA.

---

## August 2, 2026 - Beta Onboarding Is Operator-Led with a Fixed Five-Day Trial

The public site remains waitlist-first. Louis advances interested reps,
provisions each approved account before coaching, and hands over credentials
manually. A provisioned trial lasts exactly five days and begins on the rep's
first successful sign-in, not at account creation. Trial accounts receive full
workspace and customer-site access until expiration and can convert through the
existing workspace billing flow.

Product access is centralized: only active/trialing paid subscriptions or an
unexpired active operator trial grant full access. Past-due, paused, cancelled,
revoked, pending, or expired states close workflow tools and the customer site
without deleting stored work. Account, billing, password/security, recovery,
and help remain available so a rep can restore access without operator data
repair. Password creation/change/recovery requires exact confirmation and the
shared strong-password policy.

Protected reviewer smoke remains separate from public acquisition. Reopening
self-serve signup later requires an explicit production onboarding-mode change;
the legacy enabled flag alone does not reopen it.

---

## August 1, 2026 - Trade Board Ticker Copy Is Bold

Trade Board ticker copy uses `700` font weight for both populated listings and
the empty-state message across Homepage, Trade Board, Join, every current skin,
and future shared public sites. Announcement ticker copy keeps its separate
established weight. Skin-specific color treatment may preserve readability but
must not flatten the Trade Board row back to regular or medium weight.

---

## August 1, 2026 - Empty Ticker States Use the Measured Motion Contract

An empty or short Trade Board state is ticker content, not a separate static
fallback. It must enter the same duplicated segment, carry the same
start/repeat measurement markers, and calculate duration as measured segment
distance divided by the row's pixels-per-second standard. This applies to
Homepage, Trade Board, Join, every registered skin, and future shared public
sites. A fixed-duration or minimum-duration fallback may not determine ticker
speed based on how much content happens to be present.

---

## August 1, 2026 - Card Surfaces Own Their Readability

Customer-site cards and forms must derive their primary, muted, and accent text
from semantic tokens defined by the card surface, not from the surrounding
skin section. Every registered surface must provide those tokens. Skin-specific
rules may style the section around a card, but must not force descendant card
copy to a section foreground color when the card has a contrasting surface.
This keeps content readable as skins combine dark, light, glass, paper, pearl,
and metallic treatments.

---

## August 1, 2026 - Emerald Garden Uses the Shared Public-Site Contract

Emerald Garden is a visual skin, not a separate customer-site implementation.
Homepage, Trade Board, and Join must keep the shared Amethyst content,
navigation, Live Reveal Queue, and measured ticker engine. Announcement tracks
use the shared 46-pixels-per-second standard and Trade Board inventory uses
55.2 pixels per second; Emerald must not override those timings. On its dark
announcement row, announcement text is white. Its hero treatment follows the
shared full-bleed composition and may not reintroduce the removed pale radial
blob field or oversized homepage glass container.

---

## August 1, 2026 - A Valid Customer URL Defines Public-Site Readiness

Workspace public-site readiness must be derived from the canonical resolved
customer-site URL, not from the presence of a vanity slug alone. Accounts
without a slug still have a valid rep-targeted Amethyst URL and must be shown
as live when that URL is available. The persistent header address and the
right-rail Public Site card are actionable entry points into the existing
embedded Live Site Preview; the adjacent copy control remains the sharing
action. Site Settings media inputs accept either a plain HTTP(S) video URL or
TikTok embed markup, canonicalize the stored source URL, and must visibly
reject invalid nonblank input instead of silently saving an empty value.

---

## August 1, 2026 - Homepage Media Uses the Recovered Three-Slot Contract

Site Settings exposes exactly three customer-homepage media placements:
`Showcase`, `About media 1`, and `About media 2`. Each placement may hold a
rep-uploaded photo, a TikTok/video URL, and a caption. This is the exact
pre-rebuild product contract recovered from the Master Build Plan and Amethyst
DesignKit and matches the three slots already present in the current public
renderer. The previously removed hero-image control stays removed; it is not a
fourth upload placement.

---

## August 1, 2026 - Workspace Header Keeps Share and Live Queue References Visible

The authenticated Sparkle Suite workspace header always shows two account-level
references: the canonical customer-facing site address with a copy control and
the exact stored Live Queue code. These values come from the authenticated rep
profile and remain visible on mobile. The header is read-only: it must not
generate, reset, replace, or mutate Live Queue codes or queue state.

---

## August 1, 2026 - Public Site Status Remains, Preview Decoration Does Not

The Nic-Nac right rail retains a compact `Public Site` card because its
live/setup status is useful workspace information. The oversized purple
`Sparkle with us.` preview bubble and redundant `Preview site` actions remain
removed. Removing a child preview treatment must not be interpreted as
removing the entire status card.

---

## August 1, 2026 - Workspace Header Separates Person and Live-Show Identity

The workspace profile header uses two distinct identity fields: the rep's
display name on top and the live-show/business name below. It must never repeat
the same value on both lines. Missing or duplicate live-show data is labeled
`Live show name not set` until the rep saves a distinct value through the
normal profile/Site Settings flow; the UI must not invent one.

---

## August 1, 2026 - Workspace Back Navigation Uses the Section Hierarchy

Sparkle Suite workspace back controls follow the product hierarchy instead of
depending on browser history. Primary tabs return to Nic-Nac home. Nested tools
return to the Tools index. This gives direct-entry sections a predictable
destination and keeps Tools-to-tool navigation usable even though workspace
sections render inside one `/nic-nac` route.

---

## July 31, 2026 - Production Provenance, Voice Pause, and Admin/Demo Invariant

**The live customer domain is the only default release and review target**
Approved Sparkle Suite work deploys from the exact active-branch tip to Vercel
production and is handed off at `https://www.yoursparklesuite.com`. The apex
`https://yoursparklesuite.com` must resolve to the same deployment. Raw Vercel
deployment URLs and `sparkle-suite-demo.vercel.app` are provenance evidence
only; they must not be promoted as the ordinary review target or used as proof
that a release is complete.

**Live and demo are one Sparkle Suite surface**
"Demo" describes safe reviewer data or reviewer mode on the live
`yoursparklesuite.com` product. It is not a separate environment, domain,
deployment lane, or handoff target. All approved work flows to the live site.

**Production changes require provenance proof**
Before a Sparkle Suite deploy, rollback, alias move, authentication repair, or billing-data repair, Codex must verify the absolute active repo, GitHub remote, branch, HEAD commit, Vercel project/deployment, and affected domains. If Louis requests a restore, use exact Git/Vercel history; do not rebuild the visible page from memory. Preserve current and suspected bad deployment URLs for inspection.

**Exact-domain and post-auth verification are release gates**
A raw Vercel preview, stable-demo check, root HTTP 200, or briefly correct landing page is not enough after production recovery. Verification must use the exact live domain Louis uses, wait for delayed redirects, authenticate through the relevant account class, and confirm the expected workspace/customer-site destination.

**Louis's Google-auth account is a protected admin/demo workspace**
`louis@neonrabbit.net` must remain `active`, `dashboard_unlocked`, and backed by a `$0`, non-live internal demo entitlement. It must land in the Sparkle Suite Workspace and must never be used for disposable signup/checkout testing. Use synthetic reviewer smoke or `louis+sparkle-demo-2@neonrabbit.net` for disposable signup tests.

**Unexpected checkout is an account-state incident**
If an established admin, demo, beta, or customer account resolves to `checkout_required`, stop before live checkout. Inspect the rep, setup, entitlement/subscription, and pricing reservation as one state machine. Repairs require exact identity guards, audit notes, release of accidental pricing reservations, and preservation of provider evidence.

**Voice mode is paused for risky Sparkle Suite work**
Do not use voice mode for Sparkle Suite repository selection, deployments, domain aliases, authentication, billing, or production-data changes until Louis explicitly re-enables it. Voice transcription or an old-session reference never overrides the active repo memory/provenance checks.

**Sparkle Suite branches use a deny-unlisted policy**
The only active branch is `codex/nic-nac-trade-hardening`. The authoritative
machine allowlist is `config\active-branches.json`. Any other branch permits
read-only provenance review only: no edits, builds, tests, commits, pushes,
deploys, migrations, or production/account changes. Changing the active branch
requires Louis's explicit approval and a coordinated update to the allowlist,
branch register, GitHub default, and Vercel production branch.

**Branch age never proves deletion safety**
Branches are classified from live deployment provenance, Git ancestry,
branch-only commits, vault decisions, attached worktree state, and Louis's
approval. Zero branch-only commits plus a clean worktree may be marked
archive-safe. Unique commits, divergent history, or dirty worktrees must remain
quarantined/needs-review. Before any eventual branch deletion, preserve the tip
with an annotated tag and verified all-ref backup.

**Legacy branch pointers remain preserved during containment**
July 31 containment changes the GitHub default and freezes non-active refs; it
does not delete, rename, reset, or rewrite branches/worktrees. Legacy `main`,
incident lines, Collection Intake lines, and detached worktree files remain
available for deliberate review.

---

## July 26, 2026 - Emerald Garden and Brianna Beta Boundaries

**Emerald Garden is a reusable standard skin**
Emerald Garden belongs in the normal rep-selectable Amethyst appearance choices. Brianna's former Readdy site supplied brand reference for its green, neutral, floral/spa character, but the implementation must remain account-generic and use the standard Sparkle Suite public-site structure.

**Brianna returns only as a standard Sparkle Suite beta**
Brianna Williams / Bri's Glowtique may return as a beta tester, but the older bespoke-client arrangement remains superseded. Do not rebuild or revive a custom Readdy site, and do not add extra side-business content. Her site remains Bomb Party focused with her real copy and links populated only where they fit the standard product.

**Billing and domain changes remain deferred**
Brianna's current internal beta is `$0`, has no Stripe customer, and must not produce a live charge. Honor the previously offered original `$39/month` price only when Louis decides billing should begin. Keep `brisglowtique.com` disconnected until Louis explicitly approves a domain cutover after review.

**Brianna's credential is private operational memory**
At Louis's explicit request, the temporary login is stored in private Open Brain recall so it can be retrieved later. It must not be committed into the Git-tracked vault, and it should be rotated after Brianna receives or first uses it.

---

## July 25, 2026 - Workspace Summary Cards and Default Release Flow

**Workspace summary cards should show real next-step value**
The workspace Upcoming Show card should not show a generic static `Calendar` label. If a real upcoming event exists, the card should summarize the next show with date, weekday, time, time zone, and show name, and that summary should link into the Calendar workspace. If no upcoming event exists, the card should say `No upcoming shows` and offer `Add a show` as the next action. Shared dashboard cards should either show real account data or a clear empty state with an action.

**Trade Board header action uses shorter customer-facing copy**
Use `Customer view` instead of `View customer board` for the Trade Board top-right action. The shorter label fits the existing workspace tone better and keeps the header lighter without changing behavior.

**Approved Sparkle Suite changes release by default**
Louis does not need to restate commit/push/deploy on each Sparkle Suite change. The standing repo rule is now explicit: once work is approved and implemented, Codex should commit legitimate session changes, push the current branch, deploy the exact tip to Vercel, promote `https://sparkle-suite-demo.vercel.app/` to that deployment, and verify the stable review URL unless Louis explicitly scopes the work to local-only or says not to commit, push, or deploy.

Superseded July 31, 2026: the release target is now Vercel production at
`https://www.yoursparklesuite.com`, with the apex domain resolving to the same
deployment. The demo alias is provenance evidence only.

**Operational triage should separate tool-surface gaps from product facts**
When a support or billing-looking email arrives, distinguish what Codex can directly verify from what it cannot. A mailbox connector mismatch blocks direct header/authentication review, but Sparkle Suite records can still confirm whether the sender exists in waitlist, intake, rep, or subscription data before escalating.

---

## July 10, 2026 - Live Preview and Workspace Shell UI Contract

**Open Brain updates include full GitHub closeout**
When Louis asks Codex to update Open Brain, the default scope includes updating the relevant vault memory/log files, reviewing all legitimate unfinished project changes in the working tree, committing those memory and project changes, and pushing the current Sparkle Suite branch to GitHub. Do not leave completed Open Brain updates or other legitimate session work only on the local computer unless Louis explicitly asks not to commit or push them. Automatically generated test output such as `artifacts/` and `test-results/` remains excluded unless Louis specifically asks to preserve it; report those folders plainly instead of describing them as unfinished project work.

**Live Site Preview is a toggleable Nic-Nac workbench**
Desktop preview keeps the customer site primary and offers Nic-Nac as an optional sidecar. Nic-Nac starts closed, opens only after `Open Nic-Nac`, and changes that control to `Close Nic-Nac` while open. Closing it restores the larger preview area. Keep Back to workspace, Refresh preview, and Open full site alongside the toggle as four equal-size centered controls. Refresh uses the same white/pink treatment as the other controls.

**Shared workspace UI is account-generic**
The rep workspace and Live Site Preview behavior apply to every current customer, future account, and reviewer/demo account. Customer data may personalize names, site copy, listings, shows, and images, but shared component structure and controls must not be implemented as Heather/BlingKitchen-only behavior.

**Preserve the compact product header; keep account controls focused**
The workspace needs a compact Sparkle Suite / Workspace header for product identity, notifications, and rep identity. The rep profile opens an account menu with `Log out`. The top `Ask Nic-Nac anything...` field and `Preview site` action are intentionally absent because the page already has a full Nic-Nac composer and the workspace should not advertise a separate preview surface. Do not remove the complete header.

**Workspace navigation and composer stay inside the app shell**
The workspace shell should fit the viewport without requiring page-level scrolling to reach chat input or navigation. Conversation history owns the internal scroll. Header, quick actions/composer, and bottom navigation remain available. Bottom tabs need stable heights plus sufficient safe-area padding so icons and labels cannot be clipped.

**Workspace terminology favors direct workflow language**
Use `Trade follow-up` instead of `Swap cleanup`, and `Open Trade Workspace` instead of `View full today`. Remove duplicate summary cards when the same information/action already exists elsewhere in the first screen.

**Collection Intake begins as a safe local review workflow**
The workspace `Tools` area includes Collection Intake as a first-class tool. Reps select one image folder with each piece kept together in capture order; Nic-Nac may propose groupings and flag uncertainty, but every result requires human review. This first release does not write inventory, Trade Board listings, or shared jewelry catalog records. Trade Board-only candidates require a jewelry photo plus collection type, and shared-database candidates require an item number plus verified jewelry details. No fake catalog placeholder is permitted.

**Verification escalation has a stopping rule**
For customer-facing shell changes, run focused tests, production build, and one supported synthetic reviewer/browser path. If the browser integration itself fails, use one documented fallback and report the remaining visual gap. Do not spend a long loop trying unrelated server/browser launch mechanisms after the code-level gates are green. Respect Louis's decision to take over manual smoke testing.

---

## July 9, 2026 - Nic-Nac Workspace Shell and Approval Boundaries

**Workspace preview images must be real or absent**
Nic-Nac workspace cards must not use fake, generated, or decorative product/site thumbnails that imply real inventory or a real public site screenshot. Trade Board and Active Board imagery can render only from real listing/customer-site data. Public Site imagery can render only from real configured site assets such as a hero image. If no real image exists, show copy, counts, and actions with no image.

**Live Site Preview should keep Nic-Nac available**
The intended Live Site Preview experience is a workbench, not a standalone iframe. Desktop should keep the live preview visible while Nic-Nac remains available as a sidecar for on-the-fly copy/site changes. Mobile/tablet should keep the preview primary and expose Nic-Nac through a floating button or drawer. Preview controls such as Back to workspace, Refresh preview, and Open full site must remain available.

**Concept-shell changes require functionality smoke**
Any future workspace visual/shell redesign must smoke-test real app behavior before closeout: type and submit the top prompt, open Nic-Nac, navigate tabs, return Home from the brand/header, open Help & Resources, open/refresh/back out of live-site preview, and check the mobile breakpoint. Screenshot resemblance alone is not sufficient.

**Questions are not implementation approval**
When Louis asks for product/design judgment, analysis, "what went wrong", or "what is the best way", answer the question and wait. Do not inspect, patch, test, commit, deploy, or otherwise start implementation unless Louis explicitly approves the work.

---

## July 4, 2026 - Nic-Nac Trade Board Tool Contract

**Trade Board hardening uses deployed pressure sweeps, not isolated happy paths**
Trade Board and Trade tool changes should close with the combined `smoke:nic-nac:trade-board-pressure` gate whenever the change can affect listing intake, non-item-number listings, removals, request decisions, fulfillment, live swaps, cleanup, or catalog correction. The pressure sweep is intentionally synthetic/reviewer-scoped, approval-aware, DB-asserting, public-site-aware, and cleanup-backed.

**Catalog correction inputs are sanitized by issue type**
For `report_jewelry_catalog_issue`, the model may suggest correction fields, but the tool owns which fields are valid for the requested issue. Non-photo corrections such as wrong MSRP, name, material, stone, collection, tags, or duplicate must drop stray `canonicalPhotoUrl` before the service layer. `bad_photo` remains the only path that can send a canonical photo replacement, and that replacement must be an approved jewelry-front asset.

**Shared catalog corrections require approval plus audit and public proof**
Catalog corrections affect shared Sparkle Suite reference data, not only one rep's board. They must be approval-gated and verified with the catalog row, `jewelry_catalog_change_log`, completed workflow assertions, and public Trade Board proof when an available listing uses the corrected catalog data.

---

## July 4, 2026 - Nic-Nac Calendar Tool Contract

**Nic-Nac tool workflows are app-owned forms with model-assisted extraction**
Nic-Nac should not need a bespoke prompt branch for every way a rep might request a calendar or trade action. The app owns the durable form/state machine: required fields, optional fields, field normalization, defaults, recurrence math, allowed transitions, authorization, mutation validation, and database verification. The model helps understand language and choose tools inside that contract.

**Calendar recurrence is structured state, not prose**
Calendar repeats must be represented before mutation as explicit structured cadence and bounds. Supported Calendar cadence now includes `daily`, `weekly`, and `weekday` for Monday-Friday patterns. Ongoing schedules are bounded future rows, not infinite hidden magic.

**Tool inputs must be sanitized against model drift**
Tool code should not trust every field the model sends. If the latest rep turn did not ask to change duration, `update_show` drops `durationMinutes` even if the model included a default. The same principle should apply to Trade Board and other mutation tools: only authorized/latest-turn or workflow-backed changes should reach the service layer.

**Active workflow context keeps tools available**
Tool availability should merge current user intent with active durable workflow state. A long conversation, a correction, or a short answer like "yes" or "no description" must not remove Calendar/Trade tools when the app knows a workflow is still active.

**Calendar UI must let reps inspect generated schedules**
Recurring-heavy accounts need Calendar summary loading and month navigation that make future rows visible in the workspace, not only on the customer-facing site. The workspace Calendar now supports moving between months and loading a wider event window.

**Pressure smoke is the proof standard for complex Nic-Nac tools**
For complex Nic-Nac workflow changes, the readiness bar is deployed model/tool pressure smoke with DB assertions, public/workspace visibility checks where relevant, hard-fail phrase gates, and cleanup. Unit tests and assistant transcript quality are necessary but not sufficient.

**Trade Board and Trade tools should inherit the Calendar hardening pattern**
Future Trade Board/Trade tool work should reuse the Calendar pattern: durable workflow state, app-owned field normalization, tool-input drift guards, workflow-backed tool availability, structured service contracts, real model/tool replay, DB assertions, public-site visibility checks, and cleanup. Do not solve Trade Board brittleness by adding phrase-by-phrase prompt patches.

---

## July 2, 2026 - Team Management Beta

**Team Management beta uses private onboarding links**
Brittany's Team Management beta is wired around private onboarding links, not fake Sparkle Suite rep accounts. A team lead creates an onboarding participant by entering the new rep's name, then copies the link or opens their own email app. Sparkle Suite SMS/email notification tools are not used for team recruiting/outreach.

**Team Management access is entitlement-backed**
Team Management access is controlled by `team_management_entitlements`. Brittany is enabled through `manual_beta`; future paid add-on access can use the same entitlement table with `active` status after Stripe checkout/webhook handling is added.

**Rep onboarding progress and messages stay tied to the team lead workspace**
The public onboarding invite token identifies a participant under the team lead's workspace. Progress updates and participant questions/messages sync back to Brittany's Sparkle Suite Team Management workspace while the participant keeps using the tailored onboarding page.

**Public Team Cards are separate from onboarding invites**
Creating a Start Strong onboarding link does not automatically publish a team member on the customer-facing Join Team page. Public Join Team cards are managed separately through the Team Management Public Team Cards panel backed by `join_team_members` / `/api/nic-nac/join-team-roster`.

**Imported public team cards preserve hidden metadata**
Dashboard edits to public team cards must preserve migrated fields that are not exposed in the simple UI, including city/state, initials, photo alt/class, bio, and sort order. Simple beta editing should not wipe richer migrated content.

**Public roster links require full safe URLs**
Public team-card social/website links must be full `http` or `https` URLs before save. Do not persist `javascript:`, relative, or other unsafe link schemes for customer-facing card links.

**Reviewer-smoke dashboard sessions seed paid-add-on access**
Synthetic dashboard reviewer-smoke must seed the same entitlement required by the UI under review. For Team Management, reviewer-smoke now upserts `team_management_entitlements` with `manual_beta` for the synthetic reviewer rep so the real unlocked dashboard can be verified without Louis's personal account.

**Brittany's demo account is the beta/live-transition account**
Brittany's `brittwithbling` demo account is treated as the account that can later become her live account. It is currently verified as `active` with Team Management `manual_beta` access. Do not create fake rep accounts for Brittany's beta; use the real/demo account and real/test-by-Louis onboarding participants only when Louis is ready for the first end-to-end smoke.

---

## July 2, 2026 - Alpine Opal and Mile High Fizz

**Alpine Opal is a reusable Sparkle Suite skin**
The Mile High Fizz visual direction is now codified as `alpine_opal` / `AO-01`, named Alpine Opal. It is not a Lindsey-only custom fork. Any rep can select it from the normal Sparkle Suite skin system, and future skin-aware tooling, prompts, templates, and Site Settings type guards should treat it as a first-class supported appearance preset.

**Mile High Fizz uses the normal switchable customer-site model**
The earlier June 18 note that Mile High Fizz was a bespoke hybrid migration is superseded for current implementation purposes. Mile High Fizz should keep its brand/content direction, but the public Home, Trade, and Join routes should use the standard Amethyst template model with active-skin tokens, like BlingKitchen after Moonstone. The site must be able to switch among all supported skins.

**Mile High Fizz Trade Board starts empty by design**
An empty Mile High Fizz customer Trade Board is not a missing-data bug. Lindsey should start with no public listings until she adds actual pieces through the workspace/Nic-Nac flow.

**Mile High Fizz team copy is specific**
Use `Diamond Peak Society` for Lindsey's own team and `The Virtuous Fizzers` for the team Lindsey belongs to. Avoid generic family/team wording when the site is preparing for Lindsey/Brittany-style review.

**Persisted Site Settings must be migrated for customer defaults**
When changing a default skin for an existing customer site, updating static tenant/profile code is not enough if `site_settings` already contains a saved `appearance_preset`. Apply and verify the persisted setting, then verify the stable public template payload for the customer slug.

**Customer-facing copy must not leak internal model language**
Do not expose generic implementation phrases such as "standard Sparkle Suite item-for-item swap" on customer-facing rep sites. Public copy should sound like the rep's site and describe the shopper action plainly.

**Check-constraint migrations normalize first**
When extending constrained enum-like fields such as `site_settings.appearance_preset`, first normalize unsupported or null legacy values to a valid fallback, then replace the check constraint. This prevents remote `db push` from failing on old rows such as retired `amethyst` values.

---

## June 29, 2026

**No-item-number trade pieces stay out of the shared jewelry database**
Trade Board pieces without item numbers should be represented as `listing_source = 'non_item_number'` rows on `trade_listings`, not as fake catalog rows and not as `jewelry_designs` entries. Required controlled fields for V1 are jewelry type, broad collection, exact collection when known, size when applicable, and an individual customer-facing photo. Customers should not see source labels or different naming; public Trade Board/search/filter/request behavior should treat these as ordinary listings.

**V1 non-item-number entry is Nic-Nac-only and one piece at a time**
Do not add a dashboard manual form, batch board photo cropper, bulk importer, or conversion path yet. Reps enter this path by telling Nic-Nac they do not have an item number, or by providing a photo/details flow where Nic-Nac confirms the no-item-number route. The form title should stay `Collection Type and Size`, with `(non-item number piece)` only as rep-facing clarification where useful.

---

## June 27, 2026

**Jewelry catalog design identity includes plating/material variants**
Bomb Party item number alone is not a unique design identity in Sparkle Suite. The same item number can appear with multiple plating/material variants, such as Rhodium Plating and Hematite Plating. When plating/material is known, Nic-Nac and service code should resolve by item number plus normalized material. A different plating on a tag is not automatically a wrong-material correction to an existing catalog row; it may be a new catalog variant that should be created and listed separately.

---

## June 23, 2026

**Beta support intake should be one-field first**
Help & Resources support reporting should minimize rep friction. The beta-facing form should let reps describe the problem, bug, confusion, or idea in one place. Sparkle Suite should infer report type, urgency, title, and context behind the scenes, then preserve Control Center, Support Auditor, Google Chat, and Sparkle Lab automation. Do not push classification, urgency triage, expected/actual fields, or workflow checklists onto reps unless later evidence shows they are necessary.

**Stale smoke failures are not blockers until freshly reverified**
When a previously reported Sparkle Suite/Nic-Nac smoke failure conflicts with Louis's current manual smoke result, re-check the exact stable demo URL, deployment, test harness, and product path before naming it a live blocker. Treat harness drift and stale expectations as separate from product defects. A beta-readiness issue is real only after fresh verification against the intended review surface or a focused local reproduction.

**Live calendar changes require app-owned preflight and approval gates**
Nic-Nac live calendar writes should not be prompt-only. Before mutating a show or reminder setting, the app should resolve candidate shows/defaults, identify ambiguity, choose the correct approval-gated tool, and let that tool emit the confirmation dialog. Skipping one occurrence, canceling a future series, pausing a series, and changing reminders are approval-gated mutations.

**Reminder preferences are durable workflow state, not ordinary memory notes**
Default show reminder settings and per-show reminder exceptions belong in dedicated tables with rep/event ownership checks. They should not be stored only as free-form `rep_notes`, because reminder planning and outbound delivery need structured lead time, channels, discount-code inclusion, collection inclusion, and override state.

**Outbound show reminders stay flag-gated until launch readiness**
The calendar/reminder internals may prepare SMS and email reminder plans now, but live delivery must remain gated by channel-specific enablement, provider/compliance readiness, audience consent rules, and test-mode proof. Beta can ship the inner wiring before turning on customer-facing sends.

**Reviewer-smoke calendar data must be repeatable**
Nic-Nac calendar smokes need deterministic reviewer data: a known reviewer rep, a same-day upcoming show, a future recurring occurrence, and a seeded audience member. Smokes should assert the database after messy rep language, not only inspect assistant text.

---

## June 22, 2026

**Nic-Nac is named after one of Louis's pet rabbits**
Nic-Nac's name origin is part of his shared identity context, not a one-off answer. If asked how he got his name, he should answer warmly and simply that Louis named him after one of his pet rabbits.

**Deployed Finder Nic-Nac smoke uses token-gated temporary auth, not preview auth**
Production Sparkle Finder preview auth should stay disabled. Deployed Nic-Nac smoke should create a temporary confirmed Silver smoke user through a bearer-token-protected internal route, use real Supabase session cookies against `/api/finder/nic-nac`, and clean the user afterward. Do not use Louis's personal browser session or enable deployed preview auth to prove Finder Nic-Nac.

**Finder Nic-Nac filters tools before prompt/model execution**
Sparkle Finder Nic-Nac route must apply product-context tool policy before building active tool names, tool objects, or the system prompt. Linked reps can share identity and memory across Sparkle Suite/Finder, but Sparkle Suite workspace mutations requested from Finder are blocked for that turn with the Suite-login boundary and no Finder tools exposed as a workaround. Ordinary Finder memory, rep discovery, availability, catalog, social, and account tools remain available for Finder-scoped asks.

## June 21, 2026

**Linked rep memory crosses products through a bounded server bridge**
Sparkle Finder may preload safe Suite rep memory for a linked rep only through a server-to-server internal Suite endpoint with a dedicated bearer token. The endpoint must return bounded safe summaries assembled through the same Nic-Nac memory-card/context-assembler path used by Suite, not raw `rep_notes`. Finder must call it only from authenticated linked-rep account state, verify the returned `suiteRepId`, filter defensively again, and fail closed if env, network, auth, payload, or rep matching fails.

**Nic-Nac is one production assistant across Sparkle Suite and Sparkle Finder**
There should be one production Nic-Nac core, not copied assistants per product. A linked rep should feel like the same Nic-Nac knows them in Sparkle Suite and Sparkle Finder. Product context controls available tools and mutation destinations; it does not create a separate Nic-Nac identity.

**The private Live Queue code is now the Secret Rep ID Number**
The private code visible only inside the rep's Sparkle Suite account should be labeled as the Secret Rep ID Number / do not share publicly. It keeps its Live Queue connection/sync use and also becomes the Sparkle Finder rep-claim code. Sparkle Finder resolves it to the durable Sparkle Suite `rep_id`; Nic-Nac follows the linked identity, not the visible code. Keep internal `liveQueueSyncCode`/`live_queue_sync_code` compatibility for the extension and existing tools, but prefer `Secret Rep ID Number` in rep-facing copy.

**Linked reps use shared memory with surface-gated actions**
When a rep links Sparkle Finder to their Sparkle Suite `rep_id`, Nic-Nac should share memory across both surfaces for that human. Tool execution remains gated by the current product and authentication surface: Sparkle Suite mutations require the rep to be in Sparkle Suite, while Finder work can happen in Finder with the appropriate Finder permissions.

**Sparkle Finder rep claiming grants Silver and a rep badge only**
A Sparkle Suite rep who claims a Finder account with the Secret Rep ID Number receives Sparkle Finder Silver tier and a visible BP Rep / verified rep badge. The claim does not grant extra Finder powers beyond the normal Silver account. Public Sparkle Suite trade/show data can still appear in Sparkle Finder whether or not the rep has claimed a Finder account.

**Secret Rep ID claims require Finder-eligible Suite reps**
The Suite internal rep-claim validator should not accept every active rep record. A Secret Rep ID Number claim should resolve only for an active Sparkle Suite rep that is eligible for public Sparkle Finder presence through a paid workspace or a ready launch-build path. Invalid, inactive, or not-yet-eligible claims should return the same not-found shape so the private code does not leak account status.

**Production Nic-Nac and Lab Nic-Nac cannot self-mutate production**
Production Nic-Nac cannot change its own production behavior, tools, workflow rules, permissions, prompts, code, product behavior, pricing, or global memory lessons. Lab Nic-Nac can study, experiment, and recommend improvements but cannot deploy or promote recommendations into production without approval.

**Sparkle Lab is the proactive improvement surface**
The Control Center should gain a Sparkle Lab page/section for Nic-Nac Lab, Sparkle Suite Lab, Sparkle Finder Lab, Ops Lab, and Research Desk. Sparkle Lab can automatically create internal findings, replay/eval cases, trouble-ticket analyses, trend notes, business-health reports, research briefs, product opportunity notes, workflow/tool improvement proposals, and lab self-improvement notes. It cannot automatically change production behavior.

**No forced Nic-Nac wow moment**
Do not design around a staged "holy shit" moment. The wow factor should compound from reliability, memory, fewer repeated mistakes, better rep outcomes, better collector experience, lead/sales lift, and the lab loop steadily reducing hiccups.

**Nic-Nac memory is a marketed product feature, not a beta tuning panel**
Nic-Nac's memory and learning should be disclosed clearly in privacy policy, terms, onboarding, and marketing. Broad self-serve memory controls are not part of the beta direction. Internal/operator correction or deletion tools may still be required for legal, privacy, abuse, data-quality, or operational reasons.

**Sparkle Lab runs on a bounded cadence, not continuously**
Sparkle Lab should not run all the time or burn model credits without limits. Default direction is a weekly scheduled lab run, initially Sunday at 2:00 AM America/New_York so fresh results are available Monday morning, with adjustable cadence after real usage. Every lab run should have max cost, max model calls, max runtime, max records/items reviewed, graceful stop behavior, and a report of usage/limits hit. On-demand or urgent runs must be narrow and explicitly bounded.

**Sparkle Lab starts with small hard usage caps and narrow priorities**
Initial Sparkle Lab defaults are intentionally conservative: weekly scheduled run hard cap $5, monthly scheduled hard cap $20, manual/on-demand run hard cap $2, urgent issue-specific run hard cap $3 unless Louis/operator raises it, 20 model calls per weekly run with no more than 4 premium/deep calls, 20 minutes weekly runtime, 250 candidate records, and 25 deep-analyzed items. Weekly reports should elevate at most 3 headline findings and recommend at most 2 active work priorities, ranked by business impact, rep/customer impact, revenue/lead impact, severity, confidence, and effort.

**Nic-Nac's personality foundation is September Virgo**
Nic-Nac's behavior should consistently read as organized, detail-minded, service-oriented, practical, warm, sweet, professional, and lightly quirky/funny when appropriate. He may say he is a Virgo if asked directly or during light/playful conversation, but that reference should be rare and low-key. Nic-Nac should not volunteer astrology in normal work sessions. He should stay focused on Sparkle Suite, Sparkle Finder, Bomb Party, live shows, social selling, business goals, collectors, jewelry, streaming/hardware guidance, and system help; unrelated therapist/general-chatbot/grocery-list use should be politely redirected.

**Nic-Nac model routing is centralized and OpenAI-first**
Production route files should not hardcode raw provider/model strings. Use Nic-Nac model policy keys such as `human_default`, `human_escalated`, `utility_fast`, and `lab_synthesis`, with OpenAI as the default provider and environment overrides for exact model IDs.

**Nic-Nac runtime provider is OpenAI-only for the current product policy**
Do not keep an Anthropic fallback inside the shared Nic-Nac model provider while the product direction is to avoid juggling multiple AI vendors. Future provider expansion can be reconsidered intentionally, but current production Nic-Nac should route through the centralized OpenAI policy only.

**Sparkle Finder Nic-Nac should not remain a separate Anthropic/Haiku route**
Sparkle Finder's live Nic-Nac route should follow the same OpenAI-only product policy direction as Sparkle Suite. Route files should use model policy helpers rather than raw provider/model strings, and Finder should not carry an unused Anthropic provider dependency for Nic-Nac.

**Nic-Nac tool access is product-context gated**
The shared Nic-Nac core should decide tool availability from product, surface, actor, account tier, linked identity, and permissions. Finder-linked reps may share memory identity with Suite, but Suite workspace mutation intents stay blocked unless the current authenticated surface is Sparkle Suite rep workspace.

**Nic-Nac tool intents require explicit capability classification**
Every routed Nic-Nac tool intent should declare what capability it requires. Shared memory can remain available for linked Finder reps, but Suite workspace mutations must stay gated to Suite. Mixed packs such as catalog/resources remain conservative until product-specific Finder/public tool registries split safe read actions from mutation/reporting actions.

**Sparkle Lab paid model calls require approved pricing**
Sparkle Lab must not treat unknown model pricing as free or reuse base-model pricing for suffix families such as pro/nano variants. Lab model synthesis should skip the model call and record a lab note unless the configured `lab_synthesis` model has an explicit approved Nic-Nac pricing entry. New model families can be allowed later only by adding pricing and tests first.

**Customer-site ticker contract is row-specific**
The customer-facing announcement ticker should keep the approved casual `72s` pace. The Trade Board ticker row beneath it should move about 20% faster, currently `60s`. This must live in the shared customer-site template and React shell so current migrated sites and all future Sparkle Suite customer sites inherit the same behavior.

**Migrated public sites use the exact shared Sparkle Suite header code**
When a migrated public site needs the Sparkle Suite header, do not create a similar bespoke header. Mile High Fizz, Britt With Bling, BlingKitchen, and the default Amethyst homepage should reuse the same shared header/ticker/Live Queue code path so Trade Board and Live Queue behavior stays consistent.

**Public-site ticker speed uses one shared relationship, not one identical duration**
Ticker controls should stay template-wide and avoid one-off page tuning, but the two rows do not use identical durations. The current shared rule is `tickerSpeed: 1`, announcement duration `72s`, and Trade Board duration `60s`.

**Static public-site asset cache busting is part of the fix**
For Amethyst/static public-site changes, update the asset version in the HTML shells and tests before deployment. Otherwise Louis can refresh the stable route and still load the previous JS/CSS bundle.

**Control Center customer/demo classification must become durable**
The current active-customer vs demo split is code-derived from known active customer identifiers. If Louis wants to manage this operationally, add durable account classification metadata and Nic-Nac/dashboard controls rather than continuing to rely on a hardcoded known-customer list.

**Louis-facing responses should stay bottom-line-first**
For Sparkle Suite implementation closeouts, keep responses short: what changed, where to review, verification, commit. Avoid long raw deployment explanations or multiple preview URLs unless they are truly necessary or Louis asks for them.

---

## June 20, 2026

**Sparkle Suite task closeout should commit, push, deploy, and promote the stable demo by default**
Louis reiterated that finished Sparkle Suite tasks should be committed, pushed, deployed, and made available for review automatically unless he explicitly says not to. For demo/review work, the closeout target remains the stable alias `https://sparkle-suite-demo.vercel.app`, not only a raw Vercel preview URL.

**Control Center is becoming the internal operating workspace**
The `/control-center` surface should use the plain title `Sparkle Suite Control Center` and grow beyond support tickets into operator/customer management. Customer records should be clean, expandable rep profiles with contact, billing, website/social, status, and notes instead of a spreadsheet-style dump.

---

## June 19, 2026

**Sparkle Suite binder now lives inside the repo**
The durable Sparkle Suite binder/Open Brain files were folded back into `C:\Users\louis\sparkle-suite-repo` so code, docs, vault memory, plans, handoffs, and project skills share one Codex workspace boundary. Future Sparkle Suite sessions should open the repo directly with workspace-write access. The old `C:\Users\louis\sparkle-suite` folder is retained only as a redirect/archive.

**Existing-site migrations use the Mile High Fizz route shape unless Louis says otherwise**
For rep-owned Ready.ai/Readdy migrations, do not preserve every page by default. Preserve the outside site's brand and important content, then fit it into the Sparkle Suite hybrid public-site shape. Britt With Bling keeps Home, Trade, and Join; BlingKitchen keeps Home, Trade, Join, plus the special recipe route.

**Source export remains the intake gate for faithful migrations**
The Britt With Bling and BlingKitchen passes reinforced the Mile High Fizz lesson: exact migrations require the source/project export/repo. Live URLs and screenshots are useful references, but they are not enough for faithful layout, asset, and content transfer unless Louis explicitly accepts a close recreation.

**Rep-maintained migrated content must become Nic-Nac/dashboard editable**
If a migrated site has content the rep will reasonably change, do not leave it hardcoded after initial import. Britt With Bling team cards and BlingKitchen recipes are the current examples. Nic-Nac and the dashboard should be able to add, edit, remove, reorder, hide/show, and update images/links/copy for those content groups.

**BlingKitchen recipes are a first-class public-site content type**
Recipes should be DB-backed public-site content with Nic-Nac tools and a dashboard Recipes section. The public Pantry page should load database recipes first and fall back to the migrated Ready.ai recipe set only for BlingKitchen when no DB recipes exist.

**New Supabase public tables need explicit Data API grants**
When adding new public-schema app tables, include explicit grants for `authenticated` and `service_role` as appropriate in the migration. Supabase CLI/changelog checks during the recipe work showed that relying on old default grants can create avoidable runtime surprises.

**Binder/repo split needs a repo-side bridge**
The current Sparkle Suite setup is a binder plus separate implementation repo. To avoid repeated approval prompts while preserving Open Brain instructions, future implementation sessions should open the repo as the writable workspace and let repo `AGENTS.md` instruct agents to read the binder first. This pattern should also be used for Sparkle Finder.

---

## June 16, 2026

**Nic-Nac must be one shared ecosystem agent, not copied per product**
Sparkle Suite and Sparkle Finder should not have separate copy-pasted Nic-Nac assistants. The long-term architecture decision is one shared Nic-Nac core used by the whole Sparkle ecosystem: shared model adapter, workflow engine, jewelry intake logic, photo-role rules, catalog truth, tool registry, evals, and smoke harness. Each product should pass product context, permissions, account tier, and destination into that shared core.

**Sparkle Suite remains launch priority while preserving shared-core architecture**
Sparkle Suite is still the priority product for launch and near-term hardening. Sparkle Finder work can wait, but Sparkle Suite Nic-Nac changes should avoid Suite-only assumptions that would make a later shared Sparkle Finder integration a rewrite. When Nic-Nac reaches launch-good-enough in Sparkle Suite, Sparkle Finder Silver should plug into the same Nic-Nac core rather than receiving a fork.

**Product context changes the destination, not Nic-Nac's identity**
For Sparkle Suite, the shared Nic-Nac core may end a jewelry intake workflow by adding a rep Trade Board listing. For Sparkle Finder Silver, the same core should end the equivalent workflow by adding or updating jewelry library/catalog data. The rules, tools, intake state, and eval expectations should stay shared; only allowed capabilities and mutation destination differ by product/account.

**`/Nic-Nac` is the house command for loading the Nic-Nac skill**
When Louis or a future teammate starts a request with `/Nic-Nac`, the agent should treat it as an explicit instruction to load and follow `sparkle-nic-nac-agent-architecture`. This convention is now included in the skill metadata, body, and UI metadata so future sessions should recognize it before touching Nic-Nac architecture, tools, photo roles, routing, evals, or smoke tests.

**Public customer-site context is a first-class contract**
Sparkle Suite public/customer routes and APIs must carry rep/site identity through one shared target resolver and runtime context, not through per-page assumptions. Valid target sources include explicit `c`/`repId`, `publicSiteSlug`, slug path/referrer context, and real rep custom domains. Canonical platform hosts such as `yoursparklesuite.com` and `www.yoursparklesuite.com` must not be treated as rep custom domains.

**Targeted public pages must fail closed instead of falling back to demo data**
When a customer-facing page is targeted to a rep or public slug, missing or unresolved data should show an empty/closed state for that target rather than silently showing seeded/default/demo inventory. The June 16 Trade Board mismatch proved that a page can initially render the right rep context and then lose it during client-side refreshes if the browser API call does not preserve the same target.

**Public mutations must bind to the resolved rep context**
Customer-facing actions such as Trade Board refresh, trade requests, signup/audience actions, and unsubscribe must carry stable rep/site context into API calls. Mutations should verify that submitted ids belong to the expected rep when possible so a stale card, wrong listing id, or lost target cannot act against another rep's board.

---

## June 15, 2026

**Saved customer-site settings own the live customer site after setup is unlocked**
After a rep reaches `dashboard_unlocked`, stale required-setup draft answers must not override workspace Site Settings for the public customer site or live preview. Required setup can guide onboarding while setup is active, but once the workspace is unlocked the saved Site Settings record is the source of truth for customer-facing skin, copy, routes, and visibility.

**Customer-site theme fixes require stable-demo route verification**
Do not mark a customer-facing theme/skin bug fixed from workspace state, API save response, or template payload alone. The required proof is: save through the real workspace path, read back persisted Site Settings, inspect required-setup state for stale values, verify the public template endpoint for the same rep/slug emits the selected preset, then verify the rendered stable-demo customer route and live-preview route at `https://sparkle-suite-demo.vercel.app/`. If the bug was "I saved a skin but the live site still shows Amethyst," the closeout must prove the rendered route no longer shows Amethyst.

**Stable demo is the only default review target for Sparkle Suite demo fixes**
Louis reviews Sparkle Suite demo behavior at `https://sparkle-suite-demo.vercel.app/`. A raw Vercel preview URL is only supporting evidence unless Louis explicitly asks to review that preview. Deployment closeout must include alias promotion/confirmation for the stable demo target.

**Site Settings uses an explicit save on the settings screen**
Sparkle Suite public/customer-facing Site Settings should use an explicit `Save site settings` action with visible status text. The save control belongs inside the Site Settings screen where the edits happen, not as a floating global dock over the workspace. This keeps the action scoped to the settings it changes and avoids confusion with unrelated workspace sections.

## June 10, 2026

**Ring size is physical listing data**
Bomb Party ring sizes are usually on the ring box, not the jewelry label. Sparkle Suite should treat ring size as data about the rep's physical Trade Board listing rather than shared catalog/design metadata. Nic-Nac should ask for the ring size before adding an RG/ring listing whenever it cannot read the size from a box/details photo.

**Sparkle Suite referrals launch without a hard cap**
Referral rewards should not have an artificial cap at launch. If a rep sends many legitimate paid referrals, Sparkle Suite should reward that behavior. Any abuse handling can start as manual review until real usage proves a need for automated limits.

**Referral reward rule**
The working referral rule is: after a referred rep has three paid subscription months, the referring rep earns one credited month. The user-facing Account section should explain this plainly and show the rep's code/link plus pending, earned, and credited counts.

**Stripe live smoke is a launch gate**
The referral automation is not considered launch-ready until live Stripe is checked immediately before launch: live webhook endpoint, live webhook secret in Vercel, required Stripe events, checkout flow, and referral credit behavior all need one controlled smoke test.

**Chrome reviewer-smoke is required for live-site UI checks**
For Sparkle Suite deployed verification, logged-in workspace smoke tests, Help
& Resources checks, Account/Billing checks, and Nic-Nac UI checks, use the
`sparkle-suite-production-smoke` workflow and Chrome reviewer-smoke when the
Chrome connector is available. Reviewer/demo mode uses safe data inside the
live site. If Chrome reviewer-smoke is skipped, say so explicitly and explain
why.

**The live production domain is the Sparkle Suite deploy target**
Louis expects approved work to appear at
`https://www.yoursparklesuite.com/`. Raw Vercel deployment URLs and the former
demo alias do not count as deployed for Louis's review.

**Sparkle Suite code changes should be pushed and deployed for Louis review**
When Sparkle Suite implementation changes are made for Louis to smoke test, the
default closeout is: commit the active repo work, push the branch, deploy the
exact tip to Vercel production, confirm both live domains resolve to it, and
verify the affected path at `https://www.yoursparklesuite.com/`. Do not stop at
local verification unless Louis explicitly asks not to deploy.

**Workspace pages should fill the available app column**
The rep workspace should not have an internal max-width that creates a large blank gutter beside the fixed Nic-Nac panel at 100% browser zoom. Keep the left workspace column fluid within the app shell, with stable spacing and no accidental horizontal overflow.

**Account/Billing typography should be compact**
Nic-Nac chat can remain intentionally larger for on-the-fly reading, but Account/Billing and similar operational dashboard areas should use smaller, consistent dashboard typography so cards feel like the rest of the workspace.

---

## March 29, 2026

**Open Brain confirmed as first-class Phase 2 requirement**
Supabase + pgvector confirmed as the permanent memory solution. Not optional. Must be completed before any other Phase 2 orchestration work begins.

**GitHub vault confirmed as bridge**
The `/vault/` folder in this repo is the interim memory system until Open Brain is live. All AI tools should read it at session start.

**AI tool compatibility — no proprietary lock-in**
Everything built must work equally with Claude and Gemini. No proprietary formats. Plain Markdown, standard SQL, open formats only. Rationale: race between Anthropic and Google means no safe bet on a single provider.

**NotebookLM added to confirmed stack**
NotebookLM confirmed as primary research tool. Use cases: intelligence reports, source synthesis, Bomb Party knowledge base building.

**Multitask by default**
Any task that can run via Claude Code or Co-work runs in parallel, never sequentially. This is a standing operating principle.

**Redundancy plan established**
- GitLab mirror for repo
- Supabase Pro daily backups plus weekly SQL export to Google Drive
- Make.com scenarios exported monthly
- 2FA required on all accounts
- API keys in `.env` only — never committed to repo
- Bitwarden for password management
- Key rotation every 90 days

**AI tool philosophy locked**
Claude is primary. Gemini is active backup. Both must work equally. No lock-in to either.

**Disaster recovery runbook flagged**
Flagged as a Co-work task to be completed once vault is live.

---

## Earlier Decisions (from master doc)

**Framework: Next.js 16 + TypeScript + Tailwind CSS + App Router**
Selected for Vercel-native deployment, strong ecosystem, and App Router for modern routing patterns.

**Hosting: Vercel**
Selected for seamless Next.js integration, preview deployments, and zero-config CI/CD from GitHub.

**Automation: Make.com**
Selected at $9/mo entry point. n8n identified as hot-swap if Make.com is outgrown.

**Email: Resend**
Selected for developer-friendly API. Postmark and SendGrid identified as hot-swaps.

**Scheduling: Cal.com**
Selected for open-source flexibility and clean embed experience.

**Payments: Stripe**
Standard selection for reliability and ecosystem.

**Agreements: SignWell**
Selected for e-signature workflow.

**DNS split strategy**
Cloudflare manages neonrabbit.net. Cheapnames manages client domains.

**Chrome extension — sideload first, Web Store second**
Live Reveal Queue shipped as sideload to unblock clients. Web Store rebuild is a Phase 2 parallel track.

**Obsidian as visual interface**
Obsidian layered over the same GitHub vault files for a visual knowledge graph. Does not replace the vault — it reads from it.

---

## May 31, 2026

**Sparkle Suite work moves toward cloud batch execution**
Louis wants large batch work to continue through `/goal` instead of many small stop/start chunks. The correct operating model is not to shrink the work; it is to move heavy repo work off the older Windows laptop and into GitHub Codespaces or equivalent cloud workspaces. The laptop should become the control panel, not the build machine.

**One big batch per repo, not many local builds at once**
Do not run multiple serious local repo builds/dev servers in parallel on Louis's laptop. Big batches are allowed and preferred, but each heavy repo should run in its own cloud workspace once Codespaces is stood up. Until then, work one heavy repo at a time locally.

**End-of-session safety rule locked**
Commit means a checkpoint saved locally. Push means backed up to GitHub. At session close, important work must be committed and pushed to GitHub so another machine or Codespace can resume it. Vercel deploys from GitHub; Supabase hosts app data; the laptop is not the production host.

**Codespaces pilot approved**
After current stopped sessions are safely closed, inventory the Sparkle Suite repos, make sure important work is pushed, then stand up GitHub Codespaces for the three heavy repos first: Sparkle Suite, Sparkle Finder, and Sparkle Rep Onboarding. Marketing can stay local/lightweight unless it becomes build-heavy.

**Sparkle repo naming direction**
Rename repo concepts toward clear product names:
- `neon-rabbit-core` should become `sparkle-suite` for the main rep-side platform and workspace.
- `sparkle-suite-customer` should become `sparkle-finder` for the customer/collector hub.
- `sparkle-suite-marketing` should become or remain `sparkle-marketing` for campaigns, videos, content plans, and marketing assets for Suite and Finder.
- `britt-with-bling-start-strong` should become `sparkle-rep-onboarding` because it organizes rep setup/access/resources rather than replacing Bomb Party University training.

---

## June 2, 2026

**Sparkle Suite near-term work is local-first again**
Codespaces remain useful in theory, but Codex Windows GitHub/OAuth tooling created a multi-day blocker. Near-term Sparkle Suite implementation, build, test, commit, and push work should happen in `C:\Users\louis\sparkle-suite-repo`, with GitHub as source control and backup. Codespaces are paused unless Louis explicitly reselects them.

**Binder and active repo are separate**
`C:\Users\louis\sparkle-suite` is the lightweight binder/Open Brain bridge only. Do not build, test, commit, push, install dependencies, or place app source/build artifacts there. `C:\Users\louis\sparkle-suite-repo` is the active local Sparkle Suite repo workbench.

**Post-launch landing review branch**
The post-launch landing/signup review is on branch `codex/sparkle-cross-phase-hardening` in `louis623/sparkle-suite`. Latest pushed checkpoint after the first local review pass: `8ca775d feat: polish public signup Nic-Nac flow`.

---

## June 10, 2026

**Ring size belongs on rep Trade Board listings**
Ring size is physical-item inventory data for Trade Board ring listings, not shared jewelry design data. Nic-Nac should capture `ringSize` when adding RG/ring items, and if the size is not visible from the label/photo/details, he should ask the rep for the size before adding the listing.

**Ring labels do not reliably include size**
Louis confirmed from live jewelry handling that Bomb Party ring size numbers are usually on the box somewhere but not on the label. Nic-Nac should not assume OCR/label capture will provide ring size.

**Manual Supabase dashboard apply is acceptable only as a recovery path**
When Supabase CLI auth/linking is blocked but Louis has opened and authorized Supabase in Chrome, a narrow dashboard SQL apply is acceptable for an active blocker if the local migration is first made idempotent, schema-qualified, and followed by a direct SQL verification query. CLI auth/linking still needs to be restored later.

**PostgREST schema cache reload belongs in schema migrations that unblock deployed app reads**
For deployed Sparkle Suite changes that add columns read by Supabase/PostgREST-backed app routes, include `NOTIFY pgrst, 'reload schema'` in the migration so the deployed app does not keep seeing a stale schema after the column exists.

**Stable demo alias moves only after reviewer-smoke clears the path**
Do not promote `https://sparkle-suite-demo.vercel.app` to a new preview merely because build/deploy succeeds. For logged-in workspace changes, use Chrome reviewer-smoke first and confirm the affected dashboard panels load without console errors/warnings.

**Fulfillment completion should guide the rep to add the received piece**
When a fulfillment item is marked completed, the UI should preserve a next-step prompt telling the rep to add the received piece to the board when ready. Automatic linking from `trade_fulfillment.received_listing_id` to a newly added listing remains a separate product decision.

---

## June 11, 2026

**Production self-serve signup can be enabled for beta once live checkout opens and unpaid sessions clean up**
Sparkle Suite production self-serve signup is acceptable for soft beta after live Stripe prices, live webhook endpoint, Vercel Production env, Supabase pricing RPCs, and expired-checkout cleanup are verified together. The June 11 smoke opened live Stripe Checkout and verified unpaid founder slot release without submitting payment.

**Open-only live Stripe smoke is the safe pre-payment gate**
For production billing readiness, it is acceptable to create a synthetic rep and open live Stripe Checkout without entering card details, then expire the Checkout Session and verify webhook cleanup. Do not submit real payment during this smoke unless Louis explicitly approves a real paid transaction at action time.

**Founder pricing slots are reservations until payment completes**
Founder pricing sequence numbers should be reserved during checkout to prevent race conditions, but unpaid/expired sessions must release the slot. A paid subscription is what makes the founder sequence durable.

**Manual Supabase dashboard apply remains a recovery path when CLI linking is blocked**
Because Supabase CLI linking is still not restored, manual Dashboard SQL application is acceptable for launch-blocking production migrations only when the migration is idempotent, directly verified, and PostgREST schema cache is reloaded. This was used for `20260611133605_ss_founder_pricing_uniqueness.sql` and `20260602150000_ss_stripe_event_processing_status.sql`.

**First real paid beta signup should be watched**
The production checkout page and expired-session webhook are verified live, but no real card/payment was submitted. The first actual paid signup should be actively monitored for `checkout.session.completed`, `invoice.payment_succeeded`, subscription row creation, required setup/Nic-Nac onboarding state, and referral reward tracking.

**Trade Board rep alert escalation is tabled until smoke testing**
Stronger rep alert status for new trade requests is a good candidate idea, but it should not be built yet. Louis wants to smoke test the actual live trade/swap workflow first and research the real timing pattern, because the expected flow is usually an immediate live-show swap between the rep and customer rather than a delayed request hours later.

---

## June 12, 2026

**Live trade requests are reveal swaps, not customer-shipped trades**
The canonical Trade Board workflow is a live-show swap: the customer dislikes the item just revealed, chooses an existing board piece, and the rep swaps the pieces while both pieces are still physically with the rep. The customer never has the just-revealed item, has no photos, and does not ship anything back.

**Item-number capture is the fast live-show anchor**
The rep-facing workflow should ask: `Which item number was just revealed for the customer?` That item number is the minimal reliable capture during a live show. If the jewelry design already exists in the catalog, Sparkle Suite can add the replacement board listing quickly; if not, the item number preserves the after-show cleanup trail.

**Do not depend on Live Queue for revealed item identity**
Live Queue remains useful for ordered reveal workflow, but it should not be used to infer the trade swap item number. It scrapes the Bomb Party ordered customer queue and reveal checked-off state; it does not provide revealed item numbers, reveal IDs, cue codes, or enough item-level context to strengthen trade capture.

**Unknown or incomplete replacement pieces should not block the show**
If the just-revealed item is unknown to the jewelry database, or if it is a ring missing size, approve the trade and put the swap into cleanup instead of forcing full Nic-Nac catalog intake during the live show. This preserves speed while keeping the rep accountable for after-show completion.

**Production pressure test clears tested trade-swap paths**
The June 12 implementation and pressure test found no functional issue in the tested backend/API/UI paths. Parallel approvals, duplicate requests, blank item numbers, cross-rep approval, rapid double-submit, known/unknown item handling, and cleanup persistence all behaved correctly. This is not the same as a real multi-device live-show timing test with extension behavior, so that remains a separate caveat.

**Additional rep alert escalation remains tabled**
Do not build stronger rep notifications for new trades yet. Louis wants to smoke test/research real timing first because most trades are expected to be immediate live-show conversations rather than delayed requests.

**Support reports should alert after Support Auditor, not before**
For v1 support intake, a report submission should save the report, run `Support Auditor` directly, store the audit, and then send one enriched Google Chat alert. Do not add a recurring cron for this path unless future volume/reliability evidence justifies it.

**Google Chat is the support messenger for now**
Louis prefers Google Chat over Telegram for support alerts. Vercel Production must have a non-empty `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL`; June 12 verification found and fixed an empty production value.

**One independent rep equals one client account profile for v1**
Sparkle Suite beta clients are independent reps, one client/account per rep. The canonical support-facing profile should live in `client_account_profiles` and be refreshed/snapshotted from existing rep/setup/subscription data when support reports come in.

**Support learning belongs in reusable lessons at resolution**
Support memory should accumulate when issues are resolved, not during raw intake. Approved resolution closeouts should create reusable `support_lessons` rows with affected area, symptom, root cause, fix/workaround, and tags so future Support Auditor runs can surface prior lessons.

**Support Command Center v1 is display-first**
The current `/control-center` replacement should be simple and reliable: support inbox, report detail, client profile, audit summary/findings, and display-only resolution/lesson state. Rich editing workflows can be added during the fuller dashboard rebuild.

**Support form should require the workflow-first confirmation**
Help & Resources support reporting should tell reps to start at the top of Help & Resources, open the relevant workflow guide, follow applicable steps, and ask Nic-Nac if still blocked before submitting. The form should include a required checkbox confirming those steps were tried so support reports do not become the first stop for ordinary workflow confusion.

**Permanent dashboard link is the public `/dashboard` path**
Louis-facing dashboard handoff should use one simple bookmark: `https://www.yoursparklesuite.com/dashboard`. Do not hand Louis raw Vercel deployment URLs as the regular dashboard link. `/dashboard` should redirect to `/control-center`, and protected dashboard access should preserve the post-login target with `/login?redirect=%2Fcontrol-center`.

**Supabase Auth Site URL must match Sparkle Suite, not HQ**
Sparkle Suite Supabase Auth URL Configuration should use `https://www.yoursparklesuite.com` as `SITE_URL`. The June 12 HQ redirect incident came from Supabase still pointing to `https://neon-rabbit-hq.vercel.app`, even though the app route itself was correct. Sparkle Suite redirect wildcards should remain allowed for `www.yoursparklesuite.com`, `yoursparklesuite.com`, `sparkle-suite.vercel.app`, and `sparkle-suite-demo.vercel.app`.

**Workspace sections must never blank because optional billing details degrade**
Paid workspace access may depend on subscription status, but optional account details such as Stripe payment method/invoice lookup or referral summary should degrade gracefully. If account/access state is loading or missing, the dashboard should show a visible account/access fallback rather than rendering an empty center panel.

**Durable Nic-Nac rep preferences require explicit future-memory language**
Nic-Nac should store lasting rep preferences/processes only when the rep clearly asks for future memory, such as "remember this for future chats", "from now on", "going forward", or "I prefer". Current-show language like "remember that for this show" should remain in show-session memory, not durable profile memory.

**Nic-Nac memory timestamps are server-owned**
Durable rep notes must use the server's current timestamp for `conversation_date`. The model may summarize the memory, category, and source, but it should not decide the stored timestamp because stale or invented dates can bury a new preference outside recent memory retrieval.

---

## June 15, 2026

**Nic-Nac Trade Board intake must be smoked like a real rep conversation**
Nic-Nac Trade Board add-listing QA cannot rely on prompt-text tests, route health checks, or unit tests alone. The workflow must be smoke tested end-to-end as a rep would use it: logged-in synthetic/reviewer account, real chat UI or real `/api/nic-nac` route, real upload parts, and the actual model/tool loop. A smoke run is not complete unless it proves the assistant keeps `add_listing` active, handles label photos and jewelry photos as separate inputs, and avoids manual-workaround language.

**Label/details photos are label-only**
For Trade Board intake, a label/details/tag/back-of-card photo is only a source for item details. Even if visible jewelry appears in that label/details photo, it does not satisfy the customer-facing jewelry photo requirement and must not be critiqued as the jewelry photo. Nic-Nac should extract details from the label, accept rep-provided collection/details, then ask for a separate customer-facing jewelry photo when that photo is still missing.

**Boxed jewelry display photos are valid customer-facing jewelry photos**
Earrings, necklaces, rings, and similar pieces may be photographed in their original Bomb Party box/display packaging. A boxed display photo is acceptable when the jewelry is centered, close, clear, and website-worthy. Nic-Nac should not demand unboxed, no-packaging, or plain-background retakes for a clear boxed display shot.

**Create a local smoke asset fixture folder**
Use a local folder such as `C:\Users\louis\sparkle-suite-smoke-assets` for repeatable Sparkle Suite smoke fixtures. It should hold known label photos, boxed jewelry photos, deliberately bad photos, and a simple cases file describing expected outcomes. Codex should use browser/Chrome automation with reviewer-smoke/synthetic sessions to run those fixtures through Nic-Nac rather than making Louis manually discover every edge.

---

## June 18, 2026

**Accepted Trade Board photos should not get extra pushback**
When a customer-facing jewelry photo is good enough to accept, Nic-Nac should add the listing and avoid quality caveats or "want to swap it?" language. Only genuinely unacceptable photos should trigger coaching or a retake request.

**Birthday collection names must include the year**
Birthday collection names must include the year in database, catalog, Trade Board, and Nic-Nac intake contexts, e.g. `April Birthday 2026`, `May Birthday 2026`, `July Birthday 2026`. Future years such as 2027 should remain distinct for set clarity, even when trades across years are allowed.

**Trade request descriptions replace item-number pressure**
Customer trade request copy should ask for a brief description of the just-revealed piece, including collection and type, rather than asking primarily for an item number. The form should recommend an optional reveal screenshot because it materially helps the rep facilitate the live trade.

**Reveal screenshots are short-lived trade-request evidence**
Reveal screenshots should be visible to the rep from the Trade Board request inbox/detail context. They do not need indefinite storage; short-lived retention is preferred so Sparkle Suite helps the rep during the trade without accumulating unnecessary image data.

**Mile High Fizz is a bespoke migration, not a reusable skin preset**
Mile High Fizz should remain a custom hybrid site: original MileHighFizz.com look/feel/content as closely as possible, with Sparkle Suite automations inserted and styled to match. It is not a generic Amethyst skin preset.

**Existing-site migrations require source code for exact work**
For rep websites that already exist, the migration intake gate is source code, a project export, or a repository. Screenshots and live URLs can guide comparison, but they are not enough for an exact migration unless Louis explicitly accepts a close recreation.

**Ask migration questions one at a time**
For fuzzy migrations, ask Louis one focused next question at a time. Long questionnaires are inefficient because early answers often resolve later questions.

**Sparkle Suite automations keep their behavior inside custom sites**
Trade Board, Live Queue, Calendar, Join, tickers, and Nic-Nac-managed settings should behave like standard Sparkle Suite automations even when placed inside a custom rep-branded website. The customization is the presentation layer unless Louis explicitly asks for behavior changes.

**Rep workspaces stay standard unless explicitly customized**
For Mile High Fizz-style public-site migrations, the rep workspace can remain normal Sparkle Suite. Custom branding belongs to the public customer site unless Louis asks otherwise.

**Trade request confirmation state must survive board refresh**
Customer trade request success/error state should be owned by the request sheet, not reset by changes to the available listing collection. A successful request normally removes or hides the requested listing, so customer confirmation cannot depend on `availableSamples` staying stable after submit.

**Trade request screenshot smoke needs two checks**
For reveal screenshot work, smoke both the backend evidence path and the visible customer confirmation path. The backend path must prove request creation, listing `pending_trade`, screenshot metadata/storage, and rep-scoped inbox visibility. The rendered customer path must prove `Request sent.` remains visible after the board refresh.

**Synthetic public-site smoke slugs must be valid public slugs**
Use lowercase alphanumeric slugs only, such as `codex45e01bea`. Do not use hyphenated smoke slugs for public-site route or targeted board smoke, because Sparkle Suite public-site slugs reject hyphens and invalid slugs can silently exercise fallback/demo inventory instead of the intended rep board.

**Control Center keeps demo accounts separate from active customer accounts**
The Control Center customer view should not mix smoke/reviewer/sample/demo reps with real customer accounts. Until durable account classification exists, treat Mile High Fizz, Britt With Bling, and BlingKitchen as the active customer database and render all other operator-visible profiles in a separate Demo Database with a visible Demo Account label.

**Sparkle Suite review target is the stable demo URL**
For Louis, ordinary Sparkle Suite review and deploy work should land at `https://sparkle-suite-demo.vercel.app/`. Do not make him chase raw Vercel preview URLs or explain routine work as if demo and production are separate review surfaces. After any deploy intended for Louis, promote/confirm the stable demo alias and verify the exact route there before saying it is fixed. If Louis reports that he still sees the bug, inspect the exact Chrome tab/URL he is using and check the loaded assets before making another claim.

---

## June 22, 2026

**Nic-Nac is one shared Sparkle ecosystem agent**
Nic-Nac should remain one shared agent across Sparkle Suite and Sparkle Finder, not copied product assistants. Shared pieces include persona, model/provider adapter, memory context, workflow state, jewelry intake rules, photo-role rules, catalog truth, tool contracts, evals, smoke harnesses, and observability. Product context decides allowed tools and final mutation destination.

**Secret Rep ID Number is the private cross-product rep link**
Use the private Live Queue sync code as the rep's Secret Rep ID Number for Sparkle Finder claiming. Label it private / do not share. Do not use the public referral code for identity linking.

**Sparkle Finder can share Nic-Nac memory but not Suite mutation authority**
A linked rep should feel like they are talking to the same Nic-Nac in Finder and Suite. Finder can preload Finder-safe memory and bounded Suite linked-rep memory, but Suite workspace mutations must be performed from Sparkle Suite after the rep logs in there.

**Nic-Nac model policy is OpenAI-only for the current baseline**
Current model policy: `human_default` uses `gpt-5.4` with medium reasoning, `human_escalated` uses `gpt-5.5`, `utility_fast` uses `gpt-5.4-mini`, and `lab_synthesis` uses `gpt-5.5` with bounded high reasoning. Do not reintroduce route-level Anthropic/Haiku/Sonnet hardcoding for Nic-Nac. Reassess models later through the same eval/smoke bank, not by vibes.

**Sparkle Lab recommends; it does not mutate production**
Sparkle Lab is a bounded improvement/research loop in Control Center. It may create findings, artifacts, replay cases, and recommendations, but it cannot change prompts, tools, model policy, schema, deployment settings, or production behavior without explicit approval.

**Stable baseline means gates pass, not improvement stops**
The upgraded Nic-Nac baseline is done when the stable baseline closure matrix passes across Suite, Finder, linked-rep memory, Lab, model policy/cost telemetry, browser smoke, and release/vault closeout. Deeper Finder tool parity, shared-core extraction, larger eval banks, richer Lab synthesis, and marketing polish are backlog unless a baseline gate fails.
# June 30, 2026

**Trade approval can skip revealed item-number capture**
The live-show swap capture flow remains the preferred path when the rep has the just-revealed item number handy, because it can immediately add known pieces back to the board or queue cleanup for missing details. It must not block show-floor approval. Workspace and Nic-Nac flows should allow approving the trade without the revealed item number and direct the rep to add the revealed piece later with Nic-Nac.

**Catalog photo corrections are available but canonical replacements must be approved jewelry-front assets**
Nic-Nac should use `report_jewelry_catalog_issue` for routine shared jewelry catalog issues, including bad canonical photos, instead of saying the tool is unavailable or sending routine cleanup to Louis. Canonical catalog photo replacement remains guarded: use only an approved jewelry-front replacement URL from the catalog/photo pipeline. Never replace a canonical catalog photo with a label/details, tag, back-of-card, or unapproved raw upload.

---

# July 1, 2026

**Moonstone is a reusable skin, not a Heather-only custom site**
Heather's purple, silver, and charcoal direction should live as the reusable Moonstone appearance preset (`moonstone`, card code `MS-01`). Heather's customer-facing Home, Trade Board, and Join pages should use the standard Amethyst/Sparkle Suite structure with the selected skin applied. Her special exception is `In the Pantry`: the Pantry link remains available for BlingKitchen, and the Pantry page inherits whichever supported appearance preset Heather chooses.

**Heather's recipe workflow stays image-first**
Heather's default recipe workflow should be simple: title, category/section, food photos, and recipe-card photos. Nic-Nac should build polished recipe copy from those source images, and manual text editing should live behind the explicit `Manual Edit Recipes` mode with a saved-recipe picker. Accept useful food and recipe-card photos; reject only genuinely bad, unreadable, or non-display-worthy images.

**BlingKitchen calendar fallback is rep-specific and DB-safe**
Saved calendar rows remain authoritative for Heather's public Live event calendar. If BlingKitchen has no upcoming DB rows, Sparkle Suite may render a BlingKitchen-only fallback from Heather's known public Monday/Wednesday/Friday 7 PM Eastern schedule. Do not show generic demo events on targeted customer sites.

**Moonstone light surfaces need local dark text variables**
Moonstone's dark page background can keep light page text, but silver-pearl cards, recipe cards, modals, forms, chips, and buttons must set local dark foreground variables. Avoid broad page-level Moonstone selectors that accidentally make standalone dark-background section headings or light-card body copy unreadable.

---

# July 2, 2026

**Onboarding links do not auto-publish public team cards**
Team Management has two related but separate workflows: Start Strong onboarding access/progress/messages, and public Join Team roster cards. Creating an onboarding link should not automatically publish a rep to the customer-facing Join Team page. The team lead should explicitly save or show a Public Team Card before the rep appears publicly.
# August 4, 2026 - Workspace and landing-page decisions

- **Nic-Nac stays central.** A new conversation is an icon-level action beside the heading; it must not shrink the assistant into a sidebar or a narrow chat slice.
- **Stripe owns payment operations.** Sparkle Suite presents the plan and one destination button, labelled Stripe Billing and Payments; it does not recreate card-on-file, invoice history, or payment-management views.
- **Grandfathered offers are explicit account contracts.** Brianna's current presentation is $39/month with no build fee and the approved Stripe link. Do not infer a different price from general plan history.
- **The public landing page proves configuration breadth with real examples.** Use the supplied customer-site screenshots, not generated substitutes, in a dedicated customization section. The copy promise is that reps can make the customer-facing experience fit their brand while retaining the core show, queue, trade-board, and update paths.
- **Layered screenshot decks must be readable.** Vertical separation is a requirement, not ornament: each card needs enough exposed hero content to demonstrate that it is a distinct customer-site style.

# August 8, 2026 - Customer operations and BlingKitchen intake decisions

- **Customer List and Messages are different products.** Customer List is the editable, importable rep-owned contact roster. Messages remains a visibly separate `Coming soon` communications product. Importing a roster must never establish SMS/email marketing consent.
- **Customer imports must deduplicate conservatively within a rep.** Use email/phone only inside the authenticated rep's workspace; update a single certain match, create a no-match profile, and skip ambiguous matches. Preserve values the import omits.
- **Waitlist deletion is deliberate and historically safe.** The operator sees the entry name and makes a second explicit delete click. Delete the waitlist source itself, but preserve old linked launch/agreement artifacts by clearing their source relationship and recording removal; never substitute a soft visual hide for a real removal.
- **Heather's recipe tool is direct and photo-structured.** Do not present a Nic-Nac route or a `Let Nic-Nac choose` category in the beta editor. Capture outside and inside food photos as separate public placements; accept one or more private source-card/page photos for recipe facts; format a reviewable draft before save. Private source photos never render on the customer site.
- **Per-rep customer-site assets balance consistency and flexibility.** Use a stable representative lettermark for the favicon and share preview composition that derives palette/context from the active customer site. This avoids a full rebrand whenever a rep changes a skin while keeping an identifiable tab/search mark.
- **Public custom domains require content-level verification.** DNS/alias success is incomplete until the resolved page shows the intended rep. Verify the actual business/tenant after every attachment and correct any stale mapping before handoff.

# August 9, 2026 - Control Center, messaging, and billing decisions

- **Control Center has independent operator authentication.** It must not be gated by, or inherit, the currently active Sparkle Suite rep session. An operator needs to switch between customer workspaces and Control Center without signing out of either context.
- **Bug Hunt completion is reversible archival.** Completed operator tasks leave the active list and appear in an accessible archive. Restore makes them active again. Do not conflate completion with deletion.
- **Customer-site contrast is token-based, not exception-based.** Each skin defines semantic foreground tokens for its local cards/final panels/actions/icons. Shared controls consume those tokens; do not add new hard-coded white-on-gradient or light-surface assumptions.
- **Stripe is the sole billing-management surface.** For all current and future accounts, Sparkle Suite shows a single **Stripe Billing and Payments** handoff for active customers. Stripe owns payment methods, invoices, billing history, subscription changes, and cancellation. Sparkle Suite retains only access/checkout gating needed to operate the product.
- **No payment-link fallback for an already-paying customer.** Verify the exact Stripe customer and active subscription before attaching a portal. Never create or expose a new checkout link merely because the local billing record lacks a Stripe ID.
- **Messaging launch gates its wallet.** Keep SMS/mobile-wallet UI and data loading hidden until customer texting/email is actually launched. The preserved implementation must not imply availability or payment responsibility before the communications tool is ready.

# August 16, 2026 - Manual Vercel releases

- **Sparkle Suite releases are manually triggered.** Vercel's Git deployment creation is disabled while the repository link and allowlisted production branch remain configured. A push is source provenance, not a release. For approved application work, validate first and then create one manual Vercel production deployment of the exact branch tip; verify both Sparkle Suite domains and the affected live workflow before handoff. Do not re-enable automatic Git deployment creation without Louis's explicit approval.

# August 16-17, 2026 - Customer-site editing and release lessons

- **Name settings after their visible customer outcome.** A checkbox label must say which public page or surface it controls. The recruiting-page visibility setting and announcement ticker are separate concepts and must remain independently named.
- **Rich ticker content must be composed, not encoded.** Reps should choose an emoji and create a link through visible controls. When a message includes a link, the editor must attach it only to intentionally selected words and provide a one-click way to make a legacy all-message link plain text before repairing it.
- **Customer-site failures are shared-system incidents until disproven.** When a public preview and more than one customer domain fail together, inspect shared renderer assets, compile errors, and cache keys first. Verify at multiple representative tenant routes and a custom domain; never apply a customer-specific patch to mask a shared regression.
- **Existing content editing is a guarded continuation of creation.** Existing recipes should open in the same structured editor used for new recipes, with all stored public/private fields restored. Persist private source materials deliberately, require a second confirmation before deletion, and warn before navigation can discard unfinished edits. Audit/process hardening must not remove customer content.
- **A deployment quota makes release discipline a product safeguard.** One manual deployment of the exact tested tip is the release unit. Documentation pushes are not releases, and automatic Git builds must remain disabled so they cannot exhaust capacity or create an unclear sequence of competing deployments.

# August 17, 2026 - Recipe editor navigation

- **Back actions preserve the nearest meaningful workspace level.** When an existing recipe editor is open, the workspace shell must return to **Current recipes**, not skip directly to the broader Tools menu. The label must name that actual destination. The Tools back action remains appropriate only once the user is at the recipe tool's top level.

# August 17, 2026 - Pantry card vertical rhythm

- **Recipe-card calls to action belong to a shared footer.** Within a responsive recipe grid, cards must be full-height columns with the narrative at the top and prep/servings plus **View Recipe** anchored at the bottom. Use flexible space inside the card body; do not pad or rewrite recipe narratives merely to imitate consistent card height.

# August 17, 2026 - Connected mailbox identity

- **Verify the connector account before treating mailbox search as evidence.** A connected Gmail tool may be authenticated to a different mailbox than the one Louis asks about. Confirm the profile address first; if it does not match, do not infer a negative result from that mailbox, and do not substitute its content for the requested account. Account connection changes require a callable connection control or direct user action in the integration UI.

# August 17, 2026 - Pantry recipe categories

- **Baking & Sweets is the single public home for desserts and baked goods.** New recipe drafts, editor saves, and public rendering normalize legacy `Baking` and `Dessert` into `Baking & Sweets`; do not reintroduce the legacy labels as selectable categories.
- **An All view must have a visibility-safe fallback.** Fixed editorial groups can improve presentation, but any visible recipe whose category is new or unexpected must render in an explicit catch-all group rather than silently disappear.
- **No-bake is a recipe trait, not a public Pantry category.** No-bake desserts and treats belong in `Baking & Sweets`; do not reintroduce `No-Bake Treats` as an editor option, AI output, stored category, or public grouping.

# August 25, 2026 - Suite/Finder source-of-truth contract

- **Sparkle Suite owns the facts; Sparkle Finder owns presentation and customer
  discovery.** Jewelry design IDs/variants, item numbers, rep/show eligibility,
  reservation state, and physical availability are defined by Suite. Finder
  must consume the versioned Suite contracts instead of reconstructing those
  facts independently.
- **Legacy contracts remain during migrations.** New v2 pagination, quantity,
  and Studio continuation are additive. Do not remove v1 endpoints or legacy
  fields until every deployed Finder consumer has migrated and a separate
  removal is approved.
- **A lead is not a dancer.** Listing-row opportunity totals and physical
  pending-adjusted quantities remain separately named. Reservations must be
  serialized and idempotent so concurrent customers cannot overbook a listing.
- **Finder photos are evidence, not canonical Suite assets.** Temporary Finder
  URLs are never stored as canonical photos. Unverified evidence enters the
  explicit operator-review queue and can only be connected to an exact existing
  Suite design through an audited finalization.
- **Finder/Suite repo merging is deferred.** Complete and stabilize this
  compatibility release first; evaluate a monorepo only as a separate follow-up
  with shared contract packages and independent deploy boundaries.
- **The immediate follow-up is due diligence, not implementation.** A new
  session may inspect both repos and recommend a target structure, phased plan,
  gates, and rollback strategy. It may not move code, combine packages, change
  Git/Vercel/Supabase/auth boundaries, or start a merge until Louis reviews the
  readiness brief and explicitly authorizes implementation.
- **Repository consolidation does not imply runtime consolidation.** The audit
  must begin from separate apps, databases/auth, secrets, domains, and release
  lifecycles. Any proposal to combine one of those boundaries is a distinct
  decision requiring explicit approval and evidence.

## 2026-08-26 - One Control Center, separate product appearance surfaces

Decision: Sparkle Suite remains the owner of operator-facing appearance controls. The Control Center switches between Sparkle Suite and Sparkle Finder views, while Finder consumes a narrow public appearance contract and keeps its own application, authentication, database, and Vercel project boundaries.

Reason: Louis wants one operational home and the same visual preset choices without coupling the products' customer auth or runtime state. A shared semantic contract gives Finder centrally controlled styling while preserving the established deployment and security boundaries.

## 2026-08-26 - Finder keeps its place when customers visit outside sites

Decision: Any HTTP(S) link that leaves Sparkle Finder opens in a new browser tab with opener protection. Internal Finder routes and local fixture-preview routes continue in the current tab.

Reason: Finder is the customer's comparison and discovery workspace. Keeping it open makes it practical to inspect several reps, Dance Floors, and live-show destinations without repeatedly reconstructing the search.

## 2026-08-26 - One friendly Message Center, separate permissioned records

Decision: Workspace presents one Message Center, while official broadcasts remain receive-only publication records and Team, Support, and Rep Network use canonical private conversations with type-specific permissions and lifecycle rules.

Reason: Reps should have one obvious place to check without weakening sender trust, guest-token isolation, Support privacy, or Rep Network consent and safety controls.

## 2026-08-26 - Support is the communication path; Help is self-service

Decision: Help remains the Workflow Playbook and links unresolved needs into the Message Center Support composer. Support replies come from **Sparkle Suite Support** through Control Center, and a report becomes a Task List item only after a deliberate operator promotion.

Reason: This removes duplicate response locations while keeping operator triage, internal audit findings, and product planning distinct from the rep-visible conversation.

## 2026-08-26 - Rep Network privacy and rollback boundaries

Decision: Rep Network begins with eligible subscriber-to-subscriber message requests. Operators can inspect only actively reported conversations. Team, Support, and Rep Network composing can each be disabled independently without hiding existing history.

Reason: Controlled consent, report-only operator access, rate limits, blocks, and reversible operational stops provide useful collaboration without turning Sparkle Suite into an unrestricted chat network.

## 2026-08-26 - Broadcasts require a preview and a final explicit publish action

Decision: Official Sparkle Suite broadcasts remain a deliberate two-step workflow: **Review & publish** freezes and previews the audience; the separate final **Publish now** action requires the mass-publication acknowledgement for multi-rep audiences.

Reason: Broadcasting represents Sparkle Suite to multiple reps. Draft saving must remain harmless, and the operator must be able to review both content and the frozen audience immediately before delivery. The UI should guide to the final step rather than hiding it below the composer, but it must never collapse that confirmation barrier.

## 2026-08-26 - Quiet Message Center refresh, not whole-Workspace reload

Decision: The Message Center polls its existing inbox endpoint every 60 seconds only while the Workspace is visible and refreshes again when focus/visibility returns. It updates data and unread counts without a full page reload, avoids concurrent requests, and preserves the last good inbox on an automatic-refresh failure.

Reason: Reps need timely awareness of Team, Support, Rep Network, and official updates, but an automatic page reload can disrupt a reply, Support form, or other Workspace work. This is ordinary application/database traffic; it does not invoke Nic-Nac, an agent, or any paid messaging/AI provider.

## 2026-08-27 - Remy receives a dedicated, capability-limited Communications MCP

Decision: Remy connects through a separate bearer-token-protected MCP endpoint,
not a shared Control Center login or browser session. The connector has only
the approved communication read/draft tools and the one-time approved Support
reply flow.

Reason: A Control Center session has full operator authority and cannot safely
serve as an agent credential. A dedicated endpoint provides narrow capabilities,
rate limiting, metadata-only audit records, and a revocable secret without
giving the agent account, billing, deployment, attachment, moderation, or
ordinary private-message access.

Decision: Louis's chat approval is necessary but not sufficient for a Support
send. The exact reply must receive a durable, expiring one-time approval in
Control Center → Messages → Remy approvals before Remy may send it.

Reason: This gives Louis a visible, auditable action-time control and makes
retry behavior idempotent. The agent cannot silently treat a vague or stale
conversation acknowledgement as permission to represent Louis.

## 2026-08-28 - Grok Bot uses one capability-limited Control Center MCP

Decision: Remy, Nic-Nac, Hale, and Sam share one Grok Bot connector backed by the existing bearer-protected `/api/remy/mcp` endpoint. Agent persona instructions describe intended use, while the MCP enforces the real capability boundary. The only live write remains an exact Support reply with a current one-time Control Center approval.

Reason: Grok Bot exposes the same connected tools to every agent and cannot enforce per-agent credentials. One narrowly scoped server avoids duplicated connectors while preserving Control Center operator approval and blocking broad production authority.

Decision: The broken HTTP `user-Sparkle Suite` OAuth connector is retired rather than repaired or reused. Legacy connector cards may be uninstalled only after the unified card is proven and Louis explicitly confirms the destructive cleanup.

Reason: The OAuth path fails authentication and is not required by the working secure connect-card pattern. Delaying removal until after verification preserves rollback while respecting the action-time confirmation boundary for uninstalling integrations.

## 2026-08-28 - Guardian is an additive read model, not an autonomous operator

Decision: Hale's first Guardian surface extends the shared Control Center MCP and existing operator-health read model. It may flag direct Suite/Finder availability, Suite-side operational counts, and existing Nic-Nac/Lab telemetry, but it receives no deploy, DNS, messaging, suspension, billing, profile, waitlist, report-status, or Lab-run capability.

Reason: Grok Bot persona instructions cannot enforce permissions. Reusing the existing capability-limited MCP keeps enforcement in code and preserves Remy's exact one-time Support approval/send boundary.

Decision: Cross-product gaps remain explicit. Suite directly probes both public domains, but Finder runtime usage/operator counts and deployment history stay `null` or coverage holes until an approved read contract exists across the separate Finder data and Vercel boundaries. Nic-Nac credit balance also remains `null` because current telemetry does not record it.

Reason: A Guardian is only useful if absence of evidence is not silently converted into a healthy zero. Truthful holes are safer than invented spend, credit, deployment, or Finder counts.

## 2026-08-30 - Private onboarding belongs to the saved team card

Decision: A Team Management onboarding link is created and managed from the intended saved private Workspace roster card. A new person is saved as a hidden card first; public visibility remains a separate deliberate choice. Historical participants that cannot be matched unambiguously stay in a compact fallback area.

Reason: The rep card is the clearest identity anchor and avoids a detached creator that can produce duplicate or misattributed onboarding records. Separating private onboarding from public visibility prevents an administrative action from unexpectedly publishing a person.

Decision: Onboarding access tokens remain hash-only. The raw link is shown only immediately after creation or rotation. A fresh link rotates the same participant's token, invalidates the old link, and preserves progress and conversation history.

Reason: Persisting recoverable raw invite links would weaken the existing private-link boundary. Rotation provides a truthful recovery path without duplicating a participant or discarding their onboarding record.

## 2026-08-31 - Founder billing begins with the first real paying founder

Decision: Founder slots count real customers on the current founder contract,
not grandfathered accounts or cancelled demo/onboarding subscriptions. The first
verified paying founder customer owns sequence 1. Their first checkout itemizes
the $49.99 setup fee and first $49.99 month; months 2-12 remain $49.99 and month
13 onward is $74.99 through a Stripe subscription schedule.

Reason: This matches the approved first-20 offer, prevents synthetic history
from consuming a scarce founder slot, and keeps initial payment and later
automatic billing explicit.

## 2026-08-31 - Nic-Nac must complete with a customer-visible response

Decision: Nic-Nac's completion contract is defined by content the chat can
actually render: substantive text, a visible approval request, or a supported
interactive card. Internal tool protocol and tool-output chunks do not satisfy
that contract. If a provider or resolver ends without customer-visible output,
the server emits a safe deterministic recovery reply before the turn completes.
Explicit new product requests also arbitrate durable workflow state for that
turn, suspending unrelated active workflows while allowing passive replies to
continue their current work.

Reason: The production meeting incident showed that a `complete` assistant row
containing only internal resolver output is functionally blank, and that stale
Dance Floor state can otherwise capture an explicit Calendar request. This
server-side invariant protects the customer independently of browser hydration
and model follow-through; release proof must include a tool-backed, multi-turn
product-switch replay.

## 2026-08-31 - Core Nic-Nac reads have app-owned visible summaries

Decision: Dance Floor inventory, incoming trade requests, fulfillment queue,
swap cleanup, jewelry catalog search, trade history, and Calendar listing reads
must have deterministic app-owned customer summaries when the model completes
after a tool result without emitting visible text. Deployed smoke workflows
must treat the generic blank-response apology as a hard failure.

Reason: A tool can return correct structured data while the model produces no
customer-facing prose. Retrying the same request is both frustrating and
unnecessary because Sparkle Suite already owns the authoritative result. The
server can safely format bounded, newline-sanitized summaries and preserve the
generic apology only for truly unknown empty model responses.

## 2026-09-01 - Nic-Nac's top-level conversation becomes model-led

Decision: The next Nic-Nac architecture should use the installed Vercel AI SDK
`ToolLoopAgent` as the top-level conversation and tool-selection harness. The
model owns current-goal interpretation, natural clarification, task switching,
and tool choice. Sparkle Suite continues to own permissions, tenant identity,
schemas, validation, approval gates, idempotency, audits, execution, and proof
of success. Transaction-specific state may support a complex operation, but an
old workflow may not select or force the next conversational tool.

Decision: Nic-Nac's primary guardrail prompt becomes a concise user guide plus
hard safety boundaries. Domain procedures move to tool contracts, service
validation, and grounded knowledge. Implementation, paid replays, production
cohort enablement, and the scheduled isolated canary remain separately
authorized actions.

Reason: The Calendar read-to-add failure proved that the current regex router,
sticky workflow state, and forced first-step tool choice can override an
unambiguous new request before the model gets to reason. Repeated phrase and
workflow patches improve isolated cases while making open-ended rep language
and mid-conversation task switching more fragile.

Decision: The implemented harness is production default-off and must retain the
legacy route until an exact synthetic-reviewer cohort passes capped model-backed
replays and the kill switch is proven. Broad production enablement is not
implied by deploying the guarded code.

Decision: Every tool exposed to the agent must have an independently audited
safety-ledger entry that agrees with runtime read/write behavior, approval
metadata, side-effect risk, surface availability, and Support capability
policy. Outbound SMS and email require explicit approval.

Reason: A capable model may select any tool it is given. Safety therefore must
be complete and enforceable at the capability boundary rather than dependent on
the model remembering a prompt or on a text router hiding most tools.

Decision: Durable Calendar, Dance Floor, and trade workflow records may be
shown to the agent only as bounded recoverable transaction facts. They must
leave `currentGoal` unset, may not select or force a tool, and must be filtered
to the exact workflow domains authorized for the current product or disclosed
Support surface before those stores are queried.

Reason: Useful facts should survive a natural interruption, but a stale task
must not become another conversation-owning router or disclose unrelated rep
work through a narrower Support capability.

## 2026-09-02 - AI cost monitoring is an operations view, not the ledger

Decision: Nic-Nac Cost & Capacity lives in the owner-only Sparkle Suite Control Center. Sparkle Suite and Sparkle Finder remain distinct spend classes with a combined total only when both inputs are complete. Provider Costs API values are labeled actual; per-run telemetry is labeled estimated; prepaid balance is never scraped or presented as authoritative when OpenAI does not expose it through a documented API. Page open and the manual Refresh button use the same uncached read path.

Reason: Louis needs current operating visibility without creating a competing finance ledger or blending products. Lane continues to post the books from OpenAI invoices/costs plus bank evidence.

Decision: Finder shares only bounded Nic-Nac cost telemetry through a dedicated bearer-protected read-only endpoint. Its database, customer auth, and deployment stay separate from Suite.

Reason: Cross-product reporting should not merge customer security boundaries or grant Suite direct access to Finder's database.

## 2026-09-02 - OpenAI attribution uses separate product projects

Decision: Sparkle Suite and Sparkle Finder use separate OpenAI projects and restricted runtime keys. The Control Center uses a distinct read-only organization key for Costs API reads, with project IDs mapped in configuration rather than UI copy. Historical Default-project spend remains unallocated and is never blended into a product class.

Reason: Project attribution must be authoritative at request time. Per-run estimates remain useful operational evidence, but they cannot replace provider-reported actuals or justify retroactively assigning old shared-project spend.

Decision: The dashboard may say whether an observed run matches configured model policy, but it must not claim that model is optimal without comparative workflow replays scoring answer quality, tool correctness, latency, and cost together.

Reason: Model names and spend alone do not establish task fitness. Purpose telemetry plus controlled eval evidence is required for a defensible optimization decision.

## 2026-09-02 - Unused OpenAI setup artifacts remain untouched

Decision: The unused duplicate OpenAI project and first unused Finder runtime key are not a cleanup task. Leave them unchanged indefinitely unless concrete evidence shows a security, billing, access, or operational reason to intervene. Any later revocation or deletion requires Louis's explicit authorization and a dependency audit.

Reason: The working production separation is stable, and speculative cleanup is not worth introducing another setup setback.

## 2026-09-02 - Customer show watch links are event-owned

Decision: Public watch destinations belong to an individual calendar event as
an ordered `streaming_destinations` list, not to the rep-wide site link map.
Nic-Nac may schedule an event without a destination, but it must preserve every
valid supplied destination for dual-streaming. Customer cards show Add to
Calendar first, followed by one Watch-on action per event destination.

Reason: Rep-wide social/profile links cannot truthfully identify a specific
show's host, cannot represent dual-streaming, and previously caused the public
card to silently omit or misdirect watch actions.

## 2026-09-03 - Public Join Team copy is tenant-owned

Decision: Every ordinary customer Join Team page must derive its team and rep
references from the resolved customer record. Known demo identities may remain
only when they match that same business; otherwise the page falls back to the
customer’s public business name. Default generic FAQ and promotional content
must not introduce a different rep or demo identity.

Reason: Kim's direct customer `/join` route proved that a hidden navigation
link does not make stale demo content harmless. Public pages must be correct
for their resolved tenant at every direct route, not merely for the dashboard
or demo surface.
# September 2, 2026 — Calendar watch actions use configured customer-site social handles

- Supersedes the earlier event-owned destination decision for customer show cards.
  A Calendar show’s named platform (TikTok, Instagram, YouTube, Facebook, or
  Whatnot) resolves to the matching social handle/link already configured in
  that rep’s customer-facing Site Settings. It does not infer a link from
  media, accept an event-specific override, or persist a separate event URL.
- If that platform has no valid configured customer-site link, the card has no
  watch action and Nic-Nac must say plainly that there is no configured link to
  share yet. Multi-platform show names resolve each matching configured handle
  in the name’s order.
- Customer `Add to calendar` opens a provider chooser: Google Calendar,
  Outlook Calendar, or an ICS file for Apple Calendar/another compatible app.

## 2026-09-03 - Customer-site share assets are stable marks over live skins

Decision: Customer custom domains use a durable single-letter business mark for
their favicon and a 1200×630 social card driven by the resolved customer
domain, live business information, and selected appearance preset. The mark
does not change with a skin; the card palette does. Image routes embed their
display font rather than relying on a system fallback.

Reason: Browser icons need durable recognition, while shared links should look
like the rep's current customer site and render consistently in local and
production image runtimes. The platform host retains Sparkle Suite branding.

Decision: A legacy generic live-show greeting is normalized only in the
social-card presentation layer to grammatical possessive wording (for example,
“Welcome to Kim's Live Show Site.”); it does not silently mutate the rep's Site
Settings value.

Reason: This corrects the public share presentation without expanding a visual
asset release into an unrequested customer-data change.

## 2026-09-03 - Separate operator launch continuity from rep self-setup

Decision: The future Control Center onboarding checklist will be an
operator-only, durable launch ledger nested under the expanded Customer Database
profile. It is not the rep's self-serve setup checklist and may not be inferred
from `dashboard_unlocked` or the legacy `onboarding_status` row. Per-item state
must allow `not_started`, `in_progress`, `waiting_on_rep`, `blocked`,
`complete`, and `not_applicable`, with safe evidence and timestamps.

Reason: Kim's launch showed that account placement and dashboard access can be
correct while external launch work is still incomplete. A persistent, explicit
operator record is needed so a later session can distinguish verified work from
work awaiting the rep, rather than relying on brittle session reconstruction.

Status: Design and reusable skill guidance are complete; the Control Center data
model and UI are not implemented until Louis authorizes that product change.

## 2026-09-03 - Operator checklist stores launch proof, not customer content

Decision: The Customer Database onboarding checklist is a fixed, owner-only
operator ledger. It stores only per-item status, a concise non-sensitive proof
or follow-up note, timestamps, and operator attribution. It does not copy
customer emails, credentials, private intake answers, or the rep's self-serve
setup state. The five-question About intake is displayed as manual guidance;
the resulting About copy remains a deliberate operator edit.

Reason: This makes launch continuity durable without turning an internal
handoff tool into a second customer profile or a store of unnecessary personal
information.

## 2026-09-03 - Keep the operator checklist checkbox-only

Decision: The Customer Database onboarding checklist presents only a checkbox,
a plain-English task name, and a short description. It does not include item
statuses, proof notes, save buttons, or a prerequisite identity checkbox.

Reason: Louis is onboarding one known person at a time and needs a lightweight
reminder list, not an audit process. The five About prompts remain visible as
manual copy-gathering guidance.

## 2026-09-03 - Surface Live Queue codes in the internal Contact panel

Decision: The owner-only Customer Database Contact panel may show a rep's
existing Live Queue sync code for quick support lookup. It reads the canonical
`live_queue` record and shows “Not assigned” if no code exists; it must not
create, replace, publish, or log the code.

Reason: Louis needs quick internal access when helping reps with Live Queue,
without creating another code store or changing live-show configuration.

## 2026-09-03 - Use collapsed-row cues for unfinished onboarding

Decision: Customer Database summaries show the customer-facing show name first
with the rep's first name in parentheses. If any onboarding checkbox remains
unchecked, the collapsed summary gets a light orange background and an
incomplete cue.

Reason: This lets Louis scan customer profiles for pending onboarding work
without opening each record.

## 2026-09-03 - Keep accounting values unavailable until their source is reconciled

Decision: The Control Center Accounting views begin as separate Suite and
Finder foundations. A metric, billing-history field, or expense ledger is
light orange and marked unavailable unless it has an approved source and a
defined reconciliation rule. Subscription/plan amounts are not interchangeable
with payments actually received.

Reason: Financial screens must not imply that an estimate, entitlement, or
pricing configuration is a booked payment. Keeping Finder separate preserves
its independent product boundary while sources are designed deliberately.

## 2026-09-03 - Show projection and actuals as distinct accounting measures

Decision: Sparkle Suite projected recurring revenue is calculated from active
customer subscriptions with a stored positive monthly amount. Actual revenue
is a separate measure that must come from confirmed payments. Expenses and net
also require separate projected and actual sources. Past-due or cancelled
subscriptions are not treated as paid revenue.

Reason: The owner needs forecast visibility from the client list without
concealing late payments, cancellations, refunds, or expense variance.

## 2026-09-03 - Lane gets a separate append-only accounting connector

Decision: Keep the shared Sparkle Suite Control Center MCP read-only. A
dedicated Lane-only endpoint may append validated, aggregate monthly snapshots
for Suite or Finder. It must use its own credential; it cannot share the
Control Center bearer because that bearer cannot enforce which bot is calling.

Each snapshot contains only period-bound aggregate counts, cents, source
status, money basis, and an initial, correction, or restatement reason.
Corrections append a new revision. The connector cannot inspect or mutate
customers, transactions, banking, Stripe, Bluevine, Shopify, invoices,
refunds, transfers, or UI configuration.

Reason: Lane needs a safe way to publish reconciled totals to the accounting
dashboard without turning a shared operational connector into a financial
write surface.

## 2026-09-03 - Lane's visual accounting review is a separate, scoped login

Decision: Lane uses a dedicated `accounting_viewer` Control Center credential
for only the Suite/Finder accounting routes. The login is independent from
Google Workspace and the regular Sparkle Suite Workspace. Its backing internal
principal is required by the existing session integrity check, but has no
password or general Workspace access.

Reason: Lane needs to inspect the displayed accounting books without receiving
an owner session or any ability to see customer information, alter operations,
or perform payment/provider actions.

## 2026-09-03 - Keep Lane accounting writes in the single dedicated MCP

Decision: Lane's website credential remains visual-review-only. The single
dedicated Lane Accounting MCP is the only channel that can read aggregate
current-month snapshots or append validated aggregate monthly snapshots. It
authenticates against a dedicated SHA-256 token digest stored in Supabase;
the bearer itself lives only in Lane's secure connector field. Do not add a
second accounting MCP or make the website viewer editable.

Reason: This keeps visual proof and bookkeeping work clearly separate, gives
Lane the write ability needed for his bookkeeper role, and avoids sharing the
Control Center bearer or adding a Vercel-secret dependency.
