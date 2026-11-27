# Christmas Jewelry Workshop (CJW-01)

The Community preset uses the rep's saved copy, links, and Amethyst layout. The workshop poster and silent landscape and phone videos live in `public/amethyst/skins/christmas-jewelry-workshop/`. Rudolph crosses the window once per 28.5-second cycle. The quiet arrangement of “Jingle Bells” and the indoor fireplace field recording share one visitor-started audio track with independent animation playback. Track and footage attribution is in `music-license.txt` beside the media.

The approved landscape is `hero-approved.png`. The separate portrait composition, `flyer-portrait-source.png`, preserves room for live text and a scannable QR. From the repository root, run `node scripts/card-qr/plate-sources/christmas-jewelry-workshop/build.cjs` to rebuild the flyer plate, business card plate, thumbnails, phone poster, and bundled web fonts. The existing flyer and business card builders place the rep's text and actual destination QR at export time.

Run `npx vitest run tests/christmas-jewelry-workshop.test.ts` for Community catalog, first-paint, QR decode, safe-area and print-PDF checks. Set `WORKSHOP_PROOF_DIR` to an output folder to write the proof images, PDF and reviewer HTML with synthetic data.
