# Card & QR build scripts: repo vs box

One-off build steps. Nothing here runs in the app or CI; the app only reads the generated files committed under `lib/workspace/card-qr/` and `public/amethyst/skins/`. All scripts now use repo-relative paths.

| Script | Inputs (in repo) | Output |
|---|---|---|
| `qricon-v3/*.mts` | `qricon-v3/src/` | review PNGs to `$QRICON_OUT` (default `/tmp/qricon-v3-review`); art copied into `lib/workspace/card-qr/qr-icon-art-v3.ts` |
| `bizcard-mock/card.py`, `custom.py`, `custom2.py` | `assets/fonts/google/`, `assets/bizcard-src/`, `plate-sources/morganite/`, repo fonts in `lib/workspace/card-qr/fonts/`, skins in `public/amethyst/skins/` | `$BIZCARD_OUT` (default `/tmp/bizcard-mock/`) |
| `bizcard-mock/pdf.py` | same | print sample PDF; CMYK profile from `$CMYK_ICC` (default: ghostscript's `default_cmyk.icc`, install `ghostscript`) |
| `export-bizcard-plates.py` | `bizcard-mock/` | `lib/workspace/card-qr/card-plates/` |
| `export-bizcard-fonts.py` | `bizcard-mock/` | `lib/workspace/card-qr/fonts/card/`; font map to `$FONTMAP_OUT` (default `/tmp/bizcard-fontmap.json`) |
| `plate-sources/compose.py <dir> <skin>` | `plate-sources/<skin>/top.jpg, garland.jpg, floor.jpg` | `public/amethyst/skins/<skin>/flyer/plate.webp` |
| `plate-sources/compose_pc.py` | `plate-sources/pumpkin-cat/pc-*.jpg` | Pumpkin & Cat flyer plate |

## Still not in the repo (on purpose)

- **Fontshare fonts** (Boska, Switzer, Melodrama) used by the Garnet and Melodrama card looks: ITF Free Font License does not allow redistribution. Download from fontshare.com and point `FONTSHARE_DIR` at them (box copy: `/workspace/bizcard-mock/src/fonts/fs/`). Only needed to re-render those looks; their outputs are committed.
- **Large intermediates** skipped to keep the repo small: `/workspace/bizcard-mock/*.png|pdf` review renders (~70 MB), `/workspace/bizcard-mock/src/mhf-f2.5/f4.5/frame3.png` (unused frames), `/workspace/qricon-v3/*.png` review sheets (~95 MB), and the rest of `/workspace/qr-flyer-plan/` (generation candidates and review sheets). None are inputs to the scripts above.
