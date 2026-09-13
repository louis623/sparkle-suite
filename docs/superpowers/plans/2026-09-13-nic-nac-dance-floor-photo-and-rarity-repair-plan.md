# Nic-Nac Dance Floor Photo and Rarity Repair Plan

**Status:** completed September 13, 2026 from the isolated
`codex/nic-nac-photo-rarity-repair` branch. Migration, guarded repair, full
58-listing re-audit, Suite reviewer smoke, and Suite/Finder release checks are
complete; protected Live Lineup and Kelly work was not included.

**Purpose:** repair every current Dance Floor/catalog photo mismatch (including
the September 11 intake failures), prevent a recurrence, and establish an
explicit, shared rarity-classification contract for Sparkle Suite and Sparkle
Finder.

## Audit baseline

The September 13 read-only audit established the following production facts.

- A full review covered all 58 currently available/pending listings and every
  retained Nic-Nac workflow photo associated with them. Forty-nine public
  jewelry photos are correct and require no mutation; nine are mismatched.

- Heather's September 11, 2026 intake window created 11 catalog designs and
  11 available Dance Floor listings between 9:32 and 10:05 a.m. EDT.
- Each of those designs has `photo_pipeline_status = error`. The matching
  incident records report that the production PhotoRoom configuration was
  incomplete.
- Two photo outputs were copied across distinct designs:
  - `RBP4645`, `ER59000`, and `ER43143` share one exact saved image.
  - `RBP5273`, `RBP5906`, and `ER77719` share another exact saved image.
- Visual source-to-card review found eight wrong public photos in total:
  `ER11309` (one of two variants), `RBP4645`, `ER59000`, `ER43143`, `ER43437`,
  `RBP5273`, `RBP5906`, and `ER77719`. The other `ER11309`, `ER29067`, and
  `ER54334` already use their correct source.
- The full-inventory review found one earlier mismatch outside Heather's batch:
  `ER38483` (`A Stunning Addition`, listed August 24). Its public image belongs
  to a different piece, while its sole retained, confirmed jewelry-front source
  is the correct centered hoop photo. It has its own one-record guarded repair
  manifest and passing dry run.
- Each of the nine replacement designs currently has exactly one active or
  pending listing, and none has another current canonical-photo consumer. Both
  the operator tool and transactional repair RPC now fail closed if that count
  changes before apply, preventing an indirect update to a newly shared design.
- The affected workflow records retain a chat attachment for every created
  design. Those attachments differ from the incorrectly persisted image in
  the duplicate groups. The historical chat attachment is therefore the
  primary recovery candidate, not the current canonical/listing image.
- The database has no explicit `diamond` or `unicorn` tags. The current public
  mapping nevertheless labels nine available listings as Diamond solely
  because text such as `Diamond Cubic Zirconia` occurs in a descriptive field.

The audit does not establish that every retained attachment is a good
customer-facing photo. It establishes that a recovery candidate still exists
for every affected submission. Each candidate must be re-evaluated before it
replaces a public image.

## Locked implementation decisions

1. A model may identify a candidate attachment by an application-owned
   attachment ID/index, but it must never provide or select a raw image URL
   for a catalog or listing mutation.
2. A photo's declared role, visual assessment, quality assessment, and final
   approval are separate state. A text inference alone may not approve a
   photo.
3. Packaging is not a rejection signal. A label/details photo is accepted as
   soon as it is readable, while only a photo declared as the jewelry-front
   photo may become public.
4. A jewelry-front photo is evaluated for clarity, usable resolution, and safe
   centering. Nic-Nac should coach only when one of those practical conditions
   fails, not because a card, box, or packaging is visible.
5. Rarity is an explicit, human-confirmed value: `standard`, `diamond`, or
   `unicorn`. No item becomes Diamond or Unicorn from its name, description,
   stone, collection, tags, or OCR text.
6. Every new item submission asks, in plain language: **“Is this piece a
   diamond or unicorn?”** The available answers are “No — standard piece,”
   “Diamond,” and “Unicorn.” No response defaults to `standard` only after the
   user has had the question presented.
7. Sparkle Finder uses the same shared intake/rarity contract. It is expected
   to be the primary source of confirmed diamond/unicorn collection entries;
   its entries must still be explicit, not inferred.

## Phase 0 — containment and recovery inventory

**Goal:** stop bad assets from spreading while preserving every source record.

1. Add a narrowly scoped operator report for designs/listings created during
   the affected window and any future record where:
   - source image hash differs from its selected attachment hash;
   - one photo hash is used by more than one newly created design without an
     explicit reuse approval;
   - a public listing references a design with `photo_pipeline_status` of
     `error`, `rejected`, or `qa_review`;
   - a listing is categorized Diamond/Unicorn without the future explicit
     classification value.
2. Build a signed, immutable recovery manifest. For each candidate it records:
   listing ID, design ID, item number, currently public photo hash/path,
   candidate attachment ID/hash, role/quality assessment, reviewer decision,
   replacement asset IDs, and before/after timestamps.
3. Do not delete any current public, staged, or conversation asset. Mark
   records `needs_photo_review` in an additive review state; do not overwrite
   the original record before a corrected asset is successfully published.
4. Temporarily suppress only the affected listing cards from Heather's public
   Dance Floor after the manifest is verified. Keep their history visible to
   the authorized operator and do not remove unrelated inventory.

**Exit criteria:** the 11 Heather records and the supplemental `ER38483` record
are pinned in immutable manifests; every replacement has a recoverable
candidate attachment with exact identity and hash guards; no record is hidden,
changed, or republished before its manifest is approved.

## Phase 1 — photo authority and state-machine repair

**Goal:** make photo selection deterministic and application-owned.

### 1. Attachment authority

- Remove `piecePhotoUrl` and `listingPhotoUrl` as model-controlled mutation
  inputs for new catalog designs and Dance Floor adds.
- Replace them with an opaque, server-issued `selectedPhotoId` that resolves
  only against the active workflow's saved photo rows.
- Reject a selection when it is not in the active workflow, belongs to a
  different rep/conversation, is expired, or does not match its captured
  attachment hash.
- Resolve bytes server-side immediately before processing and record source,
  selected, cropped, enhanced, and published hashes in the mutation receipt.
- The only intentional reuse path is an approved canonical photo for a known
  catalog design. It must be explicit in the receipt and cannot be used to
  create a new catalog design.

### 2. Photo state

Extend the workflow photo state with app-owned values such as:

```ts
type PhotoRole = 'label_details' | 'jewelry_front' | 'unknown' | 'other'
type VisualAssessment = 'jewelry' | 'label_or_packaging' | 'uncertain'
type PhotoDecision = 'pending' | 'approved' | 'blocked' | 'needs_review'
```

- The requested role may guide the initial declared role, but the server runs
  visual/quality assessment before granting `approved`.
- The rep's requested/uploaded role is authoritative: `label_details` supplies
  readable facts and `jewelry_front` supplies the public photo. Visual
  heuristics may assist cropping but do not overrule a clear role assignment.
- A readable label/details photo passes even when it is entirely packaging.
  A jewelry-front photo passes when it is clear and can be centered without
  cutting off the piece.
- `ready_to_add` requires an `approved` `jewelry_front` photo, or a separately
  approved canonical fallback for an already-known design.
- Completion requires the image receipt, listing/design write receipt, and a
  database readback that all point to the same selected asset.

### 3. Crop and enhancement

- Replace the fixed centered-square crop with subject localization. A crop is
  permitted only when detected jewelry bounds are sufficiently confident and
  the crop improves coverage while retaining the entire visible piece.
- Keep the original photo immutable; save a derivative rather than overwriting
  it.
- Restore the missing production PhotoRoom configuration only after its
  configuration preflight succeeds. Enhancement is an optional improvement,
  not authorization to publish an unapproved source image.
- If enhancement is unavailable or fails, use the approved original/crop only
  when it passed the same visual and quality gate. Otherwise route to review.
- PhotoRoom output must pass source-to-output QA and preserve the selected
  attachment hash lineage before canonical promotion.

**Exit criteria:** no raw model URL can become a public image; a photo declared
as `label_details` cannot satisfy `jewelry_front`; packaging is never a failure
reason; and an enhancement outage cannot publish an unclear or badly framed
photo.

## Phase 2 — explicit diamond/unicorn classification

**Goal:** preserve product meaning without classifying ordinary diamond-CZ
descriptions as rare inventory.

1. Add an additive, constrained catalog field, for example
   `rarity_classification = standard | diamond | unicorn`, plus:
   - `rarity_confirmed_at`;
   - `rarity_confirmed_by` / source context;
   - `rarity_confirmation_source` (`suite_intake`, `finder_collection`, or
     operator correction).
2. Backfill every existing design to `standard`; do not derive classifications
   from description text or old `search_tags`.
3. Remove the public Dance Floor word-match inference and render tier/filter
   state solely from the explicit value.
4. Add the exact Nic-Nac question before final submission. The assistant may
   explain why it asks, but it may not guess an answer.
5. In Finder, show the same decision during collection upload and preserve its
   answer through the shared catalog write path. A Finder-only UI may be
   tailored, but it must not fork the core data contract.
6. Preserve catalog discovery tags as non-rarity search terms. Explicit
   `diamond` / `unicorn` search tags are retired or ignored for classification.

**Exit criteria:** all current listings render Standard; a textual “diamond
cubic zirconia” value cannot produce a Diamond badge; only an explicit answer
can produce Diamond or Unicorn.

## Phase 3 — historical repair run

**Goal:** repair the eight incorrect records in Heather's 11-record batch plus
the one earlier `ER38483` mismatch, safely and auditably. The three correct
Heather records remain pinned as reviewed-retain controls.

### Per-record workflow

1. Load the immutable manifest row and its saved chat attachment. Confirm its
   hash, rep ownership, conversation/session link, and item number before any
   asset write.
2. Re-run the new server-side visual, role, quality, and subject-localization
   checks on the candidate.
3. Present a compact operator review containing the candidate photo, current
   public photo, item details, duplicate-hash warning, and proposed crop.
4. If approved, publish a new versioned asset; update only that design's
   canonical photo and that listing's listing photo in one guarded operation.
   Preserve original paths and add a recovery audit event.
5. Read the rows back, verify the published hash is the approved candidate or
   derivative, verify the public Dance Floor card returns the correct asset,
   and record the result in the manifest.
6. If the attachment is a label/back card, a wrong item, or poor quality,
   keep the record hidden and mark `needs_reupload`. Nic-Nac can later request
   one correct jewelry-front photo from Heather without losing the existing
   catalog facts.
7. Restore the card to Heather's Dance Floor only after review and public-card
   verification. Never bulk-unhide all records.

### Expected initial recovery groups

- `RBP4645`, `ER59000`, `ER43143`: shared incorrect output; inspect each
  original conversation attachment separately.
- `RBP5273`, `RBP5906`, `ER77719`: shared incorrect output; inspect each
  original conversation attachment separately.
- `ER11309` (one variant): its current public image is the `ER54334` label.
- `ER43437`: its current public image belongs to `ER43143`.
- `ER54334`, the other `ER11309` variant, and `ER29067`: retain their current
  image because source review confirmed it is already correct.

**Exit criteria:** all 12 explicitly reviewed manifest records have a final
outcome of `repaired`, `retained`, `needs_reupload`, or `not_a_listing`; all 58
current listings have a documented review disposition; none retain an
unexplained mismatched or cross-item duplicate public source image.

## Phase 4 — replay bank, tests, and observability

### Deterministic tests

- Raw URLs cannot be accepted by the add-listing mutation contract.
- An attachment from a prior workflow cannot be selected by a new workflow.
- Consecutive submissions with different images retain distinct asset hashes.
- A duplicate hash is rejected unless canonical reuse is explicitly allowed.
- A photo declared as `label_details` cannot be selected as the public photo,
  while readable label photos are accepted for fact extraction.
- Clean boxed-display photos pass without instructions to unbox or use a plain
  background.
- Subject localization refuses to crop when its bounds are uncertain.
- Enhancement configuration failure leaves the item in review; it never
  publishes a failed source photo.
- “Diamond Cubic Zirconia” remains `standard`; confirmed Diamond and Unicorn
  values render correctly.

### Model-in-loop replays

Run with real fixture image parts for:

1. label then boxed front;
2. boxed display only;
3. back-of-card only;
4. three consecutive distinct submissions in one conversation and across
   conversation rollover;
5. duplicate item number with a distinct stone variant;
6. a rep correcting Nic-Nac's photo-role mistake;
7. standard/diamond/unicorn confirmation in Suite and Finder contexts.

For every replay retain run ID, workflow state before/after, selected
attachment ID/hash, image decisions, tool input/result, database readback,
hard-fail phrase count, cost, and latency.

### Reviewer smoke

Use the supported synthetic reviewer path only. Verify the actual live
`https://www.yoursparklesuite.com` Dance Floor after release, including a
published repaired card and a withheld `needs_reupload` card. Do not use
Louis's or Heather's personal session for smoke testing.

**Exit criteria:** all deterministic cases pass; three consecutive
model-in-loop passes cover the sequential-upload failure; browser smoke,
database assertions, and public-card assertions pass; hard-fail phrase count
is zero.

## Phase 5 — controlled release and monitoring

1. Verify the allowlisted branch, exact commit, GitHub remote, Vercel project,
   and current aliases before any release.
2. Deploy the verified branch tip manually to production under the repository
   release policy; confirm both Suite domains resolve to that deployment.
3. Run the reviewer smoke and then the approved historical repair batch.
4. Add a narrow alert for a repeated image hash across new designs, an asset
   lineage mismatch, a non-approved photo published publicly, a failed
   enhancement after a listing mutation, and any rarity classification without
   confirmation evidence.
5. Produce a final repair receipt for the 11 Heather manifest outcomes, the
   supplemental `ER38483` outcome, and any item requiring a re-upload.

## Explicit non-goals

- Do not modify Live Queue extension code, Chrome Web Store settings, or live
  show data.
- Do not infer rarity from item descriptions, photos, tags, collection names,
  price, or stone names.
- Do not bulk-delete the existing designs or photos.
- Do not switch models as a substitute for workflow, asset-lineage, and
  validation fixes.

## Remaining release gate

Louis approved the application/migration implementation and the historical
cleanup in principle. No production state has been changed. Before execution,
the work needs an isolated, explicitly approved release tip that excludes the
protected Live Lineup and Kelly work currently sharing this checkout/branch.
After that provenance gate is resolved, the order is: commit the exact scope,
push, apply the one reviewed migration, deploy the exact tip, synthetic live
smoke, apply both hash-guarded repair manifests, and verify all 58 current
listing dispositions (including the nine corrected public cards).
