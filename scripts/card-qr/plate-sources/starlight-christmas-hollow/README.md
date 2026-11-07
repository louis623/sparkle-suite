# Starlight Christmas Hollow source package

Community theme SC-01, selected by Louis November 6, 2026. This is a new shared design; Kim's existing private Gnome Garden theme and every saved rep selection remain unchanged.

## Art provenance

- `approved-hero.png`: selected concept 4, generated from Louis's supplied Kim-site screenshot (character identity) and Christmas-village reference (setting). Preserve the expressive blue-coated, red-hatted lantern gnome and three companions. AI-created interpretation, not an original-pixel extraction from Kim's screenshot.
- `flyer-portrait.png`: separately art-directed portrait edit of that approved scene, generated then revised to place all four gnomes below the real flyer overlay. Final generated image receipt: `exec-164f37a0-dea2-4a02-8b72-328a256cf85c.png`. Preserve the moonlit blue/gold setting and recognizable faces; leave the central title/QR/instructions area quiet. This is edited artwork, not a stretched landscape screenshot.
- The full original concept prompts and motion submission are retained in the session artifact directory `artifacts/creative/2026-11-06-gnome-christmas-concepts` in Louis's original workspace. These source PNGs are retained here for offline rebuilding.

## Rebuild

Run `node scripts/card-qr/plate-sources/starlight-christmas-hollow/compose.mjs` from repository root. It deterministically converts the retained art into the 1280×720 hero poster, 1125×675 business-card plate, and 1080×1920 portrait flyer. It makes no paid API calls. The existing flyer and business-card renderers add real editable rep information and QR codes.

Set `STARLIGHT_REVIEW_OUTPUT` to an absolute directory, then run `npx tsx scripts/starlight-review.ts` to generate the four safe customer-page proofs, five production-rendered homepage layout proofs, finished flyer PNG/JPG, card front/back, and two-page print PDF. Sample QR destination is `https://example.com/starlight-review`; it is intentionally not a rep's live code. This review script does not ship sample data into customer sites.

## Motion and sound

Direct Higgsfield API, model `bytedance/seedance-2.5/image-to-video`, request `01a1b371-d978-7f44-a410-df419c5b3055`; one paid request, 16 seconds, 720p, identical approved start/end image, audio generation disabled. Quoted estimate $7.3952 before discounts; actual wallet charge was not independently checked. Louis's cap was approximately $12. No additional Higgsfield generation was used.

Original motion is retained in the session artifact directory. Final hero is 1280×720 H.264, 24 fps, 15.5 seconds, 3,370,008 bytes, fast-start MP4 with no audio stream. A 0.5-second circular overlap joins the end to the beginning; no reversal, freeze padding, stabilization, or camera movement was added. See the session `video-edit/edit-plan.json` for edit order.

Music: **Christmas Music Box**, Music_For_Videos / Anastasia Chubarova, selected by Louis as option 1. Source: https://pixabay.com/music/lullabies-christmas-music-box-162373/ . License: https://pixabay.com/service/license-summary/ and track certificate https://pixabay.com/music/162373/license/ . Retrieved November 6, 2026 through the user's browser. It is incorporated into this website theme, not offered as a standalone music product. The source listing identifies Content ID registration; retain this provenance for any later video-platform use.

The complete 77.844898-second instrumental uses gentle endpoint fades and an independent clock. It does not restart on each video loop. Customer sound starts off, can be enabled explicitly, and pauses with the scene or when it leaves view. Media failure retains the poster. Existing saved motion-off and reduced-motion settings are honored.

## Release boundary

No database migration or rep assignment has been applied. `20261107000100_add_starlight_christmas_hollow.sql` grants Community access to **all** reps when applied; it must not be used as a demo-only promotion. Production still requires the current quality gates, Rocky review, Louis's explicit Live approval, and demo-first verification. Preview proofs and source checks are not evidence of a deployed rep workflow or slow-4G performance.
