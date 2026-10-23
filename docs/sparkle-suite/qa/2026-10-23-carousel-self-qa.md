# Carousel self-QA — October 23, 2026

Status: full deployed Smoke playback checks passed at desktop and 390px. The final caption-only revision is READY on the authorized Smoke alias and passed its focused recheck. No Live release or merge.

## Scope and provenance

- GitHub: `louis623/sparkle-suite`, PR #150, branch `cursor/theme-carousel-site-peeks-db80`.
- Started from verified PR tip `058494a5dade2d69b40ab348c7d0c55e3596be0c`, descendant of served Live `5fd172f89c86705297f1bf7014c959d0309e8417`.
- Clean disposable clone: `C:/Users/louis/sparkle-suite-repo/.local/carousel-pr150-20261023`. The stale parent checkout was not synchronized or used as implementation truth.
- Full playback QA candidate: `21ee983d06a6647f924e2339e43439ea53631a25` / `dpl_61deUWszdxAkpvWGHrkjDDvijg5s`.
- Final application SHA: `6a9c34c5e527ed656457a8d7a2b712927a0e0820`. Its only product difference from the full-QA candidate corrects the Cat caption from silver moon to jack-o’-lantern. Recordings and playback code are identical. Final Preview build: `dpl_BxqEvdS87d4Qs6CfpNwLJJwAybsn`, READY with matching Git SHA; Smoke alias mapping read back and verified.
- Sole authorized review alias: `https://sparkle-suite-smoke.vercel.app`, paths `/` and `/portfolio`.
- Preserved Smoke: `dpl_4b5JFTMjQoz3Bd2YFaekYhNS6poL` (`sparkle-suite-smoke-s381polbv-louis-2849s-projects.vercel.app`).
- Preserved Live: `dpl_G4rJLcrAS5J9EQoZxu7mxmFV1WnE` (`sparkle-suite-3ze26im2h-louis-2849s-projects.vercel.app`). No Live release or merge is authorized.
- Final read-back confirmed both `www.yoursparklesuite.com` and `yoursparklesuite.com` still map to that unchanged Live deployment.
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
- Exact-alias deployed checks passed for all 14 portfolio slides at 1440×1000 and 390×844, all three home rep peeks plus Watch at both widths, and both-width Pause/navigation/reduced-motion/error/retry checks. No page errors, asset errors, unexpected navigation, or non-GET requests were reported. Actual screenshots were separately inspected for site identity, full framing, controls, and native motion; automated timestamps alone were not treated as visual approval.
- Mobile community dwell measurements: 15.025–15.064s for ordinary advances; last wrap completed at 15.536s including its scroll transition. Mobile rep measurements: Lindsey 15.054s, Brittany 15.032s, Kim 15.039s, Kelly/wrap 15.173s.
- Fresh isolated browser transfer checks: initial home 0.64–1.02 MB and portfolio 0.88–0.90 MB, with zero MP4 bytes and zero mounted video players before their sections enter view. Visible community loaded one 3.97 MB recording and played one; moving to reps loaded another recording while still playing only one. Three simultaneously visible home cards intentionally play three recordings (7.01 MB media total); scrolling to Watch pauses those and plays only Watch. Measurements are completed encoded transfers, with zero in-flight requests at each snapshot, not a mobile-network performance benchmark.
- Desktop portfolio measured 15.080–15.667s per slide including wrap/settle overhead; all 14 full dwells passed.
- The final caption-only revision passed the seven existing portfolio tests and a fresh guarded production build. Its exact-alias focused recheck passed home MHF and the corrected Cat at both widths, including pixel/frame progress, complete framing, control geometry, and Cat's full dwell/auto-advance (desktop 15.121s; mobile 15.041s). No runtime, asset, navigation, or write errors occurred. Prior full-QA receipts remain attributed to their original SHA; the final recheck has separate receipts.
- Physical iPhone/iOS Safari: not tested. Chromium with a 390px viewport does not replace physical Safari coverage.

Local raw evidence is retained under `.local/carousel-capture`, `.local/media-review`, `.local/media-review-source`, `.local/local-composed-qa`, and `.local/final-carousel-qa`. These are diagnostic artifacts, not a substitute for this committed summary or the exact deployed alias.

Fifteen short [rendered Smoke motion proofs](2026-10-23-carousel-motion-proofs/README.md) are retained in Git: every portfolio slide plus home Lindsey on the final application SHA, at 390×844. The first two are seven seconds and the others four seconds, totaling 3,700,643 bytes. Each recording has clean runtime/request checks, decoded native motion, and a compact SHA-256/duration/source manifest. These are real browser recordings, not animated stills. Full timing receipts remain separate. Final focused/raw capture evidence is in `.local/final-revision-check`.

## Louis's Smoke review path

1. Open `https://sparkle-suite-smoke.vercel.app/` and scroll to “A site that feels like you.” Lindsey should show the approved mountain/aurora/lake homepage, alongside Kim and Kelly's everyday looks. Pause and resume any recording.
2. Open `https://sparkle-suite-smoke.vercel.app/portfolio`. Watch each centered theme for at least 15 seconds; use arrows or dots to revisit any slide. Unicorn and Witch entrances appear early. Pumpkin Pie deliberately retains its subtle sunlight.
3. Check the four rep highlights and repeat at approximately 390px width. Pause should stop both motion and automatic advancement; manual navigation while paused should stay paused.
4. Reload to reset the public presentation. No login, personal details, checkout, customer mutation, or data reseed is needed. This authorizes review on Smoke only; a later Live release requires Louis's explicit approval.

## Maintenance records

Louis requested enough records to create a reusable skill for future themes/reps. The [maintenance runbook](../operations/carousel-media-maintenance.md) records the source contract, mappings, commands, incremental-addition sequence, required gates, and failures found during this work. Capture/publication/QA scripts and focused tests are retained with this branch. Skill packaging remains a later step based on the verified final result.
