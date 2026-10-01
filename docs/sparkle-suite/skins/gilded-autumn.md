# Gilded Autumn — Community candidate

Stable ID `gilded_autumn`, card `GA-01`. Morganite remains the default; existing selections and private assignments are unchanged. This skin changes seasonal artwork, color and decorative motion within the existing customer templates. It retains custom MHF/BWB/Bling Kitchen content and actions.

## Artwork and motion

Louis requested crisp natural leaves against a blurred sunlit autumn forest, fine gold/copper/champagne shimmer across leaf surfaces and the pile, and the same animated quality on phones. Generated artwork contains no product interface. Real text, links, forms and buttons remain HTML.

- Provider/model: Higgsfield `bytedance/seedance-2.5/image-to-video`; SDK 0.2.6, current npm version checked September 30, 2026.
- Request: `d689834d-3b41-404a-a47b-e42e46a45a6f`, completed. One generation only.
- Input: approved sharp-leaf artwork; 8 seconds, 720p, no audio, locked camera. No end-frame constraint, to avoid reversing falling leaves.
- Authorization: $12 total maximum; work one generation at a time and avoid unnecessary retries.
- Authenticated descriptive estimate: $0.4622/second at 720p, approximately $3.6976 before discounts. Estimate depends on actual output dimensions/duration. Actual account charge has not been independently verified; $4.50 reserved in the local ledger. No second generation purchased.
- Original output: H.264, 1204×764, 24 fps, 8.041667 seconds, 7,204,708 bytes, no audio.
- Web output: H.264 CRF18/preset slow/yuv420p/faststart, 1204×764, 24 fps, 7.5 seconds, 3,398,471 bytes. A 0.6-second tail/head dissolve makes the continuous repeat; it is an edited loop, not a claim of a mathematically identical generated start/end. No boomerang or reverse playback.
- Matching WebP poster comes from the first frame of the web loop. Both use the same crop. Phone crop is 30% horizontal position to retain the distant sunlight; wider layouts use centered framing.
- Video SHA256: `782951f5dffeb7b663958a1f241fa4237d17bc0725b6b68923cf0e67b9ef06ca`.
- Poster SHA256: `b09b6329eb8511b09926e23afe74b1202445c37504e8c08d325f46dee3ec8de6`.

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
