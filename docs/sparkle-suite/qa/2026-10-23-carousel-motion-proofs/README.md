# Rendered Smoke motion proofs — October 23, 2026

Short, silent recordings of the actual 390×844 browser page at `https://sparkle-suite-smoke.vercel.app`. Application `6a9c34c5e527ed656457a8d7a2b712927a0e0820`, deployment `dpl_BxqEvdS87d4Qs6CfpNwLJJwAybsn`. These clips preserve page framing and real theme playback; only the captured interval and encoding are changed. No synthetic movement, overlays, or painted controls.

The seven-second Unicorn/Witch and four-second other clips complement the full 15-second dwell checks in [written self-QA](../2026-10-23-carousel-self-qa.md); they do not replace those timing checks. Pumpkin Pie deliberately retains Louis-approved subtle sunlight. The full source recordings, exact hashes, native dimensions, and provenance are in the [capture manifest](../2026-10-23-carousel-capture-manifest.json).

| Page / slide | Rendered clip |
| --- | --- |
| Home: Lindsey's classic Mile High Fizz | [Watch](home-mile-high-fizz.mp4) |
| Chasing Unicorns | [Watch](community-themes-0.mp4) |
| Pumpkin and Witch | [Watch](community-themes-1.mp4) |
| Pumpkin and Cat | [Watch](community-themes-2.mp4) |
| The Golden Leaves of Autumn | [Watch](community-themes-3.mp4) |
| Fall Owl Harvest Moon | [Watch](community-themes-4.mp4) |
| Gobble & Fizz | [Watch](community-themes-5.mp4) |
| Pumpkin Pie | [Watch](community-themes-6.mp4) |
| Midnight Rose | [Watch](community-themes-7.mp4) |
| Pearl Rose | [Watch](community-themes-8.mp4) |
| Rose Champagne | [Watch](community-themes-9.mp4) |
| Portfolio: Mile High Fizz | [Watch](rep-highlights-0.mp4) |
| Britt with Bling | [Watch](rep-highlights-1.mp4) |
| Go for the Bling | [Watch](rep-highlights-2.mp4) |
| Sparkly Butterflies | [Watch](rep-highlights-3.mp4) |

Capture uses isolated Playwright `recordVideo`, blocks non-GET requests and navigation away from Smoke, waits for actual decoded playback, verifies the active slide remains selected, then preserves the final four or seven seconds of the browser recording. Mobile navigation uses visible arrows rather than attempting to click hidden desktop dots. Local raw recordings and receipts remain in `.local/final-revision-check/motion-clips`.
