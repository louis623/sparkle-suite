# Starlight Christmas Hollow — preview verification

Built November 6–7, 2026 from verified GitHub tip `0e136f56aca8d202f7ef6b23eb0fb380e7268b3d` in the disposable allowlisted clone. No saved rep data, database, deployment, or production alias changed.

## Customer result

New shared Christmas appearance with a 15.5-second gnome-village hero, separate optional Christmas Music Box audio, matching navy/gold/ivory Home/Dance Floor/Join/Unsubscribe surfaces, QR flyer and business-card artwork. Existing rep copy, links, sections, shared header/ticker/lineup structure and theme selections are preserved. Small screens display the complete moving scene above the copy.

## Verified

- Optimized Next production build completed with exit 0, including TypeScript and static generation. Log retained in disposable clone `.codex-logs/starlight-next-build.log`.
- All eight feature tests passed across focused runs; 17 individual test executions total, below Louis's limit of 20. Final frozen-HTML SSR regression rerun passed. One sandbox cache-rename failure ran zero tests and was retried successfully with normal permissions. No full test suite run.
- Shared layout guard: all 11 approved source checks pass. Frozen assets and render-version routing untouched. The old frozen manifest's homepage hash already differs on baseline because of approved commit `acd1a823`; feature test pins the verified actual baseline instead of changing historical assets/manifests.
- Desktop Chrome, 390×844 phone viewport and 820×1180 tablet viewport. All four customer pages inspected for palette/readability; no horizontal overflow observed. Production-rendered standard, Mile High, Britt, unframed kitchen and framed kitchen homepage fixtures inspected. Existing kitchen photo is hidden only when this seasonal hero replaces it; other themes are untouched.
- Hero video advances, duration 15.5, loops. Separate audio advances, duration 77.844898. Sound defaults off; customer Enable/Mute works. Pause stops both; offscreen pauses and return resumes. No React hydration errors on inspected SSR fixtures after fixes. Reduced-motion and saved-motion-off code paths reviewed; physical-device verification remains pending.
- Four boundary frames inspected. Mean per-channel difference at loop boundary is 2.463/255 versus 2.052 for the preceding adjacent frame pair. This supports the circular edit's continuity but is not a substitute for Louis's perceptual review.
- Flyer QR decodes from actual renderer PNG and JPEG. Business-card QR decodes from PNG and JPEG; normal/long copy stays inside safe bounds. Actual front/back and two-page CMYK print PDF generated. Final portrait and card proofs visually inspected.
- Rocky's final read-only review: prior SSR, hydration, audio/playback and framed-kitchen issues resolved; no remaining implementation blocker in reviewed changes. Release gates remain below.

## Safe review

Current local preview: `http://127.0.0.1:4326/homepage.html`. It is explicitly labeled SAMPLE DESIGN. Home/Dance Floor/Join navigation works; forms, uploads and outgoing requests are blocked. Reset by reloading. Click Enable Christmas music, let the village repeat, then Pause animation. Scroll beyond the hero and return. Use the page navigation to inspect the matching surfaces. The local review generator uses production React and compiled JSX. These local files are not deployed application routes or production account verification.

Regenerate via `STARLIGHT_REVIEW_OUTPUT=<absolute path> npx tsx scripts/starlight-review.ts`. Source package and deterministic image conversions: `scripts/card-qr/plate-sources/starlight-christmas-hollow/`.

## Not yet production-approved

No Smoke deployment/picker/account/export verification, slow-4G measurement, physical Safari playback test, or Live demo has been claimed. Existing shared skin-preview/legacy customer rendering still has development React/Babel paths outside the already-approved SSR allowlist; this new theme does not silently expand that architecture or renderer allowlist. The local compiled preview is therefore a design/compatibility proof, not certification of every deployed rep's loading performance. Resolving those release checks needs additional engineering verification; no additional paid animation is necessary.

Follow PRODUCTION_STANDARD.md: preview/Smoke, Louis's demo on Live after his explicit approval, then all reps. The supplied Community migration grants the theme to every rep; **do not apply it during demo-only staging**. A demo-only catalog/constraint stage needs an exact identity-guarded release plan before Live approval. No migration applied here.

Rollback before activation: revert the theme commit and deploy the previously verified application SHA. After any future activation, first move affected reps off the new theme using preserved prior settings before removing its registry/code. Do not drop the appearance constraint or delete catalog rows while reps still reference this theme. Keep the previous deployment provenance before any later release.
