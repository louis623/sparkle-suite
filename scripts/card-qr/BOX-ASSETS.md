# Card & QR build scripts: what lives in the repo vs the box

These are one-off build steps. Nothing here runs in the app or in CI; the app only reads the generated files already committed under `lib/workspace/card-qr/` and `public/amethyst/skins/`.

| Script | Repo source | Still needs box-only inputs |
|---|---|---|
| `qricon-v3/*.mts` (QR center marks, generates `lib/workspace/card-qr/qr-icon-art-v3.ts`) | Fully in repo (marks + `src/` SVG/JSON sources). Review PNGs go to `$QRICON_OUT` (default `/tmp/qricon-v3-review`). | None |
| `bizcard-mock/*.py` (approved business card mock, Oct 9) | Code copied in. | Morganite plate art (`/workspace/qr-flyer-plan/plates/`), Poppins from the box font dir, output dir `/workspace/bizcard-mock/`. Not reproducible off the box; outputs are committed. |
| `export-bizcard-plates.py`, `export-bizcard-fonts.py` | In repo; import `bizcard-mock/` from here; write into the repo. | Same as bizcard-mock. |
| `plate-sources/compose.py`, `compose_pc.py` | In repo; write into the repo. | The generated source images in `plate-sources/` plus box-only originals referenced inside. |

Box originals (kept for history): `/workspace/qricon-v3`, `/workspace/bizcard-mock`, `/workspace/qr-flyer-plan`.
