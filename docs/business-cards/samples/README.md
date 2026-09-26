# Sparkle Suite business-card samples

Living sample pack for printer QC and the Suite card tool.

Business Card Watch and Sam own updates to this folder.

Put exported PNGs and PDFs here. Prefer print-oriented exports when they are available.

No secrets. Do not commit credentials, customer lists, or payment data with these files.

Add real exports only. Do not invent card files.

## Two card types

Each rep can have up to two card types. Not every rep uses both.

```text
docs/business-cards/samples/{rep-slug}/
  regular/                 dropped in orders
    classic/               approved “classic” designs, kept for reference
    current/               the one press-ready pack used for print and reorders
    retired/               previous currents, after that type’s design changes
  vip/                     VIP discount card; optional
    classic/
    current/
    retired/
```

`regular/` is the card dropped in orders. It may include a thank-you, a discount code, a QR code, or similar order copy.

`vip/` is the VIP discount card. Some reps use it. Some do not. Skip the `vip/` tree for a rep who does not use one. An empty `vip/` stub does not mean that rep has a VIP card on press.

Lindsey and Brittany are stubbed with both types (`lindsey/`, `brittany/`) so the layout is in the repo. Add `regular/` when a future rep’s first real export arrives, and add `vip/` only if that rep uses a VIP discount card.

## Reorders

Reorders use that type’s `current/` only. Keep that pack and send it again. A reorder must not trigger a new design.

Brittany-class volume (about 1000 cards every couple of months) must never force a redesign. Volume is a reason to reuse `current/`, not a reason to remake the card.

When a rep changes one type’s design, move the files in that type’s `current/` to its `retired/`, then put the new press-ready pack in `current/`. Leave `classic/` in place as the approved reference set for that type. Changing `regular/` does not retire `vip/`, and changing `vip/` does not retire `regular/`.

## Later

QR flyer packs stay a separate mode. They are not a third card type beside `regular/` and `vip/`. A later layout can mirror classic / current / retired for flyers (previously sketched as `current-flyer/`). Do not create flyer folders yet.
