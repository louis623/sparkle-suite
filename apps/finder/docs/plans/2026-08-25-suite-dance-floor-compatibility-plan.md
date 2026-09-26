# Sparkle Suite Dance Floor Compatibility Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

**Date:** August 25, 2026  
**Status:** Complete; Releases 1-4 are implemented, deployed, and verified<br>
**Finder baseline:** `codex-sparkle-finder-v1` at `7ba4802d47db7ad40825215b2c577ba468cb0188`  
**Suite source baseline:** `f81eed6a5e8026dd8d333ffbe247a40474547afc` with Open Brain closeout `56a87a3fe3bd86702dd9096da261f41ea52400c3`  
**Suite production:** `dpl_AvvFpuzNXXrajduF9cBqGQei9x2J` at `https://www.yoursparklesuite.com`  
**Finder production:** `https://yoursparklefinder.com`

## Implementation progress

- The Suite dependency gate is complete through live compatibility release `f3de6c15`. Its `schemaVersion: 2` catalog, exact batch hydration, net-quantity availability, and Showcase Studio v2 contracts are the canonical cross-product source.
- Release 1 is complete and live in Finder commit `0c54a32`: stable catalog pagination, exact totals/facets, batch hydration, and exact variant identity.
- Release 2 is complete and live in Finder commit `93107f6`: separate lead/dancer totals, positive Suite-owned net quantity, zero/removed exclusion, and bounded continuation.
- Release 3 is complete and live in Finder commit `b8ecf57`, with smoke-test follow-up `0613800`: active phone-first Studio, private persisted evidence without base64 transport, exact candidate confirmation without auto-selection, and owner-verified monotonic recovery. Finder-private migration `20260825143000_sparkle_finder_showcase_studio_recovery.sql` is applied and remote history is current.
- Release 3 production deployment `dpl_34Hs61FVJmuLi4E6pMcX8zZCJSvc` is `READY` and verified at `https://yoursparklefinder.com`. Lint, build, `56` Vitest files / `756` tests, strict live contract, `20` required smoke checks with `2` expected optional skips, Nic-Nac guard, and 320px/390px/tablet/desktop visual checks passed.
- Release 4 is complete and live in Finder commit `1b52f44`. Sanitized v2 fixtures cover exact variants, multi-page catalog and availability, positive/zero/removed dancer quantities, and stable-submission Studio ambiguity/replay. The strict read-only checker samples up to five pages with all-page cursor/identity guards and terminal total checks. Deployment `dpl_GKS4RzyHxnpchfYsypE3q3UT67DR` reached `READY`, the custom domain returned `200`, and recent runtime errors were empty.
- Positive signed-in production Studio mutation/replay remains deferred until Louis designates a demo account, data, and cleanup procedure.

## Goal

Make Sparkle Finder fully compatible with Sparkle Suite's hardened Dance Floor and Nic-Nac contracts while preserving Finder's separate auth boundary, phone-first product direction, read-only relationship to Suite Dance Floor inventory, and exact catalog variant identity.

After this plan is complete:

- catalog variants that share an item number remain distinct by exact `designId`, main stone, material, photo, and description;
- `RBP` necklace item numbers work everywhere without rewriting or customer-facing suffixes;
- the Library and Nic-Nac use real continuation metadata instead of silently stopping at arbitrary limits;
- Finder distinguishes rep/listing leads from the number of physical dancers available;
- grouped quantities and pending-request consumption remain authoritative in Suite and are represented accurately in Finder;
- Showcase Studio can collect evidence, surface ambiguous variants, confirm the exact design, recover safely from failures, and retry without duplicate submissions;
- Finder never writes directly to Suite Dance Floor inventory or reimplements Suite's atomic listing RPC;
- all verification uses fixtures, mocked contracts, or explicitly designated synthetic reviewer data.

## Planning-baseline findings

The findings below describe the pre-implementation baseline. The identified gaps were closed by Releases 1-3 unless an item is explicitly carried into Release 4 or the designated-demo-account follow-up.

### Already compatible

- `lib/sparkle-finder/catalog-service.ts` maps `JewelryItem.id` from Suite's exact `designId` and preserves item number, material, main stone, and canonical photo.
- Library cards and detail routes are keyed by `designId`; Finder does not collapse catalog rows by item number.
- Availability requests use `designId`, not item number.
- The catalog search path contains no prefix allowlist that rejects `RBP`; compatibility needs regression coverage rather than a new validator.
- Finder keeps canonical catalog photos separate from listing-specific lead photos.
- Finder's Nic-Nac tool policy forbids Sparkle Suite workspace and Dance Floor mutations.
- Pending trade calculations and atomic listing mutation remain Suite responsibilities.

### Gaps identified at baseline

1. The Library grows a first-page limit from `24` to `48` to a permanent maximum of `50`; it has no cursor, total, or authoritative `hasMore`.
2. The live Suite catalog response currently exposes only `items`; `offset` and `page` are ignored. True Finder pagination therefore requires a Suite public API contract addition before Finder can consume it.
3. Nic-Nac catalog and availability tools return at most `8` by default and `12` at maximum, with no continuation metadata.
4. Finder treats one availability row as one physical dancer. The new Suite grouping contract requires separate lead-row and available-quantity semantics.
5. Finder availability types do not carry per-listing net quantity, aggregate dancer totals, or cursors.
6. The live Studio upload form in `components/showcase/ShowcaseManager.tsx` is not rendered by the current Silver route. `/silver#showcase-studio` currently lands on a Nic-Nac workspace that can describe or read intake status but cannot accept uploads.
7. Studio sends only `itemNumber` from the active server action, discards structured Suite output, cannot show `variantCandidates`, and does not persist the selected exact `suiteDesignId` into the owner flow.
8. Unknown or malformed Suite Studio responses currently become a false `needs_confirmation` success.
9. Studio persistence inserts a submitted row before sequential uploads and collapses database, storage, metadata, and bridge failures into generic states. A retry creates a new UUID and can repeat the Suite call.
10. The live Finder contract checker verifies the older basic payload but does not prove variants, quantity semantics, pagination, zero-quantity exclusion, or Studio continuation behavior.

## Non-negotiable boundaries

- Work only from `C:\Users\louis\sparkle-finder-repo` on the allowlisted Finder branch.
- Keep customer-visible vocabulary as `Dance Floor`, `dancer`, `dancers`, and `trade`.
- Preserve legacy technical identifiers when required for compatibility.
- Never invent a modified or suffixed Bomb Party item number.
- Treat exact Suite `designId` as the catalog identity. Never select the first item-number match.
- Do not duplicate or reapply the six Suite migrations named in the August 25 handoff.
- Do not query shared production tables from Finder to recreate pending-quantity logic.
- Do not add `rpc_add_or_increment_catalog_listing_v2` or another Suite inventory mutation to Finder.
- Keep Finder and Suite customer auth boundaries separate.
- Do not use Louis's, Heather's, or another real customer's account or data for verification.
- Do not create live trades, checkout, email, SMS, uploads, or provider side effects during automated verification.
- Production fixture fallback remains disabled.
- Every implementation release is independently tested, committed, pushed, deployed, and verified at `https://yoursparklefinder.com` before the next release starts.

## Dependency gate: freeze the live cross-product contracts

**Gate status:** Complete through live Suite compatibility release `f3de6c15`; Finder's strict read-only production check passed before Releases 1-3 proceeded.

This gate is read-only and blocks code that depends on fields Suite may not expose yet.

### Catalog page contract

Confirm or add in Suite first:

```ts
type CatalogPageResponse = {
  items: SparkleSuiteFinderCatalogItem[];
  facets: CatalogFacetOptions;
  pageInfo: {
    totalCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};
```

Requirements:

- request uses existing normalized filters plus bounded `limit` and opaque `cursor`;
- ordering is stable and ends with unique `design_id` as a tie-breaker;
- cursor is bound to the filter and sort state or rejected when mismatched;
- facet counts describe the complete filtered result, not only the current page;
- if facets remain a separate endpoint, pin that split contract explicitly and fail truthfully when whole-result facets are unavailable;
- legacy items-only responses remain detectable during coordinated rollout and are never guessed to be complete;
- detail lookup remains exact by `designId`;
- a batch-by-design-ID endpoint is preferred for collection hydration if Suite supports it.

### Availability contract

Pin the exact Suite field names and semantics for:

```ts
type AvailabilityMatch = {
  listingId: string;
  quantityAvailable: number;
  item: SparkleSuiteFinderCatalogItem;
  // existing safe rep, photo, and next-show fields
};

type AvailabilityPageInfo = {
  totalLeadCount: number;
  totalDancerCount: number;
  hasMore: boolean;
  nextCursor: string | null;
};
```

Requirements:

- `quantityAvailable` is the net positive quantity after pending reservations;
- quantity zero, removed, and unavailable listings are excluded by Suite;
- Finder does not subtract pending requests a second time;
- if exact and similar matches paginate independently, Suite exposes independent totals/cursors or one combined stable page;
- document whether catalog `availableListingCount` means listing rows or total available physical dancers. If it is row count, Suite should expose an explicit dancer-quantity total.

### Studio continuation contract

Pin the exact request and response shapes for:

- `variantCandidates`, each keyed by exact `designId` and carrying unchanged item number, design name, main stone, material, jewelry type, collection, and canonical photo;
- ambiguity and confirmation status/error codes;
- continuation using the same `finderSubmissionId` plus an exact selected design identifier or the Suite-approved selector;
- replay behavior and replay signal;
- invalid details, photo rejection, storage/database/RPC failure, temporary failure, and malformed-response behavior;
- returned `suiteDesignId` equality with the confirmed selection.

If Suite does not yet support pagination, quantity fields, or confirmation continuation, create a focused Suite handoff and deploy Suite first. Finder must not invent these contracts.

### Gate acceptance

- Contract fixtures are checked into Finder tests or a dedicated contract document.
- Read-only live catalog and availability checks confirm the deployed Suite shape.
- Studio request/continuation shapes are verified from Suite source/tests or a dedicated non-mutating contract/version endpoint. Do not probe Studio with a live POST unless Louis designates synthetic data, an environment, and cleanup steps.
- Mixed-version behavior is defined before Finder deploys.
- No Finder or shared database mutation occurs during this gate.

## Release 1: Preserve every catalog variant and add real continuation

**Implementation status:** Complete and live in Finder commit `0c54a32`.

### 1.1 Extend the catalog adapter without breaking existing callers

Main-agent integration ownership:

- define `CatalogPageInfo`, `CatalogPageReadResult`, and `cursor?: string` in `lib/sparkle-finder/catalog-service.ts`;
- add `getCatalogJewelryItemsPageResult()` for metadata-aware consumers;
- keep `getCatalogJewelryItems()` as a compatibility wrapper until all callers are migrated;
- normalize and validate page metadata without decoding opaque cursors;
- detect a legacy items-only payload as `pagination: "unsupported"` rather than inferring completion;
- guard against duplicate design IDs, repeated cursors, and cursor loops when walking pages;
- keep detail lookup and every cache identity keyed by exact `designId`, never item number.
- audit every production caller of the compatibility wrapper. Each caller must use page metadata, exact batch hydration, or an explicit visible partial/error result; no caller may treat an unsupported or first page as the complete catalog.
- if caching is introduced, include normalized filters, sort, cursor, API base, and contract version in the cache key. Never cache a partial page as a full catalog.

If a full-catalog helper remains necessary, name it explicitly, impose a documented maximum-page guard, and fail visibly on a cursor loop. Prefer batch detail hydration for known collection IDs instead of repeatedly downloading the catalog.

Likely files:

- `lib/sparkle-finder/catalog-service.ts`
- `lib/sparkle-finder/types.ts`
- `tests/sparkle-finder/catalog-service.test.ts`

### 1.2 Replace Library limit growth with cursor navigation

- Replace the `24 -> 48 -> 50` query model with an opaque `cursor` search parameter.
- Preserve query, type, collection, material, stone, label, and year filters across continuation.
- Clear the cursor whenever a search or facet changes.
- Render authoritative total and continuation states from `pageInfo`.
- Do not show a continuation action when `hasMore` is false, even if the page is full.
- Do show continuation when `hasMore` is true, even if a page is shorter than the requested limit.
- Keep Browser Back as the initial previous-page behavior; add explicit previous navigation only if Suite supplies a safe previous cursor or Finder retains a bounded cursor history.
- Show main stone and material clearly enough to distinguish same-item-number variants.
- Preserve exact `designId` in detail and Save links.

Likely files:

- `app/(hub)/library/page.tsx`
- `components/library/LibrarySearch.tsx`
- `components/library/JewelryCard.tsx`
- `tests/sparkle-finder/routes.test.ts`
- `tests/smoke/sparkle-finder-home.spec.ts`

### 1.3 Repair capped hidden consumers

Audit and update consumers that currently assume one list call is the complete catalog:

- `app/actions/bling-vault.ts`
- `app/(hub)/silver/page.tsx`
- collection, Showcase, homepage, and Nic-Nac helpers that hydrate known design IDs

For owner collection hydration, prefer an exact batch-by-ID API. The batch response must preserve requested ID association, report missing IDs explicitly, and never fall back from a missing design ID to item number. If unavailable, use bounded cursor walking with duplicate/loop guards and return an explicit partial/error state rather than silently dropping pieces beyond page one.

### 1.4 RBP and variant tests

Add regressions proving:

- `RBP5902` passes unchanged through Library search, `search.ts`, Nic-Nac curator recognition, tool payload normalization, catalog mapping, and Studio request normalization;
- document that Finder has no local prefix allowlist or OCR parser wherever Suite owns that interpretation;
- the same item number with Rose Quartz and Ruby returns two cards and two exact `designId` routes;
- a main-stone filter selects the intended variant;
- variant name, description, and canonical photo remain attached to the correct design;
- no item-number dedupe or synthetic suffix is introduced;
- more than 12 and more than 50 results remain discoverable through continuation without duplicates;
- a catalog piece referenced beyond page one still hydrates in Bling Vault and Silver views.

### Release 1 subagent lanes

- **Catalog adapter agent:** `catalog-service.ts` and `catalog-service.test.ts` only.
- **Library UI agent:** Library page/search/card and route/smoke tests only.
- **Hydration audit agent:** Bling Vault/Silver exact-ID consumers and focused tests only.
- **Primary agent:** owns shared types, integration, conflict resolution, full verification, release provenance, and production deployment.

### Release 1 gate

- Suite pagination contract is live first.
- Same-item-number variants stay separate in rendered and service tests.
- More than 50 records remain reachable without duplicate design IDs.
- Facet totals remain whole-result totals.
- Full lint, tests, build, smoke, phone/desktop, custom-domain, and production-log checks pass.

Suggested commit: `feat: paginate Finder catalog and preserve variants`

## Release 2: Make Dance Floor availability quantity-aware

**Implementation status:** Complete and live in Finder commit `93107f6`.

### 2.1 Separate lead counts from dancer quantities

Extend raw and mapped availability matches with Suite's confirmed net quantity field.

Use separate meanings throughout Finder:

- `leadCount`: number of distinct public rep/listing opportunities in the current result;
- `dancerCount`: sum of net available physical quantities in the current result;
- `totalLeadCount`: authoritative complete-result listing count from Suite;
- `totalDancerCount`: authoritative complete-result physical quantity from Suite.

Rules:

- only finite positive integer quantities are renderable;
- zero, removed, malformed, or unavailable matches fail closed and are absent;
- production API data must not silently default a missing quantity to `1`;
- fixture-only legacy rows may default explicitly to `1` during migration;
- Finder never calculates pending consumption locally;
- one listing with quantity `2` is one lead and two available dancers.
- repeated cursors and duplicate listing IDs fail closed; cursor/filter binding and stable ordering are required.
- missing quantity or pagination metadata in production produces a truthful temporary contract-unavailable/partial state, never a silent quantity=`1` or complete-result claim.

Likely files:

- `lib/sparkle-finder/catalog-service.ts`
- `lib/sparkle-finder/types.ts`
- `lib/sparkle-finder/nic-nac.ts`
- `lib/fixtures/sparkle-finder-fixtures.ts`
- `tests/sparkle-finder/catalog-service.test.ts`
- `tests/sparkle-finder/nic-nac-find.test.ts`

### 2.2 Update Nic-Nac tools and customer responses

- Include `quantityAvailable` on every safe lead.
- Replace ambiguous `count` with `leadCount` and `dancerCount`; retain an old field temporarily only when required for model/tool compatibility and label it deprecated/internal.
- Return upstream totals, `hasMore`, and `nextCursor`.
- Remove the second unexplained `slice()` after the bounded upstream request.
- Keep model context bounded, but provide an explicit continuation tool/input path.
- Preserve exact requested and matched `designId` values.
- Ensure customer copy says, for example, `2 rep leads · 5 dancers available`.
- Keep legacy `listingId` and quantity field names internal to tool payloads.

Likely files:

- `lib/sparkle-finder/nic-nac/tools.ts`
- `lib/sparkle-finder/nic-nac/prompt-builder.ts`
- `components/nic-nac/FindThisForMe.tsx`
- `components/nic-nac/FinderNicNacChatbot.tsx`
- `tests/sparkle-finder/finder-nic-nac-tools.test.ts`
- `tests/sparkle-finder/finder-nic-nac-prompt.test.ts`
- `tests/sparkle-finder/nic-nac-find.test.ts`

### 2.3 Update detail and lead UI

- Keep one card per distinct rep/listing lead.
- Show `1 dancer available` or `N dancers available` on each lead.
- Show aggregate lead and dancer counts separately.
- Provide a visible continuation path on item detail and `RepLeadPanel`; Nic-Nac continuation alone is not sufficient.
- A grouped listing with quantity remaining after a pending request stays visible.
- A zero-quantity or removed listing never renders.
- Listing-specific photos remain on the lead; canonical photos remain on the exact design.

Likely files:

- `app/(hub)/library/[itemId]/page.tsx`
- `components/showcase/RepLeadPanel.tsx`
- `components/library/JewelryCard.tsx`
- route and rendered smoke tests

### 2.4 Expand the public contract checker

Update `scripts/check-sparkle-suite-finder-api.ts` to validate:

- catalog `availableListingCount` or its replacement has documented nonnegative semantics;
- each availability match has a positive integer net quantity;
- exact matches preserve the requested `designId`;
- page totals are consistent and at least the sum of the current page when paginated;
- page two contains no repeated listing IDs;
- observable live invariants hold; deterministic zero/removed exclusion is proven with mocked synthetic fixtures unless a designated live synthetic fixture exists;
- output reports `AVAILABILITY_LEADS` and `AVAILABILITY_DANCERS` separately.

Live positive-inventory checks are conditional when production has no public matches. Deterministic quantity, pending, and zero cases use mocked synthetic fixtures.

### Release 2 subagent lanes

- **Availability adapter agent:** service/type mapping, fixture migration, and service tests.
- **Nic-Nac agent:** tools, prompt guidance, and Nic-Nac tests.
- **Availability UI agent:** item detail/lead components and route/smoke tests.
- **Contract-check agent:** read-only checker and checker tests, with no application-file ownership.
- **Primary agent:** integrates shared types, validates no mutation surface, runs full release, and deploys.

### Release 2 gate

- One exact row with quantity `2` reports one lead and two dancers.
- Two rows with quantities `2` and `3` report two leads and five dancers.
- A pending request that leaves quantity `1` does not hide the listing.
- Quantity zero, removed, and invalid rows are absent.
- More than 12 matches have a real continuation path.
- Same-item-number variants cannot cross-attach canonical photos, listing photos, names, or descriptions.
- No Finder tool, RPC, or action mutates Suite Dance Floor inventory.
- Full release verification and production deployment pass.

Suggested commit: `fix: make Dance Floor availability quantity-aware`

## Release 3: Activate variant-safe Showcase Studio

**Implementation status:** Complete and live in Finder commit `b8ecf57`, with smoke-test follow-up `0613800` and Finder-private migration `20260825143000_sparkle_finder_showcase_studio_recovery.sql` applied.

### 3.1 Create an active phone-first Studio surface

Do not revive the full obsolete `ShowcaseManager` surface.

- Extract or create `components/showcase/ShowcaseStudioIntakePanel.tsx`.
- Render it from `app/(hub)/silver/page.tsx` near contextual Nic-Nac.
- Wire the real submit, retry, and confirmation actions.
- Keep uploads in the dedicated Studio UI; Nic-Nac chat remains status/help only.
- Fields: original label photo, jewelry photo, unchanged item number, optional main stone, optional material, and customer note.
- Preprocess phone photos client-side to a deliberately bounded JPEG or WebP size before the Server Action, reusing the proven canvas/quality strategy from `components/silver/ProfileEditor.tsx` without reusing its square-crop behavior.
- Preserve full aspect ratio and orientation, retain label edges and variant-defining jewelry features, and strip unnecessary metadata where supported.
- Validate the prepared MIME type, dimensions, and byte size again on the server. Do not solve upload failures by raising the Server Action limit to an unbounded `20 MB+` request.
- Add a narrow explicit Server Action request limit only after measuring the prepared two-image payload plus base64 overhead.
- Use an `RBP5902`-style example or neutral accepted-prefix help rather than a restrictive prefix list.
- Maintain phone-first touch targets, focus order, labels, live regions, pending states, and retry affordances.

### 3.2 Implement a strict Suite intake parser

Replace permissive parsing with a discriminated result model that represents:

- exact accepted/queued/published design;
- ambiguous variant candidates requiring confirmation;
- missing or invalid item details;
- photo rejection with coaching;
- storage failure;
- database/RPC failure;
- replayed prior intake/continuation result;
- temporary backend failure;
- invalid or unknown Suite response.

Rules:

- malformed JSON and unknown statuses are failures, never successful confirmation;
- parse customer-safe error bodies on non-2xx responses;
- classify retryability without exposing secrets or raw provider errors;
- preserve candidate arrays without deduping by item number;
- every candidate photo, stone, material, name, and description stays attached to its exact `designId`;
- returned exact design must agree with the selected candidate and supplied facts.

Likely files:

- `lib/sparkle-finder/showcase-studio.ts`
- `tests/sparkle-finder/showcase-studio.test.ts`

### 3.3 Make local persistence staged, precise, and recoverable

Use the existing Finder-private Studio schema unless a proven gap requires a separately reviewed additive migration.

Initial submission workflow:

1. Verify the signed-in Silver owner.
2. Generate the stable Finder submission UUID once in the active client panel before first submit, validate it server-side, and create or resume the owner-matching `draft` row.
3. Validate only the storage-supported image MIME types: JPEG, PNG, and WebP.
4. Upload deterministic owner/submission-scoped objects.
5. Insert asset metadata.
6. Transition the row to `submitted` only after both uploads and metadata succeed.
7. Call Suite with the same stable `finderSubmissionId`.
8. Persist the typed bridge outcome.

The client retains that submission ID through transient failures and refresh, and rotates it only after a terminal result. Persistence for the same owner and key resumes or returns existing state rather than creating a duplicate.

On failure:

- catch thrown and returned errors at every stage;
- return precise internal reasons such as database create, label storage, jewelry storage, asset metadata, finalize, bridge, and cleanup failure;
- best-effort remove partial uploaded objects and draft metadata only before the local draft is finalized;
- after evidence is safely committed, a Suite bridge failure preserves the row and assets as `saved_pending_sync`; bridge cleanup must never delete committed customer evidence;
- prove no committed synthetic orphan rows or objects remain;
- never describe a database or storage failure as photo rejection.

The existing table already has `suite_catalog_design_id`, `extracted_catalog`, status fields, and private error storage. Reuse `lib/supabase/service-role.ts` for a tightly scoped service-role update only after verifying owner and exact row identity. Filter by both `id` and verified `user_id`, verify the affected row, do not create a parallel admin abstraction without a proven need, and do not weaken RLS or expose raw errors to the owner.

State transitions must be monotonic and concurrency-safe. Use compare-and-set or an equivalent per-submission transition rule so terminal accepted/published/rejected state cannot regress and two confirmation/retry requests cannot select conflicting designs.

Likely files:

- `lib/sparkle-finder/showcase-studio-state.ts`
- `lib/sparkle-finder/supabase-admin.ts` or a narrowly scoped workflow helper
- `tests/sparkle-finder/showcase-studio-persistence.test.ts`
- `tests/sparkle-finder/showcase-studio-schema.test.ts`

### 3.4 Add safe retry and exact confirmation

Retry behavior:

- return `saved_pending_sync` when local evidence is safely stored but Suite is temporarily unavailable;
- retry uses the same persisted submission ID and assets;
- retry calls only the bridge and does not create a second row or upload duplicate files;
- retry reconstructs the payload server-side from the exact owner/submission asset metadata, downloads only those deterministic private objects, and revalidates MIME type and size;
- retry never trusts client-supplied storage paths, candidate facts, or another owner's submission;
- Suite replay is treated as the prior successful result, not a newly created operation.

Confirmation behavior:

- render candidate cards with exact canonical photo, unchanged item number, design name, main stone, material, collection, and jewelry type;
- submit the exact selected `designId` supported by Suite's continuation contract;
- verify ownership and confirm the selected ID belongs to the persisted candidate set;
- never trust a hidden item/stone/material value without server-side candidate verification;
- never select candidate zero automatically;
- require Suite's returned `suiteDesignId` and facts to agree with the selected candidate;
- persist the exact chosen design into the owner-readable Studio status.

### 3.5 Keep Nic-Nac contextual and truthful

- Extend owner Studio status reads to include the exact selected design identity and customer-safe failure category.
- Server-read the owner's latest Studio row and candidates in `/silver` and hydrate the active panel so ambiguity, retry, and exact-design states survive refresh and reauthentication.
- Continue omitting internal publish request IDs, raw errors, service tokens, and private storage paths.
- Nic-Nac may describe current persisted status, ambiguity, retry need, and the Studio button.
- Nic-Nac may not accept uploads in chat or claim that a retry/confirmation succeeded without persisted proof.

Likely files:

- `lib/sparkle-finder/nic-nac/tools.ts`
- `lib/sparkle-finder/showcase-studio-state.ts`
- `components/nic-nac/FinderNicNacWorkspace.tsx`
- related Nic-Nac tool and route tests

### Release 3 subagent lanes

Execute only after the Suite continuation contract is frozen.

- **Strict parser agent:** `showcase-studio.ts` and parser tests only.
- **Persistence agent:** `showcase-studio-state.ts`, private persistence helpers, and persistence/schema tests only.
- **Workflow agent:** extracted server workflow plus Silver actions and focused action tests.
- **Studio UI agent:** new panel, Silver route wiring, component/route/smoke tests only.
- **Independent reviewer agent:** read-only review of variant identity, ownership, idempotency, rollback, failure taxonomy, and no-Suite-mutation boundary.
- **Primary agent:** owns cross-lane types, final integration, live read-only contract checks, release verification, commit/push/deployment, and production provenance.

### Release 3 tests

At minimum:

- `RBP5902` survives form, persistence, and Suite payload unchanged.
- Rose Quartz and Ruby candidates with the same item number remain two exact IDs.
- exact stone/material evidence resolves only the matching design.
- missing evidence returns confirmation candidates and never selects the first.
- candidate photos and descriptions remain variant-specific.
- malformed/unknown Suite responses fail closed.
- oversized or unsupported phone images are rejected or prepared before the bridge call, and the active form stays within the measured Server Action request limit.
- portrait phone photos preserve orientation, label edges, and variant-defining details without square cropping.
- invalid details, photo rejection, storage failure, database/RPC failure, replay, and temporary failure remain distinct.
- every staged persistence failure proves rollback or a truthful retryable state.
- retry reuses the same submission ID and does not reinsert or reupload.
- wrong-owner, wrong-submission, missing-object, and client-supplied-path retry attempts fail closed.
- concurrent duplicate retry/confirmation actions converge on one monotonic state and one selected design.
- confirmation rejects an ID outside the persisted candidate set.
- confirmation fails if Suite returns a different design ID.
- the active `/silver` route renders a real Studio form, not only an anchor.
- Nic-Nac status does not leak raw internal errors, tokens, publish IDs, or storage paths.

### Release 3 gate

- A synthetic Silver reviewer can submit, receive ambiguity, confirm the exact variant, retry a simulated temporary bridge failure, and reach a terminal safe result at 390px in local, preview, or an explicitly designated non-production synthetic environment.
- Refresh and reauthentication preserve the correct submission and exact design identity.
- No duplicate rows or objects remain after replay/failure tests.
- Production verification remains public/read-only unless Louis explicitly designates a demo account, synthetic data, and cleanup procedure.
- Full release verification and production deployment pass.

Suggested commit: `feat: add variant-safe Showcase Studio continuation`

## Release 4: Harden cross-product regression detection

**Implementation status:** Complete and live in Finder commit `1b52f44`, deployed as `dpl_GKS4RzyHxnpchfYsypE3q3UT67DR` and verified at the custom domain.

This release may be folded into Releases 1-3 when each checker change belongs to that boundary, but the final gate is independent.

### Contract fixtures and checker coverage

- Add sanitized synthetic fixtures for catalog pages, duplicate item-number variants, availability quantities, zero/removed rows, ambiguity candidates, and replay responses.
- Keep live checks read-only and conditional when production has no positive availability data.
- Check `schemaVersion` or equivalent contract marker if Suite provides it.
- Fail clearly when pagination metadata disappears, cursor pages repeat records, quantity semantics change, or Studio returns an unknown status.
- Print actionable diagnostics without secrets or customer data.

### Full verification matrix

- `npm run lint`
- focused Vitest files for each changed boundary
- full `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke:sparkle-finder`
- `npm run smoke:finder-nic-nac`
- read-only `npm run check:suite-contract:strict`
- rendered checks at 320px, 390px, tablet, and desktop
- keyboard, focus, labels, live-region, and retry-state checks
- production deployment reaches `READY`
- `https://yoursparklefinder.com` custom-domain checks pass
- recent Vercel runtime logs contain no new errors
- shared production migration history remains unchanged by Finder

### Suggested final commit when separate

`test: harden Suite Finder compatibility checks`

## Implementation orchestration

### Global sequencing

1. Primary agent verifies clean worktree, branch, HEAD, remotes, active Suite deployment, and current Finder deployment.
2. Contract-reconnaissance subagent freezes live Suite contracts read-only.
3. If required fields are missing, stop Finder implementation at that boundary and create the Suite handoff. Deploy Suite first.
4. Implement one Finder release at a time with disjoint file ownership.
5. Primary agent integrates subagent changes, runs focused tests, and reviews diffs before full verification.
6. Independent read-only reviewer audits each release before commit.
7. Commit, push, deploy, verify the custom domain, and inspect logs.
8. Begin the next release only after the current production gate passes.

### Shared-worktree rules for subagents

- Assign explicit file ownership before spawning agents.
- Do not let parallel agents edit the same shared type or barrel file.
- Primary agent owns cross-lane type integration and any migration decision.
- Subagents must preserve unrelated dirty files and must not revert another lane's changes.
- Tests should be added in the owning lane; primary agent resolves only integration-level failures.
- No subagent runs a production mutation or deploys independently.

### Release rollback

- Prefer backward-compatible Finder adapters during Suite/Finder mixed-version rollout.
- If a Finder deployment fails, roll back the application deployment while preserving additive compatibility.
- Do not rewrite or reapply shared Suite migrations.
- Forward-fix contract mismatches; do not weaken variant, quantity, auth, or retry safety to restore compatibility.

## Explicitly deferred

- Finder writes to Suite Dance Floor inventory.
- Reimplementation of Suite pending-trade or quantity concurrency logic.
- Copying `rpc_add_or_increment_catalog_listing_v2` into Finder.
- Customer-to-customer buying, selling, trading, offers, checkout, or marketplace features.
- New shared database migrations unless a genuine Finder-private schema gap is proven and separately reviewed.
- Positive production Studio or Dance Floor mutation smoke without Louis designating synthetic/demo accounts and data.

## Completion report requirements

At the end of implementation, report:

- root causes and compatibility decisions;
- Suite contract dependencies and which deployment supplied them;
- exact Finder files changed;
- variant, RBP, quantity, pending, pagination, failure, retry, and cleanup evidence;
- proof that Finder did not expose a Suite inventory mutation path;
- proof that shared production migrations were not duplicated or changed;
- focused/full test, build, smoke, browser, custom-domain, and log results;
- Finder commit, GitHub push, Vercel deployment ID, aliases, and final production HEAD;
- any remaining designated-demo-account follow-up.
