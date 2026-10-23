# Fall Owl flyer plate — high perch A

Louis chose this placement on October 23, 2026. This is a Cards & QR art repair
only. Do not merge/deploy Live or change a rep's saved appearance to review it.

Run `node scripts/card-qr/plate-sources/fall-owl/compose.cjs` from the repository.
It checks the approved hero's SHA-256 before producing the pieces and the
1080×1920 `public/amethyst/skins/fall-owl/flyer/plate.webp`.

- `top.png`: the original owl, original moon and original branch, isolated with
  masks and uniformly reduced. The branch reaches the right edge. The complete
  owl is above the title's minimum y=258 and well above the central QR.
- `side.png`: the original upper-left autumn foliage, isolated from its sky.
- `floor.png`: one owl-free crop of the original lake and hills, placed at y=1483.
  Only its upper sky edge fades; the landscape is never stretched or blurred.
- `owl.png`: the source-resolution cutout, retained for identity verification.

The purple feathers, amber wing gems, face and amber pendant are copied pixels,
not image-generation output. Masks affect the exterior silhouette only. The
open middle is a smooth field in the hero's plum/autumn palette, not a stretched
image strip. The QR and flyer renderer are unchanged.

Approved source SHA-256:
`8ccb49ca53ccc0e5da7e6e50fdc02ef6d20735f70f09cc994f156d2180af9693`

Composition: source owl box (700,35,385,530), output width 169, output origin
(825,12); top piece 1080×290; foliage width 450 at (20,0); floor 1080×437 at
(0,1483). Source hero and rep settings remain unchanged.

Tests: `tests/fall-owl-flyer-plate.test.ts` checks dimensions, exact source owl
pixels, retained face/wing/pendant detail after encoding, unchanged hero source,
centered QR and decoded PNG/JPEG flyers with short and long sample titles.
