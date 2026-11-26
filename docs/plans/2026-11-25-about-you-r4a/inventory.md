# About you pop-up — function inventory

Branch: `cursor/socials-phone-preview-583b` (PR #235, head 9161af4e). Source: `SiteSettingsBody` sections `about` + `bomb-party`, `HomepageMediaSlot`, `site-settings-save`, `lib/public-site/about-section.ts`.

## In this pop-up (must keep)

- Dialog chrome: kicker “Your customer site” / title “About you” / subtitle “Your story, photo, and the Bomb Party video.” Close, autosave (“All changes saved”), Undo, Finished.
- `aboutHeading` — About title. Max 70. Placeholder “Meet Brianna.”
- `aboutNarrative` — About story (labeled “About narrative” today). Max 1,200, with a live character count. Placeholder “Paste the story you want customers to read.”
- Helper today: “Add a short title and paste your customer-facing story. Keep it concise so it stays balanced beside your photo.”
- `homepageMediaSlots.about_1` — About portrait photo (`imageUrl`).
  - Upload / Replace photo. Accepts JPG, PNG, WebP. Direct upload if ≤ 2.7 MB; otherwise compressed (longest edge 1,800, JPEG 0.84) and rejected if still over ~2.4 MB (“Choose a photo smaller than 2.5 MB.”).
  - Auto **Smart Frame** on upload (FaceDetector): `portraitFocusX` (0–100, default 50), `portraitFocusY` (0–60, default 20), `portraitZoom` (1–1.5, default 1.18). Success: “Photo uploaded with Smart Frame. It saves on its own.”
  - Manual Smart Frame sliders: Zoom, Move subject up or down, Move subject left or right.
  - Photo caption (`caption`) max 240.
  - Remove photo (clears `imageUrl`).
  - Upload success / error feedback.
- `homepageMediaSlots.about_2`, `about_3`, `about_4` — About short video 1, 2, 3 (`videoUrl`, `caption`).
  - Video link (public TikTok, YouTube, Instagram, or Facebook). Videos up to 3 minutes.
  - Optional caption max 180.
  - `tiktokVideoStatus`: queued / live / unavailable messages. A new video can take 24–48 hours; until then visitors see a tap-to-watch card.
  - Locked queued TikTok: field is read-only; “Remove this video before adding a new link.”
  - Remove video, with confirm “Remove this video from your site?” when the video is locked or preserved (`videoPreserved`).
- `homepageMediaSlots.showcase` — Live reveal / Bomb Party video. Same link + optional caption (max 180). Section title “What is a Bomb Party.” Label “Live reveal video.” Caption shows under the live reveal video.
- Save: autosave (text is debounced; photo/frame saves immediately). Undo last change. No new fields, no migration.

## Related, but not edited in this pop-up

- `displayName` (first name / host name) — edited in Look. Appears in the hero, About, and Join.
- `tagline` — edited in Socials and Contact Info.
- `heroImageUrl` — Look.
- `profilePhotoUrl` / `profilePhotoFraming` — Join Team lead card (optional AI polish lives there, not here).
- `aboutSubheading` — exists in the database (max 240) and can be set from the chat tool, but has **no field in this pop-up**.

## Special-case only (Britt with Bling)

- Custom labels, `sectionVisible` toggle for the About / Sparkle Moments section, “Open video,” and a “not a playable public video” error. Not shown in the Sasha sample concepts.

## Not in this pop-up today

- No writing or rewrite helper for the story.
- No live customer preview (the Socials pop-up already has one).
