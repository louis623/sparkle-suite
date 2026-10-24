---
name: sparkle-suite-business-card-builder
description: Build matching Sparkle Suite business-card artwork using the existing rep builder, front/back layouts and print export. Use for business-card requests and the printed-card deliverable of every new Sparkle Suite theme.
---

# Sparkle Suite Business Card Builder

Create a theme-matched front and compatible back that look right in the existing Cards & QR tool and survive print/export. New-theme work includes these automatically alongside the [QR flyer](../sparkle-suite-qr-flyer-builder/SKILL.md). A website skin preview/branding card does not satisfy this deliverable.

Paths below are relative to the repository root. Inspect current implementation before making artwork; do not derive the format from a screenshot, stale print stub or an imagined business card.

## Read the actual builder

- `app/nic-nac/components/CardQrTool.tsx`: business-card section (currently step 5), front/back previews, field toggles and actual download/order controls.
- `lib/workspace/card-qr/bizcard-render.ts`: dimensions, safe area, title fitting, back layout, QR and CMYK PDF.
- `bizcard-themes.ts`, `bizcard-font-map.ts`, `bizcard-copy.ts`, `card-files.ts`, `design.ts`, `design-theme.ts`, `pricing.ts` in that directory: mapping, typography, allowed fields and current print/order contract.
- `app/api/workspace/card-qr/card/route.ts`: `front`, `back` and `pdf` server exports.
- Existing `card-plates/` and `scripts/card-qr/plate-sources/compose-seasonal-cards.cjs`: artwork and repeatable-build examples.

## Current print and layout contract

Use the renderer constants as the source of truth and recheck them before building:

- Raster plate: **1125 x 675 px at 300 DPI**.
- Trim: **3.5 x 2 inches**, with **0.125-inch bleed** per edge (37.5 px in the raster geometry).
- Current renderer safe text box: **(83,83) to (1042,592)**, approximately 0.15 inch inside trim. Older pricing/spec copy says 0.125-inch safe; do not loosen the renderer's stricter safe box to match that copy.
- Artwork fills the bleed; critical features/text stay clear of trim and safe boundaries. Preserve the existing front shop title and rep line, fonts and fitting rules.
- Back retains the existing theme palette, left QR and right contact information, representative role line, optional fields and warnings. Exercise name, email, eligible custom-domain website, social handle/platform, text-to-link and discount-code line. Do not invent a website for a rep without a custom domain or collapse long data into illegible type.
- Current print output is a **two-page CMYK PDF**, front then back, with trim/bleed boxes and crop marks. Use the real export function; DPI metadata or an RGB image embedded in a PDF alone does not establish print readiness. Stock/fulfillment/pricing come from the current tool, not an art brief.

## Art direction

Inspect the approved hero/flyer and preserve its subject, jewelry, colors, lighting and warmth. Keep exact source pixels when identity is locked. Do not generate a substitute character or invent decorative clutter. Use approved image edits only when needed to recompose the scene, honoring any no-new-art instruction.

Landscape cards need their own composition. A crop/reframe of the original hero is appropriate when it preserves the subject and fits the existing text layout; a crop of the tall flyer is not automatically a card design. Check the full front after text is placed before deciding.

Use a suitable existing layout variant. A calm text region, subtle palette-matched scrim and an offset focal subject often work better than an opaque center panel covering the artwork. Do not assume every future card must put its subject on the right; follow the existing renderer's available alignments and the theme's composition. Do not modify the shared renderer to rescue one art asset without separate product scope.

Approved October 24 examples:

- **Fall Owl:** retained the existing original-hero card JPEG byte-for-byte. Approved work need not be regenerated to count as a matching deliverable.
- **Gobble & Fizz:** horizontal adaptation of the approved cauldron-only scene; full pot/handles/fizz/gem at right, calm plum space under the existing left text. Turkey removal was explicitly approved for this theme.
- **Pumpkin Pie:** original hero, gentle ivory scrim at left and the existing left-aligned theme variant. This exposed the pie at right; the earlier center text panel obscured it.

## Implement and verify

1. Build `lib/workspace/card-qr/card-plates/<key>.jpg` at the correct resolution/density. Preserve quality and small jewelry details; inspect the actual output, not only the source. Keep approved source files, hashes, exact image-edit prompts when used, and reproducible composition under `scripts/card-qr/plate-sources/`.
2. Add/update the correct `bizcard-themes.ts` record and current shared/private mapping, font map and picker assets as needed. Changing a card's alignment can be the entire theme-token change; preserve compatible backs and existing fields. Verify the picker resolves the real output, not merely a thumbnail.
3. Render with `renderBizcardFront`, `renderBizcardBack` and `buildBizcardPrintPdf` from the current candidate source. Use ordinary and long shop/rep names; enable optional back fields. Check bounds, overflow/warnings, small-text readability, artwork identity and subject visibility.
4. Show the **actual front and back together**, at useful inspection size and approximate printed size. When fidelity is in question, show approved source beside final card. Label synthetic sample text; distinguish bare plate, rendered card and in-tool preview.
5. Decode the actual back QR in exported PNG and a representative JPEG conversion; verify the expected URL and chosen center mark. Inspect the real two-page PDF's CMYK format and trim/bleed boxes. Local example: `tests/seasonal-business-cards.test.ts`; add theme-appropriate assertions without freezing all future cards to its right-subject coordinates.
6. Rebuild deterministically and compare approved assets. Then verify the actual deployed tool's picker, both previews, field toggles and available exports on the authorized target. Do not place an order, change shipping details or trigger a payment to verify art.

## Completion and release

Deliver the front plate, theme mapping/back styling, reproducible sources, real front/back proofs and validated print output together. Reuse approved compatible assets when possible. The skin's display/browse card is still a separate concern handled by the skin builder.

Follow current repository release instructions and [production-smoke](../sparkle-suite-production-smoke/SKILL.md); no theme selection for an art review may change a customer's saved site. Keep artwork readiness, deployment readiness and signed-in verification status distinct. If reviewer access is unavailable, report the missing check precisely. A personal browser session is not needed to deploy; do not imply that additional session permission blocks an already authorized release when independent build/export checks can proceed. Never claim an authenticated test happened when it did not.
