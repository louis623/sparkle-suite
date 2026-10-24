# Seasonal business card templates

Built against the existing Cards & QR business-card renderer and builder controls. Print canvas: 1125×675 at 300 DPI, including 0.125-inch bleed around a 3.5×2-inch trim. The renderer's safe text box is (83,83)–(1042,592), 0.15 inch inside trim. Fonts, contact controls, QR layout and two-sided CMYK PDF export remain the existing implementation.

Rebuild: `node scripts/card-qr/plate-sources/compose-seasonal-cards.cjs`.

- Fall Owl reuses the existing approved `fall-owl.jpg` unchanged: original purple jeweled owl, amber wing gems/pendant, moon, branch and lake. The source manifest guards that exact card file and hero.
- Gobble & Fizz adapts the approved cauldron-only flyer direction to a horizontal front. `cauldron-source.png` is the offline built-in image edit; `generation.json` records the prompt. No turkey. The bowl, handles, foam and jewel sit right of the existing left text region.
- Pumpkin Pie uses the approved original `hero-poster-v4.webp`, with a soft ivory left readability scrim. Its theme uses the existing left-aligned style instead of the previous central panel that obscured the pie. The original cream, crust and tray remain visible at right. No generated replacement pie.

Only plate assets and the pie theme's front alignment change. All three backs retain the current palette, name/contact fields, optional text-to-link/social/discount fields and order QR. Example exports use synthetic Jordan Avery / example.com data. They are proofs, not customer orders or a printer submission.

Validation: actual front/back exports, normal/long shop-name safety, optional field bounds, PNG/JPEG QR decoding, two-page CMYK PDF trim/bleed boxes, and exact approved owl plate hash. Business card designs are newly prepared for visual review; the two October 24 flyer scenes are already approved. No Live deploy or saved-theme change.
