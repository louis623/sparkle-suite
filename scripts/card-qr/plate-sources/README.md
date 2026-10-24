# Flyer plate sources

Generated art pieces (top crest, side garland, floor band) for each shared theme's QR flyer plate, plus the compositors that build `public/amethyst/skins/<skin>/flyer/plate.webp` (1080×1920).

- `compose.py <dir> <skin> [mode=light] base=R,G,B glow=R,G,B topw= topy= topcrop= gar= garw= gary= floorcrop= floordy= dust=R,G,B`
- `compose_pc.py` builds Pumpkin & Cat.
- `fall-owl/compose.cjs` builds the approved high-perch Fall Owl 1080×1920 plate from original-pixel top / side / floor pieces; see `fall-owl/README.md`.
- `compose-thanksgiving.cjs [gobble-and-fizz|pie-please]` rebuilds the October 24 approved cauldron-only and oversized pie scenes from lossless top / side / floor pieces around the unchanged flyer panels. Earlier cutout-border designs were rejected. See each theme's README.
- `compose-seasonal-cards.cjs` builds the matching cauldron and pie 1125×675 business-card front plates; the existing original-owl card is retained unchanged. See `seasonal-cards/README.md` for print specifications and source provenance.

Per-theme parameters used on 2026-10-08 are recorded in `docs/sparkle-suite/card-qr/flyer-art-tracker.md`.
