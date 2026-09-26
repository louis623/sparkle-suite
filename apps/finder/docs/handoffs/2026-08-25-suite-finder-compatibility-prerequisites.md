# Sparkle Suite Prerequisites For Finder Dance Floor Compatibility

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

**Date:** August 25, 2026  
**Status:** Completed by live Suite compatibility release `f3de6c15`; Finder Releases 1-4 are implemented and verified<br>
**Suite repository:** `C:\Users\louis\sparkle-suite-repo`  
**Suite branch:** `codex/nic-nac-trade-hardening`  
**Audited Suite HEAD:** `56a87a3fe3bd86702dd9096da261f41ea52400c3`  
**Suite production baseline:** `dpl_AvvFpuzNXXrajduF9cBqGQei9x2J` at `https://www.yoursparklesuite.com`  
**Finder repository:** `C:\Users\louis\sparkle-finder-repo`

## Completion record

Sparkle Suite release `f3de6c15` supplied the required `schemaVersion: 2` catalog, batch hydration, pending-adjusted availability, and Showcase Studio v2 resolve/confirm/replay contracts. Finder's read-only strict contract gate passed against production before implementation continued.

Finder consumed the contracts in Release 1 commit `0c54a32`, Release 2 commit `93107f6`, Release 3 commit `b8ecf57` with smoke follow-up `0613800`, and Release 4 contract-hardening commit `1b52f44`. Suite remains canonical for designs, variants, reps, shows, and dancer availability. This handoff is retained as the compatibility boundary and does not authorize Finder-side Suite inventory writes or duplicate Suite migrations.

## Purpose

Sparkle Finder cannot safely finish its planned catalog pagination, quantity-aware Dance Floor availability, or variant-confirmation Studio workflow until Sparkle Suite exposes the corresponding source-of-truth contracts.

This handoff defines the smallest Suite-side release required to unblock Finder. It does not authorize Finder to duplicate Suite migrations, calculate pending availability itself, or invent an intake continuation protocol.

## Repository safety

The Suite worktree was already dirty during the read-only audit:

- `vault/decisions.md`
- `vault/session-log.md`
- `artifacts/`
- `test-results/`

Treat those paths as existing user/session work. Preserve them and do not revert, delete, overwrite, or include unrelated artifacts in commits.

Use synthetic tests only. Do not create live Dance Floor listings, pending trades, catalog designs, customer uploads, emails, SMS messages, checkout activity, or customer-account mutations.

## Existing behavior that must remain

- Exact catalog identity is `designId`.
- The original Bomb Party item number remains unchanged.
- Same item number plus different main stone remains distinct.
- Legacy `RBP` item numbers map to necklace type internally while keeping the item number unchanged.
- Listing-specific photos remain separate from exact-variant canonical catalog photos.
- Suite remains authoritative for listing grouping, physical quantity, pending reservations, listing mutation, and replay.
- Finder remains a read-only consumer of Suite Dance Floor inventory.

## Prerequisite 1: Cursor-paginated catalog contract

### Current gap

Current route:

- `app/api/public/finder/catalog/route.ts`
- `lib/sparkle-finder/public-api.ts`

The route accepts filters and `limit`, then returns only:

```json
{
  "items": []
}
```

Current limits are `24` by default and `50` maximum. Ordering uses `created_at desc` without an exact ID tie-breaker. Unknown `cursor` parameters are ignored. Facets are derived from at most the first `500` source rows, so they are not guaranteed complete at scale. No exact batch-by-design-ID endpoint exists.

### Required request

Keep all existing filters and add:

```ts
{
  limit?: number;
  cursor?: string;
}
```

Use an opaque, versioned cursor bound to:

- normalized query and filters;
- sort version;
- last `(created_at, design_id)` tuple or another stable unique ordering tuple.

Reject malformed, expired, or filter-mismatched cursors with a clear `400` JSON error. Do not silently ignore them.

### Required response

Extend the existing response compatibly:

```ts
type FinderCatalogPageResponse = {
  schemaVersion: 2;
  items: SparkleFinderCatalogItem[];
  pageInfo: {
    totalCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};
```

Extend the public catalog item allowlist additively with:

```ts
description: string | null;
```

Use only the description stored on that exact design. If Suite has no safe description for the design, return `null`.

Requirements:

- stable order includes `design_id` as the unique tie-breaker;
- no design ID repeats across cursor pages;
- `totalCount` is the exact complete filtered result count;
- `hasMore` and `nextCursor` are authoritative, not inferred from page length;
- same-item-number variants remain separate rows;
- item number, main stone, material, name, description, and canonical photo stay attached to their exact `designId`;
- mixed-version rollout may preserve top-level `items`, but the new `schemaVersion` and `pageInfo` must be present before Finder enables continuation.

### Exact batch hydration

Prefer a public server-owned route such as:

```http
POST /api/public/finder/catalog/batch
```

or a bounded GET contract if URL length is safely constrained.

Request:

```ts
{ designIds: string[] }
```

Response:

```ts
{
  schemaVersion: 2;
  items: SparkleFinderCatalogItem[];
  missingDesignIds: string[];
}
```

Rules:

- bound and deduplicate input IDs;
- accept at most `50` distinct design IDs per request and reject larger bodies with `400`;
- return exact IDs only;
- preserve requested/result association;
- report missing IDs explicitly;
- never fall back from a missing `designId` to item number;
- keep public allowlists and safe fields identical to the detail route.

### Facets

Keep the separate facets endpoint or embed facets in the page response, but counts must describe the complete filtered dataset. Remove the current first-500 approximation or replace it with exact database aggregation.

### Catalog operational safeguards

- cap every filter value and cursor at documented lengths before querying;
- integrity-protect opaque cursors so callers cannot alter ordering or filter state;
- retain the endpoint's public rate limit and a bounded database statement timeout;
- add or confirm indexes that support the chosen filter and stable-order tuples;
- inspect representative `EXPLAIN (ANALYZE, BUFFERS)` plans with synthetic/local data before production;
- never implement exact totals or facets by loading an unbounded result set into application memory.

### Required catalog tests

- more than 50 matching designs paginate without loss or duplicates;
- equal `created_at` timestamps remain stable through an ID tie-breaker;
- malformed and filter-mismatched cursors return `400`;
- a short page may still report `hasMore: true` when dictated by the query contract;
- an exact full final page reports `hasMore: false`;
- same item number with Rose Quartz and Ruby returns distinct IDs, stones, names, and canonical photos;
- `RBP5902` remains unchanged and maps to necklace type;
- facets remain exact beyond 500 rows;
- batch hydration returns exact requested IDs and explicit missing IDs;
- `/catalog/batch` does not fall through to the dynamic detail route.

## Prerequisite 2: Quantity-aware availability contract

### Current gap

Current route and service:

- `app/api/public/finder/availability/route.ts`
- `lib/sparkle-finder/public-api.ts`

The public match select omits `quantity_available`. The API returns only `requestedItem`, `exactMatches`, and `similarMatches`. It has no cursors or totals.

Current `availableListingCount` counts eligible listing rows, not physical dancers and not pending-adjusted net quantity. Similar and rep filtering can occur after a bounded query, so valid later matches may be discarded. Ordering uses `listed_at` without an ID tie-breaker.

### Existing database truth

Keep the already-applied quantity and pending semantics from:

- `20260823170000_trade_listing_quantities.sql`
- `20260825015000_trade_listing_quantity_concurrency.sql`

`quantity_available` is total physical stock. Pending requests consume copies separately. A listing with quantity `2` and one pending request remains available with net quantity `1`; a fully reserved listing becomes unavailable/pending for new customers.

### Required atomic read model

Implement a server-owned query or RPC that returns the net public quantity from one consistent database snapshot:

```text
net quantity = max(quantity_available - active pending reservations, 0)
```

Do not let Finder subtract pending requests. Do not expose customer identities or private trade-request data.

Apply every existing public availability eligibility rule, listing status/source rule, and next-show rule before limiting. Preserve the current rep-eligibility behavior used by `getAvailabilityMatches`; do **not** add `finder_directory_visible` as an availability condition because that flag belongs to the rep-directory contract and would hide currently valid leads. Any change to availability eligibility is a separate product decision.

### Required match shape

```ts
type SparkleFinderAvailabilityMatch = {
  listingId: string;
  quantityAvailable: number;
  listedAt: string | null;
  photoUrl: string | null;
  photoSource: "listing" | "canonical" | "missing";
  item: SparkleFinderCatalogItem;
  rep: SparkleFinderPublicRep;
  nextShow: SparkleFinderPublicShow;
};
```

`quantityAvailable` must be a positive integer representing the net customer-available physical quantity. Exclude zero, removed, fully reserved, traded, invalid, or unavailable rows.

### Required pagination and totals

Either provide one combined stable match page or independently paginate exact and similar matches. A split response may use:

```ts
type SparkleFinderAvailabilityResponse = {
  schemaVersion: 2;
  requestedItem: SparkleFinderCatalogItem;
  // Kept for current Finder during the Suite-first rollout.
  exactMatches: SparkleFinderAvailabilityMatch[];
  similarMatches: SparkleFinderAvailabilityMatch[];
  exactPageInfo: {
    totalLeadCount: number;
    totalDancerCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
  similarPageInfo: {
    totalLeadCount: number;
    totalDancerCount: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
};
```

Requirements:

- `totalLeadCount` counts distinct listing opportunities;
- `totalDancerCount` sums net physical quantity;
- ordering is stable on `(listed_at desc, listing_id desc)` or another documented unique tuple;
- cursors are opaque and bound to design ID, bucket, filters, and ordering version;
- duplicate listing IDs and repeated cursor loops are impossible or rejected;
- preserve the existing `availableListingCount` field and its legacy meaning as an eligible listing-row count during the Suite-first rollout;
- add explicit `availableLeadCount` and `availableDancerCount` fields for the new exact semantics; do not rename or remove the legacy field until every deployed consumer has migrated;
- accept independent bounded `exactCursor` and `similarCursor` parameters, or expose a separate versioned route while retaining the v1 response unchanged.

### Availability operational safeguards

- cap `limit`, cursor length, and every filter value before querying;
- integrity-protect cursors and reject design/bucket/filter mismatches;
- retain the public endpoint's rate limit and a bounded database statement timeout;
- add or confirm indexes for public eligibility, active reservations, and the stable ordering tuple;
- inspect representative quantity-aggregation and pagination query plans before production;
- calculate totals in the database without returning private reservation rows or loading unbounded matches into application memory.

### Required availability tests

- quantity `2` with one pending request returns net `1` and stays visible;
- quantity `2` with two pending requests is absent;
- quantity zero is absent;
- removed, traded, fully reserved, and non-public rows are absent;
- totals distinguish two leads from five dancers;
- similar filters are applied before limiting;
- more than 50 matches paginate without omission or duplicates;
- equal `listed_at` values remain stable with the ID tie-breaker;
- listing-specific photo remains attached to its listing;
- exact variant canonical photo/name/stone remain attached to its `designId`;
- no private pending-request or customer data appears.

## Prerequisite 3: Versioned, idempotent Studio continuation

### Current gap

Current endpoint:

- `app/api/internal/finder/jewelry-intake/route.ts`
- `lib/sparkle-finder/internal-intake.ts`

The lower-level catalog resolver already accepts exact `designId`, main stone, and material and can return ambiguous candidates. The Finder intake endpoint does not expose that capability.

Current endpoint limitations:

- accepts no selected exact design ID;
- discards `ambiguous` and `variantCandidates`;
- has no continuation action;
- does not use `finderSubmissionId` as an idempotency key;
- has no request signature, stored result, replay indicator, or concurrency lock;
- collapses resolver/database/RPC failures to generic `500` rejected;
- declares statuses that are unreachable;
- silently truncates image data URLs to 10,000 characters and otherwise does not process them.

Finder will keep evidence in Finder-private storage. The Suite contract should consume safe structured evidence and exact selections rather than accepting oversized base64 images it does not use.

### Required request contract

```ts
type SparkleFinderIntakeRequestV2 = {
  schemaVersion: 2;
  sourceProduct: "sparkle_finder";
  finderSubmissionId: string;
  action: "resolve" | "confirm" | "resume";
  selectedDesignId?: string;
  labelDetails: {
    itemNumber?: string;
    designName?: string;
    collectionName?: string;
    collectionYear?: number;
    jewelryType?: string;
    mainStone?: string;
    material?: string;
    bpLabel?: string;
  };
  customerNote?: string;
  photoEvidence?: {
    finderAssetId: string;
    temporaryReadUrl?: string;
    claimedKind: "label" | "jewelry";
  };
};
```

This is a versioned contract, not an in-place breaking replacement. Keep the existing v1 POST behavior while Finder migrates, or add a dedicated `/v2` route. Suite derives normalized fingerprints server-side; a caller-supplied signature must never be replay authority.

Treat every Finder photo field as untrusted evidence. Finder approval booleans, claimed pipeline state, or a caller-provided URL must never authorize master-catalog publication. Suite must validate asset ownership, allowed host/path, content, and quality itself or queue manual review. If approved, copy the image to stable Suite-controlled storage before assigning a canonical URL; never persist an expiring Finder-private URL as canonical.

### Required candidate shape

```ts
type SparkleFinderVariantCandidate = {
  designId: string;
  itemNumber: string;
  designName: string;
  material: string | null;
  mainStone: string | null;
  jewelryType: FinderJewelryType;
  collectionName: string | null;
  collectionYear: number | null;
  canonicalPhotoUrl: string | null;
  description: string | null;
};
```

If the current catalog does not have a description field, explicitly return `null`; do not cross-attach another variant's text.

Candidate ordering must be deterministic, using `designId` as the final unique tie-breaker. Do not silently truncate the current resolver's candidate set at 20. Either return the complete candidate set within a documented safe cap or include candidate `hasMore`/continuation metadata. Persist the exact candidate IDs offered for that resolve stage; confirmation may select only from that stored set.

### Required result contract

Use strict, machine-readable outcomes such as:

```ts
type SparkleFinderIntakeResultV2 =
  | {
      schemaVersion: 2;
      ok: true;
      status: "needs_variant_confirmation";
      retryable: false;
      mutationReplayed: boolean;
      variantCandidates: SparkleFinderVariantCandidate[];
    }
  | {
      schemaVersion: 2;
      ok: true;
      status: "accepted" | "publish_queued" | "published";
      retryable: false;
      mutationReplayed: boolean;
      suiteDesignId: string;
      resolvedDesign: SparkleFinderVariantCandidate;
    }
  | {
      schemaVersion: 2;
      ok: false;
      status:
        | "invalid_details"
        | "invalid_selection"
        | "photo_rejected"
        | "storage_failed"
        | "database_failed"
        | "temporary_failure"
        | "conflicting_replay";
      retryable: boolean;
      errorCode: string;
      customerMessage: string;
      photoFeedback?: string[];
    };
```

The final names may differ, but Finder needs equivalent strict semantics.

### Required idempotency and concurrency

- persist a Suite-owned, stage-aware intake ledger keyed by `finderSubmissionId`;
- derive and store an immutable resolve/evidence fingerprint server-side from normalized initial evidence;
- replaying the same resolve fingerprint returns its stored result without repeating work;
- changing immutable resolve/evidence input under the same submission ID returns `conflicting_replay`;
- store confirmation as a separate compare-and-set transition and receipt under the same submission ID; adding `action: "confirm"` and one stored candidate `selectedDesignId` is a legitimate next stage, not a conflicting resolve replay;
- replaying confirmation with the same selected ID returns the stored confirmation result, while attempting a different selected ID after confirmation returns `conflicting_replay`;
- exact design confirmation verifies the selected ID belongs to the candidate IDs persisted for the resolve stage;
- pass selected ID, stone, and material to `resolveItemNumber(..., { designId, material, mainStone })`;
- returned `suiteDesignId` and facts must equal the confirmed selection;
- concurrent duplicate resolve/confirm/resume calls converge on one monotonic state;
- terminal accepted/published/rejected states cannot regress;
- design creation and audit/result persistence must not produce a generic failure after durable success without a replayable stored result.

An additive Suite migration may be required for the intake ledger. Do not place this ledger in Finder or reuse the Dance Floor listing idempotency table blindly.

### Required Studio tests

- same item number with Rose Quartz and Ruby returns two exact candidates;
- main stone/material resolve one exact candidate;
- missing distinguishing evidence returns candidates instead of selecting the first;
- candidate photos, names, descriptions, and stones stay variant-specific;
- `RBP5902` survives normalization unchanged;
- confirm accepts an exact candidate ID;
- confirm rejects a stale/mismatched ID or facts;
- same submission/resolve fingerprint replays the stored resolve result;
- same submission with changed immutable resolve evidence returns conflicting replay;
- same selected ID replays the confirmation receipt, while a different post-confirmation selection conflicts;
- concurrent duplicate confirmation converges on one design;
- malformed JSON, unknown schema version, invalid details, photo rejection, storage/database failure, and temporary backend failure are distinct;
- no customer account, private storage path, raw provider error, or secret is exposed.

## Required Suite verification and deployment sequence

1. Preserve the pre-existing dirty Suite worktree paths.
2. Add focused failing contract tests before implementation.
3. Implement the three contracts in independently reviewable commits if practical.
4. Run Suite lint, focused tests, full tests, and production build.
5. Apply only a genuinely required additive Suite intake-ledger migration; do not replay existing quantity migrations.
6. Deploy Suite production first.
7. Verify the public catalog and availability contracts with read-only HTTP checks.
8. Verify the Studio contract from source/tests or a dedicated non-mutating version endpoint. Do not run a live intake POST without designated synthetic data and cleanup.
9. Record Suite commit, migration, deployment ID, aliases, and error-log results.
10. Return to `C:\Users\louis\sparkle-finder-repo` and implement Finder Releases 1-3 against the deployed contract.

## Finder acceptance before implementation resumes

- catalog response includes schema/version and authoritative page metadata;
- cursor page two is read-only reachable and contains no repeated design IDs;
- facets are exact for the complete filtered dataset;
- exact batch hydration is deployed or the approved bounded alternative is documented;
- availability exposes positive net quantity, separate lead/dancer totals, and continuation metadata;
- Studio exposes exact candidates, continuation, typed failures, and idempotent replay;
- read-only contract checks pass without creating production data;
- Suite production errors are clean.

Only after those checks pass should Finder implementation and production deployment continue.
