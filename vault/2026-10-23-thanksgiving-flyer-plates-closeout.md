# October 23, 2026 — Gobble & Fizz and Pumpkin Pie flyer plates

After approving the finished Fall Owl plate, Louis asked for the same QR flyer
background work for Gobble & Fizz and Pumpkin Pie. The no-Live-merge/deploy and
no-saved-theme-change restriction continues. This extends PR #151; it does
not authorize a production release. Fall Owl's approved bytes are unchanged.

Both themes now have dedicated 1080×1920 `flyer/plate.webp` assets. Registry
`plate` references point to those files; `source` keeps each approved hero.
`pie_please` is the stable ID for the user-facing name Pumpkin Pie.

All subject and decorative imagery is extracted from the approved hero pixels.
No image generation was used. Gobble & Fizz retains the complete turkey,
copper fizz pot, amber gem and bubbles below the QR; original lantern and
canopy frame the top. Pumpkin Pie retains the mouse-free v4 pie, whipped cream
and jeweled tray at the lower right, original floral arrangement above, and
softly blended original cloth at the lower left. The centered QR and renderer
layout are unchanged. Open middle areas use each hero's palette.

Reproducible builder: `scripts/card-qr/plate-sources/compose-thanksgiving.cjs`.
Dedicated subject/top/side/floor pieces and README are under each theme's
`scripts/card-qr/plate-sources/` folder. Hash guards protect both approved heroes.

Verification: 19 focused Vitest tests pass (12 new Thanksgiving checks plus 7
Fall Owl regressions) in the isolated PR renderer harness. Checks cover exact
subject pixels, encoded detail, source hashes, portrait dimensions, title/QR
clearance, centered QR, and decoded PNG/JPEG outputs for short and long titles.
Actual renders and source-to-plate boards were visually inspected. Rebuilds
produce byte-identical assets. Full app build/deployed browser smoke not run.

Plate SHA-256:
- Gobble & Fizz: `9ec49e2cc07f2f750c63576f0e6613cb0271e3f067c65c398f6f50c9cb566861`
- Pumpkin Pie: `f44fffb5aec5af57207f0a2ee2297d2e5e2d4c21b7bf008635faa310d3e2ae43`
- Fall Owl unchanged: `1a820be139f933587f3efdce73bbda020fd6dbbb04cf3fa067cd1676d0289787`

Local review boards and rendered sample flyers are under
`artifacts/thanksgiving-flyer-plates/gobble-and-fizz/` and `pie-please/`.
Each `comparison.png` shows the approved hero, plate and actual rendered flyer.
QR destinations use example.com with sample rep data and no provider effects.
Re-rendering resets the sample. No real customer, saved-theme, extension,
database, Vercel deployment/alias or Live state was changed.

The shared checkout's unrelated dirty work remains preserved. Commit only
this scoped patch on the existing PR head with an isolated Git index.

## Fuller-art revision after Louis's feedback

Louis said both initial plates were too basic with too much unused room and
suggested sharing original art between them. Those first-pass hashes above
are superseded. The revision fills top, side and bottom-corner space with
original-pixel maple borders, copper pumpkins/berries, bubbles and jewelry.
Sharp maple foliage from Gobble is shared with Pumpkin Pie; its out-of-focus
background leaf crop was rejected because it also caught part of the pie rim.
No new subject was generated. The main turkey/pot and pie/cream/tray remain
unchanged single subjects; only decorative motifs repeat. QR/text positions
and the approved Fall Owl plate are unchanged.

Current plate hashes:
- Gobble: `dcd08a5dab3318b2750b6b31e9c29f9377649182dbbf740ad909628ab31f98f3`
- Pie: `bd2011a720f6cdd5e531a9876f3ab6c2e5d3bfb07cefb160772670722b690db7`

All 19 focused tests pass again, actual sample flyers decode, repeated builds
are byte-identical, and the updated comparison boards were visually inspected.
These fuller revisions are for Louis's review; do not claim he has approved
them yet. No merge, deploy, customer-theme or Live-state change.
