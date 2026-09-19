# Kelly Dance Floor label-as-hero repair (September 18–19, 2026)

**Status:** shared pipeline fix in review. Kelly’s screenshot is the **repro**,
not the scope. The variant distinguisher and jewelry-over-label apply to
**every current and future Dance Floor**. Do **not** ship a Kelly-only data
patch. Do **not** deploy from this note.

## What Louis’s September 19 screenshot showed

Kelly / Sparkly Butterflies public Dance Floor
(`https://sparklybutterflies.com/trade`):

1. **A Statement Of Sparkle Exclusive Bringback** MSRP $158 — inventory LABEL
   photo of NK96080 The Storyteller. Label text ≠ card title/price.
2. **Be The Light - Style Council Elite** — clean front-facing ring. Desired look.
3. **Half Moon Crescent** MSRP $132 — the **same** Storyteller label as card 1.
4. **The Marisol Earrings** — earrings on a BP card. Acceptable product shot.

## Live audit (September 19, read-only public API + image hashes)

Public `/api/amethyst/trade-board` on sparklybutterflies.com. Kelly `rep_id`
`b5404543-b90a-41cf-85f6-4e6d1d576cfa`.

| Card | Listing id | Item | photoSource | Stored file | Notes |
| --- | --- | --- | --- | --- | --- |
| Statement Of Sparkle | `d1f19f9d-8209-48f8-b48a-1b1e19fc5275` | NK57811 | **canonical** | `designs/d4e4f8e3-…/NK57811-source.jpg` | Bytes are the NK96080 Storyteller **label** |
| Be The Light | `ac044a4f-bde3-407e-a9c3-6ec085f0749f` | RG36805 | listing (cropped) | `RG36805-cropped.jpg` | Correct jewelry |
| Half Moon Crescent (Rhodium / Malachite, qty 2) | `d8b48125-86aa-4169-8d3e-6aebe8c4f8b2` | NK88350 | **canonical** | `designs/115404d6-…/NK88350-source.jpg` | **Byte-identical** to Statement’s file |
| Half Moon Crescent (Gold / Lapis) | `634c7445-0f11-4503-a80e-7ebf56bb86a5` | NK88350 | listing | `designs/1b30f6bd-…/NK88350-source.jpg` | Correct half-moon jewelry on BP card |
| The Storyteller | `ad91db88-f866-44a5-9769-216a51bb7548` | NK96080 | listing | `NK96080-source.jpg` | Correct Storyteller jewelry on BP card |
| The Marisol Earrings | `52cd5f5d-b0f3-42de-85bd-7bd062a84295` | ER94385 | listing | `ER94385-source.jpg` | Acceptable boxed display |

SHA-256 of Statement canonical and Half Moon Rhodium canonical:

`4d65756accb38cc08e9ab65a100ab91fc03f552419291ab67ed36b95287247ce`

Same image reused across two different SKUs. The Storyteller’s own listing
photo is a **different** hash and is already the clean jewelry shot.

## Lineage (April 2026 → now) — reconnect, do not replace

Repo starts March 25, 2026. Open Brain breadcrumbs verified against vault + git.

| When | Source | What it decided | Still true? |
| --- | --- | --- | --- |
| Apr 9, 2026 | Open Brain Gap 16 | `jewelry_designs` = one row per unique BP design. Item number is the golden key when present. Collection + type + material are context. `trade_listings` is one dancer row with its own listing photo. | Listing id + listing photo still exist. Item-number-only uniqueness does **not**. |
| Apr 10–11, 2026 | Open Brain Gap 20 + Gap 22 | Lindsey labels: prefix + 5 digits. Dedup = exact `item_number`. `add_listing`: exact match on `jewelry_designs`; `listing_photo_url` **optional**, else canonical; new designs store `material` + `main_stone` + `piece_photo` as fields (not yet unique keys). | Exact item-number lookup still runs first. Optional listing photo → canonical is the **original** Kelly write path. Material/stone were metadata until June. |
| Apr 12, 2026 | `acb4dbd1` `006_sparkle_suite_schema.sql` | `jewelry_designs.item_number TEXT UNIQUE NOT NULL`. | Dropped June 27. |
| Apr 27–28, 2026 | `10fec939` Task 1.5A, `dd86af2d` Task 1.5B | Service `resolveItemNumber` + `add_listing` implement Gap 22. | Still the write/display spine. |
| May 5, 2026 | Open Brain Phase 3.8 | Normalize item number; **same-batch dedup by item number**. | Watch: that collapse must not erase finish/stone variants. Reconnected in this PR: collapse/recovery now use official material+stone keys. |
| June 27, 2026 | `f1e225a9` + `20260627134500_…material_variants.sql` | **First variant-aware uniqueness:** item + material. `resolveItemNumber({ material })`. | Still the matcher. |
| August 23–25, 2026 | `720cdd74` + `f81eed6a` + Finder handoff | Item + material + stone. Increment by `design_id` + photo + notes. August 25 product truth: **“Exact catalog identity is `designId`.”** Same item number plus different main stone remains distinct. Listing photos stay separate from that variant’s canonical. | Still the matcher. Dance Floor display joins `listing.design_id`, not item number. |
| Sep 5, 2026 | Open Brain / vault | ER11309, ER90783 label photos on catalog + Dance Floor. Same class as Kelly: label written as canonical/listing hero. | Same repair class. |
| Sep 13, 2026 | Open Brain photo/rarity release | Jewelry-facing vs label roles. “Six remaining duplicate hashes are same-item-number **physical duplicates**, not cross-item reuse.” | Same-item same-photo is OK only for identical copies (quantity). Not for finish/stone variants. |

**First code that made same SKU + different finish/stone separate designs is June 27 (`f1e225a9`), not April.** April keyed new rows *with* material/stone fields and per-listing `listing_photo_url`, but catalog identity was still item-number unique. Do not treat Gap 20 exact-match as permission to collapse variants now.

**Does it still fire on Kelly’s Dance Floor?** Yes.

- Write: `add_listing` → `resolveItemNumber` with material/stone/`designId` (`lib/services/jewelry-database.ts`, `lib/services/trade-board.ts`, `lib/nic-nac/tools/add-listing.ts`).
- Customer cards: `GET /api/amethyst/trade-board` → `mapTradeListingToAmethystTradeBoardListing` → `getTradeListingDisplayFields`. Photo is **this listing’s** `listing_photo_url`, else **this listing’s** `design.canonical_photo_url`. Material/stone on the card come from that design. The API does **not** re-resolve by item number or pick a master SKU image.
- Live proof: Kelly’s Gold NK88350 (`1b30f6bd`) and Rhodium NK88350 (`115404d6`) are already separate `jewelry_designs` rows with separate files. June/August matching worked.

This PR does **not** invent a parallel matcher. Jewelry-over-label is layered on the already-resolved `design.id`. PhotoRoom cache identity reuses that `designId` or the official `normalizeJewelryMaterialKey` / `normalizeJewelryMainStoneKey` strings.

## Audit cause split

Same item number / different finish or stone = separate listings with their own photos is the **June 27 / August 23** rule, layered on April’s listing-id + listing-photo model. Do **not** “fix” by collapsing every row that shares an item number onto one master image. May 5 batch collapse is now variant-keyed so it cannot drop a different plating or stone.

| Wrong card | Cause class | What happened | What is **not** the cause |
| --- | --- | --- | --- |
| Statement Of Sparkle NK57811 | **Cross-SKU conversation reuse** + **label-as-hero write** | New-design / conversation-wide fallback copied the earlier NK96080 Storyteller **label** onto NK57811’s canonical. Display then used that canonical because the listing had no jewelry-front of its own (`uses_canonical_photo`). | Not same-item-number sharing. NK57811 is a different SKU from NK96080. |
| Half Moon Crescent Rhodium NK88350 (`115404d6`) | **Cross-SKU conversation reuse** + **label-as-hero write** | Same Storyteller label bytes became **this variant’s** canonical. Workflow jewelry, if present, was skipped because “catalog already has a canonical.” | **Not** Gold Half Moon photo reuse. Gold (`1b30f6bd`) already has a different design id and a correct jewelry listing photo. |
| Half Moon Crescent Gold NK88350 (`1b30f6bd`) | None | Listing photo is the correct half-moon jewelry. | Must stay untouched. Do not copy this jewelry onto Rhodium. |
| The Storyteller NK96080 | None | Listing photo is the correct Storyteller jewelry (different hash from the label reused above). | The label that leaked to other SKUs is a **details** photo for this dancer, not its hero. |

**Classification:** not a regression of June/August/August-25 `designId`
matching on Kelly’s cards. Those listings already have the correct separate
design ids, and Amethyst still joins `listing.design_id` (never re-resolves
by item number). This is a **bypass** of jewelry-front selection (canonical
skip + conversation label reuse) plus **bad stored canonicals** that never
received a jewelry-front write after matching.

A later **item-number-only PhotoRoom leak** did exist on the Jewelry Library
and trade-board POST routes: they already forwarded `designId` / material /
stone into `addListing`, but `processRepCustomListingPhotoUrl` still used
`filenameStem: ${itemNumber}-listing-photo` with no `variantAssetKey`. Same
SKU + different finish/stone could share an enhancement cache. This PR
reconnects those routes to `catalogVariantPhotoAssetKey` (`designId`, else
official `material|stone` keys).

**True label-as-hero selection failure:** yes. Catalog canonical fallback
skipped a confirmed workflow `jewelry_front`, and mutation identity ignored
`selectedPhotoId` / the jewelry bytes, so a label canonical stuck.

## How variants under the same item number are keyed

| Key | What it identifies | Photo rule |
| --- | --- | --- |
| `trade_listings.id` | One dancer row | Display uses **this listing’s** `listing_photo_url` first. |
| `jewelry_designs.id` | One catalog variant | Canonical belongs to **this** design only. |
| `item_number` | Shared shape / SKU | **Never** a photo identity. Multiple designs and listings may share it. |
| `material` / finish | Plating or metal (Rhodium vs Gold) | Passed into `resolveItemNumber`. Different finish → different design. |
| `main_stone` | Stone / color (Malachite vs Lapis) | Same. Ambiguous same-SKU rows stay unresolved until finish/stone is known. |
| Dancer photo role | Workflow `declaredRole` + visual role | `jewelry_front` / `jewelry` is the hero **for that listing**. `label_details` / `label_or_packaging` is details-only for that listing. |
| Quantity increment | `design_id` + `ring_size` + `listing_photo_url` + notes + prefs + rarity | Same item number with a different photo or finish does **not** increment into one card. |
| PhotoRoom `assetId` | Enhancement cache only | `repId:filenameStem:` plus the already-resolved `designId`, or official `material|stone` keys. Not a second matcher. |

Jewelry-over-label is layered on that existing identity. Canonical fallback
requires the June/August `resolvedDesignId`. Gold NK88350 jewelry is never
copied onto Rhodium NK88350.

## Root cause (code, all reps)

PR #7 stopped two-photo intake from inventing roles and barred
`label_or_packaging` from becoming the hero. That was necessary but not
sufficient.

A second write-path still won after delete/re-upload:

1. **Catalog canonical skipped the workflow jewelry photo.** When the item
   already existed in the shared jewelry database and the model omitted
   `listingPhotoUrl` (correct after PR #7 — use `selectedPhotoId` / workflow
   attachments), `add_listing` treated “has canonical” as permission to skip
   `processListingPhotoForAdd`. The listing was saved with
   `uses_canonical_photo=true`. If that canonical was a label — or another
   SKU’s label copied in — the Dance Floor hero stayed wrong even when a
   jewelry-front attachment existed in the same chat.
2. **Mutation identity ignored `selectedPhotoId` and the workflow jewelry
   bytes.** A same-workflow re-add of the same item number could replay the
   previous mutation and keep the old photo.
3. **Conversation-wide photo fallback reused an earlier SKU’s image.** New
   design creation searched every user image in the conversation. The most
   recent single-image turn (often a prior label) became the next design’s
   canonical. That is how NK57811 and NK88350 received the identical
   NK96080 Storyteller label as master catalog photos.

Display (`getTradeListingDisplayFields`) is listing-photo-first, then
canonical. It showed the wrong hero because the **stored** listing used
canonical and that canonical was the reused label. Not a frontend cache bug.

## Non-item-number dancers (existing path — do not invent another)

The no-label / photos-first add-dancer path already exists. Do **not**
create a second catalog model.

| Flag | Meaning |
| --- | --- |
| `catalogMode: 'non_item_number'` | Nic-Nac intake branch |
| `listing_source = 'non_item_number'` | `trade_listings` row type |
| `design_id` null | Required by `trade_listings_non_item_number_requires_no_design` |
| Finder | `listing_source = 'catalog'` + required `design_id` |

Contract, still true for every rep:

1. These listings **show** on that rep’s customer Dance Floor and Workspace board (`getTradeListingDisplayFields` + Amethyst public net RPC, no `listing_source` filter).
2. They **do not** write `jewelry_designs`. `addNonItemNumberListing` inserts listing-only. Jewelry-over-label / variant matching require a resolved `designId`, so they cannot push these into the master catalog.
3. They **are not** findable on Sparkle Finder (`list_sparkle_finder_availability_v2` and Suite Finder reads require `listing_source = 'catalog'` and a `design_id`).

V1 remains Nic-Nac-only, one piece at a time.

## Scope lock

All reps deal with same item number / different finish or stone. The write
path (`add_listing` single + batch, Jewelry Library POST, trade-board POST)
and the display path (`getTradeListingDisplayFields` → Amethyst + Workspace)
are shared. There is no `rep_id` gate, no Kelly slug check, and no one-off
hero rewrite that would leave Heather, Lindsey, or a future rep broken.

Existing wrong canonicals (Kelly Statement / Half Moon Rhodium, Sep 5
ER11309 / ER90783, any later label-as-hero) stay owner-reviewed later.
This PR does not patch production rows.

## Code contract (this follow-up)

- Label-vs-jewelry preference applies **per listing**. Prefer that listing’s
  clean jewelry shot over that listing’s inventory label.
- A usable workflow jewelry-front photo always wins over **that matched
  variant’s** catalog canonical. Canonical fallback is last-resort only when
  `resolvedDesignId` is known, the catalog row has a canonical, and this
  listing has no jewelry-front and no listing photo URL.
- Never reuse one listing’s photo across another listing just because item
  numbers match if finish, stone, or listing id differs.
- `selectedPhotoId` and the resolved workflow jewelry source are part of the
  add mutation identity, so a re-upload cannot replay the old photo.
- New-design conversation fallbacks use only the latest user turn. They must
  not copy another SKU’s photo from earlier in the chat.
- PhotoRoom / listing enhancement identity reuses the August 25 `designId`
  (or official `material|stone` keys before a design exists) on Nic-Nac
  add-listing **single and batch**, Jewelry Library POST, and trade-board
  POST. This is cache identity, not a second matcher. A multi-variant
  batch never copies one jewelry-front onto another finish or stone.
- PR #7 role rules still apply: labels are details-only; two uncertain
  photos stay unknown.

## Kelly-specific data (one-time repair, not a Kelly-only code hack)

These two **canonical** rows are bad in production today. Code will not
rewrite them. After this SHA is live, run the fail-closed manifest — do not
copy the Gold Half Moon photo onto the Rhodium variant.

| Listing | Design | Item | Current public photo | Repair |
| --- | --- | --- | --- | --- |
| `d1f19f9d-8209-48f8-b48a-1b1e19fc5275` | `d4e4f8e3-c15b-47df-bb7e-2d1b0007d1f1` | NK57811 Statement Of Sparkle | Shared Storyteller label (canonical) | Replace with that listing’s jewelry-front attachment if one exists and hashes match; otherwise Kelly re-sends the jewelry shot after the code fix |
| `d8b48125-86aa-4169-8d3e-6aebe8c4f8b2` | `115404d6-3148-43c2-8fed-d75e85dccc09` | NK88350 Half Moon Crescent (Rhodium / Malachite, qty 2) | Same shared Storyteller label (canonical) | Same. Do **not** use `634c7445-…` Gold/Lapis jewelry as the Rhodium canonical |

Do **not** “fix” The Storyteller (`ad91db88-…`) or Be The Light
(`ac044a4f-…`) or Marisol (`52cd5f5d-…`) — those listing photos are already
jewelry-facing.

Shared catalog designs NK57811 and NK88350 (Rhodium) now have a wrong
canonical. That can affect any future rep who lists those designs with
canonical fallback. The listing-level repair should also replace the
design canonical when the reviewer confirms the jewelry-front candidate.

## Verify after this SHA is deployed (Kelly is the repro)

The contract is every Dance Floor. Use Kelly / Sparkly Butterflies as the
known repro, then confirm a second rep’s board if one is available. Do not
use Louis's personal account.

On `https://sparklybutterflies.com/trade` (and the matching Workspace
Nic-Nac Add Dancer chat):

1. Start Add Dancer. Upload **two** photos in one turn: label/SKU card first,
   clean jewelry-facing photo second. Finish rarity as standard.
2. Confirm the new dancer card hero is the **clean jewelry** photo, not the
   SKU/label card. `photoSource` should be `listing`, not `canonical`, when
   a jewelry-front was uploaded.
3. Repeat with jewelry attached first and label second. Hero must still be
   jewelry.
4. If Nic-Nac asks for a jewelry photo and the rep sends both again, the new
   hero must be the new jewelry photo, not the previous label and not another
   SKU’s image from earlier in the chat.
5. After an owner-reviewed repair (or a fresh jewelry re-upload on the fixed
   path), confirm **Statement Of Sparkle**, **Half Moon Crescent** (Rhodium
   qty-2 card), and **Be The Light** on the live grid.
6. Confirm **Gold Half Moon** (`634c7445-…`) still shows its own jewelry, not
   the Rhodium card’s image and not a shared NK88350 master. Adding another
   NK88350 finish/stone must keep a new dancer with its own photo.

A root-page HTTP 200 is not enough. The card image URL must be the jewelry
asset, and Statement / Half Moon Rhodium must no longer share the
Storyteller label hash.

## Existing wrong cards — fail-closed repair only

Do **not** mass-rewrite Kelly's Dance Floor. Some cards may be correct.

Use the same owner-reviewed manifest pattern as Heather / ER38483
(September 13):

1. Dry-run a photo audit for Kelly's Sparkly Butterflies `rep_id` only:

   ```bash
   npx tsx scripts/audit-trade-board-photos.ts --rep-id=b5404543-b90a-41cf-85f6-4e6d1d576cfa
   ```

2. Visually review every `label_or_packaging` or `uncertain` finding against
   the retained `trade_board_intake_photos` rows. Keep a card if the public
   image is already jewelry-facing.

3. For each replacement, record listing id, design id, item number, current
   public photo hash, **jewelry_front** workflow photo id/hash, and reviewer
   decision. Fail closed if:
   - identity (rep, listing, design, item number) does not match
   - the candidate is not `declared_role=jewelry_front`
   - the design now has more than one current listing
   - hashes changed after review

4. Apply only with `scripts/repair-nic-nac-listings.ts --apply` after
   `NIC_NAC_REPAIR_CONFIRM=APPLY_REVIEWED_MANIFEST`. Dry-run first.

If a dancer has no retained jewelry-front attachment, do not guess. Ask Kelly
to send the jewelry photo again after this fix is live, or skip that row.

Nic-Nac can also replace one listing photo after the code fix: ask him to use
the jewelry-front photo already in that chat, not the label. That is still a
one-card, owner-watched repair — not a bulk rewrite.
