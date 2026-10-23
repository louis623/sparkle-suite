# Gobble & Fizz — QR flyer plate

Rebuild: `node scripts/card-qr/plate-sources/compose-thanksgiving.cjs gobble-and-fizz`

The approved hero's turkey, copper pot, amber gem and bubbles remain original
pixels in `subject.png`. They are uniformly reduced to 420×375 at (330,1545),
below the flyer content. `top.png` is the original lantern, `side.png` is the
original autumn canopy, and `floor.png` is one narrow original tabletop band.
The middle is an open plum palette field for the unchanged centered QR.

Output: `public/amethyst/skins/gobble-and-fizz/flyer/plate.webp`, 1080×1920.
The registry retains `hero-poster.webp` as its source. The source hash is checked
before rebuilding. No new turkey, resized landscape cover, duplicated scene,
blur filter, provider call or rep-setting change is involved.

Source SHA-256: `a78c049be1137a38b40e0a4e131be568d602b2e7d03690abd6f31b322f2f9372`.
Plate SHA-256: `9ec49e2cc07f2f750c63576f0e6613cb0271e3f067c65c398f6f50c9cb566861`.
Identity and PNG/JPEG QR checks: `tests/thanksgiving-flyer-plates.test.ts`.
