# Seasonal Cards & QR templates — October 24, 2026

## Decisions and scope

Louis approved the cauldron-only Gobble & Fizz flyer, then the oversized Pumpkin Pie flyer. Fall Owl high-perch A remains approved. Earlier turkey/cutout-border designs and custom-overlay screenshot examples are rejected. Approved flyers are now installed in the scoped PR files, with original site heroes retained as source.

Louis then requested matching business cards for all three and explicitly required inspecting the real rep card builder first. Read CardQrTool, its card endpoint contract, bizcard-render/themes/font-map, pricing print spec, the export pattern, and existing card designs. The actual PR renderer was verified against Git source before rendering; no alternative card layout engine or fabricated overlay was used.

## Business cards

- Front canvas 1125×675 at 300 DPI: 3.5×2-inch trim with 0.125-inch bleed. Existing text safety is 0.15 inch inside trim, box (83,83)–(1042,592).
- Fall Owl retains the existing original-hero card JPEG byte-for-byte: same purple jeweled owl, amber wing gems and pendant, branch/moon/lake. Original hero and approved flyer also unchanged.
- Cauldron front adapts the approved cauldron-only artwork into a horizontal scene with the full bowl, handles, foam and jewel at right and existing shop/rep text at left. No turkey.
- Pie front uses original hero pixels and an ivory readability scrim. Its theme changes from the obscuring central panel to the existing left-aligned style used by other cards, exposing the pie, cream and tray at right.
- All backs preserve the existing palette, rep fields, optional email/domain/text-to-link/social/discount controls, and order QR. No account data, theme preference or purchase changes.
- New business card appearance has been prepared for Louis review; do not label it visually approved until he says so.

## Builds and validation

Card builder: scripts/card-qr/plate-sources/compose-seasonal-cards.cjs. Source provenance and exact built-in imagegen prompt: seasonal-cards/.

Flyer builder: compose-thanksgiving.cjs. Approved source scenes are split losslessly into top/side/floor pieces. No runtime generation. Superseded cutout subjects and border pieces removed. New tests compare every flyer output pixel to the approved scene, rather than requiring the rejected turkey placement.

25 focused Vitest tests passed against exact scoped PR source in the isolated renderer harness: 7 unchanged Owl tests, 8 approved Thanksgiving flyer tests, 10 seasonal business-card tests. Checks cover unchanged hero/approved owl hashes, true dimensions, normal/long front text bounds, right-subject clearance, all optional back fields, PNG/JPEG QR decoding, and two-page CMYK PDF trim/bleed boxes. Both builders rebuild byte-identically. All front/back proofs match the installed plate bytes. Full application build and deployed browser smoke were not run; no renderer/API/UI workflow changes.

Review: artifacts/creative/2026-10-24-seasonal-business-cards/index.html and all-three-front-back.png. Each theme folder has actual front/back PNGs, a long-title proof and a two-sided sample PDF. Synthetic Jordan Avery/example.com only; proofs are not printer submissions. Re-render with artifacts/fall-owl-plate-review/pr-input/render-seasonal-cards.ts from the harness directory.

## Git and release boundary

Work prepared in C:/Users/louis/sparkle-suite-repo on allowed codex/nic-nac-trade-hardening; target remains existing PR #151, cursor/fall-owl-flyer-plate-9b56, parent feb0d3331ea8e04d028cf35a129eeb02a3ccd199. An isolated Git index/tree preserves unrelated shared-checkout changes and HEAD. Only the scoped template/assets/build/test/memory changes belong in the PR.

No Live merge/deploy, Vercel alias changes, Kristen saved-theme change, other customer mutation, extension change or Finder change. No checkout, payment or printer order. Existing PR mergeability must be resolved separately before any future user-authorized release; this task does not merge it.
