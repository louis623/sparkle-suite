# SSR responsive hero frames — October 30, 2026

Louis authorized one new fix commit on `codex/ssr-per-rep-allowlist`, followed by exactly two Smoke Preview deployments and a complete 14-theme A/B matrix. Starting head: `057665f5ed7a56fccbb70442e4691ee51cee2960`; draft PR #169 into `codex/nic-nac-trade-hardening`. No merge or Live operations. Rollback: `dpl_8DfMaFhJ24ZS8tWjXfAnsmP2LC88`.

## Implementation

- Offline, source-derived AVIF and WebP widths 640/1080/1600/original for Sunset's approved frame and the flying witch. Originals and all frozen legacy assets remain byte-identical. Original widths are 1672/1659; no upscaling to a fabricated 2400px image.
- Sunset: original 2,753,789 bytes; 640px AVIF 75,714 / WebP 83,864; 1600px AVIF 331,784 / WebP 414,220. Its picture uses native responsive selection, explicit dimensions, high priority and a matching type-aware preload. SSR Join backgrounds use the same derivatives while retaining authored gradients, crop and breakpoints. Home has one image plane, avoiding a duplicate CSS request, and preserves the legacy top-aligned phone still.
- Witch: original 424,580 bytes; 640px AVIF 64,469 / WebP 73,068. Existing flight/hover animations and transparent art are retained.
- All shared video sources, looping/muted/inline behavior and controls remain. The responsive still decodes and paints before the original video source activates and autoplays automatically, without a click. Reduced motion and an early visitor Pause retain control. The bespoke MHF aurora path is unchanged.
- The benchmark readiness helper inspects legacy descendants and pseudo-element backgrounds, waits for opacity-zero video first frames, and checks the browser-selected image-set codec without loading the unused fallback. A completed legacy one-shot is settled; looping is checked separately. It never treats opacity zero as proof a video is ready.

## Local evidence and validation

The read-only local audit covered all 14 themes × Home/Trade/Join × desktop/phone. Fourteen unique local raster assets were observed; only Sunset and the witch exceeded 250KB. Three themes use CSS/aurora rather than an above-fold raster still. Each original hash, dimensions and variant byte count is in `lib/amethyst/generated/hero-images.json`. Decoded-image comparisons and screenshots retain composition; AVIF color PSNR is at least 40.1dB and the witch's alpha RMSE is below 0.7/255. WebP fallback PSNR is at least 35.3dB, with lossless alpha.

All 48 local video preference/device checks completed without runtime/readiness errors: automatic playback advances and reduced-motion pages retain their still. Final Sunset desktop/phone screenshots match the local frozen visual reference and heading bounds; its final native phone request is one 75.7KB AVIF. Local fixtures are visual/behavior references, never deployed speed baselines.

TypeScript and final production build passed. Final focused checks: 396 passed, including 69 complete-response parity snapshots, eight paint-stability checks and seven new image/readiness cases. Complete full suite with two workers: **6,051 passed / 76 failed / 5 skipped**, versus 6,043 / 77 / 5 (6,132 cases across 731 files). All 42 flyer cases passed in the full run; no timing exception or new isolation was needed. Zero new failed names, suite-load errors or unhandled errors. Assertions, timeouts and VM guards remain unchanged. Initial native-poster assertions were updated to require the approved standalone still, staged original video URL and no eager video/poster fetch. This implements the requested loading contract without removing art, motion or controls. The first full attempt was interrupted before completion to correct the discovered duplicate image/crop issue; only the subsequent complete final run is used for the gate. The final benchmark-only readiness check was also rerun with strict assertions that it never fetches another image; both cases passed, followed by the final 396-check focused pass. Application code was unchanged after its final build.

## Continuation / final evidence

The implementation is not a speed or deployed visual acceptance claim. Final local gate results, NEW_HEAD, two deployment IDs, alias receipts, per-run metrics, animation proofs, full comparison table, any misses, flyer isolations, restoration/readback and final closeout belong in:

`vault/2026-10-30-ssr-per-rep/smoke/responsive-heroes/report.md`

This locally ignored evidence folder preserves the previous `parity-speed` report unchanged. Complete the matrix despite speed/CLS/visual/animation misses; stop only for safety problems specified by Louis. Keep B unaliased and use the existing automation bypass. Manual DB changes are limited to the fixed MHF row's appearance preset, restored to `halloween_pumpkin_witch` and independently read back. No Live network requests are needed; browser routes block Live platform hosts and wrong database origins. No project environment/settings changes or legacy/flyer/VM-limit changes.
