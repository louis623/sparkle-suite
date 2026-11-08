# Animated theme loading and release lessons

Captured from Starlight Christmas Hollow, November 7, 2026. Use when adding or changing illustrated/video customer-site themes. Follow the current task's authorization and budgets.

## Compose the whole theme

Carry the approved palette into real Home, Dance Floor, Join and preference forms. Confirm accent colors explicitly in the working page. Starlight's first version underused cranberry red despite the approved Christmas direction; the correction added cranberry actions and an announcement ribbon while preserving midnight-blue surfaces, ivory text and lantern-gold accents. Keep real rep content and shared layout slots in the composition proof.

Portrait flyers need art directed around the actual title, QR and instruction footprint. Starlight used a dedicated tall edit with all four gnomes below the overlay. Its business card used the landscape art, with normal and long names/titles checked against print safe areas. Use the existing renderers and verify QR decoding in actual PNG/JPEG exports.

## Make the poster the first visible scene

Setting preload=none does not defer a video once the controller assigns src and calls play. A visible hero can immediately compete with critical rendering. Preload the matching responsive poster at high priority on pages that actually display it. Avoid an unused poster preload on the Dance Floor.

Coordinate CSS backgrounds, SSR picture/img, JS-created posters and preload media conditions so a phone requests the intended small asset. Inspect cold-cache network requests. Give video a matching poster before playback and observe the actual LCP candidate; do not assume an asset or LCP fix succeeded because markup looks right.

Assign automatic video src after load plus idle scheduling. For Save-Data or a detected slow connection, keep the poster and expose manual Play. Viewport alone selects an appropriate encode; it should not disable motion. Preserve approved duration, frame count, crop and loop boundary. Pause offscreen/hidden media and clean up listeners, idle callbacks and timers on hero replacement. Intentional pause-related AbortError must not erase the visitor's playback preference.

Use an independent audio clock with preload=none and source assignment only after the customer's sound action. Starlight's full music-box track avoids a restart on every short video loop. Preserve sound controls and visibility/pause behavior.

## Cover the real render paths

Frozen legacy pages, SSR, hydrated components and custom rep layouts can discover media differently. In the frozen-renderer bridge, safely load the new theme's assets without editing frozen snapshots or altering other presets.

Bind existing SSR media. Keep added audio outside React's root. For custom SSR heroes needing injected nodes, wait for the existing hydration event. A custom layout may still fetch its original nested video source or eager hero photo even when CSS hides it. Suppress replaced media and its old controller in the scoped SSR path. Test fixtures with heroImageUrl, including framed kitchen, can reveal grids and photos that an empty-image fixture misses.

Rebuild generated assets with node scripts/build-amethyst-ssr.mjs. Edit source files rather than generated bundles. Resolve PR overlap in source before rebuilding.

## Verify within the authorized budget

Read the task's named test files, page-load limit, deployment limit and stopping condition before running checks. These limits take precedence over broader command examples in the skill. Count individual tests and top-level document loads. Reuse current evidence, record failed attempts and stop at the agreed limit. Ask before exceeding it.

Use the defined network/CPU settings and collect FCP, LCP and request timing before interaction. Report the observed LCP element and navigator.connection values. A desktop browser may report a low downlink and correctly choose manual Play. Successful manual playback does not establish fast-connection autoplay. Report physical-device, interaction and performance limits precisely.

Use read-only Smoke fixtures where available and authorized. This avoids persistent rep-selection changes. Verify the actual loaded theme, approved deployment SHA, media source, loop wrap, sound loading and visible layout. Read-only Live discount checks can establish enabled/code/offer configuration; they do not establish a successful signup or Copy interaction.

## Deploy and activate separately

For Git-based Vercel deployments, use the actual branch name in gitSource.ref and pin/verify the requested SHA. Putting a commit SHA in ref made Vercel report the SHA as a branch and caused the safety guard to fail. Verify project, target, returned Git metadata, READY state and alias provenance. Vercel REST documents that omitted target selects Preview; production requires its explicit target. Use the current API contract.

Record the current PR head immediately before an exact-head approval or merge. Receipt-only commits change its SHA. If Louis requires an exact preflight, stop on a mismatch and show the diff for his decision. Do not rewrite history to manufacture the old head.

A Community catalog insert activates selection for every rep under existing catalog access rules. It is not demo-only activation. After an approved all-rep release, first verify the code deployment is READY on the intended domains, then apply only the authorized theme migration. Read back the constraint, Community row/ownership policy and assignment count. Do not switch existing reps to demonstrate availability.

Preserve the known-good deployment before release. If a theme must later be removed, inspect current assignments, restore affected reps' prior selections under authorization and report before catalog removal. Apply the current release standard and Louis's explicit scope/timing instructions; a timing exception for one release is not a permanent policy change.

## Measured example, not universal thresholds

Starlight retained a 15.5-second, 372-frame desktop clip. Its 640x360 phone encode was 301,274 bytes versus 3,370,008 desktop bytes; phone poster 56,354 versus 290,956 bytes. Cold-cache Smoke phone at 390x844, DPR2, 1.6/0.75 Mbps, 562.5ms latency and 4x CPU measured FCP2.864s/LCP3.548s, compared with supplied baseline2.760s/40.600s. Desktop measured1.564s/1.580s. Both reported downlink1.5Mbps and exercised manual Play, loop wrap and tap-to-load/mute. The approved <4s task target was met in one phone run; it does not replace the current production quality standard or establish a performance distribution.

Evidence and retained source:
- docs/sparkle-suite/qa/2026-11-07-starlight-slow-load.report.md and adjacent JSON/screenshots.
- docs/sparkle-suite/qa/2026-11-07-starlight-live.report.md.
- scripts/card-qr/plate-sources/starlight-christmas-hollow/.
- vault/2026-11-07-starlight-build-and-lessons.md.

## Lessons from Macie's Christmas Globe (MG-01)

**Check the subject and its surroundings separately.** In the first head-tilt edit, an oval mask carried snow along with the dog's head. For a local correction, follow the subject's silhouette and reconstruct only the narrow strip revealed at the edge. Compare the extreme poses with the original take at full size. Check the blink, flame contours, lights and stationary product box individually, then watch both encodes through several restarts at normal speed. Use those same desktop and phone videos for rep approval. The [finishing script](../../../../scripts/card-qr/plate-sources/macies-christmas-globe/finish-motion.py) shows how this shot was repaired without another paid take.

**Use the palette below the fold.** For a color-only brief, assign the approved hero colors to existing surfaces. On MG-01, evergreen carried the reveal and About areas, cranberry carried signup and FAQ, and ivory cards kept text readable. Compare Home, Trade and Join at the same desktop and phone widths before and after. Inspect empty media slots, form labels, active filters and footer links for leftover default colors and contrast. Check section positions against baseline. Leave additional artwork out of a palette revision.

**Test the saved URL before touching a control.** The review preview initially forced motion on while the ordinary Smoke demo had Still saved and a disabled Play button. With motion enabled and a normal connection, verify video time advances before interaction. Then Pause, Play and watch time advance again. When the design permits explicit Play from Still, verify that gesture separately. Check reduced motion, slow connections and visitor-started sound under their own rules. For a slow paint, record the LCP element and server response time alongside poster transfer timing before changing the encode.

**Verify an options-only release without selecting the theme.** Resolve the owner by stable ID and public slug and record the saved preset. After the approved app and private catalog entry are Live, read the same list used by the picker for the owner, the active Fizz Fest demo and an unrelated rep. Confirm the saved preset and public appearance against the baseline. An anonymous request to the private theme preview should return 404. Report picker-query verification as such. Reserve save/reload tests for the authorized synthetic fixture.
