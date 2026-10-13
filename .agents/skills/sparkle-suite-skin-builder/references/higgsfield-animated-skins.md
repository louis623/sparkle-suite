# Animated customer-site skins with Higgsfield

Captured September 30, 2026 from the Pumpkin and Cat build and mobile correction. Use for new skins and approved updates to older skins. This is a creative-production workflow, not a runtime API feature.

## Start from the approved skin
Read the current GitHub tip, skin-builder skill, skin contract and cinematic hero contract. Preserve Amethyst behavior, rep branding, customer data mapping and skin access policy. A rep's seasonal skin can be dark, glittery or playful: the marketing skill's cream/blush palette does not override an approved customer-site design.

Inventory the source image, exact silhouettes, character identity, charm, prop counts, lighting, floor/reflections and text-safe area. Separate locked elements from requested changes. Put real title, subcopy and all buttons into a composition proof before buying motion. Review phone, tablet and desktop together.

For an older skin, first record its stable ID/code, Community or private ownership, current assets, motion settings, templates and picker entry. Update the approved visual layer without silently changing saved selections, access, customer actions or the overall design. Show alternatives when Louis asks for a redesign; keep the selected option as the reference.

## Choose the smallest effective animation tool
Use CSS for twinkling stars, a restrained glow or a decorative cutout moving along a path. Pumpkin and Witch used CSS witch motion and four actual animated star twinkles; it did not need a new paid video.

Use image-to-video for character mechanics such as blinking eyes and a flexible tail. Pumpkin and Cat used the approved image as both the start and end frame. Text-to-video was only the initial API connection test; it is not the reference-faithful skin workflow. Generate artwork and motion only; titles, links and controls remain real HTML.

## API and cost preflight
Read the official SDK and exact model documentation immediately before implementation; record the installed SDK version and lockfile:
- [SDK](https://docs.higgsfield.ai/docs/how-to/sdk)
- [Seedance 2.5 image-to-video](https://open.higgsfield.ai/models/bytedance/seedance-2.5/image-to-video/api-reference)
- [Initial text-to-video test](https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference)

Use the project's language/package manager. The proven utility was TypeScript/npm with @higgsfield/client 0.2.6, the /v2 import, and dotenv. This is historical version evidence, not an instruction to install an old version.

Credentials: server-side HF_CREDENTIALS (TypeScript) or HF_KEY (Python), key-id:key-secret format, loaded quietly at runtime from ignored .env.local or an approved secret store. Never read/display/log the value, commit it, embed it in client code, or include it in notes. If local entry is needed, prepare a masked loopback-only form for Louis or another supported local secret-entry flow. Do not claim ordinary chat is a secure credential field. Keep the secret handler separate from the public preview server and stop it after use.

Estimate the exact payload before a paid submission and stay within the current authorized budget. The September 28 five-second character request was estimated at $2.311 before discounts and guarded at $2.50. Those numbers are historical, not current pricing or reusable spending permission. The initial $5 funding was for that session; remaining balance is not standing authorization for arbitrary new generations. An unreadable estimate means stop, not guess.

## Proven reference-driven recipe
Model: bytedance/seedance-2.5/image-to-video.

Input shape used successfully:
```json
{
  "prompt": "<locked scene and bounded motion brief>",
  "duration": 5,
  "resolution": "720p",
  "image_url": "<approved uploaded image>",
  "end_image_url": "<same approved uploaded image>",
  "output_format": "mp4",
  "generate_audio": false
}
```
Matching endpoint images help but do not guarantee a seamless loop.

Prompt structure: preserve the exact reference and composition; lock the camera; describe one small movement per subject with timing and return pose; specify localized light; explicitly prohibit unwanted changes.

Pumpkin and Cat example:
> Animate this exact reference as a quiet, cute Halloween hero. Locked camera and identical framing. Preserve the glitter black kitten's tilted head, orange slit pupils, planted paws, curled tail, silver diamond skull charm, cat-faced pumpkin and floor reflections. Between seconds 1 and 2, one gentle blink, reopening to the same eye shape. Between seconds 2 and 4, one slow curious tail swish from its fixed base, returning to its original curl. Keep the body still. A hidden candle gives faint irregular amber light deep behind the pumpkin's carved eyes and mouth; retain dark cavity depth. The pumpkin face stays fixed. Keep the black background and empty text area unchanged. Return to the reference pose and glow level before the end. No camera movement, zoom, cuts, new objects, morphing, moving pumpkins, global brightness pulses, external flame, particles, text, logos, UI or sound.

## Submit once, resume safely
Use the official SDK subscribe method. Save a non-secret checkpoint before submission, then immediately persist the returned request ID, exact model/input identity, status and estimate. Restarts resume or return the saved result; they do not buy another video. Disable automatic submission retries unless duplicate-charge behavior has been verified safe. A timeout or lost receipt requires console reconciliation before another submission.

Success requires completed status, a valid HTTPS video URL and a playable downloaded/exported artifact. Failed, canceled/cancelled, moderated, nsfw or rejected are terminal failures. Unknown status is not success. Suppress raw SDK error objects/headers; report sanitized status and request ID only.

Observed 0.2.6 issues, to re-check before reusing workarounds:
- Built-in polling did not terminate on canceled status. The working script called subscribe with withPolling:false, saved its receipt, then polled the documented request status endpoint with explicit terminal handling.
- Upload helper omitted required upload_headers and got HTTP 403. The working flow obtained a presigned URL from the official API, PUT the image with every returned upload header, then used public_url. API authorization went only to the official API, never the storage PUT. Do not persist signed upload authorization in shared notes.
- Poll existing work through bounded waits; a slow queue is not a reason to resubmit.

## Inspect and package the actual motion
Watch the entire clip and inspect a contact sheet, character-detail frames, and first/last-frame comparison. Check identity, eyes reopening, rooted tail, charm integrity, carving edges, background stability and the text-safe area. Confirm flame/light stays localized. Report differences honestly: the accepted cat's tail sweep was broader than originally requested.

Preserve the original file. The successful cat source was 1280x720 H.264, 24fps, 5.041667 seconds with no audio, about 1.99 MB. Its web encode was H.264 MP4, CRF 19, faststart, no audio, about 1.01 MB. Treat these as a useful starting point, not a universal quality target. Inspect the compressed result too. Keep a matching WebP poster and self-host approved assets; the live skin never calls Higgsfield.

Record model, prompt, reference/input hashes, SDK version, request ID, estimated versus verified actual cost, output provenance, encoding settings and approval. Exclude credentials, authorization headers and signed upload URLs.

## Integrate desktop and mobile as one experience
The first cat implementation incorrectly switched phones to a separate square still and disabled the video at <=1100px. Louis rejected that. Do not repeat a desktop-only approval assumption.

Reuse the approved video and matching poster on phones/tablets unless a different mobile direction is explicitly approved. Keep the cat's face, tail and main pumpkin in frame. The corrected cat uses a right/bottom square crop on phones and 4:3 crop on tablets, with real copy/actions below. Poster and video share the same crop to avoid a visual jump.

Use muted inline playback, restrained repeat/rest timing (cat: five-second clip, four-second rest), and a visible accessible Pause/Play button. Honor reduced motion and the rep's motion-off setting; pause hidden/offscreen media and clean up listeners/timers on skin changes. Autoplay rejection leaves manual Play available. Playback failure falls back to the matching poster. Screen width alone must not disable motion. Decorative layers cannot intercept buttons.

Inspect phone, tablet, laptop and an awkward intermediate width; check contrast, wrapping, focus, touch targets, all customer-site pages and no horizontal overflow. A phone-width desktop browser is not physical iPhone/Safari verification: distinguish those in evidence.

## Verify and release
Use current skin-builder and Smoke release policies; this playbook does not grant new spend, deployment or rep-account authorization. Check Community/private picker visibility and save/reload with a safe synthetic account. Test playback lifecycle, mobile behavior and reduced-motion/error fallback, then build/type-check. Verify the exact approved source on Smoke, obtain any required Live go, rebuild with production configuration, confirm Suite domain provenance, and exercise live navigation plus actual playback. Preview CSP must permit the hosted decorative video while keeping sample requests/submissions disabled.

Maintain a safe repeatable preview with sample content. For old-skin updates, verify its existing listing and saved identity remain usable. Close out in Core Memory, the repo vault and the short Open Brain diary without secrets.

## Source evidence
- Working runtime: public/amethyst/halloween-pumpkin-cat.js and .css; assets under public/amethyst/skins/halloween-pumpkin-cat/.
- Lifecycle tests: tests/pumpkin-cat-motion.test.ts; skin/policy tests: tests/halloween-pumpkin-cat-skin.test.ts.
- Mobile fix: 5f8ceac0bda2798a34f5d69ecb22f6b299988d65; vault/2026-09-28-pumpkin-cat-mobile-motion-closeout.md.
- Core Memory: ships/2026-09-28-pumpkin-cat-and-halloween-controls-live.md, ships/2026-09-28-witch-onyx-live.md and ships/2026-09-28-pumpkin-cat-mobile-motion-live.md.
- Historical local utilities: September 27 session artifact folder's higgsfield-api/{prepare-motion.mjs,motion.ts,index.ts}; pumpkin-cat/{motion-brief.md,motion-qa-v1.md}. Early mobile-still statements are superseded by the mobile fix. Do not depend on those temporary folders or copy their secret files into a release.
