# Flyer plate sources

Generated art pieces (top crest, side garland, floor band) for each shared theme's QR flyer plate, plus the compositors that build `public/amethyst/skins/<skin>/flyer/plate.webp` (1080×1920).

- `compose.py <dir> <skin> [mode=light] base=R,G,B glow=R,G,B topw= topy= topcrop= gar= garw= gary= floorcrop= floordy= dust=R,G,B`
- `compose_pc.py` builds Pumpkin & Cat.
- `fall-owl/compose.py` scales `fall-owl/portrait.jpg` to the Fall Owl 1080×1920 plate. The landscape hero cannot be cropped into that portrait (owl on a hanging branch up top, open sky in the middle, lake once at the bottom).

Per-theme parameters used on 2026-10-08 are recorded in `docs/sparkle-suite/card-qr/flyer-art-tracker.md`.
