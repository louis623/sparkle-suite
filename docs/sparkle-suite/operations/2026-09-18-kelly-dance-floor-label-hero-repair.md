# Kelly Dance Floor label-as-hero repair (September 18–19, 2026)

**Status:** code fix in review. Do **not** apply production data repair until
Louis reviews a per-listing manifest. Do **not** deploy from this note.

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

## Code contract (this follow-up)

- A usable workflow jewelry-front photo always wins over a shared catalog
  canonical. Canonical is last-resort only when no jewelry-front exists.
- `selectedPhotoId` and the resolved workflow jewelry source are part of the
  add mutation identity, so a re-upload cannot replay the old photo.
- New-design and implicit listing-photo conversation fallbacks use only the
  latest user turn. They must not copy another SKU’s photo from earlier in
  the chat.
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

## Verify on Kelly's Dance Floor after this SHA is deployed

Do this on `https://sparklybutterflies.com/trade` (and the matching Workspace
Nic-Nac Add Dancer chat). Do not use Louis's personal account.

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
