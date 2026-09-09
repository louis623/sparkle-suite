# Open Items

## September 8, 2026 - LOC rebuild release gates

Local implementation and automated/browser checks are recorded in the [checkpoint](2026-09-08-loc-control-center-build-checkpoint.md). Remaining: supported protected synthetic reviewer entry; additive migrations and new server connection configuration; deployed workflow/receipt/support/Finder/memory verification; real Codex/Grok connection proof; physical Fold and parallel-use acceptance. Current center stays live. This is a build handoff, not a replacement for the live Control Center Task List.

## September 8, 2026 (ET) - Live Lineup audit delivered

- [x] Deep audit of weekend incidents and the full current Live Lineup path.
  See `docs/sparkle-suite/audits/2026-09-08-live-lineup-system-audit.md`.
- Permanent repair remains the existing **live Control Center Task List** item
  `e453d5cc-0ac8-4d46-9dab-182a6aa723d7`, not a new vault task. No live task
  state changed during this audit. Recommendations, installed-extension tests,
  safe synthetic end-to-end/load/mobile verification, and release-window
  decisions remain for the next explicitly directed hardening phase.

## September 8, 2026 - Brittany public section correction

- [x] **Restore Brittany's hidden customer-facing About/media block** —
  application `4cf10ebf` / Ready deployment
  `dpl_BESV662NEXSgJnNPCHo4hD7HWs69` restores the existing copy and portrait by
  default while keeping empty optional Sparkle Moment video cards hidden. The
  Workspace switch reflects the restored default and can explicitly hide the
  section later.

## September 8, 2026 - Brittany Workspace media controls

- [x] **Release Brittany-only Workspace media parity** — application
  `a2e0f467` / Ready deployment `dpl_2QEEHmatFCVaoGV53q45AyYWWFQi` adds
  preloaded showcase/portrait controls, three optional short-video controls,
  durable remove/replace state, About publication, and visible standard theme
  switching while preserving the fixed hero and “The Rise of Her.”
- [ ] **Copy Brittany's remaining legacy media when Louis resumes it** — use
  the new Workspace controls to add only the optional videos Louis selects from
  the old site. The About/media section is already public with existing content;
  empty optional video positions remain hidden until populated. Do not fetch or
  upload missing media automatically.

## September 8, 2026 - Consolidated memory closeout

See [session closeout and handoff](2026-09-08-session-closeout-and-handoff.md) for completed welcome/email work, live-show mitigation, final styling, decisions, lessons, and deferred items. Last session-verified app is 48615edf / dpl_GeV9T1ad1sktsRt7VUPr8y6RRvE6; not freshly checked today. This is documentation only. Next session opens Control Center read-only and stands by; no automatic work, sending, credit application, auth repair, or extension changes.

## Latest September 5 release - Brittany button polish

See [button polish closeout](2026-09-05-britt-hero-buttons-closeout.md): app 48615edf / dpl_GeV9T1ad1sktsRt7VUPr8y6RRvE6 on Brittany and Suite apex/www only. Equal hero buttons and matching gold-to-blue gradients, desktop/mobile verified. No live-show behavior changes. Earlier unresolved items remain deferred.

## September 5, 2026 - Live Lineup mitigation and Brittany-only cleanup

See [current closeout](2026-09-05-live-lineup-closeout.md): application 9e96887d / dpl_FZQJFd561g9dtBEv93gjxHb4PgJ9; automatic Live Lineup, clean numbered names, Brittany cards hidden and Dance Floor coming soon. Permanent repair remains in live Control Center Task List e453d5cc-0ac8-4d46-9dab-182a6aa723d7 for a no-live-shows window. Mile High Fizz apex/www release is blocked by existing domain configuration; no DNS changes made. Preserve saved data; do not automatically pursue deferred work.


Current release authority: Sparkle Suite live and demo are one surface at
`https://www.yoursparklesuite.com`. Any older completed-item wording below that
mentions a stable demo alias is historical evidence only and does not control
future work.

- [ ] **Finish landing release signed-in synthetic reviewer verification** —
  app `163bffc9` is live with public checks passing. Louis authorized synthetic
  testing/restoration, but protected reviewer access is unavailable and the
  documented synthetic login failed once. No account was mutated. Resume the
  supported token-gated Britt Test Rep workspace flow when access is available;
  no personal account, live checkout, token disclosure or bypass. See landing
  verification report for exact evidence and remaining limitations.

- [ ] **Louis proof and separately approve the two September 5 Gmail drafts**
  — review the current-rep Live Calendar/Nic-Nac demo message and Kim's surprise
  Gnome Forest flyer note in actual Gmail Compose. Confirm branding, clickable
  thumbnail/text destinations, mobile layout, recipient scope, and final copy.
  Neither draft has been sent; do not send either without Louis's explicit
  instruction for that exact draft.

- [x] **Add Kim's Gnome Forest favicon and social-share card** — completed
  September 5. The customer domain serves a deterministic `G` favicon and
  1200x630 card using the approved artwork and hero copy. Final release is
  `249954e8` / `dpl_7th6mvkpBbscanWHLbrxWYjZKJzJ`; protected customer domains
  did not move. External social networks may need time or their own refresh
  tools to replace cached previews.

- [x] **Activate Kim's Gnome Forest skin and approved hero copy** — completed
  September 5 with Louis's explicit approval. `goforthebling.com` uses GG-01,
  the exact approved Hero title and Hero subtitle, and preserves all other Kim
  content. Released in `a4e4b196` / `dpl_GVnxy1rm8MXCBKaaEwBL3mdeLkSB`.

- [ ] **Run the signed-in Hero title/subtitle editor reviewer click-through** —
  source/rendered-component, API/service, Nic-Nac tool, public Kim site, and
  production verification passed. The protected reviewer token was not
  available locally. Use only the token-gated Britt Test Rep workspace path;
  do not extract secrets or substitute Louis's or a customer's account.

- [ ] **Provision approved lead-specific ChatGPT Sites for private onboarding**
  — the hardened application is released and fails closed unless an exact
  approved base and origin are configured; it will not emit the retired
  personal Britt host. The provider provisioning hook remains manual. Before
  any real invite, approve the Site source/host, configure the documented
  environment values, and run the synthetic Alex checklist. No real invite was
  created during the release.

- [ ] **Run the signed-in Team Management production reviewer click-through**
  — release provenance, public Join, API boundaries, and landing stability are
  verified on `www.yoursparklesuite.com`, but the clean browser session did not
  have the protected reviewer token. Use the supported token-gated Britt Test
  Rep reset; do not substitute Louis's personal account or a customer account.

- [ ] **Locate the canonical Sparkle Suite email signature asset** - use the
  actual approved `S` seal/wordmark export, not a recreated approximation.
  Replace the two existing unsent draft signatures only after visual Gmail
  proof. The tentative signature route in pushed commit `6e5a553e` is
  unapproved. It was removed in the September5 Gnome Garden release (live404,
  source recoverable in Git); this does not approve or finalize Gmail drafts.

- [ ] **Rebuild and obtain visual approval for Louis's five Gmail signatures**
  — current Gmail signature work is an explicitly non-final interim state.
  Begin with approved source assets, preserve the legacy `Louis Neon Rabbit`
  signature, and QA every named signature in the real Gmail Compose viewport.
  Verify brand accuracy, crop margins, proportion, alignment, and
  white-background legibility before claiming completion. Never send mail or
  alter customer drafts during QA; do not message Bunny/other agents unless
  Louis gives fresh instruction.

- [ ] **Louis smoke-test the sole-agent Nic-Nac in the internal demo
  account** - production now has one Nic-Nac route and reports orchestrator
  `agent`. Use the existing non-live, dashboard-unlocked demo entitlement to
  test natural Calendar read-to-add and switches among Calendar, Dance Floor,
  and live-show questions. Do not use a customer account or create billing,
  outbound-message, DNS, or Live Queue side effects during the review.

- [x] **Connect Kim's custom domain after expanded Namecheap DNS access** -
  completed September 3. `goforthebling.com` is attached to the `sparkle-suite`
  Vercel project and the exact active customer record is identity-guarded
  mapped to that custom domain. The former root URL redirect was replaced by
  the required external-DNS `A @ → 76.76.21.21` record; nameservers, email
  forwarding, ownership, contacts, and billing were not changed. Public
  verification passed at the custom-domain root, `/trade`, and `/join`.

- [x] **Publish Kim's approved About section** - completed September 1 through
  disclosed support. The concise approved copy was visually verified on the
  customer-facing site, support was explicitly ended, and the durable Control
  Center Task List item was completed.

- [x] **Provision a dedicated Nic-Nac Support operator** - completed September
  1 in `e334f144` and `1215171c`. The named operator is released with
  customer-site-only support scope; focused authorization tests and the
  production build passed. It has no billing, Stripe, account-control, or
  owner authority.

- [x] **Remove the transparent-support time limit** - completed September 1 in
  application commit `4a6c2e7875266b2de7a86bb1ad44f3fc21cda637`, migration
  `20260901120000`, and production deployment
  `dpl_EoMkRyRt8Q17bAv93iDFqS9cNr8t`. Support now stays active until the
  operator explicitly ends it; no countdown, server timestamp rejection, or
  automatic expiry worker remains. The existing active session was preserved.

- [x] **Supersede the former Suite-owned-only onboarding-host plan** — Rocky's
  September 4 hardening plan now controls. This PR does not authorize GoDaddy,
  DNS, alias, ChatGPT Sites, or production changes. Follow the new lead-specific
  manual provisioning item above and the operator guide before release.

- [x] **Simplify Brittany's onboarding guide and make Nic-Nac the first stop** -
  completed August 31 in Sites source commit
  `ec82456a2e0f492520139649acf4fa308ad89fb5`, version 8, and deployment
  `appgdep_6a95bf816d308191b345a2925c41abad`. The Site now uses one expandable
  six-step path with one action list per step, keeps supporting material
  collapsed, removes redundant help/manual UI, captures the team information
  Brittany needs for a welcome and public team card, and gives Nic-Nac curated
  current-rule guidance with privacy and deliberate Brittany-handoff guardrails.

- [ ] **Confirm Brittany's current shipping and loyalty workflow for New Rep
  Onboarding** - the restored guide keeps the older Ship.com/$19 and
  15-point/free-original references only as clearly labeled historical examples.
  Replace or remove those examples after Brittany confirms the current team
  process; current Bomb Party policy remains controlling in the meantime. The
  12 restored Amazon supply links are also saved comparison examples, not a
  required cart; review their continued usefulness with Brittany and replace
  any stale listing rather than promising current availability or price.

- [x] **Audit Kim's Workspace parity and repair Nic-Nac** - completed August
  30 in final application tip `db801a8e` and production deployment
  `dpl_9G6wf3bzgXiJP2cv2ndhoetMd4QN`. The existing Live Queue assignment now
  renders consistently, plain Nic-Nac turns no longer fail with zero-token
  automatic tool selection, and simple greetings reliably use the subject
  rep's name. Brittany's special Team Management beta was intentionally not
  copied to Kim.

- [ ] **Reconcile Kim's legacy Customer Waitlist entries** - the live Control
  Center still shows two historical Kim waitlist records with the old
  `Account activated` checkbox unset even though her durable customer account
  is active and in Customer Database. Determine the intended archival/linkage
  treatment before changing or deleting either historical record; do not let
  waitlist state affect durable customer classification or Workspace access.

- [x] **Repair Kim's live onboarding account readiness** - completed August 30.
  Her existing customer account now has an active five-day onboarding trial and
  the Sparkle Suite slug `goforthebling`. The live Home, Dance Floor, and Join
  routes passed proofing, the false seeded promo ticker was removed, and
  Control Center now exposes both customer-site and support-access actions. No
  support session or communication was started during the repair.

- [x] **Release transparent operator support access with full rep Workspace
  parity** - completed August 29 in exact application commit
  `bbc1283b4b79c9cc7b29ff3ccd97383930bcea93`, production deployment
  `dpl_Z5DCR55PT3gKsQKeFpTmJxhgoEiJ`, and production migrations
  `20260829122500` / `20260829123000`. Support now uses the real rep Workspace
  and retains transparent notices, history, and action audit; only financial
  and account-control mutations remain blocked. Release smoke intentionally
  created no replacement Lindsey session or duplicate Message Center notice.

- [ ] **Louis review/send Kim's welcome email** - Kim's personalized Gmail
  welcome is deliberately still an unsent draft. It has the approved public
  guide, sign-in, meeting, and official Live Queue Store links plus private
  onboarding details. Do not send until Louis explicitly authorizes sending
  that exact draft.

- [ ] **Confirm Kim's light-box shipping address privately** - the public
  starter guide asks Kim to confirm the best address during onboarding, but no
  address belongs in public content, the vault, or Open Brain. Use the approved
  private fulfillment path when Louis is ready to collect and ship.

- [ ] **Generate and connect GrokBot's GitHub read-only token** - the
  fine-grained token form is prepared in Louis's authenticated Chrome session:
  only `louis623/sparkle-suite`; no expiration at Louis's choice; read-only
  Actions, Contents, Issues, Metadata, and Pull requests. No token has been
  generated or exposed. Obtain Louis's explicit action-time confirmation before
  **Generate token**, then place the one-time-visible value directly in
  GrokBot's masked connector field and verify read-only repository access.

- [x] **Move Sparkle Finder into the Sparkle Suite repository without combining
  the applications** - completed through history-preserving import commit
  `8e12e6da`. Finder now lives at `apps\finder`; Suite remains at repo root, and
  package/auth/database/deployment boundaries are unchanged. The old Finder repo
  is retained as rollback, and production deployments were intentionally not
  moved.

- [x] **Update Finder's Vercel source/root bookkeeping** - completed August 25
  after Louis explicitly approved the release. The existing Finder project now
  uses GitHub repo `louis623/sparkle-suite`, root `apps/finder`, and production
  branch `codex/nic-nac-trade-hardening`. The prior deployment was preserved as
  rollback; Suite/Finder environments and databases remain separate.

- [x] **Separate managed-team and membership-team identity** - completed in `7b4bb363` through `36d1e8fd`. Team Management edits the rep's own managed team for Join Team/New Rep Onboarding; the Workspace header and customer footer use only the team the rep belongs to. Whatnot is supported on public team cards, and generic onboarding no longer carries Brittany-specific defaults.

- [x] **Repair customer profile visibility and signup confirmation** - completed in `36d1e8fd`. Customer List exposes and sorts birthday plus jewelry-preference fields, Joined appears once, and the public signup form gives accessible saving/success/error feedback.

- [x] **Harden Nic-Nac dancer variants, duplicate quantity, and full public inventory** - completed through `be67fc4e`, `720cdd74`, `bba85805`, `83ae90fe`, and final exact release `f81eed6`. Legacy `RBP` is accepted; same-item/different-stone designs remain separate; identical physical copies consolidate to quantity; public inventory is not server-capped; recovery, idempotency, and trade-swap resume are durable. Production deployment is `dpl_BUemZRh5njwHqj3XQQHyRfc2gMoV`, with all seven session migrations present remotely and synthetic cleanup verified.

- [x] **Design and release the Control Center admin account-assistance flow** -
  completed August 29 through transparent, password-free operator support with
  the normal rep Workspace, frozen actor/subject identity, conspicuous banner,
  notices, expiry, durable audit, and safe completion. Billing, payments,
  wallet funding, authentication, security, ownership, and Live Queue code
  creation/rotation remain blocked.

- [ ] **Have Heather confirm her repaired real Dance Floor inventory** - ask Heather to refresh customer view and confirm all expected necklaces are visible, the older `RBP` necklace appears, ER59000 Ruby and Rose Quartz display as separate variants with the correct photos/descriptions, and identical duplicates show one card with the right quantity. Also obtain the exact item number/details meant by **“You are a reflection of love”** before changing catalog data. Do not inspect or mutate Heather's authenticated account as a shortcut.

- [ ] **Run authenticated synthetic visual acceptance for Team Management and dancer variants after reviewer-browser repair** - verify managed/member team placement, New Rep Progress, Whatnot public cards, customer-profile sorts, signup feedback, exact variant photos/descriptions, quantity badges, and more than 12 public dancers on desktop/mobile. Use only the isolated reviewer session; the real model/API/DB production smoke already passed, but the established browser-runtime/reviewer isolation issue still blocks this visual pass.

- [ ] **Record and publish the phone-first “Add a dancer” tutorial** - use a safe demo item and prepared identification/customer-facing photos to show one complete mobile Sparkle Suite workflow from **Dance Floor > Add dancer** through the finished visible dancer. Keep it short, follow the exact Help & Resources sequence and vocabulary, avoid real customer information, publish it to the Sparkle Suite YouTube channel, and then replace/link the existing Help resource video placeholder. This is a training tutorial, not a YouTube LIVE selling or checkout workflow.

- [x] **Implement the receive-only Sparkle Suite Message Center and Resource Library plan** - released August 17 as deployment `dpl_29K7Gb6FbyQEnQtugA8FgG3T6bDP` from exact app tip `9497b117`. Header inbox, strict rep receive-only boundaries, Control Center publishing, signup notices, immutable monthly reports/birthdays, and versioned Blog/Video/FAQ/Help publication announcements are live. Delivery remains workspace-only with no email, SMS, external push, rep reply, or rep-to-rep messaging.

- [ ] **Complete authenticated synthetic Message Center browser acceptance after reviewer isolation is repaired** - database-backed reviewer smoke and local desktop/mobile rendered QA pass, but the live in-app browser retained a customer session instead of switching to `sparkle-reviewer+local`. Do not sign out or use Louis/customer accounts as a workaround. Repair the isolated reviewer-token/session path, then verify live unread/read/archive controls, report rendering, Resource filters/search, and reset.

- [ ] **Run authenticated synthetic visual acceptance for the combined Resources & Help hub** - after reviewer isolation is repaired, verify **Tools > Resources & Help**, Learn/Help tab switching, compact Blog/Video tiles on desktop and mobile/foldable widths, YouTube-derived thumbnails, absent optional resource sections, and the legacy `help-resources` Help deep link. Do not use Louis's or a customer account as a workaround.

  - **Browser-runtime blocker (updated August 21):** after the bundled Codex Browser plugin refresh, in-app/Chrome bootstrap still fails before preflight with a trusted-RPC dependency path error for `browser-service.mjs`; the current Chrome bundle is `26.818.21641`. This is distinct from reviewer-token/session isolation. Extension installation, direct registry key/manifest, and the `latest` junction were reconfirmed. Do not ask Louis to restart again by default, do not substitute an authenticated personal/customer session, and treat this as a Codex trusted-path lifecycle defect until the runtime is repaired.

- [ ] **Add designated-agent identity management before inviting internal agents to publish** - the sender/capability registry and application-owned publishing boundary are live, but the launch console is owner-authenticated and automations are the only non-owner active senders. Add per-agent Control Center identities, sender attribution, capability assignment/revocation, and audit UI before giving any designated agent access; never share the owner credential.

- [ ] **Obtain Bomb Party's written YouTube LIVE channel and checkout policy before enabling/supporting it** - ask current BP Support or consult the current rep back office: may an independent Party Rep sell/reveal BP inventory through YouTube Live; which checkout/order method is approved; and are YouTube Shopping, a personal/external store, or a Sparkle Suite Trade Board permitted? Do not describe a BP YouTube selling workflow as supported, build a public CTA, or route transactions there until the answer is in writing.

- [ ] **Define a compliant TikTok LIVE / Sparkle Suite Trade Board playbook** - preserve TikTok Shop's native product-link purchase flow during Shop-enabled lives. The playbook must explicitly prohibit Trade Board QR codes, background URLs, or spoken directions to scan/visit a website to buy or claim items during the LIVE; use Sparkle Suite for rep operations and lawful post-show customer follow-up. Include TikTok commercial-disclosure requirements and an eligibility check for any native profile/destination-link use.

- [ ] **Reconcile the recipe draft model-unavailable route assertion** - `tests/nic-nac-site-recipes-route.test.ts` still expects an earlier OpenAI-billing-specific message while the protected draft endpoint deliberately returns the current generic temporary-unavailability response. Update the intended contract and test together; do not weaken the safe 503 behavior or use a personal/customer account to exercise it.

- [ ] **Remove the temporary Heather recipe-audit checks after the current audit** - the browser-local **Audited** boxes in Current recipes are intentionally temporary. Remove them only after Heather confirms her current recipe pass is complete; they do not change recipe data or the public Pantry.

- [ ] **Run a synthetic reviewer customer-media acceptance pass after reviewer-token repair** - use a safe synthetic rep and disposable/test-owned public media to verify portrait upload and saved framing, each of the four allowed video providers, save validation, desktop/mobile Site Settings order, and public customer-site rendering. Confirm TikTok/YouTube follow the muted-loop/no-host-pause contract and Instagram/Facebook retain native controls. Do not use Louis's or a customer account.

- [ ] **Decide whether universal playback controls require a different product model** - public Instagram and Facebook embeds are provider-owned cross-origin players. If a future requirement demands guaranteed mute, looping, or no-pause behavior across every provider, assess uploaded/hosted video or an authorized provider integration; do not ship a CSS/JavaScript overlay that pretends to control native embeds.

- [ ] **Run Heather's full BlingKitchen beta acceptance pass** - `theblingkitchen.com` now points to her live customer-facing site and the recipe intake release is live. When the reviewer-token issue is repaired or an authorized safe path is available, verify her workspace recipe editor, direct image intake (outside/inside photos plus multiple private source photos), Pantry rendering, custom domain, favicon/social metadata, and customer-site navigation. Do not use Louis's personal account for state-changing testing.

- [ ] **Rotate Heather's temporary password after onboarding handoff or first use** - her welcome draft contains a deliberate temporary-password placeholder only. Keep any actual credential in private operational memory, never this Git-tracked vault, and rotate it through the normal account-security flow after handoff.

- [ ] **Run a synthetic reviewer destructive-action smoke when the reviewer token is repaired** - the Control Center Waitlist removal dialog requires a deliberate second `Delete [name]` click. With a safe synthetic waitlist row only, verify cancel, confirmation, Supabase removal, preserved linked historical launch record, and no impact to account or consent data. Do not use Louis's personal account or any real waitlist entry.

- [ ] **Add a synthetic reviewer import smoke when the reviewer token is repaired** - Customer List now accepts CSV/Excel imports without creating consent. Once the known too-short reviewer token configuration is corrected, run a synthetic rep import that verifies create, matched profile update, blank-cell preservation, conflict skip, and no-consent behavior. Do not use Louis's personal account or bypass the blocked reviewer-browser path.

- [ ] **Complete landing-page acceptance review** - after the latest Vercel deployment for 3881da55, review the exact live root on desktop and mobile. Confirm the customer-site screenshot deck shows readable hero content from all three cards and that Nic-Nac proof appears only in the Rep Workspace section, not over the Trade Board hero.

- [ ] **Run first Brittany Team Management invite acceptance smoke** - Team Management is live for entitled accounts and the public-but-unlisted Start Strong Site is deployed. Once the reviewer-token configuration is repaired or an explicitly authorized safe participant path is available, create one real test invite, verify personalized state, progress sync, participant question, Brittany reply, and invite archive. Do not create a fake Sparkle Suite rep account or use Louis's personal account for the state-changing path.

- [x] **Simplify the shared beta workspace and add Live Queue guidance** -
  Jewelry Library now lives in Tools; Nic-Nac quick actions and preview
  controls were simplified; Team Management and Bulk Collection Intake are
  preserved behind `Coming soon`; the shared explainer card is readable across
  skins; and Tools includes the workspace-specific Live Queue install,
  verification, troubleshooting, and explanation guide. Final application
  checkpoint `1ca7b48d` is live on both production domains.
- [ ] **Run the first real rep Live Queue onboarding acceptance smoke** - with
  the next operator-provisioned rep or an explicitly authorized synthetic
  reviewer, follow Tools > Live Queue from start to finish: install the official
  Web Store extension in the correct Chrome profile, enter that rep's exact
  assigned code, open Party Orders, select the correct Party Filter, verify a
  connected/green state, and confirm the customer-site queue or clear empty
  state. Do not use Louis's personal account, alter the extension package, or
  create live provider/order side effects for synthetic review.
- [x] **Implement operator-led five-day beta trials** - public entry is
  waitlist-first; Louis can create an approved rep account from a ready setup
  profile; the temporary password is entered twice and handed over manually;
  first sign-in starts an atomic fixed five-day trial; paid conversion preserves
  trial audit history; and centralized access closes workflow/customer-site
  access for past-due or expired accounts without deleting data. Migration
  `20260802160000` is applied and the production build passed.
- [ ] **Run the first operator-provisioned rep acceptance smoke** - use the next
  real approved beta rep or an explicitly authorized synthetic reviewer
  identity. Verify Control Center provisioning, manual credential handoff,
  first-sign-in trial activation, Account trial deadline, customer-site access,
  paid conversion, and expiry/past-due restricted mode. Do not use Louis's
  protected admin/demo account and do not submit a live charge during synthetic
  review.
- [ ] **Repair the protected reviewer-smoke token through coordinated secret
  handling** - the live signed-in reviewer path remains blocked by the known
  too-short production token. Fix it only with explicit coordinated secret
  handling, then use the synthetic reviewer path for authenticated live smoke.
- [x] **Restore bold Trade Board ticker typography** - both populated listings
  and the empty-state message now render at `700` weight across the shared
  React shell and static Home, Trade Board, and Join pages. Computed local
  verification confirmed announcements remain `500`, Trade Board is `700`,
  and motion remains 55.2 pixels per second. Six suites (107 tests) and the
  production build passed at application checkpoint `929638da`.
- [x] **Restore constant-speed empty Trade Board tickers** - the empty state
  now uses the shared duplicated, segment-measured loop on Homepage, Trade
  Board, and Join. Live customer-domain measurements hold the Trade Board row
  near 55.2 pixels per second regardless of listing count while announcements
  retain their established 46-pixels-per-second pace. Six suites (107 tests),
  the production build, both live domains, and production logs passed at
  application checkpoint `8f6f5b6`.
- [ ] **Complete homepage-media authenticated reviewer smoke** - the current
  contract is one Smart Frame 4:5 About portrait plus three 9:16 TikTok/YouTube
  short-video cards, with the Showcase video separate. Public production visual
  inspection passed on commit `4237eb97`; the remaining authenticated synthetic
  click-through, including face-detected photo upload/framing save and a short-video save, is blocked
  because production's configured reviewer token is shorter than the enforced
  12-character minimum. Repair that environment secret with explicit release
  coordination, redeploy, then repeat the safe reviewer flow. Do not use
  Louis's personal account.
- [ ] **Set the protected admin/demo account's live-show name** - a read-only
  August 1 lookup confirmed `louis@neonrabbit.net` has `Louis Chapman` in both
  rep-name and business-name fields and no separate setup live-show name. The
  header now safely says `Live show name not set`; save the intended show name
  through the normal Site Settings/profile flow once Louis supplies it. Do not
  invent or production-patch a name.
- [x] **Close the immediate Bulk Collection Intake/back-navigation beta
  follow-up** - superseded August 2 when Bulk Collection Intake was deliberately
  preserved behind a disabled `Coming soon` entry for first beta testers.
  Existing implementation remains available for later reactivation; perform a
  fresh reviewer smoke before access is restored.
- [ ] **Complete GitHub quarantine ruleset identity verification** - the active
  ruleset is configured to match all branches except
  `codex/nic-nac-trade-hardening` and restrict creation, updates, deletion, and
  force pushes. GitHub requires an identity-verification email before it can be
  saved; trigger/complete that verification only with Louis's action-time
  approval.
- [ ] **Audit quarantined branch-only work before any cleanup** - review the 20
  legacy-main-only team-onboarding commits, the two
  `incident-approved-line` commits (`621708b1`, `0fda2b47`), the local
  Collection Intake commit `90dda81f`, and the backed-up detached `c385`
  `app/demos/` plus `tests/collection-intake-demo.test.ts`. Merge only validated
  work into the active line. Do not delete or rename any ref/worktree as part
  of this review. The Collection Intake slice was audited on July 31:
  `90dda81f` and `0fda2b47` contain the same Tools placeholder patch, and the
  exact `c385` archive supplied the preserved intake workflow that was adapted
  onto the active branch. The other quarantined branch-only work still needs
  separate review.
- [ ] **Automate the Sparkle Suite production provenance gate** - add a safe
  script or CI check that reports/validates the active repo, GitHub remote,
  branch, HEAD, Vercel project, deployment, and both live domains before
  production promotion. It should fail closed on mismatches and emit the
  currently served deployment URLs for incident preservation.
- [ ] **Automate post-auth production smoke for protected account classes** - extend the safe smoke harness so production restores verify landing-page stability plus the expected post-login destination without live charges or personal credentials. Include an explicit invariant check that the protected Louis admin/demo account cannot be classified as `checkout_required`.
- [ ] **Complete Brianna Williams / Bri's Glowtique acceptance smoke** - before
  beta handoff is treated as accepted, use the protected reviewer-smoke path at
  `https://www.yoursparklesuite.com/login` and inspect the standard workspace
  plus `/brisglowtique`, `/brisglowtique/trade`, and `/brisglowtique/join`.
  Check desktop/mobile presentation, Emerald Garden styling, navigation and
  external links, empty Trade Board behavior, Join copy, custom-domain tenant
  routing, and the absence of unrelated rep data. `brisglowtique.com` is
  already attached and must show Bri's Glowtique (not Sasha/demo content); do
  not start billing during this smoke.
- [ ] **Rotate Brianna's temporary password after handoff or first use** - the temporary login is saved in Louis's private Open Brain recall entry as requested and intentionally omitted from Git-tracked vault files. Once Brianna receives or uses it, replace it with a durable password through the normal account-security flow.

Everything deferred, undecided, or waiting — tasks, planning sessions, and open questions.

---

## Immediate Sparkle Suite Follow-Up

- [x] **Make customer-site card readability adapt across skins** - completed
  August 1 in `44c5a79 fix: make skin card text surface-aware`. Every
  registered card surface now defines semantic primary, muted, and accent text
  tokens, and the signup component consumes those tokens. Exact live-domain
  smoke confirmed the Emerald Garden signup heading and supporting copy are
  readable on the ivory card. Production deployment
  `dpl_ET3A3q8orA3uya6oE6b1myQZJjEr` is Ready on both live domains.
- [x] **Repair Emerald Garden customer-site parity** - completed August 1 in
  `4a2917c fix: align emerald public site skin`. Homepage, Trade Board, and Join
  retain the shared content/ticker contract; announcements are readable white;
  the 46/55.2 pixels-per-second ticker standards remain intact; and the
  Emerald hero now follows the shared full-bleed composition. Exact production
  deployment `dpl_F7FSNS9fGZiKQ1nRQxAXzGUdEUka` is Ready on both live domains.
- [x] **Audit and repair customer-site customization wiring** - completed
  August 1 in `86feb94 fix: wire public site settings and access`. The exact
  Louis admin/demo audit proved the uploaded photo and captions were persisted
  and rendered, identified silent TikTok embed-code loss and the slug-only
  readiness gate, and shipped visible media-validation errors, embed parsing,
  rep-targeted live-site readiness, and direct Live Site Preview access from
  the header and Public Site card. Exact production deployment
  `dpl_3ZeRTLEqwSyE2neQvvekoHcxKNmy` is READY on both live domains. The two
  TikTok values lost by the former normalizer must be pasted once more because
  they were never stored.
- [ ] **Repair the production synthetic-reviewer launcher token** - the current
  configured token is shorter than the production route's 12-character
  minimum. Choose and set a compliant token through the approved production
  secret workflow, then rerun the token-gated `/start` reviewer path. Do not
  alter this secret silently during unrelated feature releases.
- [x] **Restore Nic-Nac inside Live Site Preview** - completed July 10 through `b96b7e84` and `50051b8c`. The centered 2x2 preview toolbar preserves Back to workspace, Refresh preview, and Open full site, adds Open/Close Nic-Nac, keeps Nic-Nac closed by default, and opens the chat beside the desktop preview when requested. The behavior is shared across current/future accounts and demos.
- [x] **Show real next-show details in the workspace Upcoming Show card** - completed July 25 in `5ad2b43 feat: show next event in workspace card`. The right-hand card now shows the next real upcoming show's weekday, date, time, time zone, and name when data exists, links that summary into Calendar, and falls back to `No upcoming shows` plus `Add a show` when the calendar is empty.
- [x] **Shorten the Trade Board customer-site action label** - completed July 25. The Trade Board top-right button now reads `Customer view` instead of `View customer board`.
- [ ] **Louis final acceptance smoke for current workspace UI polish** - review
  `https://www.yoursparklesuite.com` after confirming it serves the exact
  intended production deployment. Confirm desktop/mobile Live Site Preview
  toggle behavior, compact header without the redundant top search, internal
  Nic-Nac chat scrolling, fully visible bottom navigation, the dynamic Upcoming
  Show card behavior, and the Trade Board `Customer view` button label.
- [ ] **Expand Business Tools beyond the Wispr Flow MVP** - June 23 now has the unlocked Business Tools workspace section with a usable Wispr Flow section and Louis's invite link. Business Calculator and Business Cards intentionally render only `Coming Soon` for now. Next work: make the calculator more robust for show/month planning when Louis is ready, decide whether any Bomb Party business-number import can be safely researched without touching protected Live Queue extension behavior, and design the paid business-card proof/order/contractor workflow before taking orders.
- [ ] **Finish live calendar reminder launch readiness** - June 23 hardening
  added durable reminder preferences/overrides, SMS+email pre-show planning,
  run observability, reviewer-smoke seed data, and a deployed smoke harness.
  Before enabling customer-facing sends, finish provider/compliance review,
  audience consent/unsubscribe rules, copy/templates, deliverability/error
  handling, production channel flags, operator monitoring, and a
  no-live-side-effects reviewer path on the live site for repeated tests.
- [ ] **Design rep business reminders and reminder UI controls** - Louis wants Nic-Nac to support optional rep reminders outside show notifications, such as in-show or business-task nudges. This still needs product design: reminder types, due times/time zones, recurrence, snooze/dismiss behavior, where reminders appear, whether any can send SMS/email to the rep, and how Nic-Nac lists/edits/cancels them.
- [ ] **Execute Nic-Nac stable baseline closure matrix** - created June 22 in `docs/superpowers/plans/2026-06-22-nic-nac-stable-baseline-closure.md` and HQ task `task_11_10_nic_nac_stable_baseline`. This is the current definition of "stable baseline Nic-Nac": Suite local/deployed gates, Finder local/deployed gates, linked-rep memory gate, Lab guardrail gate, model policy/cost telemetry gate, browser smoke, and release/vault closeout all pass. Fix baseline blockers; move enhancements to backlog.
- [x] **Build durable Nic-Nac Trade Board and jewelry database tool knowledge** - completed July 4 for the current Suite Trade Board tool family. Durable workflow/controller coverage now spans item-number add listing, label/details and customer-facing jewelry photo handling, non-item-number listings, duplicate physical piece add guidance, listing removals, request inbox decisions, live swaps, after-show cleanup, fulfillment updates, and shared catalog corrections. Catalog identity supports item number plus plating/material variants. The deployed pressure bank now exercises these paths with real `/api/nic-nac` model/tool replay, DB assertions, public-site assertions, approvals, and cleanup.
- [x] **Apply the Calendar tool-contract pattern to Trade Board and Trade tools** - completed July 4 for current Sparkle Suite Trade Board workflows. Added issue-type-aware catalog correction sanitization, a real catalog correction approval smoke, and the combined `smoke:nic-nac:trade-board-pressure` gate. Final stable-demo pressure sweep passed 8/8 workflows against `https://sparkle-suite-demo.vercel.app` after alias promotion. Future Trade Board edits should rerun the combined pressure gate before closeout.
- [x] **Implement Secret Rep ID Number identity linking plan** - locked June 21. Rename/label the private rep code as Secret Rep ID Number / do not share publicly, preserve its Live Queue sync use, and use it as the Sparkle Finder rep-claim code that links a Finder user to the durable Sparkle Suite `rep_id`.
  - Completed June 22: Suite has server-only `/api/internal/finder/rep-claim` and `lib/sparkle-finder/rep-claim.ts` to validate a Secret Rep ID Number through `live_queue.sync_code` and return safe `suiteRepId` / Silver badge entitlement data. The validator requires an active rep that is public-Finder eligible through a paid workspace or ready launch-build path. Suite rep-facing copy labels the private number as `Secret Rep ID Number`, Finder has claim UI/storage/mapping, the Finder migration is applied, deploy tokens are configured, and the deployed browser claim smoke passed with temporary user cleanup.
- [ ] **Build shared Nic-Nac memory and surface-gated action architecture** - locked June 21. Linked reps should experience one Nic-Nac across Sparkle Suite and Sparkle Finder with shared memory, while tool execution is gated by the current authenticated product surface. Sparkle Suite mutations must happen from Sparkle Suite; Finder work can happen from Finder with Finder permissions.
  - Progress: Suite now has `lib/nic-nac/core/product-context.ts`, `lib/nic-nac/core/tool-policy.ts`, explicit tool-intent capability requirements, shared core prompt/surface rules, bounded context assembly, automatic safe `rep_notes` memory cards, Suite route filtering through the product context, an OpenAI-only Nic-Nac model provider, deterministic duplicate physical Trade Board listing confirmation in `add_listing`, ER13229 boxed-photo workflow-state hardening, and a conservative mission guard that redirects clear off-mission requests before memory/tool/model setup. Suite also has route-order and route-runtime regression proof that the mission redirect persists/logs a zero-cost static response before memory, workflow, tool, or model setup. Linked Finder contexts can keep the `memory` intent available at the core-policy level while Suite workspace mutation intents remain blocked. Telemetry records product/surface/actor/linked human and memory-context counts/scopes. Finder route code now has an OpenAI-only model policy adapter and no hardcoded Anthropic Haiku, Finder prompts receive linked-rep surface context that directs Suite mutations back to Sparkle Suite, Finder preloads safe customer memory into the model prompt, and Finder applies the same mission guard before model/tool/memory setup. Suite now exposes token-protected internal `/api/internal/finder/rep-claim` and `/api/internal/finder/rep-memory` bridges. Finder now stores live Secret Rep ID claims, merges safe Suite memory summaries for linked reps only, filters requested Nic-Nac intents through a product-context tool policy before building active tools, includes `read_my_studio_intake_status` for app-owned Showcase Studio state, passed a deployed linked-rep Nic-Nac stream smoke with OpenAI, has an applied/verified remote telemetry schema, passed a secured deployed telemetry runtime smoke with cleanup residuals at zero, and now has a token-gated deployed reviewer-smoke session path for non-personal Finder Nic-Nac smoke while production preview auth remains disabled. Baseline legal/privacy/onboarding disclosure is implemented. Remaining: deeper Finder tool parity and broader shared-core consolidation.
- [ ] **Create Sparkle Lab in Control Center** - locked June 21. Add a dedicated Sparkle Lab page/section inside Control Center, linked from the main page, with Nic-Nac Lab, Sparkle Suite Lab, Sparkle Finder Lab, Ops Lab, and Research Desk sections. Lab artifacts can include findings, replay/eval cases, trouble-ticket analyses, reports, research briefs, and recommendations, but cannot mutate production.
  - Progress: read-only internal `/control-center/lab` page exists and is linked from `/control-center`; Sparkle Lab run/finding/artifact tables exist and are service-role-only. The page now shows scheduled/monthly caps, usage/limits summaries, model-synthesis status, artifact counts, and the no-production-self-mutation boundary. The page is display-first; richer artifacts and deployed operator smoke remain.
- [ ] **Add Sparkle Lab schedule and usage guardrails** - locked June 21. Sparkle Lab should run weekly by default, initially Sunday at 2:00 AM America/New_York for Monday morning results, and should not run continuously. Initial hard caps: $5 weekly scheduled run, $20 monthly scheduled cap, $2 manual/on-demand run, $3 urgent issue run unless raised, 20 weekly model calls with max 4 premium/deep calls, 20 minutes weekly runtime, 250 candidate records, 25 deep-analyzed items, 3 headline findings, and 2 active work priorities. Every run needs graceful stop behavior and a usage/limits-hit report.
  - Progress: internal cap evaluator exists at `lib/nic-nac/core/lab/budget.ts`; Sparkle Lab schema migration exists at `supabase/migrations/20260621193000_sparkle_lab.sql` and has been applied/verified remotely; deterministic manual runner endpoint exists at `/api/control-center/sparkle-lab/run`; authenticated weekly route exists at `/api/internal/sparkle-lab/weekly` and is wired in `vercel.json` for Sunday overnight. Manual and weekly runners are feature-flagged off by default. Lab runner responses include mutation mode, model-synthesis status, artifact counts/summaries, and deterministic recommendations. A model synthesis harness exists and can create report artifacts only when `SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED=true`; that flag is not enabled in Vercel. Lab synthesis now refuses to make paid model calls when the configured `lab_synthesis` model has no approved pricing entry, preventing pro/nano env overrides from being treated as free or base-priced. Stable deployed route protection smoke passed. Enabling env flags and live model-synthesis smoke remain.
- [ ] **Design Nic-Nac memory/legal disclosure path** - locked June 21. Nic-Nac memory is a product feature and marketing point, not a beta tuning panel. Update privacy policy, terms, onboarding, and marketing copy before broad rollout; keep internal/operator correction/deletion paths for legal, privacy, abuse, data-quality, or operational needs.
  - Baseline implemented June 22: Suite and Finder privacy policies, terms, and signup/account acknowledgment copy now disclose Nic-Nac AI assistance, memory, telemetry/tool context, bounded linked-rep memory between Suite/Finder, surface-gated actions, review responsibility, off-mission/excessive-use limits, and sensitive-info caution. Still open before broad rollout: attorney review, final privacy/terms approval, and marketing/onboarding positioning copy.
- [ ] **Control Center customer/demo database polish** - durable customer/demo
  classification was completed August 29 in `299e9bcd`; Kim is customer #4 and
  future real onboarding defaults to Customer Database. Remaining polish is
  search/filtering, inline internal notes/status editing, and richer billing
  history/detail actions.
- [x] **Close out BlingKitchen migration** - completed June 19 in `ccd4456 feat: migrate BlingKitchen public site`. Recipes were seeded, Supabase reported remote DB up to date, focused BlingKitchen/Nic-Nac recipe tests passed, `qa:amethyst` passed, build passed locally and on Vercel, branch was pushed, and stable demo now points to `https://sparkle-suite-5w9d59ald-louis-2849s-projects.vercel.app`.
- [x] **Smoke Heather's account after BlingKitchen deploy** - account provisioning/login verified for `blingkitchen19@gmail.com`, rep id `9a971c05-3631-443e-bcb8-4e9a26e15885`, live queue sync code `BLI-3767`, and `readyForDomainCutover: true`. Do not store the temporary password in long-term docs; rotate it after handoff if needed.
- [ ] **Finish Britt With Bling acceptance pass** - pushed checkpoint `2617b8c feat: migrate Britt With Bling public site` carries the custom public site. July 2 Team Management work added a dashboard Public Team Cards manager for Brittany's Join Team cards, with preservation for imported photos/names/links/copy/order and unsafe-link validation. Stable-demo synthetic reviewer-smoke now verifies the unlocked Team Management Public Team Cards UI. Still confirm Louis/Brittany acceptance. Diamonds/unicorns/FAQ pages were intentionally dropped per Louis.
- [ ] **Finish BlingKitchen acceptance pass after Moonstone/Pantry hardening** -
  verify the current exact production deployment at
  `https://www.yoursparklesuite.com/blingkitchen`. Louis still needs to approve
  the final BlingKitchen public-site experience before any custom-domain
  cutover. Pay special attention to the standard Sparkle Suite header, Trade
  Board/Live Queue placement, ticker pacing, Live event calendar, Moonstone
  readability, Pantry route, and DB-backed recipe editing.
- [x] **Heather exact-account public Pantry recipe smoke** - completed July 1. OpenAI-backed reviewer-smoke proof passed after Louis added API credits, then the exact Heather BlingKitchen account smoke passed against stable demo with the temporary password supplied at runtime. Nic-Nac used `build_site_recipe_draft`, saved with `manage_site_recipes`, verified the DB row and public Pantry template data, and cleaned up the smoke recipe. Dashboard / Nic-Nac now has passing launch-readiness proof from `.local/launch-readiness-results/bling-kitchen-recipe-chat.json`.
- [ ] **Make migrated editable content durable** - Britt With Bling team cards now have a deployed, reviewer-smoked dashboard Public Team Cards manager backed by the existing Join Team roster API. Continue hardening other migrated content such as BlingKitchen recipes through Nic-Nac/dashboard data paths. Do not leave rep-maintained migrated content as source-only static markup after the first import.
- [x] **Fold Sparkle Suite binder back into repo** - completed June 19. The active repo now contains the former binder vault, docs, plans, lessons, and project skills. Future Sparkle Suite sessions should open `C:\Users\louis\sparkle-suite-repo` directly with workspace-write access. The old `C:\Users\louis\sparkle-suite` folder is now a redirect/archive.
- [ ] **Apply the same workspace simplification to Sparkle Finder** - future Sparkle Finder cleanup should fold its binder memory into the Finder repo or otherwise make the Finder repo the single writable workspace. This prevents binder-only write roots from causing repeated permission prompts while preserving the established instruction flow.
- [x] **Fix public customer-site Trade Board context mismatch** - completed June 16 in `68fc332 fix: harden public site context routing`. The stable demo alias `https://sparkle-suite-demo.vercel.app` now points to `https://sparkle-suite-1k5a4e5xv-louis-2849s-projects.vercel.app` / deployment `dpl_EopEe8p6QKN6ZTqGdUoFnFH3DaWM`. The fix makes public customer-site rep/slug context a shared contract across templates, browser API refreshes, loaders, and public mutations. Focused public-site/trade-request tests passed, build passed, Vercel build passed, and Louis reported a light manual smoke looked good.
- [ ] **Keep Nic-Nac as one shared Sparkle ecosystem agent** - forefront architecture priority noted June 16. Sparkle Suite is still the launch priority, but Nic-Nac must not become separate Suite/Finder copies. The desired end state is one shared Nic-Nac core with shared model adapter, workflow engine, jewelry intake logic, photo-role rules, catalog truth, tool registry, evals, and smoke harness. Sparkle Suite and Sparkle Finder should pass product context, account tier, permissions, and final mutation destination into the same core.
- [x] **Push, deploy, and stable-demo smoke the current Nic-Nac Trade Board workflow-truth fix** - completed June 16. Active repo `C:\Users\louis\sparkle-suite-repo` is clean and synced on `codex/sparkle-cross-phase-hardening` through `bbb66a4 fix: promote boxed photo after collection confirmation`. Stable demo alias `https://sparkle-suite-demo.vercel.app` points to the verified deployment `https://sparkle-suite-6c0807k4k-louis-2849s-projects.vercel.app`. Local focused tests, full Nic-Nac suite, local build, Vercel build, and three consecutive stable-demo ER13229 replay smokes passed.
- [x] **Build repeatable Nic-Nac add-listing smoke harness** - completed in `057bc64`. `scripts/smoke-nic-nac-trade-board-intake.ts` now signs in the demo rep, posts real `/api/nic-nac` turns with image data parts, asserts hard-fail phrases/tool observations/workflow completion/listing DB state, and soft-removes smoke listings by default.
- [x] **Create Sparkle Suite smoke asset fixture folder** - completed June 16. `C:\Users\louis\sparkle-suite-smoke-assets` contains `ER13229-label.jpg`, `ER13229-jewelry-boxed-front.jpg`, and `cases.txt`.
- [x] **Run the ER13229 Nic-Nac replay smoke after fixtures exist** - completed June 16. `npm run smoke:nic-nac:trade-board-intake` passed three consecutive stable-demo reviewer-smoke API replays, then passed once more after the final HEAD alias update and once more after clean-state harness hardening. Each pass used the real `/api/nic-nac`, real image data parts, reviewer-smoke workspace, tool output checks, workflow/listing DB verification, hard-fail phrase gates, and listing cleanup.
- [ ] **Polish Nic-Nac boxed-photo confirmation wording** - noted June 16 after the `bbb66a4` stable-demo smoke. The backend/tool path now completes, but one smoke pass still used an awkward confirmation branch with internal-sounding wording like photo indexes/workflow state. Next Nic-Nac wording pass should keep the same workflow truth but say this naturally to a rep, e.g. confirm the boxed display shot without exposing internals.
- [ ] **Align Sparkle Finder Silver jewelry-library intake with Nic-Nac Trade Board intake architecture** - noted June 16. Sparkle Finder Silver should plug into the same shared Nic-Nac core rather than getting copied code. It should reuse the same jewelry intake pattern: label/details photo for facts, customer-facing jewelry photo for display, typed collection accepted, boxed display photos allowed, hard-fail phrase gates, and real uploaded-image smoke. Difference: the final mutation should add/update the jewelry library/catalog for Sparkle Finder rather than adding a Trade Board listing.
- [ ] **Run broader public-site plumbing smoke before launch-hard** - the June 16 context-routing fix covered the reported Trade Board mismatch and public mutation guards, but before heavier beta usage, run a broader synthetic sweep across customer-site slug pages, live-preview pages, Trade Board refresh, trade request submit, join/signup, unsubscribe, and custom-domain/canonical-domain routing. Goal: prove workspace-to-public data stays rep-scoped after hydration and repeated API refreshes.
- [ ] **Plan scale hardening for public/workspace data paths** - Louis raised the 100-rep/10-live-show scenario. Future hardening should audit indexes, RLS/service-role query shapes, polling frequency, caching, realtime/live-queue interactions, storage growth, and observability so Sparkle Suite is ready for active shows rather than just demo trickle traffic.
- [x] **Create reusable existing-site migration skill** - completed June 18. New skill: `C:\Users\louis\sparkle-suite\.agents\skills\sparkle-suite-existing-site-migration\SKILL.md`. It captures the Mile High Fizz lesson that exact migrations require source code/project exports, asks Louis one question at a time, and preserves Sparkle Suite automation behavior while migrating a rep's original public-site brand.
- [x] **Fix customer Trade Board request confirmation after screenshot submit** - completed June 18 in `1635ce1 fix: keep trade request confirmation visible`. Root cause was a customer UI effect clearing request success/error state after the post-submit board refresh changed available listings. Verification passed focused tests, `qa:amethyst`, local build, local screenshot multipart smoke, 6-request pressure smoke, Vercel build, stable alias check, deployed screenshot API smoke, and deployed rendered customer confirmation smoke. Stable demo now points to `https://sparkle-suite-pyfv4xpp7-louis-2849s-projects.vercel.app`.
- [ ] **Use existing-site migration skill for the next two rep websites** - Louis said two more websites need the same treatment as Lindsey/Mile High Fizz. For each one, start with `sparkle-suite-existing-site-migration`, ask for the source code/project export first, then build a migration brief before implementation.
- [ ] **Mile High Fizz final acceptance and registrar/DNS documentation** -
  CheapNames reported the registrar transfer complete on September 4. Read-only
  closeout inspection confirms `milehighfizz.com` and `www.milehighfizz.com`
  resolve through Vercel to Ready Sparkle Suite deployment
  `dpl_GVnxy1rm8MXCBKaaEwBL3mdeLkSB`; the apex returns HTTP 200. No routing
  change is needed merely to reflect the registrar transfer. Preserve Readdy's
  authoritative DNS/service inventory, especially mail-related records, for
  future registrar or DNS work. Complete the visual acceptance of Homepage,
  Trade Board, and Join on the canonical Suite path at
  `https://www.yoursparklesuite.com/milehighfizz`. The earlier bespoke-hybrid
  framing is superseded: Mile High Fizz uses the standard switchable Amethyst
  public-site model with Alpine Opal (`alpine_opal`, `AO-01`) selected by
  default/persisted Site Settings. The Trade Board should be empty until Lindsey
  adds real pieces. Do not change Mile High Fizz DNS, nameservers, aliases, or
  mail records without a new exact, evidence-backed instruction.
- [ ] **Fill verified phone numbers for active customer records** - Control Center now has phone fields, but repo-local Open Brain/HQ search did not find reliable paying-client phone numbers. Add them only from an authorized source or direct Louis input.

---

## High Priority

- [x] **Enable production self-serve signup and live checkout open-only smoke** - completed June 11. Vercel Production has `SPARKLE_SELF_SERVE_ENABLED=true`, live Stripe prices/webhook are configured, required Supabase pricing/event RPC migrations were manually applied and verified, production `/start` created a synthetic rep and opened live Stripe Checkout with expected founder pricing, and the unpaid session was expired and verified released through the live webhook.
  - Current code checkpoint: `a60ceff fix: preserve Supabase RPC binding in checkout` on `codex/sparkle-cross-phase-hardening`.
  - Production deployment: `dpl_58RLxmtyi14FzMx7CM29g3fvn53X` / `https://sparkle-suite-jib4a2a9h-louis-2849s-projects.vercel.app`.
  - Production public app: `https://www.yoursparklesuite.com`.
  - Live prices: build fee `price_1ThAmIQYwdFOcEdvyAlTox0V`, founder monthly `price_1ThAmIQYwdFOcEdvWmNm96yG`, standard monthly `price_1ThAmJQYwdFOcEdv3HQwDV0V`.
  - Live open-only smoke used synthetic rep `louis+sparkle-live-smoke-1781197885226@neonrabbit.net`; no payment was submitted.
  - Expired checkout event `evt_1ThC9eQYwdFOcEdvGyukOOiK` is processed, and the smoke rep's founder reservation is released.
- [x] **Implement and pressure-test live Trade Board swap workflow** - completed June 12. The workflow now captures `Which item number was just revealed for the customer?`, approves the outgoing board piece, auto-adds the just-revealed replacement when catalog details are sufficient, and sends unknown or missing-ring-size replacements to after-show cleanup.
  - Current code checkpoint: `f0e573a chore: add trade swap smoke script` on `codex/sparkle-cross-phase-hardening`.
  - Related commits: `8cc4916 docs: plan live trade swap workflow`, `a7e283a feat: capture live trade swap replacements`, `f0e573a chore: add trade swap smoke script`.
  - Production deployment: `dpl_6W9CwLuwJEsJcytPV2eWnuJrfEXE` / `https://sparkle-suite-auzh791m0-louis-2849s-projects.vercel.app`.
  - Production public app: `https://www.yoursparklesuite.com`.
  - Supabase migration `20260611190000_trade_swap_revealed_item_capture.sql` was manually applied and verified in project `bqhzfkgkjyuhlsozpylf`.
  - Verification passed: focused tests, Nic-Nac tests, customer/public language tests, smoke tests, local build, Vercel production build, DB-backed smoke, production UI smoke, and backend/UI pressure tests.
  - Stable demo alias was not changed this session; production was updated.
- [x] **Complete support report intake live setup and smoke** - completed June 12. Help & Resources support form, Nic-Nac `submit_support_report`, dashboard-ready `public.support_reports`, and Google Chat delivery are implemented, pushed, deployed, and smoke tested. Checkpoints: `69d04af feat: add support report intake` and `502a0c0 chore: add support report smoke script` on `codex/sparkle-cross-phase-hardening`. Supabase migration `20260612100000_support_reports.sql` was manually applied and verified in project `bqhzfkgkjyuhlsozpylf`. Vercel has encrypted `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL` for Production and Preview branch `codex/sparkle-cross-phase-hardening`. Production deployment: `dpl_Gj9u8FvFs83j4tBDww4qCmKsSnHm` / `https://sparkle-suite-6es8y9mh5-louis-2849s-projects.vercel.app`; public app: `https://www.yoursparklesuite.com`. Smoke passed with `notification=delivered`, `cleanup=true`, and `support_smoke_residual_count=0`.
- [x] **Polish Nic-Nac live stream completion after tool reports** - completed June 12 in checkpoint `4ef57bb fix: recover completed Nic-Nac streams`. Nic-Nac now polls persisted conversation state after a stuck `submitted`/`streaming` tool run, merges the completed assistant reply, stops the stale stream, hides the thinking indicator, and refocuses the input. Verification passed focused tests, build, production/preview deploys, stable demo alias update, and live stable-demo DB/tool smoke with Google Chat delivery and cleanup. Caveat: Chrome automation could claim the active smoke tab and confirm URL, but DOM/screenshot capture timed out after the smoke; reload remains the visual fallback if Chrome capture stalls.
- [x] **Build Support Command Center and Support Auditor** - completed June 12 in checkpoint `597e5c4 fix: align support smoke with production env`. `/control-center` now opens the v1 support command center, support reports snapshot canonical client profiles, Support Auditor stores audit rows and sends enriched Google Chat alerts, reusable support lessons are available on resolution closeout, and the stable demo alias points to the deployed support-system build. Verification passed focused support suite, local build, Vercel production build, remote Supabase schema verification, DB-backed smoke with Google Chat delivery/audit/lesson/cleanup, and stable-demo Help & Resources UI submission with cleanup.
- [x] **Create permanent Sparkle Suite dashboard link and fix auth routing** - completed June 12. Permanent Louis-facing link is `https://www.yoursparklesuite.com/dashboard`. `/dashboard` redirects to `/control-center`, unauthenticated access preserves `/login?redirect=%2Fcontrol-center`, and Supabase Auth `SITE_URL` was corrected from `https://neon-rabbit-hq.vercel.app` to `https://www.yoursparklesuite.com`. Sparkle Suite redirect wildcards were added for public, apex, stable Vercel, and stable demo domains. Latest checkpoint: `acb2866 fix: preserve control center login redirect`; latest production deployment: `dpl_1263MMazGNtj5asngnGfazcVnXGi`.
- [x] **Fix Nic-Nac general persistent preference memory** - completed June 12. Explicit future-memory requests now route to durable rep notes even when they mention live shows, safe operational preferences are saved as `memoryType:'preference'` / `memorySource:'explicit'`, current-show-only memory remains show-scoped, and `write_rep_note` now server-timestamps notes. Checkpoints: `1d18458 fix: route explicit Nic-Nac memory preferences` and `ce70136 fix: timestamp Nic-Nac memory writes server-side`. Production deployment: `dpl_3vFJ3ZTYmb6soijYM8ByEEzBZTLr` / `https://sparkle-suite-4t8jjh33k-louis-2849s-projects.vercel.app`; stable demo alias updated and Chrome/Supabase smoke passed with synthetic row cleanup.
- [ ] **Watch first real paid Sparkle Suite signup** - when the first real beta rep pays, verify `checkout.session.completed`, `invoice.payment_succeeded`, subscription row creation, required setup/Nic-Nac onboarding state, and referral reward tracking. This remains the only live billing caveat because no real live card/payment was submitted during the smoke.
- [x] **Deploy Mile High Fizz public site work to stable demo** - June 18 hybrid deployment through `899db82` was superseded July 2 by `c8f8d92 fix: apply Alpine Opal demo migration`. At Alpine Opal closeout, stable demo pointed to `https://sparkle-suite-i8vavj4do-louis-2849s-projects.vercel.app` / deployment `dpl_EJYJE6nHpMLgtrXWcgPbNVGRegSh`. Homepage, Trade Board, and Join were pushed, deployed, stable-route checked, and visually checked with Alpine Opal as the default reusable skin.
- [ ] **Legacy Sparkle Suite customer Stripe side deals** - after the normal Sparkle Suite billing path is live-ready, create a separate plan for the three grandfathered legacy reps/sites that may need custom Stripe pricing or side-deal billing while still attaching them to Sparkle Suite accounts.
- [x] **Apply/deploy Trade Board ring-size migration** - completed June 10 via signed-in Supabase Dashboard SQL editor after CLI auth/linking stayed blocked. Remote verification returned `ring_size_column_present = true` and `ring_size_constraint_present = true`; stable demo now points to the verified deployment `https://sparkle-suite-kkz9729yp-louis-2849s-projects.vercel.app`.
- [x] **Restore Supabase CLI auth/linking for Sparkle Suite** - completed June 29. `supabase migration list`, `supabase db push --dry-run`, and `supabase db push --yes` worked from `C:\Users\louis\sparkle-suite-repo`, and migrations `20260629150000` / `20260629151000` were applied through the CLI.
- [ ] **Review legacy HQ Supabase Auth redirect wildcard later** - Sparkle Suite Auth `SITE_URL` now points to `https://www.yoursparklesuite.com`, but the old `https://neon-rabbit-hq.vercel.app/**` redirect wildcard was intentionally left in the allowlist for legacy safety. Remove it only after confirming no shared-project legacy flow depends on it.
- [x] **Push latest Sparkle Suite local checkpoints** - previous local checkpoints plus ring-size commit `6d48151 feat: capture ring size on trade listings` are pushed to `origin/codex/sparkle-cross-phase-hardening`.
- [x] **Add seeded fulfillment reviewer smoke data** - implemented in commit `8988e7c`; `/start` now has `Open workspace preview`, and dashboard reviewer reset seeds `Jamie Smoke` / `RG-SMOKE-001` as an active fulfillment item.
- [x] **Review same-status fulfillment update behavior** - implemented in commit `8988e7c`; same-status fulfillment updates now no-op without resetting `status_updated_at`.
- [ ] **Close fulfillment received-piece link-back** - dashboard completion now prompts the rep to add the received piece, but `trade_fulfillment.received_listing_id` is still not automatically populated after `add_listing`. Decide whether to link the newly added received piece back to the fulfillment row.
- [ ] **Table Trade Board rep alert escalation until Louis finishes timing research** - keep the idea of stronger rep alert status/urgency for new trade requests, but do not build additional notifications yet. June 12 smoke and pressure tests covered the implemented trade-swap flow, but Louis still wants to research real live-show timing before deciding whether alerts need escalation.
- [ ] **Run a real live-show/multi-device trade timing test** - backend race handling and production UI pressure passed, but the exact live-show human timing with extension context and multiple devices has not been tested directly.
- [ ] **Review stale broad Nic-Nac/support regression expectations** - the durable memory work passed its focused tests/build/smoke, but a broad test sweep still showed unrelated stale failures in branding CSS expectations and old TradeBoard shared-knowledge wording. Triage before using that broad suite as a final green gate.
- [ ] **Triage current full Suite Vitest sweep failures** - June 22 full `npx vitest run --passWithNoTests` still fails unrelated start/prelaunch server-page render tests and master brand document expectation tests. Focused Secret Rep ID bridge tests and production build pass.
- [x] **Investigate and upgrade Sparkle Finder public APIs** - completed August
  25 in application commit `f3de6c15` and production deployment
  `dpl_H4TuzixGEezkUFE2pnaVc5MVxzb5`. Catalog detail/configuration now fails
  truthfully instead of returning false authoritative empties, Finder strict
  contracts pass live, and the post-release error/warning/500 log scan was
  clean. Release record:
  `docs/sparkle-suite/operations/2026-08-25-finder-compatibility-release.md`.
- [ ] **Continue Sparkle Suite polishing/editing** - paused awaiting Louis's
  next concrete item. For deployed review, use
  `https://www.yoursparklesuite.com` after confirming it serves the exact
  active-branch production deployment. For implementation, use
  `C:\Users\louis\sparkle-suite-repo` on
  `codex/nic-nac-trade-hardening`. Use reviewer-smoke/synthetic sessions on the
  live site, not Louis's personal account.
- [ ] **Run Brittany's first real Team Management beta smoke**
  - Team Management is re-enabled for Brittany through her verified
  `manual_beta` entitlement, and its private New Rep Onboarding Site is live.
  No participant link, progress record, or message has been created yet. With
  Louis's explicit action-time approval, create one real onboarding participant
  link, verify personalization/progress/messages on the published Site, then
  archive the invite when finished. Do not create fake rep accounts and do not
  use Louis's personal account; the reviewer-browser path remains blocked by
  the known too-short reviewer-token configuration.
- [ ] **Build safer Nic-Nac catalog photo replacement from a new chat upload** - current deployed guard lets Nic-Nac replace a bad canonical catalog photo only when an approved jewelry-front replacement URL already exists. A future improvement should let Nic-Nac accept a corrected jewelry-front photo for an existing design, run it through the same photo pipeline/approval guard, and then call the catalog correction path. Do not let raw label/details photos become canonical catalog images.
- [ ] **Create and smoke-test Sparkle Rep Onboarding Codespace** - paused unless Louis reselects Codespaces; if resumed, stop the rotating secondary Codespace if GitHub's two-running-Codespaces limit blocks creation, create a 4-core Codespace for `louis623/sparkle-rep-onboarding`, then verify terminal, repo path, branch, remote, and write/read/delete.
- [ ] **External drive backup routine** - after Louis buys a backup drive, copy `C:\Users\louis\Sparkle-Suite-Local-Archive` to it and create a simple periodic GitHub/archive backup checklist.
- [x] **Sparkle Finder local binder conversion** - full old repo archived; original local path is now lightweight binder only.
- [x] **Sparkle Rep Onboarding local binder conversion** - full old repo archived; original local path is now lightweight binder only.
- [x] **Sparkle Suite local repo recovery** - active local repo is now `C:\Users\louis\sparkle-suite-repo`; binder remains `C:\Users\louis\sparkle-suite`; latest pushed checkpoint is `8ca775d feat: polish public signup Nic-Nac flow`.
- [ ] **Close three active Sparkle repo sessions safely** - finish stopped repo sessions one at a time, commit meaningful work, push to GitHub, and record branch/status before any future Codespaces setup.
- [ ] **Sparkle repo inventory and rename plan** - after active work is pushed, inventory GitHub/local/Vercel/Supabase links for Sparkle Suite, Sparkle Finder, Sparkle Rep Onboarding, and Sparkle Marketing; confirm target repo names before renaming.
- [ ] **GitHub Codespaces setup for heavy Sparkle repos** - paused unless Louis explicitly reselects Codespaces; if resumed, create a repeatable cloud-workspace workflow for Sparkle Suite, Sparkle Finder, and Sparkle Rep Onboarding.
- [ ] **Agent architecture planning session** — MUST happen before any Phase 2 orchestration code is written — highest risk area
- [ ] **Supabase schema design session** — must happen before any application code is written
- [ ] **Open Brain build session** — Supabase + pgvector + Discord capture bot

---

## This Week

- [ ] **GitLab mirror setup** — do this week
- [ ] **2FA audit** — enable on all accounts this week
- [ ] **Bitwarden setup** — this week
- [ ] **Disaster recovery runbook** — Co-work task now that vault is live

---

## Platform and Dashboard

- [x] **Deploy final recipe unsaved-change guard after Vercel capacity reset** - completed August 17. Exact branch tip `27e62249`, including `c3e6a282 fix: guard unsaved recipe edits`, was manually released as `dpl_36ubbhUBQf2WqvcyiSTh8TAsYBcw`. Both Sparkle Suite aliases and active customer domains point to it; focused recipe coverage and production builds passed, and `/nic-nac?section=recipes` returned 200. Reviewer-browser visual smoke remains blocked by the known too-short reviewer token; no Louis/customer session was used.

- [x] **Audit and repair Vercel automatic Git deployment creation** - completed August 17. The legacy project API flag was already disabled but did not stop Vercel-for-GitHub deployments. Added the current `vercel.json` control, `git.deploymentEnabled: false`, in `c0a66a9f`. Its push created no Vercel deployment after the webhook window, while manual release `dpl_J7VDyXPynjJntQtX5Kn95QABA3qW` retained all production aliases. Keep Git linked and preserve this static rule unless Louis explicitly changes the manual-only release policy.

- [ ] **Dashboard Step 5** — SEO/GEO checklist with Readdy prompt buttons
- [ ] **Command center: billing details** — add billing details per client card
- [ ] **Command center: System tab** — add System tab
- [ ] **Command center: Construction Map tab** — add Construction Map tab
- [x] **Control Center account classification metadata** - completed August 29
  in `299e9bcd` and migration `20260829154000`. Control Center no longer uses a
  known-customer identifier list. Real onboarding persists `customer`; demo,
  reviewer, smoke, and sample creation persists `demo` explicitly. Live
  verification confirmed Kim in Customer Database and absent from Demo
  Database.

---

## Tools and Integrations

- [ ] **Search Louis's Neon Rabbit Gmail for Heather's source recipes** - the Gmail connector was reconnected and verified as `louis@neonrabbit.net` on August 21. Search Heather's messages and attachments for The Perfect Oatmeal Cookie, Cheesy Tortilla Soup, Soft and Fluffy Dinner Rolls, Mom's Apple Betty, and Banana Coffee Cake. Do not treat the earlier no-match result from the former wrong mailbox as evidence.

- [ ] **Launch customer messaging deliberately before re-enabling the SMS wallet** - Messages remains `Coming soon`; before exposing email/text actions or any SMS wallet/recharge UI, confirm provider readiness, consent/opt-out handling, support workflow, safe reviewer smoke, and user-facing copy.
- [ ] **Google Meet transcription tool** — select a tool
- [ ] **Cal.com intake form** — add "biggest current challenge" question

---

## Growth and Revenue

- [ ] **Bomb Party outreach** — begin after Chrome extension is submitted to Web Store
- [ ] **Streaming support add-on** — scope as a future revenue stream
- [ ] **Neon Rabbit agency work** — decide: formalize or keep informal

---

## Chrome Extension

- [ ] **Web Store extension rebuild** — Live Reveal Queue exists as sideload — Phase 2 parallel track

## Sparkle Finder Control Center

- [ ] Run one signed-in operator visual click-through of the new Sparkle Suite / Sparkle Finder switcher and preset save flow when an authorized Control Center session is available. Do not use a customer or personal account as a substitute.

## Unified Workspace communications

- [ ] Run the seven-task friendly-interface acceptance walkthrough with an isolated authenticated reviewer browser session when the supported reviewer token is available: Team reply, inbox return position, Support problem, Support idea/status, official-update distinction, Rep Network accept/decline, and archive/mute reversal. Also verify the Message Center's 60-second visible-tab refresh and focus-return refresh update inbox/header unread counts without moving an open thread or disturbing a reply draft. Automated UI contracts and production-schema smoke are complete; do not substitute Louis's or a customer's account for this remaining visual acceptance.

## Grok Bot Control Center MCP

- [x] Release and activate the shared Sparkle Suite Control Center MCP. Commit
  `5241f567` is live as deployment `dpl_6NhStF3eDSErtBknfmgXTCcRJ8wy`, and
  Grok Bot has a connected **Sparkle Suite Control Center** card with all 13
  tools. The existing masked bearer token was reused without disclosure.
- [ ] After Louis explicitly confirms destructive connector cleanup, uninstall
  the leftover broken `user-Sparkle Suite` OAuth card and the old
  `user-Sparkle Comms` card. Do not authenticate or repair the broken OAuth
  card. Confirm the 13-tool Control Center card remains connected afterward.
- [ ] After activation, run a safe read-only MCP walkthrough: inbox summary,
  minimized Support list/get, reported Network Safety list, broadcast history,
  waitlist list/get (including Kim if present), and operator-health snapshot.
  Create no approval request or send unless Louis separately authorizes that
  exact workflow; confirm an unapproved Support send remains impossible. Do not
  use Louis's or a customer's account as a substitute.
- [ ] Release the additive Guardian source only in a separately authorized
  deployment session. After release, confirm the same existing Grok Bot
  Control Center card discovers 14 tools, exercise only operator health and
  Nic-Nac usage reads, and verify `/control-center/guardian` with an isolated
  operator session. Do not run Sparkle Lab or change any Lab flag.
- [ ] If Louis later wants complete Finder usage or failed-deployment counts,
  design narrow read-only contracts for Finder's separate telemetry database
  and deployment provenance. Do not add cross-product service credentials or a
  monitoring vendor implicitly, and never substitute zero for unavailable data.

## Team Management

- [x] Move private New Rep Onboarding creation and status into each saved Workspace team card while keeping it off the public Join Team site. Released August 30 in `3aecc690` as deployment `dpl_3qts9BFA9cArPGVo7ogfxxcfHNp9`; focused tests and safe live browser smoke passed without creating or exposing an invite link.

## Live Queue meeting proof

- [ ] Have the first paying founder customer install the supported Chrome
  extension, enter the assigned sync code, and complete one real queue
  sync/readback before treating the device handoff as fully proven.

## Nic-Nac reliability

- [x] **Recover live apostrophe-free Calendar reads from zero-output turns** —
  production telemetry proved the September 1 failures used the legacy route,
  spent zero model tokens, called no tool, and were not credit/quota failures.
  Natural contraction variants now route consistently, and both stream paths
  have a mutation-excluding read-only Calendar fallback with telemetry. Exact
  commit `47275feb` is live as `dpl_9WJxru6eyyX6A4KQCrZrkuov7QRK`; only the
  two Suite domains moved.

- [ ] **Continue real-world Nic-Nac pressure testing in the internal demo** —
  the sole-agent production release is live and early smoke is positive.
  Exercise natural, unscripted changes between Calendar, Dance Floor,
  live-show guidance, and other normal rep work. Record the exact user wording,
  visible response, route/run evidence, and tool trace for any failure. Do not
  restore phrase routing, sticky tool packs, or hidden workflow steering.

- [x] **Apply Dex-reviewed ToolLoopAgent corrections** — continuity now renders
  facts only, vague turns cannot fall into the latest stale workflow, agent
  `add_show` arguments cannot be rewritten by old Calendar state, direct
  SMS/email sends are absent from the default harness without a wording router,
  and the exact Calendar read/clarify/add replay passes. Local verification is
  complete, and exact commit `4d96111e` is deployed as
  `dpl_FksLyVKFHSgPUZH5w19sWYhRcDpf`. The harness remains default-off and no
  acceptance cohort is enabled for reps.

- [x] **Implement the approved slice of the Nic-Nac agent-harness rebuild** —
  completed September 1. The default-off `ToolLoopAgent` harness, complete
  permission-scoped catalog, concise employee guide, safety ledger, grounded
  work knowledge, Calendar supersession, capability-scoped recoverable task
  continuity, disambiguated Calendar/Dance Floor tool contracts, bounded
  output/retry/time controls, legacy rollback route, and exact cohort/kill-switch
  controls are implemented. Deterministic evidence is in
  `docs/sparkle-suite/testing/2026-09-01-nic-nac-agent-harness-evidence.md`.
  The adversarial follow-up also removed the legacy regex Calendar resolver
  from the agent catalog, retired the disconnected scripted task reducer,
  validated approvals against canonical history, resumed approvals through the
  real agent loop, bounded optional continuity, prevented passive workflow
  fan-out, and added approval/exact-session guards to destructive removals and
  show replacement. Final local proof is 1,390 Nic-Nac tests, 226 standard
  tests, 51 critical consecutive replays, provider-free smoke, ESLint, diff
  checks, and the production build.
- [x] **Retire the default-off cohort and legacy-kill-switch acceptance plan** —
  completed September 1 by deleting the legacy handler and rollout gate. The
  live endpoint now has one agent route, proven by its response header; rollback
  is an explicit Git/Vercel release action, not a per-account fallback.
- [x] **Supersede the prior isolated Calendar-read replay plan** — the former
  rollout-specific replay is obsolete after the sole-agent release. Calendar
  reads and cross-tool switching are now part of ongoing internal-demo pressure
  testing, with no paid-call cap or customer account implied by this record.
- [ ] **Add a scheduled, isolated Nic-Nac cross-workflow canary** — run a
  disposable reviewer conversation through a Dance Floor intake followed by an
  explicit Calendar request, assert that both replies contain visible
  customer-facing output and that Calendar does not reuse stale Dance Floor
  workflow state, then clean up all synthetic records. Alert on failure. Do
  not use Louis's or any customer's account, and do not create customer-facing
  changes, provider actions, or Live Queue state as part of the canary.
- [x] **Complete OpenAI provider-actual setup for Cost & Capacity** — completed September 2, 2026 with a read-only organization key, separate Suite/Finder project mappings, restricted product runtime keys, and live refresh verification. Billing remains unscraped and actuals remain separated by product.
- [ ] **Add Finder cached-token telemetry** — persist cached input tokens from Finder model responses so Cost & Capacity can replace the current explicit unavailable cells. This is telemetry work only; do not infer cached tokens from totals.

## Nic-Nac cost and capacity follow-up

- [ ] Run the secured synthetic authenticated Finder Nic-Nac production smoke once its write-only smoke token is available to the approved smoke runner. Do not use Louis's signed-in Finder account or a customer account.
- [x] Complete the same-day GPT-5.6 Terra human-default migration. Application
  `2a1e5ad1` / Ready `dpl_AvHkaLxN2UAvA91wK6qjDNLjGsZ1` verified on both Suite
  domains. Repaired reviewer path; live synthetic read/add/public visibility/
  approved cancellation passed. Total estimate $1.05; temporary key revoked.
  Medium reasoning, other tiers, Finder and protected customer domains remain
  unchanged. See the September 2 migration document for evidence and limits.
- Standing rule: leave the unused duplicate OpenAI project and first unused Finder runtime key untouched. They are not cleanup work and should be revisited only if evidence shows a security, billing, access, or operational problem. Any future deletion or revocation still requires Louis's explicit authorization and a dependency audit.
- [ ] Keep historical Default-project provider spend unallocated. If it later appears in the Control Center, show it as a separate legacy/unallocated amount outside Suite, Finder, and their combined product total.

- [ ] Run the isolated production reviewer proof for configured customer-site
  show-platform links only after Louis explicitly authorizes reactivating or
  replacing the archived synthetic reviewer persona. Verify one TikTok link,
  one TikTok + Whatnot card, and the Google/Outlook/Apple-or-other calendar
  chooser on the exact live customer page; never use Louis's or a customer
  account.

- [ ] Run one owner-authorized Control Center visual click-through of the new
  Customer Database Onboarding checklist when an approved non-personal
  operator session is available. Verify a checkbox toggle and refresh. Do not use
  Louis's personal account or create a customer-facing change merely for this
  check.

## Control Center accounting follow-up

## Customer-site search visibility follow-up

- [ ] Obtain verified owner access and Louis's exact authorization before
  submitting a rep sitemap to Google Search Console or Bing Webmaster Tools.
  Submit only after the live domain's canonical metadata, favicon/share card,
  `robots.txt`, `sitemap.xml`, `llms.txt`, and structured data identify that
  rep correctly.
- [ ] If Louis asks to bring `milehighfizz.com` or `brittwithbling.com` onto
  Sparkle Suite, treat it as a separate explicit domain migration. They remain
  independently hosted legacy sites; do not move aliases, DNS, or content as
  part of ordinary SEO work.

- [ ] Have Lane complete one read-only visual sign-in and report only display
  issues for the Suite and Finder accounting views. Do not use the credential
  for customer, billing, provider, or operational work.

- [ ] Design and explicitly authorize the Sparkle Suite accounting sources:
  paid invoices/payments, refunds/credits, balances, and a separate expense
  ledger with a month-end reconciliation rule. Do not use plan prices as cash
  received.
- [ ] Separately design and explicitly authorize the Sparkle Finder accounting
  sources and reconciliation rule. Keep Finder customer and billing data in
  its own product boundary; do not bridge data merely to fill the dashboard.
- [ ] Connect Sparkle Suite actual revenue only after defining the confirmed
  payment/invoice source, late-payment timing, refunds/credits handling, and
  customer-level reconciliation rules. The current projection is not an
  actuals substitute.
- [x] Configure the single dedicated Lane-only accounting connector — completed
  September 3. The bearer is stored only in Lane's secure field; its database
  record retains only a digest. The MCP's harmless current-snapshot read proof
  succeeded, and no figures were added during verification.
- [ ] Have Lane append reconciled aggregate snapshots when he has verified
  source totals. Do not fabricate figures to populate the dashboard. The
  weekday 6:30 a.m. routine should flag any unavailable source rail.
