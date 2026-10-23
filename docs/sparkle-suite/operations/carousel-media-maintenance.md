# Carousel media maintenance — source material for a future skill

Recorded at Louis's request on October 23, 2026. This runbook records the actual implementation and lessons from PR #150; it is not a new release authorization. Current work is Smoke only. Final candidate and deployed QA results belong in `docs/sparkle-suite/qa/2026-10-23-carousel-self-qa.md`.

## Product contract

Show the actual customer homepage renderer: complete header, branding, Shop, hero copy, actions, and that theme's own motion. Use a stationary recording, not a hero-art poster, invented animation, CSS camera pan, iframe approximation, painted-out controls, or added marketing copy. A theme may have subtle motion; do not strengthen or replace it without an explicit decision about the actual theme.

Keep rep identity separate from the theme currently saved in their account. Lindsey's approved example is her classic bespoke mountain/aurora/lake homepage, regardless of holidays or current community selections. Home and portfolio use identical approved media bytes. Kim uses Gnome Forest; Kelly uses Neon Butterfly; Brittany's existing Black Diamond recording remains authentic and animated. A seasonal announcement alone is not a seasonal skin.

## Files and responsibilities

- `scripts/prepare-carousel-capture-fixtures.ts`: one allowlisted local fixture per invocation; actual customer renderer and runtime, safe data/actions, exact source hashes. Add new community or rep identities here deliberately. Rep payloads must come from verified original profiles or documented existing recordings, never guessed brand copy.
- `scripts/record-carousel-peek.cjs`: loopback-only server and isolated Chromium capture at real elapsed time. Serves original local files for the renderer's Next image URLs; blocks writes and external customer requests. Requires fonts/video/image readiness and complete header/hero geometry; checks runtime and HTTP asset errors.
- `scripts/publish-carousel-captures.cjs`: checks the complete expected set, source receipt hashes, video dimensions, silent audio, and at least 15 seconds of footage before copying versioned assets to `public/marketing/`. Creates representative posters from real video frames and the compact capture manifest.
- `lib/sparkle-suite/community-theme-motion.ts`: all community recording paths, natural dimensions, and named motion signatures.
- `lib/sparkle-suite/portfolio-motion.ts`: rep recordings shared by home and portfolio. Never let the home and portfolio copies drift.
- `lib/sparkle-suite/portfolio-content.ts`: slide order, labels, descriptions, and customer/preview links.
- `app/_components/community-theme-site-peek.tsx`, `product-peek-video.tsx`, and `portfolio-carousels.tsx`: media presentation and playback. New entries should normally need data/assets, not a new playback implementation.
- `scripts/qa-carousel-peeks.cjs`: real composed-page browser checks. It accepts only loopback or the exact approved Smoke alias and uses a disposable browser. It does not certify visual theme identity automatically.
- `docs/sparkle-suite/qa/2026-10-23-carousel-capture-manifest.json`: output hashes/dimensions/durations, original source revision and asset hashes, fixture provenance, and capture-only changes.

## Procedure for adding a theme or rep

1. Verify current GitHub revision, branch permission, review environment, and source assets. Use the authorized clean workspace. Do not infer saved account state from a marketing recording or modify customer settings to get the desired look.
2. Identify the intended theme, exact bespoke profile where applicable, original art/video/runtime, typography, and a named visible animation beat. Determine onset/completion times from the actual source.
3. Add a safe fixture using the actual renderer. Preserve layout and customer copy. Hide native animation controls and diagnostic notices before recording. Keep live customer data, account writes, forms, and providers disconnected. Record a reproducible payload and original source hashes.
4. Generate one fixture, then record it. Inspect the complete result at desktop and about 320px recording width inside a 390px page. For a disputed/custom identity, obtain a visual lock on a concrete clip before batch capture.
5. Confirm the subject is present, the original motion is visible, and fonts/art have loaded. Inspect early, middle, and end frames and the repeat boundary. A changing video timestamp or scrolling ticker is not proof of theme motion.
6. Choose a real representative poster after entrance subjects are visible. Keep the actual entrance in the video. Publish new versioned filenames so browser/CDN caches cannot serve the wrong earlier look.
7. Add the media mapping, natural dimensions, slide content, and any intended home placement. Use contain framing; preserve full header/hero instead of cropping every recording to an assumed ratio.
8. Run focused tests, lint, type check, and the guarded build. Verify actual composed desktop and 390px pages, including every slide's full dwell and standalone home/Watch controls.
9. Deploy only to the explicitly authorized environment, verify exact commit/deployment/alias, then run the same composed-page checks on that alias. Write the per-slide visual results before asking Louis to review. A successful push or build is not Smoke acceptance.

## Command recipe

Run from the verified repository root. Supply the installed Playwright module and isolated Chromium executable through `PLAYWRIGHT_MODULE_PATH` and `CAPTURE_CHROMIUM_PATH`; do not use Louis's signed-in Chrome profile. The tools are intentionally independent of a particular machine's cached runtime path.

```powershell
node node_modules/tsx/dist/cli.mjs scripts/prepare-carousel-capture-fixtures.ts --theme amethyst --origin http://127.0.0.1:4177
node scripts/record-carousel-peek.cjs amethyst
node scripts/publish-carousel-captures.cjs
node scripts/qa-carousel-peeks.cjs --base-url https://sparkle-suite-smoke.vercel.app --mode all --viewport all
```

The publication utility expects the full current set; for a later incremental addition, explicitly update its allowlist/validation and preserve already-approved entries. Do not overwrite a source recording that is itself being used as provenance. Local fixtures, raw JPEG frames, and browser evidence stay in ignored `.local/`; retain compact manifests, written QA, and scripts in Git.

## Playback contract and checks

- Default dwell is 15,000 ms of centered, visible, actual playback. Loading, buffering, hidden tabs, and offscreen time do not consume it.
- Pause stops animation and advancement. It remains in force across manual navigation; Play resumes. Navigation starts a fresh playback session and rejects stale callbacks.
- Startup or sustained stall has an 8,000 ms bound. Failed media retains its accurate poster for a full pausable 15-second fallback dwell; Play retries from a fresh session.
- Reduced motion/data saver starts still. Explicit Play works without enabling automatic advancement under reduced motion.
- Only the centered visible slide plays in each carousel. Home may legitimately have several visible recordings; measure its transfers separately.
- Carousel controls are shared by the section. Standalone home/Watch controls occupy an actual row below the frame, including on phones.
- Verify arrows, dots, swipe, wrap, captions, re-entry, tab visibility, dynamic reduced motion, slow loading, failed media, and retry. Check real pixels and decoded frames, not just the player state label.

## Lessons that must survive into the skill

1. **Correct identifier is insufficient.** Alpine Opal alone did not identify Lindsey's bespoke homepage. `applyMileHighFizzHomepage`, the hybrid renderer, and the original `/mile-high-fizz/hero.mp4` establish her classic design. Louis confirmed the concrete clip.
2. **Static server image URLs matter.** The real Witch renderer uses `/_next/image`. A naive public-file server silently dropped the witch while sparkles still animated. Resolve to original local image bytes and reject asset failures.
3. **Entrances can finish while fonts load.** Unicorn is a one-shot native video. Use its real replay control if needed; restart native videos/CSS timelines at original speed and preserve their delays. Never synthesize replacement movement.
4. **Viewport extension can change vh-based heroes.** Freeze the already-computed source height before extending the viewport through the hero bottom; verify the full header and hero bounds again. Do not rebuild or reposition site content.
5. **Capture time is not encoded duration.** A delayed first compositor frame can make a 15.125-second capture slightly shorter than 15 seconds. Record with startup slack and validate the encoded duration with ffprobe.
6. **Do not paint controls out.** Kim/Kelly's older videos had blurred/painted Pause regions. Recapture with the native controls hidden in the local fixture; keep one real interactive player control.
7. **A fixed well must not imply cover cropping.** Differing complete-site heights need contain framing. Verify the smallest phone composition, not only the source MP4.
8. **Standalone and carousel control layouts differ.** A below-frame absolute button was clipped on home and overlapped Watch copy. Reserve an in-flow control row for standalone peeks.
9. **Source subtlety is a decision, not a capture defect.** Pumpkin Pie's owner-approved v4 source has gentle sunlight/bokeh. Independent review found it subtle at phone size; Louis explicitly chose to keep the original sunlight on October 23. Preserve that exception; do not claim a steam/character beat or invent stronger movement.
10. **Tests can enforce the wrong design.** Earlier assertions required still-only drift. Keep wiring/asset/framing regressions, but make browser playback and visual evidence part of acceptance.
11. **Review surrounding captions against the actual scene.** The old Cat caption said silver moon even though the cat sits on a jack-o’-lantern. Media correctness does not guarantee that existing slide copy remains correct.

## Future skill packaging

Use this runbook, the capture manifest, the final self-QA table, the [rendered motion proofs](../qa/2026-10-23-carousel-motion-proofs/README.md), the scripts, and focused tests as the skill's evidence. Keep the skill concise: source/identity intake, safe capture, incremental media publication, playback checks, visual gate, and environment-specific release. Link detailed references instead of copying a long session diary. The skill should make adding an entry routine while refusing ambiguous rep identity, fake motion, missing assets, and unapproved Live deployment.
