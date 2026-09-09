# Sparkle Finder Decisions

September 9 follow-up: the full live LOC review workflow now passes at 882/344px: two private images render, exact existing variant selection completes the queued review, source readback and same-ID replay pass, and existing catalog content is unchanged. All temporary review/submission/image/user fixtures were removed. This closes the LOC queued-review gate above historical notes; it does not close unrelated customer Showcase acceptance. Finder release remains 6e9f708e / dpl_4RShdV6kTVsD9NjDuYiAFVsf1er9. See Suite vault 2026-09-09-loc-live-integration-checkpoint.md.

September 9 LOC evidence: grant the server role only SELECT on intake submissions/assets. Preserve customer RLS and private storage; do not broaden anonymous or authenticated table grants. Production behavior, including denials and fixture cleanup, is verified rather than inferred from unit tests.

## 2026-09-08 - LOC consumes scoped private evidence through Finder

Finder alone validates private review evidence against the queued submission, owner, bucket/path, MIME and size before issuing short-lived access. Suite receives a dedicated server credential; Finder stores its digest. LOC operator presentation follows LOC styling while Finder customer styling and independent systems stay intact. Local implementation is not live proof.

## 2026-08-25 - Finder Is Contained In The Suite Repository

Decision: Sparkle Finder's active workspace is `C:\Users\louis\sparkle-suite-repo\apps\finder`. It remains an independent application with its own package lock, authentication, Supabase project, Vercel project, and runtime configuration. The former standalone repository is retained as a rollback copy and is not used for new work.

Reason: Keeping both applications in one writable Git workspace lets Codex sessions work across related tasks without combining their application architecture or production systems.

Vercel project `sparkle-finder-dev` therefore connects to GitHub repository
`louis623/sparkle-suite`, uses Root Directory `apps/finder`, and tracks
production branch `codex/nic-nac-trade-hardening`. This is a source-location
decision only; Finder and Suite production resources stay separate.

## 2026-08-25 - Suite Owns Compatibility Truth; Finder Owns Safe Presentation

Decision: Sparkle Suite is the canonical source for catalog designs and exact variants, reps, shows, pending-adjusted dancer availability, and Showcase Studio resolve/confirm/replay outcomes. Sparkle Finder consumes the public catalog and availability contracts read-only, uses the separate authenticated Studio POST contract only for idempotent resolve/confirm/replay continuation, keeps its separate customer auth boundary, and never recreates pending-quantity logic or exposes a Suite Dance Floor mutation path.

Reason: A single source of truth prevents cross-product quantity drift, variant misidentification, and duplicate business logic while letting Finder remain a simple customer discovery and collection app.

## 2026-08-25 - Showcase Studio Evidence And Continuation Fail Closed

Decision: Showcase Studio sends Suite exact persisted asset identities rather than base64 images. Finder verifies the signed-in owner before tightly scoped service-role persistence, uses stable account-scoped submission UUIDs and deterministic private object paths, permits only monotonic staged recovery, and treats terminal replay conflicts as failures. Ambiguous Suite results preserve every exact candidate and always require explicit customer selection; Finder never auto-selects candidate zero.

Reason: Private photo evidence must survive temporary cross-product failures without being duplicated, overwritten, exposed, or attached to the wrong customer or variant. Exact confirmation is safer than guessing from a shared item number, stone, material, or photo.

## 2026-08-22 - Public Showcases Stay Bounded, Private, And Canonical

Decision: Public Showcase routes use allowlisted, bounded server reads with exact database summary counts and the true Hero Piece for metadata. Route reads are cached per request, and all viewer/owner/comment-author relationships honor either-direction blocks. Production Vercel aliases canonicalize to `https://yoursparklefinder.com`, while preview deployments remain available for private testing. Supabase compromised-password protection remains enabled as a launch baseline.

Reason: Collection pages must stay fast as customer data grows without weakening privacy, social-block behavior, share accuracy, or search-engine ownership of the customer domain.

## 2026-08-22 - Public Showcases Are Explicit, Bounded, And One-Way Social

Decision: Collection data is private unless the owner explicitly makes the Showcase profile and relevant pieces or Showcase Collections public. Public reads must enforce every visibility boundary plus either-direction blocks, expose only allowlisted display fields, and never expose notes or email selections. Social discovery remains one-way: customers may follow and browse bounded public highlights, but Sparkle Finder does not add customer-to-customer messaging, offers, buying, selling, or trading.

Reason: Collections gain emotional and social value when customers can show them off safely, but that value must not weaken privacy or reopen the marketplace strategy. Explicit publication, strict server-side checks, and bounded read models keep the experience simple and safe.

## 2026-08-21 - Rep Discovery Is Automatic And Finder Owns Favorites

Decision: The Reps directory automatically consumes eligible public rep profiles from Sparkle Suite. A rep does not need a Finder account, claim code, board, or scheduled show to appear. Finder claim credentials are only for a rep who wants to use Finder personally. Sparkle Finder owns customer favorite rows and aggregate favorite counts; Sparkle Suite must not supply Finder favorite totals.

Reason: Rep discovery is a shared-data integration, not a second onboarding funnel. Keeping favorite identities private inside Finder preserves the separate customer auth boundary while still allowing anonymous aggregate ranking for signed-in Finder customers.

## 2026-08-21 - Suite Controls Public Rep Visibility Fail-Closed

Decision: Sparkle Suite owns a server-managed `finder_directory_visible` flag that defaults to false. Normal real-rep provisioning enables it automatically; reviewer, demo, fixture, and reset paths explicitly keep it false. Existing accounts are not exposed merely because they have a subscription, trial, public-site slug, board, or show. Heather/BlingKitchen is the sole initial backfill based on confirmed current real usage.

Reason: The Suite database contains demo/reviewer and historical accounts that cannot be safely distinguished by subscription alone. Explicit fail-closed visibility prevents accidental public disclosure while preserving automatic population for newly provisioned real reps.

## 2026-07-04 - Bling Vault Shares The App Canvas

Decision: The signed-in Bling Vault/collection section should use the same mobile-first app canvas as the opening home and guided Find sections. It should not expand back into the older wide dashboard layout on desktop.

Reason: Louis called out that section 3 broke the new mobile-app format. Sparkle Finder should feel like one simple app surface across web and future native shells, with collection details flowing naturally after A and C instead of becoming a separate admin-style page.

## 2026-07-04 - Mobile App Preview Is The Signed-In UI Reference

Decision: The July 3 A/B/C mobile app preview is the active signed-in Sparkle Finder UI reference. A opens the app as a simple home dashboard, C is the guided `Find a Piece` flow behind the primary action, and B is the collection/Bling Vault layer customers flow into. The old May 29 locked homepage concept is not the target for this redesign pass.

Reason: Louis clarified that the A/B/C preview, not the old locked homepage concept, is the model for the future mobile-app-style experience. The web app must keep the same capabilities and plumbing while presenting customer goals first and internal feature names second.

## 2026-07-03 - Homepage Collector Stats Should Track Hunt Value

Decision: The homepage collector profile card should show `Owned`, `Wishlist`, `Diamonds`, `Unicorns`, and `Found by Sparkle Finder`. Do not use `Saved` as a homepage stat, and do not use `Featured` as a headline homepage stat.

Reason: Louis wants the stats to drive collection-building and the hunt for meaningful pieces. `Saved` is too broad to matter, and `Featured` is just a subset of owned/showcase behavior. Diamonds and unicorns are the emotional "home run" stats, and `Found by Sparkle Finder` proves the product works.

## 2026-07-03 - Found By Sparkle Finder Requires Acquisition Provenance

Decision: `Found by Sparkle Finder` should be counted from durable acquisition-source data on owned collection items. Count sources `sparkle_finder_lead` and `nic_nac_request`; do not infer Finder success from an item merely being owned or present in the catalog.

Reason: The number should be trusted as product impact evidence. Provenance must be captured when Nic-Nac or a lead flow helps a customer find a piece, otherwise the stat becomes another fuzzy vanity count.

## 2026-07-03 - Supabase Migration History Should Be Kept Clean

Decision: Supabase migration cleanup should repair migration history only after verifying live database artifacts, then apply genuinely missing additive migrations through the normal CLI path. Keep `supabase/.temp` ignored so the repo can stay linked locally without dirty files.

Reason: The live database can be correct while `supabase_migrations.schema_migrations` is wrong. Blindly replaying old migrations risks conflicts; repairing only verified history plus applying missing additive migrations restores the safe future path where `supabase db push --yes` reports `Remote database is up to date.`

## 2026-07-03 - Mobile-First Homepage Simplification And Amethyst Skin

Decision: Sparkle Finder's simplified app-style homepage should be built around `Find the pieces you love. Build your collection with Sparkle Finder.` The signed-in homepage should open to a simple home dashboard, flow into the customer's collection/Bling Vault, and use a guided `Find a Piece` path. Nic-Nac remains the helper layer, not a homepage destination. The visual direction should move toward the Sparkle Suite Amethyst customer-facing site skin. Sparkle Finder must remain a first-class website customers can log into and use in the browser; App Store and Google Play distribution is an additional target, not a replacement. The redesign must preserve existing backend plumbing, automation flows, Nic-Nac capabilities, account/collection persistence, and current feature coverage; features may move behind clearer entry points but should not be removed.

Reason: Louis found the current interface too complex and unintuitive, especially labels such as `Nic-Nac Home` and broad command grids. The product should feel simple enough for a future mobile app and should expose customer goals before internal feature names.

## 2026-06-22 - Sparkle Suite Rep Linking Uses Secret Rep ID Number

Decision: Sparkle Finder rep linking uses the private Sparkle Suite `Secret Rep ID Number`. The claim must be verified server-side against Sparkle Suite before Finder writes `is_rep`, the Suite rep id, and Rep Silver membership. Normal authenticated users must not be able to self-write rep identity columns directly.

Reason: Louis wants a durable cross-product identity for the same Nic-Nac experience without relying on email matching or public referral codes, and without weakening Sparkle Finder's separate auth boundary.

## 2026-06-20 - Active Workspace

Decision: Sparkle Finder's active Codex workspace is `C:\Users\louis\sparkle-finder-repo`.

The former binder/Open Brain folder at `C:\Users\louis\sparkle-finder` is no longer the active workspace. Durable binder content has been copied into the implementation repo so code, docs, vault memory, plans, handoffs, and skills live under one root.

Reason: Codex kept opening the lightweight binder as the workspace while the implementation repo lived elsewhere, making normal repo work look outside the sandbox and causing repeated approval prompts.

## Standing Product Auth Boundary

Each customer-facing product should keep its own auth boundary by default. Sparkle Finder customer auth should not be routed through Neon Rabbit HQ, Sparkle Suite, or another product unless Louis explicitly approves that architecture for the specific product.

## 2026-06-22 - Finder Nic-Nac Follows The OpenAI-Only Product Policy

Decision: Sparkle Finder Nic-Nac should use the same OpenAI-only model policy direction as Sparkle Suite Nic-Nac. Do not hardcode Anthropic/Haiku model IDs in Finder route files, and do not keep an unused Anthropic provider dependency for Finder Nic-Nac.

Reason: Louis wants fewer AI vendor accounts to troubleshoot and bill, and Nic-Nac should feel like one shared Sparkle ecosystem assistant rather than separate provider-specific assistants per product.

## 2026-06-22 - Linked Reps In Finder Keep Identity But Not Suite Mutation Access

Decision: When Finder knows an account is linked to a Sparkle Suite rep, Finder Nic-Nac should treat that as the same assistant relationship but keep current-surface tools limited to Sparkle Finder. Sparkle Suite workspace mutations requested from Finder should be redirected to Sparkle Suite login/opening, with context preserved in the conversation tone.

Reason: This matches Louis's expectation that reps feel like they are talking to the same Nic-Nac on both products while keeping security and troubleshooting boundaries clear.

## 2026-08-22 - Dance Floor Is The Approved Trade Vocabulary

Decision: Customer- and rep-facing copy must call the product feature the `Dance Floor` and jewelry offered there `dancers`. `Dance Floor` is always capitalized, and a `trade` remains the exchange/process. Legacy database, API, route, field, component, stable ID, and tool names stay unchanged when compatibility requires them, but must not appear in visible copy or Nic-Nac responses.

Reason: Sparkle Finder and Sparkle Suite need one clear, approved vocabulary without risking existing integrations or stored data.

## 2026-08-26 - Finder appearance is operated from the shared Control Center

Decision: Sparkle Finder uses the same named appearance preset catalog as Sparkle Suite customer sites, selected from a Sparkle Finder view inside the existing Suite Control Center. Finder consumes only the published semantic appearance contract; customer auth, application data, and deployments remain separate.

Reason: This gives Louis one place to operate both products and consistent visual choices without merging their security or runtime boundaries.

## 2026-08-26 - Outbound discovery links open in new tabs

Decision: Real HTTP(S) destinations outside Sparkle Finder open in a new tab with `noopener noreferrer`. Finder-local routes, including fixture-backed preview routes, remain in the current tab.

Reason: Customers use Finder as a stable comparison workspace while visiting multiple reps, Dance Floors, and shows. The browser should preserve their Finder search context by default.

## 2026-09-02 - Finder cost telemetry stays behind a narrow read bridge

Decision: Sparkle Finder exposes bounded Nic-Nac run-cost telemetry to the Suite owner Control Center through a dedicated bearer-protected internal GET endpoint. It does not share Finder customer auth, direct database credentials, conversation content, or mutable capabilities.

Reason: Louis needs combined operating visibility while Finder must retain its separate application, auth, data, and deployment boundaries.

## 2026-09-02 - Finder receives its own OpenAI cost boundary

Decision: Sparkle Finder production uses a dedicated OpenAI project and restricted model-request runtime key. Suite may attribute Finder provider cost only through the configured project ID and may read Finder per-run evidence only through the existing bounded bridge.

Reason: A shared provider key/project makes authoritative product attribution impossible and weakens operational isolation even when application databases and authentication remain separate.

## 2026-09-02 - Unused Finder runtime key remains untouched

Decision: Leave the first unused Finder runtime key unchanged indefinitely unless concrete evidence shows a security, billing, access, or operational problem. It is not pending cleanup. Any later revocation requires Louis's explicit authorization and a dependency audit.

Reason: The active Finder configuration is working, and speculative credential cleanup is not worth risking another setup setback.
