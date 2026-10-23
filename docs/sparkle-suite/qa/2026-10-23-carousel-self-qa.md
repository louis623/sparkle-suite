# Carousel self-QA — October 23, 2026

Status: source recordings, focused tests, guarded local build, composed home desktop/mobile, and all ten community slides in the mobile page passed. Deployed Smoke verification remains pending. This is not yet an invitation for Louis's final Smoke review.

## Scope and provenance

- GitHub: `louis623/sparkle-suite`, PR #150, branch `cursor/theme-carousel-site-peeks-db80`.
- Started from verified PR tip `058494a5dade2d69b40ab348c7d0c55e3596be0c`, descendant of served Live `5fd172f89c86705297f1bf7014c959d0309e8417`.
- Clean disposable clone: `C:/Users/louis/sparkle-suite-repo/.local/carousel-pr150-20261023`. The stale parent checkout was not synchronized or used as implementation truth.
- Candidate SHA / deployment: pending final commit and Preview build.
- Sole authorized review alias: `https://sparkle-suite-smoke.vercel.app`, paths `/` and `/portfolio`.
- Preserved Smoke: `dpl_4b5JFTMjQoz3Bd2YFaekYhNS6poL` (`sparkle-suite-smoke-s381polbv-louis-2849s-projects.vercel.app`).
- Preserved Live: `dpl_G4rJLcrAS5J9EQoZxu7mxmFV1WnE` (`sparkle-suite-3ze26im2h-louis-2849s-projects.vercel.app`). No Live release or merge is authorized.
- Source/output hashes, exact natural dimensions and duration, and capture-only changes: [capture manifest](2026-10-23-carousel-capture-manifest.json).

## Decisions and corrections

- Louis visually confirmed Lindsey's concrete classic bespoke mountain/aurora/lake clip. Her home and portfolio peeks share the same versioned media.
- Louis explicitly chose to preserve Pumpkin Pie's original subtle sunlight animation after seeing the clip and learning that it is faint at phone size. This is an acknowledged native-source exception to the otherwise clear-motion bar; no fake movement was added.
- Real customer renderers and original theme scripts/videos were captured locally with safe empty activity. No customer saved theme, provider, account, or production data was changed. Native controls were hidden before capture, not painted over.
- Corrected local handling of Next image URLs after visual QA caught a missing witch. The final Witch capture shows flight and hover. Capture checks now reject asset/runtime errors and validate complete header/hero bounds.
- Preserved complete recordings with contain framing. Replaced absolute standalone controls with a real row to fix home/Watch clipping on phones.
- Fixed fallback Pause and retry state handling found in independent review/browser checks.
- Pinned Turbopack's root to the actual configuration directory after its default inference selected the unrelated parent checkout's lockfile.

## Independent source-media results

Every new recording was inspected at desktop and approximately 320px media display width, including early/middle/late frames. Header, branding, Shop, hero copy/actions remained complete. No missing art, diagnostic toast, visible sample notice, painted Pause region, or duplicate native control was observed. These rows establish source-media fidelity; deployed composition is a separate check below.

| Slide | Authentic signature | Observed onset / complete beat | Source result |
| --- | --- | --- | --- |
| Chasing Unicorns | Unicorn enters, lands, holds with ribbons/glow | Visible by 1s; full stance by 4–6s | Pass |
| Pumpkin and Witch | Flight, then hover | Visible at 1s; hover by 6s (native flight 5.8s) | Pass |
| Pumpkin and Cat | Blink and tail sweep | Blink 1–2s; tail sweep 3–4s | Pass |
| Golden Leaves of Autumn | Falling and rotating golden leaves | Visible by 1s; full native loop 7.5s | Pass |
| Fall Owl Harvest Moon | Blink, head turn and return | Blink by ~1s; turn 2–3s; return 6–7s | Pass |
| Gobble & Fizz | Turkey blink/head tilt and rising bubbles | Visible within 1–3s; full native loop 9s | Pass |
| Pumpkin Pie | Original gentle sunlight and bokeh | Strongest subtle change around 0–3s; native loop 9.208s | Faithful source; Louis accepted subtlety |
| Midnight Rose | Glitter pulses and reflection streaks | Visible by 1–2s; native loop 10s | Pass |
| Pearl Rose | Light bloom and glitter pulse | Visible by 3s; native loop 9.833s | Pass |
| Rose Champagne | Lower sparkle/reflection streaks | Visible by 1–2s; native loop 9.5s | Pass |
| Mile High Fizz | Classic aurora and lake reflection | Visible immediately; native loop 5.042s | Pass; identity approved by Louis |
| Britt with Bling | Native Black Diamond sparkle | Hero-only sampled frames change each second; retained actual 8s recording | Pass; everyday skin, seasonal ticker retained |
| Go for the Bling | Gnome entrance, lantern/fireflies | Gnome visible by ~0.5s, entrance completes ~0.65s; ambient motion continues | Pass |
| Sparkly Butterflies | Native wing flex and glow | First recognizable wing beat ~1–3s; later pulses | Pass; intentionally gentler than entrance themes |

All new output recordings cover at least 15 seconds and are silent 24fps MP4s. File sizes range approximately 1.6–6.6 MB; only centered/visible media loads for carousels. Complete natural heights range 826–966px at 1200px width. Versioned posters use actual representative frames with entrance subjects visible. Sampled repeat boundaries show native pose/light resets without a major compositional change; no frame-perfect seamless claim is made.

## Verification

- 66 focused tests passed across capture fixtures, QA target guards, landing/demo, portfolio, clock/index behavior, and retained preview API coverage.
- Targeted ESLint and syntax checks passed. TypeScript passed. Guarded Next.js production build passed, including the customer-site layout lock.
- Isolated browser component checks passed real decoding, full 15-second dwell, pause/navigation persistence, offscreen pause, dynamic reduced motion, failed-media fallback with Pause beyond 15 seconds, retry, startup timeout, rapid navigation, wrapping, and 390px control geometry.
- Actual composed local page verification passed: all three home rep peeks plus Watch at 1440×1000 and 390×844, and every community slide at 390×844. Controls, full framing, physical centering, captions, real decoding/pixel changes, full dwell, auto-advance, and wrapping passed. Most auto-advance measurements were ~15.03s; the last wrap completed at ~15.55s including its scroll transition. No page or asset errors were reported.
- Exact-alias deployed desktop/390px verification and media transfer/player measurements: pending.
- Physical iPhone/iOS Safari: not tested. Chromium with a 390px viewport does not replace physical Safari coverage.

Local raw evidence is retained under `.local/carousel-capture`, `.local/media-review`, `.local/media-review-source`, `.local/local-composed-qa`, and `.local/final-carousel-qa`. These are diagnostic artifacts, not a substitute for this committed summary or the exact deployed alias.

## Maintenance records

Louis requested enough records to create a reusable skill for future themes/reps. The [maintenance runbook](../operations/carousel-media-maintenance.md) records the source contract, mappings, commands, incremental-addition sequence, required gates, and failures found during this work. Capture/publication/QA scripts and focused tests are retained with this branch. Skill packaging remains a later step based on the verified final result.
