# October 23, 2026 — Fall Owl QR flyer high-perch repair

Louis requested Fall Owl flyer art only and explicitly prohibited merging Live
or changing Kristen's saved theme. PR #151 is the target. The shared Windows
checkout remains on the allowed `codex/nic-nac-trade-hardening` at `6162d278`,
with extensive pre-existing dirty work; that work is not part of this repair.

Inspected PR head `bf673d824c2cd7c6c175419a8dd8e7fe3c3371f5`. Its image visibly
contained a rectangular upper-right scene crop and disconnected owl feet in
the lower scene. Its pixel tests did not detect those composition failures.

Louis selected **A — high perch** after seeing two local placement proofs beside
the approved hero. The repair uses only original hero pixels for the owl,
moon, branch, autumn leaves and lake. No new owl or image generation was used.
The complete purple owl with amber wing gems and amber pendant is reduced
uniformly above the title on a right-edge branch. The lake occurs once at the
bottom. The middle stays open for the unchanged centered QR and flyer copy.

Deliverable: `public/amethyst/skins/fall-owl/flyer/plate.webp`, 1080×1920.
Plate SHA-256: `1a820be139f933587f3efdce73bbda020fd6dbbb04cf3fa067cd1676d0289787`.
Approved hero SHA-256 unchanged:
`8ccb49ca53ccc0e5da7e6e50fdc02ef6d20735f70f09cc994f156d2180af9693`.
`flyer-themes.ts` keeps the hero as `source` and uses `flyer/plate.webp` as `plate`.

`scripts/card-qr/plate-sources/fall-owl/compose.cjs` checks the source hash,
extracts original-pixel cutouts, saves dedicated `top.png`, `side.png`,
`floor.png` and identity-proof `owl.png`, then composes the plate. It replaces
the rejected PR's `compose.py`. Repeated generation produces identical bytes.

Verification: seven focused Vitest tests pass against the PR's exact renderer
source in an isolated local harness. Tests prove source identity, dimensions,
face/pendant/wing retention, full owl clearance above title panels, centered QR,
and decoded PNG and JPEG flyers for three title lengths. The actual sample
flyer was visually inspected at full size. These are focused asset/renderer
checks, not a full app build or live browser smoke. The prior PR's coordinate
test is replaced because it asserts the rejected crop's geometry.

Final side-by-side proof: `artifacts/fall-owl-plate-review/final-side-by-side.png`.
Actual rendered sample: `artifacts/fall-owl-plate-review/actual-flyer.png`.
Sample destination is `https://example.com/fall-owl-review`; it does not use
customer data or send anything. A fresh render resets the sample.

Only PR #151 is to be updated. No merge, Vercel deploy/alias change, database,
saved theme, Chrome extension, Live workflow or customer setting was changed.
No other-theme plate repair is included. Keep this restriction on follow-up.
