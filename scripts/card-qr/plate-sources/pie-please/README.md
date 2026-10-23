# Pumpkin Pie — QR flyer plate

Rebuild: `node scripts/card-qr/plate-sources/compose-thanksgiving.cjs pie-please`

Use the approved mouse-free v4 hero. Its pie, whipped cream and jeweled tray
remain original pixels in `subject.png`, uniformly reduced to 650×372 at
(430,1548). `top.png` is the original autumn floral arrangement; `side.png`
is the original tablecloth with transparent top/right edges. The warm ivory
middle leaves clear space for the unchanged centered QR and readable panels.

Output: `public/amethyst/skins/pie-please/flyer/plate.webp`, 1080×1920.
The stable theme ID is `pie_please`; the user-facing name is Pumpkin Pie.
The registry keeps `hero-poster-v4.webp` as source. Source hashes are checked
before rebuilding. No new pie/animal, landscape cover crop, duplicated scene,
blur filter, provider call or rep-setting change is involved.

Source SHA-256: `dd0fe24624eca6e540e8e33949cbb85e7a224ce5cfcaaba711b59196aa49e27c`.
Plate SHA-256: `bd2011a720f6cdd5e531a9876f3ab6c2e5d3bfb07cefb160772670722b690db7`.
Identity and PNG/JPEG QR checks: `tests/thanksgiving-flyer-plates.test.ts`.

Fuller-art revision: Louis requested more original artwork and authorized sharing
art between the themes. Sharp maple foliage is shared from the approved Gobble
hero at the top, sides and bottom-left; isolated ruby/amber jewelry comes from
the Pumpkin Pie hero. The pie/cream/tray subject remains unchanged and appears
once. Both source hashes remain guarded by the shared builder.
