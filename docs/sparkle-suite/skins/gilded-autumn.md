# Gilded Autumn — Community candidate

Stable ID `gilded_autumn`, card `GA-01`. Morganite remains the default; existing selections and private assignments are unchanged. This skin changes seasonal artwork, color and decorative motion within the existing customer templates. It retains custom MHF/BWB/Bling Kitchen content and actions.

## Artwork and motion

Louis requested crisp natural leaves against a blurred sunlit autumn forest, fine gold/copper/champagne shimmer across leaf surfaces and the pile, and the same animated quality on phones. Generated artwork contains no product interface. Real text, links, forms and buttons remain HTML.

- Provider/model: Higgsfield `bytedance/seedance-2.5/image-to-video`; SDK 0.2.6, current npm version checked September 30, 2026.
- Current request: `03e698d0-db3b-496a-9142-f0ffb4a850a3`, completed. Two generations total. Original request `d689834d-3b41-404a-a47b-e42e46a45a6f` is preserved but superseded because its leaf-surface shimmer was too faint.
- Input: the same composition with a built-in image-generation edit adding visible gold/copper/champagne metallic grain and reflections across the falling leaves and pile; 8 seconds, 720p, no audio, locked camera. No end-frame constraint, to avoid reversing falling leaves.
- Authorization: $12 total maximum; work one generation at a time and avoid unnecessary retries.
- Authenticated descriptive estimate: $0.4622/second at 720p, approximately $3.6976 per generation before discounts, $7.3952 across both. Estimate depends on actual output dimensions/duration. Actual account charges have not been independently verified; $9 combined reservation in the local ledger. No third generation purchased.
- Original output: H.264, 1204×764, 24 fps, 8.041667 seconds, 8,785,255 bytes, no audio.
- Web output: H.264 CRF18/preset slow/yuv420p/faststart, 1204×764, 24 fps, 7.5 seconds, 4,203,657 bytes. A 0.6-second tail/head dissolve makes the continuous repeat; it is an edited loop, not a claim of a mathematically identical generated start/end. No boomerang or reverse playback.
- Matching WebP poster comes from the first frame of the web loop. Both use the same crop. Phone crop is 30% horizontal position to retain the distant sunlight; wider layouts use centered framing.
- Video SHA256: `5cbc8d15c8f909e2d7a2215f75b8db1af904ac9d486c2d51f4176428c3ed0c27`.
- Poster SHA256: `19a4477bfe5403fd5eaf56fa7ddd50d2bd231eed6fba067f55cc03796f2adbbd`.

Artwork input, full prompt, source video, estimate and resumable receipt are retained in the session's separate local creative workspace. No provider credentials or signed upload headers are in the repository. Customer pages load only self-hosted media and never call Higgsfield.

## Behavior

Animation starts only when visible, uses muted inline looping on desktop and phones, and has a 44px Pause/Play control. Reduced-motion and the saved `still` setting initially show the poster without downloading video. Manual play remains available. Hidden/offscreen media pauses, user pause persists, playback errors retain the poster, and skin changes dispose the media and listeners. MHF's previous background video is not mounted while this skin is selected.

Semantic colors and scoped legacy overrides cover homepage, Dance Floor, Join, preferences, FAQ, social cards/glyphs, calendar provider actions, fields and hover/focus states. Copper with ivory text is used where champagne would have insufficient contrast. The neutral saturation filter is removed for this skin so fixed calendar dialogs remain in the viewport. Small-screen inner wrappers use available width instead of overflowing into the scrollbar gutter; template spacing and content order remain intact.

## Verification completed locally

- Full `npm run build` successful; TypeScript successful.
- Final focused run: 165 tests across 9 skin/template suites passed. Earlier registration/settings/preview route checks passed (231 focused checks reported by integration builder; overlapping totals are not additive).
- Independent adversarial review; 19 motion lifecycle tests include rapid hide/show AbortError recovery and pending-play cleanup.
- Custom hero host-tree regression tests preserve the original structures/actions. Additive migration tested in isolated PostgreSQL-compatible PGlite, preserving existing selections and private ownership.
- Required local homepage/Dance Floor link verifier returned 200 for both routes.
- Real sample templates rendered in the browser; actual video playback and Pause/Play confirmed on desktop and phone viewport, calendar dialog and trade details opened successfully.
- Responsive homepage widths 360, 390, 768, 1024 and 1440: no horizontal body overflow, same video source, 44px motion control. Matching poster/video crop. These are desktop-browser viewport checks, not physical iPhone/Safari evidence.
- Solid-surface text contrast audited for generic Home/Join/Dance Floor/preferences; failures found in footer/Join links were corrected. Dynamic-image hero contrast and custom pages additionally inspected visually; this is not a formal full-site WCAG certification.
- Original full-clip contact sheet and loop-boundary frames inspected; stable forest/pile, falling leaves, restrained glints, no new UI or camera movement.

## Repeatable reviewer path and release status

Sample path: `/skin-preview/gilded_autumn/homepage`, with Home/Dance Floor/Join/Preferences tabs. The labeled opaque sandbox prevents submissions, uploads and provider calls; reload resets sample state. Open calendar choices; inspect both social actions; open a sample dancer; verify Pause/Play and phone sizing. This intentionally supported public sample preview never grants account access.

Local review server for this session: `http://127.0.0.1:8767/`. Application source is a clean disposable clone based on `f5fc47eebc76ca608e4aecd6126b5d4065bb75d0` from `louis623/sparkle-suite`, branch `codex/nic-nac-trade-hardening`.

**Smoke deployment and database migration are not applied.** Louis confirmed Grok Bot/Sam is actively updating Heather's custom skin on shared Smoke. Do not replace that deployment or claim a deployed save/reload check. Integrate Sam's finished source, recheck affected custom layouts, then apply the additive catalog migration only to Smoke (`pukemqiwlyqmyytxkdmo`) and deploy the exact combined commit. Verify Community selection/save/reload with a synthetic Smoke rep. Live remains separately gated on Louis's acceptance of the Smoke batch. No live data, aliases, extension or Chrome Web Store changes.

## Leaf-surface shimmer correction

Louis found the initial video attractive but said its shimmer read as background sparkle rather than metal on the leaves. He explicitly asked to retain that background sparkle and add surface shimmer. The revised input gives the leaves a visible fine metallic finish, and the second motion prompt carries specular reflections across the leaf faces while preserving the sparse background glints. Natural veins and red/orange color remain visible.

Only the two media assets changed in this revision; no layouts, colors, controls or runtime logic changed. The new source clip, full contact sheet, five loop-boundary frames and compressed loop were checked. Browser checks confirmed the 7.5-second clip plays in the actual desktop and phone templates, phone width remains 375/375 without overflow, and Pause/Play works. The lower phone hero was inspected to confirm the gilded pile is visible behind the existing actions. Existing application build/tests apply to the unchanged code; no claim that those were rerun for this media-only revision.

The first implementation was preserved in commit ac5a67d526c247a4dc7f0fb729d4dbf7bae588f1. Revised creative source, input, exact motion prompt, request receipt and inspection artifacts are in the separate fall-higgsfield/shimmer-v2 workspace. No third generation was submitted. Smoke/Live hold remains in force pending Sam's finished Heather changes.