# Session Log

## September 8, 2026 - LOC control-center rebuild and verification

Implemented and tested the LOC integration with coordinated UI, agent registry and Suite/Finder bridge work. See [checkpoint](2026-09-08-loc-control-center-build-checkpoint.md) for exact verification and remaining gates. Final browser requests validate against the actual catalog; Fold/cover layouts preserve LOC styling. Preserved concurrent Live Lineup audit work. No live customer mutations or release occurred. Protected reviewer link requested from Louis; do not substitute personal customer data.

## September 8, 2026 (ET) - Full-system Live Lineup reliability audit

- Louis requested a very deep audit first, covering Workspace/backend,
  customer-facing pages, and Chrome extension. Reviewed earlier tasks, actual
  Open Brain, incident records, current source, live service metadata, and the
  customer page. Report: `docs/sparkle-suite/audits/2026-09-08-live-lineup-system-audit.md`.
- Deployed Edge source matches local after line-ending normalization. Public
  store version is 1.0.1; retained ZIP functional files match local source.
  Brittany's actual installed show-computer build remains unverified.
- Safe reads confirmed correct Brittany mapping, anonymous sync-code exposure,
  two duplicate internal/demo rep mappings, Brittany-only poll endpoint, and
  current delayed-name retention. Current stale data alone is not proof of an
  active-show outage. No ingestion POST or production mutations were attempted.
- Added 18 mocked characterization tests (passing reproduces current defects,
  not fixes) and a sanitized read-only audit script. Focused six-suite run:
  40 tests passed. Desktop public modal/strip inspected; status overlays content
  when scrolled, and modal focus/semantics need hardening.
- No product fix, release, extension change, authentication workaround, or
  live Task List mutation. Preserve all unrelated Control Center/Finder edits,
  artifacts, and test results. Next: owner-directed staged hardening and a
  confirmed safe show/release window before any production-affecting work.

## September 9, 2026 - Brittany original TikTok Sparkle Moments published

- Louis explicitly authorized restoring the three original TikTok embeds from
  Brittany's retained Readdy About page into her live Sparkle Suite Workspace.
- Source links, preserved in the same order: `7476510653268806958`,
  `7387364398832094495`, and `7338490860503387434` under
  `@brittwithbling`.
- Used the existing transparent support session for Brittany, entered the three
  links in Sparkle Moment 1–3, and received the Workspace confirmation “Site
  settings saved.”
- Fresh visual verification on
  `https://www.yoursparklesuite.com/brittwithbling` showed all three playable
  TikTok cards in a row, each with the matching Watch on TikTok destination.
- No code, deployment, extension, billing, email, DNS, or unrelated customer
  state was changed. The retained Readdy project and its other content were not
  modified.

## September 8, 2026 - Brittany customer-facing About/media restoration

- Louis clarified that “unhide” referred to Brittany's actual public site, not
  only the new Workspace controls. The live template confirmed
  `showAboutSection: false` despite preserved migrated copy and imagery.
- Restored the Brittany-only public About/media block by default when no
  explicit Workspace visibility choice exists. Existing migrated copy and
  portrait render immediately; empty optional video cards stay omitted. An
  explicit future hide remains durable, and the Workspace switch now reflects
  the restored default.
- Focused public-site/Workspace/service checks passed 397 tests; the wider
  affected template run passed 309 tests; the local and Vercel production
  builds passed, including Next.js TypeScript and static generation.
- Pushed application `4cf10ebf` and manually released exact tip as Ready
  deployment `dpl_BESV662NEXSgJnNPCHo4hD7HWs69`. Both Suite domains resolve to
  it. A fresh live in-app-browser reload visibly confirmed the About/media block
  between “What is a Bomb Party?” and “Never Miss a Show”; the live template
  reports `showAboutSection: true`, www returns 200, and apex redirects to www.
- The shared Vercel production aliases advanced normally. No registrar/DNS
  record, customer data, extension, email, credit, billing, or Live Lineup
  state was changed. `artifacts/` and `test-results/` remain preserved.

## September 8, 2026 - Brittany Workspace media parity release

- Audited the migrated Britt with Bling Workspace/site contract. The saved
  showcase value was a TikTok photo URL that the public player could not render,
  there was no About media configured, the About cards were hidden in source,
  and hard-coded custom CSS masked ordinary theme changes.
- Added Brittany-only Workspace labels and controls for the showcase video,
  About portrait, three optional short videos, explicit remove/replace state,
  and non-destructive About publication. The current visible showcase and an
  existing portrait preload into her draft; explicit removals do not restore
  fallback media.
- Preserved the locked hero image and static “The Rise of Her.” Empty short
  cards remain absent, and ordinary reps keep their existing Site Settings UI.
- Final proof: 195 focused tests, 91 Amethyst template tests, local Amethyst link
  checks, two production builds, a rendered local customer-page smoke, and a
  safe synthetic Workspace remove/theme/save smoke. Synthetic settings were
  restored after the test.
- Pushed application commit `a2e0f467` and manually released exact tip as Ready
  deployment `dpl_2QEEHmatFCVaoGV53q45AyYWWFQi`. Both Suite aliases resolve
  to it. Live `/brittwithbling` visual and asset checks passed without browser
  errors; apex redirects to the same www path.
- No customer/personal account, extension, store, email, credit, billing,
  Live Queue, or registrar/DNS-provider state was changed. Exact signed-in
  Brittany production Workspace proof remains unperformed because smoke used
  the supported synthetic reviewer rather than her account.

## September 8, 2026 - Consolidated memory closeout

See [session closeout and handoff](2026-09-08-session-closeout-and-handoff.md) for completed welcome/email work, live-show mitigation, final styling, decisions, lessons, and deferred items. Last session-verified app is 48615edf / dpl_GeV9T1ad1sktsRt7VUPr8y6RRvE6; not freshly checked today. This is documentation only. Next session opens Control Center read-only and stands by; no automatic work, sending, credit application, auth repair, or extension changes.

## Latest September 5 release - Brittany button polish

See [button polish closeout](2026-09-05-britt-hero-buttons-closeout.md): app 48615edf / dpl_GeV9T1ad1sktsRt7VUPr8y6RRvE6 on Brittany and Suite apex/www only. Equal hero buttons and matching gold-to-blue gradients, desktop/mobile verified. No live-show behavior changes. Earlier unresolved items remain deferred.

## September 5, 2026 - Live Lineup mitigation and Brittany-only cleanup

See [current closeout](2026-09-05-live-lineup-closeout.md): application 9e96887d / dpl_FZQJFd561g9dtBEv93gjxHb4PgJ9; automatic Live Lineup, clean numbered names, Brittany cards hidden and Dance Floor coming soon. Permanent repair remains in live Control Center Task List e453d5cc-0ac8-4d46-9dab-182a6aa723d7 for a no-live-shows window. Mile High Fizz apex/www release is blocked by existing domain configuration; no DNS changes made. Preserve saved data; do not automatically pursue deferred work.


Running log of significant work sessions. Most recent first.

## September 5, 2026 - Brittany email apology and promised credit

- At Louis's request, updated the existing unsent Workspace-walkthrough draft
  with an opening apology for the poorly timed domain migration during her big
  show. Takes responsibility for not checking/communicating beforehand and says
  the migration would have been postponed had the show timing been known.
- Includes Louis's promise of a one-month Sparkle Suite subscription credit.
  This is draft wording only: no credit was applied and no billing action was
  authorized or performed. Sender, recipient, complete replacement body and
  DRAFT label verified. Existing private login and meeting details preserved;
  email remains unsent. Welcome Site unchanged.

## September 5, 2026 - Brittany Black Diamond welcome guide and private email

- Read current memory, handoff and applicable welcome/email/brand/Sites skills;
  verified louis623/sparkle-suite, allowlisted codex/nic-nac-trade-hardening,
  starting HEAD fb02bebd08393ae4e9cd73b55b41e668890eb483. Consulted Open Brain.
- Reused welcome Site project appgprj_6a790bc7e62c8191aeb5b4658dab5989, preserving
  its public audience and URL. Isolated source checkout:
  C:/Users/louis/.codex/visualizations/2026/09/05/01a073a7-aef8-7330-8ca2-a24e9899f56a/brittwithbling-beta-welcome.
- Site source commit 6355711f18b1187609e28e08d8d008766b55c8a8 pushed to the
  existing Sites source branch. Saved version 2:
  appgprj_6a790bc7e62c8191aeb5b4658dab5989~appgver_d6fda1fbb4a08191b93694b0f3499913.
  Deployment appgdep_6a9ca0e446cc819194dd6b2621bb6f97 succeeded. Verified the
  published guide visibly at its existing URL and left it open in Codex.
- Content: first-rep gratitude, existing $39/month/no-build-fee terms supplied
  by Louis, public/private distinction, sign-in/password instructions, current
  navigation map, Nic-Nac, Calendar, Dance Floor, site editing/autosave, Customer
  List imports, Message Center/Support, Team Management beta, billing location,
  honest future-feature labels, small first-session checklist and FAQs.
- Verification: production build, lint, 3 rendered HTML/navigation/privacy
  checks passed. Desktop and 390px phone preview checked; anchor navigation and
  help disclosure worked without horizontal overflow. No live-page console
  errors observed. Font fallbacks corrected after visual inspection. No signed-in
  customer/reviewer walkthrough was performed; existing reviewer blocker remains.
- Read-only account check found active existing rep with billing provider links;
  stored monthly amount is zero. Local Stripe credentials could not resolve the
  linked subscription (404), so this is NOT a fresh provider price verification.
  The $39 contract is owner-confirmed and previously documented. No repair made.
- Gmail connector verified Louis's mailbox; no prior matching draft was returned.
  Created and read back the new draft "Brittany, your Sparkle Suite Workspace
  walkthrough". DRAFT label, intended recipient, exact body, welcome/meeting
  links and privately supplied login details verified. Nothing sent. No secrets
  were added to source, guide, Git, vault, or Open Brain.
- Main application code/deployment, customer accounts, Stripe objects, Live Queue,
  extension files, artifacts/ and test-results/ were not changed. Guide-only Sites
  publication is separate from the main Vercel release process.

## September 5, 2026 - Landing/TikTok session closeout and handoff

- Landing hero release evidence remains recorded below: Emerald Garden desktop
  plus Rose Gold mobile, sticky founder strip, building-now positioning, brand
  preserved. Last verified live app e2bc8238 / dpl_Ggubupez6DRvcZczVwXBWBXQEEG9;
  later commits are offline marketing/docs, not new website deployments.
- Five standalone TikTok JPG/PNG pairs completed; framing revision committed
  and pushed as 6edd1024 (initial pack 275cbef9). Five JPGs copied to
  C:/Users/louis/Downloads/Sparkle Suite TikTok - September 5 and each verified
  by SHA256 against the marketing originals. No ZIP extraction needed.
- Louis requested a catchy hook for each post, then expanded descriptions to
  approximately 30-second reads: warm, inviting, concrete use case or show
  benefit, not maximum-length filler. Latest exact copy is now saved in
  marketing/tiktok/2026-09-05-building-now/FINAL-POST-COPY.md; older CAPTIONS.md
  and packaged copy predate this refinement.
- Lesson: correct 9:16 dimensions alone do not ensure good TikTok framing.
  Center the composition and enlarge focal content while checking actual UI
  preview. Real screenshots and exact branding must survive scaling intact.
- Founder 19 is owner-supplied, time-sensitive, and must be checked before use.
  33% is rounded savings on first 12 paid months only; retain renewal/setup/tax
  and eligibility terms. Free queue enrollment does not reserve the discount.
- No social posting, scheduling, music download, account mutation, or further
  application deployment. Existing artifacts/ and test-results/ left untouched.
- Next session: read current memory and provenance; open live /control-center
  in Codex in-app browser and stand by. If sign-in is required, stop there;
  do not repair auth, bypass access, or start unrelated open items. Existing
  signed-in synthetic reviewer verification remains unresolved.

## September 5, 2026 - TikTok framing revision and fifth founder card

- Centered and enlarged first three offline TikTok layouts; preserved fourth.
  Desktop screens 640 to 830px; mobile 250 to 290px; centered headings and CTAs.
- Added fifth 19-spots/33%-off card using Louis's supplied count; first 12 paid
  months, $49.99 then $74.99, non-refundable $49.99 setup fee plus tax and
  checkout eligibility disclosed. Count must be rechecked before posting.
- Ten 1080x1920 JPG/PNG files, updated captions, manifest, preview and ZIP in
  marketing/tiktok/2026-09-05-building-now. Native editable layouts preserve
  real captures/logo; full-size/reduced QA and text bounds pass. No publishing
  or live app change; no Vercel release for this offline media pack.

## September 5, 2026 - TikTok weekend still-image pack

- Created four standalone 1080x1920 JPG/PNG posts based on the approved landing
  work: Your site/Your turn (building now), Same tools/Different you (themes),
  Big sparkle/Small screen (mobile), and Get in at the start (founding offer).
- Durable outputs: marketing/tiktok/2026-09-05-building-now, including ZIP,
  captions/music moods, preview, manifest, production notes and renderer.
- Official S seal, exact Playfair Display/DM Sans, and unchanged real Emerald,
  Amethyst and Rose Gold captures are composited deterministically. One native
  ImageGen decorative ribbon background; no generated logos or product UI.
- Avoided fixed count/price claims that could go stale over the weekend.
  Founding eligibility/availability remains subject to checkout; joining is free.
- Full-size and reduced previews inspected; essential text bounds verified with
  400px bottom space. JPGs 245–445KB; PNGs 284KB–1.76MB. ZIP contains eight
  upload/master images plus CAPTIONS.md. TikTok official guidance consulted.
- No posting, scheduling, music download, account change, or live-site code
  change. This is an offline creative delivery, not a production website release.

## September 5, 2026 - Emerald desktop and Rose Gold mobile hero live

- Replaced owner-rejected Black Diamond hero with Emerald Garden desktop plus
  Rose Gold mobile. Canonical renderer captures use the explicitly authorized
  demo's public content; browser-only preset overrides did not change saved
  demo settings. No invented UI, account mutation, or private session capture.
- Versioned WebPs: hero-emerald-desktop-v3 (1265x961, 64832 bytes) and
  hero-rose-mobile-v3 (390x1020, 30970 bytes). Layered screens share perspective;
  phones stack the previews, with full image aspect ratios and no caption overlap.
- Exact pushed app commit `e2bc8238b3a19cca238768530862a4f70f670d5d` deployed
  Ready `dpl_Ggubupez6DRvcZczVwXBWBXQEEG9`, provenance URL
  `https://sparkle-suite-qeqrozn71-louis-2849s-projects.vercel.app`.
  Both Suite domains inspected on this ID. Nine customer aliases remain on
  `dpl_7ZWsWPJJX5483Vvf3Nce9FFxxtGh`; prior Suite deployment preserved.
- Build/lint, 33 focused tests and 239 standard tests passed. Local + exact live
  320/390/768/935/1440/1600px browser checks pass: loaded images, no overflow,
  no caption collision, all theme/tool switches, tour pause, FAQ and build queue.
  Zero runtime/console errors in these checks. Screenshots inspected outside repo.
- In-app 935px live view refreshed: both images decoded, mobile bottom 1258px
  before caption 1311px, no overflow. Sticky offer click retained banner top 0.
  Left exact live /#top open. Isolated Playwright used for responsive sizes
  (Browser skill absent); in-app CUA used for actual user-viewport proof.
- Signed-in smoke not repeated: existing demo session was signed out and
  /nic-nac correctly showed login. No password/Google-auth recovery, checkout,
  account/database/provider writes, or saved customer-theme changes attempted.
- Local build tooling was temporarily slow but completed successfully; Vercel
  production build also passed. Untracked artifacts/test-results preserved.

## September 5, 2026 - Britt alternate-code rollback

- After Louis reported that the alternate-code test stopped working, restored
  Brittany's active Sparkle Suite rep to the previously verified grandfathered
  row in one exact-guarded transaction. The unused migrated row returned to the
  historical placeholder identity; both records and all queue data remain.
- The restored row held 42 names, but its legitimate timestamp remained older
  than the public site's three-minute freshness limit. One complete extension
  heartbeat interval produced no new update. This rules out ordinary website
  propagation delay and leaves the show-computer extension sync as the active
  issue. No manual queue or timestamp update was made.
- A real extension heartbeat then arrived and grew the queue to 43 names.
  Production linkage and the public customer-site bootstrap both verified the
  grandfathered row as live. Louis explicitly directed that Brittany remain on
  this active show row; the alternate migrated code stays unused and parked.

## September 5, 2026 - Owner-directed Britt alternate queue-code switch

- Superseded observation: Louis initially believed the alternate migrated code
  worked from Brittany's live-show side. It remained empty/null server-side and
  the show then stopped; the later rollback and fresh grandfathered heartbeat
  establish the final assignment.
- Louis explicitly confirmed switching Brittany away from the visibly working
  grandfathered Live Queue row to the other migrated code as a reversible test.
  Before acting, he was told the grandfathered row was actively syncing while
  the alternate row was empty and had never synchronized.
- Applied an exact-guarded transaction that linked Brittany's active rep to the
  alternate row and returned the grandfathered row to its historical
  placeholder identity. The grandfathered row, its current timestamp, and all
  queue names were preserved for rollback.
- Post-switch production verification confirms Brittany's rep resolves to the
  alternate row. The public Britt bootstrap reports an empty queue with zero
  entries, matching that row's stored state. No extension, queue contents,
  timestamp, Web Store setting, deployment, DNS, account, or billing state was
  changed.

## September 5, 2026 - Sticky founder banner live

- Owner-selected founder strip moved from below hero to immediately below header.
  Static blush banner sticks to viewport top while scrolling; boxed pink real
  count with Only, first-year discount copy, and pricing anchor. No fake timer.
- Exact pushed app tip `c8c6cf2abe9deb341e4f96e56475297ab83a508e` deployed Ready
  as `dpl_7dQhYPMXCKDckeR5qhsE1hZVEPnC`, provenance URL
  `https://sparkle-suite-6dg1ftetr-louis-2849s-projects.vercel.app`.
  Both Suite domains verified on that ID. Nine customer aliases remain on
  `dpl_7ZWsWPJJX5483Vvf3Nce9FFxxtGh`. Prior Suite deployment preserved.
- Build/lint, 33 focused tests, 239 standard tests pass. Local and exact live
  domain Playwright checks at 320/390/768/1440: one banner, below header,
  76px phone / 90px larger height, sticky across scroll directions, no horizontal
  overflow, pricing anchor clear, no console/runtime errors. Full existing
  theme/tool/tour/FAQ/build-queue interaction regression also passes at all four.
- In-app live page refreshed and offer clicked: banner top 0, pricing top 119.7px.
  Existing explicitly authorized demo workspace reload retained Louis identity
  and /nic-nac destination, no checkout. No account/database/provider writes.
  No fresh OAuth exchange or live checkout was performed for this CSS/copy edit.
- Screenshots and verification scripts stored outside repo in the session's
  Codex visualizations directory; untracked artifacts/test-results preserved.

## September 5, 2026 - Britt live-show queue linkage incident

- Compared Brittany's active rep and both production Live Queue rows against
  the grandfathered migration seed. The installed extension was publishing to
  the grandfathered row, which held 44 names, while the migrated rep resolved
  to a different empty row whose `last_updated` had always been null.
- Applied one exact-guarded transaction: the never-synced generated row was
  parked on the historical placeholder identity and the grandfathered row was
  linked to Brittany's active Britt with Bling rep. Post-write verification
  confirmed one Live Queue row for the active rep and preserved both records.
- The public Britt site resolves the repaired row, but its deliberate
  three-minute freshness guard continues to hide the 44-name snapshot because
  the extension has not published since 2:24 p.m. ET. The old timestamp was not
  advanced manually because that could expose an inaccurate reveal order.
  Louis was asked to have Brittany verify On / Connected, the existing
  grandfathered code, and the current party selection on her show computer.
- No extension source/package, Web Store setting, Bomb Party page, queue names,
  DNS, deployment, customer account, billing state, or outbound message was
  changed.
- Follow-up verification confirmed the extension resumed publishing to the
  grandfathered row. The database showed a fresh changing queue, the public
  bootstrap reported `live`, and Chrome displayed the full current queue on
  `brittwithbling.com`. The customer-facing queue is operational again.

## September 5, 2026 - Varied product proofs and mobile message are live

- Released exact pushed tip `736e0d27094cad3b14e82337301312328a96ca86` (landing
  app `cd457107`) as Ready `dpl_GC16FXboorHVsH427ArLfAxTtYrp`, source URL
  `sparkle-suite-pz6kilbqe-louis-2849s-projects.vercel.app`. A CLI connection
  dropped after deployment creation; inspected the existing Ready deployment
  rather than creating a duplicate. REST metadata confirmed both Git SHA fields
  before assigning only www/apex Suite aliases. Both exact destinations were
  confirmed. All nine customer aliases remain on `dpl_7ZWsWPJJX5483Vvf3Nce9FFxxtGh`.
- 306 selected tests pass (43 landing/founder,239 standard,24 inherited Join),
  ESLint and full local/Vercel builds pass. Live isolated Chromium at320,390,
  768 and1440 checks all styles, all three tool previews, image decoding,
  play/pause, FAQ and `/prelaunch#waitlist` navigation, zero overflow and no
  page/console errors. Rendered desktop hero and phone styles/Dance Floor were
  pixel-reviewed; no product card corners are clipped. Live screenshot evidence
  is in the session visualization directory as `live-*-hero/styles/dance-floor.png`.
- Refreshed Louis's existing in-app landing tab; it had retained an older page.
  It now visibly shows Black Diamond, the phone/tablet/desktop promise and19
  founder spots. Live founder API, login, Nic-Nac health, public demo Trade and
  apex canonicalization return200. The explicitly authorized Chrome admin/demo
  session reloads to `/nic-nac` with correct workspace identity and six dancers.
  No synthetic session, fresh OAuth, signup, charge or outbound message was used.
- Source changes are presentation-only; original Rose Gold demo appearance was
  restored. Four authorized demo jewelry additions remain available for future
  demos. Two removed bad catalog records/listings remain recoverable from the
  private snapshot. No storage deletion. This closes the imagery/mobile request;
  conversion lift is not measured and must not be claimed from visual QA alone.

## September 5, 2026 - Coordinated Britt domain release completed before landing

- The owning task completed BrittWithBling's cutover and narrow custom-domain
  Join precedence fix in `7bcd21637fe0fbce0e92e194a4a9923d5932b480`, deployed as
  `dpl_7ZWsWPJJX5483Vvf3Nce9FFxxtGh` / `sparkle-suite-4v9qp70e9-louis-2849s-projects.vercel.app`.
  It reports HTTPS200 for apex/www, trade, join, privacy, robots and sitemap;
  Chrome visual home/Dance Floor/Join verification passed. Its exact tenant
  domain mapping is `brittwithbling.com`; GoDaddy nameservers/non-web records
  were preserved. This paragraph records that task's completed work, not an
  additional DNS or customer change by the landing task.
- This landing task independently confirmed the settled Vercel alias map:
  both Suite hostnames and every existing customer alias, including both Britt
  aliases, target that exact Ready deployment. Preserve this deployment and
  all customer aliases when publishing the following landing revision.
- The owning task explicitly released the deployment handoff. Landing app
  commit is `cd457107116307d7f2f59a6a6b5921bcaf0528bd`, pushed and verified;
  the release will use the exact current tip after this memory checkpoint.

## September 5, 2026 - Real demo product captures and mobile messaging verified locally

- Louis explicitly authorized using his existing admin/demo as the image source.
  Its Chrome session opened the live `/nic-nac` workspace, not checkout. The
  refreshed Jewelry Library no longer displayed the two removed bad items.
- Captured real public demo heroes in Black Diamond, Gnome Forest, Alpine Opal
  and Amethyst. Captured Garnet Dance Floor and an Emerald Garden featured
  event. Four verified-photo pieces (ER82687, ER99190, ER39527, ER39356) were
  added through Quick add to the demo only; all four success states were
  confirmed, bringing its count from two to six. No trade requests were sent.
  Original Rose Gold theme was restored and the save visibly confirmed.
- Replaced the landing hero/style images with six versioned WebPs, led the
  three-stop tour with real jewelry/Dance Floor, removed its clipped queue
  preview, and retained the actual Live Queue feature and included-feature copy.
  Existing Nic-Nac proof is retained. New source captures are not recolored or
  synthesized. Temporary synthetic fixture HTML was removed; its generator
  is unchanged and can regenerate historical samples.
- Louis requested explicit phone/tablet positioning. Hero caption and style
  section now say phones, tablets, and desktop; the tool introduction mentions
  browsing from a phone. Longer theme controls wrap safely; full product
  screenshots use contain instead of cropping their contents.
- Local checks: full Next production build, lint, 43 focused landing/founder
  tests and 239 standard tests passed. Isolated Chromium at320/390/768/1440
  verified all three styles, all three tools, image decoding, tour play/pause,
  FAQ and build-queue navigation, zero overflow and zero console/page errors.
  Pixel-inspected new source images and desktop/phone Dance Floor rendering.
  QA evidence is in the session visualization directory (local-*-*.png).
- A separate Join-page routing edit appeared in `lib/amethyst/join-page-access.ts`
  and its test during this work; it is not part of this landing patch. An initial
  local check met missing shared `.next` output, then passed after output was
  available. Do not deploy a mixed working tree. Coordinate release ownership
  before publishing; live landing remains `163bffc9` / `dpl_7Wu2WVCP24JqE65f6WGhG8p9pxZq`.

## September 5, 2026 - Approved bad-photo removal completed

- Louis explicitly approved removing Pearl Parade ER11309 and The Power Edit
  ER90783 plus their two associated available Dance Floor listings. Exact-ID,
  identity and updated-at guards passed; no linked requests, fulfillment or
  swaps existed. Both catalog records and both listings were removed and the
  post-write query verified zero remaining targets.
- A private, gitignored recovery snapshot and operation receipt are retained
  in `.local/catalog-removal-2026-09-05-{recovery,receipt}.json`. Two cascading
  catalog audit rows were backed up; no storage objects were deleted. No
  billing, account, provider or customer messaging action occurred.
- Louis subsequently authorized using his existing `louis@neonrabbit.net`
  admin/demo workspace as a screenshot source, including demo theme/item
  changes. This is a scoped exception for product imagery, not authorization
  for signup/checkout tests or changes to real customer accounts. Preserve the
  active, dashboard-unlocked, non-live internal-demo entitlement invariant.
- Product imagery work remains pending; the earlier landing deployment is
  unchanged. Replace similar-colored captures and the clipped queue image,
  leading with real jewelry/Dance Floor and visibly different actual themes.

## September 5, 2026 - Product-proof revision paused for catalog photo cleanup

- Louis likes the landing layout but rejected similar-colored product images
  and the visibly cut-off queue source image. Inspection confirmed the source
  capture itself was badly framed; loaded-image checks had missed composition.
  Requested direction: varied real themes including Black Diamond and Gnome
  Forest, and lead with jewelry/Dance Floor rather than the lesser queue feature.
- Before new captures, Louis requested correction or removal of two bad catalog
  items: Pearl Parade ER11309 and The Power Edit ER90783. Duplicate pasted
  Pearl Parade text was a copy/paste mistake, not duplicate catalog records.
- Read-only49-design contact sheet confirmed both images are labels; ER90783's
  image is labeled ER80341. Each has one available Dance Floor listing using
  the same bad photo as its listing override. No enhanced replacement, staged
  file or alternate historical catalog photo was found in targeted inspection.
- No catalog, inventory, account or storage mutation has been made. Removing
  catalog rows also implicates active listings; obtain direction for that
  additional inventory effect before deleting. Landing capture generator edits
  are unfinished/local only; no new release. Resume imagery after this cleanup.

## September 5, 2026 - Additional landing accessibility verification

- Completed live390px reduced-motion and JavaScript-disabled checks with bundled
  Playwright and isolated headless Chromium because the in-app browser lacks
  these emulation capabilities. No personal profile, dependency installation,
  form submission or account mutation. Reduced motion had zero CSS animations,
  working Violet selection/FAQ, decoded previews and no console/page errors.
- No-JavaScript mode retained readable server-rendered content, native FAQ and
  explicit unconfirmed founder/standard pricing fallback; JS-dependent features
  were not claimed functional. Evidence and limitations appended to the landing
  verification ledger. No application edit or new deployment was needed.
- Read-only `/start` still redirected to `/prelaunch` without protected reviewer
  controls. Same signed-in access blocker; no repeated password attempt.

## September 5, 2026 - Landing implementation and production verification

- Implemented the approved detailed plan with founder, copy and inquiry-handoff
  subagents. Preserved canonical branding and existing workflow contracts.
- Pushed app `163bffc9` and manually deployed with skip-domain; explicitly moved
  only www/apex Suite aliases to `dpl_7Wu2WVCP24JqE65f6WGhG8p9pxZq` and verified
  both mappings. GofortheBling, Mile High Fizz and The Bling Kitchen stayed put.
- Selected530 tests passed; local/Vercel production builds passed. Live desktop
  and mobile previews, count19, CTA/intake, signed-out login, FAQ, assistant
  keyboard behavior and production-disabled review fixture/flag verified.
- No real intake/inquiry saved, emails/SMS sent, checkout opened, provider
  object changed, customer migrated or account mutated. Database schema read
  supports inquiry fields; production insert success is not claimed.
- Owner authorized synthetic reviewer restoration/testing. Exact read-only
  Britt Test Rep inspection found inactive demo with unlocked setup and non-live
  smoke entitlement. Protected controls/token unavailable; one documented
  synthetic login attempt rejected. Stopped signed-in testing per smoke skill;
  protected reviewer access is the remaining blocker.
- Plan and detailed verification ledger updated. Preserve untracked artifacts
  and test-results. Application is live; full signed-in verification is pending.

## September 5, 2026 - Sparkle Suite public landing audit

- Audited the live homepage at desktop 1440px and phone 390px, plus a narrow
  320px reflow check; followed intake and signed-out login, and verified public
  Nic-Nac open/minimize/reopen/close without sending questions or forms.
- Recorded the detailed evidence-based report and design direction in
  `docs/sparkle-suite/landing-page/landing-audit-2026-09-05.md`; preserved fresh
  screenshots in `artifacts/landing-audit-2026-09-05/`. Restored browser size.
- Louis's constraints: no functionality loss, retain brand/colors, improve
  copy and motion. Active build-queue framing replaces dormant waitlist copy.
  Preferred scarcity copy is **19 founder spots remaining**, not a fraction;
  Kim/one claimed is Louis's supplied count, not an audited payment count.
- Identified differing founder-price messaging between homepage and prelaunch,
  placeholder footer destinations, and a non-persisting assistant contact
  handoff in source. No production data or application behavior was changed.
- Next step is a high-fidelity visual direction before coding, followed by
  verified founder allocation/count integration and full preservation checks.

## September 5, 2026 - Shared customer-site mobile explainer layout

- Changed the shared Amethyst homepage's three-step Order / Watch Live /
  Receive explainer from a squeezed three-column phone layout to compact,
  single-column icon-and-copy rows at `720px` and below. Desktop keeps the
  existing visual row.
- Commit `832f16e5` was pushed and manually released as Ready deployment
  `dpl_DgnnzsNrqsyF61PEzW4K5zamiop5`. Focused tests (52), the Amethyst suite
  (91), the production build, and a 390px live GofortheBling visual check
  passed. The cache marker is `20260905-mobile-steps`.
- Louis clarified that Mile High Fizz and The Bling Kitchen are not yet
  migrated to Sparkle Suite's current customer-site surface. They remain
  separate temporary Vercel sites; this release must not be understood as an
  authorized migration, alias, DNS, mail, or content change for either site.

## September 5, 2026 - Full September 4-5 session memory reconciliation

- Reconciled the full working session against the repository vault and actual
  Open Brain, including implementation releases, live publications, creative
  deliverables, communications, decisions, lessons, and remaining work. The
  detailed release entries below remain the source for exact test counts,
  commits, deployments, and domain proof.
- Diagnosed and released customer-facing Live Calendar show notes in the shared
  card; published Louis's Live Calendar/Nic-Nac YouTube demo to the Resource
  Library and its receive-only Message Center announcement; created the
  reusable Sparkle Suite media-creative skill and two approved 16:9 thumbnail
  packages. The selected Dance Floor phone-demo JPG is preserved at
  `artifacts/youtube/sparkle-suite-add-dancers-by-phone-youtube-thumbnail-3840x2160.jpg`.
- Prepared two branded Gmail drafts without sending: a current-rep Live
  Calendar demo message with clickable thumbnail/video destinations, and a
  surprise note to Kim about her redesigned TikTok flyer and website path.
  Both remain owner-proof/send gated.
- Created three GofortheBling flyer directions, refined Louis's selected second
  direction through margin, ornament, QR-size, and balance corrections, and
  preserved the final at
  `artifacts/social/kim-goforthebling-flyers/kim-goforthebling-flyer-02-v3.png`.
  Its QR code was machine-validated to `https://goforthebling.com`. The final
  flyer art became the approved visual authority for the released Gnome Forest
  skin, Kim's hero experience, favicon, and social-share image.
- Built and released the flyer-matched Gnome Forest preset, then—under Kim-only
  approval—activated it, applied the exact approved hero title/subtitle, added
  separately editable Hero title and Hero subtitle controls, and renamed the
  visible skin while retaining the stable `gnome_garden` / GG-01 ID. The final
  branding release added Kim's durable favicon and 1200x630 social card.
- CheapNames reported the `milehighfizz.com` registrar transfer complete.
  Final read-only Vercel inspection corrected an earlier stale hosting
  assumption: both Mile High Fizz hostnames resolve to Ready Sparkle Suite
  deployment `dpl_GVnxy1rm8MXCBKaaEwBL3mdeLkSB`, and the apex returns HTTP
  200. No DNS, nameserver, or alias change was made during closeout; preserve
  the authoritative DNS/service inventory for future registrar or mail work.
- Key lessons consolidated: use the exact owner-approved artwork across related
  media; keep product screens capture-only; validate QR payloads mechanically;
  proof clickable links and final email layout in Gmail; preserve stable skin
  IDs when changing public labels; use exact tenant guards for customer data;
  and visually inspect live generated image pixels because Vercel may render
  SVG text differently from local development.
- Final application tip is `249954e83b338344f4c5a6ea4ea72c9f7876ac7b`
  on Ready deployment `dpl_7th6mvkpBbscanWHLbrxWYjZKJzJ`. This reconciliation
  is documentation-only and does not require another deployment. Untracked
  `artifacts/` and `test-results/` remain preserved.

## September 5, 2026 - Kim Gnome Forest favicon and social-share release

- Added a Kim-only Gnome Forest `G` monogram favicon and a request-aware
  1200x630 social card built from the already-approved forest, gnome, and
  lantern artwork. The card includes `GofortheBling`, the custom domain, and
  both approved hero lines without changing Kim's site content or settings.
- Initial local render passed, but mandatory live pixel inspection caught that
  Vercel did not render the SVG's system-font `G`. Preserved that deployment as
  evidence, baked the approved mark into a deterministic PNG, rebuilt, and
  visually confirmed the corrected live favicon and card before closeout.
- Final verification: 9/9 focused tests, 239/239 standard tests, full local and
  Vercel builds, local Host-header metadata/image checks, live 192x192 and
  1200x630 PNG dimensions/content types, public root and Dance Floor 200,
  expected disabled Join 404, Suite root/apex stability, and health 200.
- Pushed final application tip `249954e83b338344f4c5a6ea4ea72c9f7876ac7b`
  and released Ready `dpl_7th6mvkpBbscanWHLbrxWYjZKJzJ`. Used
  `--skip-domain`, then moved only both Suite aliases and
  `goforthebling.com`. Direct hostname inspection proves Mile High Fizz,
  Bri's Glowtique, and The Bling Kitchen remain on
  `dpl_GVnxy1rm8MXCBKaaEwBL3mdeLkSB`. No login, account, billing, DNS, message,
  customer-content, or signed-in reviewer mutation occurred; untracked
  `artifacts/` and `test-results/` were preserved.

## September 5, 2026 - Kim Gnome Forest activation and hero editor release

- Applied Louis's explicit Kim-only content approval with exact identity and
  optimistic-value guards. The initial activation changed only
  `appearance_preset`, `hero_headline`, and `tagline`; after adding the new
  column, a second guarded write changed only `hero_subtitle`. Final readback
  matched all four approved values exactly.
- Added the rep-editable Hero title/Hero subtitle contract to the Site Settings
  form, service/API payload, public homepage mapping, and Nic-Nac
  `update_site_setting` tool. Kept the broader Site tagline separate. Renamed
  the skin's visible label to Gnome Forest while retaining `gnome_garden`,
  GG-01, and legacy aliases.
- Verification passed: focused 248/248, standard 239/239, Amethyst 90/90,
  localhost customer-link checks, production TypeScript/build, and Vercel
  production build. Live IAB checks confirmed Kim's exact hero copy on desktop
  and 390px mobile, preserved About/media/links/signup content, working
  `/trade`, and the existing `/join` 404. No form was submitted.
- Pushed `a4e4b196524f2b9c6379e66a1e3e37f6891ee0d2`, applied additive migration
  `20260905110000`, and released Ready
  `dpl_GVnxy1rm8MXCBKaaEwBL3mdeLkSB`. Direct hostname inspection confirmed the
  two Suite domains, Kim's domain, and all other currently configured project
  aliases resolve to that exact production deployment.
- The protected reviewer token was absent from local configuration. Signed-in
  Site Settings smoke stopped without extracting secrets or using Louis's or a
  customer's account. Rendered component, route/service, Nic-Nac tool, public
  site, and production checks are complete; authenticated click-through remains
  a separate token-gated review item. Preserved untracked `artifacts/` and
  `test-results/`.

## September 5, 2026 - Gnome Garden implementation, art correction, and release

- Implemented GG-01 through preset registry, Site Settings/Nic-Nac aliases,
  additive database constraint, shared customer runtime, skin browse card and
  fixture-only preview. Independent runtime and release reviewers checked
  behavior preservation, safety, contrast, compilation and tests.
- Louis corrected art direction mid-review; replaced the mismatched character
  with assets adapted from the approved second Kim flyer. Verified genuine
  alpha, balanced desktop/mobile layouts, readable event notes and form fields,
  explicit firefly indices, reduced-motion rules, and working Pause/Resume.
- Checks: 237 standard tests, 90 Amethyst QA tests, 70 final safety/runtime
  tests and 120 expanded runtime/template tests passed. Production build
  passed locally and on Vercel. After restoring Stripe22.0.1 to the unchanged
  lockfile, standalone tsc retains139 existing test-fixture diagnostics only.
  Broader focused run retained one unchanged SEO wording expectation failure.
- Committed/pushed `b8ba7192` and final preview consistency tip `91006159`.
  First held build `dpl_CBNuQRJ53BFnfkojB4ug7DMwiJj7` was superseded before
  Suite aliases moved. Final Ready `dpl_H8hrUjuRWuxctxaSc8YCHssapiGv` /
  `sparkle-suite-9oy6nt8zr-louis-2849s-projects.vercel.app` serves both Suite
  hostnames by direct inspection. Prior Suite build remains preserved.
- Migration20260905090000 applied; history aligned. Kim and Heather domains
  remain `dpl_2NtndCcTJgt34cz8ioxj1DxLXG4D`. No account, customer selection,
  billing, DNS, email, message, provider or live inventory mutation occurred.
- Live in-app fixture walkthrough verified all four pages, artwork and pause,
  and synthetic submission denial. Health API/database true, recent error rate0,
  no runtime errors in post-release scan; root stayed stable, apex307 to www,
  Settings GET401 and public /start did not expose protected reviewer controls.
  Signed-in Settings/Nic-Nac was not claimed without the protected token.
- Removed the explicitly rejected non-final `/email-signature-image` route
  per the existing vault release guard; live now404 and source recoverable in
  Git. No Gmail signature or customer draft was edited. Preserved untracked
  artifacts/ and test-results/. Actual Open Brain design/release captures
  succeeded and were retrieved for verification.

## September 4, 2026 - Live Calendar / Nic-Nac video published

- With Louis's explicit confirmation, published the Video resource **Live
  Calendar Demo: Nic-Nac in Action** to the live Sparkle Suite Resource
  Library. It links to `https://youtu.be/Zz6SD0Ydc64` and uses Louis's
  approved, plain-language overview of the Live Event Calendar and Nic-Nac.
- The live Control Center publisher visibly confirmed: “Published to the
  Resource Library and notified reps in Message Center,” and the durable
  published-resource list shows the new Video as Version 1. This was a
  content publication only: no application code, deployment, domain, account,
  billing, or customer data changed.

## September 4, 2026 - Reusable Sparkle Suite media skill created

- Generated three Sparkle Suite YouTube thumbnail directions for Louis's live
  calendar/Nic-Nac demo. Louis selected the light `NIC-NAC + LIVE CALENDAR`
  direction and approved the refined version with the full pink S seal and
  pink outline.
- Exported an exact 3840x2160 PNG and a 3840x2160 JPG. The JPG is 797,799 bytes,
  keeping it below YouTube's stricter 2 MB mobile upload limit while preserving
  the recommended 16:9 delivery size.
- Created `.agents/skills/sparkle-suite-media-creative/` for future YouTube
  thumbnails, TikTok/YouTube Shorts covers and first frames, poster frames,
  title/end cards, overlays, and supporting video artwork. Bundled the approved
  thumbnail, YouTube avatar, canonical SVG seal, visual-system reference, and
  a reusable exact-size export helper.
- A real helper export test produced a 1280x720 JPG, and the official skill
  validator returned `Skill is valid!`. No media was uploaded or published,
  and no application code, customer data, account, domain, or production state
  changed.

## September 4, 2026 - Customer show-card notes released

- Traced the calendar description through Nic-Nac, `calendar_events`, the
  homepage API/bootstrap, and the browser payload. The missing step was only
  the shared customer-card renderer.
- Added a polished semantic note inset to the shared Amethyst event card,
  omitted empty descriptions, prevented fallback-title duplication, and
  cache-busted both the homepage CSS and JSX. Added focused renderer coverage
  and repaired the public-slug route test's stale mock for the already-existing
  two-flag Join visibility check; no Join behavior changed.
- Verification: 105 focused tests, 233 standard tests, 90 Amethyst QA tests and
  local link checks, JSX parse, local and Vercel builds, desktop/mobile visual
  review, raw deployment checks, and live public reviewer rendering passed.
  The broader exploratory run passed 3,269 tests with one skip and retained 11
  unrelated baseline failures; repository-wide `tsc` likewise retained
  unrelated test-fixture errors.
- Pushed application commit `172156ca6928570eec1c95231d119fb1c59b569a`
  and released it with `--skip-domain` as Ready deployment
  `dpl_gZvC4uneKHzk7CtmctUaz7MzTdYQ`. Assigned only the two Suite aliases;
  direct hostname inspection confirmed Kim and Heather remain on
  `dpl_2NtndCcTJgt34cz8ioxj1DxLXG4D`.
- Live checks passed for root stability, apex 307 canonicalization, the
  cache-busted homepage assets, safe reviewer show descriptions, Mile High
  Fizz HTTP 200, and Nic-Nac API/database health. Lindsey currently has no
  upcoming events, so no tenant-specific event card was available without
  mutating production data. No account, calendar, customer-domain, DNS,
  billing, email, or message mutation occurred. Matching Open Brain capture
  succeeded.

## September 4, 2026 - Rocky Team Management and onboarding hardening implemented

- Re-audited interrupted work with independent security and product reviewers,
  then corrected token-rotation ordering, arbitrary base paths, rotating-token
  rate-limit evasion, bespoke Join overclaims, null visibility gating,
  business/team conflation, and incomplete reviewer reset documentation.
- Final local evidence: standard `npm test` passed 233 tests; the focused Team
  Management/onboarding/Join/reviewer set passed 325 tests; Amethyst QA passed
  89 tests plus local link checks; the rep-onboarding static smoke and production
  build passed; the full Next.js production build and TypeScript phase passed.
- The rebuilt generic Join page was opened in the installed Codex in-app browser,
  visually inspected, and its **Learn more** anchor verified. The rendered FAQ,
  promo, support, cost, and income copy no longer makes the rejected claims.
- This remains PR-only. No production deployment or external/customer mutation
  was performed. The manual approved ChatGPT Sites provision/configuration hook
  is documented for later owner-authorized release work.
- Commit `24af13be` was pushed to the sole allowlisted/default branch. GitHub
  cannot form a meaningful PR from that branch into itself, while `main` is a
  quarantined legacy line (the compare view showed 1,159 commits and 1,754
  files). No misleading legacy-target PR or unallowlisted branch was created.
- Louis then authorized commit, push, and deployment. Exact pushed tip
  `d381674b` was manually built with domain movement disabled and released as
  Ready Vercel deployment `dpl_41Jc3DrqWyni4EUtYuNnGp9LRYxt`. Direct raw
  checks passed before only `www.yoursparklesuite.com` and
  `yoursparklesuite.com` were assigned.
- Both Suite aliases resolve to that deployment; the apex canonicalizes to
  `www` and the landing page remained stable. Root, public Join, and Nic-Nac
  health returned 200. Live browser QA confirmed the hardened Join copy and
  Learn more anchor. Missing-invite onboarding returned 400 and unauthenticated
  Team Management returned 401. Kim's `goforthebling.com` stayed on
  `dpl_2NtndCcTJgt34cz8ioxj1DxLXG4D`.
- Production reviewer variables exist, but the clean browser session did not
  possess the protected token. Signed-in Team Management UI was therefore not
  claimed as live-verified; no personal/customer account or extracted secret
  was used. The pre-existing non-final signature route was already present in
  the prior 12:09 deployment; this release did not edit Gmail or drafts and
  does not make the signature work approved.
- OpenBrain capture was completed and verified after release with four durable
  entries: implementation/provenance, architecture decisions, production
  lessons, and the remaining private-onboarding/reviewer/signature follow-ups.

## September 4, 2026 - Gmail identity/signature attempt closed as incomplete

- Configured and reviewed Gmail brand-signature work for
  `louis@neonrabbit.net`. Louis rejected the final visual quality. This is
  incomplete work, not a release or handoff.
- Lesson: Compose-level visual validation must use approved source material and
  must catch clipping, sizing, alignment, and contrast; do not infer success
  from public asset availability or Gmail Settings state.
- No email was sent and no customer draft was changed. Open Brain capture was
  completed with the same lesson and follow-up requirement.

## September 4, 2026 - Email-draft handoff and signature-asset correction

- Created two requested Sparkle Suite waitlist follow-up Gmail drafts only; both
  remain unsent. The actual lead selection was read-only and consent-aware.
  Recipient identities and draft contents are intentionally not recorded here.
- Louis rejected the attempted signature graphic. It was an agent-made
  approximation and did not match the familiar Sparkle Suite `S` seal. The
  drafts must be handed to the designated mail owner for review/replacement;
  do not send them.
- Added a tentative email-signature route and `sparkle-suite-email` skill in
  commit `6e5a553e`, after a successful local production build. The commit is
  pushed but **not deployed**: Vercel CLI authorization failed and the connected
  deploy action could not start. No production alias, customer domain, billing,
  customer data, or outbound communication changed.
- Do not deploy the tentative signature route. It needs replacement or removal
  after the canonical Sparkle Suite email-logo export is located and visually
  validated in a real Gmail draft.

## September 3, 2026 - Customer-site search launch standard

- Added the checkbox-only Control Center onboarding item **Make their site easy
  to find**, and updated the `sparkle-suite-rep-welcome-site` onboarding skill
  plus its package reference. It requires tenant-correct canonical metadata,
  favicon/share card, `robots.txt`, `sitemap.xml`, `llms.txt`, and structured
  data before any Google or Bing submission. No search-provider submission was
  made.
- Customer domains now receive request-aware crawl files from the app. Verified
  `theblingkitchen.com` now publishes Heather/BlingKitchen in `llms.txt`, a
  sitemap with `/`, `/trade`, `/join`, and `/in-the-pantry`, and `robots.txt`
  pointing to that same domain sitemap.
- A production audit found two stale Vercel project routing rules, **SEO
  sitemap.xml** and **SEO robots.txt**, rewriting to the static
  `sparkle-suite-seo-files.vercel.app`. Removed and published only those two
  rules after the request-aware handlers were deployed; no other project routes
  remain. Focused tests passed (18); production build passed. Final commit
  `35b4c6ec` was pushed. Both Suite aliases and Heather's verified Bling
  Kitchen aliases resolve to Ready deployment `dpl_GnUkogcsVaTSwQE86wuUNArAJGE4`.
- Read-only audit confirmed `milehighfizz.com` and `brittwithbling.com` are
  independently hosted legacy sites, not Sparkle Suite aliases. Do not migrate
  or replace either domain without Louis's separate explicit authorization.

## September 3, 2026 - Lane actuals added to the Control Center home

- Connected the Control Center home’s Actual revenue collected and Actual
  expenses paid cards to Lane's aggregate current-month accounting snapshot,
  alongside the existing projected revenue card. All three use the same
  integer-cent display formatting and no client-plan fallback.
- Null accounting fields stay visibly unavailable, preserving the distinction
  between no reported actual and `$0.00`. No books, money movement, customer,
  provider, MCP, or schema state changed.
- Focused Control Center tests passed (30 tests), changed-file lint and the
  production build passed. Commit `92f882a8` was manually released as Ready
  deployment `dpl_DkbtvrvJp3EZM7pJz4ki9XNmXWuz`; both Suite aliases resolve to
  it. Kim's custom domain remains on `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH`.

---

## September 3, 2026 - Lane snapshot promoted to Control Center home metric

- Replaced the Control Center home's projected-monthly-revenue client-list
  calculation with the exact current-month Suite accounting snapshot supplied
  by Lane. `projected_recurring_cents` is formatted in cents, so the current
  `12799` snapshot renders as `$127.99` both inside Accounting and on the
  Control Center home.
- No fallback remains: an unavailable Lane snapshot renders `Not connected
  yet` rather than a plan-price total. No accounting, billing, payment,
  provider, MCP, or schema state changed.
- Focused Control Center tests passed (30 tests), changed-file lint and the
  production build passed. Commit `5894f97b` was pushed and manually released
  as Ready deployment `dpl_3WBVWNBdcpr26zjrGtDdj43vnx4M`; both Suite aliases
  resolve to it and Kim's custom domain remains on
  `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH`. Live authenticated visual review remains
  pending a safe reviewer session; no personal account was used.

---

## September 2, 2026 - Session memory reconciliation

- Reconciled the completed Terra release against Open Brain and all four vault
  files. The final application release is `2a1e5ad1`; the documented closeout
  is committed in `824dc6d`. Both are pushed on the allowlisted branch.
- Added the reusable provenance lesson: inspect each hostname directly after a
  held-domain Vercel release because a deployment alias list may be stale.
- Added the reviewer-cleanup lesson: retain app-owned confirmation, explicit
  owner scope, and a reload-based persistence check even for synthetic data.

---

## September 2, 2026 - Terra production release and live reviewer closeout

- Pushed application `2a1e5ad1`, manually deployed Ready
  `dpl_AvHkaLxN2UAvA91wK6qjDNLjGsZ1`, and directly verified both Suite domain
  targets. Protected customer www domains remained on the previous deployment.
- Chrome synthetic reviewer sign-in worked using the repaired secret. Verified
  live Calendar read, one-time add with correct timezone/discount/collection,
  saved Calendar details, and fresh synthetic customer-site next-two-shows
  display. Cost dashboard Refresh confirmed actual Terra medium usage.
- User separately approved cancellation of only the test event after a safety
  gate held cleanup. The app's confirmation UI was honored; reload showed the
  cancelled test entry and two unchanged seeded shows. Cancellation history
  remains recoverable; no real customer data or provider messages were changed.
- Four live run IDs, token counts, and replay caveats are in the migration
  evidence document. Total conservative estimate is $1.05 ($0.95 temporary-key
  tests plus $0.10 live tests); temporary key was revoked and existing keys
  preserved. Root/apex stability, protected reviewer gating and API/DB health
  passed. No error logs found. No scheduled canary or unrelated cleanup.

---

## September 2, 2026 - Authorized Terra tests and reviewer-token repair

- Completed real GPT-5.4/Terra comparative synthetic tests with zero business
  mutations, 74 provider requests, and 95 cents conservative estimated spend
  under Louis's $3 cap. Revoked only the temporary restricted Suite key;
  confirmed the production runtime key still active.
- Fixed two model-independent contract gaps revealed by replay: implicit
  Responses strictness forced optional recurrence, and unvalidated timestamps
  could omit UTC offsets. Optionality is now explicit and add/update schemas
  reject ambiguous timestamps before execution. Final Terra Calendar and
  approval replay passed; earlier failures and literal phrase false positives
  remain in private evidence, not silently regraded as clean passes.
- Repaired only the approved reviewer secret and changed only Suite's default
  model environment override. Finder/reporting policies are kept separate.
  A broad production-env export was blocked; no workaround or credential
  substitution was used. Continue via the supported synthetic reviewer UI.
- Final checks: 1,312 passed / one existing skip, changed-file lint, provider-
  free safety smoke, full production build. Production release pending.

---

## September 2, 2026 - Same-day Terra migration preparation

- Verified repo/remote/allowlisted branch at HEAD `d25dbd8c`, current Suite
  production deployment `dpl_3jf6qWNJJKJgibFJZrCbnMgeMzWm`, and both Suite
  aliases. Customer-domain aliases were inspected but not moved.
- Prepared `gpt-5.6-terra` medium as human-default, retained all other tiers
  and GPT-5.4 rollback pricing, added Terra cache-write-aware estimates, and
  updated only the AI SDK 6-compatible OpenAI adapter to `3.0.106`.
- Passed 1,296 Nic-Nac tests with one existing skip, 228 standard tests,
  focused policy/cost/telemetry tests, provider-free architecture smoke,
  changed-file lint, diff checks, and the complete Next.js production build.
- Vercel's production export substitutes placeholders for write-only secrets,
  so the current Suite runtime key cannot be used by the local paid replay
  runner. Removed the temporary export. No old key or personal/customer
  account was substituted. Need authorization for a temporary restricted
  Suite test key and a capped synthetic replay budget before proceeding.
- Changes remain local/uncommitted; no production model/env change, paid API
  call, deployment, billing, customer mutation, messaging, DNS, scheduled
  canary, or cleanup of existing OpenAI projects/keys occurred.

---

## September 2, 2026 - Nic-Nac release session closeout

- Louis reports the first internal-demo smoke tests are going well and Nic-Nac
  is in a much better place. He intends to push the agent harder, so this is a
  positive early result rather than a claim that every future live-show request
  is proven.
- Key lesson: code may be correct while production is wrong if a hidden route,
  feature gate, alias, or identity selection points users somewhere else.
  Production proof must establish the actual route used by a real request, not
  merely that the intended code was built and deployed.
- Key lesson: conversational flexibility belongs with the model selecting from
  a permission-scoped tool catalog. Deterministic code should protect
  authentication, tenant boundaries, schemas, approvals, idempotency, bounded
  retries, and truthful recovery—not pre-decide the rep's intent from wording.
- Key lesson: an empty successful model turn needs a general, safe execution
  boundary. Retry once only before a tool starts; after a tool starts, preserve
  tool-result recovery and never replay a possible write.
- Open Brain and repository vault were both updated and verified. No additional
  deployment, paid model request, customer action, billing, messaging, DNS,
  customer-domain, or Live Queue mutation occurred during closeout.

---

## September 1, 2026 - Sole-agent Nic-Nac production cutover

- Confirmed the deployed ToolLoopAgent was still hidden behind a production-
  default-off switch, which silently sent Louis to the legacy route. Removed
  the switch, deleted the legacy handler, and added a structural regression
  proving there is one production orchestrator and it is `agent`.
- Added one bounded retry for a completely blank successful turn before any
  tool starts. Tool-started turns never retry, preventing duplicate writes.
- Verification passed 37 focused route/stream/production-path tests, 1,294
  Nic-Nac tests with one skip, 228 standard tests, provider-free architecture
  smoke, changed-file ESLint, diff checks, and local plus Vercel production
  builds. No paid model request ran.
- Committed and pushed exact application commit `564223ac`, then manually
  deployed it with all domains held as Ready deployment
  `dpl_3GEo2haLjRbgkiUCqapMzWHk6Bdo` /
  `sparkle-suite-6vppehzbk-louis-2849s-projects.vercel.app`.
- Held and live checks passed for root, `/nic-nac`, health, and the explicit
  `X-Nic-Nac-Orchestrator: agent` response header. Assigned only the two Suite
  domains; apex canonicalized to `www`, protected customer domains stayed on
  `dpl_2qiLozydCs16rXufFNbqttMvfDWz`, and no new error logs appeared.

---

## September 1, 2026 - Live Calendar empty-turn incident and release

- Investigated Louis's screenshot without sending another paid Nic-Nac
  request. Production telemetry identified two complete legacy-route runs with
  zero input/output tokens, no tool calls, and the hard-coded empty-response
  recovery. No 429, quota, or insufficient-credit signal was present.
- Confirmed `Whats on my calendar` missed the apostrophe-sensitive Calendar
  read recognizer, leaving the legacy 48-tool catalog on automatic selection.
  The provider's known zero-output edge then left no tool result for the
  existing Calendar summarizer.
- Made natural `What's`/`What’s`/`Whats` and `When's`/`Whens` Calendar reads
  equivalent. Added a read-only last-line recovery to both stream paths that
  directly reads and summarizes the rep's Calendar only after a zero-visible-
  output/no-result turn. Mutations do not enter it; failures are honest and
  telemetry records the recovery attempt.
- Verification: 91 focused tests, 228 standard tests, 112 agent/routing/
  workflow tests, changed-file ESLint, diff checks, and local/remote production
  builds passed. Repository-wide `tsc --noEmit` retained only the known
  unrelated test-fixture backlog.
- Committed and pushed `47275feb`, then manually deployed that exact tip with
  domains held as Ready deployment `dpl_9WJxru6eyyX6A4KQCrZrkuov7QRK` /
  `sparkle-suite-dclumf6r2-louis-2849s-projects.vercel.app`. Direct held-target
  checks passed before alias movement.
- Assigned only `www.yoursparklesuite.com` and `yoursparklesuite.com`. Live
  root/apex and `/nic-nac` returned 200, health reported API/database green and
  zero recent errors, and no new error-level logs were present. The four
  Bri/Bling Kitchen aliases stayed on `dpl_2qiLozydCs16rXufFNbqttMvfDWz`.
- The current in-app browser runtime connected, but exposed no claimable tab;
  no duplicate tab was created and no inherited signed-in session was used.
  No paid model request, cohort, customer, billing, messaging, DNS, customer-
  domain, or Live Queue action occurred.

---

## September 1, 2026 - Dex-reviewed Nic-Nac corrections

- Converted unfinished Calendar, Dance Floor, and trade continuity to neutral
  collected/missing facts with no “continue this job,” active-status, or resume
  language in the model-facing JSON.
- Stopped vague turns from falling into the most recently updated workflow on
  the new harness while preserving direct answers to Nic-Nac's preceding
  clarification question.
- Made ToolLoopAgent `add_show` arguments authoritative and added the exact
  Calendar-empty → request show → ask platform → TikTok → add-show regression.
  The old empty-read answer does not repeat, and the earlier time, discount,
  and Bunny Ears facts survive the clarification.
- Excluded direct SMS/email sends from the default harness rather than adding
  a wording router; left the six-step default unchanged after the exact replay
  completed within the bound. The legacy route remains available and unchanged.
- Verification: 75/75 focused tests; 32/32 critical tests on three consecutive
  runs (96/96); 1,396 Nic-Nac tests with one existing skip; 228/228 standard
  tests; provider-free smoke with 53 registered/45 agent tools and zero paid
  calls; changed-file ESLint; `git diff --check`; and the production build.
- Louis then authorized production release. Exact pushed commit `4d96111e` was
  manually deployed as Ready deployment `dpl_FksLyVKFHSgPUZH5w19sWYhRcDpf`.
  Both Suite domains resolve to it; the landing page stayed on the live URL,
  the apex redirected to `www`, `/nic-nac` returned 200, and
  `/api/nic-nac/health` returned API/database healthy.
- Because customer domains share the Vercel project, deployment used
  `--skip-domain` and moved only the two Suite domains. Bri's Glowtique and The
  Bling Kitchen remained on the prior deployment. Production has no Nic-Nac
  harness broad-enable or exact-cohort variable, so deployment did not enable
  the new path for reps.
- The current browser runtime and exact target preflight succeeded. The live
  protected `/start` controls remained token-gated, and an inherited
  authenticated session was left untouched rather than used for reviewer
  evidence. No paid Nic-Nac request, reviewer reset, customer/billing/message,
  DNS/customer-domain, or Live Queue mutation occurred.

---

## September 1, 2026 - Nic-Nac adversarial harness hardening

- Closed the approval-integrity gap by matching every approval response to the
  exact final canonical server-issued request and resuming the actual agent
  loop after approval. Removed the manual canned-success continuation and
  proved old approvals do not replay on later turns.
- Removed the legacy regex Calendar resolver from the new agent catalog while
  leaving the default production legacy route unchanged. Retired the unused
  scripted task reducer and its test-only state machine.
- Bounded and labeled recoverable workflow facts as untrusted data, made
  optional continuity reads degrade safely, and stopped passive replies from
  being ingested into every active workflow.
- Added conditional approval to recipe/team-member removal and guarded show
  session replacement with idempotent same-anchor reuse, exact active-session
  matching, and visible approval. Provider failures before iterator creation
  now receive the normal failure handling.
- Verification: 92/92 focused tests; 1,390 Nic-Nac tests with one existing
  skip across 171 files; 226/226 standard tests; 17/17 critical route tests on
  three consecutive runs (51/51); provider-free smoke with 53 registered and
  47 agent tools, zero findings, and zero paid calls; changed-file ESLint;
  `git diff --check`; and the Next.js production build. No deployment, cohort,
  paid replay, customer, billing, DNS, domain, alias, or Live Queue change was
  made.

---

## September 1, 2026 - Nic-Nac completion audit and task continuity

- Wired durable Calendar, Dance Floor, and trade transaction facts into the
  new agent harness as bounded recoverable context. The latest request still
  defines the current task; old records never force a tool. Reused preloaded
  sessions to avoid duplicate reads.
- Capability-scoped continuity for disclosed Support so unauthorized workflow
  domains are neither queried nor disclosed. Added regression coverage for a
  Calendar-only Support session receiving a Dance Floor question.
- Removed Calendar/Dance Floor tool-description overlap, added explicit
  read-then-write guidance, and added a recorded four-turn agent-loop replay
  that switches across Calendar, Dance Floor, grounded guidance, and back to a
  Calendar write with `toolChoice: auto` throughout.
- Added six/eight step, 1,600-token, one-retry, and 75/35/25-second timeout
  bounds. Final verification passed 1,388 Nic-Nac tests with one existing skip,
  226 standard tests, 42/42 consecutive critical route replays, provider-free
  smoke with zero paid calls, changed-file ESLint, diff checks, and the full
  production build. Production remains default-off; no paid replay, cohort,
  customer, billing, DNS, Live Queue, or scheduled-canary action occurred.

---

## September 1, 2026 - Nic-Nac Support identity, Kim About update, and domain-access handoff

- Provisioned and released a distinct Nic-Nac Support operator identity after
  Louis approved a dedicated accountable support actor. Its customer-site-only
  authorization boundary was implemented in `e334f144` and corrected in
  `1215171c`; 15 focused authorization tests and the production build passed.
  It has no billing, Stripe, account-control, or owner authority.
- Published Kim's approved, concise About copy through disclosed support,
  visually verified the customer-facing result, explicitly ended support, and
  marked the related durable Control Center Task List item complete.
- Accepted the delegated Namecheap manager invitation for Kim's domain. The
  delegated account can view the domain but Advanced DNS / Host Records is
  denied. A plain-English request for that one permission was drafted and
  Louis sent it. No DNS, nameserver, ownership, contact, billing, or customer
  site-domain database change occurred.
- Handoff: wait for Kim's access update. Before continuing, inspect Vercel's
  domain state because the earlier attachment attempt produced no verifiable
  CLI result; then inspect existing DNS and apply only required records. Use
  an exact guarded customer-domain update with an audit entry, and prove the
  custom-domain root and `/trade` route live before calling the migration
  complete. Do not record customer contact information or credentials.

---

## September 1, 2026 - Control Center Task List priorities and requested work queue

- Added the four-level durable priority model (Urgent, High, Medium, Low) to
  the Control Center Task List. New and promoted tasks can select a priority;
  every task card can change it later; open work can be filtered by priority
  and recent update date and is ordered by priority then most recent update.
- Applied migration `20260901130000_ss_task_list_priorities.sql`, committed
  and pushed `ac34ed20` (`feat: add Control Center task priorities`), and
  manually deployed Vercel production deployment
  `dpl_6iqYbBit4g6k5GJRq4cy7x9EAh61`. Both required Sparkle Suite domains
  resolve to that exact Ready deployment.
- Focused Task List and Control Center tests passed (17 tests), as did
  selected-file ESLint and the Vercel/local production builds. Live Control
  Center UI verification confirmed the priority picker, priority/date filters,
  per-task priority controls, and all five requested private tasks.
- Creating the entries did not inspect or mutate Kim's Stripe state, send an
  email, contact Ready AI, change Lindsey's domain/DNS/SSL state, or run a
  Nic-Nac smoke test. Those are work items recorded in the live Task List.

---

## September 1, 2026 - Nic-Nac and transparent-support reliability closeout

- Consolidated this session's reliability work. The detailed August 31
  Nic-Nac records below document the blank-response and stale-workflow fixes:
  a workflow is not complete without customer-visible text, resolver-only
  completions receive deterministic recovery copy, and an explicit product
  request must outrank stale durable workflow state. Focused suites, replay,
  pressure coverage, production builds, and live reviewer replays were used
  for those releases.
- The later disappearing-draft report was a separate support-shell lifecycle
  fault, not a Nic-Nac model regression: the support expiry clock recreated
  context and remounted the composer. Commit
  `62d895b77d6455b5cdcc87b4396718888f7d8341` stabilized those boundaries and
  the disclosed live replay retained unsent text across clock ticks.
- Louis then rejected time-limited transparent support. Commit
  `4a6c2e7875266b2de7a86bb1ad44f3fc21cda637` and migration `20260901120000`
  made support operator-controlled until explicit end while retaining the
  existing identity, capability, CSRF, notice, and audit safeguards. No
  customer, billing, DNS, onboarding, or Stripe state was changed.
- Key operating lesson: smoke the full composed surface—not only the agent
  service—with sustained unsent input, stale workflow transitions, and
  customer-visible response assertions. The remaining follow-up is the
  scheduled isolated cross-workflow Nic-Nac canary; it is recorded as open and
  must not be implemented without Louis's authorization.

---

## September 1, 2026 - Removed the transparent-support time limit

- Louis rejected the fixed support timer because real support work may span a
  lengthy session with navigation between tasks. Audited the complete expiry
  chain rather than hiding the label: client clock and expired screen, server
  access verification, creation duration, recurring expiration worker,
  database expiry constraint/RPC/audit guard, history copy, disclosure copy,
  and the one-hour support CSRF cookie.
- Implemented explicit operator closeout in commit
  `4a6c2e7875266b2de7a86bb1ad44f3fc21cda637`. New sessions store no expiry,
  automatic expiration is a no-op, active authorization is status-based, the
  support banner/history explain that access stays open until ended, and the
  credential is retained for long-running work but still cleared by the
  existing end route.
- Applied production migration `20260901120000`. Read-only verification showed
  the expiry constraint removed, `expires_at` nullable, automatic expiry
  disabled, and the existing single active session still active. Historical
  closed-session timestamps/statuses remain intact.
- Verification passed 78 focused operator-support tests, final focused reruns,
  selected-file ESLint, two local production builds, Vercel's production
  build, migration dry run/apply/contract inspection, alias inspection, and
  HTTP/browser health on the exact live Control Center login route. Released
  deployment `dpl_EoMkRyRt8Q17bAv93iDFqS9cNr8t`; both Sparkle Suite domains
  resolve to it. Authenticated visual replay was intentionally not performed
  because only Louis's operator login was available and no customer or admin
  account may be used as a reviewer substitute.

---

## August 31, 2026 - Nic-Nac support-mode composer stability release

- Reproduced Louis's report in Lindsey's live disclosed support session using
  harmless unsent text. Before the fix, the draft cleared on the next
  15-second support expiration-clock tick. Normal demo-account use outside
  support mode remained healthy.
- Root cause was client state identity, not the Nic-Nac model or the Codex
  desktop browser: `SupportWorkspaceClient` recreated the support context on
  each clock render, while `NicNacClient` conversation effects depended on
  that object and reinitialized history, remounting the composer.
- Fixed both boundaries in commit
  `62d895b77d6455b5cdcc87b4396718888f7d8341`: memoized the parent support
  context and narrowed child effect dependencies to the primitive session ID
  and support-mode boolean. Added a regression contract for clock rerenders.
- Verification passed 27 focused tests, selected-file ESLint, local production
  build, Vercel production build, exact alias inspection, and a 36-second live
  draft-retention replay across multiple clock ticks. Released deployment
  `dpl_5ndTgTj4NxhcF6NNz7Fbd7yuJqcD`; no message was sent and no customer,
  billing, DNS, or onboarding state changed.

---

## August 31, 2026 - Team-branded onboarding link foundation

- Chose a Sparkle Suite-owned URL pattern for all Team Management onboarding
  links: `onboarding.yoursparklesuite.com/<team-slug>?invite=<opaque-code>`.
  This removes the personal Codex workspace identifier while preserving Codex
  Sites hosting and an opaque per-participant invite.
- Published Codex Sites version 9 from source commit
  `086bc88128f7a84c58a958c50c0eddfa3f73ccef`, adding the route that accepts a
  team slug. The existing legacy host remains live for current invitations.
- Application commit `4913f93a35a703cf4b029b58815e3800bc7c7d33` was committed
  and pushed. It derives the managed team server-side, produces the branded
  path, rejects arbitrary client base URLs, and allows both old and new Site
  origins for the private-token API.
- Focused application tests, application production build, Site lint, Site
  production build, and Site render tests passed. Codex Sites accepted the
  custom hostname; activation remains blocked only on adding its verification
  and CNAME records at GoDaddy. The main application was intentionally not
  deployed before DNS activation so no live Workspace creates a broken link.

---

## August 31, 2026 - Brittany team-information onboarding follow-up

- Replaced the redundant **Quick check** and **Do this** areas in all six
  onboarding steps with one straightforward action list. The first step now
  specifically asks for a current permission-cleared photo, email, phone,
  TikTok and other intended-public social links, state, and correct personal /
  show names so Brittany can welcome the rep and prepare the public Join Team
  card accurately.
- Committed and pushed Sites source
  `ec82456a2e0f492520139649acf4fa308ad89fb5`, then published version 8 as
  deployment `appgdep_6a95bf816d308191b345a2925c41abad`. ESLint, production
  build, focused render tests, local visual QA, and the production missing-link
  guard smoke passed. No private invite, participant progress, or message was
  changed.

---

## August 31, 2026 - Brittany onboarding simplification and Nic-Nac expansion

- Reworked the standalone onboarding Site around one expandable six-step
  journey so a new rep sees a simple starting path without losing the detailed
  checks, actions, rationale, progress tracking, supply links, official
  resources, or private Ask Brittany thread.
- Implemented all nine annotations: plain welcome and section copy; removed the
  six help-request controls, duplicate Detailed Guide, source-hierarchy block,
  backend/history wording, and suggested-question chips; grouped the 12 supply
  cards under three collapsed headings; and added prominent Ask Nic-Nac-first
  guidance in both the path and Brittany sections.
- Expanded curated Nic-Nac answers using current official Bomb Party shipping,
  return, customer-replacement, and 2025 income-disclosure material. He now
  handles common BPU, payout-safety, setup, supplies, shipping, returns,
  customer-care, privacy, and income-claim questions; refuses private account
  details; and prepares unknown questions for deliberate review instead of
  sending them.
- Committed and pushed Sites source
  `a8d746a6e4e132798495fcfb6b9e6ba82e316e99`, saved version 7, and published
  deployment `appgdep_6a95af5857a88191aa500cf3a6d54173` at the stable Site
  URL. ESLint, production build, two focused tests, desktop/mobile visual QA,
  guided-answer/privacy/handoff interaction checks, and a live missing-link
  guard smoke passed. The private invite was not recorded or changed, and no
  participant progress or message was submitted.

---

## August 31, 2026 - Brittany onboarding helper and supply binder restoration

- Restored the two historical onboarding features Louis remembered: the
  floating Nic-Nac question helper and the detailed supply resource list. The
  current six-step flow, durable progress IDs, and private Ask Brittany thread
  remain intact.
- Implemented Nic-Nac as bounded guide retrieval with six quick questions and
  one prompt on every step. Known questions receive curated guide answers;
  unknown or sensitive questions are copied into the existing Ask Brittany
  composer for the participant to review and deliberately send. No AI call,
  background message, or automatic escalation occurs.
- Restored all 12 saved historical Amazon examples and organized them by setup
  timing. Buying guardrails identify them as comparison links rather than a
  required cart, encourage reuse of suitable supplies, and require confirmation
  before uncertain or expensive purchases. Amazon blocked most automated page
  reads, so the release does not claim every saved listing is currently active.
- Committed and pushed Sites source
  `e109ed8d1669d2e8df4eb10b9bac4d668ebb6ed8`, published Sites version 6 as
  deployment `appgdep_6a955f2f54288191a07660c617eda53a`, and confirmed the
  stable live Site renders 12 supply cards, 12 links, six step prompts, and the
  helper. ESLint, production build, focused tests, local interaction smoke, and
  live read-only smoke passed. No participant progress or Brittany message was
  changed, and the main Sparkle Suite app was not deployed.

---

## August 31, 2026 - Brittany onboarding guide content restoration

- Audited all four published Sites versions and the richer historical
  `apps/rep-onboarding` materials after Louis reported that the clean current
  guide had lost useful depth. The published versions themselves were all
  similarly brief; the substantive source material lived in the archived app
  data and design notes.
- Rebuilt the current Site without replacing its six-step flow or durable
  progress IDs. Each step now expands into an at-a-glance summary, concrete
  actions, rationale, and a clear **Ask Brittany when** boundary. Added the
  official-source hierarchy, realistic startup guardrails, six official
  resource links, and retained the private Brittany question thread.
- Removed ambiguity around aging advice: historical Ship.com pricing and the
  older 15-point/free-original loyalty example are explicitly examples to
  confirm with Brittany, not current promises. No unnecessary-purchase links,
  copied private media, credentials, or invite URLs were added.
- Published Sites version 5 from source commit
  `21598f8ea5441739c8c846733d7108fb1f0366d0` at the existing stable Site URL.
  ESLint, production build, two focused render tests, desktop/mobile visual QA,
  and read-only live invite smoke passed. No participant progress or message
  was changed, and the main Sparkle Suite app was not deployed.

---

## August 30, 2026 - Beverly public roster portrait correction

- Diagnosed Beverly's visibly tilted Britt with Bling Join Team portrait as a
  single saved `object-left rotate-left` class, not a changed photo asset.
- Removed that class from the source roster and guarded future behavior with a
  focused public-site regression test. The focused test passed.
- Applied one exact production-row update only after confirming Brittany's
  `brittwithbling` rep and Beverly / `Bev with Bling` card identity. It cleared
  only `image_class_name`; no photo, card text, order, or social link changed.
- Application commit `79fff57c32cb5891ba3a83dde93b1fae4f8914c5` was pushed
  and manually released as Ready deployment `dpl_CejZdc34r7VbVzsm4XPWkbwXppS5`.
  Vercel lists both Sparkle Suite aliases on it. Live read-only browser smoke
  confirmed the Beverly card now has `transform: none` and normal centered
  positioning; `www` returned 200 and the apex redirects canonically. The
  local build runner produced its output but did not return its normal final
  summary; Vercel's production build completed Ready. `artifacts/` and
  `test-results/` remain untracked and preserved.

---

## August 30, 2026 - Public Team Cards upload-only correction

- Removed the **Photo URL or saved path** input immediately after Louis noted
  that he authorized file uploads only. Existing stored roster photos are
  unaffected; a new photo can now be set only by the explicit, guarded upload
  workflow.
- Focused UI and upload coverage passed 120 tests; the local and Vercel
  production builds passed. Application commit
  `ec3d72029c3dac2993ad398694d651e2c6a785cc` is live as Ready deployment
  `dpl_89yWuc9jjwr9EHNY4Ha8tB1uojG1`, serving both Sparkle Suite domains.
- Read-only live smoke in Brittany's existing Team Management tab confirmed the
  field is absent, the permission-confirmed upload option is still present,
  and all 27 roster cards remain. No file upload, save, or production data
  change occurred. `artifacts/` and `test-results/` remain untracked and
  preserved.

---

## August 30, 2026 - Public Team Card photo upload release

- Built the approved upload path inside Brittany's existing manual-beta Team
  Management surface without changing its entitlement or roster functions.
  Reps now receive a short three-step process, a per-file confirmation that
  they have permission to publish the team member's photo, a square preview,
  and a reminder to save the card after upload. The URL/path fallback was
  removed in the follow-up upload-only correction.
- Added matching browser/API file guards for JPG, PNG, or WebP at 3 MB or less.
  The smaller ceiling is deliberate because base64 encoding expands the JSON
  request and Vercel Functions reject request bodies over 4.5 MB. The new API
  also rechecks paid Workspace and Team Management access before writing to
  the existing public site media bucket.
- Added the route to the audited transparent-support gateway under
  `team.manage`; upload does not save or publish a roster card by itself.
- Focused verification passed 143 tests, selected-file ESLint, and local plus
  Vercel production builds. Application commit `bece3bb620408be86c06ed201eef8d3f78fabdbd`
  was pushed and manually released as Ready deployment
  `dpl_DhgGyfyyLfLfBL5FZV21doswAr7T`. Both Suite domains resolve to it.
- Read-only live smoke in Brittany's existing workspace confirmed the full
  workflow, disabled upload button before permission confirmation, URL fallback,
  27 unchanged public roster cards, and no browser errors. No file, form,
  roster, invite, message, support session, Live Queue, billing, or customer
  data was changed. `artifacts/` and `test-results/` remain untracked and
  preserved.

---

## August 30, 2026 - Team Management layout polish release

- Preserved every Team Management capability while improving the visual layout:
  team naming and private onboarding-link creation now sit in equal-width,
  equal-height primary panels with aligned actions, and Public Team Cards begins
  directly beneath them. Removed the CSS grid-row span that produced the
  unintentional dead-zone feel; no entitlement, field, action, or roster logic
  changed.
- Pushed application commits `211d42967c49abae2d84499c6bca547ef2a9a8ac` and
  `d9ef0e2a3630e2753cefbf42ed439bd7a4a1e126`; manually released final
  deployment `dpl_9YMGzfC8ceRSrhR1bVVww5DQePDB`. Both Suite domains alias the
  Ready deployment without a DNS change. A read-only live view of Brittany's
  already-open Team Management screen confirmed the paired panels' matching
  532.5px widths and bottom edge, plus all existing controls.
- Focused dashboard coverage passed 115 tests and the local production build
  completed. The reviewer-smoke path was not used because its normal controls
  were unavailable; no alternative account was signed in. No customer or team
  data was changed.

---

## August 30, 2026 - Tight dark ticker label alignment release

- Reduced the dark-skin label column from 170px to 120px, preserving a small
  trailing gap after the label text. Black Diamond and Moonstone use the same
  fixed edge for Announcements and Dance Floor, and the corresponding ticker
  tracks now start at 120px to reclaim the previously unused message space.
- Pushed application commit `c87396d5bed1f22b47987e4239ffeff7ddd2810d` and
  manually released `dpl_AKAFEVeKjn83rhV7pKFmhtTEMUEm`. Both Suite domains
  alias the Ready deployment with no DNS change. Live public browser smoke at
  `/brittwithbling` measured matching 120px label edges, a 120px ticker-track
  offset, solid backgrounds, and no fade.
- Focused homepage coverage passed 43 tests and the local production build
  completed. No authenticated session or customer data was used.

---

## August 30, 2026 - Dark ticker hard-edge alignment release

- Removed the fade treatment from dark-skin ticker labels. Announcements and
  Dance Floor now share a fixed 170px, right-bordered label column so their
  clean stop lines align; Black Diamond retains gold/black and Moonstone
  retains violet/charcoal presentation.
- Pushed application commit `3519c892ddb2931c034e4492541aba4a3ecd0294` and
  manually released `dpl_egkwWXCEsj1SyJ6MJzJjK17RJrE2`. Both Suite domains
  alias the Ready deployment with no DNS change. Live `/brittwithbling` smoke
  measured both label edges at 170px, with solid backgrounds and no fade.
- Focused homepage coverage passed 43 tests and the local production build
  completed. No authenticated session or customer data was used.

---

## August 30, 2026 - Dark ticker label refinement release

- Replaced the plain light announcement label on dark skins with a theme-color
  label: gold/dark ink for Black Diamond and violet/white for Moonstone. The
  light announcement track and dark Dance Floor ticker remain intentionally
  distinct.
- Checked `brittwithbling.com` for source TikTok embeds before making any
  media change. The only two Ready embeds are already live in the matching
  Featured Reveal and What is a Bomb Party sections on Sparkle Suite, so no
  duplicate media was inserted into the generic placeholder cards.
- Pushed application commit `c0599fe647a2b251809b88b16043ce84ad24f054` and
  manually released `dpl_6h82kETr2oTe2pQuZoVdE44i9UFA`. Both Suite domains
  alias the Ready deployment without a DNS change. Live public browser smoke
  confirmed the gold label, light announcement track, and dark Dance Floor row.
- Focused homepage coverage passed 43 tests and the local production build
  completed. No authenticated user session or customer data was used.

---

## August 30, 2026 - Dark customer-site homepage contrast release

- Improved the Britt with Bling public homepage title's fit by reducing its
  responsive maximum scale and adding a safe line box/padding, so the display
  font's details are not clipped. The title copy and styling direction remain
  intact.
- Updated the shared Black Diamond and Moonstone announcement-ticker surfaces
  to a light-gray background with dark readable text. Their Dance Floor rows
  remain dark, preserving the requested visual contrast and existing ticker
  motion/content contract.
- Pushed application commit `1857d53ba671981eaa384c0506cc5977014d5170` and
  manually released `dpl_CLKikaYsCV5ngJ6YRihyKqgho8rC`. Both Suite domains
  alias the Ready deployment without a DNS change. The public `/brittwithbling`
  browser smoke visually confirmed the title and paired ticker treatments.
- Focused homepage coverage passed 43 tests and the local production build
  completed. The known unrelated Britt-with-Bling roster fixture assertion was
  not changed; no authenticated user session or production data was used.

---

## August 30, 2026 - Britt with Bling Join Team polish release

- Corrected the visual duplicate on Brittany's public team roster. The Join
  Team template now suppresses its separate generic leader card only when the
  editable roster already contains the same rep/show identity, leaving the
  roster-backed photo card intact. Teams without that roster entry retain the
  leader card.
- Balanced the `Join the team` hero eyebrow with a trailing divider, matching
  the page's other section eyebrows. No copy, offer, CTA, or roster data
  changed.
- Pushed application commit `bf3d3b754c43226d385257673521ab19cd27db26` and
  manually released `dpl_4syF6CbjyQQkRjssweCVny7KzMp1`. Both Suite domains
  resolve to the Ready deployment without a DNS or alias change. Live browser
  smoke at `/brittwithbling/join` confirmed one Brittany card and both
  eyebrow dividers; focused Join Team coverage passed 15 tests and the local
  production build completed.

---

## August 30, 2026 - Britt with Bling roster parity release

- Read the live Ready.ai-published Join Team roster at `brittwithbling.com`
  and compared it against Sparkle Suite's public Brittany route. Kyndal,
  Kristin, Samantha, and Angela were the four source cards not yet present in
  Sparkle Suite.
- Added each card to Brittany's existing Join Team roster with the source
  display/show name, state, public TikTok destination, and a local copy of the
  public portrait. The production insert is idempotent and guarded by the
  exact Brittany rep identity plus `brittwithbling` slug; it appended only the
  four missing cards.
- Pushed application commit `f173347c3ab71181d2ed1e71456895aa901ef982` and
  manually released Vercel deployment `dpl_9cMPczAD4YnpUVZJ3N3z5GU2pFZx`.
  Both Suite domains alias that Ready deployment with no DNS change. Live
  public browser smoke confirmed all 27 cards and the four local portraits and
  TikTok links at `/brittwithbling/join`.
- Targeted roster tests, TypeScript, branch safety, and local production build
  passed. The established unrelated failure in the broader Britt-with-Bling
  suite (an empty `whatnot` link-key expectation) remains unchanged.

---

## August 30, 2026 - Workspace store link and Join Team early-access release

- Added and released Workspace maintenance for the existing rep-owned
  `shop_link` value. Customer-facing site setup now has an editable **Bomb
  Party rep store link** field with HTTP(S) validation; public Shop actions
  already consume this value. No real customer's store destination changed.
- Pushed the complete approved batch through
  `6ff80793b6730e8ea000f93b0368e73fc11bf487` and manually deployed it as
  `dpl_7fZrkcuVwWt3sWSL64KDihqVQr8Z`. Both Suite domains alias that Ready
  deployment. Applied `20260830120000_join_team_early_access` remotely: only
  Lindsey, Heather, and Brittany are provisioned; Kim/future reps remain
  Coming soon and cannot use the direct Join Team route.
- Combined focused gate passed 273 tests, TypeScript, and a local production
  build. Kim's public Home visibly had the revised membership footer and Shop
  action with Join Team navigation absent; HTTP returned `200` for Home and
  `404` for the direct Join route. Reviewer-smoke controls remained protected
  by a required secret token, so no existing customer or admin session was
  used for authenticated Workspace verification.

---

## August 30, 2026 - Join Team early-access staging

- Committed local-only application change `6e5748c7`: Join Team is now gated
  by a default-off, operator-provisioned site setting. Its staged migration
  enables only Lindsey, Heather, and Brittany; Kim and future reps receive a
  Coming soon Workspace state, no public navigation link, and a guarded 404
  for the direct route.
- Team Management's locked state now says **Coming soon** rather than implying
  a paid upgrade. Brittany's existing `manual_beta` path remains intact.
- Standardized each public footer to `Proud member of the {team name} team`.
  Focused coverage passed 270 tests plus 2 direct route tests, TypeScript was
  clean, and the local production build passed. An unrelated existing
  Britt-with-Bling roster social-link assertion remains outside this change.
- Per Louis's batching instruction, nothing was pushed, deployed, or applied
  to production. No customer, billing, support, message, Live Queue, or
  production data changed.

---

## August 30, 2026 - Kim trial-date adjustment and checkout terms copy

- Shifted only Kim's verified active five-day Workspace trial one day forward
  (August 31 through September 5), using a conditionally guarded production
  update against her durable customer identity, active status, existing trial
  duration, and prior dates. Her billing and all other account state remain
  untouched.
- Committed local-only application change `b31c35c8`: the checkout copy now
  calls them **Terms and Conditions**, explicitly says their review is
  optional, and retains the separate required acknowledgement checkbox.
- Focused billing and trial suite: 128 passed; local production build passed.
  The commit is deliberately not pushed or deployed while follow-up updates
  are being batched. Open Brain capture succeeded.

---

## August 30, 2026 - Workspace Account support-history placement release

- Moved **Support access history** from the top of the Account stack to its
  bottom without altering its fetch contract, audit entries, visibility, or
  support-mode restrictions. Added a source-order regression contract.
- Focused `control-center-operator-support-access-ui` coverage passed (14
  tests), followed by local and Vercel production builds. The branch guard
  passed before test, build, and push.
- Pushed `4183c8b9` and manually deployed Vercel production
  `dpl_FG4CmNA9z2RrTf5XQx1vNg9hDrFz`; alias inspection confirms both Suite
  domains. Read-only live checks passed for `/` and `/nic-nac`.
- Did not enter a reviewer session because the safe reviewer sign-in path was
  not opened. The existing signed-in Lindsey customer Workspace was not used
  for verification. No customer or production data changed beyond deploying
  the layout code. Open Brain capture succeeded.

---

## August 30, 2026 - Consolidated session memory closeout

- Completed Kim's pre-onboarding readiness repair, Workspace parity audit,
  support-mode Live Queue consistency correction, Nic-Nac personalization and
  zero-output repair, and shared customer-site membership-footer parity.
- Durable operating decisions: real customer classification is independent of
  onboarding progress; support is transparent delegated access rather than
  impersonation; special beta entitlements are not customer-parity defaults;
  member-team and managed-team identities remain distinct; and every reusable
  customer-site page must honor the same footer identity.
- All completed work is recorded in the dated Project State, Decision Log, and
  individual Session Log sections directly below. The only related follow-up
  remains the already-tracked reconciliation of two historical Kim Customer
  Waitlist records; it must not alter Kim's customer classification or
  Workspace access.
- Open Brain contains a verified consolidated, credential-free capture for
  cross-session retrieval. `artifacts/` and `test-results/` remain untracked
  and preserved.

---

## August 30, 2026 - Customer-site membership footer parity release

- Reproduced the shared contract gap against Kim's live customer site. The
  public homepage payload and footer already contained `Fizz City`, but the
  Dance Floor and Join Team template data types, mappings, and renderers did
  not carry **Team I belong to** at all.
- Extended the reusable Amethyst Trade and Join contracts and footers to match
  Homepage. Current and future accounts now show the saved membership team on
  all three customer-facing pages without conflating it with the separately
  saved managed-team identity.
- Regression coverage passed 72 focused tests and the 87-test Amethyst
  template gate. The local Next.js build and Vercel production build passed;
  the local-link portion of `qa:amethyst` reported its expected unavailable
  localhost server because that command does not start one.
- Pushed application commit
  `5fd9b6f07b34068a2f30000ca28bc3b5d739ad75` and manually released it as
  `dpl_4C628hAHKzdy3Mo9uf3TY2hWn8gT`. Alias inspection confirmed both Suite
  domains and all existing customer/project aliases on the Ready deployment.
- Live HTTP and in-app browser checks confirmed Kim's Home, Dance Floor, and
  Join Team footers each visibly say `Proud member of team Fizz City`. No
  production data, DNS, billing, message, credential, or support-session state
  changed.

---

## August 30, 2026 - Kim Workspace parity and personalized Nic-Nac release

- Compared Kim's real customer Workspace with Brittany's live baseline without
  copying Brittany's special `manual_beta` Team Management entitlement. Kim's
  active onboarding trial supplies full ordinary Workspace access, and her
  still-incomplete setup checklist remains correct for the scheduled guided
  onboarding.
- Confirmed both reps already had exactly one Live Queue assignment. Repaired
  the support UI so the Workspace header and Live Queue tool use the same
  assigned-code source; no code was created, rotated, or changed.
- Proved the Nic-Nac failure was real and not merely support-mode display lag:
  the assistant completed with no text and zero tokens. An exact local
  diagnostic showed the full 47-tool prompt works, but streaming with automatic
  tool choice on a plain greeting ends at `length` with zero usage. Tool-free
  streaming answered normally.
- Released a customer-safe empty-output fallback, then routed genuinely
  conversational first steps with tools disabled while retaining optional and
  required tool routing for real Workspace work. Added sanitized subject-rep
  name context for occasional professional personalization.
- A live reviewer-safe response still omitted the name despite the prompt, so
  simple greetings were made deterministic: for example, a subject rep named
  Britt now receives `Hello, Britt! How can I help you today?`. Greetings that
  also request Workspace work are not intercepted and continue through normal
  model/tool routing.
- Tests passed at 51 focused cases and all production builds passed. Final
  pushed tip `db801a8ebe45843aed611aab3b748dcffb067c77` was manually released as
  `dpl_9G6wf3bzgXiJP2cv2ndhoetMd4QN`; every existing alias points to it, both
  Suite domains and Kim's public routes passed live checks, and no DNS record
  changed.
- Final in-app browser smoke used only a disclosed synthetic demo support
  session. Nic-Nac returned the personalized subject-rep greeting with no
  fallback or operator-name leakage, and the session was explicitly ended with
  no account changes. No message, credential, payment, checkout, customer-data
  edit, or Kim account mutation was performed.

---

## August 30, 2026 - Kim onboarding account readiness production repair

- Reproduced Louis's live failure in the exact Control Center account. Kim was
  correctly active, `dashboard_unlocked`, and classified as a customer, but
  support access rejected her because the existing five-day onboarding trial
  was still pending, and the customer-site action was unavailable because no
  public slug had been assigned.
- Used an exact identity-guarded production transaction to activate only the
  existing onboarding trial and assign the unused, intake-backed slug
  `goforthebling`. The account, auth identity, classification, billing,
  subscription, custom-domain state, and credentials were otherwise preserved.
- Published and verified
  `https://www.yoursparklesuite.com/goforthebling`, including the Home, Dance
  Floor, and Join routes. Replaced a false default promo-code announcement with
  a neutral onboarding message and confirmed it disappeared from the live
  page.
- Refreshed Control Center and confirmed Kim remains in Customer Database with
  `Open customer site` and `Open Workspace as Support` available. No support
  session was started and no support notice, email, SMS, checkout, payment,
  subscription, DNS change, or custom-domain change occurred.
- Strengthened the reusable onboarding skill and reference: a live walkthrough
  now requires verified Workspace access, public slug, prepared settings, and
  reachable Home/Dance Floor/Join routes. `dashboard_unlocked` and correct
  database placement are necessary but not sufficient readiness evidence.

---

## August 29, 2026 - Kim and future-customer classification correction

- Diagnosed that Kim's active, dashboard-unlocked account appeared in Demo
  Database because the Control Center still treated only three hardcoded site
  identifiers as customers. Her onboarding progress and missing subscription
  were not the classification cause.
- Added durable `customer` / `demo` classification to `reps`, removed the UI
  whitelist, and wired the field through the operator customer-profile read
  model. Real operator-led and self-serve account creation now persists
  `customer`; every known reviewer/demo/smoke/test creation path persists
  `demo` explicitly.
- Updated the reusable rep-welcome skill, component checklist, and tokenized
  template. Future onboarding must verify classification and the resulting
  Customer Database placement before closeout.
- Focused regression passed 62 tests; the standard suite passed 226; changed-
  file lint and local/Vercel production builds passed. The full sweep improved
  to 440 passed files and 2,995 passed tests, with 19 files / 37 tests still
  failing only in unrelated documented expectation drift.
- Pushed exact application commit
  `299e9bcd1f5c8b818b25c77367e8200cc92d8c57`, applied migration
  `20260829154000`, and manually released Vercel deployment
  `dpl_GvTmFiCnhavhU4Z5WeNYrnH4Vk8Y`.
- Production readback confirmed four customers and 24 demos. Live Control
  Center inspection confirmed Kim is visible in Customer Database, absent from
  Demo Database, and the console is clean. All Suite/customer domain HTTP
  checks and deployment logs passed.
- No billing, checkout, subscription, credential, public-site, DNS, Message
  Center, email/SMS, or Live Queue extension change occurred.

---

## August 29, 2026 - Support access full Workspace parity correction and release

- Louis's first live review proved the support-only shortcut screen was a
  requirements miss: it logged access correctly but did not present the exact
  rep Workspace needed for hands-on account assistance.
- Replaced that alternate support screen with the normal Workspace experience
  under the frozen support target, including its navigation, tools,
  customer-site editing, customer records, inventory, calendar, team,
  resources, analytics, Message Center, exports, outbound workflows, and both
  Nic-Nac layouts.
- Preserved transparent independent support sessions, the support banner,
  start/completion notices, durable history, expiry/revocation, and per-action
  audit. Narrowed hard blocks to billing/payment/wallet mutations and account
  authentication/security/ownership changes. Existing Live Queue codes are
  display-only; provider callbacks and the target rep's ordinary Nic-Nac
  conversation remain isolated.
- Added support-session-specific Nic-Nac conversations and operator/target
  provenance, plus deny-by-default tool classification and mutation audit.
- Applied production migrations `20260829122500` and `20260829123000` and
  manually deployed exact commit `bbc1283b4b79c9cc7b29ff3ccd97383930bcea93`
  as Vercel production deployment `dpl_Z5DCR55PT3gKsQKeFpTmJxhgoEiJ`.
- Confirmed the deployment is Ready and owns every existing alias. HTTP smoke
  passed both Suite domains, Control Center and support login guards, and all
  four customer-domain variants. In-app browser smoke passed the live landing
  page, authenticated Control Center entry/history, and Mile High Fizz public
  site with no console errors. The production error-log query was clean.
- Verification passed 226 focused support/Workspace tests, the standard 226-
  test suite, 33 policy/schema follow-ups, local and Vercel builds, migration
  parity, and source hygiene checks. The full-repository failure set remains
  unrelated baseline drift and improved by one file/test from the prior run.
- Did not open, mutate, or end Lindsey's existing support session and did not
  create a replacement session, duplicate disclosure, customer mutation,
  outbound provider send, checkout/payment, DNS change, or extension change
  during release smoke.

---

## August 29, 2026 - Transparent operator support access implementation

- Started from the approved repo, remote, allowlisted branch, and exact plan
  commit `75617e4e`, preserving the existing untracked `artifacts/` and
  `test-results/` directories.
- Implemented Control Center start/history UI, frozen and expiring support
  sessions, exact-recipient start and completion notices, rep-visible Account
  history, a persistent support-mode Workspace, target-scoped request context,
  deny-by-default route classification, audited mutation dispatch, CSRF/origin
  enforcement, redaction, idempotent retry handling, and stale-session cleanup.
- Kept billing/auth/security/ownership, private messaging, outbound sends,
  customer exports and edits, Live Queue codes, Nic-Nac conversation, Guardian,
  Sparkle Lab, deploy/DNS controls, and shared resources outside support mode.
  The customer list is read-only; supported customer-site, inventory, calendar,
  fulfillment, and non-messaging team setup remain explicitly classified.
- Security review hardened current operator allowlist/status revalidation,
  target entitlement revalidation, strict same-origin mutation requests,
  session-scoped HttpOnly CSRF cookies, mutation-attempt durability, duplicate
  retry blocking, activation-failure correction notices, and expiry closeout.
- Added the operator/reviewer runbook at
  `docs/sparkle-suite/operations/operator-support-access.md`.
- Verification passed: 16 focused files / 182 tests; standard 14 files / 226
  tests; changed-file ESLint; `supabase db push --dry-run` showing only
  `20260829120000_ss_operator_support_access.sql`; `git diff --check`; secret
  scan; local unauthenticated browser redirect smoke; and the full production
  build through TypeScript and route generation. The earlier full-repository
  run had 434 files pass, 1 skip, and 21 unrelated baseline-failure files (2,969
  tests passed, 39 unrelated failures).
- Saved the implementation as `c6bfcab feat: add transparent operator support
  access`. No migration, deploy, DNS, payment, customer/account, communication,
  MCP, or production change occurred. Release remains gated because the same
  branch also contains the separately held Guardian source.

---

## August 29, 2026 - Kim welcome guide: self-paced Live Queue setup

- Updated Kim's public welcome guide with the canonical Sparkle Suite Live
  Queue Chrome Web Store listing. The guide now explicitly frames Sunday as a
  guided walkthrough; Kim completes Live Queue setup on her own schedule and
  can ask for help whenever needed.
- Clarified that Kim's customer-facing site is fully customizable and that she
  chooses and refines it herself, with help available on request. No Live
  Queue extension code, Web Store settings, sync data, or live-show behavior
  changed.
- Updated and verified Kim's Gmail welcome as an unsent draft from Louis's
  account. It mirrors the self-paced setup framing and includes the official
  Store link; no email was sent.
- Extended the reusable rep-welcome template with the same walkthrough and
  self-service guidance plus a token for the verified official extension
  listing. No private code, password, address, or meeting URL was added to the
  template or project memory.
- Published the updated public guide after a successful build and desktop plus
  mobile checks. The published page displays the official extension link and
  no horizontal overflow at the checked mobile width.
- Follow-up polish: all Kim onboarding references now use the `ET` time-zone
  abbreviation. The five starter cards are individually checkable and retain
  progress only in the reader's local device storage; checking a card never
  mutates or attests to Workspace setup.
- The guide now explicitly says the private Live Queue code is in the
  onboarding email. Kim's still-unsent draft makes the official Chrome Web
  Store link a standalone, labeled line; draft verification confirmed the
  link and `DRAFT` state.
- Replaced plain-text URLs in Kim's draft with actual HTML hyperlinks for both
  the public onboarding guide and the official Chrome Web Store listing; both
  destinations were verified in the still-unsent draft.
- Moved Kim's optional onboarding-guide invitation near the top of the draft,
  making clear that reading ahead is welcome but not required before Sunday.
  Added a direct Sparkle Suite sign-in hyperlink plus steps to use her email
  address and temporary password, select Sign in, and change the password
  after first access. The draft remains unsent.
- With Louis's final publish approval, sent one in-app Message Center welcome
  to Kim only. It includes the public onboarding-guide action link and no
  private credentials or Live Queue code; Control Center verified 1 recipient
  and 1 delivered message. No email or SMS was sent.
- Expanded the reusable `sparkle-suite-rep-welcome-site` skill into a
  component-based onboarding package: verified intake, explicit account
  preparation, educational public guide, unsent Gmail draft, optional
  Message Center welcome, exact-price/fulfillment handling, and separate
  approvals for sensitive or external actions. Added a tokenized reference
  without any Kim-specific credentials, addresses, codes, or links.

---

## August 29, 2026 - Kim onboarding Meet link

- Created a reusable Google Meet link under Louis's authenticated Google
  account without creating a Calendar event or inviting attendees. The link is
  intentionally published only because Louis explicitly approved placing it on
  Kim's public starter guide; do not record the URL itself in vault or Open
  Brain content.
- Updated Kim's still-unsent Gmail welcome draft with the meeting link and
  corrected month-13 pricing to the verified $74.99 monthly rate. The draft
  remains a draft; no email was sent.
- Published the Kim welcome guide update and verified its First session card
  exposes the approved Meeting at Google Meet link. Transcription/Gemini notes
  remain a host action for Louis to start inside the meeting, as requested.
- Generalized the reusable rep-welcome skill/template with an optional
  meeting-link placeholder that requires explicit approval before a meeting URL
  is placed on a public page.
- Follow-up guide corrections: the meeting card now states the full Sunday,
  August 30 date; Email + SMS updates are removed from Kim's ready-now
  checklist/tool guide and shown in its Coming soon section instead; and the
  light-box copy asks to confirm the best shipping address during onboarding.
  The reusable template now carries the same account-readiness rule for
  customer-update tools.
- All Kim onboarding times are explicitly Eastern Time in both her public
  guide and still-unsent Gmail draft. The welcome-guide template now requires
  the time zone alongside a rep's confirmed onboarding date and time.

---

## August 28, 2026 - One shared Grok Bot Control Center MCP

- Extended the existing Sparkle Comms MCP in place into one shared Control
  Center MCP. It retains the existing endpoint and token connect-card pattern,
  so Remy, Nic-Nac, Hale, and Sam see one Sparkle tool surface rather than
  separate per-agent connectors or keys.
- Preserved the complete Communications Center tool set and one-time Support
  approval/send path. All other sending, broadcasts, moderation, status/profile
  changes, private unreported Rep Network access, attachments, deployment,
  DNS, money, and production configuration remain blocked.
- Added read-only waitlist list/get tools with truthful nullable shop identity,
  plus a read-only operator-health snapshot built only from bounded Support,
  job/system, reported Network Safety, and active-suspension counts.
- Verification passed: 4 focused files / 11 tests, changed-file ESLint, active
  branch guard, TypeScript, and the full Next.js production build. New read
  modules have static no-mutation coverage.
- Per Louis's explicit scope, no deploy, connector save, Support send, DNS
  change, or production mutation occurred. The broken `user-Sparkle Suite`
  OAuth connector was not touched or reused.

---

## August 27, 2026 - Open Brain full-history retrieval repair

- Repaired the live `open-brain-mcp` function so `list_thoughts` supports
  paged retrieval (`offset`), oldest-first/newest-first ordering, exact totals,
  and a next-page offset. This removes the effective first-1,000-record
  ceiling that prevented agents from reaching older diary entries.
- Corrected `thought_stats` to page through the complete database rather than
  deriving its date range and metadata counts from only the first 1,000 rows.
  Live verification now reports 2,308 pre-existing thoughts spanning March 30
  through August 27, 2026.
- Repaired `capture_thought` to insert directly into `thoughts` and save its
  embedding rather than calling the missing `upsert_thought` database routine.
  A live Open Brain capture confirmed the repaired write path.
- Restored semantic `search_thoughts` by aligning its RPC call with the live
  `match_thoughts(query_embedding, match_threshold, match_count)` signature.
  Live verification confirmed semantic search, oldest-first lookup, full
  statistics, and capture all work together.
- Live oldest-first query at offset `9` returned the exact 10th diary entry.
  Open Brain is the diary; the vault records this repair as companion context
  for future agents.

---

## August 27, 2026 - Dual memory closeout rule

- Louis clarified that Open Brain is the shared cross-session diary/second
  brain and is distinct from the repository vault. The vault must never be
  represented as, or substituted for, Open Brain.
- A real Open Brain MCP capture now records the required policy: when Louis
  asks for an Open Brain log, agents must use and verify the actual Open Brain
  connector; meaningful information for future agents must also be captured
  in the appropriate vault files.
- Meaningful session closeouts, decisions, lessons, blockers, verification,
  and next steps normally belong in both systems. A session is not closed until
  both writes are complete and confirmed. Secrets and credentials remain
  excluded from both ordinary Open Brain entries and Git-tracked vault files.

---

## August 25, 2026 - Sparkle Finder moved into the Suite repository

- After explicit follow-up approval, corrected only the Finder Vercel source
  bookkeeping: project `sparkle-finder-dev` now connects to
  `louis623/sparkle-suite`, uses Root Directory `apps/finder`, and tracks
  production branch `codex/nic-nac-trade-hardening`. The previous production
  deployment was preserved as rollback. Suite's Vercel project, aliases,
  deployment, auth, database, and Heather's beta environment were untouched.
- Completed read-only due diligence before making changes, including Git
  history, build-boundary, deployment-provenance, rollback, and live HTTP
  audits. Used three independent read-only agent reviews and a disposable local
  rehearsal.
- Imported exact Finder tip `8192b11f1535e8cbc0af2c4df352ea93c0e86233`
  under `apps\finder` with complete history preserved as the second parent of
  import commit `8e12e6da2495cfd28850eec1dec53a2b96b8f797`.
- Added only repository-isolation guards: root TypeScript and ESLint exclude
  Finder, Suite's Vercel upload ignores Finder, and Finder SQL migrations retain
  their original LF checkout behavior on Windows. Updated active workspace
  instructions and current memory paths.
- No app source, package manifest, lockfile, Next/Vitest config, database,
  authentication, domain, deployment, or production setting changed. The old
  Finder repo remains an untouched rollback copy.
- Verification from the combined layout: both production builds passed; Finder
  lint passed; all 760 Finder tests passed; local browser smoke passed 20 with 2
  expected skips; Nic-Nac fail-safe and strict live Suite contract checks
  passed. Suite's build passed and its documented pre-existing test baselines
  reproduced exactly.
- Live production intentionally stayed on Suite deployment
  `dpl_H4TuzixGEezkUFE2pnaVc5MVxzb5` and Finder deployment
  `dpl_7EsNvmCudB2fcbCirNy5WFi7UW37`; no customer or reviewer account was used.

---

## August 25, 2026 - Sparkle Finder compatibility upgrade

- Audited the Finder prerequisite handoff and plan while preserving all existing
  Suite behavior and the pre-existing dirty vault work.
- Implemented catalog v2, quantity-aware availability/reservations, Showcase
  Studio v2, and the authenticated Studio manual-review queue. Kept v1 and all
  rollout compatibility fields.
- Applied only migrations `20260825017000`, `20260825018000`, and
  `20260825019000`; linked migration history matches. Read-only and rollback-only
  production DB checks verified totals, permissions, plans, replay, and cleanup.
- Focused compatibility verification finished at 160/160 tests; local and
  Vercel builds passed. The full Suite sweep retained 48 unrelated stale
  failures already represented by the broad-suite cleanup open item.
- Pushed application commit `f3de6c15715049d7db5f913af5a5f9e02a7f23d4`
  and manually deployed exact commit as `dpl_H4TuzixGEezkUFE2pnaVc5MVxzb5`.
  Both Suite aliases resolve to it, Finder's live strict checker passes, public
  customer-site/Dance Floor reads return 200, and the new deployment log scan
  found no errors, warnings, or 500s.
- No Louis/customer authenticated session was used and no production smoke data
  remains. The temporary clean release worktree and Vercel link token were
  removed after deployment.
- Finder subsequently completed Releases 1–4. Its clean synced closeout tip is
  `8192b11`, production deployment is
  `dpl_GKS4RzyHxnpchfYsypE3q3UT67DR`, and its final gate passed lint, build, 57
  test files/760 tests, strict Suite verification, browser smoke, Nic-Nac guard,
  custom-domain 200, and runtime-error review.
- Captured the cross-repo session close, status, decisions, lessons, release
  pattern, and next active task directly in Open Brain. The next session is
  intentionally read-only merger discovery; it must not implement the merge.
- Created the copy/paste restart prompt at
  `docs/sparkle-suite/operations/2026-08-25-suite-finder-merge-discovery-prompt.md`.

---

## August 23-25, 2026 - Team Management, customer-data, and Dance Floor inventory repair

- Opened the Sparkle Suite Workspace and Control Center as separate in-app-browser tabs and kept the product boundary explicit: `/nic-nac` is the rep Workspace; `/control-center` is the operator surface.
- Added the requested future **admin account-assistance / impersonation** scenario to the live Control Center Task List. It remains a planned operator capability, not an implemented password bypass. Any build must use explicit operator authorization, rep selection, scoped support sessions, conspicuous acting-as identity, audit records, and safe exit/revocation.
- Enabled Team Management for Louis's protected `$0` internal demo account so the feature could be tested without checkout. This did not change the rule that `louis@neonrabbit.net` is an internal demo/admin account and must never be routed to Stripe.
- Simplified Team Management by removing **Email with my email app** and renaming **Rep progress** to **New Rep Progress** (`74f9fe3d`).
- Implemented two independent team identities (`7b4bb363`, `58ab5e29`, `d7769936`): the team a rep belongs to and the team they manage. Managed-team name is edited in Team Management and personalizes Join Team plus New Rep Onboarding; membership-team name appears in the Workspace header and public-site footer. Added Whatnot to public team cards and removed Brittany-specific onboarding defaults.
- Repaired customer-profile handling (`36d1e8fd`): birthday and jewelry preferences now display and sort in Customer List, Joined date appears once, the public signup form gives visible accessible submission feedback, and the footer can show **Proud member of team ...**.
- Reproduced Heather's older-item report and accepted legacy `RBP` necklace numbers (`be67fc4e`). Investigated the missing-necklace report and removed the fixed public inventory cap (`83ae90fe`) so every available dancer reaches the customer page; client paging still controls how many cards render at once.
- Reproduced the same-item/different-stone failure with ER59000. Added internal catalog variants keyed by exact design/main stone (`720cdd74`) so Ruby and Rose Quartz can retain distinct descriptions and photos without inventing external item numbers. Jewelry Library now forwards exact `designId`; item/material/stone agreement is validated before selecting a variant.
- Implemented one-card quantity for truly identical duplicates (`bba85805`) and then hardened it for concurrency/idempotency in `f81eed6`: fresh intentional adds increment quantity, repeated mutation keys replay without another increment, keys are rep-scoped, and the UI explains when a replay did not add a copy.
- Hardened the full intake/recovery path in `f81eed6`: durable rollover, stored failure context, truthful tool-error classification, storage/photo semantics, retry ordering, exact variant resolution, and trade-swap resume integrity. Customer Dance Floor cards now show material, stone, and quantity.
- Applied and verified seven production migrations: `20260823103000`, `20260823160000`, `20260823170000`, `20260825013000`, `20260825014000`, `20260825015000`, and `20260825016000`. Reconciliation found zero existing duplicate groups needing retirement or request repointing.
- Verification before release included 24 focused files / 340 passing tests, successful production build, two independent code reviews with all identified blockers repaired, clean diff checking, and rollback-only production DB assertions for same-key replay, fresh-key quantity increment, separate Ruby variant, and rep-scoped keys.
- Pushed exact commit `f81eed6a5e8026dd8d333ffbe247a40474547afc` and manually released it as production deployment `dpl_BUemZRh5njwHqj3XQQHyRfc2gMoV`. Vercel's remote build passed the active-branch provenance guard. `www.yoursparklesuite.com`, `yoursparklesuite.com`, both stable Vercel aliases, Bri's Glowtique, and The Bling Kitchen all resolve to that deployment.
- Live synthetic reviewer replay used only `sparkle-reviewer+preview@neonrabbit.net`: Nic-Nac added ER13229, recognized a second identical physical pair, produced one dancer at quantity `2`, persisted a completed workflow with no blockers, and removed the temporary listing. Root, health, auth redirects, live customer assets, and post-release 5xx logs were checked. No Louis, Heather, customer, checkout, email, SMS, or provider account was used.
- Release lesson: Vercel CLI `59.5.0` completed the application compile/typecheck/static generation locally but failed its local prebuilt packaging step on `/amethyst/unsubscribe`. The normal remote Vercel builder succeeded with deployment-scoped, verified Git metadata. Treat local prebuilt packaging failure separately from application build failure, and never bypass the branch guard; use exact metadata and inspect the resulting deployment/aliases.
- The temporary exact-commit release worktree was verified and removed after deployment. Pre-existing unrelated `vault` edits plus `artifacts/` and `test-results/` were preserved untouched.

---

## August 24, 2026 - ThumbAPI / Lemon Squeezy charge attribution note

- Investigated Louis's late-July `$20.00` charge question by searching Sparkle Suite memory, broader repository sources, and Open Brain / Codex session logs.
- Sparkle Suite itself showed no ThumbAPI or Lemon Squeezy integration. The `$20` references found inside Sparkle Suite memory were unrelated internal spend-cap notes, not card-billing evidence.
- The strongest attribution evidence came from July 22-24, 2026 Open Brain / Codex records, which tie `ThumbAPI` directly to the shipped `Some Dude + AI` YouTube thumbnail generator workflow in `C:\Users\louis\kalshi-repo` / the `AI Hustle Dashboard`.
- Working conclusion for future sessions: when a charge descriptor mentions `ThumbAPI`, `Thumb API`, or `Lemon Squeezy`, treat it as most likely connected to that Some Dude + AI YouTube-thumbnail workflow unless fresher billing evidence proves otherwise.

---

## August 22-23, 2026 - responsive browsing and unified workspace resources

- Used Louis's Samsung Z Fold 6 outside-screen and unfolded-screen evidence to correct a Nic-Nac mobile action collision. The desktop layout remains unchanged; narrow view uses a compact Clear Conversation control and the medium viewport uses a more useful two-column home arrangement. Released in `c521047` / `dpl_CFo4jt64iMBpfV9S4izHHbhuAacq`.
- Diagnosed the public Dance Floor browsing complaint as sticky customer chrome, not the dancer cards themselves. On phone/tablet widths (`<=900px`) the public header, ticker/live-queue stack, customer drawer, and filters now scroll out of view; desktop sticky behavior remains intentional. Local and public 412px inspection showed the chrome and filters moving above the viewport while dancer cards became reachable. Released in `1e67f39e` / `dpl_7daiDeLdFw6Pk9FfYvjQ4nG93mGF`.
- Corrected an operator-navigation mistake: `/nic-nac` is a rep/customer Workspace, while the actual Sparkle Suite Control Center is `/control-center` and can require its separate operator login. Browser work was read-only; no message, account, or other external change was made.
- Simplified Control Center Resource Publisher to the actual operator choice: Blog or Video. All remaining authored fields are optional. Internal fallbacks preserve required storage identity without forcing operators to enter a title; blank short summary, blog content, and change description stay absent from rep-facing rendering. Video URLs remain safely validated when given, and YouTube videos derive their ordinary provider thumbnail instead of asking for an uploaded thumbnail. Applied migration `20260822093000_ss_workspace_resources_allow_optional_video_url.sql`; released in `cb65f99772636003e22b799ca374332a2f379651` / `dpl_8KpwfJ2kP6EzsmfoLW89sMfSjrrE`.
- Merged the duplicate rep-facing resource areas into **Tools > Resources & Help**. The **Learn** tab presents compact 16:9 Blog/Video cards; the **Help** tab retains the written workflows and support help. Existing `help-resources` deep links still work and open Help. Released in `df794a07e4afff8efa91833ee18bfac6180ad1d1` / `dpl_Bvu5ZRsjU8JQ1tSXGyArDB5engbm`, which both production domains resolve to.
- Focused publisher coverage (12 tests), workspace coverage (114 tests), and local production builds passed. Public mobile behavior was checked without authentication. Reviewer-token/browser runtime constraints still prevent authenticated synthetic visual acceptance; Louis's personal account and real customer accounts were deliberately not used.

**Lessons retained:** a sticky desktop information hierarchy is not automatically usable on a phone or foldable; use viewport-specific flow rather than shrinking a permanently pinned stack. Operator-facing publishing should request only information that affects the published resource. Separate routes/sessions must be named and verified precisely: a loaded Workspace is not a loaded Control Center. When the reviewer path is unavailable, leave authenticated acceptance open rather than borrowing a real account.

---

## August 22, 2026 - Complete session closeout

- Corrected two Birthday Collection associations in the jewelry catalog from Louis's item-level evidence: necklace `NK12032`, **Glowing Up Glam**, now belongs to **January 2026** rather than July 2026; earrings `ER97948`, **The Curve That Waited**, now belong to **November 2025** rather than April 2026. Treated both as canonical catalog identity fixes rather than cosmetic card-copy edits.
- Replaced **Trade Board** with **Dance Floor** throughout active product language and established **dancer(s)** as the name for jewelry offered there. Kept **trade** for the exchange itself. The first release was application commit `c6cc8e0c`; follow-up commit `568f4661` removed remaining user-facing board/listing/piece drift while preserving legacy technical identifiers such as `trade-board`, `trade_listings`, and `listingId`.
- Audited the Help & Resources dancer-intake instructions against Louis's easy-button standard and changed only material gaps. Commit `5a37655f` now gives reps one short path: open **Dance Floor > Add dancer** or ask Nic-Nac; provide the item number or readable tag image; provide the clear customer-facing jewelry image; supply ring size when needed; answer only missing questions; review and confirm. The guide distinguishes an identification image from the image customers will see and explains when a boxed display photo is acceptable.
- Set the strategy for the companion Sparkle Suite YouTube tutorial: demonstrate the same workflow from a phone because that is the likely rep device, use a safe demo item and prepared photos, complete one dancer from start to visible Dance Floor result, recap briefly, and keep the video focused rather than making it a broad workspace tour. Recording, publishing, and attaching the finished URL to the Help resource remain future work.
- Fixed the multi-turn Nic-Nac tool-access defect reported from the demo conversation. The removal-reason reply had lost `remove_listing` because availability was filtered by the latest message. Commit `7892a27f` keeps every normal authorized rep tool available on every authenticated workspace turn while intent and durable workflow state still select the relevant action. The exact clear-Dance-Floor continuation passed synthetic live replay with approval, database/public verification, and fixture cleanup; protected setup/product/rep boundaries were unchanged.
- Diagnosed the mobile Google sign-in failure without opening checkout. Production evidence showed the device resolved to old identity `louischapman1@gmail.com`, whose incomplete legacy onboarding row referenced stale Stripe customer `cus_UbS708EPxBP92t`; the prior Nic-Nac setup effect then attempted checkout and Stripe returned “No such customer.” No checkout or charge was created, and read-only evidence confirmed `louis@neonrabbit.net` remained the healthy active, `dashboard_unlocked`, non-live `$0` internal demo account.
- Commit `7abbca0f` removed checkout from sign-in, forced Google's account picker, cleared only the local Sparkle Suite session before OAuth, stopped normal OAuth from provisioning reps, and made both OAuth and password login reject unknown/incomplete identities with **“No Sparkle Suite account is associated with this email. Try a different Google account or contact Louis.”** Operator-created accounts still activate their fixed five-day access period on first sign-in; subscription checkout is available only as a deliberate authenticated **Account** action after terms acceptance.
- Session verification included focused terminology/help, Nic-Nac, authentication, trial, billing, and setup coverage; production builds; public-domain checks; a safe synthetic Nic-Nac replay; and mobile-size visual verification of the login rejection page. No production account repair, live payment, or real-user authenticated workaround was performed. The final application tip before this documentation closeout was `40520678d64210b54bb0ca86b0102e4efb308b75`, manually deployed as `dpl_EQceicceu3fNf2sqBHtbAiBL1ujw`, with www and apex resolving to that deployment.

**Lessons retained:** product vocabulary is a cross-surface behavior contract, not a label-only edit; identification photos and customer-facing photos serve different jobs; working copy should change only when clarity materially improves; tool availability and tool selection are separate concerns; and authentication, workspace eligibility, trial state, and payment are separate state-machine stages. Diagnose legacy account evidence rather than mutating account or Stripe data to hide it, and keep production acceptance synthetic when a safe reviewer path is unavailable.

---

## August 22, 2026 - Sign-in, provisioned-account, and checkout separation

- Diagnosed Louis's mobile Google-login failure from production evidence. The callback/session resolved to the old `louischapman1@gmail.com` auth identity and its incomplete onboarding rep row, then Nic-Nac automatically posted `/api/stripe/create-checkout`. Stripe rejected the stale customer id `cus_UbS708EPxBP92t`; no checkout session or charge was created. Read-only verification confirmed `louis@neonrabbit.net` remained the healthy active, `dashboard_unlocked`, non-live `$0` internal demo workspace.
- Removed the automatic Stripe call from the Nic-Nac sign-in/setup state machine. `checkout_required` and `payment_pending` now render a plain inactive-access screen with no payment action. The only workspace subscription checkout remains the deliberate Account billing button after terms acceptance.
- Forced Google's `select_account` prompt after clearing only the device's local Sparkle Suite session. Regular OAuth still cannot create a missing rep. The OAuth callback now signs out unknown identities, and both OAuth and password login reject incomplete onboarding rows with no operator trial as `account_not_found`. The Login page translates that code into **“No Sparkle Suite account is associated with this email. Try a different Google account or contact Louis.”**
- Kept the operator-led access model intact: operator provision creates an active rep plus pending fixed five-day trial; first successful sign-in activates it; an expired legitimate trial can still sign in to restore billing; protected active/internal accounts do not require a trial or checkout at login.
- Verification passed 248 focused tests, targeted ESLint, `git diff --check`, and a full local Next 16 production build. Browserless Pixel-size screenshots verified the rejection copy locally and on `https://www.yoursparklesuite.com/login?error=account_not_found`.
- Committed and pushed `7abbca0f fix: keep checkout out of sign-in`, then manually released it as `dpl_BER5PTRrXLP3vzQpzmdmSruDsggg` / `sparkle-suite-8vz5atrp3-louis-2849s-projects.vercel.app`. Vercel inspection confirmed www and apex, plus all established Bri's Glowtique/Bling Kitchen aliases, resolve to the same ready production deployment. No production account/data repair, live checkout, charge, or real-user login occurred. Authenticated synthetic browser acceptance remains open.

---

## August 22, 2026 - Nic-Nac workspace-wide tool availability

- Reproduced Louis's demo-account defect from the supplied transcript: Nic-Nac successfully read the Dance Floor, then the reason reply **“Other, as we are doing it for testing purposes”** routed as a generic memory turn and no longer exposed `remove_listing`.
- Changed authenticated workspace routing so every normal rep tool pack stays available throughout every conversation. Kept intent/workflow routing separate from availability so only the relevant workflow can force a tool; required setup remains isolated, and product policy continues to block workspace tools from Finder, Sparkle Lab, public, and unauthenticated contexts.
- Added **Dance Floor**, **dancer**, and **clear** recognition to the Trade routing/controller boundary. “Clear all dancers from my Dance Floor” now starts the durable removal workflow. Existing per-rep authorization, service validation, and one-action/one-approval safeguards were not weakened.
- Added deterministic coverage for the exact failing conversation and updated the real production removal smoke to replay the two turns. Focused routing/workflow/mission/policy/smoke-helper coverage passed (98 tests); the production build passed. A wider Nic-Nac run recorded 1,060 passes and 12 unrelated branch-wide failures already represented by stale UI/prompt assertions and the known recipe 503 expectation mismatch.
- Committed and pushed `7892a27f fix: keep Nic-Nac workspace tools available`, then manually released it as `dpl_7ro91iVU3m8P3PqdFYbbHt5WyiPm`. `www.yoursparklesuite.com` and `yoursparklesuite.com` both resolve to that exact deployment; all established Bri's Glowtique/Bling Kitchen domain pairs returned 200; the new deployment had no recent error logs.
- The live smoke used only `sparkle-reviewer+preview@neonrabbit.net`, seeded one temporary dancer/request, observed `prepare_trade_board_work`, `list_my_trade_board`, and then `remove_listing` on the previously failing reason turn, completed the approval continuation, verified database/public state, and deleted every seeded row. Louis's and customer accounts were not used; no browser session was required.

---

## August 22, 2026 - Dance Floor terminology audit

- Audited and tightened the first Dance Floor release after Louis requested a copy check. Replaced the remaining trade-inventory copy with the approved vocabulary: **Dance Floor** for the surface, **dancer(s)** for jewelry made available there, and **trade** for the exchange. This included public customer pages, the rep workspace, Help & Resources, Nic-Nac prompts, tool guidance, success/error states, search/filter labels, and accessibility labels.
- Preserved technical compatibility: internal table/API/route/field identifiers still use legacy `trade-board` and `listing` names but no longer appear as product language.
- Focused regression coverage passed: 8 suites / 213 tests. The production build compiled successfully. Authenticated reviewer smoke remains blocked by the known runtime issue; no Louis or customer account was used.

---

## August 22, 2026 - Dance Floor terminology and first training release

- Replaced the active product term **Trade Board** with **Dance Floor** across rep/customer workspace copy, public customer-site templates, SEO/social collateral, onboarding language, and public/legal copy. The new vocabulary is intentional: the surface is the Dance Floor; each rep-listed, trade-eligible jewelry piece is a **dancer**; and a trade remains the exchange process.
- Updated Nic-Nac's shared knowledge, prompts, and guardrails so it coaches reps to add dancers and tells customers to request an available dancer rather than create a listing. Durable workflow/database/API names intentionally remain stable to protect existing links and persisted state.
- Updated Help & Resources with the rep-facing workflow **Add a dancer to your Dance Floor** and dancer-focused trade-request guidance. Focused Help/Resources, Nic-Nac, customer-template, and public-landing coverage passed: 179 tests. The production build passed.
- Committed `c6cc8e0c feat: rename Trade Board to Dance Floor`, pushed it to the allowlisted branch, and manually released it as `dpl_Ekz9UEa2bE7ZZ9TzP6xEnVSUwuFB`. Both `www.yoursparklesuite.com` and `yoursparklesuite.com` resolve to that exact deployment. Live public root and `/amethyst/Trade.html` confirmed Dance Floor copy. Authenticated reviewer acceptance remained unavailable due to the known runtime defect; no Louis or customer account was used.

---

## August 21-22, 2026 - Nic-Nac clear-history hardening and Live Queue public-copy polish

- Diagnosed the recurring Nic-Nac “Clear conversation” failure as a scope gap: the browser only cleared its current conversation ID, while a second active persisted thread could remain eligible for the rep’s latest-conversation lookup and reappear after sign-in. The fix is server-owned and rep-scoped: it marks all currently active conversation rows for that rep as cleared, preserves them for audit continuity, and returns the retired IDs. Focused persistence, routing, and workspace tests passed (14 tests), the production build passed, and `62942282 fix: prevent cleared Nic-Nac threads from reopening` was manually released as `dpl_AQosKipNWRHTzEPH2rx3ADe9qv5L`. No Louis or customer account was used.
- Fixed the Live Reveal Queue modal close glyph on the shared public customer-site template. The prior white glyph on a white circular control was effectively invisible. Added dark foreground contrast, hover/focus styling, and an asset-cache bump without touching any protected Chrome extension file. The three public-template suites passed (78 tests), the production build passed, and `62a3c6f9 fix: improve live queue close contrast` was manually released as `dpl_EKi7vdphq4QUyjWvpThfTp1ncS94`.
- Louis selected the public Live Queue copy contract: **“Live Queue connected and ready”** for a fresh connected queue; **“Live Queue will open closer to the next show.”** when no queue is active; and **“Live Queue is waiting for an update.”** during a delayed sync. Customer-facing UI must not call a connection “stale” or expose technical-link terminology. Added regression coverage for both fallback states; 79 focused public-template tests and the production build passed. `60aca000 fix: refine live queue public status copy` was manually released as `dpl_5DPXXN8qsjWDbt7KR9FC8xyCVim1`. Both `www.yoursparklesuite.com` and `yoursparklesuite.com` resolve to that deployment; a read-only BlingKitchen public-template check confirmed Heather’s current queue was connected and actively showing Kim as currently unboxing.
- Performed a read-only Supabase verification of Heather’s Live Queue code: `BLI-3767` maps to BlingKitchen. The checked record had no `last_updated` value, which means it was not establishing a fresh sync at that instant; no queue, browser, or extension state was changed.
- Authenticated synthetic browser acceptance could not be completed because of the known Codex browser/runtime and reviewer isolation limitations. The work stayed on safe public routes and tests; no personal or customer session was used as a fallback.

---

## August 21, 2026 - Message Center automation audit and Brittany domain-handoff preparation

- Audited the production Message Center automations without mutating production: verified the daily cron's `CRON_SECRET` boundary, both required migrations, signup/resource triggers and functions, and a clean outbox (no overdue retryable, failed, or stale-processing rows). The focused feature suite passed 83 tests. Current active-rep time zones are Eastern (12) and Central (1), so the existing daily 18:00 UTC run is currently safe for the US-only audience; reassess before adding farther-west or non-US time zones.
- Corrected the prior documentation mistake: the active Control Center list is now formally **Task List**, and Louis's references to a “task list” or “bug tracker” always mean that live operator list, not the Git-tracked vault. The UI terminology update was committed as `05486c8b`, passed five focused tests, and was manually released as `dpl_7AjjD1gQB8WMV4gbF21WEeAjw73c` with www/apex confirmation.
- Added live Control Center Task List items for Heather's recipe-card update and Live Queue connector verification; Brittany's GoDaddy delegate/domain-reset instructions, Workspace/customer-site handoff audit, and Team Management/New Rep Onboarding smoke; and changed the GoDaddy task to in progress after the research.
- The Gmail connector was reconnected and verified as `louis@neonrabbit.net`. Created and then revised an **unsent** Brittany draft to `braxtonsherri33@gmail.com`: **A quick GoDaddy step so we can connect your new Sparkle Suite site**. It gives the exact delegate identity: Louis Chapman / `louis@neonrabbit.net`, with Domains Only and transfer-action permissions. No email was sent.
- Official GoDaddy guidance confirms that only unaccepted invites expire in 48–72 hours; accepted delegate access continues until the account owner removes or changes it. Louis manually confirmed current DNS-management access for `BrittWithBling.com`. Brittany must retain final approval of an incoming account/domain transfer.
- Browser-control evidence: the current Chrome runtime bootstrap again failed before preflight tab discovery with the same trusted-RPC dependency-path failure. The direct local audit found the extension installed in Chrome Profile 2, a valid registry key/manifest, and `chrome\\latest` resolving to `26.818.21641`. Do not request another restart or misattribute this to GoDaddy. The requested PC-control fallback remained read-only; it reached GoDaddy Products but its Delegate Access URL required a separate visible sign-in, which Louis completed himself.

---

## August 18, 2026 - Message Center closeout and Codex browser runtime lesson

- Confirmed the August 17 Message Center/Resource Library release is already documented as the live baseline. No application, database, user-account, or production mutation occurred in this follow-up session.
- Earlier in this session, Codex successfully opened separate in-app tabs for the Sparkle Suite workspace (`/nic-nac`) and Control Center (`/control-center`).
- A later attempt coincided with a bundled Browser-plugin refresh from `26.810.52044` to `26.814.41407`. The new in-app-browser bootstrap repeatedly failed before tab discovery with: `Trusted RPC dependency must resolve within a configured trusted code path: .../browser-service.mjs`.
- Louis had restarted his computer immediately before the retry. This is evidence against framing the issue as a missed restart or user setup problem. Treat it as a Codex/plugin runtime trusted-path handoff problem, keep the user-requested in-app-browser constraint, and do not substitute Chrome or touch an inherited Louis/customer session.
- `artifacts/` and `test-results/` remain untracked local QA output. Keep them out of normal commits unless a later task deliberately needs to preserve a specific artifact.

---

## August 17, 2026 - Message Center and Resource Library implementation and release

- Implemented normalized Message Center publications/deliveries, strict receive-only RLS/column grants, scoped sender capabilities, audit events, exact audience freezing, safe structured content/links, idempotency, and a stale-claim-recovering outbox. Legitimate legacy owner-to-rep history is backfilled; rep-to-owner compose is not.
- Added the persistent rep header inbox with unread badge, all/unread/report/update/resource/archive filters, structured monthly cards/lists, safe actions, synthetic reviewer fixtures, and Blog/Video Resources under Workspace Tools. Added owner-only Communications Console and versioned Resource Publisher routes in Control Center.
- Public customer signups now atomically enqueue a privacy-minimized owning-rep event. Monthly snapshots are immutable per rep/month and include durable metrics plus current-month birthdays. Resource revisions atomically enqueue Blog/Video/FAQ/Help announcements.
- Vercel Hobby rejected the original ten-minute cron before deployment. Reworked dispatch to use Next `after()` for immediate best-effort signup/resource processing and a once-daily 18:00 UTC durable recovery/monthly scheduler; final local and Vercel builds passed.
- Applied production migrations `20260818010000` and `20260818110000`. Database smoke on `sparkle-reviewer+local@neonrabbit.net` verified one selected delivery, read/archive persistence, one queued signup publication, resource versioning, and exact cleanup.
- Released exact tip `9497b117` as `dpl_29K7Gb6FbyQEnQtugA8FgG3T6bDP`. `www` returned 200, apex 307 to `www`, protected Control Center routes redirected to login, rep APIs and cron rejected unauthenticated requests, all Bri's Glowtique/Bling Kitchen aliases returned 200, and recent production error logs were empty.
- Authenticated live UI smoke was stopped when the in-app browser retained a customer session rather than switching to the synthetic reviewer. No click or customer mutation occurred; the temporary tab was closed and all synthetic Message Center fixtures were reset. Local rendered desktop/mobile reviewer QA had already passed.

---

## August 17, 2026 - Message Center and Resource Library implementation plan

- Audited the existing Sparkle Suite foundations and found a dormant `rep_messages` table/service/API and hidden `Messages / Notifications` workspace card. The old card is marked Coming soon and contains a rep-to-Neon-Rabbit backup support composer, so it does not satisfy the newly clarified receive-only contract.
- Created the phased implementation plan at `docs/superpowers/plans/2026-08-17-sparkle-suite-message-center-and-resources.md`. It reuses valid read/unread groundwork while moving toward normalized publications and per-rep deliveries, strict receive-only RLS, owner/operator publishing, scoped agent/automation senders, and a retryable idempotent outbox.
- Locked four implementation slices: header Message Center plus Control Center Communications Console; new public Customer List signup messages; immutable beginning-of-month metric and birthday reports; and a versioned Blog/Video/FAQ/Help Resource Library with publish-triggered announcements.
- No application, database, browser, Vercel, or production state changed. This was planning/Open Brain work only; `artifacts/` and `test-results/` remain untouched.

---

## August 17, 2026 - LIVE commerce channel research and guardrails

- Researched current first-party TikTok LIVE, TikTok Shop, TikTok Business, and YouTube guidance after evaluating whether reps could show a QR code during LIVE selling to direct viewers to their Sparkle Suite Trade Board. No application, account, customer, browser-login, or production state was changed.
- Established that a QR code or verbal prompt directing viewers to scan/go to a website to buy or claim Trade Board pieces is not a safe TikTok LIVE tactic. In TikTok Shop markets, TikTok states that LIVE content directing users off-platform to purchase is For You ineligible; its Seller guidance specifically says to avoid external purchase prompts via websites, links, usernames, messaging services, and QR-code/link callouts. The correct product posture is native Shop purchase links during a Shop-enabled LIVE, with Sparkle Suite supporting rep operations and post-show follow-up rather than serving as the in-LIVE purchase redirect.
- Recorded the narrow safe distinction: an official profile website link and certain TikTok-native destination-link tools exist for eligible verified businesses, but availability is conditional and commercial content must use TikTok's disclosure control. Neither is a basis to evade Shop traffic rules.
- Confirmed that YouTube technically supports selling in LIVE through eligible channels' connected stores, product shelves, tagged/pinned products, and external retailer checkout. This does **not** authorize BP reps to sell BP inventory through YouTube, a personal checkout, or a Sparkle Suite Trade Board. The current Bomb Party agreement/back-office policy must provide written approval of the exact channel and ordering method before Sparkle Suite presents that workflow as supported. Any YouTube LIVE also needs licensed/original music because YouTube scans streams for copyright matches.

---

## August 17, 2026 - Recipe-source rebuild for existing Pantry recipes

- Diagnosed Heather's Chocolate Chip Cookies issue as a UI availability gap, not a source-photo persistence or model-reading failure: the existing **Read and format recipe** handler already replaces the editable draft fields, but it was displayed only in the new-recipe upload mode. A saved recipe in edit mode showed the source photos but offered no way to run the reader again.
- Released the edit-mode control **Read source photos and replace details**. It calls the same protected draft endpoint and replaces recipe title, description, category, prep time, servings, ingredients, steps, note, and image alt text only in the editor's unsaved draft. Saved source photos stay attached, and the separate **Save recipe** button remains the only publishing action. The label and helper text make that replacement/review/save sequence explicit for Heather and future recipe updates.
- `tests/nic-nac-dashboard-placeholder.test.ts` passed (105 tests) and the production build passed. The broader recipe route suite has one pre-existing assertion mismatch for the safe model-unavailable message: the route returns the current generic temporary-unavailability copy while that test expects an earlier OpenAI-billing-specific string. It is unrelated to this UI trigger and is recorded as a follow-up below. Commit `ac1dba71 fix: enable recipe source rebuild in editor` was manually released as `dpl_4igyTHMuroRcraEpuaqcPVQJFkpu`; both Sparkle Suite aliases, BlingKitchen, and Bri's Glowtique aliases point to it. Canonical `/nic-nac?section=recipes` returned 200, the apex canonically redirected, and `theblingkitchen.com/in-the-pantry` returned 200. Authenticated reviewer visual smoke remains blocked by the known too-short reviewer token; no account was used.

---

## August 17, 2026 - BlingKitchen public recipe detail format audit

- Audited the 25 live BlingKitchen recipe records through the production database using only recipe completeness markers. Every record already has the data required for Heather's intended reader experience: title/summary, category, time, servings, card image, TikTok URL, ingredients, steps, and Heather's note. A missing dedicated inside-recipe image is safely covered by the existing card-image fallback. No recipe row or customer content was changed.
- Rebuilt the single shared Pantry modal renderer to use the approved hierarchy: a full-width recipe hero; title, description, category, time, and servings; then a responsive three-column reading layout for **Watch Heather make it**, **What You'll Need** plus **How to Make It**, and **Heather's Note**. Existing and future recipe records use that same renderer, and the Pantry asset cache key is now `20260817-recipe-detail-layout`.
- Focused public-site tests passed (2 files, 11 tests), `npm run build` completed successfully, and `git diff --check` was clean. Application commit `e1a3ff33 fix: standardize BlingKitchen recipe detail layout` was pushed and manually released as `dpl_9zu1cNZ1GUEgeeWXpyDg97KmGkWN`. Both Sparkle Suite aliases and active customer domains are attached to that deployment. No-auth live checks confirmed the fresh asset at the canonical route and `theblingkitchen.com/in-the-pantry`; a browser smoke opened Chocolate-Dipped Strawberries and visibly verified the hero, video, ingredients, method, and note arrangement. The authenticated reviewer token limitation remains unresolved and was not bypassed.

---

## August 17, 2026 - Temporary Heather recipe-audit checks

- Added a compact **Audited** checkbox to every card in the Current recipes gallery, immediately above **Edit this recipe**. It gives Heather a simple audit marker without turning a temporary review task into a recipe-content change.
- Audit checks are stored only in the active browser, keyed by recipe ID. They persist through refreshes but never alter the recipe row, public Pantry output, or database. Remove the aid when Heather completes this pass.
- Focused `tests/nic-nac-dashboard-placeholder.test.ts` passed (105 tests); the local and Vercel production builds passed. Commit `ab12e076 feat: add temporary recipe audit checks` was manually released as `dpl_ErugKgQ9nzPKn3M6FLM6D5VerB6t`. Both Sparkle Suite aliases and active customer domains are assigned to that deployment; `www.yoursparklesuite.com/nic-nac?section=recipes` returned 200 and the apex canonically redirected. Authenticated reviewer visual verification remains blocked by the known too-short reviewer token, so no personal or customer account was used.

---

## August 16, 2026 - Recipe editor audit and resilience pass

- Audit evidence from Heather's current recipe gallery showed the **Edit current recipes** tab was redundant because every recipe card already presents **Edit this recipe**. Released `388087c9 feat: harden recipe editing workflow` removes that third tab while retaining the Current recipes gallery, direct edit actions, and a clear return path from the editor.
- The audit found a real persistence gap: recipe-source images were uploaded and used to form a draft, but were not stored in `public_site_recipes`, so reopening a saved recipe lost that source context. Migration `20260816200000_ss_persist_recipe_source_images.sql` adds an empty-by-default JSON array only; it was applied safely with no recipe deletion or content rewrite. The service now returns and saves those URLs, validates them, and does not erase them when a Nic-Nac recipe-tool update omits them.
- Recipe deletion now requires a second explicit confirmation. No recipe was removed as part of this work. Focused recipe UI, persistence, and Nic-Nac tool tests passed: 3 files, 116 tests. Production build compilation passed after the active-branch guard. `www.yoursparklesuite.com/nic-nac?section=recipes` returned 200, the apex redirected canonically, and the live Bling Kitchen domain returned 200. Production deployment `dpl_BLstSy7RpntTweaFMw5nFkYszeQg` serves application commit `388087c9` and has both Sparkle Suite aliases plus customer domains.
- A final safety commit, `c3e6a282 fix: guard unsaved recipe edits`, adds a keep-editing/discard-changes confirmation before leaving unfinished recipe work. It is pushed but **not released**: Vercel rejected the direct deploy with `api-deployments-free-per-day` after the Git integration did not enqueue a second deployment. Do not use the unsaved-change guard as live proof until Vercel capacity allows an exact-tip deployment. Reviewer visual smoke remains blocked by the known too-short reviewer token; no personal or customer account was used.

---

## August 16, 2026 - Current recipe editing workflow

- Reworked the existing Bling Kitchen recipe manager into a straightforward three-tab workflow: **Current recipes**, **Upload new recipe**, and **Edit current recipes**. The underlying update API already supported editing existing rows; the change makes that safe capability visible and understandable instead of leaving it behind an inaccessible mode.
- Current recipes now presents each saved recipe with its food image, current visibility/category, short narrative, and an **Edit this recipe** action. The editor’s dropdown only permits selecting an existing recipe; after selection it shows the card and recipe-view photos, recipe source photos, and all saved recipe fields together for an ordinary save or removal.
- Focused `tests/nic-nac-dashboard-placeholder.test.ts` passed (105 tests), including the new current-recipe view and loaded-photo/narrative editor contracts. `npm run build` compiled the production application after the active-branch guard. The full standalone `tsc --noEmit` remains a pre-existing broad-suite failure set and is not the project build gate.
- Released `d31d6cc1 feat: add current recipe editor tabs` as production deployment `dpl_CmDubAkAyWu3CBf71N6HqA7uTJbH`; both Sparkle Suite aliases and both current customer domains are assigned. `https://www.yoursparklesuite.com/nic-nac?section=recipes` returned 200 and the apex redirected canonically. The authenticated reviewer UI smoke is still blocked by the known too-short reviewer token, so no personal or customer session was used.

---

## August 16, 2026 - Inline announcement ticker links

- Replaced the still-confusing separate linked-announcement builder with a selection-first editor: write the ticker sentence, highlight only the customer-facing words to click, paste the URL, then choose **Link selected words**. The workspace explicitly shows the highlighted phrase before applying the link and rejects a link attempt without a selection.
- Reworked the shared public ticker renderer in Homepage, Trade, and Join from one `href` per entire announcement into safe text/link parts. It now renders only each approved `http`/`https` marked phrase as an anchor; the surrounding announcement remains ordinary ticker text. Existing whole-message links stay compatible, but reps can now create precise inline links without syntax.
- Added the recovery path for existing whole-message links: **Make existing links plain text** retains the announcement wording while stripping only its prior link formatting, so a rep can repair the old entry and then link just a highlighted phrase.
- Bumped the shared homepage asset to `v=20260816-inline-ticker-links` so public browsers cannot reuse the earlier cache. Commits `5439e54e feat: simplify inline ticker links`, `929bca9f fix: simplify existing ticker link recovery`, and `cb70322d test: cover ticker link selection behavior` are production deployment `dpl_GqyeAM1q9zFo8i7YnDf5Bt6anmXS`; both Sparkle Suite aliases and current customer domains are attached. 200 focused tests, parsing for all three JSX exports, and the production build passed. The added behavioral smoke proves a selected phrase becomes the only link, rejects a `javascript:` destination, and converts a legacy whole-message link to plain text without losing the announcement. Live no-auth response checks confirmed the fresh asset on both aliases and `theblingkitchen.com`; the live Site Settings route returned 200 and the apex returned its canonical 307. Authenticated reviewer smoke remains unavailable because of the known too-short reviewer token, so no account was signed in or changed.

---

## August 16, 2026 - Shared customer-site homepage outage recovery

- Diagnosed the blank Workspace preview and direct customer-site failure as one shared browser-side JSX error, not a per-rep or preview-only problem. The Showcase component opened as `<CustomerVideoEmbed>` but was closed as `</TikTokEmbed>`, so every customer homepage loading `public/amethyst/homepage.jsx` failed to compile.
- Git history attributes the bad tag to the earlier shared social-video renderer commit `eed217d1`; the ticker emoji/link commits did not modify the shared homepage file. The application repair is `5475f06e fix: restore customer site homepage rendering`, with a matching-tag regression assertion and a standalone JSX parse check.
- The initial repaired production deployment still reproduced the blank page because the static homepage script retained its long-lived `v=20260725-emerald-garden` cache key. Commit `61a72945 fix: refresh customer site renderer cache` advances it to `v=20260816-customer-video-renderer` and updates route/static-asset coverage so future homepage renderer changes cannot silently reuse the old cache key.
- Expanded no-auth verification passed: 74 focused shared-template, static-asset, slug-route, BlingKitchen, and Britt with Bling tests; JSX parsing; and the production build. Production deployment `dpl_8HpwSpt4L1Zxo6Ub7Y8x2SbEou5D` serves both Sparkle Suite aliases plus the current customer domains. Live checks confirmed the fresh script key and correct shared closing tag on `www` BlingKitchen, `www` Britt with Bling, Heather's `theblingkitchen.com`, and the apex route. Browser rendering showed substantive live content on both `/blingkitchen` and `/brittwithbling`. No account was signed in or changed.

---

## August 16, 2026 - Foolproof ticker entry controls

- Replaced the raw-format burden in Customer-facing site setup with an eight-choice tap-to-add emoji picker and a two-field linked-announcement builder. A rep writes the announcement, pastes a destination URL, and selects **Add link**; no Markdown or emoji copying is required.
- Emoji buttons preserve the current ticker cursor position. The link action is deliberately unavailable until both values are present, accepts only complete `http`/`https` destinations, and shows a direct correction for an invalid URL. The control collapses to one column on small screens.
- Focused Site Settings and Amethyst ticker coverage passed: 142 tests. Commit `4369ffd0 feat: simplify ticker emoji and link entry` is production deployment `dpl_6HsXDFhcqfo95ojFHnznyN4nZeZz`; both Sparkle Suite aliases resolve to that exact deployment and `/nic-nac?section=site-settings` returned 200. Authenticated reviewer-browser confirmation remains blocked by the known too-short reviewer token; no personal or customer account was used.

---

## August 16, 2026 - Linked announcement ticker

- Replaced the generic ticker labels in Customer-facing site setup with the plain-language **Announcement ticker and Join Team page**, **Announcement ticker messages**, and **Show announcement ticker on your public site**.
- The ticker now accepts one announcement per line, normal emoji, and a clear clickable-link pattern: `[Shop the new drop](https://example.com)`. Existing pipe-separated entries still render. The public Homepage, Trade, and Join scripts parse the format, only permit `http`/`https` links, and make linked messages visibly underlined.
- Focused coverage passed: 209 Site Settings and Amethyst Homepage/Trade/Join template tests. Commit `4129aba1 feat: support linked announcement tickers` is production deployment `dpl_HuhTRc7bFCC4EmJjKSHMVXRo5aK7`; both Sparkle Suite aliases resolve to that exact deployment. The deployed public ticker script was verified to contain the parser and link class. The live Site Settings route returned 200 without using an account. Authenticated reviewer-browser confirmation remains blocked by the known too-short reviewer token.

---

## August 16, 2026 - Plain-language Join Team setting

- Replaced the ambiguous Site Settings checkbox label **Join page visible** with **Show the “Join My Team” recruiting page on your public site**. The setting controls the public recruiting page and its associated Join Team links, not the announcement ticker.
- Focused Site Settings workspace coverage passed: 103 tests. The active-branch production build compiled after the font-enabled retry.
- Released application commit `af022579 fix: clarify join team page setting` as Vercel production deployment `dpl_6ysqHQsij5ZcfALmxmxpqhGbmKwy`. Both Sparkle Suite aliases resolve to that exact deployment; `www.yoursparklesuite.com/nic-nac?section=site-settings` returned 200 and the apex canonically redirected there. Authenticated reviewer-browser verification remains blocked by the known too-short reviewer token, and no personal or customer account was used.

---

## August 16, 2026 - Smart Frame for shared About portraits

- Replaced the fragile one-size-only crop response with a reusable Smart Frame workflow. A new About portrait upload uses the browser Face Detector where supported to select a face-centered focus/zoom; that framing is stored with the image in site settings.
- The workspace now shows the exact 4:5 public composition and exposes compact Zoom, vertical, and horizontal adjustments as a safe fallback for photos without a detectable face or a rep's preferred composition. The public template consumes the saved values; legacy photos retain the shared subject-forward fallback.
- Heather's public BlingKitchen portrait was rechecked with the shared fallback. The image has one outer rounded clip, remains filled edge-to-edge, removes the former cabinet-heavy first row, and preserves her visible hairline. No per-customer exception was added.
- Focused coverage: 185 tests across homepage templates, preview mapping, Site Settings normalization, and workspace UI. The first production attempt failed on a TypeScript inference issue in the empty media-slot constant; commit `4237eb97` corrected it, and Vercel then completed TypeScript and the production build.
- Released the Smart Frame work as production deployment `dpl_HSAU4RuDtU9w7fbWd1rE2jdH6yqH` from application tip `4237eb97`. `www.yoursparklesuite.com` and `yoursparklesuite.com` are aliases of that deployment. Public visual verification stayed no-auth; the reviewer-token limitation remains unchanged.

---

## August 16, 2026 - Single-edge About portrait correction

- Follow-up inspection showed the remaining visible defect was the photo carrying its own rounded border inside the rounded portrait container. That double treatment made the top edge look offset.
- Removed the image's border and radius. The outer portrait card retains one 24px clip and the photo fills it directly.
- Released `d4c47322 fix: remove nested about portrait border` as Vercel production deployment `dpl_74ECqMSV6MsG636AEUNzJQexqkkL`. Focused coverage remained 205 passing tests. Public live browser inspection confirmed the outer clip is 24px and the image border/radius are both 0px; no account was used.

---

## August 16, 2026 - Photo-proportional About portrait frame

- Louis identified an unacceptable dark inner mat around Heather's About portrait. The fixed 3:4 card was slightly wider than the source photo, making the contained image look inset despite the intended clean portrait treatment.
- Removed the forced outer portrait ratio and moved the border directly to the natural-size image. The card now adopts the source image's actual geometry, retains its rounded photo edge and caption overlay, and does not crop or leave an interior frame.
- Focused template/settings/workspace/help coverage passed: 205 tests. Production compilation passed the active-branch guard.
- Released `053b4384 fix: fit about portrait to source image` as Vercel production deployment `dpl_74tnVQnAcFd74GpNroXsxJMqMW6i`. Public browser verification at `www.yoursparklesuite.com/blingkitchen` measured both the image and card at 500 × 688px with zero inset and visibly confirmed the clean fit. Both Sparkle Suite domains returned 200. No account was signed into or changed.

---

## August 16, 2026 - Native TikTok About-card sizing and playback

- Verified TikTok's official Embed Player parameters and its standard video-embed card sizing before changing the prior About row. TikTok's published embed markup uses a 325px minimum card width; the former 280px cap was too narrow.
- Increased the desktop card cap to 348px, which produces three 348 × 619px 9:16 cards in the shared 1080px customer-site container. The grid switches to two columns at 1100px and one at the mobile breakpoint.
- Corrected the TikTok embed contract: `muted=0` keeps volume controllable, the host waits for `onPlayerReady` before issuing muted play, and `loop=1` repeats the selected post. The existing host **Unmute/Mute** button remains available. This avoids a video ending into unrelated end-state content.
- Focused template/settings/workspace/help coverage remains 205 passing tests; the production build compiled after the branch safety gate. TikTok's official player and YouTube's documented same-video playlist loop behavior informed the implementation.
- Released `8c28cd78 fix: size and loop about short videos` as production deployment `dpl_Ewj5MHGR9wsCRV2dnrGpixQYjmiZ`. Both Sparkle Suite domains return 200 for `/blingkitchen`, and public browser inspection confirmed the exact live 348 × 619px cards, 9:16 sizing, and contained portrait. No account was signed into or changed.

---

## August 16, 2026 - Shared About portrait and short-video layout

- Replaced the shared two-card About-media gallery with a clean editorial layout: the rep narrative and one portrait photo in the top row, followed by three 9:16 short-video cards.
- The portrait uses a real `<img>` with `object-fit: contain` in a 3:4 frame, so uploads are not cover-cropped. This applies immediately to all existing customer sites and remains the default for future sites.
- Site Settings now separates one portrait-photo upload from three video-specific About slots. TikTok embeds/links and YouTube Short links are supported; the existing Showcase video remains independent. The rep-facing TikTok guide now names the three About short-video choices.
- Focused coverage passed: 205 tests across homepage templates, settings normalization, the workspace UI, and Help & Resources. `npm run build` completed its allowlisted-branch production compilation; the broad standalone `tsc --noEmit` still reports pre-existing test-fixture typing errors outside this change.
- Released `977c8eb5 feat: add portrait about video row` as Vercel production deployment `dpl_9z8wEmPMtZFYwHpabAT9RN7ggW8r`. Both Sparkle Suite aliases and Heather’s custom domain are assigned. A public, no-auth browser check on `www.yoursparklesuite.com/blingkitchen` confirmed `Meet Heather`, a contained portrait, and three 9:16 short placeholders; the review tab remains open for handoff.

---

## August 16, 2026 - Customer-list action uniformity

- Refined the three Customer List controls—Add customer, Import spreadsheet, and Download full list (CSV)—into one compact, equal-size action group.
- The group uses the canonical Sparkle Suite bright pink (`#EE2C9B`), matching 190px/40px desktop controls, 8px spacing, and a responsive full-width mobile stack.
- Focused dashboard verification passed 102 tests and the production build completed. Commit `3eb63a4e style: unify customer list actions` is deployed as `dpl_3CGbPntNPGUYJfBaVXMG8u8L3B4f`; both Sparkle Suite aliases are assigned. A reviewer-safe live screenshot confirmed the final rendered layout without using a personal or customer account.

---

## August 16, 2026 - Customer-list ownership export

- Added a permanent **Download full list (CSV)** control to the rep Workspace at Tools → Customer List, beside the existing spreadsheet import control.
- The authenticated export is strictly rep-scoped and contains the complete roster rather than the UI's short visible batch. It includes customer profile fields, tags, consent/reachability state, opt-out/STOP history, and dates, with spreadsheet-formula hardening for customer-entered text.
- Customer-audience retrieval now pages 1,000 database rows at a time, so a future larger roster remains fully exportable.
- Verification passed: 120 focused customer-list/route/export tests and a production build. Commit `ff3c1ab1 feat: export rep customer lists` was released as production deployment `dpl_5UijLM8dL4nbHUyQa4cobVnxVKs5`; both Sparkle Suite aliases were assigned. A reviewer-safe Brittany Workspace session visibly confirmed the customer-list download control on the live production domain. No personal or customer Workspace account was used.

---

## August 15, 2026 - Nic-Nac complete About-section repair

- Follow-up live behavior showed that the prior About repair saved only the narrative body and then dropped the site capability after Heather said it was incomplete.
- Added durable `about_heading` and `about_subheading` fields alongside `about_narrative`, wired them through Site Settings, the Amethyst customer homepage, and Nic-Nac's `update_site_setting` contract. The public About rendering now shows the optional byline below the saved title.
- Nic-Nac's active site prompt requires a complete title/byline/body save whenever the rep supplied those parts. A confirmed-but-incomplete About save is now a first-class continuation that pins the retry to `update_site_setting` instead of falling back to calendar-only/text behavior.
- Applied production Supabase migration `20260815190000_ss_add_about_section_fields.sql`. Focused verification passed 134 tests; production build completed. Reviewer-auth remains blocked by the known too-short token and no customer account was used for a state-changing smoke.
- Released `28cabb2e fix: save complete Nic-Nac About sections` as Vercel production deployment `dpl_AKpuJmgpyzxZ37oySahT5cRJEK1n`. Both Sparkle Suite aliases and `/nic-nac` plus `/blingkitchen` returned successfully on the live surface.
- Louis then retried the complete Heather About update in the actual Nic-Nac conversation and confirmed it worked. Preserve that user-confirmed acceptance as the real-world proof, while keeping the reviewer-token limitation documented rather than treating Louis/Heather's account as a repeatable smoke path.

---

## August 15, 2026 - Nic-Nac pasted About-copy execution repair

- Louis reported that the first routing release still denied Heather's submitted About copy. Inspected the exact live conversation logs rather than assuming the route tests represented the model input.
- Live proof: the "send me the new About text" prompt had site tools, but the next long prose message routed only to show memory plus calendar because it mentioned live shows and did not repeat customer-site wording. The first repair had not modeled that copy-submission state.
- Added a shared app-owned detection contract for a substantive narrative pasted after Nic-Nac requests About text. The router keeps the site intent, and the tool-choice policy pins the first step specifically to `update_site_setting`.
- Added a real route replay of the exact conversation shape. It proves the route exposes `update_site_setting` and returns `{ type: 'tool', toolName: 'update_site_setting' }` on the pasted-copy turn. Updated the stale route smoke harness to mock the current generic Trade workflow context as well.
- Released `1de5b0c6 fix: apply Nic-Nac About copy submissions` as production `dpl_DAYiJDsQxx5Kac4boiPyEcG1Wpyu`; both domains are assigned. 110 focused tests passed. Reviewer-auth remains blocked by the too-short token; no customer Workspace mutation was used as a workaround.
- Added the same continuation guard after Nic-Nac's prior refusal language, so Louis does not need to begin a new conversation to retry the already-pasted About content. Commit `88d0cb1 fix: retain About copy after Nic-Nac denial` is production deployment `dpl_DRowkGoJGw371eHiYxVQFCFte5SB`, with both Sparkle Suite domains assigned.

---

## August 15, 2026 - Nic-Nac About narrative and multi-tool routing repair

- Investigated Heather's report that Nic-Nac drafted an About narrative but then said it only had show/calendar tools and could not publish it.
- The mutation tool already existed: `update_site_setting` supports `aboutNarrative`. The defect was in routing/continuity: natural About/website words were absent from the site-intent vocabulary, and the later "you need to do that" message did not retain a site-edit continuation.
- Nic-Nac now recognizes About narrative, website, homepage, story, bio, and hero-title wording as site work. It keeps the site tool active when a rep asks it to publish its drafted copy, and it can surface site and calendar tools together for a combined request.
- Commit `85b41630 fix: retain Nic-Nac site editing tools` is deployed to production as `dpl_4WgURX78pyZoYg8P8ecrggqLdoiK`; both Sparkle Suite aliases were assigned. Focused tests passed 83/83, including the exact denial-follow-up replay and a combined site/calendar case. Both domains returned 200 for `/nic-nac` and `/blingkitchen`.
- The known too-short reviewer-token configuration still blocks a synthetic authenticated chat replay. No customer or Louis personal Workspace account was used to work around that limitation.

---

## August 15, 2026 - BlingKitchen hero and reveal-copy refinement

- Added a rep-editable **Homepage title** Site Settings value so customer-facing hero headlines can match each rep's show and style. The public site uses the saved title when present and retains a safe business-name fallback.
- For Heather/BlingKitchen only, added a matching full-width **In the Pantry** hero action underneath Browse the Trade Board. The existing Shop, TikTok, and Whatnot actions remain configured-platform actions and were not repointed or renamed.
- Per Heather's review note, changed the First Time Here explanation to platform-neutral language: customers watch Heather open their box live, and the Watch Live step now says "Join the reveal live." TikTok/Facebook are no longer named in that explanatory card.
- Released `e5aa0184 fix: simplify BlingKitchen reveal guidance` as production deployment `dpl_92M5a2erpWWmPTEREvGdjmffofpA`. Both Sparkle Suite production domains are assigned. Direct live `/blingkitchen` inspection confirmed the corrected copy and the five expected hero actions.
- Validation: 47 focused tests passed. No customer account or personal Workspace session was used. Reviewer-auth smoke is still blocked by the known too-short token configuration and was not bypassed.

---

## August 15, 2026 - Dynamic two-row customer hero actions

- Louis requested a layout-only refinement: Shop and available live-platform actions on the first row; existing Browse the Trade Board action on a full-width second row, dynamically sized to the row above.
- Released `f93ce618` as Vercel production `dpl_rDRUDkrEue4HbtK1h6JU3fMtR6nG`. Both Sparkle Suite domains were assigned. Direct live inspection of `/blingkitchen` showed all three actions on the first row and the Trade Board action below at the same width.
- Validation: 95 focused tests and 78 Amethyst suite tests passed; local link probes were unavailable without a local server. The reviewer-token configuration remains too short and was not bypassed.

---

## August 15, 2026 - Hero buttons for TikTok and Whatnot

- Louis specified that TikTok and Whatnot are primary live-show destinations: show a hero action for each populated platform, including both at once.
- Implemented shared dynamic hero links across standard Amethyst, Britt With Bling, BlingKitchen, and Mile High Fizz. Saved Whatnot data now joins the homepage streaming-link contract.
- Released `aa110028` as Vercel production `dpl_9YjWh7TnvqCxSKCXVasitgfSTujp`; both Sparkle Suite domains were aliased. Live `/blingkitchen` visibly showed separate TikTok and Whatnot buttons pointing to Heather's saved URLs.
- Automated validation: 94 focused tests, 77 broader Amethyst template tests, and production build passed. `verify:amethyst-links` local probes were unavailable without a running local server. No state-changing browser action or personal-account testing was used; known too-short reviewer token remains a documented limitation.

---

## August 15, 2026 - Hero Motion save-to-public-site repair

- Investigated the report that selecting **Sparkle Rise**, saving, and opening the customer-facing site still showed **Soft Glow**.
- Root cause was bootstrap ordering, not the Site Settings API: `heroAnimationType` saved correctly, but the selected skin preset reapplied its own `heroMotion` after mapping the saved setting and overwrote it.
- Reordered the homepage defaults so a skin supplies visual tokens first and the saved Hero motion is applied last. Added direct regression coverage for Sparkle Rise, Soft Glow, and Still across incompatible skin defaults and for the serialized public bootstrap.
- Commit `e5e40653 fix: preserve saved hero motion` passed 114 focused tests, 76 Amethyst template tests, and the production build. Vercel production deployment `dpl_B9EY3RBVWfs2C71temz2pkBsaiW3` is Ready with both Sparkle Suite aliases assigned.
- Read the live BlingKitchen template payload after release: it retained Moonstone styling and carried the saved `sparkle_rise` value into `HOMEPAGE_TWEAK_DEFAULTS`. Live rendered inspection of `/blingkitchen` confirmed `hero-motion-sparkle-rise`, eight sparkle elements, and no Soft Glow layer. The reviewer-token limitation remains and was not bypassed.

---

## August 15, 2026 - Customer-site animation audit and repair

- Audited all 11 selectable Amethyst appearance presets and their shared hero runtime. Four skins intentionally use Soft Glow (Sparkle Suite/Morganite, Moonstone, Emerald Garden, and Garnet); the other seven intentionally use Sparkle Rise.
- Found the issue behind the report: the hero motion component was exclusive, but a separately selected page-level sparkle texture or confetti layer could remain visible and overpower Soft Glow after settings changed.
- Made hero motion explicit on the page body. Soft Glow now suppresses that residual sparkle/confetti presentation in the hero, and its glow treatment is stronger and more legible over every theme's hero palette.
- Commit `726ffb99 fix: clarify customer site hero animations` passed focused tests (54), the Amethyst template/links suite (74 template tests; local links had no local server and fail soft), and the production build. Vercel production deployment `dpl_BrKWaCpayfNyr4PNG6kEmpaC4TZQ` is Ready with both Sparkle Suite domains assigned. Live public-homepage inspection confirmed the Soft Glow runtime class/layer and visually showed the glow without sparkle particles.
- Reviewer-browser authentication remains blocked by the known too-short reviewer-token configuration; no personal Workspace account was used to bypass it.

---

## August 15, 2026 - Control Center independent sign-in correction

- The interim shared Sparkle Suite sign-in implementation was incorrect because it prevented Louis from opening Control Center while Brittany's Workspace remained open. It was superseded in the same session.
- Control Center now uses its own dedicated username/password and a separate signed HTTP-only session. The credentials and operator audit identity are Vercel Production secrets only; no password, username secret, or provider credential was written to Git.
- Final commit `afa046de fix: separate Control Center credentials` passed 16 focused Control Center/authentication tests and the production build. It is deployed as `dpl_7YCHxB3GTe2F7QsEno4JM7R2MFSb`; both production Sparkle Suite aliases are assigned. Live browser verification completed the independent Control Center sign-in successfully.

---

## August 15, 2026 - Customer social links and Whatnot release

- Added **Whatnot** to the Workspace Customer-facing site setup social-handle fields. It accepts a simple Whatnot handle or a full canonical URL and publishes a valid Whatnot profile destination.
- Reworked customer-site social data so the homepage, Trade Board, and Join footer social row contains only rep-provided, saved links. Blank and placeholder values are not rendered; ordinary footer navigation is unchanged.
- A live Brittany audit identified a tenant-specific loophole after the initial change: her custom profile appended TikTok, VIP Group, a duplicate Facebook link, and Shop independently of saved settings. The same override pattern existed in the BlingKitchen and Mile High Fizz profiles. Those profiles now preserve the shared dynamic social collection.
- Released code commits `95a62f6c` and `50aa15c7` through Vercel production deployment `dpl_6c4JNQct8G9EoswBCTkAXauzZMs2`. Vercel alias inspection and HTTP checks confirmed both Sparkle Suite production domains resolve to it.
- Verification: focused customer-site suite passed 117 tests across preview/template and Britt With Bling/BlingKitchen public-site coverage; `npm run build` passed. A live Chrome inspection of `https://www.yoursparklesuite.com/brittwithbling` confirmed the rendered social row contains only Brittany's saved TikTok and Facebook links. The logged-in reviewer path remains blocked by the known too-short reviewer-token configuration and was not bypassed.

---

## August 13, 2026 - Brittany New Rep Onboarding Naming Release

- Renamed the active user-facing Team Management and private onboarding-site language from Start Strong to **New Rep Onboarding**. Existing private invite URLs remain unchanged, so no prior or future invite link is broken.
- Published Site version 4 for `https://brittwithbling-start-strong.louis526569.chatgpt.site` and updated its site title to Britt With Bling New Rep Onboarding. The Site build passed.
- Sparkle Suite commit `21012f73 feat: rename team onboarding links` passed the focused 116-test onboarding suite and production build. It is live in Vercel production as `dpl_ERSixRWrKpSfw74vgWp1AsAtRRwy`; both `www.yoursparklesuite.com` and the apex resolve there. Brittany's signed-in Team Management page was reloaded and visibly verified with the new label. The reviewer-token limitation remains unchanged and was not bypassed.

## August 9, 2026 - Brittany Team Management and Start Strong Release

- Reopened Team Management from its deliberate August 2 `Coming soon` hold. The pre-existing entitlement-backed control plane remains the source of truth: private invite creation, progress, participant-to-lead questions, lead replies, archive access, and the separate public Join Team-card manager.
- Built and published the public-but-unlisted, no-index Britt With Bling Start Strong Site at `https://brittwithbling-start-strong.louis526569.chatgpt.site`. It has no general sign-in gate; each participant must arrive through the existing high-entropy private invite URL.
- Added narrowly allowlisted cross-origin support to the three invite-token API routes. Only the published Start Strong Site origin receives CORS permission for onboarding-state reads and progress/message POSTs; arbitrary origins do not.
- Released exact application commit `20929d4b` to Vercel production deployment `dpl_7sQSTTFE8MF112p1yv3J5fcwZ8J1`. Vercel verified both `www.yoursparklesuite.com` and `yoursparklesuite.com` on that deployment. Focused Team Management/onboarding verification passed 116 tests and `npm run build` passed.
- Verified the live Team Management route responds and the Start Strong-origin OPTIONS preflight returns the strict expected headers. The public Site initially returned a 500 during edge rollout; its corrected second version was rebuilt, republished, and later returned HTTP 200. No participant, progress, or message record was created for this release. The existing reviewer-browser path remains blocked by the too-short reviewer-token configuration and was not bypassed with Louis's account.
- Corrected the final invite generator fallback so newly created Team Management onboarding pages use the published Codex Site, not the legacy Vercel Start Strong URL. Commit `98d8fa8f` deployed Ready as `dpl_9RtuFE9aZeZVMBU9PLmnvRme4MGn`; both Sparkle Suite domains resolve to that exact deployment and the live Site-origin preflight passed.

---

## August 9, 2026 - Brittany / Britt With Bling Beta Welcome and Billing Link

- Published a detailed, standalone welcome guide for Brittany at `https://brittwithbling-beta-welcome.louis526569.chatgpt.site`. It uses plain language and covers the private workspace, Nic-Nac, Calendar, Trade Board, customer-facing site, Customer List, Help & Resources, Team Management beta boundaries, feedback expectations, and the Stripe-only billing path.
- Corrected the initial Sites access configuration: Brittany's welcome page is **public/no-sign-in**, matching the established Heather and Brianna welcome-page model. An unauthenticated HTTP/content check returned the published Brittany welcome page successfully.
- Created an unsent Gmail draft for Brittany's exact existing Sparkle Suite account email. It links to the guide and live Sparkle Suite sign-in, leaves private sign-in details to a separate handoff, and does not contain credentials or payment data.
- Verified Stripe's exact active grandfathered $39/month subscription and matching historical payments for Brittany's existing account email. Linked only the confirmed Stripe customer and subscription IDs to Brittany's exact active `Britt with Bling` rep/subscription rows. No Stripe customer, subscription, payment, invoice, or other provider object was created or changed.
- The Stripe customer record's legacy display name differs from the Sparkle Suite rep name, but its email and active $39/month subscription match Brittany's active account. Preserve this verified linkage; do not rename or otherwise modify the Stripe provider record unless Louis explicitly authorizes an identity correction.
- The reviewer-browser path remains blocked by the known too-short reviewer-token configuration. It was not bypassed with Louis's personal account.

---

## August 4, 2026 - Customer-Site Media Placeholder Reliability

- Fixed the Bri's Glowtique preview overlap: an absent Showcase TikTok URL had returned its fallback content without the video-card wrapper, allowing its old visual elements to float into the adjacent explainer card.
- Empty Showcase and About media placements now retain their normal card dimensions and render the consistent non-interactive **Coming soon** state across standard customer-facing sites. Valid TikTok/video and photo media still render in place.

---

## August 4, 2026 - Bri's Customer-Site Footer Cleanup

- Removed Contact from the standard customer-site footer after review because there is no supported contact experience in this launch surface.
- Replaced the live FAQ link with the non-interactive label **FAQ · Coming soon** on Homepage, Trade Board, and Join. The old placeholder links could falsely imply a working FAQ/contact feature.

---

## August 4, 2026 - Customer Waitlist Removal Repair

- Added the operator-only **Remove** control to each Customer Waitlist entry in Control Center.
- Updated the interaction to the requested two-click confirmation: **Delete Jane Doe?** followed by **Delete Jane Doe**. Any failure is shown inside the dialog.
- Production logs showed that the initial delete request was reaching the database but failed because the foreign key's `ON DELETE SET NULL` action violated stale source constraints on both the linked launch build and agreement document. Applied migrations `20260804250000_ss_archive_launch_build_sources.sql` and `20260804260000_ss_archive_waitlist_agreement_sources.sql` to preserve those records with `source_removed_at` before allowing the waitlist deletion.
- A rollback-only linked-production test created a synthetic waitlist/build/agreement trio, deleted the synthetic row, asserted that both history records persisted with their waitlist links removed and archive timestamps present, and rolled all test data back. The known reviewer-token limitation remains in effect; do not use Louis's account for a destructive smoke action.

---

## August 4, 2026 - Customer List Import and Messages Separation

- Restored **Messages** as a separate disabled `Coming soon` Tool after the customer roster had accidentally displaced it. Customer List remains a working standalone Tool.
- Added customer-list import for CSV and modern Excel (`.xlsx`) files. Google Sheets are supported through its normal Download as CSV or Excel export.
- Import up to 250 contacts per batch. Existing contacts are matched within the rep's own workspace by normalized email or phone; blank source fields leave saved profile values untouched, while conflicting email/phone matches are skipped for manual review.
- Imports are deliberately profile-only: no spreadsheet can create SMS or email consent, and no existing consent is changed.

---

## August 2, 2026 - Customer-Facing Site Setup, TikTok, and About Narrative

**Customer-site setup and copy:**
- Renamed the workspace tool to **Customer-facing site setup**, added a
  customer-site preview action, and corrected the public announcement row so
  it repeats only the saved ticker text.

**Homepage media contract:**
- Defined three explicit placements: Showcase is TikTok/video only; About
  media 1 and 2 each accept a photo or TikTok/video. Removed Showcase photo
  upload and repaired About upload feedback/save behavior.
- TikTok URLs and embed markup are canonicalized and rendered inline. Videos
  autoplay muted once visible, loop, and use one Sparkle Suite mute/unmute
  control. TikTok native controls are hidden to avoid duplicate mute controls
  and click-through navigation.
- Captions remain only for photos. A video clears its persisted caption and
  the setup UI removes the Caption control entirely for video cards.

**About narrative:**
- Reintroduced the retired onboarding capability as a durable normal setting,
  `site_settings.about_narrative`, via migration
  `20260802170000_ss_add_about_narrative.sql`.
- Nic-Nac's `update_site_setting` tool and system guidance now support free
  talk, 2–3 polished choices, then publication of the approved narrative.
- The initial manual narrative textarea was intentionally removed after review.
  The setup card is instruction-only with **Write with Nic-Nac**; it does not
  duplicate the narrative editor or show draft copy.

**Release and verification:**
- Released `9dda0974`, `8c70aa2a`, and `778bbe3e` on
  `codex/nic-nac-trade-hardening`. Each passed targeted Vitest coverage and a
  Next.js 16.2.1 production build. Vercel confirmed both live domains on the
  final exact commit; the apex redirects to canonical www.
- Read-only authenticated visual inspection confirmed the new setup placement
  and copy before the final caption cleanup. Reviewer-browser smoke remains
  blocked by the known too-short reviewer token.

**Lessons learned:**
- Do not show a disabled control when a media mode makes it inapplicable;
  remove it.
- Keep authoring ownership singular: Nic-Nac owns conversational About copy;
  setup points reps into that workflow rather than adding a competing editor.
- Create a new migration after the latest already-applied remote timestamp to
  prevent migration-order drift.

---

## August 2, 2026 - Workspace Beta Simplification and Live Queue Guide

**Workspace and customer-site changes:**
- Removed the redundant Nic-Nac `Check my board` quick action and composer
  suggestion chips.
- Moved Jewelry Library from the bottom navigation into Tools, leaving the
  shared workspace with Nic-Nac, Trade Board, Calendar, and Tools as its four
  primary tabs.
- Kept `Add a piece` in the left rail and kept the only `Add a show` action in
  the right-rail Upcoming Show card, giving the Nic-Nac conversation more room.
- Preserved Team Management and Bulk Collection Intake implementation while
  presenting both as disabled `Coming soon` tools for the first beta testers.
- Simplified Live Site Preview to `Back to workspace` and `Open full site` by
  removing `Refresh preview` and its preview-only Nic-Nac drawer control.
- Repaired the customer-site explainer card with semantic surface-owned text
  colors across all skins and refreshed the static stylesheet cache key so the
  fix reached the shared customer-site pages.

**Live Queue work:**
- Assigned Louis's protected admin/demo workspace a convention-compliant Live
  Queue code. The exact private code was stored in private Open Brain recall
  and intentionally omitted from the Git-tracked vault.
- Added a Live Queue entry to Tools for every workspace. Its subpage shows the
  authenticated rep's assigned code, the canonical Chrome Web Store listing,
  Bomb Party Party Orders, six setup steps, a pre-show checklist,
  troubleshooting guidance, customer-site/help actions, and a plain-English
  explanation of what the extension reads and does not change.
- Kept the extension boundary intact: no Chrome extension source/package,
  Chrome Web Store settings, production queue data, or Bomb Party behavior was
  changed.

**Onboarding and billing restructure:**
- The same session shipped the separately documented operator-led five-day
  trial model below: waitlist-first acquisition, operator provisioning,
  first-sign-in trial activation, twice-entered strong passwords, paid
  conversion without setup loss, and restricted account/billing/security/help
  access after trial expiry or billing delinquency.

**Verification and release:**
- Session commits after the prior documented tip were:
  `426a78a7`, `36318fcd`, `0f6b8704`, `4aafc66b`, `e9c64ce0`,
  `9394ce5e`, `04dc49dd`, `d7253e99`, `ff244ea9`, `2f5a745e`,
  `5ebc995d`, and `1ca7b48d`.
- The operator-trial release passed 354 focused tests plus Finder boundary
  coverage and a Next.js 16.2.1 production build. The final Live Queue guide
  passed 130 focused tests and another production build.
- Final application tip
  `1ca7b48d9f9ba725e178e3ded5ec0c32eda12376` deployed Ready as
  `dpl_psy1p3NGqfp9ygM4a77ncxBKfMK5`; Vercel confirmed the `www` and apex live
  domains on that exact deployment.
- Signed-in live-domain browser verification confirmed the new Tools entry,
  assigned workspace code, canonical external links, guide copy, and Back to
  Tools navigation. Louis reviewed the result and reported nothing to fix or
  add.

**Operational lesson:**
- A transient timeout to one GitHub edge blocked a normal push even though
  GitHub status and API access were healthy. Experimental REST fallbacks were
  stopped before moving the branch when exact blob/commit identity differed.
  Pinning the standard Git push to another official reachable GitHub edge
  preserved exact commit identity and completed the push. Future recovery
  should prefer an ordinary exact-SHA Git transport through a verified
  reachable official edge; never move the protected branch from a normalized
  or reconstructed API commit.

---

## August 2, 2026 - Operator-Led Five-Day Trial Onboarding

**Outcome:**
- Replaced public self-serve acquisition with the existing waitlist while
  preserving protected synthetic reviewer paths.
- Added Control Center provisioning for a confirmed rep account with a pending
  fixed five-day trial. The trial starts atomically on first successful sign-in
  and credentials are handed over manually without an automatic email.
- Centralized workspace/customer-site access so active paid accounts and
  unexpired trials remain open while past-due or expired accounts retain only
  account, billing, password/security, recovery, and help access.
- Added twice-entered strong password change and recovery flows.
- Converted trial checkout into the normal paid subscription without repeating
  first-run setup; retained the revoked trial as audit history.

**Verification:**
- Applied migration `20260802160000_ss_operator_workspace_trials.sql` to the
  linked production Supabase project after a clean dry run.
- Twenty-three focused suites passed with 354 tests; additional public Finder
  and trial-surface coverage passed.
- Next.js 16.2.1 production build passed, including TypeScript and all 30 static
  page generations.
- Application commit `04dc49ddcb9e8a1a2a547e82d17f5bf21a5434ee`
  deployed READY as `dpl_Ev92KLHuTSckDFiRY68SNSXgXfsn`; both
  `https://www.yoursparklesuite.com` and the apex resolved to that deployment.
- Live public smoke confirmed waitlist-only entry, `/start` redirection to the
  waitlist, login/password-recovery visibility, blocked public signup (`403`),
  blocked anonymous trial activation (`401`), a representative customer route,
  and no recent Vercel runtime errors. Logged-in synthetic reviewer smoke still
  requires the separately tracked production reviewer-token repair.

---

## August 1, 2026 - Trade Board Ticker Typography Repair

**Audit finding:**
- The empty-state speed repair correctly restored measured motion but left the
  Trade Board copy at medium `500` weight. The shared React site shell also
  retained medium weight for both empty and populated Trade Board items.

**What changed:**
- Trade Board ticker copy now uses true bold `700` weight for both populated
  listings and the empty-state message.
- Announcement copy remains at its separate established `500` weight.
- The correction covers the shared React shell and the static Homepage, Trade
  Board, and Join pages used by every current skin.
- The skin contract and regression suite now lock this visual distinction.

**Verification:**
- Computed local styles confirmed announcement weight `500` and Trade Board
  weight `700`.
- Home, Trade Board, and Join retained the exact 55.2-pixels-per-second Trade
  Board pace after the font-metric change.
- Six public-site skin and route suites passed: 107 tests.
- The Next.js 16.2.1 production build passed, including TypeScript and all 30
  static page generations.
- Application commit: `929638daff8fd8f8798e3a86196b16d4d558cbe2`.

---

## August 1, 2026 - Empty Trade Ticker Constant-Speed Repair

**Audit finding:**
- Louis's diagnosis was correct: when a customer had no Trade Board listings,
  the renderer emitted one unmarked empty-state span. It therefore had no
  measurable repeated segment and fell back to a fixed 60-second animation,
  producing an observed speed of about 4.9 pixels per second instead of the
  established 55.2-pixels-per-second Trade Board pace.

**What changed:**
- The empty Trade Board state is now a real ticker item that enters the same
  duplicated, segment-marked loop as populated inventory.
- The repair covers the shared React site shell plus the static Homepage,
  Trade Board, and Join renderers, so every current skin and future shared skin
  inherits the same behavior.
- The skin contract now explicitly requires empty and short ticker states to
  use measured segment distance divided by the row's pixels-per-second
  standard; fixed or minimum-duration fallbacks are not acceptable pacing.

**Verification and release:**
- Six public-site skin and route suites passed: 107 tests.
- The Next.js 16.2.1 production build passed.
- Exact live customer-domain browser measurements showed Trade Board motion at
  about 55.2 pixels per second on Homepage, Trade Board, and Join while
  announcement motion remained at about 46 pixels per second.
- Production deployment `dpl_2kboNgryVqYjRkQN3JsSH8JZRFpt` became Ready from
  exact application commit `8f6f5b6a78603e5fa40a8a4ffb90eab5b3097c11`
  with both live domains assigned.
- Production error and fatal logs were empty during the verification window.

---

## August 1, 2026 - Skin-Aware Customer-Site Card Readability

**Audit finding:**
- The Emerald Garden signup card was not empty. Its heading, description, and
  supporting copy were present, but an Emerald section-level override rendered
  them white on an ivory card surface.

**What changed:**
- Customer-site card surfaces now define semantic primary, muted, and accent
  text tokens.
- The signup card and its labels, placeholders, consent text, and headings
  consume those surface tokens instead of inheriting the surrounding section
  color.
- Every registered card surface has explicit semantic token coverage, and the
  skin contract now requires surface-owned readability rather than one-off
  descendant overrides.

**Verification and release:**
- Six public-site skin and route suites passed: 107 tests.
- The Next.js 16.2.1 production build and local Amethyst link verification
  passed.
- Exact live-domain browser smoke verified the Emerald signup card uses an
  ivory background with dark emerald primary text, muted supporting text, and
  a readable emerald accent. All seven form controls and the submit button
  were visible and enabled; no form was submitted and no customer data was
  changed.
- Production deployment `dpl_ET3A3q8orA3uya6oE6b1myQZJjEr` became Ready from
  exact commit `44c5a79ca5c6e0204cbb0d399260401eebb9dfe6` with both live
  domains assigned. The apex redirects to the `www` live surface.
- Production error and fatal logs were empty during the verification window.

---

## August 1, 2026 - Emerald Garden Customer-Site Parity Repair

**Audit findings:**
- The announcement ticker had an Emerald-only dark text override on a dark
  background. The shared measured ticker engine itself was already correct:
  46 pixels per second for announcements and 55.2 pixels per second for Trade
  Board inventory.
- Emerald Garden uniquely wrapped the homepage hero in a large blurred glass
  box over four pale radial blobs. The other established skins use the shared
  full-bleed hero composition.
- Homepage, Trade Board, and Join retained the shared Amethyst content and
  feature structure; the regression was visual, not a missing-content fork.

**What changed:**
- Announcement text is explicitly white with champagne separators; the light
  reverse Trade Board ticker retains dark readable text.
- Homepage, Trade Board, and Join use one restrained full-bleed emerald
  gradient treatment.
- The homepage-only oversized glass container and pale radial blobs were
  removed. Join retains its smaller standard hero card structure.
- Regression coverage protects the shared ticker-speed contract, readable
  announcement color, and Emerald hero composition.

**Verification and release:**
- Four focused template/preset suites passed: 88 tests.
- Static Amethyst and public-site route suites passed: 18 tests.
- Local homepage and Trade Board link verification returned HTTP 200, and the
  Next.js 16.2.1 production build passed.
- Exact live-domain browser smoke verified Homepage, Trade Board, and Join for
  The Dudes Fizzfest. Announcements computed white; the live announcement
  ticker measured 45.69 pixels per second against the configured 46; the Trade
  Board track reported the shared 55.2 setting; all three routes retained their
  shared content and Live Reveal Queue surfaces.
- Production deployment `dpl_F7FSNS9fGZiKQ1nRQxAXzGUdEUka` became Ready from
  exact application commit `4a2917c8` with both `www.yoursparklesuite.com` and
  the apex assigned. The apex redirects to the `www` live surface.
- Production error and fatal logs were empty during the verification window.

---

## August 1, 2026 - Public Site Settings Wiring Audit and Repair

**Exact-account audit:**
- Audited Louis's protected admin/demo workspace read-only with an exact
  `louis@neonrabbit.net` identity guard. The account remained `active`,
  `dashboard_unlocked`, and on its established non-live internal demo
  entitlement; no signup, checkout, Stripe, billing, or production-data
  mutation was performed.
- The uploaded Showcase photo and saved captions were present in durable Site
  Settings data and rendered on the rep-targeted Amethyst customer homepage.
- Both submitted TikTok values were absent from storage. The former normalizer
  only accepted a plain URL, silently converted pasted TikTok embed markup to
  an empty value, and still returned a successful save response.
- The workspace incorrectly reported `site setup in progress` because its
  status gate required a vanity slug even though the account had a valid
  rep-targeted public-site URL.
- The public-site address and status card were informational only, leaving no
  direct way to open the customer site from those workspace surfaces.

**What changed:**
- TikTok media fields now accept either full TikTok embed markup or a plain
  HTTP(S) video URL and store the canonical URL.
- Invalid nonblank media input now returns a visible field-specific error
  instead of silently discarding the value.
- Any valid customer-site URL, including the rep-targeted fallback, counts as a
  live site.
- The header customer address and right-rail `Open site` action now open the
  existing embedded Live Site Preview. The header copy action remains
  available.
- The oversized `Sparkle with us.` bubble and redundant `Preview site` header
  action remain removed.

**Verification and release:**
- Focused Site Settings, dashboard, and Amethyst public-renderer coverage
  passed: 4 files, 167 tests.
- The full Next.js 16.2.1 production build passed with the active-branch gate.
- Local synthetic reviewer smoke proved a rep-targeted customer URL shows
  `Your site is live`, exposes `Open site`, and loads the exact customer
  homepage inside Live Site Preview.
- Exact live-domain smoke on Louis's signed-in workspace verified the header
  address is actionable, the right rail says `Your site is live`, `Open site`
  loads the embedded customer homepage, and the profile shows Louis Chapman
  above The Dudes Fizzfest.
- The live rep-targeted customer homepage rendered the exact Supabase-hosted
  uploaded photo plus the saved `Louis` and `testing` captions.
- Production checkpoint:
  `86feb94 fix: wire public site settings and access`.
- Production deployment `dpl_3ZeRTLEqwSyE2neQvvekoHcxKNmy` became READY from
  exact commit `86feb94dcaa08a6ee9ae702de30e095c31583ff4`, with both
  `www.yoursparklesuite.com` and the apex assigned. The apex redirects to the
  `www` live surface.
- Production runtime error/fatal logs for the new deployment were empty during
  the verification window.
- The two previously pasted TikTok values cannot be recovered because the old
  code discarded them before persistence. They must be pasted once more after
  this release; future invalid input will fail visibly instead of appearing to
  save.
- The token-gated production synthetic-reviewer launcher remains a separate
  environment follow-up because the configured token is shorter than the
  route's 12-character production minimum. No production secret was changed.

---

## August 1, 2026 - Recovered Homepage Media Controls

**Historical recovery:**
- Audited reachable, reflog, unreachable, and preserved worktree Git history
  instead of rebuilding the old editor from memory.
- No committed Site Settings media editor was found. The exact pre-rebuild
  product contract was recovered from the Master Build Plan and Amethyst
  DesignKit: three homepage media placements, each accepting a personal photo,
  personal video, or TikTok source.
- The current public-site renderer already divided those three placements into
  `Showcase`, `About media 1`, and `About media 2`. The removed hero-image
  control remains removed.

**What changed:**
- Restored one editor card for each of those three homepage placements in
  workspace Site Settings.
- Each placement now supports a photo upload, its own TikTok/video URL,
  optional caption, preview, and photo removal.
- Added authenticated, rep-scoped media upload handling and durable
  `homepage_media_slots` persistence.
- Connected saved media to the existing customer-facing Amethyst homepage
  renderer, including the Showcase image/video and both About placements.

**Verification and release:**
- Focused Site Settings, route, dashboard, and public-site mapping tests pass:
  4 files, 141 tests.
- The Next.js 16.2.1 production build passes with the active-branch gate.
- Migration `20260801183000_ss_homepage_media_slots.sql` was applied to the
  linked production database.
- Local safe-reviewer browser smoke reached Britt Test Rep Site Settings,
  displayed all three media cards, saved Showcase TikTok/caption data, and
  rendered that caption on the customer homepage. The reviewer account was
  reset afterward.
- Production code checkpoint:
  `9f35cd0 feat: restore homepage media controls`.
- Production deployment `dpl_Ghyo6Rh1dGNTwAZx7Q3J4n347sfj` became Ready with
  both `www.yoursparklesuite.com` and the apex assigned.
- A live synthetic reviewer-authenticated Site Settings request returned HTTP
  200 with exactly `showcase`, `about_1`, and `about_2`. The live Britt Test Rep
  customer homepage rendered without a framework error.
- The token-gated `/start` production reviewer button still needs a separate
  environment repair: the configured reviewer token is shorter than the
  route's 12-character production minimum. No production secret was changed
  during this feature release.

---

## August 1, 2026 - Persistent Public-Site and Live Queue Header References

**What changed:**
- Added the account's canonical public-site address to the persistent Sparkle
  Suite workspace header.
- Added a small copy control that copies the full HTTPS customer-site link.
- Added the account's exact stored Live Queue sync code beside the site link so
  it remains available during Live Queue setup and reset support.
- Kept both utilities visible in the responsive mobile header.
- The workspace only reads these existing account values. It does not create,
  replace, reset, or mutate Live Queue codes or queue data, and no extension
  or Chrome Web Store files were touched.
- Implementation checkpoint:
  `83ea2de feat: add workspace header quick references`.

**Verification:**
- Focused header, workspace shell, authenticated profile, and reviewer-smoke
  tests passed: 4 files, 118 tests.
- The full Next.js 16.2.1 production build passed with the active-branch gate.
- No personal account or signed-in browser session was used for testing.

---

## August 1, 2026 - Public Site Status Card Restoration

**What changed:**
- Restored the useful `Public Site` card to the Nic-Nac right rail after an
  earlier interpretation removed the whole card.
- Kept the specifically rejected oversized `Sparkle with us.` preview bubble
  and both redundant `Preview site` controls removed.
- The compact card now shows the real live/setup state without acting as
  another preview launcher.
- Implementation checkpoint:
  `ded4a51 fix: restore public site status card`.

**Verification:**
- Focused Nic-Nac workspace, shell, and reviewer-smoke tests passed: 3 files,
  117 tests.
- The full Next.js 16.2.1 production build passed with the active-branch gate.
- No personal account or signed-in browser session was used for testing.

---

## August 1, 2026 - Workspace Header Rep and Live-Show Identity

**What changed:**
- Corrected the workspace profile lockup so the first line is the rep's name
  and the second line is the stored live-show/business name.
- Added the rep business name to the authenticated `/api/nic-nac/me` profile
  payload as a resilient fallback when Site Settings is delayed.
- Prevented case-insensitive duplicate names. If the live-show name is empty
  or identical to the rep name, the header now says
  `Live show name not set` instead of repeating the person.
- Implementation checkpoint:
  `01ffdef fix: show live show name in workspace header`.

**Production data finding:**
- A read-only exact-email lookup confirmed the protected Louis admin/demo
  account currently stores `Louis Chapman` in both `display_name` and
  `business_name`; no separate live-show name exists in its setup profile.
- No production account, authentication, billing, or setup data was changed.

**Verification:**
- Header/profile/workspace/reviewer tests passed: 4 files, 118 tests.
- Auth boundary tests passed: 2 files, 6 tests.
- The full Next.js 16.2.1 production build passed with the active-branch gate.

---

## August 1, 2026 - Bulk Collection Intake Naming and Workspace Back Navigation

**What changed:**
- Renamed the workspace tool from `Collection Intake` to
  `Bulk Collection Intake` in the Tools launcher and intake screen.
- Added one shared back-navigation row to every non-home workspace section.
- Primary sections return to Nic-Nac. Nested Tools sections, including Bulk
  Collection Intake, Business Tools, Team Management, Site Settings, Help &
  Resources, and Account, return to Tools.
- The implementation checkpoint is
  `632ec87 feat: add workspace back navigation`.

**Verification:**
- Focused workspace, intake, shell, and reviewer-smoke tests passed: 4 files,
  119 tests.
- The Next.js 16.2.1 production build passed with the active-branch gate.
- Local in-app browser reviewer controls rendered, but the local synthetic
  workspace remained on `Loading setup...`; no personal account was used.
- Production deployment and exact live-domain verification remain the release
  closeout step for this checkpoint.

---

## July 31, 2026 - Single Live Surface Release Rule Correction

**Rule corrected:**
- Sparkle Suite live and demo are one surface. "Demo" means safe
  reviewer/test data or token-gated reviewer mode inside the live product; it
  is not a separate environment, deployment lane, or review domain.
- All approved work flows from the exact active-branch tip to Vercel
  production and is reviewed at `https://www.yoursparklesuite.com`.
- `https://yoursparklesuite.com` must resolve to the same production
  deployment.
- Raw Vercel deployment URLs and `sparkle-suite-demo.vercel.app` are
  provenance evidence only. They are not ordinary review targets and do not
  prove a release is complete.

**Repository safeguards updated:**
- Replaced the obsolete `sparkle-suite-demo-smoke` skill with
  `sparkle-suite-production-smoke`.
- Updated `AGENTS.md`, active-branch configuration, current vault memory,
  reviewer-smoke standards, and related project skills.
- Changed deployed Nic-Nac smoke-script defaults from the former demo hostname
  to `https://www.yoursparklesuite.com`.
- Preserved older deployment records as historical evidence only.
- Focused policy/smoke-harness tests passed: 3 files, 19 tests.
- Full Next.js production build passed with the active-branch gate.

---

## July 31, 2026 - Production Restore, Louis Account Repair, and Safety Closeout

**Incident and recovery:**
- A voice-led session used historical Sparkle Suite branches/deployments without first proving the active repo, branch, commit, and alias target. `yoursparklesuite.com`, the rep workspace, and customer-facing sites were temporarily reverted to old application state.
- Recovery switched to Git/Vercel evidence: restored the known-good application history, shipped `af7cef25 fix: restore landing account sign-in controls`, and verified deployment `dpl_3WtzJMr5fK7LMEqTrVqJCJLZSWqL` on the live custom domain.
- After the landing was restored, Google auth for `louis@neonrabbit.net` still opened Stripe because the original admin/demo account was incorrectly `onboarding` / `checkout_required`, had no subscription/entitlement, and held an accidental founder reservation.
- The exact identity-guarded production repair released the founder reservation, restored the rep to `active`, restored setup to `dashboard_unlocked`, and added a `$0`, non-live `internal_demo` entitlement with an audit marker. No live Stripe subscription or charge was created as part of the repair, and provider evidence was not deleted.
- Signed-in Chrome verification reached Louis Chapman's `/nic-nac` workspace on the exact live domain and remained there after the page settled. Louis confirmed the system was back in business.

**Safeguards recorded:**
- Added a production-provenance and account-safety section to `AGENTS.md`.
- Expanded `sparkle-suite-demo-smoke` with the Louis admin/demo invariant and exact-domain/post-auth checks.
- Added the full incident/recovery runbook and reusable start/in-session prompts at `docs\sparkle-suite\incidents\2026-07-31-production-rollback-and-checkout-routing.md`.
- Sparkle Suite production work must use only `C:\Users\louis\sparkle-suite-repo` / `louis623/sparkle-suite`; historical folders, branches, and deployments are evidence, not release sources.
- Voice mode is paused for Sparkle Suite repo, deploy, auth, billing, and production-data work until Louis explicitly re-enables it.

**Non-destructive branch containment:**
- Proved GitHub's legacy `main` was still the default even though it diverged
  from the verified active line by 483 active-only and 20 main-only commits.
  Corrected GitHub's default branch and local `origin/HEAD` to
  `codex/nic-nac-trade-hardening`.
- Verified through Vercel's authenticated project API that
  `codex/nic-nac-trade-hardening` was already the configured production
  branch; no Vercel setting change was required.
- Classified every known remote/local branch and attached worktree in
  `docs\sparkle-suite\operations\branch-register.md`. Fully contained history
  is archive-safe; divergent or unique work is quarantined/needs-review.
- Created and pushed nine annotated safety/archive tags covering the verified
  live checkpoint, active line, legacy main, incident lines, Collection Intake
  line, and fully contained phase branches.
- Created and verified a complete all-ref Git bundle plus a separate zip of
  the uncommitted detached `c385` demo/test files before containment. No branch,
  worktree, commit, or uncommitted source file was deleted or rewritten.
- Added `config\active-branches.json`, the fail-closed
  `scripts\check-active-branch.mjs`, local pre-push hook, npm predev/prebuild/
  prestart gates, focused policy tests, and explicit `AGENTS.md` stop rules.
- The policy guard passed locally, five focused tests passed, and the full
  Next.js production build passed with the prebuild branch gate.
- The first guarded Vercel build stopped safely because Vercel's temporary
  clone did not expose a normal Git `origin`. Commit
  `37c89c86 fix: validate Vercel branch provenance` corrected the environment
  adapter to validate Vercel's injected repository-owner, repository-slug, and
  branch metadata without weakening the deny-unlisted policy.
- Vercel deployment `dpl_HHZmsd7AK6iVTtKdDRKtZUmLfxA2` visibly passed the
  repository/branch gate and became READY. The stable demo alias was promoted
  to that exact deployment, and a five-second Chrome settle check remained on
  the Sparkle Suite landing page with no Stripe redirect. This release did not
  use Louis's personal production account.
- GitHub's all-branches-except-active quarantine ruleset is configured with
  creation/update/deletion/force-push restrictions, but GitHub requires an
  identity-verification email before saving it. The email was not triggered
  without Louis's action-time approval.

---

## July 26, 2026 - Emerald Garden Skin and Brianna Beta Account

**What changed:**
- Added Emerald Garden as a reusable rep-selectable Amethyst customer-site skin. The skin captures the green, neutral, botanical/spa direction of Brianna's former Readdy site without creating a bespoke site fork.
- Preserved legacy appearance-preset identifiers while adding `emerald_garden`, corrected inactive Trade filter contrast, and hardened generic Join template data so new accounts do not inherit another rep's name or location.
- Created Brianna Williams's standard Sparkle Suite beta account for `Bri's Glowtique` with public slug `brisglowtique`, Emerald Garden selected, real Bomb Party/team/shop/social details, and an active internal-beta subscription with no Stripe customer or live charge.
- Kept the account intentionally sparse: no fake inventory, trades, customers, join roster, or calendar events. Her existing live queue code `BGL-2463` was safely associated with the new account.
- Did not connect `brisglowtique.com`, revive her bespoke Readdy site, or add Scentsy, Celesty, Monat, or other side-business scope.

**Verification and release:**
- Five focused files / 111 tests passed after the final generic Join-data correction. The broader focused skin pass had already reached eight files / 135 tests.
- Local and Vercel Next.js 16.2.1 production builds passed.
- Brianna's credential authenticated successfully. Live stable-demo checks confirmed Emerald Garden on Home, Trade, and Join; the Join page uses `Hustle and Heart / Fizz City`, has the correct Bomb Party starter link, contains no `Sparkle by Sasha` or `Austin, TX` placeholder, and showed no framework overlay.
- Released implementation commit `2583f896 feat: add Emerald Garden customer-site skin`.
- Stable demo `https://sparkle-suite-demo.vercel.app` points to deployment `dpl_9HNuzkTpmwvw5mzJoMZAFSGWThb4` at `https://sparkle-suite-13dk4smk4-louis-2849s-projects.vercel.app`.

**Decisions and remaining work:**
- Brianna receives the normal Sparkle Suite workspace and customer-site system, with Emerald Garden as her selected standard skin. No bespoke exceptions.
- Honor the previously offered original `$39/month` rate when billing begins; the current beta is `$0` and must not trigger a live charge.
- Louis still needs to conduct the final hands-on smoke of Brianna's workspace, homepage, Trade Board, Join page, links, and mobile presentation before beta handoff is considered accepted.
- Brianna's temporary login is saved in Louis's private Open Brain recall entry by explicit request and is excluded from the Git-tracked vault. Rotate it after handoff or first use.

---

## July 25, 2026 - Workspace Card Polish, Release Flow Standardization, and Session Closeout

**What changed:**
- Replaced the junk static `Calendar` label in the workspace Upcoming Show card with real next-show content. When a real event exists, the card now shows the next show's weekday, date, time, time zone, and event name, and the summary links into Calendar for more detail.
- Added the agreed empty state for that card: `No upcoming shows` plus an `Add a show` action so reps are not left with a dead card when the calendar is empty.
- Updated the Trade Board top-right button copy from `View customer board` to `Customer view`.
- Added the durable default release rule to `AGENTS.md`: approved Sparkle Suite code/content work now automatically includes commit, push, deploy, stable-alias promotion, and verification unless Louis explicitly says the work is local-only or skips one of those release steps.
- Investigated the suspicious Stephanie Graham email as a read-only operational check. The connected Gmail mailbox available to Codex was `louischapman1@gmail.com`, not the Neon Rabbit mailbox that received the message, so message-header verification was not possible from the tool side. Read-only Sparkle Suite data checks found no exact match for `cookiefountainadk@gmail.com` in the waitlist, intake submissions, rep records, or linked subscription rows, which supported treating the email as likely spam/phishing or a mistaken recipient rather than a real Sparkle Suite customer issue.

**Verification and release:**
- Upcoming Show card work passed focused workspace tests with 116 tests and passed local plus Vercel production builds before release.
- Trade Board copy work passed a focused workspace/dashboard test slice with 93 tests before release.
- Latest pushed implementation checkpoints from this session are:
  - `5ad2b43 feat: show next event in workspace card`
  - `7cafd213 chore: standardize Sparkle Suite release flow`
- Stable demo alias `https://sparkle-suite-demo.vercel.app` currently points to deployment `dpl_6w4oBPPNqGJH6i39MyXa2NCMR5Hp` at `https://sparkle-suite-2rho3mzu4-louis-2849s-projects.vercel.app`.
- For the release-flow checkpoint, stable `/start` returned HTTP 200 after alias promotion. Reviewer-smoke controls were not available on that route during the direct check, so no personal-account browser session was used.

**Decisions and lessons carried forward:**
- Shared workspace side cards must either show real actionable data or an explicit empty state with the right next action. A generic label like `Calendar` is dead weight if it does not communicate or do anything.
- When a summary card implies navigation, the useful content itself should be the click target rather than forcing the rep to hunt for a separate control.
- Louis's standing expectation for approved Sparkle Suite changes is now operationalized in repo instructions: commit, push, deploy, promote the stable demo alias, and verify the stable review URL by default.
- Operational investigations should distinguish mailbox/tooling limits from product evidence. In this case, the Gmail connector mismatch meant Codex could not verify the sender headers directly, but the absence of any matching waitlist, intake, rep, or subscription record was still useful evidence for triage.

---

## July 11, 2026 - Open Brain Session Closeout

**What was captured:**
- Confirmed the full `codex/nic-nac-trade-hardening` workspace UI sequence is preserved in Open Brain, including the Live Site Preview workbench, optional Nic-Nac sidecar, global/account-generic branding and copy cleanup, duplicate-card removal, viewport-contained chat shell, compact header correction, bottom-navigation containment, verification evidence, commit history, and final stable-demo deployment.
- Confirmed the key product decisions are recorded: Live Site Preview is an editing context; Nic-Nac starts closed and is user-toggleable; shared workspace behavior must work for every current/future/demo account; the inline composer replaces only the redundant top search field, not the entire product header; workspace images must be real or absent; and direct workflow language should replace vague labels.
- Confirmed the process lessons are recorded: questions are not implementation approval; stop immediately when Louis pauses work; use real functionality smoke for shell redesigns; verify navigation by viewport bounds; keep testing proportional; and stop cycling through browser/server launch methods when the code gates are green and the testing integration itself is the blocker.
- No additional application code, commit, push, deployment, database data, or customer account state changed during this memory-only closeout.

**Current handoff:**
- Final implementation commit: `a8b7e1d4 fix: restore compact workspace header` on `codex/nic-nac-trade-hardening`.
- Stable review target: `https://sparkle-suite-demo.vercel.app`, pointing to deployment `dpl_CMJ3bWJyfx3eDNULcpQvVkvFMCsH` / `https://sparkle-suite-lx0ohg5f7-louis-2849s-projects.vercel.app`.
- Remaining immediate item: Louis's final deployed desktop/mobile acceptance smoke for the July 10 workspace UI.

---

## July 10, 2026 - Live Preview Workbench and Rep Workspace UI Closeout

**What changed:**
- Restored Nic-Nac inside Live Site Preview as a rep editing workbench. The toolbar now centers four equal-size controls in a 2x2 layout: Back to workspace, Refresh preview, Open full site, and Open Nic-Nac.
- Changed Refresh preview from a solid pink primary button to the same white background/pink text treatment as the other preview controls.
- Made the preview sidecar dynamic in `50051b8c`: Nic-Nac is closed by default, `Open Nic-Nac` opens the chat beside the desktop preview, and the control changes to `Close Nic-Nac` so reps can reclaim the larger preview area. The sidecar uses the current account/site context and is not Heather-specific.
- Simplified workspace branding across all accounts and demos: removed the oversized fake purple Nic-Nac mark, reused the compact pink `N` chat mark beside the Nic-Nac heading, centered the Sparkle Suite seal letter, changed the seal/border to Nic-Nac pink, and added the smaller `Workspace` subtitle below Sparkle Suite.
- Renamed `Swap cleanup` to `Trade follow-up` and changed `View full today` into the clearer `Open Trade Workspace` button.
- Removed duplicate left Trade Board / Upcoming Show cards and the right Active Board card, allowing remaining cards to move up naturally.
- Reworked the rep workspace shell so the browser page does not need to scroll to reach the Nic-Nac composer or bottom navigation. The shell is viewport-contained, Nic-Nac conversation content owns the internal scroll, and chat typography was reduced approximately 20% for denser reading.
- Corrected the header after an over-removal in `1f2b6a6e`: the final `a8b7e1d4` restores the compact Sparkle Suite Workspace header but leaves out only the redundant `Ask Nic-Nac anything...` search field. It also reduces tab heights and increases bottom/safe-area padding so navigation icons remain inside the shell.
- Final commit `a8b7e1d4 fix: restore compact workspace header` was pushed on `codex/nic-nac-trade-hardening`.

**Verification and release:**
- Focused tests passed: 3 workspace files / 115 tests. Adjacent Nic-Nac branding and font-scale tests passed: 2 files / 15 tests.
- Local production build passed with Next.js 16.2.1. Vercel build also passed and deployment `dpl_CMJ3bWJyfx3eDNULcpQvVkvFMCsH` reached Ready at `https://sparkle-suite-lx0ohg5f7-louis-2849s-projects.vercel.app`.
- Local synthetic reviewer smoke verified the final desktop workspace at 1280x720: header visible, redundant header search count `0`, document/client height both `720`, all five bottom tabs fully above the viewport edge, no framework overlay, and no console warnings/errors.
- The in-app Browser DOM snapshot function failed during the smoke. Bounded page evaluation and screenshot capture still worked, but the mobile pass was not completed before Louis asked to stop the smoke loop and ship. Louis chose to perform the final deployed smoke himself.
- Stable demo `https://sparkle-suite-demo.vercel.app` was promoted to the new deployment and `/start` returned HTTP 200 with the expected page title.

**Decisions and lessons carried forward:**
- Live Site Preview is an editing surface: preview and Nic-Nac must coexist, while the rep controls whether chat consumes screen width.
- Workspace shell/UI changes are global account behavior unless explicitly scoped. Do not hard-code customer-specific assumptions into shared workspace components or reviewer demos.
- Remove redundancy by preserving the strongest instance of a control. The inline Nic-Nac composer replaces the top search field; it does not justify removing the entire product header.
- App-shell navigation must be proven by element bounds and viewport containment, not only by CSS assertions or a cropped screenshot.
- Keep verification proportional. When the requested code tests/build are green and a browser capability itself becomes the blocker, report it promptly, use one supported fallback, and do not cycle through repeated server/browser launch strategies. If Louis elects to smoke the deployment, release cleanly and hand off the exact stable URL.
- Stop immediately when Louis pauses work, and do not resume until he explicitly approves continuation.

---

## July 9, 2026 - Nic-Nac-First Workspace Shell Recovery and Asset Authenticity

**What changed:**
- Shipped the Nic-Nac-first / Concept 1 workspace shell direction on branch `codex/nic-nac-trade-hardening`, then repaired concrete functionality regressions Louis found during review.
- Commit `1df7e780 fix: wire Nic-Nac workspace header controls` made the top "Ask Nic-Nac anything..." control a real input/form, routed submitted prompts into Nic-Nac, opened the chat on focus/submit, and made the Sparkle Suite brand in the app header a real Home button.
- Commit `8f4a1573 fix: remove fake Nic-Nac workspace thumbnails` removed the fake Trade Board, Active Board, and Public Site mock thumbnails from the workspace and deleted the four PNG assets under `public/nic-nac`. Those cards now use real data-backed image URLs only when available; otherwise they render without images.
- The live-site preview regression was identified: preview mode currently replaces the normal workspace shell with only an iframe/toolbar, which removes the desktop Nic-Nac chat surface. Best product direction was agreed conceptually: Live Site Preview should be a preview workbench with Nic-Nac available as a desktop sidecar and mobile floating/drawer chat. This was not implemented in this closeout because Louis was asking for design direction and approval boundaries were clarified.
- Process correction: future Codex sessions must not treat "what is best", "what went wrong", "should we", or similar strategy/product questions as permission to inspect, edit, test, commit, deploy, or otherwise start work. Wait for explicit approval before implementation or tool work.

**Verification:**
- Focused tests passed after the header-control fix: `npm exec vitest run tests/nic-nac-workspace-shell.test.tsx tests/nic-nac-dashboard-placeholder.test.ts tests/reviewer-smoke-ui.test.ts` with 3 files / 111 tests.
- Local production browser smoke passed for desktop and 390x844 mobile after the header-control fix: top prompt typed/submitted/cleared, chat opened, brand returned Home from Trade Board, primary tabs navigated, More > Help & Resources opened, Preview Site and Back worked, and mobile quick actions opened/closed Nic-Nac.
- Focused tests passed after the fake-thumbnail removal: 3 files / 112 tests.
- `npm run build` passed locally after both fixes. One build attempt timed out and left a temporary Next build lock; rerun passed after the first process cleared.
- Vercel deployment `dpl_E5qpe9oq5Y6YPNbUorN64jRe7r3x` is Ready at `https://sparkle-suite-4kwpq14ps-louis-2849s-projects.vercel.app`, and stable demo `https://sparkle-suite-demo.vercel.app` was promoted to it.
- Stable health check passed after promotion: API reachable, DB reachable, recent error rate `0`.
- Stable desktop and mobile DOM smoke confirmed the affected workspace view had no fake concept image sources: `conceptSources: []`; on the reviewed data state the affected cards rendered with `imageCount: 0`.

**Lessons carried forward:**
- Visual redesign acceptance is not enough. Workspace shell work must preserve primary behaviors and should be closed with real interaction smoke: type into prompts, click navigation, return home, open/close previews, and verify mobile drawers.
- Workspace images must be authentic. If Sparkle Suite cannot source a real image from the rep's site/listings/storage, the UI should show no image rather than a decorative or generated placeholder that looks like product evidence.
- Live Site Preview is an editing context, not a read-only escape hatch. Nic-Nac needs to remain available there so reps can ask for copy/site changes while visually inspecting the page, then refresh the preview.
- Tool and implementation autonomy must respect Louis's approval boundary. Questions and product-design prompts get answers first; implementation begins only after explicit permission.

---

## July 4, 2026 - Nic-Nac Trade Board Tool Contract Hardening and Pressure Sweep

**What changed:**
- Continued the Calendar hardening lesson into the Trade Board / Trade tools family: app-owned workflow state, tool retention, approval-gated mutations, model-input sanitization, DB assertions, public-site proof, and synthetic cleanup.
- Added `smoke:nic-nac:catalog-correction`, a deployed reviewer-smoke path that seeds a synthetic catalog design/listing, asks Nic-Nac to correct shared catalog MSRP, replays the approval, verifies `jewelry_designs`, `jewelry_catalog_change_log`, completed `nic_nac_trade_workflows`, public Trade Board MSRP, and cleanup.
- The first catalog correction smoke caught a real model-drift bug: the model chose `report_jewelry_catalog_issue` correctly but carried the existing canonical photo URL into a non-photo MSRP correction. The service rejected the unapproved photo replacement, while assistant text still claimed success.
- Hardened `report_jewelry_catalog_issue` so non-photo issue types drop stray `canonicalPhotoUrl` before the service layer, while `bad_photo` corrections still require an approved jewelry-front replacement asset.
- Added `smoke:nic-nac:trade-board-pressure`, a single orchestration command that runs the deployed Trade Board smoke bank in order and reports a compact JSON summary:
  - item-number add listing with label/details and boxed jewelry photos
  - non-item-number listing
  - approval-gated listing removal
  - trade request approve/reject decisions
  - fulfillment shipped/completed updates
  - live-show swap approval
  - after-show swap cleanup
  - shared catalog correction

**Verification:**
- Focused local smoke-helper suite passed after adding the pressure runner: 9 files, 21 tests.
- Focused catalog/tool/routing suite passed after the catalog sanitizer fix: 6 files, 96 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed commits:
  - `a3407b5 test: add Nic-Nac catalog correction smoke`
  - `34dc328 test: add Nic-Nac trade board pressure smoke`
- Stable demo alias `https://sparkle-suite-demo.vercel.app` points to `https://sparkle-suite-or1okdndq-louis-2849s-projects.vercel.app` / deployment `dpl_FzUFwAv26TCbLTuXrDSNbAFtv5wS`.
- Stable demo health check passed with API/DB reachable and recent error rate `0`.
- Final deployed Trade Board pressure sweep passed 8/8 workflows against the stable alias, started `2026-07-04T17:31:46.674Z`, finished `2026-07-04T17:34:22.534Z`, duration `155860ms`.
- Final pressure conversations:
  - add listing: `92febf49-19c6-4b50-be94-f815f7e25ecb`
  - non-item-number listing: `f6b70629-d74d-47e2-b1d9-d5315bffe6be`
  - remove listing: `def5ed86-3120-4a31-b4e4-929ff4134a08`
  - trade request decisions: `8fae2949-7066-48ea-a742-69355415d282`
  - fulfillment update: `587c7cba-ca6b-49c0-acb9-752099fcdc08`
  - live swap: `eedf9762-4b00-4680-b0f2-cd5e5fc18d75`
  - swap cleanup: `3fd2d991-66c6-4b70-a5b6-d5d74509e823`
  - catalog correction: `75f3adeb-18eb-4526-94e5-3bf4a05bf7c8`
- Each deployed smoke used reviewer/synthetic data and reported cleanup for seeded listings, requests, swaps, fulfillment rows, catalog audit rows, designs, and collections.

**Lessons carried forward:**
- Tool-choice success is not enough; mutation tools must also sanitize model-suggested fields by workflow/issue type before service execution.
- Catalog corrections are shared-data mutations, so approval replay plus audit-log and public-board proof are mandatory before calling the path hardened.
- A single pressure command should be the standard closeout gate for Trade Board changes so future regressions are caught across related workflows, not only in the one script a session happened to remember.

---

## July 4, 2026 - Nic-Nac Calendar Tool Contract Hardening and Weekday Recurrence

**What changed:**
- Treated Nic-Nac Calendar failures as a tool-contract/workflow-state problem, not as a need to program every possible rep phrase.
- Added first-class weekday recurrence for rep language such as "every weekday", "Monday through Friday", and "everyweek day".
- `RecurringShowInput.cadence` now supports `weekday`; calendar generation skips Saturdays/Sundays and normalizes weekend starts forward to the next weekday.
- Ongoing weekday series are bounded as 130 future weekday rows, giving reps a durable schedule without pretending the database stores infinite rows.
- Calendar workflow parsing now captures shorthand such as `9am to 4p`, `7p Est`, `3 hrs`, `this monday`, and follow-up recurrence duration answers without overwriting earlier workflow truth.
- Added `localStartTime` to calendar workflow state so date-only follow-ups can combine with previously captured times.
- Tool choice now pins `add_show` when the active Calendar workflow is complete enough to write, while still requiring title/time/duration before mutation.
- Hardened `add_show` and `update_show` against model drift: model-invented recurrence is stripped when the workflow did not capture recurrence, and model-default `durationMinutes` is ignored on updates unless the rep explicitly asked to change duration/length.
- Updated Calendar prompt/tool descriptions so Nic-Nac asks for weekday recurrence correctly and does not treat description as required.
- Increased Calendar summary loading for the workspace and added previous/current/next month controls so reps can inspect future and past calendar months.
- Changed the workspace Calendar card to the espresso background and preserved readable inner calendar surfaces.
- Added clickable workspace calendar event pills/rows and a detail dialog with event title, status, platform, local time, end time, duration, timezone, recurrence, discount codes, featured collections, and description state.

**Verification:**
- Focused calendar/dashboard suites passed during the hardening passes, including calendar workflow controller, calendar plan, calendar service, calendar tools, calendar summary route, dashboard Calendar UI, prompt routing, tool routing, tool choice policy, and route routing smoke tests.
- Final broad Nic-Nac suite passed: 123 files, 915 tests passed, 1 skipped.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed commits:
  - `9e14d46 fix: support weekday calendar series`
  - `0aa1996 fix: guard calendar update duration patches`
- Stable demo alias `https://sparkle-suite-demo.vercel.app` points to `https://sparkle-suite-c1b192dk4-louis-2849s-projects.vercel.app` / deployment `dpl_BYfWohZhHq1kw2rGYdpGXPPJGJrS`.
- Stable demo health check passed with API/DB reachable and recent error rate `0`.
- Deployed pressure smoke passed against the stable demo with conversation `6ea818bc-820b-4476-acfd-5223eb336f76`, run tag `0703200456`.
- Pressure smoke verified multiple one-time entries, exact-count bounded two-Tuesday repeat, 13-row weekly series, 130-row weekday Monday-Friday series, multiple discount codes, multiple featured collections, public-site template visibility, update one event, update future series, skip one occurrence, pause a bounded range, cancel one event, cancel future series, and cleanup of 147 synthetic rows.

**Lessons carried forward:**
- Nic-Nac is effectively filling an app-owned form before using a tool. The fix is not to enumerate every way a rep may talk; the fix is to make the form/state machine smarter, durable, forgiving, and authoritative.
- The model can suggest field values, but app code must own required fields, recurrence math, allowed transitions, mutation defaults, and final validation.
- "Keep the same time" must mean no time/duration patch, even if the model sends a default duration. Tool boundaries should drop fields the latest user turn did not actually authorize.
- Recurrence should be represented as structured workflow state (`daily`, `weekly`, `weekday`, counted repeats, bounded ongoing) before mutation. Do not let the model improvise recurrence rows directly from prose.
- Workflow state needs to survive long conversations, clarifying questions, corrections, and short replies. Losing tools because the latest message is terse is an architecture bug.
- Pressure smokes must assert database state and public/workspace visibility after real model/tool runs. Assistant text alone is not proof.
- This Calendar pattern should be reused for Trade Board and Trade tools: durable workflow state, app-owned normalization, model-drift guards, deterministic tool contracts, deployed synthetic smokes, and cleanup.

---

## July 2, 2026 - Team Management Public Team Cards

**What changed:**
- Added a Public Team Cards manager inside the Team Management workspace.
- The manager uses the existing `join_team_members` / `/api/nic-nac/join-team-roster` system so Brittany can add, edit, hide/show, reorder, and remove customer-facing Join Team cards.
- Card fields include first name, show name, profile photo URL, TikTok, Facebook, Instagram, website, YouTube, and a visible-on-Join-page toggle.
- Kept public team cards separate from Start Strong onboarding links. Creating an onboarding link does not publish a public card automatically.
- Hardened public roster links so stored social/website links must be full `http` or `https` URLs before they can save.
- Preserved unshown imported roster fields such as city/state, initials, photo alt/class, bio, and sort order when the dashboard edits or toggles cards.
- Made public-card roster loading degrade separately so onboarding progress/messages can still load if the public roster request fails.
- Updated the synthetic reviewer-smoke dashboard session to seed Team Management beta access so future logged-in workspace checks can verify the paid-add-on UI without using Louis's personal browser or account.

**Verification:**
- Red/green dashboard and service regressions were added for the new manager, unsafe social links, unshown-field preservation, and roster-load fallback.
- Focused feature suite passed: `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/services/join-team-roster.test.ts tests/nic-nac-join-team-roster-route.test.ts tests/nic-nac/join-team-roster-tools.test.ts tests/britt-with-bling-public-site.test.ts` with 5 files / 102 tests.
- Configured repo `npm test` passed with 14 files / 196 tests.
- Local `npm run build` passed with Next.js 16.2.1.
- `git diff --check` passed.
- Subagent code review found three issues; all were fixed and re-reviewed with no remaining blocking findings.
- Follow-up reviewer-smoke access regression passed: `npm exec vitest run tests/reviewer-smoke-session.test.ts tests/nic-nac-dashboard-placeholder.test.ts tests/team-onboarding-service.test.ts` with 3 files / 95 tests.
- Follow-up local `npm run build` passed.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to `https://sparkle-suite-fjtiwq4jh-louis-2849s-projects.vercel.app` / deployment `dpl_27LM7EksMdpb2jGogaEMw7yUDc7K`.
- Isolated stable-demo reviewer-smoke passed with the synthetic reviewer workspace. `/start` showed `Open workspace preview`, signed in the synthetic reviewer, opened `/nic-nac?section=team-management`, and verified `Team Management`, `Create onboarding link`, `Public Team Cards`, the onboarding/public-card separation copy, `Save to Join Team page`, and `Preview Join Team page`. No Louis personal browser/session was used.
- Linked Supabase verification confirmed Brittany's `brittwithbling` demo/live-transition account is `active` and has `team_management_entitlements.status='manual_beta'` / `source='manual_beta'`. No fake reps or participant rows were created.

**Lessons carried forward:**
- Reviewer-smoke must seed every entitlement required by the UI under review. A dashboard-unlocked subscription alone is not enough for paid-add-on sections like Team Management.
- Smoke assertions should match the customer-facing UI labels. The real Public Team Cards submit label is `Save to Join Team page`, not an invented `Add public team card` label.
- Onboarding participants and public Join Team cards are intentionally separate data concepts; do not auto-publish public team cards from private Start Strong invite creation.
- For beta/live-transition accounts, verify the actual linked Supabase row after migrations or seeds. Do not assume a migration succeeded just because the code path exists.

---

## July 2, 2026 - Team Management Beta and Britt With Bling Start Strong Integration

**What changed:**
- Added entitlement-backed Team Management access through `team_management_entitlements`.
- Enabled Brittany for beta through `manual_beta`; future Stripe add-on access can use the same table with `active` status.
- Added Nic-Nac Team Management APIs for listing participants, creating private onboarding links, replying to participant messages, and archiving onboarding access.
- Added public invite-token APIs for the onboarding site to load participant/team state, sync progress, and send questions/messages back to Brittany's workspace.
- Restored and integrated the standalone Britt With Bling Start Strong app at `apps/rep-onboarding`.
- Deployed Start Strong to `https://britt-with-bling-start-strong.vercel.app` with `VITE_SPARKLE_SUITE_API_BASE_URL=https://sparkle-suite-demo.vercel.app`.
- Updated the Nic-Nac workspace UI so Team Management is a simple paid-add-on section with create-link, copy-link, email-with-own-email-app, roster/progress, reply, and archive controls.
- Kept Sparkle Suite SMS/email notification tools out of team outreach. Reps/team leads use their own phone or email app to send the link.

**Verification:**
- Focused suite passed: `npm exec vitest run tests/team-onboarding-service.test.ts tests/nic-nac-team-onboarding-route.test.ts tests/team-onboarding-public-route.test.ts tests/nic-nac-dashboard-placeholder.test.ts` with 4 files / 90 tests.
- Root `npm run build` passed locally with Next.js 16.2.1.
- `apps/rep-onboarding` `npm run build` passed.
- `apps/rep-onboarding` `npm run smoke:static` passed.
- Supabase migration `20260702120000_team_management_onboarding_beta.sql` was applied and verified: Brittany entitlement exists as `manual_beta`, with zero participant/progress/message rows after setup.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to `https://sparkle-suite-dn0u60bkf-louis-2849s-projects.vercel.app` / deployment `dpl_A4Dt34kP2sM97aSDaureNyAmuuGK`.
- Stable route smoke returned 200 for `/`, unauthenticated for the protected Team Management route, and safe onboarding-specific copy for an invalid invite token.
- Live Start Strong bundle smoke confirmed it calls `/api/team-onboarding/access/`, uses the stable Sparkle Suite demo API base, and no longer contains old demo-only `Welcome, Sarah` or `Reset demo` strings.

**Remaining beta smoke:**
- No fake rep accounts or participant rows were created. The first end-to-end workspace smoke should create one real/test-by-Louis onboarding participant link, open the invite, sync progress/messages, and archive it afterward.
- Logged-in workspace UI was not visually checked through Louis's personal browser. Use reviewer-smoke/safe login flow when available.

---

## July 2, 2026 - Alpine Opal and Mile High Fizz Standard Site Model

**What changed:**
- Added reusable **Alpine Opal** (`alpine_opal`, `AO-01`) as a mountain-opal pink, violet, icy-blue, and deep-ink skin any Sparkle Suite rep can choose.
- Converted Mile High Fizz back onto the standard Amethyst public-site model like BlingKitchen: Home, Trade, and Join share the normal templates and skin-switching behavior instead of a one-off locked custom fork.
- Set Mile High Fizz's default and persisted demo skin to Alpine Opal while keeping the site able to switch to other supported skins.
- Corrected Lindsey's public team context: **Diamond Peak Society** is Lindsey's team, and **The Virtuous Fizzers** is the team Lindsey belongs to.
- Kept the Mile High Fizz Trade Board intentionally empty until Lindsey adds pieces.
- Added Supabase migration `20260702005259_add_alpine_opal_appearance_preset.sql`, including normalization for legacy unsupported/null appearance presets before extending the check constraint.
- Removed customer-facing generic/internal phrases such as "standard Sparkle Suite item-for-item swap" from Mile High Fizz Trade copy.
- Fixed Alpine Opal Trade hero readability by using skin foreground tokens instead of hard-coded white text on the light Alpine background.
- Removed decorative JSX entity arrows that rendered literally in some customer-facing links.

**Verification:**
- Final focused suite passed: `npm exec vitest run tests/mile-high-fizz-public-site.test.ts tests/mile-high-fizz-tenant.test.ts tests/amethyst-appearance-presets.test.ts tests/services/site-settings.test.ts` with 4 files / 44 tests.
- `npm run qa:amethyst` passed with 3 files / 71 tests plus local link checks.
- `npm run build` passed locally with Next.js 16.2.1.
- Isolated local Playwright console/runtime smoke passed for `/milehighfizz`, `/milehighfizz/trade`, and `/milehighfizz/join` without using Louis's personal browser/session.
- Supabase `db push` succeeded after the migration normalized legacy unsupported presets first; DB read-back verified `milehighfizz | alpine_opal | Diamond Peak Society`.
- At Alpine Opal closeout, stable demo alias `https://sparkle-suite-demo.vercel.app` pointed to deployment `dpl_EJYJE6nHpMLgtrXWcgPbNVGRegSh` / preview `https://sparkle-suite-i8vavj4do-louis-2849s-projects.vercel.app`.
- Stable route checks returned 200 for `/milehighfizz`, `/milehighfizz/trade`, and `/milehighfizz/join`.
- Stable template payload checks confirmed `alpine_opal`, empty Trade listings, corrected team copy, no `black_diamond` default, and no generic "standard Sparkle Suite" copy leak.
- Final stable screenshot review caught and then verified the Trade hero readability fix.

**Lessons carried forward:**
- Existing customer sites often already have persisted `site_settings`; code defaults alone do not change the live/stable customer site. Migrate or update the persisted row and verify the stable template payload.
- A rep-inspired visual direction can become a reusable skin, but the customer site should still stay on the standard switchable template model unless Louis explicitly approves a permanent fork.
- Skin readability must be checked on the actual active skin and stable route, not just local/default screenshots.
- JSX named entities are risky in static customer templates if they are not verified in the rendered output; use plain ASCII labels for public CTAs unless the rendered entity is proven.
- Supabase check-constraint migrations should normalize legacy unsupported values before adding a stricter allowed set.

---

## July 1, 2026 - BlingKitchen Recipe Images Moved Off Readdy and Recipe Builder Simplified

**What changed:**
- Louis clarified Heather's recipe workspace must not depend on Ready/Readdy image URLs because that source will be temporary.
- Updated the Recipes workspace builder so the main flow is upload-first: title, category, prep time, servings, food photo uploads, recipe-card uploads, Nic-Nac draft, and save.
- Removed the editable raw image URL field from the main recipe image controls. Stored image URLs remain internal plumbing after upload.
- Added a visible category dropdown for Heather's Pantry categories instead of burying category in Advanced edit.
- Added `npm run migrate:bling-kitchen-recipe-images`, a repeatable migration script that finds Readdy/Ready-hosted BlingKitchen recipe images, copies them into Sparkle Supabase `public-site-media`, and updates only Heather's `public_site_recipes` rows.
- Ran the migration for Heather's live account: 26 recipes scanned, 33 recipe image fields migrated to Sparkle storage, 0 skipped.
- Replaced Readdy URLs in BlingKitchen static recipe seed/fallback data and copied/replaced 4 BlingKitchen profile/hero images into Sparkle storage.

**Verification:**
- Dry run before migration found 26 recipes / 33 image fields to migrate.
- Live migration completed successfully for rep `9a971c05-3631-443e-bcb8-4e9a26e15885`.
- Dry run after migration found 0 remaining Readdy/Ready recipe image fields in Heather's live `public_site_recipes`.
- Repo scan found no remaining Readdy/Ready URLs under `lib/bling-kitchen`, `scripts/seed-bling-kitchen-recipes.ts`, or the recipe workspace component.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts tests/nic-nac-site-recipes-route.test.ts tests/services/site-recipes.test.ts tests/bling-kitchen-recipes-db-loader.test.ts tests/bling-kitchen-public-site.test.ts` passed: 6 files, 104 tests.
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts` passed after the parallel build/test timeout rerun.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `abfbd40 fix: simplify Heather recipe images`.
- Vercel preview build passed at `https://sparkle-suite-coe8a6uio-louis-2849s-projects.vercel.app` / deployment `dpl_D3td3AsK1BhGLYStBkbZ9Tj4Xajx`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo health checks passed for `/api/prelaunch/health` and `/api/nic-nac/health`.
- Stable demo BlingKitchen Pantry template check returned `hasReaddy:false` and `supabaseCount:34`.

---

## July 1, 2026 - Heather Recipe Smoke Fix Deployed to Stable Demo

**What changed:**
- Deployed the latest `codex/sparkle-cross-phase-hardening` branch after Heather recipe smoke hardening and checklist cleanup.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to Vercel deployment `dpl_GFQ3pDozn9J9nE3dmP8MbpvbDara` / preview `https://sparkle-suite-ju9u16g38-louis-2849s-projects.vercel.app`.
- Latest pushed code checkpoint is `ab3ad0b chore: mark Heather recipe smoke complete`.

**Verification:**
- Vercel inspect confirmed the stable demo alias resolves to `dpl_GFQ3pDozn9J9nE3dmP8MbpvbDara` with status Ready.
- Stable demo `/api/prelaunch/health` returned `ok:true`, `service:"sparkle-suite-prelaunch"`, and `status:"ready"`.
- Stable demo `/api/nic-nac/health` returned `api_reachable:true`, `db_reachable:true`, and `recent_error_rate:0`.

---

## July 1, 2026 - OpenAI Recipe Replay Unblocked

**What changed:**
- Louis added OpenAI API credits, so the Heather image-first recipe flow could be tested with real OpenAI calls.
- `npm run smoke:nic-nac:recipe-chat -- --expect-model --output .local/launch-readiness-results/nic-nac-recipe-chat.json` passed against the stable demo reviewer-smoke account.
- The passing replay observed `build_site_recipe_draft` on the draft turn, waited for save approval, observed `manage_site_recipes` on the save turn, verified the saved recipe row included the fixture recipe-card facts and public display images, then cleaned up the smoke recipe row.
- `npm run report:launch-readiness -- --dashboard-nic-nac-report .local/launch-readiness-results/nic-nac-recipe-chat.json --json` now marks Dashboard / Nic-Nac as `covered` with `smokeProof.ok:true` and `stepCount:2`. The overall launch report remains not ready because unrelated Phase 11 journeys are still partial/missing.
- Fixed the direct recipe-builder smoke harness so its model probe uploads generated fixture images through `/api/nic-nac/site-recipes/image` before calling `/api/nic-nac/site-recipes/draft`. The previous data-URL shortcut was unrealistic because the production draft builder normalizes image URLs to normal URL lengths.

**Verification:**
- Initial `npm run smoke:nic-nac:recipe-builder -- --expect-model` reached stable demo but failed at the model probe because the old smoke harness sent oversized data URLs directly to the draft endpoint.
- After the harness fix, `npm run smoke:nic-nac:recipe-builder -- --expect-model` passed against the stable demo reviewer-smoke account.
- `npm run smoke:nic-nac:recipe-chat -- --expect-model --output .local/launch-readiness-results/nic-nac-recipe-chat.json` passed against the stable demo reviewer-smoke account.
- `npm run report:launch-readiness -- --dashboard-nic-nac-report .local/launch-readiness-results/nic-nac-recipe-chat.json --json` showed Dashboard / Nic-Nac covered from the passing artifact.
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts` passed after the harness update.

**Follow-up completed later July 1:**
- The exact Heather/BlingKitchen account public Pantry smoke passed after Louis allowed temporary runtime use of Heather's demo password. See `July 1, 2026 - Heather Recipe Nic-Nac Exact Smoke and Pantry Assertion Hardening` below.

## July 1, 2026 - Quota Artifact Readiness Guard

**What changed:**
- Ran the reviewer-safe stable-demo recipe smokes again while OpenAI billing remains blocked.
- Hardened launch readiness so `RecipeChatSmokeResult` artifacts only count as successful Dashboard / Nic-Nac proof when `status === 'passed'`.
- This prevents the provider-free `model_unavailable` recipe chat artifact from accidentally marking Dashboard / Nic-Nac as covered just because the smoke command exits cleanly without `--expect-model`.

**Verification:**
- `npm run smoke:nic-nac:recipe-builder` passed against `https://sparkle-suite-demo.vercel.app` using reviewer-smoke auth.
- `npm run smoke:nic-nac:recipe-chat -- --output .local/launch-readiness-results/nic-nac-recipe-chat-latest.json` first hit Windows sandbox `spawn EPERM`; rerun outside the sandbox reached stable demo and wrote the artifact with `status:"model_unavailable"` and the OpenAI `insufficient_quota` message.
- `npm run report:launch-readiness -- --dashboard-nic-nac-report .local/launch-readiness-results/nic-nac-recipe-chat-latest.json --json` first hit Windows sandbox `spawn EPERM`; rerun outside the sandbox correctly reported Dashboard / Nic-Nac as `partial`, `smokeProof.ok:false`, `stepCount:0`, with the quota message in `blockedItems`.
- `npm exec vitest run tests/launch-readiness-report-runner.test.ts tests/phase-11-smoke-manifest.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts` passed: 3 files, 19 tests.

**Remaining blocker:**
- Final launch-ready recipe proof still requires rerunning `npm run smoke:nic-nac:recipe-builder -- --expect-model` and `npm run smoke:nic-nac:recipe-chat -- --expect-model --output .local/launch-readiness-results/nic-nac-recipe-chat.json` after OpenAI quota/billing is fixed.

## July 1, 2026 - Dashboard/Nic-Nac Recipe Chat Readiness Artifact

**What changed:**
- Added Dashboard/Nic-Nac recipe chat smoke artifact support to the launch-readiness report runner.
- `npm run report:launch-readiness` now accepts `--dashboard-nic-nac-report <path>` and attaches the `npm run smoke:nic-nac:recipe-chat` JSON replay to the Dashboard / Nic-Nac journey.
- Recipe chat artifacts count `turns` as proof steps, so the expected draft/save replay reports two steps.
- Failed attached recipe chat artifacts now downgrade Dashboard / Nic-Nac to `partial` and carry the smoke failure message into `blockedItems`, preventing a false beta-readiness green light.
- Updated the Phase 11 manifest and open item with the post-quota command path for Heather's image-first recipe builder replay and readiness report attachment.

**Verification:**
- `npm exec vitest run tests/launch-readiness-report-runner.test.ts` passed: 9 tests.
- `npm exec vitest run tests/launch-readiness-report-runner.test.ts tests/phase-11-smoke-manifest.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts` passed: 3 files, 17 tests.
- `npm run smoke:nic-nac:recipe-tool-contract` first hit Windows sandbox `spawn EPERM`; rerun outside the sandbox passed: 4 files, 71 tests.
- `npm run build` passed locally with Next.js 16.2.1.

**Remaining blocker:**
- Final model-in-loop proof for Heather's image-first recipe flow is still waiting on the OpenAI quota/billing fix. After quota clears, run the `--expect-model` recipe builder and chat smokes, save the chat JSON, and attach it to launch readiness with `--dashboard-nic-nac-report`.

## July 1, 2026 - Recipe Chat Smoke Output Path

**What changed:**
- Added `--output <path>` / `--output=<path>` support to `scripts/smoke-nic-nac-recipe-chat.ts`.
- The recipe chat smoke now writes the full JSON result to a requested artifact path, creating parent directories as needed, while preserving the existing JSON stdout behavior.
- Updated the Phase 11 Dashboard/Nic-Nac next action and Open Items TODO to use `.local/launch-readiness-results/nic-nac-recipe-chat.json` or `.local/launch-readiness-results/bling-kitchen-recipe-chat.json` as direct post-quota replay artifact paths.

**Verification:**
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts tests/phase-11-smoke-manifest.test.ts tests/launch-readiness-report-runner.test.ts` passed: 3 files, 18 tests.
- `npm run build` passed locally with Next.js 16.2.1.

**Remaining blocker:**
- The final Heather/reviewer model replay still cannot be completed until OpenAI quota/billing is fixed.


## July 1, 2026 - Heather Image-First Recipe Chat Handoff

**What changed:**
- Hardened the BlingKitchen image-first recipe flow so Heather can give Nic-Nac a title, public food/display photos, and recipe-card photos without needing image URLs or a long manual form.
- Added `build_site_recipe_draft`, a Nic-Nac site tool that reads recent chat image uploads by 1-based photo order, uploads display photos as public recipe media, stages recipe-card photos as short-lived source URLs, and builds a draft without saving it.
- Recipe-card photos are explicitly source material for ingredients/steps, not public recipe images; only unreadable recipe cards or genuinely bad public display photos should block the flow.
- Site tool routing now keeps recipe tools active for photo-only recipe follow-ups, and successful `manage_site_recipes` saves now trigger workspace/site refresh events.
- Added deterministic `/api/nic-nac` route coverage proving recipe wording and photo-only recipe follow-ups expose `build_site_recipe_draft`, `list_site_recipes`, and `manage_site_recipes` to the model without needing a live OpenAI call.
- The OpenAI quota/billing blocker still gates final model-in-loop proof. The open item now explicitly calls for a real replay that observes `tool-build_site_recipe_draft` followed by `manage_site_recipes`.
- Added a provider-free local smoke command, `npm run smoke:nic-nac:recipe-tool-contract`, and tied the recipe chat-tool contract into the Phase 11 Dashboard / Nic-Nac smoke manifest.
- Added a post-quota full chat replay harness, `npm run smoke:nic-nac:recipe-chat`, that signs into reviewer-smoke or Heather's BlingKitchen account, posts real image parts to `/api/nic-nac`, observes `build_site_recipe_draft` then `manage_site_recipes`, verifies the saved recipe row contains the fixture card facts and public display images, checks Heather's public Pantry page when `--target=bling-kitchen` is used, and cleans up smoke recipes by default.
- Hardened the recipe chat replay harness so `manage_site_recipes` must be absent from the draft turn and present only on the save turn, saved recipe lookup requires the exact unique smoke title, cleanup deletes only the exact created recipe id/title, and `--target=bling-kitchen` returns a structured missing-env result when `BLING_KITCHEN_RECIPE_SMOKE_PASSWORD` is not supplied.
- Added the post-quota recipe chat replay harness to the Phase 11 Dashboard / Nic-Nac smoke manifest evidence and pinned the exact post-quota commands in the manifest next action.
- Fixed the workspace refresh follow-through: when Nic-Nac saves a Pantry recipe through chat, the open Recipes workspace reloads its recipe list and preserves the selected recipe when possible.

**Verification:**
- `npm exec vitest run tests/nic-nac/site-recipe-draft-tool.test.ts tests/nic-nac/tool-routing.test.ts tests/nic-nac-workspace-refresh-events.test.ts tests/nic-nac-site-recipes-route.test.ts` passed: 4 files, 73 tests.
- `npm exec vitest run tests/nic-nac/prompt-routing.test.ts tests/nic-nac/site-recipe-draft-tool.test.ts tests/nic-nac/tool-routing.test.ts tests/nic-nac-workspace-refresh-events.test.ts` passed: 4 files, 70 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `5892898 feat: add Nic-Nac recipe draft chat tool` to `origin/codex/sparkle-cross-phase-hardening`.
- Vercel preview build passed at `https://sparkle-suite-n60j59mvf-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that preview.
- Stable demo health checks passed for `/api/prelaunch/health` and `/api/nic-nac/health`.
- `npm run smoke:nic-nac:recipe-builder` passed against the stable demo with reviewer-smoke auth.
- `npm run smoke:nic-nac:recipe-builder -- --probe-model` passed against the stable demo by confirming the expected friendly `MODEL_UNAVAILABLE` response while OpenAI quota remains blocked.
- `npm run smoke:nic-nac:recipe-tool-contract` passed locally: 3 files, 65 tests.
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts tests/phase-11-smoke-manifest.test.ts` passed: 2 files, 6 tests.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-workspace-refresh-events.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts tests/phase-11-smoke-manifest.test.ts` passed: 4 files, 91 tests.
- `npm exec vitest run tests/nic-nac/nic-nac-calendar-route-routing-smoke.test.ts` passed after adding the `/api/nic-nac` recipe route cases: 1 file, 6 tests.
- `npm run smoke:nic-nac:recipe-tool-contract` passed with route coverage included: 4 files, 71 tests.
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts` passed: 1 file, 1 test.
- `npx tsx -e "import('./scripts/smoke-nic-nac-recipe-chat.ts').then((m)=>console.log(Object.keys(m.default ?? {}).join(','), typeof (m.default ?? {}).runRecipeChatSmoke))"` passed after rerunning outside the Windows sandbox; the first sandboxed attempt hit `spawn EPERM` while starting `tsx`/esbuild.
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts` passed after adding the callable provider-free env guard checks: 1 file, 2 tests.
- `npm run smoke:nic-nac:recipe-tool-contract` passed after the recipe chat replay harness hardening: 4 files, 71 tests.
- `npm exec vitest run tests/phase-11-smoke-manifest.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts` passed after wiring the recipe chat replay into the Phase 11 manifest: 2 files, 8 tests.
- `npm exec vitest run tests/launch-readiness-report-runner.test.ts` passed: 1 file, 8 tests.
- `npm run build` passed after the Recipes workspace refresh follow-through.
- Pushed `a0e3d9f fix: refresh recipes after Nic-Nac site saves`.
- Vercel preview build passed at `https://sparkle-suite-9j1hje02g-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that preview.
- Stable demo health checks passed again for `/api/prelaunch/health` and `/api/nic-nac/health`.
- Stable demo `npm run smoke:nic-nac:recipe-builder` passed again with reviewer-smoke auth.
- Stable demo `npm run smoke:nic-nac:recipe-builder -- --probe-model` passed again by confirming the friendly `MODEL_UNAVAILABLE` response while OpenAI quota remains blocked.

---

## July 1, 2026 - Open Brain and HQ Closeout for Optional Trade Approval Work

**What was captured:**
- Open Brain/vault memory now reflects the optional revealed item-number approval update, Nic-Nac busy-show guidance, and guarded shared catalog photo correction behavior.
- Headquarters was refreshed with a Sparkle Suite closeout handoff and current project-link/snapshot notes for the stable demo target.
- Project state now points to the final docs/memory checkpoint `12b6bcc docs: update Open Brain closeout memory`.

**Key decisions and lessons carried forward:**
- Trade approval item-number capture is preferred when available, but must never block a busy live show. Reps can approve now and add the revealed piece later with Nic-Nac.
- Nic-Nac should use `report_jewelry_catalog_issue` for routine shared jewelry catalog photo problems instead of saying the tool is unavailable.
- Canonical catalog photo replacement must stay guarded: approved jewelry-front asset only; never label/details, tag, back-of-card, or unapproved raw upload.
- Stable demo remains the normal Sparkle Suite review target: `https://sparkle-suite-demo.vercel.app`.

---

## June 29, 2026 - Nic-Nac Non-Item-Number Trade Board Listings

**What changed:**
- Louis and Codex finalized the V1 design for reps who have current/recent trade pieces but no item number/tag details: call them **non-item-number pieces** internally, do not label them differently to customers, and route creation only through Nic-Nac for now.
- Shipped `0d4e9fa feat: support non-item-number trade listings`.
- Added Supabase migrations:
  - `20260629150000_non_item_number_trade_listings.sql`
  - `20260629151000_trade_board_intake_non_item_number_mode.sql`
- `trade_listings.design_id` is now nullable only for `listing_source = 'non_item_number'`; catalog rows still require a design.
- Non-item-number listings store listing-local controlled fields: jewelry type, broad collection, exact collection when known, size when applicable, and managed photo URL.
- `rpc_approve_trade` now increments `jewelry_designs.times_traded` only when a listing has a design.
- Nic-Nac add-listing workflow now supports `catalogMode: item_number | non_item_number`, asks for `Collection Type and Size`, and writes through the dedicated non-item-number listing service without catalog design creation.
- Rep-facing surfaces can show `(non-item number piece)` for clarity; customer-facing Trade Board cards, request flow, tickers, and public APIs do not expose source labels.
- Sparkle Finder availability/count queries explicitly exclude non-item-number listings in V1.
- Added dedicated smoke/pressure harnesses:
  - `npm run smoke:nic-nac:trade-board-non-item-number`
  - `npm run pressure:non-item-number-trade-listings`

**Verification:**
- Focused regression matrix passed: 27 files, 369 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Full `npx tsc --noEmit --pretty false` still fails on pre-existing unrelated test fixture typing issues; no feature-owned source/script errors remained after fixing the pressure-script `rejectTrade` call.
- Supabase changelog was checked; CLI `2.84.2` was available; `supabase db push --dry-run` showed only the two intended migrations.
- `supabase db push --yes` applied both migrations, and `supabase migration list` confirmed them on remote.
- DB-backed pressure test passed and cleaned up: `listings=2 board=2 requests=1 rejected=1 remove_restore=true designs_before=13 designs_after=13 public_leaks=0 cleanup_residuals=0`.
- Vercel preview build passed: `https://sparkle-suite-jdkqdsl61-louis-2849s-projects.vercel.app` / deployment `dpl_9kqJkDx7cr2ap82yjzMHqcf1bn8s`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable `/api/nic-nac/health` returned API/DB reachable with recent error rate 0.
- Stable live Nic-Nac smoke passed using synthetic reviewer rep `sparkle-reviewer+preview@neonrabbit.net`, conversation `2b7d11e6-25e8-4326-b1f4-b4288f2c81fe`, workflow `1aa05d7b-8abe-4939-a3e6-e48c15b7555f`, temporary listing `e5918d9b-9eed-42c4-bc4f-6b1afb7b05ec`, `design_id = null`, `listing_source = non_item_number`, public payload presence, no forbidden public source wording, and cleanup.
- Stable route sweep returned 200 for `/milehighfizz/trade`, `/louisfizzfest/trade`, `/amethyst/Trade.html`, and reviewer Trade Board API after cleanup.

**Lesson carried forward:**
- Non-item-number Trade Board support should stay listing-local and workflow-local. Do not create fake item numbers, do not write these rows into `jewelry_designs`, and do not introduce customer-facing labels that make the listing feel different. Public smoke must prove both no source-language leak and actual public payload presence, not just absence of bad words.

---

## June 28, 2026 - Constant Pixel-Speed Customer Tickers

**What changed:**
- Audited the active customer-facing ticker paths for Home, Trade Board, Join, public slug routes, and the shared Amethyst React shell.
- Removed the hidden `12s` minimum-duration floor from the measured ticker math so short/sparse Trade Boards do not slow down below the universal pixel speed.
- Added delayed, resize, orientation, page-show, font-ready, and visibility resync hooks so iframe/live-preview layouts are less likely to stay on fallback timing.
- Bumped the Amethyst asset version to `20260628-constant-pixel-ticker` across Home, Trade, Join, Pantry, and Unsubscribe exports so existing and future customer accounts load the corrected bundle.

**Verification and deploy:**
- TDD regression failed first for the old asset version and `Math.max(12, distance / pixelsPerSecond)` floor, then passed after the fix.
- Focused route/template tests passed: 3 files, 50 tests.
- Amethyst template suite passed: 3 files, 70 tests.
- Local Amethyst link verifier passed against a temporary `localhost:3001` dev server.
- Local `npm run build` passed.
- Implementation checkpoint: `4196985 fix: keep customer tickers at constant pixel speed`.
- Vercel preview deployment passed: `https://sparkle-suite-fonzls0c1-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable deployed checks confirmed `milehighfizz/trade`, `louisfizzfest/trade`, and `/amethyst/Trade.html` serve the new `20260628-constant-pixel-ticker` assets, and deployed `homepage.jsx`, `trade.jsx`, and `join.jsx` contain direct `${distance / pixelsPerSecond}s` timing plus resync hooks.

**Lesson carried forward:**
- A measured ticker can still be content-length dependent if it clamps to a fixed minimum duration. For Louis's customer-facing tickers, preserve the pixel-speed formula itself: duration equals measured segment distance divided by the row's pixels-per-second constant.

---

## June 27, 2026 - Nic-Nac Item-Number Plating Variants

**What changed:**
- Fixed the catalog identity assumption Louis found during Nic-Nac testing: one item number can have multiple plating/material variants.
- Supabase migration `20260627134500_jewelry_design_item_number_material_variants.sql` replaced the old item-number-only uniqueness with item number plus normalized material/plating uniqueness.
- `resolveItemNumber`, Trade Board add-listing, duplicate physical listing checks, and `prepare_trade_board_work` now pass/use material when known.
- If the same item number has multiple variants and plating is missing, Nic-Nac asks which plating/material. If a provided plating is new for a known item number, Nic-Nac treats it as a new catalog variant, not a wrong-material correction to the existing variant.
- Prompt guardrails now teach Nic-Nac to pass visible plating as `material` and avoid framing different plating as a catalog mistake.

**Verification and deploy:**
- TDD regressions failed first for resolver, prepare-tool, and add-listing variant behavior, then passed.
- Focused variant suite passed: 4 files, 59 tests.
- Nearby prompt/catalog suite passed: 7 files, 42 tests.
- Full Nic-Nac suite passed: 112 files passed, 1 skipped; 792 tests passed, 1 skipped.
- Local `npm run build` passed.
- Supabase migration applied remotely with `supabase db push`.
- Implementation checkpoint: `f1e225a fix: support Nic-Nac plating variants`.
- Vercel deployment `https://sparkle-suite-4ypdz0zr4-louis-2849s-projects.vercel.app` is READY.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo health check passed with API and DB reachable, recent error rate 0.
- Deployed stable-demo Nic-Nac Trade Board intake smoke passed through the real `/api/nic-nac` route with reviewer-smoke rep `sparkle-reviewer+preview@neonrabbit.net`; workflow completed, listing was verified, and smoke listing cleanup succeeded.

**Lesson carried forward:**
- Bomb Party item number is not always the full catalog identity. When plating/material is visible, use it as the variant discriminator before deciding whether a design is duplicate, new, or incorrect.

---

## June 27, 2026 - Nic-Nac Confirmed Listing Photo Retry Fix

**What changed:**
- Fixed the Trade Board add-listing flow where Nic-Nac could accept a good boxed display jewelry photo, then fail to reuse it when saving the listing.
- The exact rep-facing confirmation phrase Nic-Nac suggested, `use this photo`, now promotes the latest identified image to a confirmed jewelry-front workflow photo.
- When multiple prior jewelry photo attempts exist, `add_listing` now defaults to the latest confirmed workflow jewelry-front photo if the model retries without an explicit photo index.
- Boxed/display jewelry photo rules remain unchanged: clear, centered, close boxed display shots are valid customer-facing listing photos.

**Verification and deploy:**
- TDD regressions failed first, then passed for `use this photo` confirmation and no-index latest confirmed photo reuse.
- Focused photo/tool tests passed: 2 files, 56 tests.
- Broader Nic-Nac photo/tool guard passed: 4 files, 70 tests.
- Full Nic-Nac suite passed: 112 files passed, 1 skipped; 789 tests passed, 1 skipped.
- Local `npm run build` passed.
- Implementation checkpoint: `b6c9b92 fix: reuse confirmed Nic-Nac listing photos`.
- Vercel deployment `dpl_3g5XE1YxDqDRa4SUL5wVpRYyGhQx` / `https://sparkle-suite-g3nyffkqu-louis-2849s-projects.vercel.app` is READY.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Deployed stable-demo Nic-Nac Trade Board intake smoke passed through the real `/api/nic-nac` route with reviewer-smoke rep `sparkle-reviewer+preview@neonrabbit.net`; workflow completed, listing was verified, and smoke listing cleanup succeeded.

**Lesson carried forward:**
- If Nic-Nac tells a rep to type a confirmation phrase, that exact phrase must be recognized by workflow state. Do not rely on the model to pass a perfect photo index when app-owned workflow state already knows the latest accepted jewelry photo.

## June 23, 2026 - Wispr Flow Business Tool

**What changed:**
- Simplified the `Business Tools` workspace section so `Business Calculator` and `Business Cards` now render as plain `Coming Soon` placeholders only.
- Removed the in-page calculator UI and BP dashboard number-import research note from the current Business Tools surface.
- Added the usable Wispr Flow section with Louis's invite link: `https://wisprflow.ai/r?LOUIS20696`.
- Grounded the Wispr Flow copy in the official Wispr Flow site positioning: voice-to-text across apps, faster dictation, AI cleanup/auto-edits, and ready-to-send formatting.
- No Chrome Web Store settings, local extension code, or protected live-show extension files were touched.

**Verification and deploy:**
- TDD regression failed first, then passed for the new Business Tools behavior.
- Focused dashboard/Nic-Nac suite passed: 15 files, 265 tests.
- `npm run build` passed locally.
- `npm run lint` passed with existing warnings only.
- `git diff --check` passed with line-ending warnings only.
- Local reviewer-smoke production server passed with synthetic reviewer rep: Business Tools loaded, Wispr Flow copy/link was visible, exactly two `Coming Soon` placeholders rendered, and calculator fields were absent.
- Local mobile smoke passed with no horizontal overflow.
- Stable demo reviewer-smoke passed against `https://sparkle-suite-demo.vercel.app/nic-nac?section=business-tools` with synthetic reviewer rep.
- Implementation checkpoint: `9181e64 feat: add Wispr Flow business tool`.
- Vercel deployment `dpl_2UdN5CDapP577wJysYaRJ8stmktz` / `https://sparkle-suite-puc81mud5-louis-2849s-projects.vercel.app` is READY.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.

**Still open:**
- Business Calculator remains a future Business Tools upgrade and should stay a simple `Coming Soon` placeholder until Louis asks to build it out.
- Business Cards remains a future paid proof/order/contractor workflow and should stay a simple `Coming Soon` placeholder until that workflow is designed.
- Any Bomb Party dashboard number import research remains separate and must respect the protected Live Queue extension rules.

---

## June 23, 2026 - Recipes Workspace Gate

**What changed:**
- Fixed the rep workspace sidebar so `Recipes` only appears for Heather's BlingKitchen workspace.
- Added a BlingKitchen recipe-workspace access gate based on Heather's known rep id and BlingKitchen public site slug.
- Direct `?section=recipes` access now resolves back to Trade Board for non-BlingKitchen reps instead of showing the recipe editor.

**Verification and deploy:**
- TDD regression passed: `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts`.
- `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Local reviewer-smoke render with the synthetic reviewer rep confirmed Recipes was absent from the sidebar and direct `?section=recipes` showed Trade Board content.
- Implementation checkpoint: `5784701 fix: limit Recipes workspace to BlingKitchen`.
- Vercel deployment `dpl_2YYgaK7VpsUBxWzJ9AkVWEk2cfb8` / `https://sparkle-suite-1dvfw3tit-louis-2849s-projects.vercel.app` is READY.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` was moved to that deployment and the login route returned `200`.

## June 23, 2026 - Business Tools Workspace Hub

**What changed:**
- Replaced the disabled `Business Calculator` workspace nav item with an unlocked `Business Tools` hub.
- Kept the existing calculator inside the hub and preserved old `?section=business-calculator` deep links by routing them to `?section=business-tools`.
- Added first-pass tool cards for Business Calculator, Wispr Flow, and Business Cards, plus a research note for future BP dashboard number import.
- Left Live Queue/Bomb Party dashboard scraping as research only; no extension or Chrome Web Store files were touched.

**Verification and deploy:**
- Focused dashboard test passed: `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts`.
- Local `npm run build` passed.
- `npm run lint` passed with existing warnings only.
- Local reviewer-smoke render passed on a token-enabled local server with synthetic reviewer rep, including Business Tools route load and calculator Single Show tab interaction.
- Implementation checkpoint: `ffedb31 feat: add Business Tools workspace hub`.
- Vercel deployment `dpl_APXSZbTNkQvnq7AE37yvsdiGDVh4` / `https://sparkle-suite-dx805vff7-louis-2849s-projects.vercel.app` is READY.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` was moved to that deployment and the login route returned `200`.

**Still open:**
- Make the calculator more robust and rep-friendly for actual show/month planning.
- Decide whether BP dashboard number import is feasible without violating Live Queue safety rules or changing live-show behavior.
- Add Wispr Flow affiliate link/content after Louis has the partner details.
- Design the paid business-card proof/order/contractor workflow before taking orders.

## June 23, 2026 - Nic-Nac Live Calendar and Reminder Hardening

**What changed:**
- Hardened Nic-Nac's live calendar workflow beyond prompt wording: added app-owned calendar preflight, approval-gated skip-one-show, cancel-series, and pause-series tools, and clearer approval detail copy.
- Added durable show reminder preferences and per-show reminder overrides so reps can ask for recurring defaults like "text my people 45 before every show" and one-night exceptions like "turn off SMS tonight but keep email."
- Extended pre-show reminder planning to support SMS and email channels, default preferences, event overrides, dry-run/live gating, and durable run/item observability.
- Seeded reviewer-smoke calendar/audience data for repeatable Nic-Nac calendar tests, including a same-day upcoming show and a future recurring occurrence.
- Added `npm run smoke:nic-nac:calendar-reminders`, which drives messy rep wording through real `/api/nic-nac`, approval flow, and database assertions.

**Schema and deploy:**
- Applied Supabase migration `20260623120000_show_reminder_preferences.sql` remotely with `show_reminder_preferences`, `show_reminder_overrides`, `show_reminder_runs`, and `show_reminder_run_items`.
- Added a composite ownership constraint tying reminder overrides to the rep-owned calendar event.
- Deployed clean Vercel preview `dpl_3iz33huJwPMqkSGSNReFVxYsTCoM` / `https://sparkle-suite-5v9qyopkd-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now resolves to that deployment.

**Verification:**
- Focused calendar/reminder/Nic-Nac suite passed: 14 files, 147 tests.
- Standard `npm test` passed: 14 files, 191 tests.
- `npm run lint` passed with the existing warning set only.
- `npm run build` passed locally and during Vercel deploy.
- `git diff --check` passed with line-ending warnings only.
- Local real API/model smoke passed after prompt/preflight/seed hardening.
- Stable-demo smoke passed against `https://sparkle-suite-demo.vercel.app` with reviewer rep `sparkle-reviewer+preview@neonrabbit.net`, conversation `57bef99e-56c1-4991-87f7-e894fe57ae50`, approval flow, tool observation, and database assertions.

**Lessons carried forward:**
- Calendar automation needs the same Nic-Nac reliability standard as Trade Board: app-owned preflight, durable workflow state, approval-gated mutations, DB assertions, and deployed smoke.
- Approval-gated tools should emit the confirmation dialog directly after preflight; Nic-Nac should not ask a separate natural-language confirmation first when the app already knows the proposed mutation.
- Future outbound SMS/email reminder launch should be enabled by channel flags and provider/compliance readiness, not by changing the core calendar intent routing again.

---

## June 22, 2026 - Nic-Nac Name Origin Identity Context

**What changed:**
- Added Nic-Nac's name origin to the shared core persona prompt and legacy static prompt: Louis named Nic-Nac after one of his pet rabbits.
- Added prompt tests so routed Nic-Nac prompts keep that identity fact.
- Updated vault memory so future sessions preserve the origin.

**Verification:**
- Focused prompt tests passed.
- Touched-file lint passed.
- Suite standard `npm test` passed.
- `npm run build` passed.
- Stable demo alias points to Vercel deployment `dpl_5kqjagcaoChLQCmVM9XMecdp2zfQ`.
- Deployed reviewer-smoke `/api/nic-nac` question smoke passed: Nic-Nac answered that Louis named him after one of his pet rabbits.

**Memory/HQ closeout:**
- Open Brain captured the status update, identity decision, prompt-budget lesson, deployed-smoke lesson, and Louis's broader tool/workflow reliability expectation.
- HQ task `task_11_10_nic_nac_stable_baseline` was updated to `in_progress` with this session's verification notes.
- HQ open item `61be6866-a661-4b4c-9ef8-2f4bb5bae99d` was created for durable Nic-Nac Trade Board and jewelry database tool knowledge.

---

## June 22, 2026 - Nic-Nac Caveat Cleanup: Suite Lint And Finder Deployed Smoke

**What changed:**
- Cleaned the remaining full-suite ESLint errors that were blocking `npm run lint`, without changing Nic-Nac workflow behavior.
- Added a token-gated Finder internal reviewer-smoke session route at `/api/internal/finder/reviewer-smoke-session`.
- Finder smoke now creates a temporary confirmed Silver smoke user, captures real Supabase auth cookies, calls deployed `/api/finder/nic-nac`, and cleans the smoke user afterward.
- Rotated Finder production `SPARKLE_FINDER_INTERNAL_SMOKE_TOKEN` and deployed Finder production `dpl_FYgnoBbT1VW6iwwmSkP5Jn16x9L7`, aliased at `https://sparkle-finder-dev.vercel.app`.
- Deployed Suite preview `dpl_5RVUZD6xmWKwFMa41VwPthiLEaBq` / `https://sparkle-suite-ku7hgxqm6-louis-2849s-projects.vercel.app` and moved `https://sparkle-suite-demo.vercel.app` to that deployment.

**Verification:**
- Suite `npm run lint` now passes with warnings only.
- Suite `npm test` passed: 14 files, 179 tests.
- Suite `npm run build` passed.
- Finder focused reviewer-smoke/session tests passed.
- Finder `npm run lint` passed.
- Finder `npm run build` passed.
- Finder full Sparkle Finder suite passed after rerun: 38 files, 496 tests. The first run had one unrelated timeout in `auth-routes.test.ts`; rerunning that file and then the full suite passed.
- Deployed Finder Nic-Nac smoke passed against `https://sparkle-finder-dev.vercel.app` with `stream_ok` and no hard-fail phrases.
- Live URL checks returned `200` for both `https://sparkle-suite-demo.vercel.app/` and `https://sparkle-finder-dev.vercel.app/`.

**Result:**
- The two prior caveats are closed: Suite repo-wide lint no longer fails, and Finder has a non-personal deployed Nic-Nac smoke path while preview auth stays disabled in production.

---

## June 22, 2026 - Finder Nic-Nac Telemetry Migration Applied

**What changed:**
- Applied Sparkle Finder migration `20260622173000_finder_nic_nac_conversation_telemetry.sql` through the Supabase Dashboard SQL editor for Finder project `sparkle-finder-auth` / `pzksocboqauqjdtsgpdp`.
- Deployed Finder commit `c7eaf2c feat: persist Finder Nic-Nac telemetry` to production deployment `dpl_1Q9mZ7WG4eNFWnzhbG7Loco3PbDU`, aliased at `https://sparkle-finder-dev.vercel.app`.

**Verification:**
- Supabase verification query passed with all checks `true`: telemetry tables exist, RLS is enabled, authenticated users have select-only access, service-role has select/insert/update/delete, read-own policies exist, expected updated-at triggers exist, expected indexes exist, and no required columns are missing.

**Follow-up completed:**
- Added a secured Finder internal smoke route and `npm run smoke:finder-telemetry-runtime`, rotated the Vercel Production `SPARKLE_FINDER_INTERNAL_SMOKE_TOKEN`, and deployed Finder production `dpl_8tjDSHhUZ2cfvrJtQM61yAXAtNZa`.
- `https://sparkle-finder-dev.vercel.app` now points at that deployment.
- Deployed telemetry runtime smoke passed with row counts `{"conversations":2,"messages":4,"runs":2}`, all telemetry checks true, cleanup `ok:true`, and residual telemetry rows at zero.
- The internal smoke route returns `401` without the bearer token.

---

## June 22, 2026 - Nic-Nac AI And Memory Disclosure Baseline

**What changed:**
- Updated Sparkle Suite privacy policy and terms to disclose Nic-Nac AI assistance, memory, telemetry/tool context, possible bounded Suite/Finder memory sharing for linked reps, operator/Lab review for support and quality, model/service-provider processing, sensitive-info caution, surface-gated tool access, output review responsibility, and off-mission/excessive-use limits.
- Updated Sparkle Suite `/start` agreement copy so new reps acknowledge Terms, Privacy Policy, and Nic-Nac AI assistance/memory before starting account creation.
- Updated Sparkle Finder privacy policy and terms with matching Finder-specific disclosure for Silver, Showcase, Wishlist, Favorite Reps, linked-rep context, and shared Nic-Nac memory.
- Updated Finder signup/account privacy acknowledgment copy to clearly mention Nic-Nac AI assistance and memory.

**Verification:**
- Suite focused legal/start tests passed.
- Suite curated `npm test` passed.
- Suite `npm run build` passed.
- Finder focused route/legal tests passed.
- Finder full `npm run test` passed.
- Finder `npm run build` passed.
- Suite deployment `dpl_6ukmGgSaWQWdF8WGzFNjNDec4YdA` is aliased at `https://sparkle-suite-demo.vercel.app`; live checks confirmed updated `/start`, `/privacy-policy`, and `/terms-and-conditions` disclosure text.
- Finder deployment `dpl_7Ao34Wu45BvhCmyCeXDWjn6T4NTE` is aliased at `https://sparkle-finder-dev.vercel.app`; live checks confirmed updated `/auth/sign-up`, `/privacy-policy`, and `/terms-and-conditions` disclosure text.

**Still open:**
- This is a product disclosure baseline, not attorney-approved legal advice. Before broad rollout, complete attorney/final policy review and polish public marketing/onboarding copy around Nic-Nac memory.

---

## June 22, 2026 - Secret Rep ID Claim Deployment And Finder Smoke

**What changed:**
- Configured `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN` as a shared sensitive Vercel env var for Suite and Finder production/preview.
- Deployed Suite production to `dpl_6LUJB79BHeYsfMWLSUtEsRqWUMbY` / `https://sparkle-suite-kkh37c6w7-louis-2849s-projects.vercel.app`.
- Moved `https://sparkle-suite-demo.vercel.app` to the same Suite deployment.
- Deployed Finder production to `dpl_6FAPcdx2SgZoxGhmdw4UuYx2Eyfc` / `https://sparkle-finder-oimbu0wl1-louis-2849s-projects.vercel.app`, aliased at `https://sparkle-finder-dev.vercel.app`.
- Refreshed Finder Vercel production/preview Supabase runtime envs from the dedicated Finder Supabase project.

**Verification:**
- Suite internal claim endpoint now returns `401 unauthorized` instead of `503 not configured` on `www.yoursparklesuite.com` and `sparkle-suite-demo.vercel.app` when called without the bearer token.
- Finder deployed browser smoke created a temporary confirmed Finder auth user, signed in through `https://sparkle-finder-dev.vercel.app`, submitted the Secret Rep ID claim form, verified the profile rep link and `silver_rep_included` membership in Supabase, then deleted the temporary user and rows.
- Finder deployed linked-rep Nic-Nac smoke returned HTTP `200` from `/api/finder/nic-nac`, streamed through OpenAI, and found zero hard-fail phrases; the temporary user and rows were cleaned up.

**Issue found and fixed:**
- The deployed claim smoke exposed missing `service_role` grants on Finder `sparkle_finder_profiles` and `sparkle_finder_memberships`. Finder migration `20260622155712_finder_rep_claim_service_role_grants.sql` now grants the server-side claim writer the needed table privileges.

---

## June 22, 2026 - Secret Rep ID Number Bridge Copy

**What changed:**
- `/api/nic-nac/me` now returns `secret_rep_id_number` as a compatibility alias for the saved Live Queue sync code.
- The Sparkle Suite workspace topbar now labels the private rep number as `Secret Rep ID Number`.
- Required Live Queue setup now tells reps to keep that number private and use it when the extension asks for their code.
- Required setup prompt guidance now tells Nic-Nac to say `Secret Rep ID Number` in rep-facing setup language while still using the internal `liveQueueSyncCode` field/tool results.

**Verification:**
- Focused Suite regression passed: 20 files, 311 tests.
- Suite curated `npm test` passed: 14 files, 179 tests.
- Suite `npm run build` passed.
- Full Suite Vitest sweep still has unrelated pre-existing failures in start/prelaunch server-page render tests and master brand doc expectations; the touched Suite tests passed.

---

## June 22, 2026 - Nic-Nac OpenAI Runtime Env Alignment

**What changed:**
- Confirmed Suite Vercel already had `OPENAI_API_KEY` for production, preview, and development.
- Added explicit Suite Vercel model env vars across production, preview, and development:
  - `NIC_NAC_HUMAN_DEFAULT_MODEL=gpt-5.4`
  - `NIC_NAC_HUMAN_ESCALATED_MODEL=gpt-5.5`
  - `NIC_NAC_UTILITY_MODEL=gpt-5.4-mini`
  - `NIC_NAC_LAB_SYNTHESIS_MODEL=gpt-5.5`
- Added Finder Vercel `OPENAI_API_KEY` for production and preview, then deployed Finder production so the env is live.
- Direct OpenAI API verification passed for `gpt-5.4` and `gpt-5.4-mini`.

**Caveat:**
- Finder deployed route smoke still requires a real authenticated Silver session. Production preview auth remains disabled, which is correct for safety.

---

## June 22, 2026 - Nic-Nac Mission Guardrails

**What changed:**
- Added a conservative Nic-Nac mission-scope classifier in Suite and Finder.
- Suite `/api/nic-nac` now redirects clear off-mission requests before memory-card loading, workflow setup, tool building, and model streaming. The redirect persists the user/assistant messages, logs a zero-token/zero-cost `mission_redirect` run, and streams a normal UI-message response.
- Finder `/api/finder/nic-nac` now redirects clear off-mission Silver requests before OpenAI configuration checks, Supabase memory setup, tool setup, or model streaming. Redirect streams use generated assistant ids, not a fixed id.
- Explicit off-mission categories include therapy, grocery lists, homework/content drafting, travel planning, medical advice, legal/financial advice, and general-chatbot use. The guard checks explicit redirect patterns before broad Sparkle/BP mission keywords so mixed prompts like "therapist for rep burnout" or "grocery list for live show snacks" are still redirected.

**Verification:**
- Independent review agent found the mission-keyword false-negative risk and a weak Suite route-order test; both were fixed before closeout.
- Suite focused mission-guard suite passed: 3 files, 19 tests.
- Suite route-runtime mission redirect regression now calls `/api/nic-nac` with mocked paid auth and proves the static redirect persists/logs a zero-cost response before Suite memory, workflow, tool, model setup, or model streaming.
- Finder focused mission-guard/route suite passed: 3 files, 24 tests.
- Broad Suite Nic-Nac sweep passed: 106 files passed, 1 skipped; 735 tests passed, 1 skipped.
- Finder full Vitest suite passed: 34 files, 455 tests.
- Suite `npm run build` passed.
- Finder `npm run build` passed.
- Finder Nic-Nac missing-key guard smoke passed against a local `next start` server with `blocked_missing_model`.
- Finder Nic-Nac off-mission route smoke passed with `stream_ok` for prompt `Make my grocery list for live show snacks.` while `OPENAI_API_KEY` was empty.
- Broader Finder local smoke passed: 17 Playwright tests passed, 2 skipped.

**Still open:**
- Finder deployed authenticated model-stream smoke still needs Finder Vercel `OPENAI_API_KEY`.
- Suite now has deterministic route-order and route-runtime proof for the static mission redirect path. A true deployed authenticated browser/API smoke for that exact path remains optional future proof if the risk level warrants it.
- Secret Rep ID rep-facing copy/UI, Finder claim UI/storage, and legal/privacy/onboarding disclosure remain future slices and were not changed in this Nic-Nac-only closeout.

## June 22, 2026 - Finder Nic-Nac Route Smoke Harness

**What changed:**
- Added `npm run smoke:finder-nic-nac` and `npm run smoke:finder-nic-nac:guard` in `C:\Users\louis\sparkle-finder-repo`.
- The smoke script builds Finder, starts a local production server on `127.0.0.1:4310`, obtains a local Silver preview-auth cookie, posts a UI-message request to `/api/finder/nic-nac`, and checks the response.
- `smoke:finder-nic-nac` is the configured-model smoke and should fail if Finder returns `model_not_configured`. `smoke:finder-nic-nac:guard` is the explicit missing-key guard smoke and treats `503 { error: "model_not_configured" }` as the expected safe blocked state.
- Successful streams are checked for Nic-Nac hard-fail phrases, including phrases split across framed AI SDK text deltas.
- Fixed Finder `/api/finder/nic-nac` to pass the local preview-auth cookie into `getCurrentSparkleFinderAccount`, guarded by the existing local preview-auth flag, so route smoke reaches the Nic-Nac model guard instead of failing at `401 unauthenticated`.

**Verification:**
- TDD red/green completed for local preview-auth pass-through on the Finder Nic-Nac route.
- TDD red/green completed for the configured-model default, explicit guard command, and framed-stream hard-fail phrase detection.
- Focused Finder Nic-Nac route/smoke-script tests passed: 2 files, 19 tests.
- `npm run smoke:finder-nic-nac:guard` passed with `blocked_missing_model` at `http://127.0.0.1:4310`.
- Full Finder Vitest suite passed: 32 files, 441 tests.
- Finder `npm run build` passed and includes `/api/finder/nic-nac`.
- Broader Finder local smoke passed: 17 Playwright tests passed, 2 skipped, with local preview auth at `http://127.0.0.1:4310`.
- Independent review agent found the initial smoke naming/stream-text risks; both were fixed and reverified.

**Still open:**
- Deployed Finder Nic-Nac model-stream smoke still needs Finder Vercel `OPENAI_API_KEY`. After that secret is configured and deployed, rerun `smoke:finder-nic-nac` in configured mode against the deployed Finder URL.

## June 22, 2026 - Finder Nic-Nac Surface Tool Policy

**What changed:**
- Added a Finder-local Nic-Nac product/tool policy that classifies every Finder routed intent by required capability.
- Finder `/api/finder/nic-nac` now filters requested intents through product context before active tools and prompt text are built.
- Linked Sparkle Suite reps asking for Sparkle Suite workspace mutations from Sparkle Finder now get the Suite-login boundary with no Finder tools exposed for that turn.
- Mixed turns such as "add this to my Trade Board and remember..." suppress Finder memory tools for the same blocked Suite mutation turn instead of using Finder memory as a workaround.
- Common Suite mutation shorthand is covered, including `my board`, trade status, homepage/hero edits, and live-show scheduling, while read/discovery wording such as "show me my Trade Board" stays out of the mutation block.
- Added a Finder Nic-Nac model configuration guard: authenticated Silver route calls now fail fast with `503 { error: "model_not_configured" }` when `OPENAI_API_KEY` is missing instead of starting a broken model stream.

**Verification:**
- TDD red/green completed for the Finder product-context policy, route-level no-tools boundary, shorthand mutation wording, mixed mutation+memory suppression, and board discovery vs mutation wording.
- TDD red/green completed for the missing-OpenAI-key route guard.
- Adjacent Finder Nic-Nac suite passed: 7 files, 34 tests.
- Full Finder Vitest suite passed: 31 files, 431 tests.
- Finder `npm run build` passed and includes `/api/finder/nic-nac`.
- Finder local smoke passed: 17 Playwright tests passed, 2 skipped, with local preview auth at `http://127.0.0.1:4310`.
- Suite focused core policy/prompt/linked-memory sweep passed: 4 files, 22 tests.
- Independent reviewer agent found two policy gaps; both were reproduced with failing tests and fixed before this checkpoint.

**Still open:**
- Deployed Finder Nic-Nac smoke still needs Finder Vercel `OPENAI_API_KEY`; `SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN` is configured for production and preview in both Suite and Finder, but new deployments/smoke are still needed before calling the deployed bridge ready.
- Finder Secret Rep ID claim UI/storage, rep-facing Suite Secret Rep ID copy, legal/privacy/onboarding disclosures, and authenticated deployed smoke remain future slices.

## June 22, 2026 - Finder Linked Rep Suite Memory Bridge

**What changed:**
- Added Suite server-only `/api/internal/finder/rep-memory`, protected by `SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN`, for Sparkle Finder to load bounded safe Suite rep memory for an already linked rep.
- The Suite bridge reuses existing `rep_notes` memory-card mapping and the Nic-Nac context assembler, so unsafe/prompt-injection notes are blocked and only linked-human summaries are returned.
- Added Finder `suite-linked-rep-memory` client that calls the Suite internal memory endpoint only for linked reps, verifies the response `suiteRepId`, filters unsafe returned text again, caps summaries, and fails closed on missing env, network errors, non-OK responses, malformed payloads, or rep mismatch.
- Finder `/api/finder/nic-nac` now merges safe Finder customer memory with safe linked Suite rep memory before building the system prompt. Unlinked collectors do not call the Suite memory bridge.
- Added `SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN` placeholders to both repos' `.env.example` files.

**Verification:**
- Suite focused linked-memory bridge test passed: 7 tests.
- Finder focused route/client tests passed: 2 files, 11 tests.
- Related Suite memory/internal sweep passed: 5 files, 27 tests.
- Related Finder account/tool/prompt/route sweep passed: 6 files, 56 tests.
- Broad Suite Nic-Nac/internal-Finder sweep passed: 106 files passed, 1 skipped; 745 tests passed, 1 skipped.
- Finder full test suite passed: 29 files, 421 tests.
- Suite `npm run build` passed and includes `/api/internal/finder/rep-memory`.
- Finder `npm run build` passed and includes `/api/finder/nic-nac`.

**Still open:**
- `SPARKLE_FINDER_TO_SUITE_REP_MEMORY_TOKEN` is now configured in Suite and Finder Vercel production/preview; the deployed bridge still needs a fresh deployment and smoke before it is called live-ready.
- Finder Vercel project still needs `OPENAI_API_KEY` before authenticated Silver Finder Nic-Nac model streaming can be smoked live.
- Suite cannot independently prove Finder's user-to-rep link; the bridge relies on Finder server-side authenticated account state plus the internal bearer token. Future claim/storage work should make the link durable and auditable in Finder.

## June 22, 2026 - Finder Nic-Nac OpenAI Adapter

**What changed:**
- In `C:\Users\louis\sparkle-finder-repo`, moved Finder `/api/finder/nic-nac` from hardcoded Anthropic Haiku to an OpenAI-only Nic-Nac model policy adapter.
- Added Finder-local Nic-Nac model policy/provider helpers matching the Suite policy shape.
- Replaced Finder's unused `@ai-sdk/anthropic` dependency with `@ai-sdk/openai`.
- Added `.env.example` placeholders for `OPENAI_API_KEY` and Nic-Nac model override vars.
- Added Finder linked-rep prompt context so Nic-Nac knows the current surface is Sparkle Finder, treats linked reps as the same assistant identity when safe memory context exists, and tells reps to open/log into Sparkle Suite before Sparkle Suite workspace mutations.
- Added automatic safe Finder-memory prompt preload so Finder Nic-Nac receives bounded safe customer memory before the model answers, while unsafe memory is filtered before prompt assembly.

**Verification:**
- TDD red/green completed for route-level OpenAI policy routing, no Anthropic/Haiku hardcoding, and env placeholder coverage.
- Focused Finder route test passed: 1 file, 4 tests.
- Related Finder account/entitlement tests passed: 3 files, 43 tests.
- Full Finder Vitest suite passed: 28 files, 416 tests after the linked-rep prompt boundary and Finder memory preload.
- Finder production `npm run build` passed and included `/api/finder/nic-nac`.

**Still open:**
- Vercel project `sparkle-finder-dev` is missing `OPENAI_API_KEY`, so deployed authenticated Silver Finder Nic-Nac model streaming cannot be called runtime-ready until Louis configures/provides that secret.
- Finder still needs shared linked-human memory, product-context tool policy, Secret Rep ID claim UI/storage, and authenticated deployed smoke after env setup.

## June 21, 2026 - Nic-Nac OpenAI-Only Provider

**What changed:**
- Removed the Anthropic fallback from Nic-Nac's shared model provider.
- Nic-Nac model policy now exposes OpenAI as the only current provider.
- Removed the stale Anthropic cache-control option from the authenticated workspace Nic-Nac route.
- Updated public Nic-Nac route tests and telemetry fixtures so active Nic-Nac tests no longer mock or fixture old Haiku routing.

**Verification:**
- TDD red/green completed for the OpenAI-only Nic-Nac provider guard.
- Focused provider/model/public-route/telemetry tests passed: 5 files, 62 tests.
- Broad internal Nic-Nac/Lab/Finder/public sweep passed: 117 files passed, 1 skipped; 886 tests passed, 1 skipped.
- `npm run build` passed locally.
- Vercel preview deployment passed and built successfully: `https://sparkle-suite-4rpgzoala-louis-2849s-projects.vercel.app`.
- Stable demo alias now points to `https://sparkle-suite-4rpgzoala-louis-2849s-projects.vercel.app` / deployment `dpl_EHfC3sakh8jM5yhn8TqSdk6fGrxE`.
- Stable deployed smoke passed with Node fetch: root `/` returned `200`, `/control-center/lab` redirected unauthenticated users to `/login?redirect=%2Fcontrol-center%2Flab`, `/api/internal/sparkle-lab/weekly` returned `401` without cron auth, and `/api/internal/finder/rep-claim` returned `503` closed/not configured because the rep-claim token is not configured.

**Still open:**
- `lib/prelaunch/scout.ts` still uses Anthropic/Haiku, but it is outside Nic-Nac runtime and was left untouched under Louis's boundary.
- Sparkle Finder's separate repo still needs its own Nic-Nac model adapter migration later.

## June 21, 2026 - Nic-Nac Model Cost Guardrail

**What changed:**
- Tightened Nic-Nac OpenAI model-cost matching so approved base models and dated snapshots are priced, but unapproved suffix families such as `gpt-5.5-pro`, `gpt-5.4-pro`, and `gpt-5.4-nano` cannot accidentally reuse base `gpt-5.5` / `gpt-5.4` pricing.
- Added a Sparkle Lab preflight guard: if `lab_synthesis` is configured to a model without an approved Nic-Nac pricing entry, Lab records a `lab_note` and skips the model call instead of spending credits and treating the run as free.
- Confirmed the current OpenAI docs still list GPT-5.5 as latest and the local Standard short-context pricing table matches the documented GPT-5.5, GPT-5.4, and GPT-5.4-mini prices.

**Verification:**
- TDD red/green completed for strict model-family pricing and Lab synthesis skip behavior.
- Focused model/Lab tests passed: 2 files, 11 tests.
- Adjacent model/Lab route tests passed: 9 files, 39 tests.
- Broad internal Nic-Nac/Lab/Finder/public sweep passed: 117 files passed, 1 skipped; 885 tests passed, 1 skipped.
- `npm run build` passed locally.
- Vercel preview deployment passed and built successfully: `https://sparkle-suite-24186fjqa-louis-2849s-projects.vercel.app`.
- Stable demo alias now points to `https://sparkle-suite-24186fjqa-louis-2849s-projects.vercel.app` / deployment `dpl_9kq8Ugc2bJZ1dXXm1zk7FaeW3Yqn`.
- Stable deployed smoke passed with Node fetch: root `/` returned `200`, `/control-center/lab` redirected unauthenticated users to `/login?redirect=%2Fcontrol-center%2Flab`, `/api/internal/sparkle-lab/weekly` returned `401` without cron auth, and `/api/internal/finder/rep-claim` returned `503` closed/not configured because the rep-claim token is not configured.

**Still open:**
- Lab model synthesis remains feature-flagged off in Vercel.
- Pro/nano model families are intentionally not approved for Lab spend until an explicit pricing/policy decision adds them.

## June 21, 2026 - Nic-Nac Surface Tool Policy Refinement

**What changed:**
- Added explicit capability metadata for every Nic-Nac routed tool intent so future product adapters cannot accidentally treat mixed Suite tool packs as safe in Finder or public surfaces.
- Split shared memory from Suite workspace mutation requirements in the core tool policy.
- Linked Sparkle Finder reps can now keep the `memory` intent available at the core-policy level while Suite workspace mutation intents such as Trade Board and Calendar remain blocked with the Sparkle Suite login boundary message.
- Kept mixed packs such as `resources` and `catalog` conservative as Suite-workspace requirements until product-specific Finder/public tool registries split read-only actions from mutation/reporting actions.

**Verification:**
- TDD red/green completed for linked Finder memory plus explicit intent-capability coverage.
- Focused core/prompt/model/telemetry suite passed: 6 files, 29 tests.
- Broader core/prompt/routing suite passed: 6 files, 69 tests.
- Adjacent Trade Board workflow suite passed: 4 files, 62 tests.
- Adjacent internal Finder/public Nic-Nac suite passed: 4 files, 128 tests.
- Broad internal Nic-Nac/Lab/Finder/public sweep passed: 117 files passed, 1 skipped; 882 tests passed, 1 skipped.
- `npm run build` passed locally.
- Vercel preview deployment passed and built successfully: `https://sparkle-suite-6d18n6auo-louis-2849s-projects.vercel.app`.
- Stable demo alias now points to `https://sparkle-suite-6d18n6auo-louis-2849s-projects.vercel.app` / deployment `dpl_AArXn4oSUHG4BujyZQ7H5dGSJSNc`.
- Stable deployed smoke passed with Node fetch: root `/` returned `200`, `/control-center/lab` redirected unauthenticated users to `/login?redirect=%2Fcontrol-center%2Flab`, `/api/internal/sparkle-lab/weekly` returned `401` without cron auth, and `/api/internal/finder/rep-claim` returned `503` closed/not configured because the rep-claim token is not configured.

**Still open:**
- No Sparkle Finder repo, Finder UI, rep-facing Secret Rep ID UI/copy, customer-facing site, or legal/privacy/onboarding copy was changed.
- Future Finder adapter work still needs product-specific tool packs so Finder-safe catalog/resources actions can be allowed without exposing Suite mutation tools.

## June 21, 2026 - Nic-Nac Duplicate Listing And Finder Claim Hardening

**What changed:**
- Hardened the `add_listing` tool so an item number/design already active on the rep's Trade Board no longer gets treated as a flat duplicate refusal. Nic-Nac now requires the follow-up: `That item number is already on your Trade Board. Are we adding another physical piece of the same design?`
- Allowed the duplicate add to proceed only when the latest rep context clearly confirms another/additional/second physical piece, an explicit quantity, or a yes after Nic-Nac asked the duplicate-physical-piece question.
- Tightened Suite's internal Sparkle Finder rep-claim validator so a Secret Rep ID Number must map to an active rep that is also public-Finder eligible through a paid workspace or ready launch-build path.
- Removed the stale `plain background` instruction from the internal Finder jewelry intake rejection copy and replaced it with clear/centered Nic-Nac photo-QA language.
- Added the missing `SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN` placeholder to `.env.example` and aligned the cross-ecosystem plan with the implemented `SPARKLE_LAB_WEEKLY_RUNS_ENABLED` flag.

**Verification:**
- Focused internal regression passed: 11 files, 158 tests.
- Broad internal Nic-Nac/Lab/Finder sweep passed: 115 files passed, 1 skipped; 774 tests passed, 1 skipped.
- `npm run build` passed locally.
- Vercel preview deployment passed and built successfully: `https://sparkle-suite-ks5ypptkz-louis-2849s-projects.vercel.app`.
- Stable demo alias now points to `https://sparkle-suite-ks5ypptkz-louis-2849s-projects.vercel.app` / deployment `dpl_BdNddYtiBUp2eWnCQPLowkwLsGPq`.
- Stable deployed smoke passed with Node fetch: root `/` returned `200`, `/control-center/lab` redirected unauthenticated users to `/login?redirect=%2Fcontrol-center%2Flab`, and `/api/internal/sparkle-lab/weekly` returned `401` without cron auth.

**Still open:**
- `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN` and preview `SPARKLE_FINDER_TO_SUITE_INTAKE_TOKEN` are not configured, so Suite internal Finder routes correctly return `503` closed/not configured on stable demo.
- Sparkle Finder repo claim UI/storage, Finder Nic-Nac adapter work, rep-facing Secret Rep ID copy/UI, and legal/privacy/onboarding disclosure remain untouched pending Louis approval.

## June 21, 2026 - Sparkle Lab Model Synthesis Harness

**What changed:**
- Added a model synthesis harness to the Sparkle Lab runner, gated behind `SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED=true`.
- Synthesis uses the existing `lab_synthesis` Nic-Nac model policy only when explicitly enabled and only after model-call, premium-call, and cost caps allow it.
- When enabled, the Lab can create a `report` artifact in `sparkle_lab_artifacts`, record model/premium call counts, and estimate model cost from returned usage.
- If synthesis is disabled, the current manual and weekly Lab runners remain deterministic and make no model calls.
- Added the synthesis flag to `.env.example`.

**Verification:**
- Focused Lab tests passed: 6 files, 21 tests.
- Broad Nic-Nac/Lab/Finder-claim sweep passed: 114 files passed, 1 skipped; 760 tests passed, 1 skipped.
- `npm run build` passed locally.
- Vercel preview deployment for commit `0089964` completed after the local CLI deploy timed out; latest ready preview was `https://sparkle-suite-ozj1u1i2d-louis-2849s-projects.vercel.app`.
- Stable demo alias now points to `https://sparkle-suite-ozj1u1i2d-louis-2849s-projects.vercel.app` / deployment `dpl_Hq9gc8iG99ZrX9iL2zdUH68fvG4H`.
- Stable deployed smoke passed with Node fetch: root `/` returned `200`, `/api/internal/sparkle-lab/weekly` returned `401` without auth and with wrong auth, and `/control-center/lab` redirected unauthenticated users to `/login?redirect=%2Fcontrol-center%2Flab`.

**Still open:**
- `SPARKLE_LAB_MODEL_SYNTHESIS_ENABLED` is not enabled in Vercel, so no model-powered Lab spend is active.
- Finder integration, Finder claim UI/storage, and Suite rep-facing Secret Rep ID copy/UI remain untouched pending Louis approval.

## June 21, 2026 - Sparkle Lab Weekly Guardrail Loop

**What changed:**
- Added authenticated internal weekly Sparkle Lab route at `/api/internal/sparkle-lab/weekly`.
- Wired the weekly route into `vercel.json` at `0 6 * * 0` for the current Sunday overnight beta window.
- Kept weekly runs disabled by default unless `SPARKLE_LAB_WEEKLY_RUNS_ENABLED=true`.
- Hardened Lab budget behavior so reaching an allowed reporting cap is recorded, while only exceeding a hard cap marks the run stopped.
- Added monthly scheduled spend pre-checks so weekly runs stop before sampling when the $20 monthly scheduled cap is already reached.
- Updated `.env.example` with OpenAI-first model policy keys, Lab flags, cron secret, and Finder-to-Suite rep-claim token placeholders.

**Verification:**
- Focused Lab/cron/page tests passed: 8 files, 26 tests.
- Broad Nic-Nac/Lab/Finder-claim sweep passed: 114 files passed, 1 skipped; 759 tests passed, 1 skipped.
- `npm run build` passed locally and Vercel preview build passed.
- Stable demo alias now points to `https://sparkle-suite-pi79zhpzq-louis-2849s-projects.vercel.app`.
- Stable deployed smoke passed with Node fetch: root `/` returned `200`, `/api/internal/sparkle-lab/weekly` returned `401` without auth and with wrong auth, and `/control-center/lab` redirected unauthenticated users to `/login?redirect=%2Fcontrol-center%2Flab`.

**Still open:**
- Weekly and manual Lab runners remain feature-flagged off and deterministic/no-model-call.
- Model-powered Lab synthesis, enabling flags, and authenticated operator/manual run smoke remain future work.
- Finder repo integration and rep-facing Secret Rep ID copy/UI were not changed in this checkpoint.

## June 21, 2026 - Nic-Nac Shared Core Implementation Started

**What changed locally:**
- Added OpenAI-first Nic-Nac model policy/provider routing in Sparkle Suite, replacing hardcoded route-level Haiku model usage with configurable policy keys.
- Added model/run/tool telemetry fields for policy, provider, reasoning, estimated cost, product, surface, actor type, account tier, linked human id, and tool run id.
- Added shared product context and surface-gated Suite tool intent policy. The authenticated Suite route now builds `sparkle_suite` / `rep_workspace` context and filters requested tool intents through that policy before building tools.
- Added reusable core persona/surface prompts for Nic-Nac, including Virgo behavior, mission focus, off-scope redirect, Sparkle Finder/Suite boundary messages, and Lab researcher/recommender boundaries.
- Added bounded context assembly plus automatic safe memory cards from existing `rep_notes`. The Suite route now feeds safe, scoped, capped memory into the prompt without relying on the model to call `read_recent_rep_notes` first. Unsafe/prompt-injection memory is blocked before prompt assembly.
- Added memory-context telemetry fields for card count, blocked-card count, memory scopes, and truncation.
- Added internal Sparkle Lab budget cap helpers for weekly, manual, and urgent runs.
- Added Sparkle Lab schema migration for bounded runs, findings, and artifacts with service-role-only RLS. The migration has since been applied and remote RLS/policies were verified service-role-only.
- Added read-only internal Sparkle Lab Control Center page at `/control-center/lab`, linked from `/control-center`, with Nic-Nac Lab, Sparkle Suite Lab, Sparkle Finder Lab, Ops Lab, Research Desk, latest run, usage caps, findings, priorities, and artifacts.
- Added feature-flagged manual Sparkle Lab runner endpoint at `/api/control-center/sparkle-lab/run`. It is disabled unless `SPARKLE_LAB_MANUAL_RUNS_ENABLED=true`, is deterministic-only for now, and makes no model calls or provider-credit spend.
- Added authenticated weekly Sparkle Lab cron route at `/api/internal/sparkle-lab/weekly`, wired to Vercel cron for Sunday overnight, disabled by default unless `SPARKLE_LAB_WEEKLY_RUNS_ENABLED=true`, with monthly scheduled cap checks before sampling and no model calls in the deterministic runner.
- Hardened duplicate Trade Board item-number behavior so an existing board item prompts for another physical piece instead of refusing as a duplicate.
- Added a server-only Suite internal API at `/api/internal/finder/rep-claim` for Sparkle Finder to validate a Secret Rep ID Number with a server token. It reads `live_queue.sync_code`, then `reps`, and returns only safe rep-link/Silver badge entitlement data. It does not change live queue sync behavior and does not update Finder yet.

**Finder audit:**
- A read-only sub-agent confirmed `C:\Users\louis\sparkle-finder-repo` exists, is clean on `codex-sparkle-finder-v1`, and already has `sparkle_suite_rep_id`, `silver_rep_included`, a Rep badge, Finder Nic-Nac route/prompt/tools/tests, and Suite public Finder API consumers.
- Finder still has hardcoded Anthropic Haiku in its Nic-Nac route, fixture-backed rep entitlement, no Secret Rep ID claim route, and thinner conversation persistence than Suite.

**Verification:**
- Focused Nic-Nac/Public Nic-Nac suite passed: 14 files, 137 tests.
- Full Nic-Nac suite passed: 100 files passed, 1 skipped; 695 tests passed, 1 skipped.
- Latest broad internal sweep passed: `npm exec vitest run tests/nic-nac tests/sparkle-lab tests/control-center-page.test.ts tests/control-center-sparkle-lab-page.test.ts tests/control-center-sparkle-lab-run-route.test.ts tests/sparkle-finder-rep-claim.test.ts tests/sparkle-finder-internal-intake.test.ts` returned 111 passed files, 1 skipped, 748 passed tests, 1 skipped.
- `npm run build` passed and includes `/control-center/lab`, `/api/control-center/sparkle-lab/run`, and `/api/internal/finder/rep-claim`.
- `git diff --check` passed with only normal CRLF warnings.

**Still open:**
- Finder repo changes have not been made.
- Secret Rep ID user-facing copy/UI has not been changed because that touches rep-facing setup/account surfaces and requires a stop-and-notify checkpoint first. Finder claim UI/storage is also not implemented yet.
- Sparkle Lab model-powered synthesis and real deployed Lab smoke are not implemented yet. Manual and weekly runners are feature-flagged off by default; the current deterministic runner makes no model calls.
- No deployed stable-demo smoke was run for this local implementation slice yet.

---

## June 21, 2026 - Nic-Nac And Sparkle Lab Scalable Memory Architecture Locked

**What happened:**
- Louis clarified the long-term Nic-Nac product expectation: one production Nic-Nac should flow across Sparkle Suite and Sparkle Finder like the same assistant, with shared memory for linked humans and tool execution gated only by the current product/security surface.
- Louis also clarified that the proactive loop should be more than passive logs. Sparkle Lab should study failures, trouble tickets, business health, Sparkle Suite, Sparkle Finder, internal operations, and research opportunities, then recommend improvements without mutating production.

**Locked decisions:**
- The private code formerly described as the Live Queue code is now the Secret Rep ID Number. It remains private to the rep, keeps its Live Queue sync use, and becomes the Sparkle Finder rep-claim code.
- A linked Sparkle Finder rep account maps to the durable Sparkle Suite `rep_id`; Nic-Nac follows that durable link rather than the visible code.
- Linked reps get shared Nic-Nac memory across Sparkle Suite and Sparkle Finder, but Sparkle Suite mutations must happen from Sparkle Suite and Finder mutations from Finder.
- A claimed Sparkle Finder rep receives Silver tier and a BP Rep / verified rep badge, but no extra Finder powers beyond Silver.
- Production Nic-Nac cannot self-mutate. Lab Nic-Nac can study, test, draft, and recommend only.
- Sparkle Lab should live inside Control Center with Nic-Nac Lab, Sparkle Suite Lab, Sparkle Finder Lab, Ops Lab, and Research Desk sections.
- Sparkle Lab can automatically create internal findings, replay/eval cases, analyses, reports, research briefs, and proposals, but cannot change production behavior.
- Sparkle Lab should not run continuously. Default direction is a weekly scheduled run, initially Sunday at 2:00 AM America/New_York for Monday morning results, with adjustable cadence and explicit max cost/model-call/runtime/reviewed-record limits.
- Initial lab caps are intentionally small: $5 weekly run, $20 monthly scheduled cap, $2 manual/on-demand run, $3 urgent issue run unless raised, 20 weekly model calls max with 4 premium/deep calls max, 20 minutes weekly runtime, 250 candidate records, 25 deep-analyzed items, at most 3 headline findings, and at most 2 active work priorities.
- Nic-Nac memory is a marketed product feature and should be clear in privacy policy, terms, onboarding, and marketing. Broad user memory controls are not planned for beta.
- Nic-Nac's personality foundation is September Virgo: organized, detail-minded, service-oriented, practical, warm, sweet, professional, and lightly quirky/funny. He may mention being a Virgo only if asked directly or during light/playful conversation, while staying mission-focused and redirecting unrelated chatbot/therapy/grocery-list use.

**Artifact created:**
- `docs/superpowers/specs/2026-06-21-nic-nac-sparkle-lab-scalable-memory-loop.md`

**Implementation posture:**
- This is architecture/spec work only. Implementation should not start until the current Sparkle Finder account/schema model, the existing Live Queue code storage, account-linking shape, OpenAI model choice, legal/privacy copy requirements, and Control Center route convention are inspected or clarified.

## June 21, 2026 - Content-Independent Ticker Speed Rule

**What changed:**
- Louis clarified the product rule: ticker speed must be dynamic and visually consistent regardless of whether a customer Trade Board has 2 pieces or 40 pieces.
- The static public Amethyst homepage, Trade Board, and Join templates now render duplicate ticker loop segments and measure the actual distance between segment starts in the browser.
- Animation duration is computed from rendered distance:
  - Announcements target `46px/s`.
  - Trade Board target `55.2px/s`, roughly 20% faster.
- The shared React `AmethystSiteShell` now uses the same browser-measured ticker rule for future shell-rendered customer sites.
- Static Amethyst public assets were cache-busted to `20260621-ticker-pps`.

**Verification:**
- Regression updated so hardcoded duration-only ticker behavior cannot silently return.
- Local focused tests passed: Amethyst homepage/static asset/public slug/join/trade template suites.
- `npm run qa:amethyst` passed against local `localhost:3001`.
- `npm run build` passed locally and in Vercel.
- Stable demo alias now points to `https://sparkle-suite-o3oczruc9-louis-2849s-projects.vercel.app`.
- Stable live measurement on `https://sparkle-suite-demo.vercel.app`:
  - BlingKitchen: announcements `46px/s`, Trade Board `55.2px/s`.
  - Britt With Bling and Mile High Fizz: announcements `46px/s`; their Trade Board ticker rows currently render the empty-listing message, so there is no scrolling Trade Board content to measure.
  - Synthetic 2-piece Trade Board: `55.2px/s`.
  - Synthetic 40-piece Trade Board: `55.2px/s`.

---

## June 21, 2026 - Trade Board Ticker Rendered-Speed Fix

**What happened:**
- Louis reported the BlingKitchen live-site preview Trade Board ticker still looked slow after the earlier `60s` duration change.
- Rendered screenshot comparison confirmed he was right: the announcement row moved about `50px/s`, while the short BlingKitchen Trade Board row moved only about `7.5px/s`.
- Root cause was not the CSS duration by itself. The Trade Board loop only repeated the available trade items three times, so customer sites with one or two ticker items had a very short track and a tiny actual pixel distance to animate.

**Fix:**
- The public Amethyst homepage, Trade Board, and Join templates now pad Trade Board ticker content to a minimum of 30 rendered items before animation.
- The approved timing remains `72s` for announcements and `60s` for the Trade Board row, but short customer data now has enough rendered track width to move at the intended visual pace.
- Static Amethyst HTML asset versions were cache-busted to `20260621-trade-ticker-distance`.

**Verification:**
- TDD regression added to block reintroducing three-copy Trade Board loops.
- Local BlingKitchen DOM transform measurement after tuning:
  - Announcements: 12 items, `72s`, about `45.9px/s`.
  - Trade Board: 30 items, `60s`, about `56.7px/s`.
  - Trade Board is therefore roughly 23% faster than announcements instead of crawling.
- Focused route/cache tests passed.
- `npm run qa:amethyst` passed against local `localhost:3001`.
- `npm run build` passed locally and in Vercel.
- Stable demo alias now points to `https://sparkle-suite-3p0hczqvy-louis-2849s-projects.vercel.app`.
- Stable `https://sparkle-suite-demo.vercel.app/blingkitchen` served the new `20260621-trade-ticker-distance` assets and measured live at `45.9px/s` announcements vs. `56.7px/s` Trade Board, about 23.5% faster.

---

## June 21, 2026 - Customer-Site Trade Board Ticker Pace Hardening

**Issue fixed:**
- Louis reported the customer-facing announcement ticker finally felt right, but the Trade Board ticker row beneath it was still too slow.
- This had recurred across several sessions because the previous shared rule made announcement and Trade Board ticker rows use the same `72s` duration.

**Template rule now:**
- Customer-site announcement ticker remains at the approved casual speed: `72s`.
- Customer-site Trade Board ticker is about 20% faster: `60s`.
- The timing is encoded as shared template variables, not one-off page styling:
  - `--hp-ticker-duration: 72s`
  - `--hp-trade-ticker-duration: 60s`
  - design-system dual ticker mirrors the same `72s` / `60s` split.
- The React Amethyst site shell also uses `60s` for the Trade Board reverse row so future shell-rendered sites do not drift from the static customer-site template.
- Static Amethyst public assets were cache-busted to `20260621-trade-ticker-pace`.

**Verification completed locally before deploy:**
- Regression was written red first, then green.
- Focused ticker/template suite passed.
- Static asset route and public slug route tests passed.
- `npm run qa:amethyst` passed after starting the local Amethyst dev server.
- `npm run build` passed after clearing a stale generated `.next\dev` type file left by the local dev server.

**Lesson carried forward:**
- Do not describe ticker pacing as "one shared speed" anymore. The correct shared template contract is one shared relationship: announcements at the approved casual pace and Trade Board roughly 20% faster on every current and future Sparkle Suite customer site.

---

## June 21, 2026 - Control Center and Customer-Site Header/Ticker Hardening

**Control Center work completed:**
- Renamed `/control-center` to `Sparkle Suite Control Center`.
- Added a left-hand Control Center options column with Trouble Tickets, Customer Database, and Demo Database.
- Built expandable customer/demo account rows instead of a spreadsheet-style table.
- Customer rows include contact, billing/subscription signals, website/domain/shop/social links, setup status, internal notes, phone field, promo code, and promo-code usage fields.
- Split active customers from demo accounts. Active customers are Mile High Fizz/Lindsey, Britt With Bling/Brittany, and BlingKitchen/Heather. Everything else is in Demo Database.
- Made Customer Database and Demo Database collapsible so future Control Center sections can sit below them cleanly.
- Searched repo-local Open Brain/HQ memory for paying-client phone numbers; no reliable client phone numbers were found in accessible project memory, so phone fields remain present but blank/pending.

**BlingKitchen/public-site work completed:**
- Fixed the BlingKitchen purple-screen/live-preview issue by repairing deployed public assets and cache busting the Amethyst static bundle.
- Audited and repaired BlingKitchen visual issues that Louis flagged, including missing CTA labels/contrast and public route rendering.
- Wired public homepage ticker payloads to real workspace-backed Trade Board and Live Queue state.
- Replaced the bespoke Mile High Fizz/Britt With Bling/BlingKitchen public-site headers with one shared `SparkleSuiteHeaderStack` using the existing Sparkle Suite template header/ticker/Live Queue code path.
- Improved black-velvet/shared-header readability after Louis showed the header text was unreadable above the ticker.
- Standardized ticker speed everywhere to the same medium/casual setting:
  - `tickerSpeed: 1` in homepage/join/trade defaults and all Amethyst appearance presets.
  - `72s` ticker duration in shared homepage CSS, design-system component CSS, and React site shell.
  - Announcement and Trade Board ticker rows now use the same duration.

**Stable demo deploys and checkpoints:**
- `eace754 docs: clarify Sparkle Suite review target`
- `d8d284a fix: wire homepage ticker to live workspace features`
- `b717419 fix: include workspace features in bespoke tickers`
- `623c86b fix: bust Amethyst workspace feature assets`
- `11f545a fix: reuse Sparkle Suite header on hybrid sites`
- `6a4ba4e fix: tune shared site header readability`
- `411c580 fix: standardize ticker speed`
- Final stable demo alias: `https://sparkle-suite-demo.vercel.app`
- Final stable demo target: `https://sparkle-suite-7hwm9e9bs-louis-2849s-projects.vercel.app`
- Verified stable BlingKitchen route: `https://sparkle-suite-demo.vercel.app/blingkitchen`

**Verification completed:**
- Focused Control Center/customer-profile tests passed during Control Center work.
- Focused Amethyst/public-site tests passed across the header/ticker work.
- `npm run qa:amethyst` passed after relevant public-site changes.
- `npm run build` passed after relevant public-site changes; one local Next build left a stale generated `.next\lock` after timeout and was cleared before rerunning successfully.
- Vercel production builds passed and the stable demo alias was promoted after each Louis-reviewable change.
- Playwright screenshots visually verified the stable BlingKitchen header/readability/ticker placement after deploys.
- Final stable CSS verification showed the new `20260620-ticker-casual` asset, two matching `calc(72s / var(--ticker-speed, 1))` durations, and no old `26s`/`68s` ticker durations.

**Lessons learned:**
- For migrated public sites, do not create a lookalike header pattern when Louis asks for the Sparkle Suite template header. Reuse the same code path.
- Shared public-site elements such as header, ticker, Trade Board, and Live Queue must be centralized so fixes land across Mile High Fizz, Britt With Bling, BlingKitchen, and default Amethyst together.
- Cache busting static Amethyst assets is required for visible public-site fixes; otherwise Louis may refresh and still see the old bundle.
- Do not claim a public-site fix is live until `https://sparkle-suite-demo.vercel.app` is promoted and the exact route/assets are verified.
- Ticker speed should be a single global casual/medium setting, not two row-specific speeds.
- Keep Louis-facing closeouts bottom-line-first: what changed, where to review, verification, commit. Avoid cluttering responses with raw preview URLs unless he asks.

**Follow-up:**
- Louis/Brittany still need to accept Britt With Bling.
- Louis/Heather still need to accept BlingKitchen before any domain cutover.
- Control Center needs search/filtering, editable notes/status, richer billing details, and durable customer/demo classification metadata.
- Paying-client phone numbers still need an authorized source or manual entry.

---

## June 20, 2026 - Control Center Title and Customer Database v1

**Work completed:**
- Renamed the main `/control-center` title from `Support Command Center` to `Sparkle Suite Control Center`.
- Added a left-hand `Control Center Options` column with Trouble Tickets and Customer Database navigation.
- Added a Customer Database section that lists reps/customers as expandable rows rather than a spreadsheet.
- Each rep row now shows contact details, billing/subscription signals, public site/domain/shop links, social/streaming links, setup status/current step, and internal notes when present.
- Added `listOperatorCustomerProfiles` so the Control Center starts from all reps and merges profile, subscription, setup, website, social, and notes data.

**Verification:**
- Focused tests passed: `tests/control-center-page.test.ts` and `tests/services/client-account-profiles.test.ts`.
- Local `npm run build` passed.
- Local in-app browser QA passed on `http://127.0.0.1:3001/control-center`: title, left nav, Customer Database, 25 expandable rep rows, BlingKitchen profile expansion, and console health.

**Follow-up:**
- Customer Database v1 is read-only. Inline editing for internal notes/status, filtering/search, and richer billing history remain future Control Center polish.

---

## June 19, 2026 - Binder Folded Back Into Repo

**Problem fixed:**
- Sparkle Suite had drifted into a split workspace: `C:\Users\louis\sparkle-suite` held binder/Open Brain instructions while `C:\Users\louis\sparkle-suite-repo` held the implementation repo.
- Codex Desktop sessions opened from the binder kept hitting sandbox prompts when implementation work touched the repo.

**Change completed:**
- Copied durable binder memory/docs/plans/skills into `C:\Users\louis\sparkle-suite-repo`.
- Updated repo `AGENTS.md` so future agents read repo-local memory from `vault\project-state.md`, `vault\session-log.md`, `vault\decisions.md`, and `vault\open-items.md`.
- Added the missing project skills into repo `.agents\skills`, including `sparkle-suite-existing-site-migration`, `sparkle-suite-demo-smoke`, and `sparkle-nic-nac-agent-architecture`.
- Preserved top-level binder Markdown files under `docs\binder-archive\legacy-root`.
- Updated the old binder `AGENTS.md` to act as a redirect/archive notice, not active workspace instructions.

**Operating rule now:**
- Open future Sparkle Suite Codex sessions from `C:\Users\louis\sparkle-suite-repo`.
- Use workspace-write settings for that repo so code, docs, memory, plans, handoffs, and skills all fall under the same sandbox boundary.
- Leave `C:\Users\louis\sparkle-suite` on disk for now as a redirect/archive; do not delete it.

---

## June 19, 2026 - Britt With Bling, BlingKitchen, Recipes, and Workspace Bridge

**Migration work completed or staged:**
- Britt With Bling was migrated using the Mile High Fizz hybrid strategy from the Ready.ai/Readdy source export at `C:\Users\louis\Downloads\BWB Code\`.
- The Britt With Bling route shape intentionally follows Mile High Fizz rather than preserving every original page. The old diamonds, unicorns, and FAQ pages were dropped; Home, Trade, and Join remain the important public-site surfaces.
- The Britt With Bling Join Team page is a special preservation target because Brittany has many team-member cards. Team names, images, links, and copy need to stay in the right spots and remain editable through Nic-Nac/site data rather than becoming static one-off markup.
- BlingKitchen was migrated from the Ready.ai/Readdy source export at `C:\Users\louis\Downloads\BK Code\` as Heather's custom Sparkle Suite hybrid site.
- BlingKitchen keeps the same Lindsey/Britt migration pattern, with one extra retained route: `/blingkitchen/in-the-pantry` for recipes.

**Nic-Nac recipe editability:**
- Louis confirmed the recipe cards should be led by Nic-Nac and Heather, not maintained as hardcoded source forever.
- A Nic-Nac recipe editing plan was saved at `C:\Users\louis\sparkle-suite\docs\superpowers\plans\2026-06-19-bling-kitchen-nic-nac-recipes.md`.
- Implementation work is staged locally in `C:\Users\louis\sparkle-suite-repo`: DB-backed public-site recipes, media upload support, Nic-Nac tools, dashboard Recipes workspace UI, public Pantry DB-first loader with BlingKitchen fallback recipes, seed script, and BlingKitchen tenant attach helper.

**Repo and operations status:**
- Active branch: `codex/sparkle-cross-phase-hardening`.
- Latest pushed checkpoint after closeout: `ccd4456 feat: migrate BlingKitchen public site`.
- The Sparkle Suite implementation repo was clean and synced with origin after the BlingKitchen closeout.
- Supabase migration `20260619140000_ss_public_site_recipes.sql` was pushed and `supabase db push` reported the remote database up to date.
- Heather/BlingKitchen account provisioning and login were verified for `blingkitchen19@gmail.com`; the temporary password should be rotated after handoff.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to `https://sparkle-suite-5w9d59ald-louis-2849s-projects.vercel.app`.
- Deployed route smoke passed for `/blingkitchen`, `/blingkitchen/trade`, `/blingkitchen/join`, `/blingkitchen/in-the-pantry`, and the Pantry template endpoint. The deployed Pantry template carried the `bling_kitchen_hybrid` variant and 26 recipe entries.

**Workflow lesson:**
- The repeated approval prompts came from the Codex Desktop workspace being opened with write access to the binder instead of the implementation repo, not from Louis changing the intended workflow.
- Durable fix: future Sparkle Suite implementation sessions should start with `C:\Users\louis\sparkle-suite-repo` as the writable workspace, while repo `AGENTS.md` tells the agent to read `C:\Users\louis\sparkle-suite` first for binder/Open Brain instructions.
- The same binder-bridge pattern should be applied to Sparkle Finder so agents can read binder context first without losing write access to the actual repo.

---

## June 16, 2026 - Nic-Nac Smoke Closeout and Sparkle Finder Alignment Note

**Closeout status:**
- Nic-Nac Trade Board ER13229 hardening is now committed, pushed, deployed, and stable-demo verified through active repo commit `bbb66a4 fix: promote boxed photo after collection confirmation`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` points to `https://sparkle-suite-6c0807k4k-louis-2849s-projects.vercel.app`.
- Verification passed: focused required-setup test, full Nic-Nac suite, local build, Vercel build, and three consecutive deployed ER13229 replay smokes using the synthetic reviewer account and real uploaded image parts.

**Caveat to carry forward:**
- One successful smoke still took the confirmation branch and used awkward/internal-sounding wording around photo indexes/workflow state. The tool path was correct and completed the listing, but the next Nic-Nac wording pass should make that branch sound like a natural rep conversation while preserving workflow truth.

**Sparkle Finder alignment note:**
- Louis flagged that Sparkle Finder Silver should eventually use the same Nic-Nac jewelry intake architecture for adding missing jewelry to the library/catalog. The intake rules should match Sparkle Suite: label/details photos are facts only, boxed customer-facing jewelry photos can be valid, typed collection names are accepted, and smoke/eval gates should use real uploaded image parts. The main difference is target mutation: Sparkle Finder adds/updates the jewelry library/catalog rather than adding a Trade Board listing.
- Follow-up clarification from Louis: this should be the exact same shared Nic-Nac core, not a copied Sparkle Finder assistant. Sparkle Suite and Sparkle Finder should route into the same model/agent/toolbox plumbing, with product context deciding permissions and destination. This is a forefront architecture success condition for the whole Sparkle ecosystem.

---

## June 14, 2026 - Theme Readability Fix and Stable Demo Deploy Target Correction

**Issue found:**
- Louis reported that Black Diamond workspace readability was still broken after the first theme-readability fix.
- The first deploy was pushed only to a raw Vercel preview URL, which did not update the Sparkle Suite demo URL Louis actually refreshes.

**Fix completed:**
- Hardened Black Diamond workspace theme overrides across Trade Board, Site Settings, Account, Help & Resources, Calendar, and Jewelry Library surfaces.
- Fixed public light-accent badge/filter readability for homepage step numbers and trade active filter pills.
- Added regression coverage for late Black Diamond workspace overrides and public light-accent controls.
- Clarified memory: Sparkle Suite demo deploy/review target is `https://sparkle-suite-demo.vercel.app/`, not a raw Vercel preview URL.

**Current checkpoint and deploy:**
- Commit pushed: `b441fc7 fix: harden theme readability across workspace`.
- Vercel preview deployment: `https://sparkle-suite-1wz21xae9-louis-2849s-projects.vercel.app`.
- Stable demo alias updated: `https://sparkle-suite-demo.vercel.app/` now points to `https://sparkle-suite-1wz21xae9-louis-2849s-projects.vercel.app`.

**Verification:**
- Focused tests passed: 2 files, 77 tests.
- `npm run build` passed locally.
- Vercel preview build passed.
- Stable demo HTTP smoke passed for `/amethyst/Homepage.html` and `/amethyst/Trade.html`.

**Operational correction:**
- Future Sparkle Suite demo deploy reports must confirm the stable alias before telling Louis the work is deployed.
- Raw Vercel preview URLs can be mentioned as build artifacts, but they are not the default review link.

---

## June 12, 2026 - Nic-Nac Durable Preference Memory Fix

**Issue found:**
- Live UI memory audit proved current-show memory already works across conversations through `nic_nac_show_sessions` and `nic_nac_show_session_events`.
- General durable rep preference memory did not work from the UI: when asked to "remember this preference for future chats" and the prompt mentioned live shows, Nic-Nac routed only to current-show memory and refused to store a lasting preference.

**Fix completed:**
- Added explicit durable-memory routing for safe future preference/process requests such as "remember this for future chats", "from now on", "going forward", or "I prefer".
- Kept current-show-only language, such as "remember that for this show", routed to show memory only.
- Updated Nic-Nac's routed prompt so safe operational preferences are supported and saved with `memoryType:'preference'` and `memorySource:'explicit'` instead of being refused.
- Hardened `write_rep_note` so the server owns `conversation_date`; model-supplied stale dates can no longer bury a new memory outside recent-note retrieval.

**Current checkpoints:**
- `1d18458 fix: route explicit Nic-Nac memory preferences`
- `ce70136 fix: timestamp Nic-Nac memory writes server-side`
- Branch `codex/sparkle-cross-phase-hardening` is clean and synced with origin.

**Deployment and verification:**
- Production deployment: `dpl_3vFJ3ZTYmb6soijYM8ByEEzBZTLr` / `https://sparkle-suite-4t8jjh33k-louis-2849s-projects.vercel.app`.
- Stable demo alias updated to the final deployment: `https://sparkle-suite-demo.vercel.app`.
- Focused Nic-Nac memory/show tests passed: 7 files, 62 tests.
- `npm run build` passed locally and Vercel production build passed.
- Chrome stable-demo smoke passed: Nic-Nac saved the explicit future preference and replied with the requested marker instead of refusing.
- Supabase verification showed the run routed to both `memory` and `show_memory`, included `write_rep_note`, and saved an explicit preference note with a current server timestamp.
- Synthetic smoke note, tool execution, run, and conversation rows were cleaned up.

**Caveats noted:**
- A broad unrelated Nic-Nac/support test sweep still has stale failures in branding/shared-knowledge expectations.
- Vercel log scan during the final window showed two unrelated public Sparkle Finder 500s; the Nic-Nac memory path was clean.

---

## June 10, 2026 - Ring Size Migration Applied and Stable Demo Promoted

**Topics covered:**
- Continued the fulfillment/ring-size blocker after Louis opened Supabase in Chrome and signed in.
- Confirmed Supabase CLI remained unauthorized/unlinked for remote project work, so the migration was applied through the signed-in Supabase Dashboard SQL editor for project `bqhzfkgkjyuhlsozpylf` / `neon-rabbit-core` on `main` production.
- Hardened local migration `supabase/migrations/20260610131500_trade_listing_ring_size.sql` before manual apply: schema-qualified `public.trade_listings`, duplicate-safe constraint guard, and `NOTIFY pgrst, 'reload schema'`.
- Added `tests/trade-listing-ring-size-migration.test.ts` to lock the migration idempotence and PostgREST schema-cache reload behavior.

**Commits pushed:**
- `23f8a04 fix: harden trade listing ring size migration`

**Verification:**
- Supabase SQL verification returned `ring_size_column_present = true` and `ring_size_constraint_present = true`.
- `npm exec vitest run tests/trade-listing-ring-size-migration.test.ts tests/services/trade-board-add-listing.test.ts` passed: 10 tests.
- `npm run build` passed.
- Vercel preview deployed: `https://sparkle-suite-kkz9729yp-louis-2849s-projects.vercel.app`.
- Chrome reviewer-smoke on the preview passed:
  - `/start` reviewer controls showed `Open workspace preview`.
  - Workspace seeded `Jamie Smoke` / `RG-SMOKE-001`.
  - Board Inventory and Trade history loaded without the previous `ring_size` 500.
  - Fulfillment moved approved -> shipped -> completed.
  - Queue showed `0 active swaps`, Trade history showed `1 completed` and `$38.00`, and the received-piece prompt stayed visible.
  - Chrome console showed no warnings/errors during the checked path.
- Stable alias moved: `https://sparkle-suite-demo.vercel.app` now points to `https://sparkle-suite-kkz9729yp-louis-2849s-projects.vercel.app`.
- Chrome reviewer-smoke on the stable alias confirmed workspace preview loads with Board Inventory, Fulfillment queue, and Trade history without console warnings/errors.

**Remaining notes:**
- Supabase CLI auth/linking is still not fixed; the blocker was cleared manually through the dashboard, and the local migration is now safe for future CLI sync.
- Pre-launch live-mode Stripe smoke remains the major launch gate.

---

## June 10, 2026 - Ring Size Intake for Trade Board Listings

**Topics covered:**
- Louis learned from live jewelry handling that Bomb Party ring size numbers are usually on the box somewhere, not on the label.
- Updated Sparkle Suite implementation from `C:\Users\louis\sparkle-suite-repo` only; binder remains notes/memory only.
- Added a rep-side trade listing `ring_size` field so ring size is stored on the physical Trade Board listing, not the shared jewelry design.
- Updated Nic-Nac's add-listing workflow and tool schema so RG/ring entries capture `ringSize`; if the size is not visible from a box/details photo, Nic-Nac should ask for the ring size before `add_listing`.
- Surfaced `ringSize` through the board listing tool and API path so downstream board views/tool results can retain it.

**Verification:**
- `npm exec vitest run tests/services/trade-board-add-listing.test.ts tests/nic-nac/add-listing-batch.test.ts tests/nic-nac/system-prompt-add-listing.test.ts` passed.
- `npm exec vitest run tests/nic-nac-trade-board-route.test.ts tests/nic-nac-board-inventory-view.test.ts tests/nic-nac/trade-board-tools.test.ts` passed.
- `npm run build` passed after rerunning with a longer timeout.
- `npx tsc --noEmit --pretty false --incremental false` still reports existing repo-wide test type issues unrelated to this change.

**Open items carried forward:**
- Commit `6d48151 feat: capture ring size on trade listings` was pushed to GitHub branch `codex/sparkle-cross-phase-hardening`.
- Vercel preview deployed: `https://sparkle-suite-3bhbscrs5-louis-2849s-projects.vercel.app`.
- Supabase migration application is blocked in this session: `supabase db push` reported the checkout was not linked; `supabase link` returned `Unauthorized`; a read-only REST schema check showed `trade_listings.ring_size` is missing.
- Stable demo alias was intentionally not moved to the new preview because the deployed Trade Board code selects `ring_size` and would likely break without the migration.
- Chrome reviewer-smoke confirmed the existing stable demo setup preview still loads, and the new preview `/start` plus setup preview load. Full Trade Board smoke remains blocked until migration `20260610131500_trade_listing_ring_size.sql` is applied.

---

## June 10, 2026 - Referrals, Workspace Layout, and Chrome Reviewer Smoke

**Topics covered:**
- Continued Sparkle Suite work from the binder rules: implementation happened in `C:\Users\louis\sparkle-suite-repo`; this binder remains notes/memory only.
- Fixed the public Sparkle Suite header so the logo stays anchored left and logout/header actions stay anchored right across browser zoom levels.
- Researched and implemented the Sparkle Suite referral program: reps get a referral code/link, referred paid subscription months are tracked, and the referring account earns one credited month after a referred rep has three paid subscription months.
- Louis confirmed there should be no hard referral cap at launch. Abuse review can stay manual unless real usage shows a need for limits.
- Applied and verified the Supabase migration for `rep_referral_paid_months` with RLS, indexes, and policies.
- Read-only checked Stripe test webhook coverage for `checkout.session.completed` and `invoice.payment_succeeded`; no live Stripe dashboard changes were made.
- Added the pre-launch Stripe live smoke and webhook gate as a high-priority launch item.
- Audited the Account/Billing screenshot at 100% zoom: the workspace left column had a hard internal width cap that created empty space beside Nic-Nac, and account cards used typography that felt too large compared with the rest of the workspace.
- Fixed the Account/Billing layout so the workspace fills the available left column beside the fixed Nic-Nac panel, clips accidental horizontal overflow, and uses more compact operational dashboard typography.
- Louis noted that Chrome reviewer-smoke should have been used for the deployed UI review; after the Chrome connector was activated, the stable demo was verified in Chrome with reviewer-smoke.

**Implementation checkpoints:**
- `82e93a5 fix: anchor Sparkle Suite public header actions`
- `4ab9fbd feat: add Sparkle Suite referral automation`
- `cda1325 fix: tighten workspace account layout scale`

**Deployment and verification:**
- Stable demo alias: `https://sparkle-suite-demo.vercel.app`
- Current stable target after the layout fix: `https://sparkle-suite-2wz1eso65-louis-2849s-projects.vercel.app`
- Sparkle Suite repo branch: `codex/sparkle-cross-phase-hardening`, currently ahead of origin by 3 local commits.
- Local tests passed for referral and layout work, including `tests/nic-nac-font-scale.test.ts` and `tests/reviewer-smoke-ui.test.ts`.
- `npm run build` passed locally and Vercel preview build passed.
- Chrome reviewer-smoke loaded the stable demo `/start`, opened setup preview, signed out, and reviewed `/nic-nac?conversationId=chrome-layout-qa-account&section=account`.
- Chrome smoke confirmed Account, Referral program, SMS Wallet, and Nic-Nac rendered with no framework overlay, no console errors/warnings, no horizontal overflow, a `1166px` account content width, `380px` Nic-Nac panel, `20px` card titles, `21px` referral code text, and `18px` metric values.
- Chrome screenshot saved to `C:\Users\louis\AppData\Local\Temp\sparkle-suite-account-layout-chrome-crop.png`.

**Open items carried forward:**
- Before launch, live-mode Stripe must be smoke-tested end to end with the production webhook, Vercel secret, required events, checkout flow, and referral credit behavior.
- Push the three local Sparkle Suite commits to GitHub when Louis is ready for the branch backup/deploy-source checkpoint.

---

## June 2, 2026 - Required Nic-Nac Setup Planning

**Topics covered:**
- Sparkle Suite review started from the active local repo workbench `C:\Users\louis\sparkle-suite-repo` on branch `codex/sparkle-cross-phase-hardening`; binder remains memory/instructions only.
- Louis clarified the work target is the logged-in rep workspace after signup, not the public landing page.
- The current `/nic-nac` self-serve setup checklist was judged confusing and visually disconnected from the Sparkle Suite landing page brand polish.
- Product direction changed to a required Nic-Nac setup flow: tiny account creation, Stripe checkout, required Nic-Nac chat setup, then full dashboard unlock.
- Required setup should happen in one chat conversation with Nic-Nac, one question at a time, so reps learn the same interaction model they will use after launch.
- Full dashboard should stay locked until Nic-Nac gets the customer site to a good-looking Sparkle Suite standard.
- Google sign-in should be supported to reduce friction and increase trust; email/password remains a backup path.
- Setup state must persist structurally so reps who close Sparkle Suite resume the same Nic-Nac setup step after signing back in.
- Louis should be notified immediately for setup errors Nic-Nac cannot fix, paid reps blocked before setup completion, and successful payment/light-box ordering tasks.
- Louis is leaning toward Telegram for low-friction alerts.
- Sparkle Suite must collect a shipping address at checkout and create a 24-hour task for Louis to order a light box through Amazon Prime after first payment.
- Trade Board first-run setup is education only; do not require reps to populate trade items before unlocking the dashboard.
- Team management is deferred as an in-workspace add-on and is not part of initial checkout.

**Documents created:**
- Required setup design/spec:
  `C:\Users\louis\sparkle-suite-repo\docs\superpowers\specs\2026-06-02-sparkle-suite-required-nic-nac-setup-design.md`
- Detailed implementation plan:
  `C:\Users\louis\sparkle-suite-repo\docs\superpowers\plans\2026-06-02-required-nic-nac-setup.md`

**Implementation status:**
- No required setup implementation code has been written yet.
- Existing uncommitted state includes the new spec, the new plan, and an earlier `DashboardPlaceholder.module.css` polish change that the new plan supersedes.

**Next expected flow:**
Use `/goal` or a fresh Codex session to execute the implementation plan, preferably with subagent-driven development. Start with preflight guardrails, then batch through durable setup state, tiny signup/Google auth, Stripe shipping/light-box tasks, Nic-Nac setup tools, branded setup UI, and verification.

---

## June 2, 2026

**Topics covered:**
- Recovered the active Sparkle Suite local workbench at `C:\Users\louis\sparkle-suite-repo` from GitHub and confirmed the binder at `C:\Users\louis\sparkle-suite` remains notes/memory only.
- Shifted near-term Sparkle Suite work back to local-first because Codespaces/GitHub OAuth tooling blocked progress for multiple days. GitHub remains the saved source of truth; Codespaces are paused unless Louis explicitly reselects them.
- Continued post-launch landing/signup review on branch `codex/sparkle-cross-phase-hardening` with local preview at `http://localhost:3000/`.
- Removed the landing header nav links for `Customer site`, `Workspace`, and `Pricing`.
- Updated `/start` so the form card uses the Sparkle Suite espresso panel treatment and added a compact `Ask Nic-Nac` button under the form.
- Fixed the first compact Nic-Nac integration bug where the signup page inherited a full-page landing background/min-height.
- Turned both public Ask Nic-Nac buttons pink to match Sparkle Suite primary buttons.
- Expanded public Nic-Nac so it can answer signup-page questions about the form, requested fields, no-card-first step, no charge/customer messaging/provider changes on submit, and next steps after account creation.

**Verification:**
- `npm exec vitest run tests/sparkle-suite-public-nic-nac-contract.test.ts tests/sparkle-suite-public-landing.test.ts tests/start-page.test.ts` passed with 89 tests.
- `npm run build` passed.
- GitHub push completed for `louis623/sparkle-suite`, branch `codex/sparkle-cross-phase-hardening`, commit `8ca775d feat: polish public signup Nic-Nac flow`.

**Next expected flow:**
Start a fresh Sparkle Suite workspace session from `C:\Users\louis\sparkle-suite-repo`, confirm branch `codex/sparkle-cross-phase-hardening`, open `http://localhost:3000/`, navigate to `/start` if needed, and stand by for Louis's visual review instructions.

---

## June 10, 2026 - fulfillment queue audit

**Topics covered:**
- Audited the Trade Board fulfillment queue process after Louis asked to verify the backend/code wiring and smoke-test it.
- Confirmed the active implementation repo `C:\Users\louis\sparkle-suite-repo` is clean on `codex/sparkle-cross-phase-hardening` and tracking origin.
- Verified the backend path: approving a trade validates rep ownership, calls `rpc_approve_trade`, creates one `trade_fulfillment` row, and the fulfillment queue/status routes use the authenticated paid Nic-Nac context.
- Verified schema/RLS intent in `supabase/migrations/006_sparkle_suite_schema.sql`: `trade_fulfillment` is keyed by request, indexed by request/status, and scoped through request -> listing -> rep.
- Verified Nic-Nac tools and prompt wiring for `get_fulfillment_queue` and `update_fulfillment_status`.
- Verified the dashboard Trade Board panel fetches `/api/nic-nac/fulfillment-queue`, shows the active swap count, and renders the empty state.

**Verification:**
- `npm exec vitest run tests/nic-nac/trade-fulfillment.test.ts tests/nic-nac-fulfillment-queue-route.test.ts tests/nic-nac/trade-requests.test.ts tests/nic-nac-trade-requests-route.test.ts tests/live-show-smoke.test.ts` passed: 37 tests.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts` passed: 59 tests.
- `npm run build` passed.
- Chrome reviewer-smoke used the stable demo `https://sparkle-suite-demo.vercel.app` with the synthetic reviewer workspace tab. The Trade Board fulfillment queue was visible with `0 active swaps` and "No open fulfillment work right now."; no console warnings/errors were present.

**Notes and follow-up:**
- No code changes were made during the audit.
- Direct Chrome navigation to `/api/nic-nac/fulfillment-queue` was blocked by the Chrome extension with `ERR_BLOCKED_BY_CLIENT`; route behavior is covered by local route tests.
- A full mutation smoke was not possible from current stable demo data because the synthetic reviewer workspace had no pending requests or active fulfillment rows.
- Improvement candidate: same-status fulfillment updates currently reset `status_updated_at`; consider making same-status updates a no-op or explicit validation error so aging/nudges cannot be reset accidentally.

---

## June 10, 2026 - fulfillment reviewer-smoke implementation

## June 11, 2026

**Topics covered:**
- Implemented the first-20 founder pricing correction in `C:\Users\louis\sparkle-suite-repo` on `codex/sparkle-cross-phase-hardening`.
- Hardened checkout pricing so reps 1-20 receive founder monthly pricing and rep 21 starts standard monthly pricing.
- Added Supabase founder pricing guards:
  - unique founder sequence indexes for reps/subscriptions
  - atomic checkout pricing assignment RPC
  - unpaid/failed checkout reservation release RPC
  - lowest-available founder slot reuse after abandoned checkout release
- Added `checkout.session.expired` webhook handling so unpaid founder checkout reservations can be released.
- Updated live/test Stripe webhook setup scripts to include `checkout.session.expired`.
- Kept standard pricing from being permanently written to `reps` before payment succeeds.

**Commit pushed:**
- `4aea52b fix: harden founder pricing checkout`

**Preview:**
- Vercel preview deployed: `https://sparkle-suite-m0hk7hofl-louis-2849s-projects.vercel.app`

**Verification:**
- `npm exec vitest run tests/stripe-sparkle-suite-pricing.test.ts tests/stripe-create-checkout-route.test.ts tests/stripe-webhook-route.test.ts tests/stripe-sync-route.test.ts tests/stripe-create-portal-session-route.test.ts tests/nic-nac-account-billing-route.test.ts tests/services/account-billing.test.ts tests/sparkle-suite-referrals.test.ts tests/sparkle-suite-pricing-referrals-migration.test.ts tests/sparkle-suite-referral-paid-months-migration.test.ts tests/prepare-stripe-demo-price.test.ts tests/prepare-stripe-live-prices.test.ts tests/ensure-stripe-test-webhook-endpoint.test.ts tests/ensure-stripe-live-webhook-endpoint.test.ts tests/smoke-demo-readiness.test.ts` passed: 142 tests.
- `npm run build` passed locally.
- Vercel preview build passed.
- Chrome reviewer-smoke on the preview used the synthetic reviewer workspace, not Louis's personal account. `/start` showed reviewer controls, workspace opened with seeded `Jamie Smoke` / `RG-SMOKE-001 - Reviewer Smoke Ring`, Account/Billing loaded, referral status was visible, and console had no warnings/errors.

**Still open before real paid launch:**
- Apply Supabase migration `20260611133605_ss_founder_pricing_uniqueness.sql` remotely.
- Confirm production domain for live Stripe webhook target.
- Create/verify live Stripe prices for build fee, founder monthly, and standard monthly.
- Create/update live Stripe webhook with `checkout.session.completed`, `checkout.session.expired`, subscription update/delete, and invoice payment events.
- Set matching Vercel production env vars and run live preflight/controlled live checkout smoke with Louis's action-time approval.

---

**Topics covered:**
- Implemented the fulfillment queue audit improvements in `C:\Users\louis\sparkle-suite-repo` on `codex/sparkle-cross-phase-hardening`.
- Added a first-class `/start` reviewer button: `Open workspace preview`.
- Added deterministic dashboard-unlocked reviewer seed data: `Jamie Smoke` requesting `RG-SMOKE-001 - Reviewer Smoke Ring`, with one active fulfillment row reset to `approved` on each reviewer workspace reset.
- Changed same-status fulfillment updates into no-ops that do not rewrite `status_updated_at`, preserving aging/nudge logic.
- Dashboard completion now sends `addToBoard` for completed fulfillment and shows the received-piece next-step prompt.
- Fulfillment status updates now preserve success feedback even if another workspace panel fails to refresh.

**Commits pushed:**
- `8988e7c feat: seed reviewer fulfillment smoke path`
- `e42c251 fix: preserve fulfillment completion feedback`

**Verification:**
- `npm exec vitest run tests/nic-nac/trade-fulfillment.test.ts tests/nic-nac-fulfillment-queue-route.test.ts tests/nic-nac/trade-requests.test.ts tests/nic-nac-trade-requests-route.test.ts tests/live-show-smoke.test.ts tests/nic-nac-dashboard-placeholder.test.ts tests/reviewer-smoke-ui.test.ts tests/reviewer-smoke-session.test.ts tests/services/trade-fulfillment-service.test.ts` passed: 117 tests.
- `npm run build` passed.
- Vercel preview deployed: `https://sparkle-suite-duhkm8fzq-louis-2849s-projects.vercel.app`.
- Chrome reviewer-smoke on the preview passed the fulfillment mutation path:
  - `/start` showed `Open workspace preview`.
  - Workspace opened with seeded `Jamie Smoke` / `RG-SMOKE-001` fulfillment item.
  - `Mark shipped` moved status to `shipped`.
  - `Mark completed` moved queue to `0 active swaps`, trade history to `1 completed`, and showed `Fulfillment marked completed. Add the received piece to your board when you are ready.`

**Known blocker:**
- Stable alias was not moved. Supabase CLI `supabase db push --dry-run` still fails with `Cannot find project ref. Have you run supabase link?`; the pending ring-size migration remains unapplied, so preview workspace refresh shows the expected Trade Board refresh warning/console 500 until `trade_listings.ring_size` exists in the remote DB.

---

## June 1, 2026

**Topics covered:**
- Moved Sparkle work toward a cloud-first workflow: GitHub is the main saved source, GitHub Codespaces is the workbench, and the older Windows laptop is primarily the control/review surface.
- Confirmed and smoke-tested Sparkle Suite and Sparkle Finder Codespaces. Both are reachable through Chrome VS Code tabs, can run terminals in `/workspaces/...`, and report 4 CPU cores.
- Hit GitHub's current running Codespaces limit: only two Codespaces can run at once. Standing workflow is Sparkle Suite usually stays running, while Sparkle Finder and Sparkle Rep Onboarding rotate in the second slot.
- Added local guardrails so old local project folders act as Codex chat binders instead of workbenches.
- Converted `C:\Users\louis\sparkle-suite-customer` into a lightweight Sparkle Finder binder. The full old repo was moved intact to `C:\Users\louis\Sparkle-Suite-Local-Archive\2026-06-01\sparkle-suite-customer`.
- Converted `C:\Users\louis\britt-with-bling-start-strong` into a lightweight Sparkle Rep Onboarding binder. The full old repo was preserved intact at `C:\Users\louis\Sparkle-Suite-Local-Archive\2026-06-01\britt-with-bling-start-strong`.
- Created a full Sparkle Suite archive copy at `C:\Users\louis\Sparkle-Suite-Local-Archive\2026-06-01\neon-rabbit-core`.
- Prepared a staged Sparkle Suite binder at `C:\Users\louis\Sparkle-Suite-Binder-Staging\neon-rabbit-core`, but did not swap it into `C:\Users\louis\neon-rabbit-core` because this active Codex session is running from that folder.
- Preserved Sparkle Suite Live Queue Chrome extension safety context. Reps use the Chrome Web Store extension, but local `chrome-extension/`, `dist/`, and `.agents/skills/sparkle-live-queue/SKILL.md` remain protected source/package history.

**Key decisions:**
- Local Codex project folders should be lightweight binders for organization, instructions, and selected markdown memory.
- Actual implementation, builds, tests, commits, and pushes should happen in the matching GitHub Codespace unless Louis explicitly asks for local laptop work.
- Do not delete local archives until Louis has an external backup drive and confirms the archive has been copied there.
- Sparkle Suite local folder swap must happen from a neutral/new Codex chat, not from this active `neon-rabbit-core` session.

**Next expected flow:**
Start a neutral Codex chat and complete the Sparkle Suite binder swap using staged binder `C:\Users\louis\Sparkle-Suite-Binder-Staging\neon-rabbit-core`, original folder `C:\Users\louis\neon-rabbit-core`, and archive `C:\Users\louis\Sparkle-Suite-Local-Archive\2026-06-01\neon-rabbit-core`.

---

## May 31, 2026

**Topics covered:**
- Louis clarified that the desired workflow is large batch work through `/goal`, not small chunk-by-chunk management.
- The older Windows laptop was identified as both a speed bottleneck and a local-work risk when multiple serious repos run builds/dev servers at the same time.
- Locked the plain-English safety model: commit saves locally; push backs up to GitHub; Vercel runs deployed sites; Supabase holds app data; the laptop is only the workshop/control surface.
- Agreed that Codespaces or equivalent cloud workspaces are the right next step for parallel heavy repo work once active stopped sessions are safely closed.
- Decided the next rollout should cover three heavy Sparkle repos first: Sparkle Suite, Sparkle Finder, and Sparkle Rep Onboarding. Sparkle Marketing can stay local/lightweight unless it becomes build-heavy.
- Captured repo naming direction: `neon-rabbit-core` to `sparkle-suite`, `sparkle-suite-customer` to `sparkle-finder`, `sparkle-suite-marketing` to `sparkle-marketing`, and `britt-with-bling-start-strong` to `sparkle-rep-onboarding`.
- Clarified Sparkle Finder as the customer/collector hub for the Sparkle Suite ecosystem, not merely a generic discovery tool.

**Next expected flow:**
Louis will finish the three stopped repo sessions one at a time and make sure completed work is pushed to GitHub. After that, run a repo inventory, clean up naming/linking, and stand up GitHub Codespaces for the three heavy Sparkle repos.

---

## March 29, 2026

**Topics covered:**
- Memory architecture finalized
- Open Brain confirmed as Phase 2 priority alongside vault
- GitHub vault created this session
- Redundancy plan established across all tiers
- AI tool philosophy locked — Claude and Gemini equal compatibility, no lock-in
- NotebookLM added to stack as research tool
- Cost analysis completed — full Phase 2 stack runs $164–204/mo, already covered by current clients
- Multitask by default established as standing operating principle
- Master doc update to v1.8 pending
## June 11, 2026 - Live Stripe Preflight Blocker

**Topics covered:**
- Verified the founder pricing implementation in `C:\Users\louis\sparkle-suite-repo` still matches Louis's correction: first 20 paid reps receive founder monthly pricing, and rep 21 starts standard monthly pricing.
- Pulled Vercel Production env to ignored local file `C:\Users\louis\sparkle-suite-repo\.local\vercel-production.env` after Louis approved the pull.
- Ran the Stripe live preflight path; it blocked safely before any live checkout/payment action.
- Reviewed the repo's live Stripe helper scripts. Live price setup and live webhook setup both have explicit approval gates and are designed for idempotent provider setup once live credentials are present.

**Verification:**
- `npm exec vitest run tests/stripe-sparkle-suite-pricing.test.ts tests/stripe-create-checkout-route.test.ts tests/stripe-webhook-route.test.ts tests/sparkle-suite-pricing-referrals-migration.test.ts tests/sparkle-suite-referrals.test.ts tests/smoke-demo-readiness.test.ts` passed: 103 tests.

**Current blocker:**
- Vercel Production env is not live-billing ready: `STRIPE_SECRET_KEY` is still test-mode; `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_BUILD_FEE`, `STRIPE_PRICE_FOUNDER_MONTHLY`, `STRIPE_PRICE_STANDARD_MONTHLY`, and `NEXT_PUBLIC_APP_URL` are empty; live approval marker envs are missing.
- `STRIPE_LIVE_SMOKE_CONFIRMED` is correctly unset until Louis explicitly approves a final controlled live checkout smoke.

---

## June 11, 2026 - Production Self-Serve Signup and Live Checkout Smoke

**Topics covered:**
- Completed the live Stripe setup path for Sparkle Suite production self-serve signup.
- Created/verified live Stripe prices:
  - Build fee: `price_1ThAmIQYwdFOcEdvyAlTox0V` at `$49.99` one-time.
  - Founder monthly: `price_1ThAmIQYwdFOcEdvWmNm96yG` at `$49.99/mo`.
  - Standard monthly: `price_1ThAmJQYwdFOcEdv3HQwDV0V` at `$74.99/mo`.
- Created the live Stripe webhook endpoint for `https://www.yoursparklesuite.com/api/stripe/webhook`.
- Set Vercel Production billing env and enabled `SPARKLE_SELF_SERVE_ENABLED=true`.
- Manually applied and verified Supabase migration `20260611133605_ss_founder_pricing_uniqueness.sql`.
- During live smoke, found production checkout was failing because the route detached Supabase `rpc` from the client object.
- Fixed and pushed `a60ceff fix: preserve Supabase RPC binding in checkout`.
- Deployed production `dpl_58RLxmtyi14FzMx7CM29g3fvn53X` / `https://sparkle-suite-jib4a2a9h-louis-2849s-projects.vercel.app`.
- Live `/start` smoke created synthetic rep `louis+sparkle-live-smoke-1781197885226@neonrabbit.net` and opened live Stripe Checkout without submitting payment.
- Checkout showed expected founder pricing: `$99.98` today, then `$49.99/month`, with line items `Sparkle Suite build fee` and `Sparkle Suite Founding Rep Monthly`.
- Expired the live Checkout Session instead of paying.
- The first expiration webhook attempts failed because production Supabase was missing `20260602150000_ss_stripe_event_processing_status.sql`.
- Manually applied and verified that migration through Supabase SQL editor, sent `NOTIFY pgrst, 'reload schema'`, and replayed the failed live Stripe event.
- Webhook replay returned `200 {"received":true}`; Vercel logs showed `checkout_expired` with `reservation_released:true`.
- Database verification showed the smoke rep has `pricing_tier = null`, `founder_sequence = null`, and Stripe event `evt_1ThC9eQYwdFOcEdvGyukOOiK` is `processed` with no error.

**Verification:**
- `npm exec vitest run tests/stripe-create-checkout-route.test.ts tests/stripe-webhook-route.test.ts tests/stripe-sparkle-suite-pricing.test.ts` passed: 38 tests.
- `npm run build` passed.
- Production live checkout open-only smoke passed through Stripe Checkout page.
- Live expired-checkout webhook cleanup path passed after applying missing Stripe event-processing RPC migration.

**Remaining caveat:**
- No real live card/payment was submitted. The live Checkout page is open-ready for payments, and the expiration webhook path is verified live. The paid completion/invoice/referral paths remain code/test verified but should be watched closely on the first real paid signup.

---

## June 12, 2026 - Live Trade Swap Workflow and Pressure Test

**Topics covered:**
- Completed a full audit of the Trade Board/trade process, then rebuilt the plan around Louis's clarified live-show flow:
  - Customer buys jewelry to be revealed live.
  - Rep reveals it on the show.
  - Customer dislikes the surprise item and swaps for an existing Trade Board piece.
  - Customer never has the just-revealed item, has no photos, and does not ship anything.
  - Both pieces are physically in the rep's possession.
  - Rep removes/ships the selected Trade Board piece and adds the just-revealed item back to the board.
- Confirmed the correct rep-facing prompt wording: `Which item number was just revealed for the customer?`
- Dropped the idea of matching against Live Queue/current show context for this workflow. Live Queue only scrapes the ordered Bomb Party customer queue and reveal checked-off state; it does not know revealed item numbers or cue IDs.
- Tabled stronger rep notification/alert escalation until Louis can smoke test real timing and research whether immediate live-show trades need more alerting.
- Implemented and pushed the live trade swap workflow:
  - `8cc4916 docs: plan live trade swap workflow`.
  - `a7e283a feat: capture live trade swap replacements`.
  - `f0e573a chore: add trade swap smoke script`.
- Added Supabase migration `20260611190000_trade_swap_revealed_item_capture.sql` for `public.trade_swaps`, including RLS, owner/admin policies, indexes, replacement status tracking, and PostgREST schema reload.
- Applied and verified the migration manually through Supabase Dashboard project `bqhzfkgkjyuhlsozpylf` because CLI linking/auth remains unresolved.
- Added the trade swap service, Nic-Nac tools, prompt/HITL copy, dashboard approval modal, cleanup queue, public/customer wording updates, and Amethyst trade board ring-size mapping.
- Deployed production:
  - Deployment: `dpl_6W9CwLuwJEsJcytPV2eWnuJrfEXE`.
  - Deployment URL: `https://sparkle-suite-auzh791m0-louis-2849s-projects.vercel.app`.
  - Public app verified at `https://www.yoursparklesuite.com`.
- Verified the protected production cleanup route returns the expected unauthenticated response at `https://www.yoursparklesuite.com/api/nic-nac/trade-swap-cleanup`.

**Verification:**
- Focused trade-swap suite passed: 16 test files, 233 tests.
- Public-language/customer board tests passed: 2 files, 87 tests.
- Standard Nic-Nac suite passed: 14 files, 157 tests.
- Tight smoke suite passed: 7 test files, 101 tests.
- `npm run build` passed locally after implementation and after the smoke script commit.
- Vercel production build passed.
- DB-backed smoke script passed:
  - Known non-ring item auto-added back to the board.
  - Known ring without size went to cleanup.
  - Unknown item number went to cleanup.
  - Cleanup queue returned the unresolved swaps.
  - Smoke data cleanup left zero residual rows.
- Production browser UI smoke passed with a synthetic account:
  - Trade Board loaded.
  - Pending request appeared.
  - Approval modal opened with the exact item-number prompt.
  - Unknown item number approval succeeded.
  - Request left the pending list.
  - Swap cleanup showed the after-show action.
  - Fulfillment/history updated.
  - Synthetic data cleanup left zero residual rows.
- Pressure test passed:
  - Parallel approval race allowed exactly one success and cleanly rejected the rest.
  - Repeat approval rejected.
  - Duplicate pending customer request blocked.
  - Lowercase/padded item number normalized.
  - Known ring without size went to cleanup.
  - Known ring with size auto-added with the captured size.
  - Unknown item number captured for cleanup.
  - Cross-rep approval blocked.
  - Blank item number rejected before approval and left request pending.
  - Production UI blank submit was disabled.
  - Rapid double-click submit did not duplicate swaps or fulfillment.
  - Public customer request API returned expected duplicate and validation errors.
  - Backend/UI pressure cleanup left zero residual rows.

**Current state:**
- Active repo is clean and synced with `origin/codex/sparkle-cross-phase-hardening`.
- Current pushed checkpoint is `f0e573a chore: add trade swap smoke script`.
- Production is trade-swap workflow ready for the tested paths.
- Stable demo alias was not changed this session; production was updated.

**Remaining caveats:**
- Real live-show extension timing and multi-device human behavior were not tested directly. Backend concurrency and production UI pressure covered the core duplicate approval risk.
- Stronger rep notification/alert escalation remains tabled pending Louis's real-flow smoke testing and timing research.
- Supabase CLI auth/linking still needs restoration so future migrations do not require Dashboard SQL editor.
- First real paid beta signup still needs monitoring because no real live payment was submitted during billing smoke.
- Fulfillment received-piece link-back remains open.

---

## June 12, 2026 - Support Report Intake and Google Chat Plan

**Topics covered:**
- Planned and implemented support-report intake for Help & Resources and Nic-Nac so beta reps can report site issues, bugs, suggested upgrades, and workflow ideas.
- Kept Help & Resources as the independent fallback path when Nic-Nac itself is confusing, broken, or unavailable.
- Chose Google Chat incoming webhooks as the first alert channel instead of Telegram. The webhook URL is treated as a secret and must be stored in Vercel env as `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL`.
- Added future-dashboard-ready records through `public.support_reports` and an operator API for status filtering/updates.

**Implementation checkpoints:**
- `69d04af feat: add support report intake`.
- `502a0c0 chore: add support report smoke script`.
- Branch `codex/sparkle-cross-phase-hardening` is pushed and synced.
- Latest preview after the smoke-script checkpoint is Ready:
  - `dpl_HwrSVNcY9N5ZfbNQTwY2gEXjvP5u`
  - `https://sparkle-suite-mo2hast69-louis-2849s-projects.vercel.app`

**Verification so far:**
- Focused support-report suite passed: 8 files, 35 tests.
- `npm run build` passed locally after the smoke-script addition.
- Vercel preview build passed.
- `npm run smoke:support-report` correctly blocked before data writes because local `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL` is not configured.

**Remaining before completion:**
- Louis needs to create a Google Chat incoming webhook and store it in Vercel as `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL` for Production and preferably Preview.
- Supabase migration `20260612100000_support_reports.sql` still needs to be applied to project `bqhzfkgkjyuhlsozpylf`; CLI remains unlinked, so Dashboard SQL editor is still the expected path unless CLI auth/linking is repaired first.
- After those two external setup steps, run `npm run smoke:support-report`, verify Google Chat receives the synthetic report alert, deploy/promote to production, and run final smoke against production.

---

## June 12, 2026 - Support Report Intake Completed

**Production completion:**
- Created Google Chat space `Sparkle Suite Support Reports` and configured the `Sparkle Suite Reports` incoming webhook.
- Rotated the first webhook after it appeared in an automation DOM read; the fresh webhook was stored in Vercel and the clipboard was cleared after use.
- Added Vercel env `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL`:
  - Production.
  - Preview scoped to `codex/sparkle-cross-phase-hardening`.
- Applied and verified Supabase migration `20260612100000_support_reports.sql` in project `bqhzfkgkjyuhlsozpylf`.
- Production deployment:
  - `dpl_Gj9u8FvFs83j4tBDww4qCmKsSnHm`.
  - `https://sparkle-suite-6es8y9mh5-louis-2849s-projects.vercel.app`.
  - Aliases include `https://www.yoursparklesuite.com`, `https://yoursparklesuite.com`, `https://sparkle-suite.vercel.app`, and project aliases.

**Verification:**
- Supabase verification returned `table=true | rls=true | columns=20 | policies=support_reports_admin_full_access,support_reports_own_select | no_rep_insert=true | indexes=idx_support_reports_rep_created,idx_support_reports_status_urgency_rank_created,support_reports_pkey`.
- Vercel env list shows `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL` as encrypted for Production and Preview branch `codex/sparkle-cross-phase-hardening`.
- `npm run smoke:support-report` passed with `notification=delivered`, `google_chat_configured=true`, and `cleanup=true`.
- Synthetic smoke report `51d793a5-0a20-4f97-99ef-2929bd6d9144` was verified removed: `support_smoke_residual_count=0`.
- Vercel production build passed.
- Production API route checks:
  - `POST https://www.yoursparklesuite.com/api/nic-nac/support-reports` returns `401` unauthenticated.
  - `GET https://www.yoursparklesuite.com/api/control-center/support-reports` returns `401` unauthenticated.

**Current state:**
- Active repo `C:\Users\louis\sparkle-suite-repo` is clean and synced with `origin/codex/sparkle-cross-phase-hardening`.
- Current pushed checkpoint: `502a0c0 chore: add support report smoke script`.
- Support report intake is production-ready for Help & Resources form, Nic-Nac tool submissions, dashboard-ready storage, and Google Chat delivery.

---

## June 12, 2026 - Support Report Form Entry UX Fix

**Issue:**
- Louis refreshed the demo account and saw the Support Path section with button-like quick-action chips, but no obvious clickable way to pull up the report form.
- Root cause: the quick-action chips in Support Path were static text, while the actual form was lower in the section.

**Fix:**
- Replaced the misleading static quick-action row with a clear `Send a report to support` callout.
- Added a real `Start report` button that scrolls/focuses the support report form title field.
- Kept the full report form in Help & Resources and preserved the Nic-Nac-independent fallback path.

**Verification and deployment:**
- Focused Help & Resources regression passed: 1 file, 4 tests.
- Focused support/dashboard suite passed: 6 files, 85 tests.
- `npm run build` passed locally.
- Deployed production:
  - `dpl_AGEtbyJXSckPU6AJHZC8JycVGesf`.
  - `https://sparkle-suite-kvlid78g9-louis-2849s-projects.vercel.app`.
  - Public app aliases include `https://www.yoursparklesuite.com`.
- Current pushed checkpoint: `0d871e7 fix: clarify support report form entry`.

---

## June 12, 2026 - Support Report End-to-End Demo Check

**What changed during verification:**
- Found the stable demo alias `https://sparkle-suite-demo.vercel.app` was still pointing at the June 10 preview `dpl_BBUswPb5yksSADfMEr41ZRtq8wig`, which predated support-report intake and the UX fix.
- Repointed the stable demo alias to today's preview `dpl_4oTDBVaXzu9CdoGZZC7J6WvNncFW` / `https://sparkle-suite-dpvm5rn6z-louis-2849s-projects.vercel.app`.
- Confirmed production still points at `dpl_AGEtbyJXSckPU6AJHZC8JycVGesf` / `https://sparkle-suite-kvlid78g9-louis-2849s-projects.vercel.app`.

**End-to-end verification:**
- Stable demo reviewer workspace opened through Chrome reviewer-smoke; no personal Louis account was used.
- Help & Resources loads with collapsed workflow sections and clear `Open section` indicators.
- Support Path expands and shows the new `Send a report to support` callout plus real `Start report` button.
- `Start report` scrolls/focuses the `Short title` input.
- Synthetic Help form submission succeeded in the live demo UI with `Report saved. Support has the details.`
- Supabase verified the synthetic Help form row with `source=help_form`, `report_type=bug`, `status=open`, `notification_status=delivered`, `notification_error=null`, and `contact_ok=false`; the row was cleaned up.
- Operator support-report service verified the row appeared in the open queue, could be moved to `reviewing`, and was cleaned up.
- Production unauthenticated route protection still returns `401` for both `/api/nic-nac/support-reports` and `/api/control-center/support-reports`.
- Nic-Nac live tool path was tested through the deployed reviewer workspace. It created a `source=nic_nac` support report, delivered Google Chat, persisted the assistant completion, and the synthetic row was cleaned up.

**Caveat found:**
- During the live Nic-Nac browser submission, the server completed and persisted the assistant reply (`Report saved... Louis notified.`), but the active chat panel did not render that final assistant message until the page was reloaded. After reload, the response was visible and the input was enabled. Track this as a Nic-Nac streaming/hydration polish item; the report delivery path itself worked.

---

## June 12, 2026 - Nic-Nac Tool Report Stream Recovery Polish

**Fix:**
- Added client-side recovery for Nic-Nac conversations that remain in `submitted` or `streaming` after a server-side tool run has already completed.
- The chat panel now polls conversation state after a short timeout, detects a completed assistant message after the latest local user message, merges the saved server message into the active chat, stops the stale stream, hides the thinking indicator, and refocuses the input.
- Added regression coverage for completed-assistant-after-latest-user detection and component wiring.

**Deployment:**
- Current pushed checkpoint: `4ef57bb fix: recover completed Nic-Nac streams`.
- Production deployment: `dpl_2ZYXiBykKP4a3wLWMuoe2SXD4CkT` / `https://sparkle-suite-cwrfjue9o-louis-2849s-projects.vercel.app`.
- Stable demo alias now points at preview deployment `dpl_Lh1fTTsAfXQF4ShXEdrbEaKLaPEo` / `https://sparkle-suite-o3hqf93no-louis-2849s-projects.vercel.app`.

**Verification:**
- Focused Nic-Nac/support report suite passed: 7 files, 66 tests.
- `npm run build` passed locally.
- Production and preview Vercel builds passed, and stable demo alias was inspected after update.
- Live stable-demo Nic-Nac smoke created synthetic report `1ee07cdb-42f1-4fed-80cb-c605ef30aaed` with `source=nic_nac`, `notification_status=delivered`, and `notification_error=null`.
- Matching conversation `90124e70-bac8-4aa3-8bb6-f211bf1c7ab6` persisted a completed assistant response containing `Report filed... notification delivered to Louis... this response is now live in chat.`
- The synthetic support report row was cleaned up and verified removed.

**Remaining note:**
- Chrome automation could claim the active demo tab and confirm the correct URL, but DOM/screenshot capture timed out on that long-lived conversation tab after the smoke. Server-side completion and cleanup were verified directly; future visual checks can reload the demo conversation if Chrome capture stalls.

---

## June 12, 2026 - Support Command Center and Support Auditor

**What changed:**
- Built the v1 Support Command Center and made `/control-center` the internal support landing page instead of redirecting to old intake.
- Added canonical `client_account_profiles`, `support_audits`, and `support_lessons` tables.
- Extended `support_reports` with client snapshots, audit status/timestamps/errors, and resolution snapshots.
- Added `Support Auditor`, which runs directly after each support report, gathers report/profile/history/lesson facts, stores an audit row, and sends one enriched Google Chat alert after audit completion or fallback.
- Enriched Google Chat alerts now include client name, show name, phone, email, issue summary, Support Auditor status, findings, and recommended first action.
- Added reusable support lessons on resolution closeout for the future dashboard workflow.
- Hardened the support smoke to verify profile creation, report snapshot, audit completion, Google Chat delivery, reusable lesson creation, and cleanup.

**Operational fixes during verification:**
- Supabase migration `20260612172908_support_command_center_auditor.sql` was applied manually through Supabase Dashboard SQL editor because CLI linking remains unresolved.
- Remote verification passed in project `bqhzfkgkjyuhlsozpylf`: new tables exist, RLS is enabled, seven new support report columns exist, and expected policies/indexes are present.
- Found Vercel Production had `GOOGLE_CHAT_SUPPORT_WEBHOOK_URL` present but empty; replaced it with the Google Chat webhook value and redeployed so production alerts work.
- Fixed `client-account-profiles` to use real production subscription fields `plan_tier` / `pricing_tier` instead of nonexistent `subscriptions.tier`.

**Verification and deployment:**
- Focused support suite passed: 12 files, 50 tests.
- `npm run build` passed locally after the production-field fix.
- DB-backed support smoke passed: `notification=delivered`, `profile=true`, `audit=completed`, `lesson=true`, `cleanup=true`.
- Stable demo Help & Resources UI smoke passed through Chrome: Support Path expands, report form appears, and synthetic UI submission showed `Report saved. Support has the details.`
- Supabase verified the UI-submitted synthetic report with `notification_status=delivered`, `audit_status=completed`, completed audit row, client snapshot present, and cleanup complete.
- Branch pushed to `origin/codex/sparkle-cross-phase-hardening`.
- Production deployment: `dpl_HqowEV7A7hKgytjz32aDNSgbqQxX` / `https://sparkle-suite-sjcx33xt3-louis-2849s-projects.vercel.app`.
- Public aliases on the deployment include `https://www.yoursparklesuite.com`, `https://yoursparklesuite.com`, and `https://sparkle-suite.vercel.app`.
- Stable demo alias updated to the same deployment: `https://sparkle-suite-demo.vercel.app`.
- Current pushed checkpoint: `597e5c4 fix: align support smoke with production env`.

**Remaining caveats:**
- Supabase CLI auth/linking still needs restoration so migrations can move through CLI instead of Dashboard SQL editor.
- First real paid beta signup still needs monitoring.
- The Support Command Center resolution panel is intentionally display-only for v1; editable operator workflows can come with the fuller dashboard rebuild.

---

## June 12, 2026 - Support System Pressure Test

**Pressure test added and run:**
- Added `npm run pressure:support-system`.
- The pressure script creates 3 synthetic reps and 14 synthetic support reports, runs them through the real Supabase-backed support services, uses a local capture webhook to avoid spamming Google Chat, verifies 14 completed audits, verifies 14 captured alert payloads, forces 1 webhook failure, creates 1 reusable support lesson, exercises operator list/status/resolution paths, and cleans all synthetic rows.
- Pressure run passed twice with: `reps=3 reports=14 alerts=14 audits=14 notification_failures=1 lessons=1 cleanup_residuals=0`.

**Failure found and fixed:**
- Stable demo browser check found Support Path could still show as a collapsed generic disclosure row without exposing the support form, recreating Louis's original "nothing's clickable" concern in some live states.
- Fixed by making the Support Path `<details>` open by default so `Send a report to support`, `Start report`, fields, and `Send report` are visible without depending on the disclosure click.
- Added regression coverage asserting Support Path is default-open.

**Verification and deployment:**
- Expanded focused support regression suite passed: 15 files, 117 tests.
- `npm run build` passed locally.
- Production deployment: `dpl_B4WwrW71eXUN6E1nq2SL5uXUuTE4` / `https://sparkle-suite-my21lhpsy-louis-2849s-projects.vercel.app`.
- Public aliases include `https://www.yoursparklesuite.com`, `https://yoursparklesuite.com`, and `https://sparkle-suite.vercel.app`.
- Stable demo alias now points to this deployment.
- Final stable demo Chrome check passed: Help & Resources shows Support Path with `Send a report to support`, `Start report`, `Short title`, `Details`, and `Send report` visible immediately.
- Current pushed checkpoint: `2f7e0c8 chore: pressure test support system`.

---

## June 12, 2026 - Support Workflow Gate Copy

**What changed:**
- Clarified Help & Resources Support Path copy after Louis said the prior instructions felt vague/fake and should not assume reps know professional support workflow.
- Support Path now tells reps to start at the top of Help & Resources, open the relevant workflow guide, follow the applicable steps, and ask Nic-Nac if still blocked before submitting.
- Support form heading is `Submit a support report`.
- Added a required workflow-first checkbox confirming the rep started at the top of Help & Resources, used the relevant workflow guide, followed applicable steps, and still needs support.
- Removed casual gendered language concerns from the support workflow wording.

**Verification and deployment:**
- Focused support copy/regression tests passed.
- `npm run build` passed locally.
- Current pushed checkpoint: `d2cd203 fix: clarify support report workflow gate`.
- Production deployment: `dpl_3qYAoEcftAKq9VFBWGXWZsWzVzVd` / `https://sparkle-suite-3jlon2lad-louis-2849s-projects.vercel.app`.
- Stable demo alias was updated to the same deployment before the later dashboard-link deployment superseded it.

---

## June 12, 2026 - Permanent Dashboard Link

**What changed:**
- Added a friendly permanent dashboard route at `/dashboard`.
- `/dashboard` redirects to `/control-center`, keeping the Support Command Center as the single source of truth while giving Louis a memorable link.
- Follow-up fix after Louis reported the permanent link opened Neon Rabbit HQ:
  - Root cause was Supabase Auth URL Configuration, not the Next.js route: Supabase `SITE_URL` was still `https://neon-rabbit-hq.vercel.app`.
  - Updated Supabase Auth `SITE_URL` to `https://www.yoursparklesuite.com`.
  - Added Sparkle Suite redirect URL wildcards:
    - `https://www.yoursparklesuite.com/**`
    - `https://yoursparklesuite.com/**`
    - `https://sparkle-suite.vercel.app/**`
    - `https://sparkle-suite-demo.vercel.app/**`
  - Left the old HQ redirect wildcard in place for now to avoid breaking any legacy flow tied to the shared Supabase project; the default Site URL no longer points to HQ.
  - Added app-side login redirect preservation so `/control-center` sends unauthenticated users to `/login?redirect=%2Fcontrol-center`.

**Verification and deployment:**
- Focused redirect test passed: `tests/dashboard-page.test.ts`.
- `npm run build` passed locally and Vercel production build passed.
- Current pushed checkpoint: `e8d8632 feat: add permanent dashboard link`.
- Production deployment: `dpl_9vyzrTUdukkihrq3bbDnFbn5bZg7` / `https://sparkle-suite-i0wjd7bhh-louis-2849s-projects.vercel.app`.
- Stable demo alias updated: `https://sparkle-suite-demo.vercel.app`.
- HTTP checks confirmed both `https://sparkle-suite-demo.vercel.app/dashboard` and `https://www.yoursparklesuite.com/dashboard` return `307` to `/control-center`.
- Follow-up checkpoint: `acb2866 fix: preserve control center login redirect`.
- Follow-up production deployment: `dpl_1263MMazGNtj5asngnGfazcVnXGi` / `https://sparkle-suite-kf9ahff5v-louis-2849s-projects.vercel.app`.
- Stable demo alias updated to the follow-up deployment.
- Post-fix HTTP check confirmed `https://www.yoursparklesuite.com/dashboard` routes to `/control-center`, then `/login?redirect=%2Fcontrol-center`.
- Chrome check confirmed the public dashboard link lands on Sparkle Suite login with no HQ content.

---

## June 12, 2026 - Workspace Blank Panel Incident

**Issue found:**
- Louis reported the Sparkle Suite demo workspace was broken: clicking Trade Board, Calendar, and other dashboard sections left the center panel blank.
- Chrome inspection confirmed the center workspace section existed but rendered no content.
- Root cause had two parts:
  - The dashboard gated section content on `hasPaidWorkspace`; if account billing failed or had not resolved, paid sections rendered nothing.
  - `/api/nic-nac/account-billing` was returning `500` for the demo account, even though Trade Board and related workspace data endpoints were returning `200`.

**Fix completed:**
- Added a visible workspace access fallback so locked/loading sections show clear account guidance instead of a blank panel.
- Hardened account billing so optional Stripe billing-detail or referral-summary lookup failures no longer block subscription/access status.
- Current pushed checkpoints:
  - `4240396 fix: prevent blank locked workspace sections`
  - `84ebca7 fix: keep workspace access when billing details degrade`

**Verification and deployment:**
- Focused tests passed: `tests/services/account-billing.test.ts` and `tests/nic-nac-dashboard-placeholder.test.ts` with 70 tests.
- `npm run build` passed locally and Vercel production build passed.
- Final production deployment: `dpl_5Qwqc4EL6fUkWpRQzRcWkC2Ei7mt` / `https://sparkle-suite-5md5qf0f5-louis-2849s-projects.vercel.app`.
- Stable demo alias updated to the fixed deployment: `https://sparkle-suite-demo.vercel.app`.
- Chrome smoke on Louis's demo tab verified Trade Board, Jewelry Library, Calendar, Site Settings, Help & Resources, and Account all render visible center content with no console errors.
- Vercel logs confirmed `/api/nic-nac/account-billing` now returns `200`; the new warning is expected when optional details degrade and no longer blocks workspace access.

---

## June 13, 2026 - Mile High Fizz Sparkle Suite Shell

**What changed:**
- Built the Mile High Fizz tenant attachment path in the active Sparkle Suite repo without moving DNS or changing the live Ready.ai site.
- Added Lindsey / Mile High Fizz production tenant wiring:
  - Rep id: `f82734fd-6964-42c7-b67d-c2445528c3b4`
  - Email: `lindseychapman1188@gmail.com`
  - Public slug: `milehighfizz`
  - Custom domain reserved in Sparkle Suite: `milehighfizz.com`
  - Live Queue sync code: `MHF-9446`
- Added friendly customer routes for the Sparkle Suite shell:
  - `/milehighfizz`
  - `/milehighfizz/trade`
- Confirmed this uses the standard shared Sparkle Suite Trade Board; there is no custom one-off board.
- Hid the Join Team customer surface for phase one when `show_join_page=false`, including header/footer links.
- Added friendly slug link rewriting so customer Home/Trade Board links stay on `/milehighfizz` and `/milehighfizz/trade`.

**Verification:**
- Production Supabase read-back confirmed rep, site settings, active workspace gate, onboarding status, and live queue.
- Follow-up audit corrected the production rep row so `custom_domain=null`; the active customer link is the Sparkle Suite slug until cutover.
- Workspace customer site and Trade Board preview links were tightened to prefer `/milehighfizz` and `/milehighfizz/trade` when a public slug exists.
- Lindsey temporary login was verified through Supabase Auth; the password is not stored in binder notes.
- Focused tests passed after audit tightening: 7 files, 114 tests.
- `npm run build` passed locally.
- Local Playwright screenshots verified the homepage and Trade Board render with Mile High Fizz identity, standard empty Trade Board shell, and no visible Join Team nav.

**Caveats:**
- Code is implemented locally on `codex/sparkle-cross-phase-hardening` but not yet pushed or deployed from this checkpoint.
- DNS/domain cutover has not happened; `https://milehighfizz.com/` should stay on Ready.ai until Louis explicitly says to move it.
- Ready.ai assets and transferred email/SMS signups are still future migration work.

---

## June 15, 2026 - Customer-Site Skin Precedence Incident

**What happened:**
- Louis repeatedly reported that changing the customer-facing site skin in the Sparkle Suite workspace did not change the deployed live preview or customer-facing site.
- Earlier verification was too shallow and created a frustrating loop: the workspace save path looked healthy, but the stable demo customer route still rendered Amethyst.

**Root cause:**
- `loadAmethystPreviewTemplateData` was applying stale required-setup draft answers over saved `site_settings` even after the setup session was `dashboard_unlocked`.
- Louis's Fizz Fest had saved `site_settings.appearance_preset='amber'`, while stale setup answers still had `site_skin.selectedLook='AM-01'`.
- The public template emitted `preset:"amethyst"` from the stale setup answer, so the customer site ignored the saved workspace skin.

**Fix and deployment:**
- Fixed the precedence rule so required-setup draft answers only influence public template data while setup is active, not after dashboard unlock.
- Related checkpoint: `0b1563c fix: honor saved customer site skin after setup`.
- Deployment: `dpl_7Hg2Wk43ow7hCJoWPHucUq8Z33AF` / `https://sparkle-suite-jwth5hebr-louis-2849s-projects.vercel.app`.
- Stable demo alias: `https://sparkle-suite-demo.vercel.app`.

**Verification that passed:**
- Focused tests passed across public template and Site Settings routes: 7 files, 104 tests.
- `npm run build` passed.
- Stable demo template endpoint changed from `preset:"amethyst"` before the fix to the saved preset after the fix.
- Synthetic reviewer save path saved `black_diamond`; public template returned `black_diamond` instead of Amethyst.
- Stable slug HTML used the rep-scoped `data-template-src`.
- Rendered screenshot was captured at `C:\Users\louis\AppData\Local\Temp\sparkle-louisfizzfest-afterfix.png`.

**Lesson logged:**
- Customer-facing settings fixes must be verified on the exact stable-demo route Louis uses, not just local, API, or raw preview checks.
- For theme/skin bugs, always compare saved Site Settings against required-setup/session state so stale onboarding answers cannot silently win.
- Dedicated lesson file: `docs\sparkle-suite\lessons\2026-06-15-customer-site-skin-precedence.md`.

---

## June 15, 2026 - Sparkle Suite Polish Closeout and Stable Demo Handoff

**What changed this session:**
- Cleaned seeded/demo jewelry records out of the Sparkle Suite Finder catalog source so Sparkle Finder no longer receives the leaked demo items through `/api/public/finder/catalog`.
- Fixed the customer-facing site skin persistence bug where saved workspace Site Settings were overridden by stale required-setup answers after `dashboard_unlocked`.
- Preserved the product decision that Sparkle Suite workspace styling stays on the standard Sparkle Suite workspace look, while the customer-facing site skin remains editable from Site Settings.
- Removed the floating bottom-right Site Settings save dock after Louis reviewed it and decided it felt clunky.
- Moved `Save site settings` into the Site Settings card header with the save status beside it.

**Key decisions:**
- Louis reviews Sparkle Suite demo work at `https://sparkle-suite-demo.vercel.app/`; raw Vercel preview URLs are supporting evidence only.
- Future customer-facing theme/skin fixes must prove the exact deployed live preview/customer route after save, not only local state or API payloads.
- Site Settings uses explicit manual save, not auto-save, for public/customer-facing changes.
- The save control belongs on the Site Settings screen where the edits happen, not floating globally over the workspace.

**Current repo/deploy state:**
- Active repo: `C:\Users\louis\sparkle-suite-repo`.
- Branch: `codex/sparkle-cross-phase-hardening`.
- Current pushed checkpoint: `a440944 fix: move site settings save into settings header`.
- Stable demo alias: `https://sparkle-suite-demo.vercel.app/`.
- Current stable demo target: `https://sparkle-suite-ni9tlg2a6-louis-2849s-projects.vercel.app`.
- Deployment id: `dpl_DuW2PuoQfYFiZjrAqRpYbhbia7nN`.
- Active repo was clean and synced with origin after the closeout.

**Verification completed:**
- Finder catalog cleanup verified that seeded/demo records were removed and legitimate uploaded jewelry such as `ER76003 / The Elodie Luxe` remained.
- Customer-site skin fix verified that saved Site Settings win over stale setup answers after dashboard unlock.
- Focused Site Settings/dashboard regression passed: 1 file, 68 tests.
- Local `npm run build` passed.
- Vercel preview build passed.
- Stable demo reviewer-smoke verified the Site Settings header save action:
  - `No unsaved changes.` appears beside the header button initially.
  - Editing a setting changes status to `Unsaved changes.` and enables `Save site settings`.
  - Saving changes status to `Site settings saved.` and disables the button again.
  - No floating save dock remained.
  - No console warnings/errors were seen during the tested flow.

**Continuation guidance:**
- New sessions should start from binder/Open Brain bridge at `C:\Users\louis\sparkle-suite`, then use `C:\Users\louis\sparkle-suite-repo` for implementation only after Louis gives a concrete task.
- Use reviewer-smoke/synthetic sessions for logged-in stable-demo workspace checks, not Louis's personal account.
- Continue polishing/editing Sparkle Suite only when Louis gives the next specific item.

---

## June 15, 2026 - Nic-Nac Trade Board Intake Regression and Smoke-Test Gap

**What happened:**
- Louis repeatedly hit the same failure while trying to add `ER13229 / The Florence Earrings` to the Trade Board and jewelry database through Nic-Nac.
- Nic-Nac confused a label/details photo with a customer-facing jewelry photo and criticized it as though it were the boxed display jewelry shot.
- After Louis corrected Nic-Nac with language like "I didn't give you any photos. I only gave you a photo with a label in it," Nic-Nac dropped the add-listing workflow and incorrectly claimed he could not add listings from chat.

**Root cause found during debugging:**
- The active tool router did not treat that correction sentence as a Trade Board continuation.
- The turn fell back to `memory` intent, which removed `add_listing` from the active tool list.
- Once `add_listing` was unavailable, the model produced the bad manual-workaround answer.
- A conflicting prompt section also still let a label/details photo be described as a boxed display photo if jewelry was visible somewhere in the frame.

**Work in progress in the active repo:**
- Active repo: `C:\Users\louis\sparkle-suite-repo`.
- Branch: `codex/sparkle-cross-phase-hardening`.
- Current working tree has uncommitted changes in:
  - `lib/nic-nac/tools/index.ts`
  - `lib/nic-nac/prompt-builder.ts`
  - `lib/nic-nac/system-prompt.ts`
  - `tests/nic-nac/tool-routing.test.ts`
  - `tests/nic-nac/prompt-routing.test.ts`
  - `tests/nic-nac/system-prompt-add-listing.test.ts`
- Added deterministic regression coverage for the exact correction path; before the fix it returned `['memory']` instead of keeping Trade Board tools active.
- Latest verification before pausing:
  - Targeted regression files passed: 3 files, 52 tests.
  - Full Nic-Nac suite passed: 77 files, 579 tests, 1 skipped.
  - `npm run build` passed.

**Smoke-test issue:**
- Prior verification was too shallow. It checked prompt strings, tests, build, stable alias, and health, but did not replay the actual logged-in Nic-Nac add-listing conversation end-to-end.
- A true smoke must use a synthetic/reviewer rep session, the real chat route/UI or real `/api/nic-nac`, real uploaded image parts, and the actual model/tool loop.
- Local Next server startup from Codex hit Windows/session barriers (`spawn EPERM` for `next dev`, and PowerShell background-job permission issues), so stable-demo/reviewer-smoke browser automation is the preferred path.

**New QA direction:**
- Create a local fixture folder, recommended path: `C:\Users\louis\sparkle-suite-smoke-assets`.
- Store test images such as:
  - `ER13229-label.jpg`
  - `ER13229-jewelry-boxed-front.jpg`
  - bad/edge-case examples for coached retakes.
- Store `cases.txt` with item details and expected behavior.
- Codex should use browser/Chrome automation and reviewer-smoke/synthetic accounts to act like a rep, upload those files, and rerun the same flows until Nic-Nac behaves correctly.
- Capped real model calls are needed for final confidence because the failure is in the live LLM/tool loop, not only deterministic code.

---

## June 16, 2026 - Nic-Nac ER13229 Workflow Truth Hardening

**What changed:**
- Implemented the Trade Board workflow truth fix for the latest `ER13229 / The Florence Earrings` failure.
- Added regression coverage for the exact live failure shape:
  - `search_jewelry_database` found `ER13229`, but workflow state did not learn the catalog truth.
  - The confirmation sentence `That is correct. This is the July Birthday collection, 2026.` previously parsed as `collectionName: "ection"`.
  - `add_listing` previously let stale workflow readiness veto a valid current tool call with `itemNumber`, collection, and confirmed jewelry-front photo.
- Created `lib/nic-nac/workflows/trade-board-known-fields.ts` so known-field extraction and catalog tool-output ingestion live outside the route context.
- Added `computeTradeBoardAddAttemptReadiness` so `add_listing` still enforces photo-role safety but lets current tool input complete stale workflow facts before service-level validation.
- Added an `ER13229` live-sequence fixture for the required rep-like turn order and hard-fail phrases.

**Implementation checkpoints in active repo:**
- `eb2816d fix: sync trade board workflow with catalog truth`
- `23effe6 fix: allow valid add listing attempts from current input`
- `867e240 test: capture ER13229 live intake sequence`
- `6f7c93b fix: type catalog tool part extraction`

**Verification completed locally:**
- Focused tests passed: `tests/nic-nac/trade-board-intake-route-context.test.ts`, `tests/nic-nac/trade-board-intake-controller.test.ts`, `tests/nic-nac/add-listing-recovery.test.ts`, `tests/nic-nac/trade-board-intake-live-sequence.test.ts` — 4 files, 53 tests.
- Full Nic-Nac suite passed: 86 files passed, 1 skipped; 629 tests passed, 1 skipped. Vitest printed worker-termination timeout warnings after the passing run.
- `npm run build` passed after a TypeScript cast cleanup in catalog tool-part extraction.

**Still not proven fixed:**
- `C:\Users\louis\sparkle-suite-smoke-assets` does not currently contain `ER13229-label.jpg` or `ER13229-jewelry-boxed-front.jpg`.
- `scripts/smoke-nic-nac-trade-board-intake.ts` is still a parser/stub and reports `not_implemented_for_live_calls`.
- No model-in-loop replay, browser reviewer-smoke, deployed stable-demo smoke, or database assertion has been completed for this new fix yet.

**Next required steps before saying fixed:**
- Push and deploy the new commits to the stable Sparkle Suite demo target.
- Add or locate the ER13229 smoke fixture photos.
- Implement or finish the real `smoke:nic-nac:trade-board-intake` replay so it uploads real image parts and checks tool calls, final text, workflow completion, listing database state, and hard-fail phrases.
- Run the replay three consecutive times and run one stable-demo reviewer-smoke pass against `https://sparkle-suite-demo.vercel.app/`.

**Later update in same session:**
- Added active repo checkpoint `057bc64 chore: add Nic-Nac trade board smoke replay`.
- `scripts/smoke-nic-nac-trade-board-intake.ts` is no longer a parser/stub. It signs in the demo rep, posts real `/api/nic-nac` turns with image data parts, checks assistant hard-fail phrases, observes `search_jewelry_database` and `add_listing`, verifies workflow/listing DB state, and soft-removes smoke listings by default.
- Re-verified after the replay harness: focused Nic-Nac + smoke-script tests passed (5 files, 57 tests), full Nic-Nac suite with the smoke-script test passed (86 files passed, 1 skipped; 631 tests passed, 1 skipped), and `npm run build` passed.
- `npm run smoke:nic-nac:trade-board-intake` now reaches the real harness and fails safely with `status: "missing_assets"` because `C:\Users\louis\sparkle-suite-smoke-assets` still lacks `ER13229-label.jpg` and `ER13229-jewelry-boxed-front.jpg`.
- Remaining proof gap: no model-in-loop replay, browser reviewer-smoke, deployed stable-demo smoke, or database assertion has completed yet because the fixture photos are missing.

**Final update in same session:**
- Found the real ER13229 label/details photo beside Louis's boxed jewelry photo and created the canonical fixture folder `C:\Users\louis\sparkle-suite-smoke-assets` with:
  - `ER13229-label.jpg`
  - `ER13229-jewelry-boxed-front.jpg`
  - `cases.txt`
- Added and pushed additional smoke-harness checkpoints:
  - `7362be7 chore: default Nic-Nac smoke to reviewer account`
  - `22e4a98 chore: target stable demo in Nic-Nac smoke`
  - `d67a342 chore: use uuid conversations in Nic-Nac smoke`
  - `60152d2 chore: clean ER13229 smoke listings before replay`
- Stable demo alias now points to the final verified app deployment: `https://sparkle-suite-demo.vercel.app` -> `https://sparkle-suite-cqjhr6sif-louis-2849s-projects.vercel.app`.
- Stable-demo ER13229 replay smoke passed three consecutive model/tool/API runs, then passed once more after the final alias update, and once more after clean-state harness hardening. Each pass used reviewer-smoke workspace `sparkle-reviewer+preview@neonrabbit.net`, real `/api/nic-nac`, real image data parts, `search_jewelry_database`, `add_listing`, workflow/listing DB verification, hard-fail phrase gates, and smoke listing cleanup.
- Active repo `C:\Users\louis\sparkle-suite-repo` is clean and synced with origin on `codex/sparkle-cross-phase-hardening` through `60152d2`.

---

## June 16, 2026 - Public Site Context Routing Hardening

**What happened:**
- After the Nic-Nac ER13229 flow finally added `The Florence Earrings` to the workspace Trade Board, Louis found the customer-facing public site still showed stale/default inventory instead of the newly added listing.
- Screenshot comparison showed the workspace board had `ER13229 / The Florence Earrings` with the boxed earrings photo, while the public Trade Board page showed a seeded/default item such as `Birthday Bloom Ring`.

**Root cause:**
- The customer route could render with the correct initial slug/rep context, but client-side public API refreshes could call `/api/amethyst/trade-board` without the same target identity.
- When target identity was lost, the public page could fall back to demo/default data instead of failing closed for the intended rep.

**What changed:**
- Added a shared public-site request target contract in `lib/amethyst/request-rep-target.ts`.
- Public routes now resolve `c`/`repId`, `publicSiteSlug`, slug path/referrer context, and real custom domains through the same helper.
- Template runtime context now preserves both `repId` and `publicSiteSlug`.
- Public browser code now merges that runtime context into Trade Board refreshes, trade requests, signup/audience actions, and unsubscribe requests.
- Targeted loaders now fail closed rather than silently showing default/demo data when rep context cannot be resolved.
- Public trade request submission can verify the listing belongs to the expected rep before the RPC submit path.
- Canonical platform hosts such as `yoursparklesuite.com` and `www.yoursparklesuite.com` are excluded from rep custom-domain matching.

**Implementation checkpoint:**
- `68fc332 fix: harden public site context routing`
- Branch: `codex/sparkle-cross-phase-hardening`
- Active repo: `C:\Users\louis\sparkle-suite-repo`

**Verification and deploy:**
- Focused public-site/trade-request regression suite passed: 24 files, 175 tests.
- `npm run build` passed.
- Vercel preview build passed.
- Stable demo alias now points to `https://sparkle-suite-1k5a4e5xv-louis-2849s-projects.vercel.app`.
- Deployment id: `dpl_EopEe8p6QKN6ZTqGdUoFnFH3DaWM`.
- Stable demo root returned Sparkle Suite HTML after alias promotion.
- Louis ran a light manual smoke on `https://sparkle-suite-demo.vercel.app` and reported that everything seemed to be working.

**Lessons carried forward:**
- Public-site/workspace plumbing is not a place for one-off patches. Rep/site identity must be a contract shared by templates, browser JS, APIs, loaders, and mutation services.
- For future customer-site bugs, compare workspace state against the actual public route after hydration/API refresh, not just the initial HTML or one route payload.
- Do not let targeted public pages silently fall back to seeded/demo inventory.

---

## June 18, 2026 - Trade Board Polish and Mile High Fizz Hybrid Migration

**Active repo state:**
- Active implementation repo: `C:\Users\louis\sparkle-suite-repo`
- Branch: `codex/sparkle-cross-phase-hardening`
- Latest pushed checkpoint: `899db82 fix: restyle mile high fizz join page`
- Stable demo alias: `https://sparkle-suite-demo.vercel.app`
- Current stable demo target: `https://sparkle-suite-ovf2bqfy6-louis-2849s-projects.vercel.app`
- Deployment id: `dpl_E1wE9yon1Ai82nBusv4VXwYbxjcF`
- Repo was clean and synced after the closeout.

**Trade Board and Nic-Nac polish completed after the June 16 context-routing work:**
- `fd4ea3e fix: silence accepted photo warnings in Nic-Nac`
  - Nic-Nac should not push back on an accepted Trade Board jewelry photo.
  - If the photo is acceptable, he should add the listing and avoid quality commentary like "background is busy" or "a bit small."
  - Only genuinely unacceptable photos should trigger coaching/retake requests.
- `486d68e fix: require years in birthday collection names`
  - Birthday collections must include the year in database/catalog/trade-board naming, e.g. `April Birthday 2026`, `May Birthday 2026`, `July Birthday 2026`.
  - Nic-Nac/tools should collect the year going forward so future `2027` sets stay distinct while still allowing trades across years.
- `c1bcfbf fix: stack trade board workspace cards`
  - Trade Board workspace layout was tightened so the cards flow down the page rather than leaving a large blank middle/right gap beside Nic-Nac.
- `fa67db5 feat: add reveal screenshots to trade requests`
  - Customer trade request flow now supports a short-lived revealed-piece screenshot to help reps identify the piece being swapped.
  - The customer-facing request copy asks for a brief description including collection and type instead of leaning on an item number.
  - Rep-side trade inbox/detail surfaces can show the screenshot with the trade request.
- `55a2ae9 docs: update trade request help flow`
  - Help & Resources was updated so reps understand how the trade process works, including customer descriptions and optional reveal screenshots.
- `99a7597 fix: tune customer ticker speed` and `2baf30c fix: speed up customer tickers`
  - Customer-facing Trade Board ticker and announcement ticker were sped up from the too-slow/NASDAQ crawl behavior while remaining readable/clickable.

**Mile High Fizz migration turning point:**
- Initial attempts treated Mile High Fizz too much like a generic Amethyst/Black Diamond skin and did not preserve the original site closely enough.
- Louis clarified the true target: the same MileHighFizz.com site, with Sparkle Suite automations built in and styled to match. Not "recognizable"; the same site as close as possible.
- Screenshots and the live URL were useful for discussion, but the migration did not become faithful until Louis provided the Ready.ai/Readdy project source at `C:\Users\louis\Downloads\project-8286539 (1)\`.
- Important source assets included the original React/Vite code, page components, copy, styles, and hero video.

**Mile High Fizz implementation checkpoints:**
- `28c3fb9 fix: unlock Mile High Fizz migration workspace`
- `23cbad0 feat: add Mile High Fizz hybrid public site`
- `90a2ecb fix: migrate mile high fizz homepage shell`
- `7356a90 fix: restyle mile high fizz homepage sections`
- `2191355 fix: restyle mile high fizz trade board`
- `899db82 fix: restyle mile high fizz join page`

**Mile High Fizz migration outcome as of this closeout:**
- Public slug remains `milehighfizz`.
- Homepage now carries the Mile High Fizz hero feel, video/visual direction, copy, colors, and brand language while keeping Sparkle Suite header/ticker/live-queue standards where Louis requested them.
- Trade Board has its own page/route and keeps normal Sparkle Suite Trade Board behavior, but is dressed in Mile High Fizz branding.
- Join page now restores the missing/miscarried `Diamond Peak Society` language, launch-pack/diamond copy, and Mile High Fizz styling instead of leaking Black Diamond/default Amethyst styling.
- Lindsey's workspace remains standard Sparkle Suite; the public website is the custom hybrid surface.
- Nic-Nac/site settings should still be able to update migrated branding/copy like a normal rep unless a future section is explicitly locked.

**Verification and deploy for the final Join pass:**
- Focused Mile High Fizz public-site suite passed: 1 file, 11 tests.
- `npm run qa:amethyst` passed: 3 files, 64 tests, plus local Amethyst link checks.
- `npm run build` passed locally.
- Vercel preview build passed.
- Stable demo alias was promoted to `https://sparkle-suite-ovf2bqfy6-louis-2849s-projects.vercel.app`.
- Stable desktop and mobile screenshots were captured for `https://sparkle-suite-demo.vercel.app/milehighfizz/join`.

**New reusable skill created in Open Brain:**
- Created `C:\Users\louis\sparkle-suite\.agents\skills\sparkle-suite-existing-site-migration\SKILL.md`.
- Added `agents/openai.yaml` for the skill.
- The skill encodes the main lesson: for exact rep-site migrations, source code/project export is the intake gate. Screenshots and live URLs are references, not enough for a faithful migration unless Louis explicitly accepts a close recreation.
- The skill instructs future agents to ask one question at a time, beginning with the current site source code/export/repo, and to avoid dumping long questionnaires.

**Key lessons:**
- For existing-site migrations, "same site with Sparkle Suite automations inserted" is the correct mental model.
- Do not overbuild a reusable skin when the ask is a bespoke rep migration.
- The public automations should keep their normal Sparkle Suite behavior; only the surrounding presentation should become rep-branded.
- Source code/project exports beat screenshots for preserving copy, layout, media, and section hierarchy.
- Hero media can carry a large portion of the brand identity and should be migrated when available.

---

## June 18, 2026 - Trade Request Confirmation Fix and Pressure Smoke

**What happened:**
- Louis tested the upgraded customer Trade Board request flow on a demo/preview account for Louis' Fizz Fest.
- He filled out the trade request form, uploaded a reveal screenshot, submitted it, and the sheet flashed away without a visible success confirmation.
- No request appeared in the expected Trade Board inbox/Nic-Nac path from that manual attempt.

**Root cause:**
- The customer Trade Board component submitted successfully or hit an error, then refreshed the board and updated submitted/available listings.
- A demo-sheet synchronization effect depended on `availableSamples`, so the board refresh retriggered that effect with `demoSheet === "closed"`.
- That cleared `requesting`, `success`, and `requestError`, making the customer sheet disappear immediately after submit.
- The backend request/screenshot path was not the root failure. Multipart screenshot submit, request insert, listing `pending_trade` transition, screenshot persistence, and rep-scoped inbox visibility all worked when tested directly.

**What changed:**
- `public/amethyst/trade.jsx`
  - Added a ref for the latest available samples.
  - Limited the demo-sheet effect dependency to `t.demoSheet`.
  - Kept the tuning-panel demo behavior intact while preventing real board refreshes from clearing the customer success/error sheet.
- `tests/amethyst-trade-template.test.ts`
  - Added a regression test proving success and error sheets stay visible after board refreshes.

**Implementation checkpoint:**
- `1635ce1 fix: keep trade request confirmation visible`
- Branch: `codex/sparkle-cross-phase-hardening`
- Active repo: `C:\Users\louis\sparkle-suite-repo`

**Verification and deploy:**
- TDD red/green was run against `tests/amethyst-trade-template.test.ts`.
- Focused Trade Board/request/storage/Nic-Nac regression suite passed: 7 files, 59 tests.
- `npm run qa:amethyst` passed after starting local `localhost:3001`: 3 files, 65 tests, plus local Amethyst homepage/Trade Board link checks.
- `npm run build` passed locally.
- Local synthetic multipart smoke passed:
  - created a temporary paid rep and public slug,
  - submitted a trade request with `ER13229-jewelry-boxed-front.jpg` as a reveal screenshot,
  - verified request status `pending`, listing status `pending_trade`, screenshot metadata, and rep-scoped inbox visibility.
- Local pressure smoke passed:
  - 6 synthetic submissions,
  - 3 with screenshots and 3 without,
  - all requests landed as rep-scoped pending requests and all listings moved to `pending_trade`.
- Vercel preview build passed.
- Stable demo alias now points to `https://sparkle-suite-pyfv4xpp7-louis-2849s-projects.vercel.app`.
- Stable demo `https://sparkle-suite-demo.vercel.app/amethyst/Trade.html` returned `200 OK`.
- Deployed stable smoke passed:
  - screenshot-backed API submit persisted screenshot metadata,
  - rendered customer-page submit showed `Request sent.` and kept it visible after refresh,
  - no console errors,
  - rep-scoped data path saw both smoke requests.
- All synthetic local and deployed smoke rows, auth users, reps, listings, designs, collections, subscriptions, and uploaded screenshot objects were cleaned up.

**Lessons carried forward:**
- Customer success/error UI must not depend on mutable listing collections that can change during the same submit cycle.
- Optional screenshot upload should be smoke tested separately from the visual customer confirmation. The screenshot can be valid even when the UI confirmation is broken.
- Public-site smoke slugs must obey Sparkle Suite slug validation: lowercase letters and digits only, no hyphens.
- Browser plugin may block local/stable URLs with `ERR_BLOCKED_BY_CLIENT`; if that happens after trying it first, cached/headless Playwright is an acceptable rendered-verification fallback.
- Preview/static Trade Board URLs can appear to work while showing fallback sample inventory if target context is invalid or missing. Always verify the public board endpoint returns the intended synthetic listing before testing form behavior.

---

## June 20, 2026 - Control Center Customer and Demo Database Split

**What changed:**
- `/control-center` now separates the left-nav account views into `Customer Database` and `Demo Database`.
- The Customer Database is limited to the three active customer public sites Louis named: Mile High Fizz, Britt With Bling, and BlingKitchen.
- All other operator-visible account profiles render in the Demo Database and are labeled `Demo Account` in the expandable row.
- Control Center summary cards now show `Active accounts` and `Demo accounts` instead of mixing all profiles into a single active/customer count.

**Verification:**
- Added a focused page test proving the three named active customer accounts stay in Customer Database while an extra account moves to Demo Database.
- Focused Control Center page and customer-profile service tests passed.
- Local production build passed.

**Follow-up note:**
- The current split is derived from known active customer site identifiers. If Louis wants this editable from Nic-Nac/dashboard later, add durable account classification metadata so customer/demo status is not code-defined.

---

## June 20, 2026 - Stable Demo Review Target Correction

**What happened:**
- During BlingKitchen follow-up verification, the assistant described production and demo as separate surfaces and initially verified the wrong public target before checking Louis's actual Chrome tab.
- Louis clarified that `https://sparkle-suite-demo.vercel.app/` is the Sparkle Suite review/deploy target he uses, and he should not have to chase other Vercel links.

**Rule going forward:**
- Treat `https://sparkle-suite-demo.vercel.app/` as the canonical Louis review target for ordinary Sparkle Suite work.
- Raw Vercel deployment URLs are internal implementation details unless Louis explicitly asks for them.
- Before reporting a fix as live, promote/confirm the stable demo alias and verify the exact route at that URL.
- If Louis says a fix is not visible, use the Chrome connector to inspect the exact tab/URL and loaded assets before making another deployment claim.

---

## June 22, 2026 - Nic-Nac Batch Hardening and Sparkle Lab Guardrails

**What changed:**
- Suite commit `8ed7d7d fix: harden Nic-Nac intake and Lab guardrails`.
- Finder commit `28e0890 feat: add Finder Studio intake status tool`.
- Suite `add_listing` now treats an existing item number on a rep's Trade Board as physical inventory, asks whether the rep is adding a second physical piece of that same design, and hard-fails duplicate-listing refusal language in evals.
- Suite Trade Board intake role inference now distinguishes extracted item details from an actual label/details photo request. Root cause of the ER13229 smoke failure was the phrase "got the details for ER13229 ... need the customer-facing jewelry photo" being misclassified as both details-photo and jewelry-photo context, which stored the boxed jewelry upload as `unknown`.
- Sparkle Lab manual/weekly routes now return deterministic recommendation artifacts, artifact counts/summaries, mutation mode, model-synthesis status, and visible usage/limits reporting while preserving the no-production-self-mutation boundary.
- Finder Nic-Nac Studio pack now includes `read_my_studio_intake_status`, reading app-owned Showcase Studio upload/submission state and directing missing/replacement files to `/silver#showcase-studio` instead of pretending chat can accept Studio files.

**Deployments:**
- Suite preview deployment `dpl_4yTnu2v4T3gyPvHe1B52ZGRLMct1` / `https://sparkle-suite-p7kwbf9om-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that Suite deployment.
- Finder production deployment `dpl_Fp6ZPoRVKhzsJkGXZMwFMZPKjo8p` / `https://sparkle-finder-5jpiavcgk-louis-2849s-projects.vercel.app`, aliased to `https://sparkle-finder-dev.vercel.app`.

**Verification:**
- Suite focused Nic-Nac/Lab suite passed: 13 files, 152 tests.
- Suite standard `npm test` passed: 14 files, 179 tests.
- Suite touched-file lint passed.
- Suite `npm run build` passed locally, and Vercel build passed.
- Suite local ER13229 smoke failed before the classifier fix, then passed after rebuild.
- Suite stable demo ER13229 smoke passed three consecutive deployed replays against `https://sparkle-suite-demo.vercel.app`, each through real `/api/nic-nac`, real image data parts, tool observation, workflow/listing DB verification, and smoke listing cleanup.
- Suite `npm run lint` still fails on pre-existing unrelated repo-wide lint debt: 27 errors and 39 warnings, mainly old Link/no-unescaped-entities/no-explicit-any/set-state-in-effect issues outside this batch.
- Finder Sparkle Finder suite passed: 37 files, 492 tests.
- Finder `npm run lint` passed.
- Finder `npm run build` passed locally, and Vercel production build passed.
- Finder `smoke:finder-nic-nac:guard` passed locally with the expected `model_not_configured` guard.
- Finder deployed `smoke:finder-nic-nac` was blocked because deployed preview auth is disabled and no non-personal cookie/test auth path was available in the environment.

**Remaining:**
- Deeper Finder tool parity.
- A deployed Finder Nic-Nac smoke path that does not depend on personal browser auth when preview auth is disabled.
- Broader Suite repo lint cleanup remains separate from this Nic-Nac/Lab batch.

---

## June 22, 2026 - Nic-Nac Stable Baseline Closeout Plan and Memory Writeback

**What changed:**
- Added and pushed `docs/superpowers/plans/2026-06-22-nic-nac-stable-baseline-closure.md` in commit `d81f938 docs: add Nic-Nac stable baseline closure plan`.
- The plan freezes the shippable Nic-Nac beta baseline and separates it from continuing enhancement work.
- Baseline gates cover Suite local/deployed tests, Finder local/deployed tests, linked-rep memory, Lab guardrails, model policy/cost telemetry, browser smoke, release notes, and vault closeout.
- HQ now has Phase 11 task `task_11_10_nic_nac_stable_baseline` for executing that matrix.
- Open Brain was updated with standalone memories for shared architecture, OpenAI model policy, implementation summary, verification summary, lessons learned, and risk watchlist.
- Headquarters was updated to correct stale Nic-Nac model/cost assumptions and preserve the new shared-agent/surface-gated action decision.

**Key locked decisions:**
- Nic-Nac remains one shared Sparkle ecosystem agent across Sparkle Suite and Sparkle Finder.
- Secret Rep ID Number is the private rep-linking credential and is not the public referral code.
- Sparkle Suite workspace actions stay gated to Sparkle Suite login; Finder Nic-Nac can share identity/memory but must redirect Suite mutations back to Suite.
- Nic-Nac model policy is OpenAI-only for the current baseline: `human_default` => `gpt-5.4`, `human_escalated` => `gpt-5.5`, `utility_fast` => `gpt-5.4-mini`, `lab_synthesis` => `gpt-5.5`.
- Sparkle Lab is a bounded recommendation loop, not a self-mutating production agent.

**Lessons carried forward:**
- Prompt-only fixes are not enough for Nic-Nac reliability. App-owned workflow state, tool availability, validation, database assertions, and real replay smoke need to own the hard behavior.
- Do not call a Nic-Nac customer-facing fix done until the exact deployed/reviewer surface has been smoked.
- Non-personal reviewer smoke paths are mandatory for Suite and Finder so Louis does not become the test harness.
- Stale HQ/vault model assumptions can mislead future sessions; model/provider decisions need explicit memory updates when they change.

**Risk watchlist:**
- Execute the stable baseline closure matrix before calling the upgraded Nic-Nac stable.
- Deeper Finder tool parity and broader shared-core consolidation remain backlog after baseline closure.
- Keep Lab model synthesis disabled until Louis approves a guarded live synthesis smoke with spend limits.
- Attorney review and final marketing/onboarding positioning remain needed for Nic-Nac memory disclosure.
- Full Suite Vitest still has unrelated start/prelaunch/master-brand failures; do not confuse those with focused Nic-Nac baseline gates.
- Investigate unrelated public Finder API 500s separately if Finder public discovery/catalog reliability comes into scope.

---

## June 23, 2026 - Help & Resources Quick Support Report Simplification

**What changed:**
- Replaced the Help & Resources support report monster form with a one-field quick report: reps now only type what happened, what is confusing, or what they want improved.
- The UI still posts structured support data by inferring report type, urgency, and title from the description, with contact follow-up enabled by default.
- `/api/nic-nac/support-reports` now also accepts details-only submissions and normalizes them before calling the existing support report service, preserving Control Center, Support Auditor, Google Chat, and Sparkle Lab downstream automation wiring.

**Verification:**
- Focused support/automation suite passed: 6 files, 32 tests.
- Standard `npm test` passed: 14 files, 191 tests.
- `npm run lint` passed with existing warnings only.
- `npm run build` passed locally and in Vercel.
- Vercel preview: `https://sparkle-suite-minjgq4dj-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that preview.
- Stable demo `/start` returned 200, `/api/nic-nac/health` returned API/DB reachable, and unauthenticated one-field support report POST returned the expected 401 auth guard.
- Full Google Chat support smoke was intentionally not run in this pass because it sends a real synthetic support alert; the service/auditor/Google Chat wiring is covered by tests.

---

## June 27, 2026 - Open Brain and HQ Handoff for Beta-Readiness Session

**What was captured:**
- Open Brain now has standalone memories for the June beta-readiness session: Nic-Nac duplicate physical listing smoke/root-cause work, the Help & Resources quick support report simplification, and the verification lesson about stale smoke failures.
- HQ activity log now has note `120fd02d-13af-4e01-b9ed-e4144854be35` summarizing the session, key decisions, and lessons learned.

**Session work summarized:**
- Audited beta readiness for Sparkle Suite/Nic-Nac with Louis, including how close the system is to a 2-3 rep beta.
- Re-investigated the duplicate physical listing concern after Louis reported he had already smoke-tested the path successfully.
- Found that the remaining problem was a mix of smoke/harness drift and a direct-tool edge, not the core product path being broadly broken.
- Shipped `1c8bf7f fix: stabilize Nic-Nac duplicate listing smoke` and `200b220 fix: align Nic-Nac trade smoke with canonical photos`.
- Simplified Help & Resources support intake from a high-friction multi-field form to a one-field quick report while preserving structured downstream support automation.
- Shipped `ced7467 fix: simplify Help Resources support reports` and promoted it to `https://sparkle-suite-demo.vercel.app`.

**Key decisions and lessons:**
- Treat `https://sparkle-suite-demo.vercel.app` as the ordinary Louis review target and verify the stable alias before calling work live.
- Beta support intake should be low-friction for reps; enrichment/classification belongs behind the scenes in Sparkle Suite, not in a long rep-facing form.
- Preserve Control Center, Support Auditor, Google Chat, and Sparkle Lab automation while reducing the form to a simple report surface.
- Do not treat old smoke failures as current product blockers without rechecking the exact deployed build, URL, harness, and product behavior.
- Separate true product bugs from smoke harness drift, and use non-personal reviewer/synthetic data for beta verification.

---

## June 27, 2026 - Nic-Nac Front Photo Handoff Confirmation Recovery

**What changed:**
- Louis found a remaining Nic-Nac add-listing save edge after several successful pieces: the uploaded jewelry photo was visually accepted in chat, but the save step still treated the front photo handoff as missing.
- Root cause was workflow-state confirmation language, not photo quality. The image URL could already be stored as an unknown workflow photo, but phrases like `Push it through, please. It's a good photo.` after Nic-Nac's `I've got the front photo visually...` message did not promote that stored photo into the confirmed customer-facing jewelry photo slot.
- Shipped `bfd443b fix: recover Nic-Nac front photo handoff confirmations`.
- The intake context now treats push-through/good-photo confirmations as positive only in the guarded context where Nic-Nac had already asked to confirm or identified the front jewelry photo/save-handoff state.
- Added a regression test for the exact ER18012-style path so the saved image URL is promoted, `jewelryFrontPhoto` clears from missing fields, and the workflow becomes ready to add.

**Verification:**
- First ran the new regression test red against the old behavior.
- `npm exec vitest run tests/nic-nac/trade-board-intake-route-context.test.ts` passed: 18 tests.
- `npm exec vitest run tests/nic-nac/trade-board-intake-route-context.test.ts tests/nic-nac/add-listing-recovery.test.ts` passed: 58 tests.
- `npm exec vitest run tests/nic-nac` passed: 793 tests, 1 skipped.
- `npm run build` passed locally.
- Vercel preview build passed at `https://sparkle-suite-ld0rnr0nn-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that preview.
- Stable demo root returned 200; `/api/nic-nac/health` returned API/DB reachable with recent error rate 0.
- Deployed reviewer-smoke Trade Board intake replay passed against stable demo with synthetic reviewer account `sparkle-reviewer+preview@neonrabbit.net`, verified listing creation, and cleaned up listing `9b30355e-26c8-4c3d-9d08-a6104fa25ca5`.

**Lesson:**
- When Nic-Nac says it can see a photo but the save handoff is stuck, first check whether workflow photo role promotion failed before asking the rep for another photo. The app-owned workflow state should preserve and confirm already-uploaded image URLs whenever the rep clearly approves the photo.

---

## June 27, 2026 - Trade Board Ticker Detail Simplification

**What changed:**
- Louis asked for the customer-facing Trade Board ticker to stop showing MSRP and instead show the item's name, item type, and collection.
- Shipped `3becf3d fix: simplify trade board ticker details`.
- `tradeBoardTickerItems` now carries `name`, `type`, and `collection` instead of `name`, `price`, and `tier`.
- The public homepage ticker now renders entries as `Item Name - Type - Collection`; fallback ticker entries were updated to remove MSRP values.

**Verification:**
- Added/updated homepage regression coverage for the new ticker payload.
- `npm exec vitest run tests/amethyst-homepage-template.test.ts` passed: 32 tests.
- `npm run qa:amethyst` unit phase passed: 70 tests. The local link verifier portion failed only because no local server was running at `http://localhost:3001`.
- `npm exec vitest run tests/amethyst-homepage-template.test.ts tests/amethyst-static-assets-route.test.ts tests/amethyst-preview-template-data.test.ts tests/amethyst-targeted-site-data-scrub.test.ts` passed: 69 tests.
- Local `npm run build` hung in the shell environment without actionable compiler output; stale Node build workers were stopped.
- Vercel preview build passed at `https://sparkle-suite-a7zpv3cez-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that preview.
- Stable demo root returned 200.
- Deployed `/amethyst/homepage.jsx` contains the new ticker line and no old ticker price/MSRP fallback.

---

## June 28, 2026 - Universal Customer Ticker Audit and Stable Demo Fix

**What changed:**
- Louis reported the Trade Board ticker was still extremely slow on the Louis's Fizz Fest / Mile High Fizz Trade Board page even after the earlier ticker-speed work.
- Audited every active customer-facing ticker path: static Home, static Trade, static Join, and the shared React customer shell.
- Found the previous fix did not fully apply everywhere:
  - Home used workspace-backed `tradeBoardTickerItems`, but Trade and Join still had older fallback-only ticker payloads.
  - The shared React shell still rendered ticker entries as item title plus MSRP.
  - Static Amethyst HTML still used the older `20260621-ticker-pps` asset query, so browser/CDN cache could keep serving stale ticker code after fixes.
- Shipped `1ed4137 fix: unify customer ticker trade details`.
- Shipped the earlier verified Nic-Nac site-edit continuation fix as `1450d22 fix: route Nic-Nac site edit continuations`.
- Home, Trade, Join, and the shared shell now use the same trade ticker display contract: item name, item type, and collection. MSRP is not rendered in the moving Trade Board ticker.
- Join now receives workspace trade-board listings in its bootstrap payload, so subpages can use the same ticker items as Home/Trade.
- Static asset cache key was bumped to `20260628-universal-ticker` across Home, Trade, Join, Pantry, and Unsubscribe exports.

**Verification:**
- Regression test was first observed failing on the old drift: shared shell still had MSRP and Join still used `TICKER_TRADES`.
- `npm exec vitest run tests/amethyst-homepage-template.test.ts` passed: 32 tests.
- `npm exec vitest run tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts tests/amethyst-static-assets-route.test.ts tests/public-site-slug-route.test.ts` passed: 88 tests.
- `npm exec vitest run tests/nic-nac/tool-routing.test.ts tests/nic-nac/site-customization-tools.test.ts tests/nic-nac/core-tool-policy.test.ts` passed: 69 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Full `npx tsc --noEmit --pretty false` still fails on pre-existing test fixture typing issues unrelated to this patch; production app type-check passed during `next build`.
- Pushed branch `codex/sparkle-cross-phase-hardening` through `1450d22`.
- Vercel preview `https://sparkle-suite-kt9pijhz0-louis-2849s-projects.vercel.app` / deployment `dpl_DyfmwNFVGXiGpa5WUkoWm8pJgAxv` is Ready.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo checks:
  - `/milehighfizz/trade` returned 200 and loaded `20260628-universal-ticker`.
  - Deployed `/amethyst/trade.jsx?v=20260628-universal-ticker` contains `TRADE_TICKER_SPEED_PPS = 55.2`, uses `CONTENT.tradeBoardTickerItems`, renders `name - type - collection`, and no longer contains the old `trade.meta` path.
  - `/api/amethyst/trade-template?publicSiteSlug=milehighfizz` returned 200 and contains `tradeBoardTickerItems`.
  - `/milehighfizz` and `/milehighfizz/join` returned 200 and load `20260628-universal-ticker`.
  - Deployed `/amethyst/join.jsx?v=20260628-universal-ticker` uses `CONTENT.tradeBoardTickerItems`, renders `name - type - collection`, and no longer contains the old `trade.price` path.
  - `/api/amethyst/join-template?publicSiteSlug=milehighfizz` returned 200 and contains `tradeBoardTickerItems`.

**Lesson:**
- A ticker-speed fix is not complete if only one page's ticker payload is updated. The active contract must cover Home, Trade, Join, shared shell, and cache-busted static assets, and the exact stable demo route Louis used must be checked before calling it fixed.
## June 30, 2026 - Optional Revealed Item Capture and Catalog Photo Correction Guard

**What changed:**
- Louis and a BP smoke tester found that the workspace Trade Board `Approve trade` modal forced reps to enter the just-revealed item number during a busy show.
- Shipped `bd935e6 fix: let reps approve trades without revealed item numbers`.
- The modal now labels the field `Revealed item number (optional)` and adds `Approve without item number`.
- The skip path uses the existing fallback approval API instead of the live-show swap capture path and shows: `Trade approved. Add the revealed piece later with Nic-Nac when you are ready.`
- Nic-Nac prompt guidance now mirrors the same busy-show branch: prefer captured live-show swap approval, but use plain `approve_trade` when the rep wants to skip item-number capture and add the revealed piece later.
- Louis also caught a Nic-Nac catalog-photo bug where a label/details image became the canonical shared jewelry photo for ER34579 / The Essential Shine Hoops and Nic-Nac claimed the photo correction tool was unavailable.
- The existing `report_jewelry_catalog_issue` tool was hardened in description/system guidance so Nic-Nac should use it for routine shared catalog photo corrections instead of deflecting to Louis. Canonical photo replacement remains guarded: use only an approved jewelry-front replacement asset, never a label/details/back-of-card photo.

**Verification:**
- Red/green tests covered optional approve UI/source wiring, API fallback approval without `revealedItemNumber`, Nic-Nac prompt guidance, catalog correction tool payloads, and approved canonical photo replacement service behavior.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-trade-requests-route.test.ts tests/nic-nac/report-jewelry-catalog-issue.test.ts tests/nic-nac/system-prompt-add-listing.test.ts tests/nic-nac/system-prompt-post-show.test.ts tests/nic-nac/prompt-routing.test.ts tests/jewelry-catalog-corrections.test.ts tests/nic-nac/add-listing-recovery.test.ts` passed: 8 files, 146 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `bd935e6` to `origin/codex/sparkle-cross-phase-hardening`.
- Vercel preview build passed at `https://sparkle-suite-oefreyqkl-louis-2849s-projects.vercel.app`.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that preview; Vercel inspect confirmed deployment `dpl_9uEjtUMUZsvUMnQwCMoQbbDTbXw9` is Ready.
- Stable demo health checks passed:
  - `/api/prelaunch/health` returned 200.
  - `/api/nic-nac/health` returned 200 with `api_reachable:true`, `db_reachable:true`, and `recent_error_rate:0`.
- DB-backed `npx tsx scripts/smoke-trade-swap.ts` passed all swap assertions and cleaned up its synthetic rows.
- Attempted isolated Playwright reviewer workspace smoke against stable demo, but this repo does not have Playwright installed as a local dependency and `npx` module resolution could not load the browser/test package from a temporary spec. No Louis personal browser/session was used.

**Lesson:**
- Item-number capture during trade approval must remain helpful, not blocking. For busy live-show workflows, reps need a clean approve-now/add-later path.
- Nic-Nac should not tell reps a shared catalog photo correction is unavailable when `report_jewelry_catalog_issue` is active. The safe correction rule is: report/fix the catalog issue through Nic-Nac, but only replace canonical catalog photos with approved jewelry-front assets.

---

## July 1, 2026 - Heather Recipe Nic-Nac Exact Smoke and Pantry Assertion Hardening

**What changed:**
- Louis confirmed Heather's BlingKitchen demo temp password may be used for exact runtime smoke testing while the account is being prepared for beta handoff.
- Hardened `scripts/smoke-nic-nac-recipe-chat.ts` so the BlingKitchen target verifies the real customer Pantry data handoff through `/api/amethyst/pantry-template?c=<repId>&publicSiteSlug=blingkitchen`, not only the first `/blingkitchen/in-the-pantry` HTML shell.
- Added a 30-second retry loop for the Pantry template assertion.
- Added cleanup-on-failure for post-save recipe assertions so smoke recipes are removed even if DB facts, public image fields, or public Pantry visibility checks fail.

**Verification:**
- `npm exec vitest run tests/nic-nac-recipe-builder-smoke-script.test.ts tests/launch-readiness-report-runner.test.ts tests/phase-11-smoke-manifest.test.ts` passed: 3 files, 19 tests.
- Exact Heather stable-demo smoke passed with `--target=bling-kitchen --expect-model`; the smoke logged in as `blingkitchen19@gmail.com`, observed `build_site_recipe_draft` on the draft turn, observed `manage_site_recipes` on save, verified the saved recipe row and public Pantry template, then cleaned up recipe `d7f916dc-835e-4e9b-b1db-e06f7b705e70`.
- The smoke artifact was written to `.local/launch-readiness-results/bling-kitchen-recipe-chat.json`.
- `npm run build` passed locally with Next.js 16.2.1.

**Lesson:**
- For Heather's Pantry, the route HTML is only the shell. Customer-facing recipe visibility must be verified through the Pantry template bootstrap data that hydrates the page.
- Exact beta-account smokes should clean up their created rows on every post-save failure path, not only on full success.

---

## July 1, 2026 - Heather Recipe Workspace Simplified Builder

**What changed:**
- Louis flagged the left-side `Pantry order` panel in Heather's Recipes workspace as unnecessary filler.
- Removed the separate Pantry order/list/reorder UI and its extra `Add recipe` button.
- The Recipes workspace now presents the recipe builder as the main surface. New recipes keep their insertion order, and Heather can use the category field for section placement.
- After saving a brand-new recipe, the builder clears back to a fresh recipe draft so Heather can keep adding recipes without managing a separate order panel.

**Verification:**
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts` passed: 75 tests.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts tests/nic-nac-site-recipes-route.test.ts tests/services/site-recipes.test.ts` passed: 4 files, 93 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `a9a6ec8 fix: simplify Heather recipe builder` to `origin/codex/sparkle-cross-phase-hardening`.
- Vercel preview `https://sparkle-suite-9rk2w8mo8-louis-2849s-projects.vercel.app` / deployment `dpl_BwaFkHKyz5qjYf7fgwmCBVP7CejX` is Ready.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo health checks passed:
  - `/api/prelaunch/health` returned `ok:true`.
  - `/api/nic-nac/health` returned `api_reachable:true`, `db_reachable:true`, and `recent_error_rate:0`.
- A browser-based logged-in reviewer-smoke check was not completed in this environment because Chrome control was not available and the temporary Playwright package import still failed with local module resolution. No Louis personal browser/session was used.

**Lesson:**
- Heather's recipe workflow should stay image-first and simple: title, category/section, photos, recipe-card photos, build/save. Manual pantry ordering is not part of the beta workflow unless Louis asks for it later.

---

## July 1, 2026 - Heather Recipe Header Build Action

**What changed:**
- Louis caught that Heather's Recipes workspace still had two `Save recipe` buttons after the builder simplification.
- Changed the top header action to `Build recipe with Nic-Nac` and left the bottom `Save recipe` action as the only save button.
- Removed the duplicate lower build action so the workspace now has one build button and one save button.

**Verification:**
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts` passed: 75 tests.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts tests/nic-nac-site-recipes-route.test.ts tests/services/site-recipes.test.ts` passed: 4 files, 93 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `9bf9729 fix: make Heather recipe header build action` to `origin/codex/sparkle-cross-phase-hardening`.
- Vercel preview `https://sparkle-suite-ch9tvhk6j-louis-2849s-projects.vercel.app` / deployment `dpl_FfVBoqQwGVcHQ5WH2kGMMkzBYqVQ` is Ready.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo health checks passed:
  - `/api/prelaunch/health` returned `ok:true`.
  - `/api/nic-nac/health` returned `api_reachable:true`, `db_reachable:true`, and `recent_error_rate:0`.

**Lesson:**
- Heather's recipe editor should present one clear next action per stage: build with Nic-Nac from the header, then save from the bottom after the draft looks right.

---

## July 1, 2026 - Heather Manual Recipe Editor Mode

**What changed:**
- Louis asked to remove the bottom `Advanced edit` card because it felt too complicated.
- Replaced the `New Recipe Builder` heading with a mode dropdown.
- The default mode is `New Recipe Builder`, preserving the image-first Nic-Nac recipe flow.
- Added `Manual Edit Recipes` mode with a saved recipe picker, a new manual recipe option, and the compact edit fields needed to update an existing recipe.
- Removed the old advanced-edit UI and related styling.

**Verification:**
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts` passed: 76 tests.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts tests/nic-nac-site-recipes-route.test.ts tests/services/site-recipes.test.ts` passed: 4 files, 94 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `29c506b fix: add manual Heather recipe editor mode` to `origin/codex/sparkle-cross-phase-hardening`.
- Vercel preview `https://sparkle-suite-jil8hru2z-louis-2849s-projects.vercel.app` / deployment `dpl_CBtM7e5WjtimrbY6M7m4k7k9FAas` is Ready.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo health checks passed:
  - `/api/prelaunch/health` returned `ok:true`.
  - `/api/nic-nac/health` returned `api_reachable:true`, `db_reachable:true`, and `recent_error_rate:0`.

**Lesson:**
- Keep Heather's default recipe flow simple and image-led. Put manual correction/editing behind an explicit mode choice with a recipe picker instead of a dense always-visible advanced card.

---

## July 1, 2026 - Heather Recipe Preview Label

**What changed:**
- Louis chose `Recipe Preview` as the clearer label for the old `Nic-Nac draft preview` area in Heather's recipe builder.
- Updated the builder preview card label and matching dashboard test expectations.

**Verification:**
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts` passed: 76 tests.
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-recipe-builder-smoke-script.test.ts tests/nic-nac-site-recipes-route.test.ts tests/services/site-recipes.test.ts` passed: 4 files, 94 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Pushed `8d2cc95 fix: rename Heather recipe preview label` to `origin/codex/sparkle-cross-phase-hardening`.
- Vercel preview `https://sparkle-suite-o1q9tahqu-louis-2849s-projects.vercel.app` / deployment `dpl_GTfzueZQKHuHyDMXGnsUm8fFDRUB` is Ready.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` now points to that deployment.
- Stable demo health checks passed:
  - `/api/prelaunch/health` returned `ok:true`.
  - `/api/nic-nac/health` returned `api_reachable:true`, `db_reachable:true`, and `recent_error_rate:0`.

**Lesson:**
- Heather-facing recipe labels should describe the action/result plainly; `Recipe Preview` is clearer than model/tool-oriented wording.

---

## July 1, 2026 - Moonstone Skin and Heather Standard Public Site

**What changed:**
- Added reusable Moonstone (`moonstone`, `MS-01`) as a generic purple, silver, and charcoal Sparkle Suite skin any rep can choose.
- Returned Heather/BlingKitchen's public Home, Trade, and Join pages to the standard Amethyst-style template structure instead of bespoke kitchen-themed variants.
- Kept Heather's `In the Pantry` link visible on the standard public navigation/footer.
- Updated the Pantry template so it receives and applies the active appearance preset; Heather's Pantry now follows Moonstone today and should follow any other selected skin later.
- Added the Supabase constraint migration for the `moonstone` appearance preset and updated Heather's remote demo setting to Moonstone.

**Verification:**
- `npm exec vitest run tests/amethyst-appearance-presets.test.ts tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts tests/bling-kitchen-public-site.test.ts tests/services/site-settings.test.ts tests/nic-nac/site-customization-tools.test.ts` passed: 7 files, 118 tests.
- `npm exec vitest run tests/amethyst-preview-template-data.test.ts tests/public-site-slug-route.test.ts tests/bling-kitchen-recipes-db-loader.test.ts tests/nic-nac-dashboard-placeholder.test.ts` passed: 4 files, 108 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- `supabase db push` applied migration `20260701150000_ss_add_moonstone_appearance_preset.sql` to the remote project.
- Stable demo alias `https://sparkle-suite-demo.vercel.app` was moved and verified after deployment; future sessions should verify the active alias target in Vercel because deployment ids change on each final deploy.
- Stable health checks passed for `/api/prelaunch/health` and `/api/nic-nac/health`.
- Stable template checks confirmed BlingKitchen homepage uses `preset:"moonstone"`, standard Sparkle Suite hero copy, and `pantryPageUrl:"/blingkitchen/in-the-pantry"`; Pantry template confirmed `appearancePreset:"moonstone"` and `recipeCount:26`.
- Raw `npx tsc --noEmit --pretty false` still fails on unrelated repo-wide test typing issues; the one touched-test type issue it surfaced was fixed, and the production build passed TypeScript.
- No Chrome reviewer-smoke or Louis personal browser/session was used.

**Lesson:**
- Heather's public site should be standard Sparkle Suite with a selectable skin. The only special customer-facing surface is Pantry, and Pantry must inherit the selected skin instead of being manually restyled.

---

## July 1, 2026 - Moonstone Card Readability Audit

**What changed:**
- Louis reported that Moonstone light cards, especially the signup card, had text that was too pale to read.
- Fixed Moonstone's shared `silver-pearl` card rules so light Home, Trade, and Join cards carry dark foreground, muted text, form, border, and placeholder variables inside the card.
- Included the Home About panel and small live-show step tiles after local screenshots showed they were still inheriting the wrong contrast.
- Kept the change visual-only: no Amethyst template fork, no public-site data/link/behavior changes, and Pantry remains on the selected appearance preset.

**Verification:**
- `npm exec vitest run tests/amethyst-homepage-template.test.ts tests/amethyst-trade-template.test.ts tests/amethyst-join-template.test.ts tests/amethyst-appearance-presets.test.ts` passed: 4 files, 84 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Local Playwright screenshots were captured for `/blingkitchen`, `/blingkitchen/trade`, `/blingkitchen/join`, and `/blingkitchen/in-the-pantry`; generated screenshots were removed before commit.

**Lesson:**
- Moonstone has a dark page background with light pearl cards. Card-level CSS variables must flip text and form controls back to dark values inside those light surfaces; page-level Moonstone text should stay light outside cards.

---

## July 1, 2026 - BlingKitchen Public Calendar Restore

**What changed:**
- Restored the customer-facing Live event calendar on Heather's BlingKitchen homepage when no saved upcoming DB calendar rows exist yet.
- Added a BlingKitchen-only safe fallback that generates the next two Monday/Wednesday/Friday 7:00 PM Eastern live reveal cards from Heather's public schedule.
- Kept saved calendar rows authoritative: if Heather has DB-backed upcoming shows, those render instead of the fallback.
- Tightened Moonstone calendar heading contrast after local screenshots showed the restored section title inherited the light-card dark text rule.
- Hid empty Discounts and Featured Collections blocks for simple schedule-only fallback events.

**Verification:**
- `npm exec vitest run tests/amethyst-homepage-upcoming-shows.test.ts tests/bling-kitchen-public-site.test.ts tests/amethyst-homepage-template.test.ts` passed: 3 files, 46 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Local production Playwright screenshot of `/blingkitchen` confirmed the Upcoming Shows calendar appears with two BlingKitchen live reveal cards and readable Moonstone section text.

**Lesson:**
- Targeted sites should not leak generic demo events, but known public schedules can use rep-specific safe fallbacks so key customer-facing sections do not disappear before the rep adds individual calendar rows.

---

## July 1, 2026 - Moonstone Pantry Contrast Fix

**What changed:**
- Louis reported hard-to-read text in Heather's Moonstone Pantry filters and recipe cards.
- Fixed Moonstone Pantry inactive category pills so text uses dark ink on the light pill surface.
- Added card-local dark text variables for Moonstone's light recipe cards and recipe modal.
- Tightened recipe card description, category, meta-chip, modal, and note text colors so light cards no longer inherit the dark-page light text.

**Verification:**
- `npm exec vitest run tests/bling-kitchen-public-site.test.ts tests/bling-kitchen-recipes-db-loader.test.ts tests/amethyst-appearance-presets.test.ts` passed: 3 files, 24 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Local production Playwright screenshots/crops confirmed the Pantry category buttons, recipe descriptions, meta chips, and View Recipe buttons are readable in Moonstone.

**Lesson:**
- Pantry inherits Moonstone's light-on-dark page tokens, so every light recipe surface needs its own dark foreground variables just like Home, Trade, and Join cards.

---

## July 1, 2026 - Open Brain and HQ Closeout

**What changed:**
- Captured Open Brain memory for the July 1 Sparkle Suite closeout: Moonstone deployment status, Heather/BlingKitchen standard-site decision, Moonstone contrast rules, BlingKitchen calendar fallback, and Heather's image-first recipe workflow.
- Updated the repo vault with the latest implementation checkpoint, stable demo target, deployment id, decisions, and open follow-up notes.
- Prepared the HQ handoff so Neon Rabbit HQ has the same work summary, decisions, lessons, and verification pointers without pulling unrelated HQ handoff files into the Sparkle Suite closeout.

**Verification:**
- Open Brain capture calls succeeded for five standalone memories.
- Documentation-only Sparkle Suite changes; no app code changed in this closeout step.

**Lesson:**
- Closeout memory should include the product decision and the verification target together. For Louis review, the stable demo URL plus deployment id matters as much as the commit hash.

---

## July 3, 2026 - Nic-Nac Durable Calendar Tool Context

**What changed:**
- Fixed Nic-Nac's calendar tool routing so active Calendar work is stored as app-owned workflow state by rep and conversation, not inferred only from the latest chat turn.
- Added durable `nic_nac_calendar_workflows` Supabase storage with RLS, prompt/tool-policy retention, and two-hour rolling expiry while reps keep working.
- Calendar tools now remain available through long conversations, corrections, and short replies like "no description"; description is optional for `add_show`.
- Stopped targeted BlingKitchen public pages from masking missing calendar rows with generated fallback events once Supabase resolves the real rep.
- Inserted the real BlingKitchen July 3, 2026 8:00 PM EDT event into `calendar_events` with blank description, TikTok Live, `bling123`, and July Birthday Collection.

**Verification:**
- `supabase db push` applied migration `20260703003209_ss_nic_nac_calendar_workflows.sql` to the linked remote project.
- Focused Nic-Nac/public calendar tests passed: 11 files, 122 tests.
- Route/workflow regression tests passed again after final route cleanup: 6 files, 44 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- Supabase linked smoke confirmed BlingKitchen had zero real calendar rows before the insert and returned event `4cbba9fe-cd32-46df-ad62-24bc7c689894` after the guarded insert.
- Local service smoke against `loadAmethystHomepageUpcomingShows({ publicSiteSlug:'blingkitchen', targeted:true })` returned the real event with description `null`.

**Lesson:**
- Nic-Nac tool availability cannot depend only on the newest message. Any workflow that may span clarifying questions needs durable app-owned state that survives conversational drift.

---

## July 3, 2026 - Nic-Nac Calendar Starter Chip

**What changed:**
- Removed the workspace Nic-Nac quick chips `What's on my board?` and `Remove a listing`.
- Added `Add a Show to the Calendar` beside `Add a piece to Trade Board`.
- Added a routing regression so the new chip opens Calendar tools, including `prepare_calendar_work`, `add_show`, and `list_my_shows`.

**Verification:**
- `npm exec vitest run tests/nic-nac-branding.test.ts tests/nic-nac/tool-routing.test.ts tests/reviewer-smoke-ui.test.ts` passed: 3 files, 82 tests.
- `npm run build` passed locally with Next.js 16.2.1.

---

## July 3, 2026 - Calendar Add-Show Replay Follow-Up

**What changed:**
- Louis found the Calendar quick chip still failed on the real path: Nic-Nac gathered `Tiktok July 4 7p Est` and `Bling party and 3 hrs`, then said he could not write to the calendar.
- Root cause: the durable Calendar workflow kept Calendar tools available, but workflow state did not parse `7p Est`, `3 hrs`, or a plain title like `Bling party`; the route also did not force `add_show` once Calendar workflow state was ready.
- Fixed Calendar workflow extraction for month/day/time shorthand, Eastern timezone, `hrs`, and plain title + duration follow-ups.
- Updated tool choice so an active ready Calendar workflow pins the next model step to `add_show`.
- Tightened add-show readiness so title and duration are required before writing, preventing the first partial detail turn from saving a default/recurring show.
- Prompt now explicitly forbids inferring recurrence unless the rep asks for a recurring/repeating series.
- Added an `add_show` tool-boundary guard: when an active Calendar workflow did not capture recurrence, model-invented `recurring` input is stripped before writing.
- Added workflow parsing for explicit daily/weekly recurring language so real recurring requests remain supported.
- Added the calendar write-abdication phrase to Nic-Nac hard-fail telemetry.

**Verification:**
- Red/green tests reproduced the exact replay and now prove it reaches `ready_to_add` with `eventTime`, `timeZone`, `durationMinutes`, title, and forced `add_show`.
- Stable-demo reviewer smoke caught premature recurring event creation after the first partial details turn; synthetic rows were deleted from the reviewer account before closeout. A follow-up DB check confirmed zero residual bad smoke events.
- Focused calendar/Nic-Nac suite passed: `npm exec vitest run tests/nic-nac/calendar-workflow-controller.test.ts tests/nic-nac/calendar-workflow-context.test.ts tests/nic-nac/calendar-workflow-store.test.ts tests/nic-nac/calendar-work-preflight.test.ts tests/nic-nac/calendar-tools.test.ts tests/nic-nac/calendar-chaotic-rep-smoke.test.ts tests/nic-nac/nic-nac-calendar-route-routing-smoke.test.ts tests/nic-nac/tool-choice-policy.test.ts tests/nic-nac/tool-routing.test.ts tests/nic-nac/trade-board-intake-eval.test.ts tests/nic-nac/prompt-routing.test.ts` passed: 11 files, 131 tests.
- `npm run build` passed locally with Next.js 16.2.1.

---

## July 3, 2026 - Nic-Nac Calendar Pressure Smoke and Approval Resume Fix

**What changed:**
- Added `smoke:nic-nac:calendar-pressure`, a stable-demo synthetic reviewer smoke that creates multiple one-time shows, a 13-occurrence weekly series, multiple discount codes, multiple featured collections, public-site visibility checks, update, one-time cancellation approval, recurring-series cancellation approval, and cleanup.
- Fixed one-time cancellation routing so "cancel the one-time show titled..." routes to `cancel_show`, not `skip_show_occurrence`.
- Hardened HITL continuation history so stale output-less approvals are not fed back to the model on later turns.
- Added a server-owned approval continuation path for local Nic-Nac tools: approved write tools now execute, checkpoint `output-available`, and stream a concise confirmation without relying on another model step.

**Verification:**
- Focused HITL/calendar tests passed after the history hardening: 4 files, 45 tests.
- Broad Nic-Nac suite passed after the final approval route fix: 121 files passed, 1 skipped; 879 tests passed, 1 skipped.
- `npm run build` passed locally with Next.js 16.2.1 after both fix passes.
- Stable demo alias now points to final branch-tip deployment `dpl_Ga11xmQy84ZfSTRPj6UKpgrCi359` / `https://sparkle-suite-l7s02a2m3-louis-2849s-projects.vercel.app`.
- Final stable-demo pressure smoke passed with conversation `87cc6a66-4e13-4d81-a890-acda32860112`, run tag `0703135901`, 15 synthetic event rows created/verified/cancelled/deleted, and zero residual `Codex Pressure%` calendar rows.

**Lesson:**
- Approval-gated writes should be treated as app-owned workflow state. Recording an approval click is not enough; the server must durably prove the tool result or keep the previous assistant row intact.

---

## July 3, 2026 - Rep Workspace Calendar Refresh and Details

**What changed:**
- Fixed Nic-Nac workspace refresh events so successful calendar write tools (`add_show`, `update_show`, `cancel_show`, recurring-series tools, and live-show status tools) dispatch a `calendar` refresh topic.
- Updated the rep workspace listener to refetch the Calendar card after calendar mutations and refresh the live-site preview iframe when public calendar details change.
- Increased the workspace calendar summary request from 8 upcoming shows to 60 upcoming shows so recurring-heavy schedules do not hide later visible-month events.
- Made workspace calendar event pills and the Next up / Recently wrapped rows clickable.
- Added an in-workspace event details dialog showing title, status, platform, local date/time, end time, duration, timezone, recurrence, discount codes, featured collections, and description state.

**Verification:**
- `npm exec vitest run tests/nic-nac-workspace-refresh-events.test.ts tests/nic-nac-dashboard-placeholder.test.ts tests/nic-nac-calendar-summary-route.test.ts` passed: 3 files, 111 tests.
- `npm run build` passed locally with Next.js 16.2.1.
- `npx tsc --noEmit --pretty false` was attempted but timed out after surfacing unrelated pre-existing test typing errors; the production Next build type check passed.

---

## July 3, 2026 - Workspace Calendar Espresso Card

**What changed:**
- Changed the rep workspace Calendar card shell to the Sparkle Suite espresso gradient (`#402924` to `#36221d`) for all current and future workspace skins.
- Added Calendar-specific header/month label/tag color overrides so the darker shell remains readable while the inner calendar grid and event panels stay light.
- Prevented the Black Diamond skin override from replacing the Calendar card back to its darker black surface.

**Verification:**
- `npm exec vitest run tests/nic-nac-dashboard-placeholder.test.ts` passed: 1 file, 85 tests.
- `npm run build` passed locally with Next.js 16.2.1.

---

## July 31, 2026 - Workspace Account Menu and Preview Cleanup

**What changed:**
- Replaced the static workspace profile display with an account menu that provides a Supabase-backed `Log out` action and returns the user to the public landing page after sign-out.
- Removed the top-header `Preview site` action.
- Removed the Nic-Nac home rail's `Public Site` / `Sparkle with us.` preview card.
- Renamed the left workspace summary panel from `Today` to `Trade Info`; the chat timeline's date marker remains `Today`.
- Kept the account menu accessible on mobile while hiding only the long profile text.

**Verification:**
- Focused workspace and reviewer-smoke tests passed, including the 93-test dashboard placeholder suite after the `Trade Info` label update.
- `npm run build` passed with the active-branch safety gate, Next.js 16.2.1 production compilation, and TypeScript validation.

---

## July 31, 2026 - Tools Tab and Collection Intake Recovery

**Recovered evidence:**
- Audited preserved commits `90dda81f` and `0fda2b47`; both contained the same Collection Intake placeholder entry and were not merged.
- Read the exact detached-worktree preservation archive at `.local/git-backups/2026-07-31-branch-containment/c385-uncommitted-demo-files.zip`, including the Collection Intake component, responsive styling, route, and regression test.

**What changed:**
- Renamed the primary workspace `More` tab to `Tools`.
- Added Collection Intake as a first-class Tools destination.
- Adapted the preserved folder-first workflow into the live workspace with a real image-folder picker, capture-order instructions, Nic-Nac-assisted local triage, review queues, required collection handling for board-only pieces, and explicit catalog safeguards.
- Kept this initial workflow local-only: it does not write inventory, Trade Board listings, or shared catalog records.
- Loaded the Collection Intake client component dynamically so the larger workflow bundle is deferred until opened.

**Verification:**
- Focused Collection Intake, dashboard, and reviewer-smoke tests passed: 3 files, 113 tests.
- `npm run build` passed with the active-branch safety gate, Next.js 16.2.1 production compilation, and TypeScript validation.
- Local Browser QA reached the app but stalled at the setup-loading boundary before reviewer state resolved; no production or personal account was used as a fallback.
# August 4, 2026 - Nic-Nac, Brianna, and public landing continuation

## Completed

- Restored the intended centered Nic-Nac experience after a rejected side-panel redesign; added the compact new-chat/refresh control beside the heading.
- Re-enabled email-password sign-in in the authentication provider after production showed Email logins are disabled.
- Reset the approved disposable demo-account password through the supported administrative path and verified a sign-in/sign-out. No secrets are stored here.
- Configured Brianna Williams / Bri's Glowtique's grandfathered Stripe handoff ($39/month, no build fee), then simplified the account screen so Stripe remains the system of record for payments. Shared billing CTA wording is Stripe Billing and Payments; the header notifications control was removed.
- Confirmed apparent old UI came from the legacy sparkle-suite-demo.vercel.app deployment rather than the live customer surface. The only normal review URL is https://www.yoursparklesuite.com.
- Reworked the public landing proof using Louis-provided screenshots: Trade Board hero proof; Nic-Nac workspace proof in the Rep Workspace section; and three varied customer-site screenshots in a dedicated customization section. Iterated the screenshot deck from an overlaid stack to an intentionally open vertical cascade so all three hero treatments are legible.

## Validation and release notes

- Focused landing tests passed on each landing change (22 tests), and each production build passed. Local desktop screenshots were inspected for the relevant layout iterations.
- Commits through this session's latest pushed landing adjustment: 3881da55 fix: reveal customer site proof heroes.
- Production release verification must continue to use the exact live domain and both aliases. Authenticated reviewer smoke remains blocked by the known too-short reviewer token; do not bypass it with Louis's personal account.

---

# August 8, 2026 - Customer Operations, Domains, and Heather Onboarding

## Completed

- Added the Control Center Customer Waitlist: landing-page signups and manual records are combined with operator notes, an account-activated tracker, and a clear two-click delete. Delete now removes the selected waitlist row from Supabase while preserving/unlinking historical launch-build and agreement records. The earlier failure came from archived-source constraints on those historical records; two migrations corrected the valid archival state. No real row was removed during implementation.
- Added Customer List as a separate working Tools item while restoring Messages as its own `Coming soon` item. Customer List supports editable profile data and CSV/XLSX import, matches only within the authenticated rep by email/phone, preserves omitted values, skips ambiguous matches, and never creates email/SMS marketing consent.
- Corrected Bri's custom-domain routing after an initial wrong-tenant result: `brisglowtique.com` is now scoped to Brianna's real public site. Added the reusable per-domain favicon/social-preview approach and Bri's approved dark-background white cursive `B` mark. Customer-site footer Contact was removed and FAQ is an honest non-interactive `Coming soon` label.
- Repaired standard customer-site empty media cards. Unused TikTok/video/image slots retain their designed dimensions and display `Coming soon` rather than collapsing or bleeding into the adjacent content.
- Connected `theblingkitchen.com` to Heather's public BlingKitchen site and applied her purple `B` customer-site brand asset treatment.
- Simplified Heather's Pantry recipe intake and released `e70a6029 feat: simplify BlingKitchen recipe intake`. The editor presents a direct tool, removes the `Let Nic-Nac choose` category, collects an outside and inside customer-facing food photo, accepts multiple private recipe-source photos, and offers `Read and format recipe` before Heather reviews/saves the result. The UI copy explicitly says source photos are private.
- Updated Heather's unlisted welcome page with that exact recipe workflow and republished it at `https://heather-blingkitchen-welcome.louis526569.chatgpt.site`. Located the existing Heather welcome draft in the Chrome Gmail session signed in as `louis@neonrabbit.net`, updated its customer-site/welcome links and Pantry explanation, and saved it without sending. Credentials remain represented only by a placeholder.

## Validation and operational lessons

- The focused `tests/nic-nac-dashboard-placeholder.test.ts` suite passed 101 tests and the production build passed for `e70a6029`. The exact production deployment is `dpl_BEsTfA2TMeCzvdQT5kCzDPrtzZ4x`; both Sparkle Suite production domains and `theblingkitchen.com` resolve to it.
- Inspect layered/empty media in a rendered desktop view before release. A component can be technically present but still look merged when an empty card loses its reserved surface.
- Domain routing must be verified against the rep's actual content after DNS attachment, not just DNS/alias readiness. An apparently successful custom-domain attach can expose a prior tenant mapping.
- For customer imports, duplicate prevention must be rep-scoped and conservative. Match certain email/phone identifiers; never guess across ambiguous identities, and never treat profile import as marketing consent.
- Use the Chrome Gmail session only after confirming the active account in the visible UI. The separate Gmail connector remained attached to a different account and was not used for Heather's draft.
- The known reviewer-token length defect still blocks authenticated synthetic browser smoke. Record it, use the non-personal/production-safe checks available, and do not bypass it through Louis's personal admin account.

---

# August 9, 2026 - Customer-site readability and custom-domain rendering repair

## Completed

- Replaced the customer-site's hard-coded light foreground assumptions with per-skin semantic foreground tokens across all 11 selectable appearance presets. Join final-card copy, icon tiles, shared customer actions, Trade request actions, active filters, and the expanded Trade collection search now remain readable on their rendered surfaces.
- Added a regression contract that requires every skin to supply card/final/action foreground tokens and verifies that the shared Homepage, Join, and Trade controls consume them.
- Added the missing Fontshare families for the configured Boska, Switzer, Melodrama, Sharpie, and Ranade typography choices.
- Repaired custom-domain server rendering: the proxy now carries the verified original customer domain through the internal rewrite, server metadata/template bootstraps use that resolved tenant, and caller-supplied internal routing headers are stripped before routing. This corrects the observed `theblingkitchen.com` Sasha/default HTML fallback while retaining the existing Heather tenant data.

## Validation

- Focused contrast and custom-domain tests passed: 5 files, 35 tests.
- `npm run qa:amethyst` template tests passed (73 tests); its local URL link probes were skipped/fail-soft because no local server was running.
- `npm run build` passed the active-branch guard, TypeScript validation, and production compilation.
- Authenticated reviewer-browser smoke remains blocked by the known too-short reviewer-token configuration. It was not bypassed with Louis's personal account.

---

# August 9, 2026 - Control Center and Stripe Billing Completion

## Completed

- Added the private Control Center **Bug Hunt and Updates** tracker and loaded the Heather onboarding follow-ups. It supports task status, ownership, notes, and type. Completion archives a task instead of deleting it; the archive is visible at the bottom of the panel and can restore a task to active work.
- Decoupled Control Center access from a signed-in Sparkle Suite rep account. Operators use its independent login/session, and protected Control Center API routes receive that session correctly. Legacy sessions refresh safely.
- Improved Control Center readability in both color modes and added compact/collapsible section behavior so operators can work without multiple large panels open at once.
- Audited all 11 customer-site appearance presets across Home, Trade, and Join. Released semantic foreground tokens and targeted fixes for contrast-sensitive Join cards, action/icon gradients, Trade controls, filters, and collection search. Added the missing configured Fontshare families.
- Repaired custom-domain server rendering by forwarding a validated original customer host through the internal proxy rewrite. `theblingkitchen.com` now renders Heather/BlingKitchen in SSR metadata and template bootstrap instead of Sasha/default content.
- Inspected the authorized Stripe dashboard and verified Heather M. Daugherty's exact existing Stripe customer, active grandfathered $39/month subscription, and successful payments. Linked only that verified customer/subscription to Heather's exact Sparkle Suite account. No payment, subscription, or Stripe provider object was created or changed.
- Corrected the earlier payment-link misstep: Heather has no grandfathered checkout fallback. Her active account uses the Stripe Customer Portal via the shared **Stripe Billing and Payments** action.
- Made the shared workspace billing contract explicit for every current and future account: Sparkle Suite does not show subscription/card details, invoices, billing history, cancellation controls, SMS wallet, or auto-recharge. Stripe owns those operations; paid accounts receive the portal action and unpaid accounts receive Stripe Checkout.
- Hid the SMS/mobile wallet and stopped its workspace fetch until the texting/email product actually launches. Messages remains a distinct `Coming soon` tool.

## Verification and lessons

- Control Center work was released through commits `45041527`, `83cf5aa5`, `3b6d72db`, `726ba2c9`, `2acbe2de`, `706fd5cf`, and `ce700836`.
- Customer-site contrast/domain work released through `d55d6e51` and `c418025b`; billing/workspace releases were `e11a741b`, `4112ff50`, `071de686`, and `3f82e581`. Current production deployment is `dpl_2irAn65qi1Jg8JNFoWWQyhXfEX7A` from `3f82e581`.
- Focused suites passed for the relevant changes, including 128 billing/workspace tests for the final Stripe-only Account view. Each release passed `npm run build` and live alias checks for `www.yoursparklesuite.com`, the apex redirect, and `theblingkitchen.com`.
- Do not infer or attach a Stripe payer from incomplete application data. Verify the exact customer/subscription in the authorized Stripe account first, then use identity-guarded production updates. Local sandbox Stripe credentials can point to a different account from the production payer account; never use that mismatch as proof that a live payer does not exist.
- A visual reviewer smoke is still blocked by the known reviewer-token length configuration. Do not substitute Louis's personal account. Use focused tests, production health/alias checks, and an authorized external provider dashboard where applicable; record the visual limitation honestly.

---

# August 16, 2026 - Customer Custom-Domain Navigation Repair

## Completed

- Custom-domain customer pages now generate root-relative internal navigation for Home, Trade Board, Join Team, Pantry, and homepage collection links. The browser therefore stays on the configured customer hostname rather than navigating to `www.yoursparklesuite.com/{slug}/...` or an `/amethyst/*.html` path.
- The template APIs now retain the validated request custom domain as the navigation authority even when the internal `c` query parameter is needed to identify the rep. This separates private tenant lookup from the public URL visitors see.
- Heather/BlingKitchen is the first live proof: Home, Trade Board, Join Team, and In the Pantry all remain under `https://theblingkitchen.com`.

## Verification and release

- Focused custom-domain route/link tests passed: 25 tests across four files. `npm run build` passed with the active-branch safety gate and Next.js production compilation.
- Application commits `a24bc545 fix: keep customer subpages on custom domains` and `f3f27d69 fix: preserve custom-domain navigation targets` are deployed in production as `dpl_6jf82p7d8GEeVTKHmdj9TDS1NSf9`.
- Vercel assigned `www.yoursparklesuite.com`, `yoursparklesuite.com`, `theblingkitchen.com`, `www.theblingkitchen.com`, and Bri's custom-domain aliases to that exact deployment.
- An unauthenticated Codex-browser smoke verified Heather’s live Home, `/trade`, `/join`, and `/in-the-pantry` pages and their internal customer navigation. No Workspace or Control Center account was used.

---

# August 16, 2026 - Nic-Nac Conversation Control Simplification

## Completed

- Replaced the workspace home’s refresh and plus icons with one clearly labeled **Clear conversation** control. It invokes the existing safe new-conversation rollover, clearing the current chat to begin a new conversation.
- Removed only the redundant manual refresh signal. Nic-Nac still refreshes conversation content passively on focus, connectivity, and page visibility changes.
- Applied the same single-control treatment to the compact Nic-Nac header and made its control a readable text pill.
- Personalized the workspace greeting from the rep profile: `Hi {rep name}, how can I help you today?`.

## Verification and release

- Focused workspace/Nic-Nac coverage passed: 119 tests across `nic-nac-workspace-shell`, `nic-nac-branding`, and `nic-nac-dashboard-placeholder`. `npm run build` passed including the allowlisted-branch guard.
- Released commit `b0f5c1d2 fix: simplify Nic-Nac conversation controls` to production deployment `dpl_392QjSeTYmG7wCio8saGH7ksGgez` (`https://sparkle-suite-orfl311rg-louis-2849s-projects.vercel.app`). Vercel confirmed both `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com` resolve to that deployment.
- Browser reviewer smoke could not visually verify the authenticated workspace: `/start` redirected to the prelaunch page with no reviewer-smoke controls, and a workspace session was already authenticated. This was not bypassed with Louis’s or Heather’s account; the known reviewer-token configuration remains the blocker.

---

# August 16, 2026 - Durable Nic-Nac Conversation Clearing

## Completed and released

- Fixed the clear-conversation lifecycle defect: the former control only created a new browser-local conversation ID, while the server still selected the prior persisted thread on a later visit.
- Clear now writes a durable `cleared_at` marker to all message rows belonging to the authenticated rep's current conversation. The update is rep-scoped and retains the rows for audit continuity rather than deleting messages.
- Latest-conversation selection only considers rows whose `cleared_at` is null. Hydration also returns no messages for a cleared historical URL, preventing bookmarked or stale browser URLs from reviving cleared content.
- Production schema migration `20260816154000_nic_nac_clear_conversations.sql` was applied before deploying application code. It adds the marker and a partial active-thread lookup index.

## Validation

- Focused persistence, workspace-shell, paid-route boundary, and HITL coverage passed: 4 files, 37 tests.
- `npm run build` completed production compilation after the allowlisted-branch guard. A direct repository-wide `tsc` invocation remains red on pre-existing test-fixture typing errors unrelated to this change.
- Released application commit `20456551 fix: persist Nic-Nac conversation clearing` as Vercel production deployment `dpl_EjE7aHumdvzWsfy5FJ7epz44PSGq`. Vercel assigned both `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com` to that deployment. No-account checks confirmed the canonical `/nic-nac` path returns 200, the apex produces its canonical 307 redirect, and `POST /api/nic-nac/conversation/clear` correctly returns 401 when no session is supplied.
- The authenticated reviewer-browser flow remains blocked by the known too-short reviewer-token configuration. Do not use Louis's or a customer account to work around it.

---

# August 16, 2026 - Desktop Site Settings Media Stack

## Completed and released

- Reworked the shared **Homepage photos and videos** form so the About portrait photo occupies the left desktop column and all four video destinations occupy one right-side stack: Showcase video, About short video 1, About short video 2, and About short video 3.
- The grouping uses explicit media-role classes rather than positional selectors, preserving the correct layout if slot order changes. Tablet/mobile remains one column.

## Validation

- Focused Site Settings and workspace coverage passed: 2 files, 109 tests.
- `npm run build` completed production compilation after the allowlisted-branch safety guard.
- Released application commit `6dec7f2f fix: group site video controls on desktop` as Vercel production deployment `dpl_CDRXgMMkSZgJfQraBY67W8fktU67`. Both Sparkle Suite domains are assigned to that deployment; the canonical live Site Settings URL returned 200 and the apex produced the expected 307 canonical redirect.
- Reviewer-browser visual smoke remains blocked by the known too-short reviewer-token configuration. No Louis or customer session was used as a workaround.

---

# August 16, 2026 - Four-Provider Customer Video Support

## Completed and released

- Expanded shared customer-site video rendering from TikTok/YouTube-only to four explicit providers: TikTok, YouTube, Instagram Reels/video posts, and Facebook Reels/videos. The same renderer is used for Showcase and all three About short-video slots, so current and future Sparkle Suite sites share the support.
- TikTok and YouTube now auto-play muted, loop, and expose no pause control; TikTok no longer sends an offscreen pause command. Instagram and Facebook use their native player URLs and controls; no unsupported cross-origin player command is claimed.
- Site Settings now uses one concise **Video link or embed** label for each video field and one expandable **Video help: links and embeds** panel describing all providers, accepted input, and provider playback behavior.
- Reject unsupported video-host links at save time instead of storing a link that would render as an empty slot.

## Validation

- Focused public template, Site Settings, media-validation, and Help suites passed: 4 files, 180 tests.
- `npm run build` completed production compilation after the allowlisted-branch safety guard.
- Released application commit `eed217d1 feat: support social short video embeds` as Vercel production deployment `dpl_9HgGBM56eLRfa543qWXvhwtJvRn1`. Both Sparkle Suite domains are assigned to that deployment; the canonical Site Settings route and the live BlingKitchen customer page both returned 200, and the apex Site Settings URL returned the expected 307 canonical redirect.
- Reviewer-browser visual smoke remains blocked by the known too-short reviewer-token configuration. No Louis or customer session was used as a workaround.

---

# August 16, 2026 - In-Stack Video Help Placement

## Completed and released

- Moved the **Video help: links and embeds** disclosure from a full-width row into the desktop right-side media stack, directly above **Showcase video**.
- The left portrait now spans the compact help card plus all four video-control rows; video cards use tighter padding and gaps so the two columns read as one balanced media editor. The one-column responsive order remains intact.

## Validation

- Focused Site Settings, public customer-video template, and media service suites passed: 3 files, 160 tests.
- `npm run build` completed production compilation after the allowlisted-branch safety guard.
- Released application commit `1ba3bbd9 fix: stack video help with media controls` as Vercel production deployment `dpl_Dj3Kzq3x3LuKX9dhdiwhb35NKWuW`. Both Sparkle Suite domains are assigned to that deployment; the canonical Site Settings route returned 200 and the apex returned the expected 307 canonical redirect.
- Reviewer-browser visual smoke remains blocked by the known too-short reviewer-token configuration. No Louis or customer session was used as a workaround.

---

# August 16, 2026 - Always-Visible Video Instructions

## Completed and released

- Replaced the expandable **Video help: links and embeds** disclosure with a permanent compact **Video links and embeds** card. It remains at the top of the right-side stack but no longer uses a summary, chevron, maximize/minimize behavior, or hidden instructions.

## Validation

- Focused Site Settings, public customer-video template, and media service suites passed: 3 files, 160 tests. The rendered Site Settings contract explicitly asserts that no `<summary>` element is emitted.
- `npm run build` completed production compilation after the allowlisted-branch safety guard.
- Released application commit `7dfabc06 fix: keep video instructions visible` as Vercel production deployment `dpl_EkAT2DMHngRMwR6zJSGMj5bAuwdB`. Both Sparkle Suite domains are assigned to that deployment; the canonical Site Settings route returned 200 and the apex returned the expected 307 canonical redirect.
- Reviewer-browser visual smoke remains blocked by the known too-short reviewer-token configuration. No Louis or customer session was used as a workaround.

---

# August 16, 2026 - Session Closeout: Nic-Nac Durability and Shared Customer Media

## Delivered during this workstream

- Nic-Nac now has one readable **Clear conversation** control and a personalized rep greeting. The clear operation is durable: it marks the authenticated rep's conversation as cleared, excludes it from latest-thread lookup and hydration, and keeps its rows only for audit continuity. Application release `20456551` is production deployment `dpl_EjE7aHumdvzWsfy5FJ7epz44PSGq`.
- Shared customer-site About media was made reusable rather than Heather-specific: portrait framing is stored as focus/zoom data with automatic face-detection initialization and manual adjustment, the public card has one clean image edge, and supplied photos are not forced into an empty mat or arbitrary crop.
- Site Settings now expresses the desktop media hierarchy directly: About portrait on the left; a compact, permanently visible **Video links and embeds** instruction card followed by Showcase and About short videos 1–3 on the right. The role-based layout falls back to one column on narrow screens.
- The shared customer renderer and save validation support public TikTok, YouTube, Instagram Reel/video-post, and Facebook Reel/video links or official embeds. TikTok and YouTube use the controlled muted-loop/no-host-pause contract; Instagram and Facebook intentionally retain native provider controls. The final visible-help application release is `7dfabc06`, production deployment `dpl_EkAT2DMHngRMwR6zJSGMj5bAuwdB`.

## Lessons retained

- Treat conversation clearing as a persistence lifecycle, not a client-side ID change; stale URLs must not resurrect a cleared thread.
- Treat responsive media layout as named slot roles, not card order or tenant-specific CSS.
- Validate a narrow provider allowlist before save, and describe cross-origin playback capabilities honestly instead of masking provider controls with fragile overlays.
- Keep concise instructions visible when the task requires a reference card; an expandable disclosure hid necessary context and introduced needless UI chrome.

## Evidence and remaining safe review

- Focused suites and production builds passed for each release. Public live checks confirmed canonical Sparkle Suite routes and public BlingKitchen rendering where applicable. Individual release entries above retain exact test counts, commits, deployment IDs, and domain checks.
- The authenticated reviewer-browser path remains blocked by the known too-short reviewer token. No Louis or customer account was used to bypass it. The outstanding synthetic acceptance items are tracked in Open Items.

---

# August 16, 2026 - Manual Vercel Release Policy

## What changed

- At Louis's direction, disabled Vercel Git deployment creation for project `sparkle-suite` (`gitProviderOptions.createDeployments: disabled`). The GitHub link to `louis623/sparkle-suite` and configured production branch `codex/nic-nac-trade-hardening` remain unchanged.
- Future pushes are source/provenance updates only. An approved application release now requires one explicit manual Vercel production deployment of the exact tested branch tip, then normal Sparkle Suite domain and workflow verification.

## Verification and operational effect

- Verified via the Vercel project API that automatic creation is disabled and the existing Git link/production branch remain intact. No aliases were moved and no deployment was created for this configuration change.
- The current direct production deploy limit remains `api-deployments-free-per-day`; the pushed recipe unsaved-change guard `c3e6a282` stays pending capacity. Disabling Git-triggered builds prevents future ordinary pushes, including Open Brain documentation commits, from spending that quota.

---

# August 17, 2026 - Recipe editor safety follow-up released manually

## Release

- Vercel capacity was available again, so the pending unsaved-edit guard was released with one deliberate manual production deployment of exact branch tip `27e62249` (including application commit `c3e6a282 fix: guard unsaved recipe edits`).
- Deployment `dpl_36ubbhUBQf2WqvcyiSTh8TAsYBcw` / `https://sparkle-suite-eziqsw5mq-louis-2849s-projects.vercel.app` is Ready and owns `www.yoursparklesuite.com`, `yoursparklesuite.com`, `theblingkitchen.com`, `www.theblingkitchen.com`, `brisglowtique.com`, and `www.brisglowtique.com`.

## Verification

- Focused recipe coverage passed: 3 files, 116 tests. The local production build and Vercel production build both passed.
- The exact live `https://www.yoursparklesuite.com/nic-nac?section=recipes` route returned 200. The apex produced the expected canonical 307 redirect, and `https://theblingkitchen.com/` returned 200.
- Authenticated visual acceptance remains blocked by the known too-short reviewer-token configuration. No Louis or customer account/session was used to work around it.

---

# August 17, 2026 - Session Closeout: ticker, shared site recovery, recipes, and release discipline

## Delivered

- Reworded the formerly unclear Join control to clearly describe the public **Join My Team** recruiting page. Kept the announcement ticker as its own clearly named customer-facing control.
- Turned ticker composition into a visible, low-friction workflow: an emoji picker; a link builder with URL validation; exact-word link selection; and a recovery action for accidental all-message links. Public Homepage, Trade, and Join renderers preserve non-linked text and link only the selected segment.
- Diagnosed the blank customer-site previews as a shared homepage renderer compilation failure rather than a Heather/Brittany problem. Repaired the mismatched JSX and cache-busted the script so old browser assets could not preserve the failure. Checked both representative slug routes and Heather's custom domain.
- Simplified and hardened recipe editing without deleting any recipes: redundant navigation removed, direct edit actions retained, recipe-source photos persisted, destructive removal gained a second confirmation, and unsaved work gained an explicit keep-editing/discard choice.
- Moved release execution to manual-only Vercel deployments. After capacity returned, manually released the complete recipe safety tip as `dpl_36ubbhUBQf2WqvcyiSTh8TAsYBcw`; local/Vercel builds and the focused 116-test recipe suite passed, and live canonical/apex/customer-domain checks passed.

## Reusable lessons

- If a rep must ask what a setting means, the label is not finished; describe the public result, not an internal implementation term.
- For content tools, user-friendly controls must prevent malformed content by construction and offer a safe repair path for legacy content.
- A failure reported on multiple tenant sites calls for system-level diagnosis and cache-aware verification, even if one customer first reports it.
- Content-management hardening should protect stored customer content and unfinished work; it is not authorization to delete or silently reset records.
- Git history and production promotion are distinct operations. Manual deployment removes duplicate automated builds, but production provenance, aliases, and live-path verification remain mandatory.

## Known verification boundary

- The supported authenticated reviewer flow remains unavailable because of the known too-short reviewer-token configuration. No Louis or customer account was used as a substitute; the outstanding visual acceptance remains explicitly tracked as a platform limitation.

---

# August 17, 2026 - BlingKitchen Pantry category consolidation

## Request and resolution

- Louis requested that the `Desserts` category be removed in favor of one `Baking & Sweets` category covering desserts, baked goods, and sweets.
- During the release check, the earlier report that Peanut Butter Cookies did not appear was traced to a category-rendering omission. The record was already saved and public, but the Pantry All view had only fixed category groups and excluded legacy `Dessert`.
- Consolidated the category end-to-end and added a public ungrouped-recipe fallback. Updated only Heather/BlingKitchen rows in the two legacy categories (14 records), preserving recipe body content and public flags.

## Release evidence

- Application commits: `e451bffe feat: consolidate Pantry baking categories`, followed by `80185d3c fix: type recipe category normalization` after Vercel exposed a narrow TypeScript `unknown` normalization error. The failed deployment `dpl_7WmjvYXPZubjUoMcKGhChvZgX4mx` never received aliases.
- Final manual production deployment: `dpl_8DG2YAcoerFtpYsUMqtDYh5BvcQU`, Ready, exact application tip `80185d3c`.
- Focused coverage: 4 files, 124 passing tests (`bling-kitchen-public-site`, recipe draft builder, site-recipes service, and Nic-Nac dashboard placeholder).
- Live no-auth verification: `www.yoursparklesuite.com/blingkitchen/in-the-pantry` returned 200 with `pantry.jsx?v=20260817-baking-and-sweets`; its bootstrap data contained `Bakery Style Thick Peanut Butter Cookies` and `Baking & Sweets`, with no `Dessert`. `theblingkitchen.com/in-the-pantry` returned 200; the Sparkle Suite apex canonicalized to www with 307.
- The authenticated reviewer-browser path remains intentionally untested because its token configuration is still too short. No browser tabs were closed and no Louis/customer account was used.

---

# August 17, 2026 - Recipe save action moved to header

- Louis requested that the save control in both recipe creation and current-recipe editing be moved beside the recipe-reading control and clearly identify that it publishes the recipe.
- Replaced the two mode-specific bottom buttons with one mode-aware top action: **Save to live site**, immediately after **Read and format recipe** in the builder and **Read source photos and replace details** in the editor. The handler and disabled/pending guard are the existing `onSave` contract; only placement and wording changed.
- Commit `62263b35` passed `tests/nic-nac-dashboard-placeholder.test.ts` (105 tests) and the local production build. Manual production deployment `dpl_J7VDyXPynjJntQtX5Kn95QABA3qW` passed the Vercel build and owns www, apex, and active customer domains. No-auth live checks: canonical recipe route 200, apex 307 to canonical, BlingKitchen Pantry 200.
- Authenticated visual reviewer smoke is still blocked by the known too-short reviewer token. No personal or customer session and no existing browser tab was used as a workaround.
- Note: Git push unexpectedly spawned `dpl_9Q6b18uhJiLEog9UASNBALx75W8W` from commit `62263b3`, even though automatic Vercel Git deployment creation is documented as disabled. It remained unaliased; preserve this evidence and audit the setting separately.
- The follow-up documentation push then queued another Git-created production deployment (`sparkle-suite-g2edlg0xp-louis-2849s-projects.vercel.app`), confirming this is not a one-off. It was removed before it built or received aliases; do not treat documentation pushes as releases.

---

# August 17, 2026 - Git deployment creation repaired

- Audit in the user-opened GitHub/Vercel tabs confirmed the repository branch is correct. The Vercel UI/history showed paired deployments for the same SHA: one manual (`louis-2849`) and one GitHub-sourced (`github/louis623`).
- The project API retained `gitProviderOptions.createDeployments: "disabled"`, but Vercel's current configuration contract uses `git.deploymentEnabled`. Added `"git": { "deploymentEnabled": false }` to the existing root `vercel.json` to disable Git-triggered deployments on all branches while preserving the linked repository and manual deployment path.
- Verified the configuration commit `c0a66a9f` after the Git webhook window: no new Vercel deployment was created, and the current manual release `dpl_J7VDyXPynjJntQtX5Kn95QABA3qW` retained `www.yoursparklesuite.com`, `yoursparklesuite.com`, BlingKitchen, and Bri's Glowtique aliases.

# August 17, 2026 - Recipe editor back navigation fixed

- Louis reported that the top workspace back action shown while editing an existing Heather recipe skipped the Current recipes gallery and went straight to Tools. The visible editor already had a one-step return, but its state was internal to the recipe card while the workspace shell only saw the enclosing Recipes section.
- Lifted the recipe editor tab state to the workspace boundary. While an existing recipe is open, the shell now labels the action **Back to current recipes** and returns to the current-recipe gallery. On the gallery or new-recipe builder, the regular tool-level **Back to Tools** behavior is unchanged. Re-entering Recipes starts at the current-recipe gallery.
- Verified with `tests/nic-nac-dashboard-placeholder.test.ts` (106 passing) and `npm run build` on allowlisted branch `codex/nic-nac-trade-hardening`. Committed/pushed `1fad6ff3 fix: keep recipe editor back navigation one level deep`.
- Manually released that exact tip as Ready deployment `dpl_SHhz5jAzNoYZEhy1WwuttV599MUs` / `https://sparkle-suite-6x3cv666n-louis-2849s-projects.vercel.app`. It owns www, apex, BlingKitchen, and Bri's Glowtique aliases. No-auth smoke: canonical Workspace 200, apex canonical redirect, both BlingKitchen Pantry hostnames 200, and both Bri hostnames 200. Reviewer visual verification remains blocked by the known too-short token; no browser tabs were closed and no Louis/customer account was used.

---

---

# August 17, 2026 - Pantry recipe card footer alignment

- Louis requested that the prep time, servings, and View Recipe control align along the bottom of each recipe card, letting variable-length narratives use the visual slack instead of shifting the action controls upward.
- Updated the shared Pantry card CSS only: grid cards stretch as full-height flex columns, the body fills remaining space, and the recipe metadata gets automatic top margin before the action. No recipe records, wording, images, or user interactions changed. Bumped only the Pantry stylesheet cache key.
- Verified `tests/bling-kitchen-public-site.test.ts` and `tests/bling-kitchen-recipes-db-loader.test.ts` (11 passing), plus the local production build. Committed/pushed `a9f32d14 fix: align Pantry recipe card footers`.
- Manually released exact commit `a9f32d14` as Ready deployment `dpl_9N9iscB6KZsD9UMnhWjkEnxWEFxH` / `https://sparkle-suite-8y93vz37z-louis-2849s-projects.vercel.app`. It owns www, apex, and customer aliases. Live checks found the footer-alignment cache key on Heather's custom Pantry and 200 responses for canonical Sparkle Suite Pantry and BlingKitchen Pantry; apex canonicalizes to www. Reviewer visual acceptance remains blocked by the known too-short token, with no Louis/customer account or browser tab used.

---

# August 17, 2026 - No-Bake Treats moved into Baking & Sweets

- Louis requested removal of the Pantry's No-Bake Treats section, with all recipes moved into Baking & Sweets.
- Production inspection identified one affected Heather/BlingKitchen record: `Sweet & Salty Clusters`, visible. Its category alone was updated with an exact row/rep/category guard; recipe content, image, sort order, and visibility remain unchanged.
- Removed No-Bake Treats from editor and public category groups; all legacy `Baking`, `Dessert`, and `No-Bake Treats` values now normalize to Baking & Sweets in save, AI-draft, and template paths.
- Application commit `dc2624c4` was released manually as `dpl_HtdnTBiCnvQSRSGXxFSsx66QyTg8`. Four focused files passed 125 tests and local/Vercel builds passed. Live public template data includes the moved recipe and no No-Bake Treats entry; canonical recipe route returned 200, apex returned 307, and BlingKitchen Pantry returned 200. Reviewer-browser visual smoke remains unavailable due to the known too-short token; no Louis/customer session was used.

---

# August 17, 2026 - Gmail connector identity boundary

- Louis asked to locate Heather's source recipes for The Perfect Oatmeal Cookie, Cheesy Tortilla Soup, Soft and Fluffy Dinner Rolls, Mom's Apple Betty, and Banana Coffee Cake in `louis@neonrabbit.net`.
- The connector profile instead identified `louischapman1@gmail.com`. A title search there found no matches, but that result does **not** answer the requested Neon Rabbit mailbox search and must not be used as recipe evidence.
- Louis explicitly requested disconnecting the incorrect account and connecting `louis@neonrabbit.net`. The currently available Gmail connector API has mailbox search/read/write operations but no connection, disconnection, OAuth, or account-switch control. Reconnect the Gmail integration to the intended account before any further mailbox work; then repeat the exact-title and attachment-aware recipe search. No email was sent, altered, archived, or deleted.

---

# August 26, 2026 - Shared Control Center for Sparkle Finder appearance

- Added a Sparkle Suite / Sparkle Finder switcher to the existing Control Center and a Finder appearance editor with all 11 customer-site presets.
- Added the persisted Finder appearance contract, public read API, operator-only update API, and Finder-side dynamic theme loader. Amethyst is the seeded and fallback preset.
- Applied migration `20260826110000_sparkle_finder_brand_settings.sql`; focused Suite tests, 762 Finder tests, lint, Suite typecheck, local builds, strict Suite contract, 20 Finder browser smoke tests, and the Nic-Nac missing-model guard passed.
- Released application commit `4a60590a`: Suite `dpl_G25cvspzdQBPWBs6s5SydGbwrKKP`; Finder `dpl_AJm8zgU8jkXwhpSgmEHAdErJFJvX`. Both Suite domains resolve to the Suite deployment and `yoursparklefinder.com` resolves to the Finder deployment.
- Live Finder browser inspection confirmed Amethyst tokens and appearance. The authenticated Control Center picker remains for an operator-session visual click-through; no credentials or account state were changed to bypass the login boundary.

---

# August 26, 2026 - Finder outbound links open separately

- Louis requested that View Rep, Dance Floor, and every other link leaving Sparkle Finder open in a new tab so customers can compare multiple reps without losing their Finder place.
- Added a shared external-aware Finder link component and applied it to all dynamic outbound discovery surfaces. External HTTP(S) destinations receive `target="_blank"` and `rel="noopener noreferrer"`; local Finder routes remain same-tab.
- Commit `15f60885` passed 765 tests, lint, local/Vercel builds, and signed-in local browser QA with no console warnings. Production deployment `dpl_EEA1gzkRrdMwJk35KHnF1DzZat3s` is Ready and owns `https://yoursparklefinder.com`.
- Production Reps remains correctly login-gated. No real customer or Louis account was used to bypass that boundary.

---

# August 26, 2026 - Unified Workspace communications implementation

- Implemented the approved one-inbox communications plan across Workspace, Control Center, canonical conversation services/APIs, Supabase, and synthetic smoke tooling.
- Added friendly All, Team, Rep Network, Support, Sparkle Suite, and Archived views; guided new-message choices; thread-specific actions; Support progressive disclosure/screenshots; and safe deep links.
- Preserved broadcasts as receive-only publications and isolated private conversation permissions. Rep Network operators can read only actively reported threads; arbitrary rep-authored context snapshots and unapproved external links are rejected.
- Added historical Support reconciliation, onboarding compatibility, exact unread aggregation, stable cross-stream keyset pagination, concurrency locks, moderation write checks, operator requester identity/read state, five-minute signed screenshot reads, and a protected Support follow-up recovery cron.
- Applied additive migrations `20260826150000` through `20260826157000`. Database smoke exposed and then verified fixes for nullable unread routing and ambiguous PL/pgSQL output-column conflict targets.
- Verification: 25 focused files / 229 tests passed; targeted communications ESLint passed; final Next.js 16.2.1 production build and TypeScript passed with 30 generated pages. The repository's standard `npm test` remains 225/226 because the pre-existing Nic-Nac email registry expectation omits the unrelated existing `manage_customer_contact` tool.
- Production-schema smoke passed Team, Support, and Rep Network with only `sparkle-reviewer+communications-*` identities and non-live subscriptions. No Stripe charge, email, SMS, Google Chat alert, real account, or customer data was used. Cleanup removed all synthetic users, conversations, reports, attachment objects, and Task List items; final reset was empty.
- Vercel Hobby rejected the initial 15-minute Support recovery schedule during release. The durable recovery endpoint remains protected and bounded, and its production schedule was changed to the supported daily cadence at 18:15 UTC with a regression assertion in the cron route suite.
- Fixture-backed desktop and 390px browser QA covered the six-stream inbox, Team thread, mobile back navigation, new-message chooser, and guided Support handoff without using a real account. That pass found and fixed a stale top-header unread badge; opening or archiving a conversation now synchronizes the shared Workspace count immediately.

---

# August 26, 2026 - Message Center help, broadcast clarity, and quiet refresh

- Added **Using the Message Center** to **Tools > Resources & Help > Help** so reps can find a plain-language explanation of All, Team, Rep Network, Support, Sparkle Suite, and Archived views, plus replies, New Message, and Support. Released in `959552c6`.
- Inspected the live Control Center Broadcasts composer after Louis could not find how to publish his saved update. The draft was confirmed safe and unpublished. The underlying final action was intentionally below the fold after audience preview, so the UI now labels the first action **Review & publish**, names **Publish now** as the next step, and scrolls to the final review. The mass-publication checkbox/final confirmation remains required. Released in `4a96e279`; no broadcast was sent.
- Added built-in Message Center polling in `c5355136`: one quiet fetch per minute while the Workspace is visible, plus a refresh on focus/visibility return. It updates the inbox and header unread badge without reloading the page, does not interfere with in-progress reply/support drafts, prevents concurrent refreshes, and keeps the last good inbox on a transient background failure. It uses existing app/database requests—no agent, credits, AI generation, email, SMS, or push provider.
- Focused verification: `tests/nic-nac-unified-message-center-ui.test.tsx`, `tests/nic-nac-dashboard-placeholder.test.ts`, and `tests/nic-nac-workspace-refresh-events.test.ts` passed 139 tests; the final local production build passed. The exact production commit `c53551365ddb4c6d088b95e7d6e01503c1af84ef` was pushed and manually released as Vercel deployment `dpl_AyfCaYp4bvEJDCmjoqcwS7Ko9Q9V`; both Suite domains resolve to it. Untracked `artifacts/` and `test-results/` were preserved.

Lessons retained:

- A safety-critical multi-step action must make the next step visible at the moment of intent; a correct control below the fold is functionally hidden.
- Refresh only the narrow data surface that needs freshness. Do not reload the full Workspace or overwrite a conversation/composer while a rep is working.
- Background polling failures should be silent and preserve the last known-good inbox; explicit user refresh/retry remains the visible recovery path.

---

# August 27, 2026 - milehighfizz.com registrar-transfer follow-up

- Readdy Support replied to the transfer request by asking for nameserver records. Louis sent the clarified response: this is an inter-registrar transfer, not an authorized DNS/nameserver change.
- The response again requests the current registrar, domain-unlock steps/status, EPP/AuthInfo code, any transfer lock or verification requirement, and the current Readdy-managed DNS/services that must be preserved.
- No DNS, nameserver, domain-lock, registration, or hosting setting has changed. Keep the transfer pending until Readdy provides the requested information.

---

# August 27, 2026 - Remy Communications MCP implementation and staging

- Built and released the dedicated Communications MCP for Remy in commit
  `1b3080979be3cc70aafbeb0732a3a2056594ad5c` on
  `codex/nic-nac-trade-hardening`. The endpoint is
  `https://www.yoursparklesuite.com/api/remy/mcp`.
- Added ten strictly scoped communications tools and the durable one-time
  Support-reply approval flow. Exact reply text is authorized by Louis in
  Control Center before a send; broadcasts, moderation, report-status changes,
  Task List promotion, private unreported chats, attachments, billing, and
  settings remain out of scope.
- Applied migration `20260827100000_ss_remy_communications_agent_audit.sql`;
  remote verification found both Remy audit and reply-approval tables.
- Focused tests passed: 4 files / 10 tests. Local and Vercel production builds
  passed. The known unrelated full TypeScript fixture failures were recorded;
  they are not Remy regressions.
- Initial deployment `dpl_9JZJBLkU8hAo2uTq3Jz4Ldo4susB` exposed the endpoint
  as intentionally unavailable until its dedicated token existed. Vercel
  Production now contains a server-only `REMY_MCP_BEARER_TOKEN`; the current
  manual deployment after token rotation is
  `dpl_EwSH5AvtYEAV11Qfo5AWV1MWp4Z2`. Both Suite aliases resolve there and a
  no-token request correctly receives `401`.
- The replacement bearer token is presently entered only in Remy's masked Grok
  Bot connector field. The final **Save securely** control was intentionally
  not clicked yet. Never disclose the token in conversation or a memory file.

---

# August 28, 2026 - Lane bookkeeping handoff for Sparkle Suite and Finder

- Prepared `docs/sparkle-suite/operations/2026-08-28-lane-bookkeeping-handoff.md`
  for Lane, Neon Rabbit's bookkeeper. It separates Sparkle Suite and Sparkle
  Finder into distinct profit centers, maps the current money rails and
  evidence hierarchy, and provides a chart-of-accounts recommendation,
  monthly-close checklist, 30-day setup plan, and questions for Louis.
- Read-only production aggregate inspection confirmed that Finder currently has
  11 Silver trial memberships and no Stripe-backed Finder memberships. Its
  historical $4.99/month Silver discussion is planning context, not verified
  present revenue.
- The live Suite public offer is $49.99 one-time plus $74.99/month. Historical
  $39 arrangements remain account-specific and require Stripe reconciliation.
  The internal Suite financial snapshot currently reports $78 MRR across two
  subscriptions but has `failed` sync status and null P&L fields; it must not
  be used as a book of record.
- Lane must reconcile Stripe reports, Bluevine statements, invoices, and
  receipts before recording totals. No money movement, financial-provider
  change, refund, or filing is authorized without Louis's explicit action-time
  approval. The meaningful handoff summary was also captured and confirmed in
  Open Brain; no credentials or raw payment data were recorded.

---

# August 28, 2026 - Open Brain repair, Readdy transfer clarification, and GrokBot access

- Re-established the Open Brain boundary after Louis's correction: Open Brain
  is the actual company diary and the vault is a distinct companion system.
  The repository rule now requires verified Open Brain capture plus relevant
  vault updates for meaningful work; neither may contain credentials, tokens,
  payment data, or passwords.
- Repaired the production Open Brain MCP in `c16f349`: full-history statistics,
  paginated oldest/newest listing, working capture, and working semantic search
  were live-verified against all 2,309 records. The exact tenth historical
  record was retrieved rather than guessed.
- Louis approved and sent the Readdy response that rejects an AWS internal
  transfer for `milehighfizz.com` and requests a normal external-transfer EPP
  code/unlock for CheapNames. Nothing about DNS, nameservers, hosting, or the
  registration was changed.
- Prepared and pushed the Lane bookkeeping handoff in `70baf72`. Aggregate
  production evidence and all resulting finance conclusions are in the linked
  operations document; the stale/failed Suite financial snapshot must not be
  treated as books.
- In Louis's authenticated GitHub Chrome session, prepared but did not
  generate a fine-grained no-expiration GrokBot token restricted to
  `louis623/sparkle-suite` with read-only Actions, Contents, Issues, Metadata,
  and Pull requests. The final **Generate token** action remains for Louis's
  explicit approval. No token value was created, copied, or recorded.
- Three matching Open Brain entries were successfully captured: the diary/vault
  rule and retrieval repair; registrar/finance handoff; and GrokBot GitHub
  setup. No secrets were recorded.

---

# August 28, 2026 - Grok Bot unified Control Center MCP release

- Built, tested, committed, and pushed the one shared Sparkle Suite Control Center MCP at the existing `/api/remy/mcp` endpoint. Commit: `5241f567ff641f6bd555cc60e88aac927d23a253`.
- Preserved all ten Communications tools and their existing data-minimization and one-time Support approval/send controls. Added read-only waitlist list/get and operator-health tools for a total of 13.
- Focused verification passed (4 files / 11 tests), along with ESLint and a full production build.
- Manually deployed the exact verified commit to Vercel production as `dpl_6NhStF3eDSErtBknfmgXTCcRJ8wy`. Both `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com` resolve to the deployment; unauthenticated MCP access fails closed with `401`.
- Using Computer Use, Codex identified itself to Sam in Grok Bot and supplied the endpoint/provenance and safety boundaries without disclosing the masked token. Sam confirmed all 13 live tools, a clear operator-health read, and four waitlist records, then connected the **Sparkle Suite Control Center** card.
- No Support reply, approval request, broadcast, report change, lead change, profile mutation, DNS change, billing action, or other production business write was performed. The two legacy Grok Bot cards were deliberately left installed pending explicit uninstall confirmation.

---

# August 28, 2026 - Additive Guardian watch source slice

- Confirmed the only approved workbench `C:\Users\louis\sparkle-suite-repo`, allowlisted branch `codex/nic-nac-trade-hardening`, starting HEAD `bedd1a40`, GitHub remote `louis623/sparkle-suite`, and only the pre-existing untracked `artifacts/` and `test-results/` directories before editing.
- Kept the existing `/api/remy/mcp` endpoint, Bearer boundary, 13 tools, and Remy one-time Support approval/send behavior. Source now adds one read-only Nic-Nac usage tool on the same handler and extends—not replaces—the current operator-health snapshot.
- Added direct Suite/Finder uptime and 5xx probes without credentials or a monitoring vendor. Failed-deployment history, Finder operator counts, Finder runtime Nic-Nac telemetry, and Nic-Nac credit balance are returned as explicit coverage holes/nulls rather than inferred values.
- Added the operator-authenticated Guardian Control Center page and navigation link using the existing visual system. It runs health and usage reads in parallel and has no client mutation controls.
- Sparkle Lab remains recommendations-only. The Guardian read path imports only the existing Lab read model, never the runner or POST route, and changes no Lab environment flag.
- Final focused verification: 14 files / 48 tests passed, changed-file ESLint passed, and the full local production build passed. Full standalone `tsc --noEmit` remains red only on established repository test-fixture errors; the production build's TypeScript phase is green.
- No deployment or production/business mutation was performed.

---

# August 30, 2026 - Team-card onboarding workflow release

- Replaced the standalone Team Management onboarding-link creator with private onboarding controls inside each saved Workspace roster card. Link creation, current progress, Message Center navigation, refresh, and archive now stay with the intended rep card and are never rendered on the public Join Team site.
- Kept the new-person flow compact and guarded: save a hidden team card first, then create its onboarding link. Publishing the card remains a separate deliberate action.
- Extended the participant model with an optional roster-card relationship. The migration backfills only unambiguous active name matches and preserves unmatched historical onboarding records in **Earlier onboarding links**. The first migration attempt failed transactionally on an unsupported UUID aggregate; the corrected UUID-safe migration was committed and applied successfully.
- Preserved token safety: only token hashes are stored. Refreshing rotates the token for the same participant, invalidates the previous link, and preserves onboarding progress and conversation history.
- Pushed application commits `d8da42e7` and `3aecc690`; manually released exact tip `3aecc69046549ce413c4df03c1740b4a29c` as Ready deployment `dpl_3qts9BFA9cArPGVo7ogfxxcfHNp9`. Both Suite aliases resolve to the deployment.
- Verification passed 129 focused tests and standalone TypeScript. Changed-file lint introduced no new errors but still reports two pre-existing unrelated component errors and existing warnings. The local build runner hit its known final-footer/lock anomaly; the authoritative Vercel production build completed Ready.
- Read-only live browser smoke verified Rayna's private onboarding card, absence of the standalone creator, safe client-only Edit population and reset, and a clean console. No link was created, refreshed, copied, opened, or archived; no message, billing, DNS, Live Queue, authentication, or customer-data change occurred during smoke.

---

# August 31, 2026 - Founder billing correction and first-customer Stripe setup

- Exact-guarded production review confirmed the first paying founder customer is
  an active real customer with an active five-day workspace trial and no prior
  subscription or Stripe customer. A cancelled demo/onboarding subscription was
  the only record consuming founder slot 1.
- Released the cancelled demo placeholder from founder slot 1 without deleting
  its historical Stripe subscription, then assigned the verified customer the
  durable founder contract at sequence 1.
- Created and visibly confirmed one live Stripe Customer in the Neon Rabbit
  account and linked it to the exact Sparkle Suite rep row. No checkout session,
  subscription, payment method, invoice, payment link, or charge was created.
- Corrected the Account review contract to show a $49.99 setup fee plus the first
  $49.99 month at checkout, $49.99 for months 2-12, and $74.99 beginning month
  13. The existing webhook schedule remains the automatic step-up mechanism.
- Renamed the live Stripe one-time product from build fee to setup fee. The
  existing live $49.99 one-time, $49.99 monthly, and $74.99 monthly prices were
  preserved.
- Kept the pending onboarding custom domain dormant behind
  `TEAM_ONBOARDING_CUSTOM_DOMAIN_ENABLED`; the legacy onboarding host remains
  the default until DNS/SSL and a separate release are approved.

---

# August 31, 2026 - Nic-Nac blank-response incident diagnosis and hardening

- Exact-guarded read-only production evidence from Kim's active customer rep
  showed two meeting turns recorded as `complete` with no visible assistant
  text. The Dance Floor turn produced only internal
  `prepare_trade_board_work` output; its still-active workflow then ingested
  and hijacked the explicit Calendar turn.
- Added application-owned workflow-turn arbitration. Explicit new product
  intents suspend unrelated durable workflows for that turn without deleting
  them; passive replies may continue an active workflow. Explicit Calendar
  work is pinned to `prepare_calendar_work` ahead of stale Dance Floor state.
- Aligned the stream-output guard with the actual chat renderer. Internal tool
  protocol/output no longer counts as a visible answer; if the provider ends
  without text, an observable customer-safe recovery reply is streamed and
  telemetry records `empty_model_output_recovered`.
- Verification passed 10 Nic-Nac files / 194 tests, changed-file ESLint, and
  the full Next.js production build. The full standalone TypeScript command
  remains red only on the repository's previously documented stale test
  fixtures; the production build TypeScript gate is green.
- Kim's account, conversation rows, workflow rows, calendar, Dance Floor, and
  all other customer data were inspected read-only and were not changed.
- Final release `b7101c08` added resolver-aware recovery text, then passed the
  exact live sequence that failed in the meeting: a Dance Floor request followed
  by a Calendar request in the same conversation. Both replies were visible;
  Calendar used its own workflow rather than the stale Dance Floor workflow.

**Lessons learned:**
- A provider run marked `complete` is not sufficient evidence of a usable
  Nic-Nac reply. The output guard must define visibility from the chat
  renderer's contract, not from internal stream protocol events.
- A plain-conversation smoke cannot prove tool-backed reliability. Regression
  coverage for durable workflows must include a multi-turn product switch so a
  stale workflow cannot silently capture the next explicit request.
- Deterministic server-side recovery is required for empty or resolver-only
  model output; client hydration recovery remains a separate safeguard for a
  saved visible reply that the browser has not rendered.
- The remaining operational gap is continuous assurance: the exact synthetic
  two-turn workflow replay is verified at release time but is not yet a
  scheduled canary.

---

# August 31, 2026 - Nic-Nac deep audit, workflow pressure, and visible read recovery

- Louis reported a third severe Nic-Nac failure in two days from the exact live
  Control Center operator-support surface for Kim. The audit stayed read-only
  for Kim and Louis's admin account and used only the isolated synthetic
  reviewer for live mutations.
- Exact persisted evidence showed the reported prompt, `Nic-Nac. I need to add
  a dancer to my dance floor, please.`, reached
  `prepare_trade_board_work`. Its catalog lookup embedded the whole sentence in
  a raw PostgREST OR filter, failed with `PGRST100`, and completed after 6.1
  seconds with recovery text. No customer row needed repair.
- Release `ff33348c` removed the unsafe raw-filter construction, made the exact
  Dance Floor starter deterministic, preserved app-owned resolver facts,
  suppressed structured tool failures, and added executed-tool/failure
  telemetry. The related production migration was applied.
- Release `8b246314` added state-aware photo reconciliation, persisted resolver
  design facts, and pinned explicit Trade/Dance Floor reads. The first full
  paid pressure matrix exposed four more transition gaps rather than being
  accepted as a pass.
- Release `84e186b4` moved mutation-ready workflow pins ahead of broad reads,
  added workflow-phase candidate reads, prevented a same-family explicit Trade
  request from inheriting the wrong stale workflow, and made the post-completion
  fulfillment Dance Floor question mandatory.
- Live isolated replays then passed item intake, non-item intake, live swap,
  swap cleanup, removal, approve/reject decisions, and catalog correction,
  including approval gates, database/public assertions, and mandatory cleanup.
  The fulfillment mutation/public-state path passed before the mandatory-copy
  guard; its final copy guarantee is covered locally because the approved paid
  request budget was nearly exhausted.
- The replay diagnostics exposed successful read tools that could still save
  the generic blank-response apology. The diagnostic JSON was emitted only by
  the smoke reporter, not by the customer UI; the persisted customer defect was
  the generic apology. Commit `4f599c8a` adds deterministic bounded summaries
  for seven core read workflows and makes every relevant pressure smoke fail on
  that apology.
- Verification for `4f599c8a`: 162 Nic-Nac test files passed with one skipped;
  1,313 tests passed with one skipped; full Next.js production build and its
  TypeScript gate passed. Standalone `tsc --noEmit` still reports the known
  unrelated stale test-fixture errors documented before this incident.

**Lessons learned:**
- Workflow/database correctness and customer-visible response quality are
  separate release gates. A smoke must fail on wrong or generic copy even when
  tool selection, approval, and database state are correct.
- Explicit product reads need the same deterministic server-owned completion
  contract as guided intake. Authoritative structured results should be
  summarized by the app when model prose is absent, not thrown away behind a
  retry request.
- Pressure testing must cover full transitions—read, selection, approval,
  mutation, public proof, and cleanup—across every workflow family. A single
  happy-path replay is not credible Nic-Nac release evidence.

---

# September 1, 2026 - Nic-Nac Calendar read routing and natural answers

- Confirmed the only approved workspace, `louis623/sparkle-suite` remote,
  allowlisted `codex/nic-nac-trade-hardening` branch, and starting tip
  `b83f8c84`; preserved the existing untracked `artifacts/` and `test-results/`.
- Diagnosed the screenshot response as a routing/recovery defect: the question
  was recognized as Calendar work, but the forced first tool was
  `prepare_calendar_work`, whose resolver-only fallback asked for a show and
  date instead of reading the calendar.
- Released `7df6569a` with direct read routing to `list_my_shows`, broad
  read-vs-mutation classification, workflow supersession, and deterministic
  factual show summaries. Local verification passed all Nic-Nac tests, the
  repository suite, lint, and the production build.
- With Louis's exact approval for four paid requests, reset only the synthetic
  dashboard-unlocked reviewer and replayed the screenshot question plus `this
  week`, `next live`, and `tonight` variants against the real production API.
  Every turn used only `list_my_shows`; before/after calendar snapshots were
  identical. The replay also showed every prompt received the same complete
  two-show list, so the result was not accepted as naturally scoped.
- Added latest-question context to the app-owned recovery layer. It now checks
  active-show duration for `right now`, filters date scopes in the event time
  zone, answers yes/no for `tonight`, and returns only the first event for
  `next live`. Empty-calendar replies are scoped as well. The permanent smoke
  runner has a hard four-request cap, permits no tool except `list_my_shows`,
  and fails if the calendar changes or later shows leak into narrower answers.
- Final commit `898f69ef` passed 160 Nic-Nac test files plus one skipped (1,235
  tests plus one skipped), the 226-test repository suite, selected-file ESLint,
  diff checks, and the Next.js production build. It was pushed and manually
  released as Ready deployment `dpl_5NKrYHLyq166UxXy2rzhYhRN5N62`.
- Both `https://www.yoursparklesuite.com` and
  `https://yoursparklesuite.com` resolve to that exact deployment. The live
  `www` root and `/nic-nac` return 200; the apex returns the expected canonical
  307. No extra paid model requests were made after the approved four were
  consumed, so final post-deploy behavioral replay awaits a new exact request
  cap from Louis.
- The existing restricted Nic-Nac Support browser session was not logged out,
  repurposed, or used for reviewer work. No personal/admin or customer account,
  DNS, domain, Vercel alias, Stripe/billing, message, or calendar write was used.

**Lessons learned:**
- A factual list is still the wrong answer when the question asks for a time
  scope. Live replay assertions must check answer semantics, not just tool name,
  non-empty text, and absence of mutations.
- Deterministic recovery copy needs the user's current question as well as the
  structured tool result; otherwise safe fallbacks flatten distinct intents
  into one generic list.

---

# September 1, 2026 - Nic-Nac agent-harness rebuild plan

- Louis clarified the intended product outcome: Nic-Nac is a live-show business
  partner and expert helper for Bomb Party, live streaming, and Sparkle Suite.
  Reps must be able to switch among Calendar, Dance Floor, questions, and other
  allowed tasks in one conversation without learning scripted phrases.
- Diagnosed the reported Calendar read-to-add failure at the architecture
  boundary. The current app exposes the normal Workspace tool catalog but still
  uses regex intent classification, durable active-workflow state, and exact
  first-step tool forcing before the model reasons. Production policy currently
  defaults human conversations to `gpt-5.4` medium, not GPT-5.6.
- Confirmed the installed Vercel AI SDK 6 already supplies the appropriate
  harness: `ToolLoopAgent`, automatic multi-step tool use, UI streaming,
  stopping controls, approvals, and telemetry hooks. No new agent framework or
  UI rewrite is required.
- Created
  `docs/superpowers/plans/2026-09-01-nic-nac-agent-harness-rebuild.md`.
  The plan keeps proven tools, services, permissions, approvals, persistence,
  UI, and telemetry; replaces top-level scripted steering; adds compact
  current/paused task continuity and grounded expertise; and defines phased
  Calendar, Dance Floor, cross-workflow, and controlled-release gates.
- The exact same-conversation Calendar read-to-add failure is the first critical
  acceptance case. Model-backed replays require a separate explicit request and
  cost cap, and the scheduled isolated canary remains separately unauthorized.
- This session changed documentation and repository memory only. It did not
  modify Nic-Nac behavior, run paid model calls, use a browser, deploy, mutate
  production/customer data, or touch billing, DNS, domains, aliases, or the Live
  Queue extension. Existing untracked `artifacts/` and `test-results/` were
  preserved.

**Lessons learned:**
- Application-owned business truth and safety do not require application-owned
  conversational intent. The former should remain strict; the latter should be
  model-led.
- A durable workflow can preserve transaction facts without owning future
  turns. An explicit new request must always get a fresh tool-selection decision.
- Tool-switch reliability must be tested as a multi-turn conversation with one
  conversation ID. Separate one-turn prompts do not prove the requested behavior.

---

# September 1, 2026 - Nic-Nac agent-harness implementation

- Implemented the approved `ToolLoopAgent` harness while keeping Sparkle
  Suite's authentication, tenant policy, schemas, approvals, auditing,
  persistence, telemetry, UI streaming, and deterministic recovery in charge
  of business truth and safety.
- Replaced phrase-selected top-level tool packs and forced first tools with the
  full permission-scoped Workspace capability catalog. The model now chooses
  among allowed tools on every step and can chain up to six steps by default.
- Added the concise Nic-Nac employee guide, a complete 53-tool safety ledger,
  explicit approvals for outbound SMS/email, grounded/versioned work knowledge,
  generic current/paused task semantics, and Calendar workflow supersession.
- Preserved the prior route as a rollback path. Production is default-off when
  rollout variables are unset; exact rep/email cohorts are supported, and an
  explicit false setting is the kill switch. No cohort was enabled.
- Verified the exact Calendar read-to-add failure and cross-tool switching in
  three consecutive 12-test replays. The final candidate also passed 32 focused
  harness/safety/knowledge tests, 1,271 Nic-Nac tests with one existing skip,
  the 226-test standard suite, provider-free zero-paid-call smoke, lint, diff
  checks, and the full production build.
- The current bundled in-app-browser runtime was loaded and preflighted, but it
  returned no claimable user or controlled tabs. No browser state was changed
  and no UI claim was made.
- No paid model call, personal/admin or customer testing, billing/Stripe,
  messaging, DNS/domain/alias, customer-domain mapping, Live Queue extension,
  or scheduled canary action occurred.

**Lessons learned:**
- Reliability comes from giving the model the allowed capabilities and keeping
  enforcement at the tool boundary, not from expanding a phrase router.
- A rollback-safe rollout gate and a complete side-effect ledger are required
  before an agent can safely receive a broad tool catalog.
- Deterministic mocked tool-loop tests prove orchestration and safety; live
  answer quality still needs a separately capped model-backed reviewer replay.

## 2026-09-02 - Nic-Nac Cost & Capacity dashboard

- Built and released owner-only `/control-center/nic-nac-usage` with a prominent manual Refresh button and fresh server reads on page open.
- Added separate Suite/Finder estimates and actual-provider slots, customer-facing versus Lab/utility cost classes, burn and usage rates, cached-token/failure visibility, cost per successful workflow, policy/price alerts, recent run evidence, separate freshness stamps, and monthly CSV export.
- Added Finder's bounded read-only internal telemetry endpoint and configured its dedicated shared bearer token as a Vercel Secret in Suite and Finder production/preview. The unauthenticated live route returned `401`.
- The first live smoke exposed legacy zero-cost application action names in the `model` column. Commit `d570a2e9` corrected them to `No model (static)` so they no longer create false unknown-price or policy-drift alerts.
- Verification passed 12 focused Suite/Finder tests, changed-file lint, both production builds, exact domain/deployment inspection, and signed-in live Control Center smoke. Manual Refresh visibly transitioned `Refresh` → `Refreshing…` → `Refresh`.
- Finder deployment: `dpl_CCyNBUN9XUSW4vCfZ9mSxMkoynv5`. Final Suite deployment: `dpl_3Uj5brd9CCSLa1bLnG5rAmY6bNV1`.
- Remaining provider setup is explicit: supply a dedicated OpenAI organization admin key and map distinct OpenAI project ids to Suite and Finder. Until then actual provider spend and balance remain unavailable rather than estimated or scraped.

## 2026-09-02 - OpenAI cost attribution and model-fit release

- Created separate OpenAI projects for Sparkle Suite Production and Sparkle Finder Production. Each product now uses its own restricted runtime key with model-request capability only; the Suite Control Center uses a separate read-only organization key for the OpenAI Costs API.
- Configured explicit Suite/Finder project-id mappings. Historical spend in the OpenAI Default project remains unallocated and is not blended into either product class.
- Released commit `91273c87`, adding workload labels, actual-versus-expected model, policy tier, reasoning level, model-fit status, cached/failure visibility, and the same fields in Lane's monthly export. Workload labels are derived from persisted workflow/intent telemetry; they do not route or steer Nic-Nac.
- Finder deployment `dpl_9W8PJNL7xKZ88uKfgcb6omrcirfd` and Suite deployment `dpl_3jf6qWNJJKJgibFJZrCbnMgeMzWm` are `READY` and own their expected production domains.
- Live Control Center verification confirmed refresh-on-open, the manual Refresh cycle, separate product classes, a current provider-fetch timestamp, and the new model-purpose/model-fit tables. Provider actuals currently show `$0.00` for the newly created product projects; provider reporting may lag.
- A minimal Responses API request proved the Suite restricted runtime key can invoke the configured model family. Finder's final synthetic authenticated model smoke was not rerun because its write-only smoke token is unavailable to the terminal and the only visible browser session belongs to Louis; that account was not used for reviewer testing.
- No billing, Stripe, bank, refund, auto-refill, customer, DNS, domain, alias, messaging, or scheduled-canary change was made. Untracked `artifacts/` and `test-results/` were preserved.

## 2026-09-02 - Event-level customer show destinations

- Repaired the calendar/customer-site contract so `calendar_events` owns an
  ordered `streaming_destinations` JSON list. The list supports TikTok,
  Instagram, YouTube, Facebook, Whatnot, and labeled custom destinations.
- Nic-Nac add/edit show tools validate HTTPS destinations at the app boundary;
  URLs are optional for scheduling, deduplicated, capped at five, and copied
  across recurring occurrences or future-series updates when supplied.
- Upcoming-show cards no longer read `reps.streaming_links`. They render Add
  to Calendar first and then only the exact event-owned Watch-on destinations.
  Existing events remain empty and unchanged; generic homepage media and old
  `primary`/`secondary` profile keys cannot become show links.
- Added a code-only reviewer fixture for one single-stream and one dual-stream
  show plus focused service, tool, homepage, reminder, and fixture coverage.
  Do not reset it in production without explicit authorization: the historical
  reviewer persona was archived and reset would reactivate it.
- Application commit `b392fb90` is live as Ready deployment
  `dpl_2Qmz44MZqX2tibsJgfHHpNqPGLUg`; both Suite domains resolve to that
  deployment. The additive migration `20260902140000` is applied.
- Vercel initially attached customer aliases during the manual production
  deployment despite the release constraint. They were immediately restored,
  after inspection, to the exact prior deployment `dpl_3jf6qWNJJKJgibFJZrCbnMgeMzWm`:
  `brisglowtique.com`, `www.brisglowtique.com`, `theblingkitchen.com`, and
  `www.theblingkitchen.com`. No customer data, billing, or customer show rows
  were changed.
# September 2, 2026 — Calendar social-link and calendar-picker correction

- Louis clarified that a show platform is not a separate stream URL contract.
  When Nic-Nac schedules a TikTok (or other supported-platform) show, customer
  cards must use the matching social link already saved in that rep’s Site
  Settings. No per-event override or copy from other media is allowed.
- Local implementation replaces the event-destination mapper with configured
  social-handle resolution, makes Nic-Nac return explicit configured/missing
  link evidence after `add_show`, and changes customer calendar actions from
  immediate ICS download to Google/Outlook/Apple-or-other picker options.
- Focused proof: 119 tests across homepage mapping/template, customer-site
  data scrub, calendar service/tools, and new platform-link cases; production
  build completed. The separate reviewer-synthetic multi-platform proof stays
  pending explicit authorization to reactivate or replace the archived persona.

## Release evidence update

- Pushed application commit `6e2877af48c8bb028ce3fa4ffb01b72ae94f1c90` and
  released it with `--skip-domain` as Ready deployment
  `dpl_CMVwBAT5cECEvo7nY969RSv5qiRL` / `sparkle-suite-bfijpj3rs-louis-2849s-projects.vercel.app`.
  Assigned only `www.yoursparklesuite.com` and `yoursparklesuite.com`.
- Direct Vercel inspection confirmed both Suite aliases at the new deployment;
  direct inspection confirmed both protected customer domains stayed on
  `dpl_3jf6qWNJJKJgibFJZrCbnMgeMzWm`.
- Read-only live Dudes Fizz Fest check confirmed TikTok cards link to the
  configured TikTok profile and that the calendar chooser exposes Google,
  Outlook, and Apple/other choices. No sign-in, data mutation, provider action,
  customer-domain movement, billing, or customer-account action occurred.

## Open Brain closeout

- Louis requested the complete session record in Open Brain. Captured the
  platform-to-configured-social-link decision, calendar chooser behavior,
  corrected event-destination approach, commits/deployments, test and live
  evidence, reviewer constraint, and the Vercel alias lesson as an Open Brain
  observation on September 2, 2026. No credentials or private tokens included.

## September 3, 2026 - Kim custom-domain migration

- Confirmed the active workspace provenance before the change: local repo
  `louis623/sparkle-suite`, allowlisted branch `codex/nic-nac-trade-hardening`,
  and expected current tip. The existing `artifacts/` and `test-results/`
  directories remained untracked and untouched.
- Read Kim's and Namecheap's current email replies only. Kim offered account
  credentials, but they were neither requested nor used; Louis had already
  signed into Namecheap.
- Attached `goforthebling.com` to the Sparkle Suite Vercel project and updated
  only the exact active GofortheBling customer record, guarded by its id,
  status, customer classification, and slug, to use that custom domain.
- At Namecheap, removed the prior root URL redirect and added exactly
  `A @ → 76.76.21.21` with automatic TTL. Did not change nameservers, email
  forwarding, ownership, contacts, or billing. Public DNS resolved to the new
  A record and Vercel reported the external-DNS configuration valid; its later
  DNS recommendation is optional and was not applied.
- Public no-auth Chrome verification passed at `https://goforthebling.com/`,
  `https://goforthebling.com/trade`, and `https://goforthebling.com/join`.
  All retained the custom hostname and rendered Kim/GofortheBling tenant
  content. No personal/admin or customer account was used, and no Suite or
  protected customer aliases were moved.
- Captured the completed migration as an Open Brain observation without
  credentials or private account data.

## September 3, 2026 - Join Team tenant-copy correction

- Louis identified a customer-visible legacy demo leak on Kim's direct
  `/join` route: the page said “Join Sparkle by Sasha” despite belonging to
  GofortheBling/Kim. The ordinary customer header intentionally hid the route,
  but direct access correctly exposed the public page and its copy still had to
  be tenant-owned.
- The template mapper now rejects a known demo team identity only when it
  conflicts with the current business name, falls back to that business name,
  generates ordinary FAQ copy from the current team and rep, and clears the
  stale generic promo. Custom team names and bespoke customer variants remain
  supported.
- Focused preview/data-scrub tests (35), Join template/route tests (17),
  changed-file lint, and the allowlisted-branch production build passed.
- Pushed `0ecc2f2c` and manually released it as Ready Vercel deployment
  `dpl_4mUvuM9HdXoYMxoS8d5z5rgZ9c7z`. Assigned only the two Suite aliases and
  `goforthebling.com`, which needed the exact fix. Bri's and Bling Kitchen's
  protected aliases were inspected and preserved on their prior deployment.
- Public no-auth Chrome smoke on `https://goforthebling.com/join` confirmed
  the title, hero, FAQ, and final CTA all identify GofortheBling/Kim and that
  no Sasha or default promo copy remains. The corrected page is left open for
  Louis. No personal/admin or customer account was used.
- Captured the decision, deployment evidence, and public verification in Open
  Brain without credentials or private account data.

## September 3, 2026 - Kim customer-site brand assets

- Louis approved the local proof for a GofortheBling `G` favicon and a
  Morganite blush/plum share card. The share copy was corrected to “Welcome to
  Kim's Live Show Site.” in the card layer without changing Kim's Site Settings.
- Focused brand-asset tests (4) passed, as did the local and Vercel production
  builds. The local renderer initially exposed that generic image routes had no
  embedded font under the current Next runtime; the released image-font helper
  now embeds the approved display font for consistent generation.
- Pushed commit `79324566` and manually deployed it as Ready
  `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH` /
  `sparkle-suite-a7xes63pg-louis-2849s-projects.vercel.app`. The exact intended
  Suite aliases and `goforthebling.com` were reassigned; no other customer alias
  was moved.
- Direct Vercel inspection confirmed all three aliases resolve to that exact
  deployment. Public live `goforthebling.com/` returned 200, and live `/icon`
  and `/opengraph-image` visually matched the approved `G` mark and possessive
  Kim wording. No account, billing, DNS, provider, or outbound-message action
  occurred. The customer public tab was read-only and left at the site root.
- Captured this release in Open Brain as an observation without credentials or
  private account data.

## September 3, 2026 - Operator onboarding audit

- Reviewed Kim's session history, repository records, and Open Brain launch
  evidence. The repeatable gaps were: independently proving actual Workspace
  access, public-site/social readiness, optional custom-domain authority and
  minimal DNS work, direct public-route copy, and customer-domain brand assets.
- Live Control Center browser review was read-only and stopped at the operator
  login screen; no personal-account test or sign-in was attempted. Source and
  existing tests confirm the Customer Database has expanded per-rep profiles,
  while the live database has no dedicated operator onboarding-checklist table.
- Strengthened `.agents/skills/sparkle-suite-rep-welcome-site` and its package
  reference with a separate operator launch ledger. It defines safe status and
  evidence rules plus the required optional-domain path. Extended the existing
  classification contract test; 4 focused tests pass.
- Pushed `aed3ce8d` (skill/reference/test only). The recommended next product
  slice is a durable, operator-only nested checklist in expanded Customer
  Database profiles; it remains a proposal pending Louis's approval for the
  data model and UI implementation. Captured the audit and proposal in Open
  Brain without credentials or private account data.

## September 3, 2026 - Customer Database onboarding ledger release

- Implemented the user-approved operator launch checklist with exact manual
  About intake prompts: origin story, live vibe, big reveal, just-for-fun
  details, and customer promise. The UI deliberately says to write About copy
  manually and not put those answers into the operator ledger.
- The owner-only PATCH route validates the fixed checklist catalog and status
  values before service-role upsert. The new table is RLS-enabled and grants
  only service-role access; reps receive no direct data access.
- `supabase db push` applied migration `20260903100000_ss_operator_onboarding_checklists.sql`.
  14 focused tests passed; `npm run build` completed. The repository-wide
  TypeScript check still reports pre-existing unrelated test-fixture errors.
- Pushed and manually released `3afa7508` as Ready deployment
  `dpl_GkNy8qnefpyYJLpfRbiwPx7wXLWz`. Assigned only `www.yoursparklesuite.com`
  and `yoursparklesuite.com`; read-only Vercel inspection confirmed Kim's
  `goforthebling.com` remains on `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH`.

## September 3, 2026 - Checklist-only correction

- Replaced the status/select, safe-note, and Save-button interface with a
  checkbox-only Customer Database checklist. The first identity-and-placement
  check was removed because onboarding is handled one person at a time.
- Short descriptions were rewritten in plain English. The About item retains
  the five approved questions and directs the operator to write the copy
  manually.
- Migration `20260903110000_ss_operator_onboarding_checkboxes.sql` is applied.
  It removes unused audit-style columns and leaves only per-item completion.
  Four focused test files (14 tests) and the production build passed.
- Commit `4cd9c5d2` is deployed as `dpl_22uiQGhTj9tmqAxeUSFPu55b5ioP`; both
  Suite aliases resolve to it and Kim's domain was verified unchanged. No
  personal account, customer record, or checklist item was toggled for smoke.

## September 3, 2026 - Internal Live Queue code lookup

- Added a read-only `live_queue` lookup to Customer Database profiles and a
  “Live Queue code” field in Contact. It displays “Not assigned” when there is
  no existing code and does not call the code-generation service.
- Focused Customer Database, account-profile service, and support-access UI
  coverage passed (24 tests), along with the production build.
- Commit `20634a06` is live as `dpl_23b8rh7pvD8YoPzh5BcCTYntu1iN`; only the
  two Suite aliases moved. The production Control Center visual check remains
  pending an approved non-personal operator session, so no Live Queue code was
  opened or copied during verification.

## September 3, 2026 - Customer Database collapsed-row cues

- Reworked customer profile summaries for fast scanning: show name first,
  then the rep's first name in parentheses. Incomplete checklists now produce
  a light amber summary background and a plain-language incomplete cue.
- Focused Customer Database/checklist/account-profile tests passed (13), as
  did the production build. No checklist state was changed for verification.
- Commit `1c431305` is live as `dpl_9WuP3ujTv99nNRFva4iB4Z513CQZ`; only Suite
  aliases moved and Kim's custom-domain alias was confirmed unchanged.

## September 3, 2026 - Accounting foundation release

- Built a deliberately disconnected accounting area for the owner-only
  Control Center. Suite and Finder have independent routes and product labels;
  each expected financial area is visibly light orange until a verified source
  is approved.
- The implementation does not query or write Stripe, payment, invoice, refund,
  customer, or expense data. It avoids presenting subscription prices as cash
  revenue.
- Focused Control Center tests passed (11 tests) and the production build
  passed. Commit `10f48a77` was pushed and manually released as
  `dpl_CcfQ2UP2c1wVSj2UNv7dJ6fsSc77`. Both Suite aliases resolve to that
  deployment; Kim's custom domain was read-only verified unchanged.

## September 3, 2026 - Projected-versus-actual accounting correction

- Louis clarified that the accounting view needs both projections and actuals
  so late payments, cancellations, refunds, and other exceptions are visible.
- The Suite projection now reads the existing owner-only client/subscription
  list and includes only active customer subscriptions with a positive stored
  recurring amount. Actual payment and expense figures remain unavailable,
  rather than being inferred from the projection. Finder remains independently
  unavailable pending its own product-specific source.
- Four focused test files (11 tests) and the production build passed. Commit
  `95272bd1` was manually released as `dpl_CyBQpBseq7sNZCJqAJ4bAhYZp8So`;
  both Suite aliases resolve to it and Kim's custom-domain alias was confirmed
  unchanged.

## September 3, 2026 - Lane accounting handoff and safe write foundation

- Used Grok Bot computer controls to consult Lane and Sam. Lane confirmed the
  shared Control Center connector targets the correct Suite endpoint but its
  mcp-remote helper retains a stale 14-tool catalog. Restarting did not refresh
  it. No connector was re-added and no credential was changed.
- Louis clarified that Lane must be able to supply verified accounting figures,
  not merely read them. Lane recommended a separate credential and an
  append-only aggregate monthly snapshot tool; shared Control Center MCP stays
  read-only because its bearer cannot distinguish one bot from another.
- Implemented the separate Lane endpoint, append-only aggregate ledger,
  latest-snapshot dashboard rendering, and dedicated bearer boundary. Focused
  tests passed (7 files, 18 tests); production build passed; migration
  20260903150000_lane_accounting_snapshots.sql applied successfully.
- Committed and pushed 9b5e463e and manually released it as Ready deployment
  dpl_BrPj6ip6Dzne1QKQJXA4G5VDy9Vf. Both Suite aliases were moved to that
  exact deployment; Kim's domain was confirmed unchanged at
  dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH.
- Secure credential provisioning was blocked before any secret was created:
  the runtime rejected generating a Vercel production write credential with a
  clipboard handoff. The Lane connector remains unconfigured and no snapshot,
  money movement, billing action, or provider action occurred.

## September 3, 2026 - Lane read-only accounting viewer released

- Lane now has a dedicated Control Center username/password login for only
  `/control-center/accounting` and its Sparkle Finder view. The role is
  server-enforced: it cannot access the Control Center home, customer data,
  messages, settings, deployments, billing/provider actions, or money flows.
- The password was entered through Vercel's interactive Secret prompt and
  delivered only to Lane's named Grok secure field; it was not added to source,
  vault, Open Brain, chat, clipboard, or a Workspace account. Lane's required
  internal Supabase Auth principal has no Google Workspace relationship,
  no Google login, and no password.
- Focused authorization/accounting tests passed (9 tests). The initial
  isolated deployment failed because `useSearchParams` lacked a Suspense
  boundary; no aliases moved. The corrected exact branch tip `34a364df` was
  released as Ready deployment `dpl_BsK4RYKN5z5MzoXAiPe1HQvhibXr`.
  Both Suite aliases resolve to it; Kim's `goforthebling.com` remains on
  `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH`.

## September 3, 2026 - Lane Accounting MCP connected

- Kept Lane's Control Center URL strictly visual and read-only. Accounting
  inspection and writes are handled by the one dedicated Lane Accounting MCP,
  not by the website login and not by the shared Control Center MCP.
- Extended the append-only aggregate snapshot ledger with projected monthly
  expenses, and exposed the remaining reconciliation totals on the accounting
  display. Added `lane_get_current_accounting_snapshot` as its harmless
  aggregate read tool; the append tool remains the only write capability.
- The dedicated credential is stored only as a SHA-256 digest in the existing
  Supabase database. The bearer was saved only in Lane's named secure connector
  field, never in source, chat, vault, Open Brain, or a Vercel secret. This
  avoids a separate hosting-provider secret surface while retaining a unique
  credential boundary.
- Migrations `20260903162000` and `20260903170000` applied successfully.
  Four focused test files passed (8 tests) and the production build passed.
  Commit `af4d5bc` was manually released as Ready deployment
  `dpl_BUGBdLnVDi4zhsWztVUWouu9ett2`; both Suite aliases resolve to it.
  Kim's `goforthebling.com` remains unchanged at
  `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH`.
- Lane confirmed the connector exposes two tools and successfully completed
  the harmless Suite snapshot read. No accounting figures were appended during
  connection verification.
- Follow-up correction: the accounting page now prefers Lane's reconciled
  projected-recurring snapshot total over the client-list fallback whenever
  Lane supplies it, so he can populate every displayed accounting total. Four
  focused tests passed again and the production build passed. Commit
  `65494de6` is the final application tip, live as
  `dpl_6EHzCeKsEMq4pKsKc8twaMJFyf3N`; both Suite aliases resolve to it and
  Kim's domain remains unchanged.

## September 3, 2026 - Accounting cents display correction

- Display-only correction: Control Center Accounting now formats integer cents
  with exactly two USD decimal places. Examples verified in tests: `12799` →
  `$127.99`, `6` → `$0.06`, `9998` → `$99.98`, and `0` → `$0.00`.
  Null source values remain `—` / Not connected rather than becoming zero.
- Applied across Suite, Finder, and the scoped accounting-viewer route because
  they share the same dashboard component. Refunds and credits now render as
  separate fields so a missing one cannot be silently converted to `$0.00`.
- No books data, source integration, MCP contract, schema, customer, billing,
  payment, refund, payout, or provider state was changed.
- Four focused accounting test files passed (9 tests) and production build
  passed. Commit `2fb315a1` is live as Ready deployment
  `dpl_FGVMmph4EBoTKmTrEJackiDvgnXj`; both Suite aliases resolve to it.
  Kim's `goforthebling.com` remains at `dpl_Fr6JTn8snhNY1jmqJFoudTt3oqWH`.
