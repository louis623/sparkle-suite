# Flyer plate sources

Generated art pieces (top crest, side garland, floor band) for each shared theme's QR flyer plate, plus the compositors that build `public/amethyst/skins/<skin>/flyer/plate.webp` (1080×1920).

- `compose.py <dir> <skin> [mode=light] base=R,G,B glow=R,G,B topw= topy= topcrop= gar= garw= gary= floorcrop= floordy= dust=R,G,B`
- `compose_pc.py` builds Pumpkin & Cat.
- `fall-owl/compose.cjs` builds the approved high-perch Fall Owl 1080×1920 plate from original-pixel top / side / floor pieces; see `fall-owl/README.md`.
- `compose-thanksgiving.cjs [gobble-and-fizz|pie-please]` builds the two Thanksgiving plates from approved hero subject/decorative pieces, preserving centered QR space. See each theme's README.

Per-theme parameters used on 2026-10-08 are recorded in `docs/sparkle-suite/card-qr/flyer-art-tracker.md`.
