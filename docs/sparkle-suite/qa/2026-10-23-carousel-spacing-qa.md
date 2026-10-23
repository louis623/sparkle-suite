# Carousel spacing follow-up — October 23, 2026

Louis approved the improved motion and requested consistent carousel padding and margins. This follow-up keeps all approved media bytes and playback logic, and normalizes the surrounding presentation. Smoke only; no merge or Live authorization.

## Change

- One 1200/966 canvas preserves every complete site at full available width, aligned to the top. Shorter sites retain a matching matte below instead of changing side/top borders or cropping their header/hero.
- Every shell uses the same 40px browser bar and gutters: 16px above 700px, 8px at narrower widths.
- Previous, Pause, and Next occupy a fixed row below the frame on desktop as well as phones.
- Caption title, link, and description share grid rows across slides. Wrapped titles no longer move the link or description. Caption width matches the carousel instead of applying the page gutter twice.
- Pagination spacing survives global paragraph resets; the shared player aligns its eager poster background and decoded image/video together. Home retains its default framing.

## Verification and provenance

- Existing portfolio, landing, playback-clock, and index tests: 29 passed. Targeted ESLint passed. Guarded production build and TypeScript passed.
- Initial development-server cold compilation exceeded a browser navigation timeout; those attempted runs are not acceptance evidence. Final local verification uses the completed production build.
- Built local candidate passed all 56 geometry cases: 14 slides at 1440×1000, 768×1024, 390×844, and 320×800. Frames, browser bars, media wells, caption tracks, pagination, and CTA positions are stable within each carousel. Decoded source content is full-width and top-aligned without cropping or distortion; there is no control overlap or horizontal overflow.
- Content begins 57px below the shell top at desktop/tablet, 49px at both phone widths. Content widths are 1146/686/324/254px respectively (at most 0.018px subpixel rounding across slides). Old desktop Smoke had content widths of approximately 1036.5px (Unicorn), 1178px (Witch), 1169.7px (Lindsey), and 1106.4px (Brittany), explaining the uneven side gaps.
- Normal playback advanced after 15.137/15.072/15.045/15.033 seconds at those four widths. Separate fresh-context checks passed Pause through Next, explicit resume, offscreen pause, and resumed playback on re-entry at all four widths. Geometry uses decoded posters under reduced motion; playback is separately exercised with normal motion.
- Home regression passed all three rep previews plus Watch at desktop and 390px, including decoded motion, Pause/Play, and control geometry. Representative carousel screenshots were visually reviewed for complete header/Shop/hero framing and spacing.
- Final Smoke application SHA, deployment, and exact-alias recheck: pending.
- Browser plugin unavailable; isolated Playwright Chromium used, without a signed-in profile or customer/provider writes. Physical iPhone/Safari remains untested.

The earlier [motion self-QA](2026-10-23-carousel-self-qa.md), source manifest, and motion clips remain historical evidence for the unchanged recordings. The [maintenance runbook](../operations/carousel-media-maintenance.md) now records the shared-canvas, gutter, control-row, caption-track, and responsive geometry checks required when adding a theme or rep.
