# Nic-Nac dancer intake smoke checklist (September 19, 2026)

**Status:** checklist for PR #11. Do **not** deploy until Louis greens the
dancer PR separately from team-photo PR #12.

Dance Floor / Nic-Nac intake is the #2 Suite headache after Live Lineup.
This is the serious pass, not a glance. Kelly / Sparkly Butterflies is the
known repro. The contract is **every current and future Dance Floor**.

## What this cloud session could smoke

This SHA (`cursor/kelly-dance-floor-label-hero-693a`) was proven with the
deterministic kit only.

| Layer | Ran? | Result |
| --- | --- | --- |
| Focused Nic-Nac intake / photo-role / add-listing / Finder / Amethyst / smoke-script tests | Yes | See “Automated gate” below |
| `npm run smoke:nic-nac:trade-board-intake` live `/api/nic-nac` replay | Fail-closed | Reached `missing_assets` for `ER13229-label.jpg` + `ER13229-jewelry-boxed-front.jpg`. Default fixture dir is `C:\Users\louis\sparkle-suite-smoke-assets`. This VM has no `.env.local`, no reviewer-smoke secrets, no fixture JPEGs. The npm script now uses `--conditions=react-server` so the kit can import reviewer-smoke. |
| `npm run smoke:nic-nac:trade-board-non-item-number` | Fail-closed | Same fixture + env gap. |
| Chrome / Workspace reviewer-smoke UI | **No** | No deploy. Production still serves the previous SHA. A live hit of `https://www.yoursparklesuite.com` would smoke **old** code and confuse the dancer PR. |
| Kelly live public board rewrite | **No** | Owner-reviewed later. No production data patch. |

The ER13229 smoke kit **exists** and is the disposable reviewer path. After
Louis greens a dancer deploy, Sam should run it against that exact SHA, not
against today’s production.

Required local assets:

- `ER13229-label.jpg`
- `ER13229-jewelry-boxed-front.jpg`

Commands (reviewer/demo account, not Louis’s personal account):

```bash
npm run smoke:nic-nac:trade-board-intake
npm run smoke:nic-nac:trade-board-non-item-number
```

Override target only when smoking **this** SHA:

```bash
SPARKLE_NIC_NAC_SMOKE_APP_URL=http://localhost:3000 \
SPARKLE_NIC_NAC_SMOKE_ASSETS="C:\Users\louis\sparkle-suite-smoke-assets" \
npm run smoke:nic-nac:trade-board-intake
```

Do **not** point `SPARKLE_NIC_NAC_SMOKE_APP_URL` at production until the
dancer PR is the served SHA. The kit writes a reviewer listing, verifies it,
then removes it unless `SPARKLE_NIC_NAC_SMOKE_KEEP_LISTING=true`.

## Automated gate (this SHA)

Run before calling the PR ready for Louis’s greenlight:

```bash
npx vitest run \
  tests/nic-nac/workflow-photo-roles.test.ts \
  tests/nic-nac/trade-board-intake-controller.test.ts \
  tests/nic-nac/add-listing-recovery.test.ts \
  tests/nic-nac/add-listing-batch.test.ts \
  tests/nic-nac/with-error-handling-workflow.test.ts \
  tests/nic-nac/prepare-trade-board-work.test.ts \
  tests/nic-nac/trade-board-guided-start.test.ts \
  tests/nic-nac/trade-board-intake-route-context.test.ts \
  tests/nic-nac/system-prompt-add-listing.test.ts \
  tests/nic-nac/prompt-routing.test.ts \
  tests/nic-nac-trade-board-intake-smoke-script.test.ts \
  tests/nic-nac-non-item-number-smoke-script.test.ts \
  tests/nic-nac-jewelry-library-route.test.ts \
  tests/nic-nac-trade-board-route.test.ts \
  tests/services/listing-photo-processing.test.ts \
  tests/amethyst-trade-template.test.ts \
  tests/sparkle-finder-public-api.test.ts \
  tests/finder-quantity-aware-availability-migration.test.ts
```

## Checklist (all five locks)

### 1) Label vs jewelry photo roles

**Pass when:** a jewelry shot is accepted as the customer-facing hero.
A label/SKU card is never the Dance Floor hero.

| Proof | Where | This session |
| --- | --- | --- |
| Two uncertain same-turn photos stay unknown (no order pick) | `tests/nic-nac/workflow-photo-roles.test.ts` | Automated |
| Visual label is details-only; jewelry visual is the publishable photo | same | Automated |
| Label cannot satisfy jewelry-front readiness | `tests/nic-nac/trade-board-intake-controller.test.ts` | Automated |
| `add_listing` refuses when the only workflow photo is `label_details` | `tests/nic-nac/add-listing-recovery.test.ts` | Automated |
| Live ER13229: label turn, then boxed jewelry turn; listing `listing_photo_url` is set; hero bytes are **not** the label fixture | `npm run smoke:nic-nac:trade-board-intake` | **Needs fixtures + this SHA** |
| Kelly public cards: Statement / Half Moon Rhodium must not keep the Storyteller label as hero | live `https://sparklybutterflies.com/trade` after deploy + owner-reviewed repair | **Needs live Workspace / owner repair** |

Hard-fail phrases (live replay already gates these): `Unboxed`, `Plain background`, `Packaging is too prominent`, `I can't actually add listings`, `Log into your workspace and add it manually`.

Live Workspace click path (after deploy of this SHA):

1. Reviewer-smoke Workspace → Nic-Nac. Start Add Dancer.
2. Upload `ER13229-label.jpg` only. Expect a jewelry-photo ask. Do **not** accept a label hero.
3. Upload `ER13229-jewelry-boxed-front.jpg`. Finish rarity as standard.
4. Confirm the new dancer card hero is the boxed jewelry, `photoSource=listing`.

### 2) Same item number / different finish or stone

**Pass when:** the same Bomb Party item number with a different finish and/or
stone stays a separate listing with its own photo. Identity is `designId`
(June 27 / August 23–25), not item number.

| Proof | Where | This session |
| --- | --- | --- |
| `catalogVariantPhotoAssetKey` is `designId`, else official `material\|stone` | `tests/nic-nac/workflow-photo-roles.test.ts` | Automated |
| Batch add does not copy one jewelry-front onto another finish/stone | `tests/nic-nac/add-listing-batch.test.ts` | Automated |
| Jewelry Library + trade-board POST cache by `designId` | `tests/nic-nac-jewelry-library-route.test.ts`, `tests/nic-nac-trade-board-route.test.ts` | Automated |
| Display joins `listing.design_id`, never re-resolves by item number | `tests/amethyst-trade-template.test.ts` + `getTradeListingDisplayFields` | Automated |
| Live: add NK88350 Gold/Lapis and NK88350 Rhodium/Malachite as two dancers | Workspace Nic-Nac + public board | **Needs live Workspace** |

Live Workspace click path:

1. Add the first finish/stone with its own jewelry photo.
2. Add the second finish/stone of the **same item number** with a slightly different jewelry photo.
3. Confirm two dancer cards, two `design_id`s, two photos. Never one shared master image.

Do **not** copy Kelly’s Gold Half Moon jewelry onto Rhodium to “fix” a label hero.

### 3) Uncataloged / no-item-number path

**Pass when:** the piece shows on **that rep’s** Dance Floor, does **not**
enter `jewelry_designs`, and is **not** findable on Sparkle Finder.
Nic-Nac chooses the route (agent discretion). Not a forced path.

| Proof | Where | This session |
| --- | --- | --- |
| `addNonItemNumberListing` writes `listing_source='non_item_number'`, `design_id` null | `tests/nic-nac/add-listing-recovery.test.ts` + service tests | Automated |
| Canonical fallback requires `resolvedDesignId` (uncataloged cannot enter catalog) | `tests/nic-nac/workflow-photo-roles.test.ts` | Automated |
| Finder SQL / reads require `listing_source='catalog'` and a `design_id` | `tests/sparkle-finder-public-api.test.ts`, `tests/finder-quantity-aware-availability-migration.test.ts` | Automated |
| Non-item-number smoke: public DF has the row; Finder catalog filter does not | `npm run smoke:nic-nac:trade-board-non-item-number` | **Needs fixtures + this SHA** |
| Agent-discretion copy (not forced catalog / not forced uncataloged) | `tests/nic-nac/system-prompt-add-listing.test.ts`, `tests/nic-nac/prepare-trade-board-work.test.ts` | Automated |

Live Workspace click path:

1. “Add a dancer. I do not have an item number.”
2. Upload one clear jewelry photo + Collection Type and Size.
3. Confirm the card on that rep’s customer Dance Floor and Workspace board.
4. Confirm `listing_source=non_item_number`, `design_id` null.
5. Confirm it does **not** appear on Sparkle Finder availability.
6. Confirm Nic-Nac was not forced into this path merely because a number was missing.

### 4) Kelly UX (jewelry already in thread / empty colon / real save error)

**Pass when:** a jewelry photo already in the thread satisfies the
customer-facing jewelry gate; missing-details copy never ships an empty
list; a failed save surfaces the real redacted error.

| Proof | Where | This session |
| --- | --- | --- |
| Single boxed-display / uncertain photo is assigned `jewelry_front` | `tests/nic-nac/workflow-photo-roles.test.ts` | Automated |
| Jewelry ask wins over a visual label on a single-photo turn | same | Automated |
| Leftover unread label does not block save once jewelry + item number exist | `tests/nic-nac/trade-board-intake-controller.test.ts`, `tests/nic-nac/add-listing-recovery.test.ts` | Automated |
| `formatWorkflowNotReadyMessage` never interpolates `listing: .` | controller tests | Automated |
| Save escalate copy includes the redacted cause | `tests/nic-nac/with-error-handling-workflow.test.ts` | Automated |
| Live ER13229 kit now hard-fails the empty-colon sentence | `scripts/smoke-nic-nac-trade-board-intake.ts` | Kit ready; **needs live replay** |
| Live: one boxed jewelry photo must not be asked for again | Workspace Nic-Nac | **Needs live Workspace** |
| Live: force a storage/DB failure and confirm the real error is spoken | Workspace Nic-Nac | **Needs live Workspace** (do not invent a failure on production) |

Live Workspace click path:

1. Upload one clear boxed jewelry photo (hex-card studs are the known Kelly repro).
2. If Nic-Nac asks for the customer-facing jewelry photo **again**, fail.
3. If it still needs a field, the reply must **name** it. Fail on
   `I still need these details before I can save this listing: .`
4. Do not tell the rep everything is present and then say Nic-Nac is
   “having trouble uploading.”

### 5) All-reps path (not Kelly-only)

**Pass when:** there is no `rep_id` gate, no Kelly slug check, and no
one-off data patch that leaves other reps broken.

| Proof | Where | This session |
| --- | --- | --- |
| Jewelry-over-label helper takes `resolvedDesignId`, not a rep id | `shouldFallBackToCatalogCanonicalPhoto` + photo-role tests | Automated |
| Display path is shared Amethyst + Workspace | `getTradeListingDisplayFields` | Automated |
| Smoke kit uses reviewer/demo persona, not Kelly’s live rows | `scripts/smoke-nic-nac-trade-board-intake.ts` | Kit ready |
| Second-rep board after deploy | any non-Kelly Dance Floor | **Needs live Workspace** |

Do not repair Kelly’s stored Statement / Half Moon Rhodium canonicals from
this PR. Those stay owner-reviewed after the code SHA is live.

## Sam’s post-greenlight order

1. Confirm the served SHA is this dancer PR tip, **not** team-photo PR #12.
2. Confirm `www.yoursparklesuite.com` and `yoursparklesuite.com` match that SHA.
3. Put `ER13229-label.jpg` and `ER13229-jewelry-boxed-front.jpg` in
   `C:\Users\louis\sparkle-suite-smoke-assets`.
4. Run the two `smoke:nic-nac:trade-board-*` commands with reviewer-smoke
   (not Louis’s account). Expect cleanup unless keep-listing is set.
5. Walk the five live Workspace paths above.
6. Kelly public board is the repro for label-as-hero **after** an
   owner-reviewed repair, not a reason to mass-rewrite production rows.

A root-page HTTP 200 is not enough. The dancer card hero, `design_id`,
`listing_source`, and Finder absence are the proof.

## Related notes

- Repair / lineage: `docs/sparkle-suite/operations/2026-09-18-kelly-dance-floor-label-hero-repair.md`
- Smoke-gap lesson: `docs/sparkle-suite/lessons/2026-06-15-nic-nac-trade-board-smoke-gap.md`
- Reviewer-smoke standard: `docs/sparkle-suite/testing/reviewer-smoke-standard.md`
