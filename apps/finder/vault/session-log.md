# Sparkle Finder Session Log

September 9: live evidence request exposed missing service SELECT grants. Applied only `20260909123000` to Finder project `pzksocboqauqjdtsgpdp`; authenticated signed image succeeds, mismatched assets/submissions and anonymous/public requests fail. Removed synthetic auth/submission/image fixture. Released exact Git `6e9f708e`; customer alias and landing verified. No customer records, customer auth boundary or Live Lineup changes.

## September 8, 2026 - LOC evidence adapter checkpoint

Built and tested owner/submission/asset checks and short-lived private evidence access for Suite's signed LOC bridge. Focused Finder tests: 38 across 3 files; production build passed. Native LOC named-variant review passed isolated mobile fixtures. No deployment or production secret changes. See Suite vault `2026-09-08-loc-control-center-build-checkpoint.md` for live release gates.

## 2026-08-25 - Repository Relocation Into Sparkle Suite

- With Louis's explicit follow-up approval, Vercel project
  `sparkle-finder-dev` was reconnected to `louis623/sparkle-suite`, its Root
  Directory was set to `apps/finder`, and production branch tracking was set to
  `codex/nic-nac-trade-hardening`. The former production deployment remains a
  rollback point; Finder's auth, Supabase project, environment variables, and
  domains remain separate from Suite.
- Sparkle Finder's exact Git tip `8192b11f1535e8cbc0af2c4df352ea93c0e86233`
  was imported with complete history under
  `C:\Users\louis\sparkle-suite-repo\apps\finder`. The Suite repository import
  commit is `8e12e6da2495cfd28850eec1dec53a2b96b8f797`; its second parent is the exact
  Finder tip and the imported tree hash is unchanged.
- Finder remains a separate app with unchanged source, package/lock, Next,
  Vitest, Supabase, auth, Vercel, and runtime boundaries. The old standalone
  repo remains a rollback copy and is no longer the active workspace.
- Verification from the new location passed lint, all 57 Vitest files/760
  tests, production build, strict read-only Suite contract, Nic-Nac missing-model
  guard, and local browser smoke with 20 required passes and 2 expected skips.
- Production stayed on existing deployment
  `dpl_7EsNvmCudB2fcbCirNy5WFi7UW37`; no deployment, alias, database, or account
  change was made for this repository-only move.

## 2026-08-25 - Suite Compatibility Releases 1-3 Live

- Sparkle Suite compatibility release `f3de6c15` deployed the frozen `schemaVersion: 2` catalog, batch hydration, quantity-aware availability, and Showcase Studio v2 contracts. Suite remains the canonical source for designs, exact variants, reps, shows, pending-adjusted dancer availability, and Studio resolution/continuation; Finder does not recreate or mutate those responsibilities.
- Finder Release 1 shipped in commit `0c54a32`. It added real cursor continuation, exact totals/facets, bounded batch hydration, and exact-`designId` variant preservation. The release was pushed and deployed live at the custom domain.
- Finder Release 2 shipped in commit `93107f6`. It separates rep/listing lead counts from summed physical dancer quantities, carries Suite's positive net `quantityAvailable`, excludes zero/removed/malformed inventory, and preserves read-only Dance Floor behavior. The release was pushed and deployed live at the custom domain.
- Finder Release 3 shipped in commit `b8ecf57`, followed by smoke-test fix `0613800`. The active phone-first `/silver` Studio accepts two bounded full-aspect phone photos, persists evidence privately, resolves or confirms exact variants through Suite v2, retains all exact candidates without selecting the first, and resumes temporary failures with the same owner-scoped submission identity.
- Studio requests do not send image base64 to Suite. Finder stores validated private evidence and supplies the exact persisted asset identities. Owner verification occurs through the signed-in auth client; tightly scoped service-role writes enforce deterministic paths and monotonic `draft`/`uploading`/`submitted`/`saved_pending_sync`/terminal transitions. Wrong-owner, conflicting replay, and terminal-regression attempts fail closed.
- Applied Finder-private migration `20260825143000_sparkle_finder_showcase_studio_recovery.sql`; linked remote migration history is current. The migration tightens Studio mutation privileges, adds recovery states, and enforces one asset per submission/kind without altering or duplicating shared Suite migrations.
- Release 3 deployment `dpl_34Hs61FVJmuLi4E6pMcX8zZCJSvc` reached `READY` and `https://yoursparklefinder.com` was verified. Checks passed: lint, production build, full Vitest (`56` files / `756` tests), read-only `npm run check:suite-contract:strict`, Sparkle Finder smoke (`20` required passed / `2` expected optional skips), Nic-Nac mission guard, and rendered 320px, 390px, tablet, and desktop reviews.
- Release 4 cross-product regression hardening shipped in commit `1b52f44` and deployment `dpl_GKS4RzyHxnpchfYsypE3q3UT67DR`. Sanitized fixtures cover same-item-number exact variants, three-page catalog and availability continuation, positive/zero/removed dancers, and stable-submission Studio ambiguity/replay. Strict mode now samples up to five pages and detects cursor cycles, repeated exact identities, total drift, and terminal lead/dancer mismatches without exposing opaque cursor values.
- Release 4 verification passed lint, production build, `57` Vitest files / `760` tests, strengthened live strict contract verification, Sparkle Finder smoke (`20` required passed / `2` expected optional skips), Nic-Nac guard, independent review, custom-domain `200`, and empty recent Vercel runtime errors. No positive production Studio mutation/replay was run; that check remains deferred until Louis designates a demo account, synthetic/demo data, and cleanup procedure.

## 2026-08-25 - Sparkle Suite Dance Floor Compatibility Gate

- Published `docs/plans/2026-08-25-suite-dance-floor-compatibility-plan.md` in Finder commit `48a001c`, pushed it, and deployed production as `dpl_4gnt5YC3t4R2WH5ucufDCUasTLaq`; the deployment was `READY`, aliased to `https://yoursparklefinder.com`, returned `200`, and had no recent runtime errors.
- Audited the active Sparkle Suite implementation at branch `codex/nic-nac-trade-hardening`, commit `56a87a3fe3bd86702dd9096da261f41ea52400c3`, using three read-only contract lanes for catalog, availability, and Studio. No Suite files or live customer data were changed.
- Confirmed three upstream gates: catalog has no cursor/page metadata, exact totals, or batch hydration; availability exposes listing rows rather than pending-adjusted physical dancer quantity; and Studio does not expose exact candidate continuation or durable stage-aware idempotency.
- Created `docs/handoffs/2026-08-25-suite-finder-compatibility-prerequisites.md` as an implementation-ready Suite handoff. It preserves mixed-version compatibility, exact variant identity, legacy `RBP` normalization, existing availability eligibility, public-query bounds, and Suite ownership of quantity, replay, and canonical-photo validation.
- This gate was later satisfied by Suite compatibility release `f3de6c15`; the original finding is retained here as the reason Finder did not fabricate pagination, calculate pending reservations, trust caller-declared photo approval, or invent an ambiguous-variant continuation protocol.

## 2026-08-22 - Showcase Quality Hardening And Launch Pass

- Completed the five approved hardening releases in order: public Showcase privacy/RLS (`2bf00cc`), public routes and owned-only rarity semantics (`61ddb23`), phone-first owner management (`1b2643b`), copy/state/feedback polish (`d522c19`), and bounded block-aware public reads (`383cbf7`).
- Public Showcase services now use explicit safe-field allowlists, exact route-specific reads, stable keyset pagination, bounded piece/collection/comment windows, batched collection and author lookups, per-request React caching, exact aggregate totals, and the true Hero Piece as the share/metadata cover even when it is outside the first visible page.
- Privacy checks cover profile, Showcase, piece, collection, comment, follow, and either-direction block visibility. Raw customer notes and account email are not exposed publicly. Production fixture fallback remains disabled.
- Applied additive migrations `20260822210000_sparkle_finder_showcase_public_read_hardening.sql`, `20260822220000_sparkle_finder_owned_rarest_reveals.sql`, and `20260822230000_sparkle_finder_bounded_showcase_reads.sql`; the linked remote database reports current migration parity. The bounded summary RPC is service-role-only.
- Enabled Supabase compromised-password protection and confirmed its security-advisor warning is gone. Eight remaining authenticated `SECURITY DEFINER` advisor warnings are intentional owner-scoped or bounded app RPCs. The remaining 44 RLS-init-plan and one overlapping-policy performance warnings are future scale cleanup, not a current privacy bypass.
- Added a production canonical-domain guard in commit `885e26d`. `https://sparkle-finder-dev.vercel.app` permanently redirects to the same path/query at `https://yoursparklefinder.com`; `www` also resolves to the apex, while private preview deployments remain usable.
- Verification passed: lint; focused route/privacy/auth/canonical tests; full Vitest suite (`52` files, `640` tests); production build; `git diff --check`; full release smoke (`19` required passed, `2` optional skipped); 320px, 390px, and desktop rendered reviews; live route/domain checks; and no recent Vercel runtime errors. Latest deployment `dpl_5i3EPnnTDM2Yg1jFNZzqJ8oZLB34` is `READY` and aliased to the customer domain.
- No production customer data was created or changed. The production collection table had no rows during the read-only launch audit, so a positive public Showcase metadata check and signed-in mutation exercise remain designated-demo-data follow-ups.

## 2026-08-22 - Collection Showroom And Social Showcases

- Completed all five approved collection-value releases: persisted public Showcases, a richer Collection showroom with durable Hero Piece selection, owner-managed reveal stories and Showcase Collections, native/clipboard sharing with canonical metadata, and bounded Followed Showcases discovery.
- Public Showcase reads now use persisted Supabase data with strict field allowlists and explicit profile, Showcase, piece, collection, and bidirectional-block visibility checks. Production fixture fallback is disabled; the smoke-only fixture flag is confined to the local smoke runner.
- The signed-in Collection experience now prefers personal photos, supports All/Owned/Wishlist/Diamonds/Unicorns/Found by Sparkle Finder filters, serializes only the first 12 mosaic pieces, and fetches additional bounded pages through an authenticated owner-scoped server action.
- Silver customers can set public/private Showcase visibility, handle and tagline; create, edit, and delete Showcase Collections; assign pieces; edit reveal stories and personal photos; mark Rarest Reveal; and make exactly one owned item the Hero Piece. Owner mutations derive identity from the authenticated session and Silver membership instead of client-supplied owner IDs.
- Sharing uses the device share sheet when available and clipboard fallback otherwise. Public Showcase, Showcase Collection, and Reveal Spotlight routes expose custom-domain canonical URLs plus route-specific SEO/social metadata only after public visibility checks.
- Followed Showcases shows at most 12 newest public highlights from followed collectors, defaults the UI to six, excludes private-note-only pieces and either-direction blocks, and shows an honest empty state instead of fabricated production activity.
- Applied migrations `20260822170000_sparkle_finder_single_hero_piece.sql` and `20260822193000_followed_showcase_highlights.sql`; a second `supabase db push --yes` reported the remote database was up to date.
- Verification passed: lint; full Vitest suite (`44` files, `565` tests); production build; `git diff --check`; full Playwright release smoke (`18` passed, `2` optional skipped); and rendered 390px/1440px checks for Collection, Silver owner tools, and Followed Showcases with no horizontal overflow.
- Pushed commit `85f786b` and deployed it Ready as `dpl_ZaPVexp3AWvtK75DuHLkdMvoNmLm`, aliased at `https://yoursparklefinder.com`. Live read-only checks confirmed the Coming Soon page, Google/email sign-in, protected account gates, and no browser console errors. The available browser session was signed out, so no production customer data was mutated and a signed-in live visual pass remains a designated-demo-account follow-up.

## 2026-08-22 - Dance Floor Vocabulary Alignment

- Created `docs/plans/2026-08-22-collection-showcase-value-plan.md` to turn the five collection/social value ideas into five independently deployable releases: real persisted public Showcases, a stronger visual Collection showroom with durable Hero Piece selection, easy reveal-story and Showcase Collection management, phone-friendly sharing with public metadata, and bounded followed-Showcase discovery. The plan preserves privacy/RLS, mobile-first layout, existing backend capabilities, one-way safe social behavior, and the no-marketplace boundary.
- Completed a second, stricter terminology audit focused on Nic-Nac scripting, model prompts, tool descriptions/results, memory normalization, accessibility labels, manual smoke/training copy, auth copy, library availability labels, Showcase lead copy, and customer-facing regression tests.
- Replaced remaining vague or legacy-facing labels with `dancer`, `dancers`, or `dancer leads`, including Nic-Nac confidence labels and screen-reader copy. Added an explicit model rule that compatibility fields such as `availableListingCount`, `listingId`, `boardItemCount`, and `repBoardUrl` are internal only and must be translated before Nic-Nac responds.
- Expanded legacy-memory normalization and copy guardrails to catch `board context`, `board data`, `board details`, `board shortcuts`, `board inventory`, `board matches`, `board paths`, and `board links` in addition to the original banned terms.
- Second-pass verification passed: focused terminology/Nic-Nac/route tests (`164`), full Vitest suite (`39` files, `532` tests), lint, production build, `git diff --check`, and a final active-source terminology scan. Remaining board/listing names are compatibility recognizers, stable routes, API/tool names, types, database fields, payload keys, or test descriptions of internal behavior.
- Audited active UI, state copy, customer legal content, manual smoke instructions, Nic-Nac prompts/tool descriptions/results, tests, and current project memory for legacy trade terminology.
- Standardized the feature name to `Dance Floor` and its inventory to `dancers`, while preserving compatibility identifiers such as `/rep-boards`, `RepBoardListing`, `listingId`, database fields, URLs, and the `find_rep_board_availability` tool name.
- Added copy guardrails and prompt-memory normalization so legacy input can still be understood without leaking legacy terminology into customer- or rep-visible responses.
- Verification passed: focused terminology/Nic-Nac/route tests (`196`), full Vitest suite (`39` files, `532` tests), lint, final focused route/copy tests (`134`), and the production build.

## 2026-08-21 - Bulletproofed The Automatic Reps Integration

- Completed the missing Sparkle Suite half of the automatic Reps integration. Suite commit `7d373f44` added the public Reps route, a fail-closed `finder_directory_visible` flag, service-role-only bounded directory RPC, safe current/next-show selection, canonical Suite links, stale-show expiry, and provisioning rules that automatically include real reps while explicitly excluding reviewer/demo accounts.
- Applied Suite migration `20260821191500_ss_finder_rep_directory_visibility.sql` and directly verified the visibility row, RPC output, indexes, guard trigger, and execute permissions. Only Heather/BlingKitchen was enabled because read-only production evidence matched Louis's description of the one current real rep setting up Dance Floor data; other existing accounts remain hidden until their public intent is confirmed.
- Pushed Suite commit `7d373f44` and deployed it Ready as `dpl_AwjMxR9w5C3DmMvtMeuZBWn94Fym` with both `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com` attached. The live endpoint returns JSON `200` with Heather, canonical site and `/trade` links, no show, and no private fields; `query=demo` returns a healthy empty array and malformed limits return JSON `400`.
- Finder's cross-product contract checker now passes with `REPS=1`. Suite focused integration tests passed (`77`), lint and production build passed, and Vercel's production error-log scan returned no errors. The broader Suite suite still has unrelated pre-existing stale assertions outside this integration.
- Hardened Finder's Playwright release smoke so its Reps check can no longer pass on preview fixtures when the live integration is expected: it must render Heather/BlingKitchen and must not render Lindsay/Sierra. The production build and full browser smoke passed (`18` passed, `2` optional checks skipped), and the live-data Reps screen was visually reviewed at desktop and 390px phone widths. The existing production browser session was signed out, so the live custom domain honestly verified the anonymous account gate; no personal/customer account state was changed.

- Re-audited the live integration and confirmed the Finder adapter existed, but the live Sparkle Suite `/api/public/finder/reps` route returns `404` HTML. The old health script did not check Reps and therefore gave a false green.
- Added explicit Rep Directory states: `ready`, healthy `empty`, and `unavailable`. The UI now gives honest automatic-population, search-miss, filter-empty, and retry-later messages instead of treating a broken API as no reps.
- Turned the old visual status chips into working All, Live now, Live today, Upcoming, and Favorites filters. Search preserves the active view.
- Hardened the Suite response adapter for malformed payloads, duplicate IDs, unsafe URLs, invalid shows, stale shows, no-board/no-show reps, and upstream search.
- Moved aggregate favorite counts fully to Finder Supabase with a bounded authenticated count-only RPC. Count-read failures are distinct from honest zeros, and the UI hides favorite ranking claims/counts during a count outage.
- Added database hardening for rep-id length, precise table grants, the rep-id index, and RLS enforcement of the five-rep Free limit. Verified the deployed permissions, constraint, index, and policy directly.
- Favorite saves now verify the rep against the current Suite directory and persist canonical directory data instead of trusting hidden form fields.
- Removed broken preview avatar paths so preview reps use the initials fallback without 404s.
- Verification before commit: lint passed; focused Reps tests passed (`144`); full suite passed (`39` files, `529` tests); production build passed; mobile 390px and desktop rendered checks passed with no horizontal overflow or console errors. The corrected live Suite contract check fails as expected until the missing Suite endpoint is deployed.
- Commit `871d805` was pushed and deployed Ready as `dpl_5jUiewmWKyqiPrjgCvJi8Eqmu9Qd`, with both `https://yoursparklefinder.com` and `https://sparkle-finder-dev.vercel.app` attached. Live route checks returned `200`, the custom-domain anonymous Reps gate rendered without browser errors, and the full Playwright smoke passed (`18` passed, `2` optional live-data checks skipped) after stale homepage assertions were aligned with the approved coming-soon landing.
- Reconfirmed the live Suite Reps route still returns `404` HTML, then added `docs/handoffs/2026-08-21-sparkle-suite-reps-endpoint.md` with the exact public payload, eligibility/privacy rules, search/limit behavior, required Suite tests, rollout sequence, and Finder acceptance gate needed to finish the cross-repo integration without reintroducing manual Finder onboarding.

## 2026-07-04

- Aligned the Bling Vault section with the mobile-first signed-in app layout after Louis pointed out section 3 still looked like the older wide web dashboard:
  - Changed the Bling Vault wrapper from the old `max-w-[112rem]` dashboard width to the same app canvas scale used by the home and Find sections (`max-w-[34rem]` on mobile, `lg:max-w-[56rem]` on desktop).
  - Stacked Hero Piece, Wishlist, and mosaic content into the app flow instead of a wide side-by-side dashboard composition; tightened empty/fixture states and collection stat cards so they read like mobile app panels.
  - Added route regression assertions blocking the old wide `max-w-[112rem]` and `xl:grid-cols` layout from returning in the Bling Vault markup.
  - Verification passed: `npm run lint`, focused route tests (`90` tests), full `npm run test` (`38` files, `515` tests), production `npm run build`, local production signed-in mobile/desktop Playwright layout checks with no console warnings/errors, and full `npm run smoke:sparkle-finder` (`18` passed, `2` optional checks skipped).
  - Deployed commit `521589b` as Vercel deployment `dpl_3Dox4Dp6qvNx173ddcYoGGQi1nmy`, aliased at `https://sparkle-finder-dev.vercel.app`. Vercel inspect shows `READY`, and live Chromium checks returned `200` for `/` and `/auth/sign-in`.

- Added visible sign-out controls after Louis found he was still signed in with no obvious way out:
  - Signed-in desktop navigation now shows a `Sign out` link next to the account status.
  - The authenticated Account page now shows a `Sign out` button near the page title so mobile users can tap `Me` then sign out.
  - Disabled Next.js prefetch on both sign-out links. Full smoke initially caught that a GET `/auth/sign-out` link could be prefetched and clear the preview auth cookie just by being visible; prefetch is now off so sign-out happens only on click/tap.
  - Verification passed: focused route/account tests, `npm run lint`, full `npm run test` (`38` files, `515` tests), production `npm run build`, and full `npm run smoke:sparkle-finder` (`18` passed, `2` optional checks skipped).
  - Deployed commit `63e055d` as Vercel deployment `dpl_7HEfccnpkPWKN56vfuaQ4ocpez1w`, aliased at `https://sparkle-finder-dev.vercel.app`. Live logged-out check still confirms the account-gated public landing is active.

- Added the account-gated public landing for Sparkle Finder:
  - Replaced the anonymous `/` marketing/product-tour homepage with a simple Amethyst landing/sign-in gate: `Find the pieces you love.`, `Build your collection with Sparkle Finder.`, `Free or Silver account required.`, `Create free account`, and `Sign in`.
  - Kept signed-in app behavior intact; authenticated users still land in the mobile-first Sparkle Finder app home with preserved Finder flows.
  - Removed the old logged-out feature tour from `/`, including `Find it, favorite it, show it off.`, public feature cards, public membership tier block, and broad tool previews. Anonymous customers now must create/sign in before seeing product surfaces.
  - Updated the shared hub sign-in wall CTA from `Start free Silver trial` to `Create free account` so gated routes align with the free-or-Silver account rule.
  - Verification passed: TDD red/green focused route tests, `npm run lint`, full `npm run test` (`38` files, `515` tests), production `npm run build`, full `npm run smoke:sparkle-finder` (`18` passed, `2` optional checks skipped), desktop/mobile screenshot review, Vercel inspect, and live route checks for `/`, `/reps`, `/library`, `/auth/sign-in`, and `/auth/sign-up`.
  - Deployed commit `eda1a6f` as Vercel deployment `dpl_94RcwTnZgadnTdPh5TsWXtSNBJ3b`, aliased at `https://sparkle-finder-dev.vercel.app`. Live root check confirmed the new headline/account gate are present and old public landing copy/feature tour are absent.

- Realigned the signed-in Sparkle Finder homepage to the July 3 A/B/C mobile app preview:
  - A: the app now opens on a simple Amethyst home card: `Find the pieces you love. Build your collection with Sparkle Finder.`
  - C: `Find a Piece` is a guided flow with simple choices first, Nic-Nac as the helper layer, and advanced routes tucked behind `More ways to look`.
  - B: the Bling Vault collection layer now carries the customer profile cue, `Owned`, `Wishlist`, `Diamonds`, `Unicorns`, `Found by Sparkle Finder`, Hero Piece, Wishlist rail, and lazy-loading mosaic.
  - Primary app navigation is now `Home`, `Find`, `Collection`, `Reps`, `Me`; Library remains reachable from A and C but is not a top-level app tab.
  - Moved the shared hub chrome helper out of the App Router layout file so production builds are not affected by test-only exports, and hardened smoke cleanup against stale `.next/dev` generated types.
  - Preserved existing backend plumbing, Nic-Nac route/tool behavior, collection persistence, Reps, Library, Wishlist, Live Shows, Dance Floor, Favorites, Collectors, Silver Studio, auth/account, and legal routes.
  - Verification passed: subagent review issues addressed, `npm run lint`, focused route tests (`90` tests), full `npm run test` (`38` files, `515` tests), `npm run build`, `npm run smoke:sparkle-finder` (`18` passed, `2` optional live/API checks skipped), and signed-in mobile/desktop A/B/C screenshots reviewed.
  - Deployed Finder production `dpl_gdKzhuuCqeKJm9cVqCX6ZDefZTGT`, aliased at `https://sparkle-finder-dev.vercel.app`, and live-checked `/`, `/reps`, `/library`, and `/auth/sign-in` with `200 OK`.

## 2026-07-03

- Added the simple customer-facing Reps main tab:
  - Added `Reps` to the primary Sparkle Finder app navigation and created `/reps` as a signed-in hub route.
  - Built a mobile-first Reps directory with search, status chips, small profile/avatar treatment, state badges, next-show timing, View Rep links, Dance Floor links when a compatible URL is available, and existing favorite-rep controls.
  - Added a Sparkle Suite public Finder API adapter for `/api/public/finder/reps?limit=200`, with preview/test fixture fallback and mapping into existing Finder rep, live-show, and board-link models.
  - Revalidated `/reps` after favorite/unfavorite actions so the new tab stays in sync with favorite reps.
  - Fixed `CustomerShowTime` browser hydration by replacing the invalid `Intl.DateTimeFormat` `dateStyle`/`timeStyle` plus `timeZoneName` combination with explicit date/time fields.
  - Verification passed: focused Reps route tests, focused catalog-service adapter tests, `npm run lint`, full `npm run test` (`38` files, `512` tests), `npm run build`, and `npm run smoke:sparkle-finder` (`18` passed, `2` optional API checks skipped), including desktop/mobile Reps screenshots.

- Refined the Reps tab into a list-first directory:
  - Moved the large search surface below the ranked list so customers land on the reps first while still retaining search.
  - Added aggregate favorite counts to Reps directory cards and sorted reps by highest favorite count first, with show status/time as the tie-breaker.
  - Extended the Sparkle Suite public Reps adapter to accept `favoriteCount` from the feed and added fixture aggregate counts for preview/test mode.
  - Verification passed: focused Reps route/catalog tests, `npm run lint`, full `npm run test` (`38` files, `514` tests), `npm run build`, and `npm run smoke:sparkle-finder` (`18` passed, `2` optional API checks skipped), with refreshed desktop/mobile Reps screenshots reviewed.

- Added the first single-app-shell mobile-first refinement:
  - Replaced the signed-in mobile header menu with a persistent app-style bottom tab bar for `Home`, `Library`, `Find`, `Reps`, and `Me`.
  - Kept desktop on the same core destinations through the top navigation while explicitly hiding the phone tab bar at desktop widths.
  - Narrowed the authenticated homepage hero and Find panel into a shared mobile-first app canvas so the desktop web app reads like the same product expanded onto a wider screen.
  - Added safe bottom padding to authenticated home and hub routes so the tab bar does not hide page content on phones.
  - Preserved the existing feature routes, Bling Vault, collection stats, Reps directory, Nic-Nac helper entry points, and backend plumbing.
  - Verification passed: focused route test, `npm run lint`, full `npm run test` (`38` files, `514` tests), `npm run build`, and `npm run smoke:sparkle-finder` (`18` passed, `2` optional API checks skipped), with refreshed Reps desktop/mobile screenshots reviewed.

- Corrected the signed-in app shell footer mismatch:
  - Removed the full marketing/legal site footer from signed-in authenticated home and hub routes so app pages end like app screens instead of a website landing page.
  - Kept the footer on public and anonymous/sign-in-wall surfaces where legal/ecosystem links still belong.
  - Updated route and smoke tests to enforce that signed-in app surfaces do not append `.sparkle-finder-site-footer`.
  - Verification passed: focused route test (`90` tests), `npm run lint`, full `npm run test` (`38` files, `515` tests), `npm run build`, and `npm run smoke:sparkle-finder` (`18` passed, `2` optional API checks skipped), with refreshed Reps mobile screenshot reviewed.

- Implemented the mobile-first Sparkle Finder homepage overhaul:
  - Replaced the signed-in command-center opening with a simple app home built around `Find the pieces you love. Build your collection with Sparkle Finder.`
  - Simplified primary app navigation to `Home`, `Library`, `Find`, and account status while keeping advanced feature routes reachable from the guided `Find a Piece` panel.
  - Moved live shows, the Dance Floor, favorite reps, collectors, Photo Setup, missing-piece flow, and Nic-Nac help into contextual find paths without removing backend plumbing or feature routes.
  - Applied the Sparkle Suite Amethyst customer-site direction through shared theme tokens, app nav/footer surfaces, CTAs, Nic-Nac accents, and the authenticated homepage collection layer.
  - Preserved collection stats, Bling Vault lazy loading, Wishlist and owned-item persistence, the Nic-Nac `FindThisForMe` helper, customer profile/TikTok details, and route/account gating behavior.
  - Added the active Silver missing-piece anchor to the Nic-Nac curator workspace so `/silver#showcase-studio` lands on the current missing-piece helper area.
  - Removed the old `FinderCommandCenter` component after replacing its capabilities with `SimpleFinderHome` and `FindPiecePanel`.
  - Stabilized the growing Next route test suite by raising Vitest's default test timeout to `20_000` ms; the affected tests were timing out during full-suite transforms while passing in isolation.
  - Verification passed: `npm run lint`, `npm exec vitest run tests/sparkle-finder/routes.test.ts`, plain `npm run test` (`38` files, `508` tests), `npm run build`, `npm run smoke:sparkle-finder` (`17` passed, `2` optional API checks skipped), direct homepage smoke earlier in the final pass (`11` passed, `2` skipped), authenticated 390/430/768/1440 viewport screenshots, and route pressure checks for 11 Silver-preview routes plus 7 anonymous gates.

- Updated the homepage collector profile statistics:
  - Replaced the weak `Featured` and `Saved` homepage stats with `Diamonds`, `Unicorns`, and `Found by Sparkle Finder`, while keeping `Owned` and `Wishlist`.
  - Added durable collection acquisition tracking on `sparkle_finder_collection_items` with `acquisition_source`, `acquisition_context`, and `acquisition_marked_at`.
  - Finder-assisted finds count only owned collection items whose source is `sparkle_finder_lead` or `nic_nac_request`; Wishlist saves default to `wishlist`, and normal owned saves default to `manual`.
  - Wired acquisition source through collection persistence, Silver collection actions, Nic-Nac collection save/read tools, authenticated homepage Bling Vault data, fixtures, and tests.
  - Applied migration `20260702235634_collection_acquisition_source.sql` to the linked `sparkle-finder-auth` Supabase project (`pzksocboqauqjdtsgpdp`) using `supabase db query --linked --file ...`, then verified the new columns and index remotely. Plain `supabase db push` still hits the existing historical migration-history mismatch and tries to replay older migrations.
  - Verification passed: `npm run lint`, focused profile/acquisition tests (`133` tests), full `npm run test` (`38` files, `507` tests), local `npm run build`, and `npm run smoke:sparkle-finder` (`17` passed, `2` skipped).
  - Committed and pushed `786df5f feat: update collector profile stats`.
  - Deployed Finder production `dpl_GX6Dzj8DAM61ERf59JHbFTRwUKcf`, aliased at `https://sparkle-finder-dev.vercel.app`; Vercel inspect shows `READY`, and live checks returned `200` for `/`, `/library`, and `/auth/sign-in`.

- Cleaned up Sparkle Finder Supabase migration history:
  - The live `supabase_migrations.schema_migrations` table was empty even though several early migrations were already reflected in the database, which caused `supabase db push` to replay old SQL.
  - Verified live artifacts, repaired already-present migrations as applied, then ran `supabase db push --yes --include-all` to apply the genuinely missing additive migrations for Showcase social collections, customer memory, social favorites/follows/blocks/reports, block-boundary policies, and rep-claim profile/grant metadata.
  - Normalized the old short local migration filename from `20260613_sparkle_showcase_social_collections.sql` to `20260613000000_sparkle_showcase_social_collections.sql`, repaired the remote history row to match, and confirmed `supabase db push --yes` now reports `Remote database is up to date.`

## 2026-06-22

- Cleaned Finder lint health:
  - Replaced the local-time `setState`-inside-effect patterns in `components/live/CustomerShowTime.tsx` and `components/nic-nac/FinderNicNacChatbot.tsx` with a shared hydration-safe `useClientFormattedTime` hook based on `useSyncExternalStore`.
  - Cleared the remaining lint warnings by documenting the intentional direct catalog `<img>` fallback, removing dead Showcase preview state, avoiding a JSX `satisfies` expression that upset the JSX lint utility, and removing unused test/script parameters.
  - Verification passed: `npm run lint` is quiet, `npx eslint . --max-warnings=0` is quiet, full Finder Vitest suite passes (`37` files, `488` tests), and production `next build` passes locally and in Vercel.
  - Deployed Finder production `dpl_2ysBkLzjEXBUSzas94nmbMpA3i5s`, aliased at `https://sparkle-finder-dev.vercel.app`, and confirmed Vercel inspect shows `READY` with the stable alias attached.
  - Live public checks passed for `/`, `/library`, and `/auth/sign-in`; the secured internal telemetry smoke route returned `401` without a bearer token as expected.

- Added Finder Nic-Nac owner save/mutation tools:
  - Added `save_my_collection_item`, an explicit owner-scoped collection/Wishlist save tool backed by existing Sparkle Finder persistence. It trims and verifies the catalog item with fixture fallback disabled before saving, writes using the signed-in customer id, supports owned/wishlist/private-note states, highlight flags, notes, and optional Showcase Collection assignment, and returns a `saved` result only after persistence succeeds.
  - Added `save_my_showcase_piece`, an explicit owner-scoped Showcase piece save tool backed by existing Showcase persistence. It verifies the catalog item before saving and supports Showcase status, public/private piece visibility, reveal story, note, and rarest-reveal flag.
  - Added `update_my_profile`, an explicit profile text/visibility save tool backed by existing profile persistence. It preserves unspecified display name, bio, TikTok handle, and visibility from current account context and keeps profile photo changes in the account upload flow.
  - Wired the new save tools through Finder intent policy, route active tool exposure, route telemetry, and prompt-visible active tool names.
  - Verification passed: failing tests were added first, focused Finder Nic-Nac tools/policy/curator/route tests now pass (`44` tests), full Finder Vitest suite passes (`37` files, `488` tests), and production `next build` passes locally and in Vercel.
  - Deployed Finder production `dpl_2ykVW81bq6FhEzoNAyad8nQDDhHP`, aliased at `https://sparkle-finder-dev.vercel.app`, and confirmed Vercel inspect shows `READY` with the stable alias attached.
  - Live public checks passed for `/`, `/library`, and `/auth/sign-in`; the secured internal telemetry smoke route returned `401` without a bearer token as expected.
  - `npm run lint` still fails on pre-existing unrelated React hook lint errors in `components/live/CustomerShowTime.tsx` and `components/nic-nac/FinderNicNacChatbot.tsx`, plus warnings.
  - Remaining follow-up: full Studio file-intake workflow exposure through app-owned uploaded file state, attorney/final policy review, broader marketing/onboarding positioning, and eventually an authenticated deployed Nic-Nac save smoke when local smoke credentials are available.

- Added Finder Nic-Nac collection/Showcase/Studio/profile read-status parity:
  - Added `list_customer_collection`, a bounded owner-scoped collection read tool that reads persisted `sparkle_finder_collection_items`, enriches rows with catalog context, and returns state counts, note presence, visibility, Showcase status, rarest-reveal flags, and reveal-story presence.
  - Added `summarize_my_showcase`, a bounded owner-scoped Showcase readiness tool that reads public/private piece counts, rarest reveal count, reveal-story count, and Showcase collection summaries.
  - Added `get_showcase_studio_requirements`, a non-mutating Studio readiness tool that reports required photo roles, max photo size, and whether the Suite intake endpoint appears configured without submitting missing-piece intake from chat.
  - Added `read_my_profile_status`, a current-account profile status tool that reports tier, membership state, visibility, bio/TikTok/photo presence, and linked Suite rep identity when present.
  - Wired these tool names through Finder intent policy, `/api/finder/nic-nac` active tool exposure, current account context, and route telemetry.
  - Verification passed: focused Finder Nic-Nac tools/policy/curator/route tests (`39` tests), full Finder Vitest suite (`37` files, `483` tests), and production `next build`.
  - Deployed Finder production `dpl_9rdCEsULSz7DUEFFw59aJBbKARfM`, aliased at `https://sparkle-finder-dev.vercel.app`, and confirmed Vercel inspect shows `READY` with the stable alias attached.
  - Live public checks passed for `/`, `/library`, and `/auth/sign-in`; the secured internal telemetry smoke route returned `401` without a bearer token as expected.
  - `npm run lint` still fails on pre-existing unrelated React hook lint errors in `components/live/CustomerShowTime.tsx` and `components/nic-nac/FinderNicNacChatbot.tsx`, plus warnings.
  - Deployed authenticated Nic-Nac chat smoke still needs a local/available authenticated smoke credential path; the stable alias and unauthenticated protection checks are verified.

- Added Finder Nic-Nac availability/live-show tool parity:
  - Added the compatibility-named `find_rep_board_availability`, a bounded read-only tool backed by the existing Sparkle Suite public Finder availability API service. It returns requested item context, exact leads first, same collection/type fallback leads second, public customer-site links, dancer photo context, and next-show timing without mutating Sparkle Suite Dance Floors.
  - Added `list_upcoming_live_shows`, a bounded read-only tool backed by the existing Sparkle Suite public Finder live-shows API service. It returns public show id, show name, rep first name, start time, status, and customer-site link for timing/discovery only.
  - Wired the `availability` intent through tool policy, active tool names, route prompt exposure, and telemetry so “who has this / next show” Finder turns can use real discovery tools while Suite workspace mutation requests remain blocked on the Finder surface.
  - Verification passed: focused Finder Nic-Nac tools/policy/curator/route tests, full Finder Vitest suite (`37` files, `476` tests), and production `next build`.
  - Deployed Finder production `dpl_Bj2YRSp9evCtTEzmR2iD7hmybUHu`, aliased at `https://sparkle-finder-dev.vercel.app`, and confirmed Vercel inspect shows `READY` with the stable alias attached.
  - Live public checks passed for `/`, `/library`, and `/auth/sign-in`; the secured internal telemetry smoke route returned `401` without a bearer token as expected.
  - Deployed authenticated Nic-Nac chat smoke was blocked because production preview auth did not issue a cookie and `SPARKLE_FINDER_INTERNAL_SMOKE_TOKEN` is not available in this terminal. A real authenticated smoke or secured telemetry smoke still needs Louis-provided/local smoke credentials.

- Added baseline Nic-Nac AI and memory disclosures:
  - Updated Finder privacy policy and terms to disclose Nic-Nac AI assistance, memory, telemetry/tool context, linked-rep context, possible bounded Suite/Finder memory sharing for linked reps, operator/Lab review for support and quality, model/service-provider processing, sensitive-info caution, surface-gated tool access, output review responsibility, and off-mission/excessive-use limits.
  - Updated Finder signup and account privacy acknowledgment copy so Silver users see that Nic-Nac AI assistance and memory may use account, collection, Showcase, Wishlist, request, linked-rep, conversation, and saved memory details to provide Finder/Silver support.
  - Verification passed: focused Finder route/legal tests, full Finder Vitest suite (`37` files, `472` tests), and production `next build`.
  - Deployed Finder production `dpl_7Ao34Wu45BvhCmyCeXDWjn6T4NTE`, aliased at `https://sparkle-finder-dev.vercel.app`, and live-checked `/auth/sign-up`, `/privacy-policy`, and `/terms-and-conditions` for the new disclosure text.
  - Remaining launch-readiness caveat: this is a product disclosure baseline, not attorney-approved legal advice. Attorney/final policy review and broader marketing/onboarding positioning remain.

- Added the secured Finder Nic-Nac telemetry runtime smoke:
  - Added token-gated internal route `/api/internal/finder/nic-nac-telemetry-smoke` and script `npm run smoke:finder-telemetry-runtime`.
  - The smoke uses Vercel production server-side secrets, creates a temporary confirmed Finder auth user, exercises the actual telemetry persistence helpers for a mission redirect and completed run, verifies conversations/messages/runs, and cleans up telemetry rows plus the auth user.
  - Rotated `SPARKLE_FINDER_INTERNAL_SMOKE_TOKEN` in Vercel Production as a sensitive env var, deployed Finder production `dpl_8tjDSHhUZ2cfvrJtQM61yAXAtNZa`, and confirmed `https://sparkle-finder-dev.vercel.app` points at that deployment.
  - Deployed runtime smoke passed with row counts `{"conversations":2,"messages":4,"runs":2}`, checks `completedRun`, `conversations`, `messages`, and `redirectedRun` all true, cleanup `ok:true`, and residual counts at zero.
  - Protection check passed: the internal smoke route returns `401` without the bearer token.
  - Verification passed after cleanup hardening: focused smoke route/script tests, full Finder Vitest suite (`37` files, `472` tests), and production `next build`.

- Added Finder Nic-Nac durable conversation/run telemetry in code:
  - Added migration `20260622173000_finder_nic_nac_conversation_telemetry.sql` for `sparkle_finder_nic_nac_conversations`, `sparkle_finder_nic_nac_messages`, and `sparkle_finder_nic_nac_runs`, with owner-readable RLS and service-role writes.
  - Added fail-open route persistence for `/api/finder/nic-nac`: mission redirects write zero-token `redirected` rows, model-backed streams write `started` rows and complete/fail rows with model policy, tool intents, memory counts, token usage, latency, and optional env-based cost estimates.
  - Added `scripts/smoke-finder-linked-runtime.ts` plus `npm run smoke:finder-linked-runtime` to create a temporary confirmed Finder user, sign in through the deployed site with Playwright, claim a Secret Rep ID, verify Finder DB rows, call linked Nic-Nac, verify telemetry, and clean up.
  - Verification passed locally: full Finder Vitest suite (`36` files, `470` tests) and production `next build`.
  - Remote migration was applied manually through the Supabase Dashboard SQL editor in project `sparkle-finder-auth` (`pzksocboqauqjdtsgpdp`) after CLI auth/linking stayed blocked.
  - Supabase verification passed with all checks `true`: telemetry tables exist, RLS is enabled, authenticated users have select-only access, service-role has select/insert/update/delete, read-own policies exist, expected updated-at triggers exist, expected indexes exist, and no required columns are missing.
  - Deployed Finder production from commit `c7eaf2c` to `dpl_1Q9mZ7WG4eNFWnzhbG7Loco3PbDU` / `https://sparkle-finder-nx2hyh8l8-louis-2849s-projects.vercel.app`, aliased at `https://sparkle-finder-dev.vercel.app`.
  - Deployed linked-runtime smoke is still pending. `vercel env pull --environment=production` confirms the keys exist, but sensitive values such as `SUPABASE_SERVICE_ROLE_KEY`, `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN`, and `OPENAI_API_KEY` are pulled locally as empty strings, so `npm run smoke:finder-linked-runtime` cannot create/clean the temporary confirmed Finder user from this terminal.

- Deployed and smoked Secret Rep ID claiming plus linked Finder Nic-Nac runtime:
  - Applied Finder migration `20260622144600_finder_rep_claim_profile_metadata.sql` to the remote Sparkle Finder Supabase project and verified the claim metadata columns/comments.
  - Configured shared sensitive `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN` in Suite and Finder Vercel production/preview.
  - Refreshed Finder Vercel production/preview Supabase runtime envs from the dedicated Finder Supabase project, including the server-only `SUPABASE_SERVICE_ROLE_KEY`.
  - Deployed Suite production `dpl_6LUJB79BHeYsfMWLSUtEsRqWUMbY` and moved `https://sparkle-suite-demo.vercel.app` to that deployment.
  - Deployed Finder production `dpl_6FAPcdx2SgZoxGhmdw4UuYx2Eyfc`, aliased at `https://sparkle-finder-dev.vercel.app`.
  - Found and fixed a deployed save-path bug: `service_role` lacked table grants on `sparkle_finder_profiles` and `sparkle_finder_memberships`. Added/applied migration `20260622155712_finder_rep_claim_service_role_grants.sql`.
  - Deployed browser claim smoke passed: temporary confirmed Finder auth user signed in, submitted a real eligible Secret Rep ID through the account form, saw `Rep badge linked`, verified `is_rep`, `sparkle_suite_rep_id`, claim timestamp, and `silver_rep_included` membership in Supabase, then cleaned up the temporary user and rows.
  - Deployed linked-rep Nic-Nac smoke passed: temporary linked rep account called `/api/finder/nic-nac`, received HTTP `200`, streamed 14,245 bytes through OpenAI, and hit zero hard-fail phrases. Temporary user and rows were cleaned up.

- Configured Finder Vercel OpenAI runtime:
  - Added `OPENAI_API_KEY` to `sparkle-finder-dev` production and preview as sensitive Vercel env vars.
  - Intentionally removed the development `OPENAI_API_KEY` after Vercel created it as non-sensitive; local dev should use local env files instead of a readable Vercel development secret.
  - Added explicit Nic-Nac model env vars across Finder production, preview, and development: `NIC_NAC_HUMAN_DEFAULT_MODEL=gpt-5.4`, `NIC_NAC_HUMAN_ESCALATED_MODEL=gpt-5.5`, `NIC_NAC_UTILITY_MODEL=gpt-5.4-mini`, and `NIC_NAC_LAB_SYNTHESIS_MODEL=gpt-5.5`.
  - Deployed Finder production after env setup. Deployment `dpl_78tx9hjdTZfAqkLADLJUZEnraGZH` is ready and aliased to `https://sparkle-finder-dev.vercel.app`.
  - Direct OpenAI Responses API check passed for `gpt-5.4` with medium reasoning and `gpt-5.4-mini` with low reasoning.
  - Superseded by later deployed linked-rep Nic-Nac smoke with a real authenticated temporary Finder account.

- Added the Sparkle Suite Secret Rep ID claim path for Finder accounts. The account page now shows a `Claim your BP Rep badge` panel for authenticated non-rep users and a linked status panel after claim.
- Added `lib/sparkle-finder/rep-claim.ts`, which verifies the private Secret Rep ID Number against Suite's internal `/api/internal/finder/rep-claim` endpoint using `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN`, then writes the proven rep link and `silver_rep_included` membership with Finder's service-role client.
- Added a Supabase migration for persisted claim metadata on `sparkle_finder_profiles`: business name, public site slug, and claim timestamp.
- Finder account mapping now treats persisted live Suite rep claims as active Rep Silver even when the rep is not in local fixture data.
- Finder Nic-Nac now treats private rep entitlements as linked Suite rep context, so linked reps get shared memory/context without exposing Suite mutation tools from Finder.
- Added `.env.example` documentation for `SPARKLE_FINDER_TO_SUITE_REP_CLAIM_TOKEN`.
- Verification passed: focused claim/account/Nic-Nac/account-page tests, full Finder Vitest suite, and Finder production build.
- Deployment follow-up completed later the same day: migration applied, claim token configured, production deployed, and deployed claim smoke passed.

- Added Finder Nic-Nac mission guardrails. Clear off-mission requests such as therapy, grocery lists, homework/content drafting, travel planning, medical/legal/financial advice, and general-chatbot use now receive a static Nic-Nac redirect stream before OpenAI configuration, Supabase memory setup, tool setup, or model streaming.
- The mission guard checks explicit off-mission patterns before broad Sparkle/BP/Finder allow words, so mixed prompts like "therapist for rep burnout" and "grocery list for live show snacks" are still redirected.
- Redirect streams use generated assistant message ids.
- Mission-guard verification passed: focused Finder guard/route tests, full Finder Vitest suite, production build, missing-key route smoke, off-mission route smoke with `OPENAI_API_KEY` empty, and broader Finder local smoke.
- Moved Finder `/api/finder/nic-nac` off hardcoded Anthropic Haiku and onto an OpenAI-only Nic-Nac model policy adapter using `human_default`.
- Added Finder-local `lib/nic-nac/core/model-policy.ts` and `lib/nic-nac/core/model-provider.ts` so route files select policies instead of raw provider/model strings.
- Replaced `@ai-sdk/anthropic` with `@ai-sdk/openai` in Finder dependencies.
- Added route tests proving authenticated Silver Finder Nic-Nac streams through the OpenAI policy, passes OpenAI reasoning provider options, and keeps Anthropic/Haiku out of route/package config.
- Added `.env.example` placeholders for `OPENAI_API_KEY` and Nic-Nac model overrides.
- Added linked-rep Finder surface context to the Nic-Nac prompt. When a Finder account is linked to a Sparkle Suite rep, Nic-Nac is told to behave as the same assistant while limiting current-surface actions to Finder and directing Sparkle Suite mutations back to Sparkle Suite.
- Added automatic safe Finder customer-memory preload in the Finder Nic-Nac route so safe memory summaries appear in the system prompt without requiring a model tool call; unsafe memory is filtered before prompt assembly.
- Verification passed: focused Finder Nic-Nac route test, related Finder account/entitlement tests, full Finder Vitest suite, and production `next build`.
- Deployment blocker found: linked Vercel project `sparkle-finder-dev` does not currently list `OPENAI_API_KEY`, so deployed Silver Nic-Nac model streaming needs that secret before runtime-ready smoke.

## 2026-06-20

- Folded the old Sparkle Finder binder/Open Brain files into the active implementation repo.
- Preserved durable binder docs, plans, handoffs, and top-level Markdown notes in repo-local `docs/`.
- Added repo-local vault memory files so future Codex sessions can start from the implementation repo without needing the old binder.
- Redirected future workspace expectations to `C:\Users\louis\sparkle-finder-repo`.

## 2026-08-26

- Added Finder's dynamic appearance loader and root semantic CSS tokens. The source contract is the Sparkle Suite public Finder appearance endpoint, with 30-second revalidation and an Amethyst fallback.
- The shared Control Center now exposes all 11 customer-site appearance presets under a Sparkle Finder product view. The persisted production setting is Amethyst.
- Application commit `4a60590a` passed the full Finder suite (762 tests), lint, production build, strict Suite contract, 20 browser smoke tests, and Nic-Nac guard. Finder deployment `dpl_AJm8zgU8jkXwhpSgmEHAdErJFJvX` is live on `https://yoursparklefinder.com` and visually verified.

## 2026-08-26 later

- Added one external-aware link component and routed dynamic rep, Dance Floor, show, availability, Showcase, and Nic-Nac destinations through it.
- External HTTP(S) links now render `target="_blank"` plus `rel="noopener noreferrer"`; internal and fixture-preview Finder links remain same-tab.
- Commit `15f60885` passed 59 test files / 765 tests, lint, production build, and local signed-in browser QA. Deployment `dpl_EEA1gzkRrdMwJk35KHnF1DzZat3s` is live on `https://yoursparklefinder.com`.

## 2026-09-02 - Read-only Control Center cost telemetry bridge

- Added `GET /api/internal/finder/control-center-nic-nac-usage`, limited to a 32-day window and 10,000 rows, returning only run/cost telemetry fields needed by the owner-only Suite dashboard.
- The route fails closed without its dedicated bearer token or Finder service role. The token is configured as a Vercel Secret in Finder and Suite production/preview.
- Focused route tests, lint, local production build, Vercel production build, custom-domain deployment inspection, and a live unauthenticated `401` check passed.
- Commit `97903157` is live as deployment `dpl_CCyNBUN9XUSW4vCfZ9mSxMkoynv5` on `https://yoursparklefinder.com`.

## 2026-09-02 - Dedicated OpenAI project and model-purpose telemetry

- Finder production traffic now uses its own OpenAI project and a restricted model-request runtime key.
- Commit `91273c87` expands the read-only cost bridge with persisted reasoning and requested-intent evidence so Suite can show workload, expected model/reasoning, and policy fit without sharing customer auth or conversation content.
- Deployment `dpl_9W8PJNL7xKZ88uKfgcb6omrcirfd` is `READY` and aliased at `https://yoursparklefinder.com`; the live signed-in surface loaded successfully.
- The final synthetic authenticated model smoke remains pending because the production smoke token is write-only and unavailable to the terminal. Louis's signed-in account was not used for reviewer testing.
