# Kelly Dance Floor label-as-hero repair (September 18, 2026)

**Status:** code fix is in review. Do **not** apply production data repair until
Louis reviews a per-listing manifest. Do **not** deploy from this note.

## What went wrong

Nic-Nac's Add Dancer path still owned photo *roles* in workflow state, but two
photos uploaded in one turn inherited a single conversation role. After Nic-Nac
asked for the jewelry photo, both the label/details card and the clean jewelry
shot could be stored as `jewelry_front`. Publish then used the last accepted
photo or a model `selectedPhotoId` / `listingPhotoUrl`. Label cards with
visible jewelry (SKU card under a bagged necklace) passed as "jewelry" and
became the Dance Floor hero. Deleting and re-uploading could keep the same
wrong image when the model pointed at the old attachment.

This is the same class of failure Heather hit on September 11. The September 13
contract already said label photos are details-only and the model must not pick
catalog media by raw URL or attachment order. That contract was not enforced
for same-turn two-photo intake.

## Code contract restored

- Same-turn two-photo intake assigns **label** and **jewelry** as distinct
  roles. A visual label/packaging photo is pinned as `label_details`.
- `label_details` and `visualRole=label_or_packaging` cannot become
  customer-facing media.
- If the model points at a label (`selectedPhotoId` / raw URL / index), the
  app ignores that pick and uses the workflow jewelry-front photo.
- An active workflow never falls through to conversation order or a raw model
  URL for the public hero.

## Verify on Kelly's Dance Floor after this SHA is deployed

Do this on `https://sparklybutterflies.com/trade` (and the matching Workspace
Nic-Nac Add Dancer chat). Do not use Louis's personal account.

1. Start Add Dancer. Upload **two** photos in one turn: label/SKU card first,
   clean jewelry-facing photo second. Finish rarity as standard.
2. Confirm the new dancer card hero is the **clean jewelry** photo, not the
   SKU/label card.
3. Repeat with jewelry attached first and label second. Hero must still be
   jewelry.
4. If Nic-Nac asks for a jewelry photo and the rep sends both again, the new
   hero must be the new jewelry photo, not the previous label.

A root-page HTTP 200 is not enough. The card image URL must be the jewelry
asset.

## Existing wrong cards — fail-closed repair only

Do **not** mass-rewrite Kelly's Dance Floor. Some cards may be correct.

Use the same owner-reviewed manifest pattern as Heather / ER38483
(September 13):

1. Dry-run a photo audit for Kelly's Sparkly Butterflies `rep_id` only:

   ```bash
   npx tsx scripts/audit-trade-board-photos.ts --rep-id=<KELLY_REP_ID>
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
