---
name: sparkle-suite-tiktok-ads
description: Produce or revise finished Sparkle Suite TikTok video ads for Bomb Party reps using real community themes, product demonstrations, approved offers, theme-specific audio, and copy-ready posting captions.
---

# Sparkle Suite TikTok ads

Use this skill for the finished vertical video and its posting package. Start with the current brief, the Sparkle Suite master brand for copy, and the media creative skill for artwork. The reference campaign lives at `marketing/tiktok/2026-11-07-thanksgiving-build-list/` relative to the Sparkle Suite repo. Its four final MP4s and combined captions file are the creative references. Earlier proofs and alternate soundtracks have been superseded.

## Build from the owl ad

Louis singled out **Fall Owl and Harvest Moon** as the example to build on. Watch `Fall-Owl-and-Harvest-Moon.mp4` in the reference campaign. Its sequence makes the benefit visible before the viewer has to read an explanation.

| Time in the owl reference | What the viewer sees and hears |
| --- | --- |
| 0–3.25 s | The owl moves against the harvest moon. The first frame names Bomb Party reps and the saving. The theme's own owl call and breeze establish the scene. |
| 3.25–6.67 s | A recording of the actual themed rep website introduces Sparkle by Sasha. The viewer can recognize the owl and the shop name in the next shot. |
| 6.67–13.25 s | A portrait QR flyer sits beside the business card front and back. All three use the same sample rep and theme. Hold long enough to compare them and scan. |
| 13.25–19.33 s | The owl returns above the offer, deadline with time zone, and readable customer domain. |

For a similar print story, start from `source/owl-print.cjs` and `source/owl_ad.py`. Render the flyer and both card faces through the current Cards & QR renderer using one sample identity and a public destination appropriate to the brief. Decode both codes from a frame extracted from the **encoded MP4** and open the expected public destination. A successful decode of the original PNG alone misses scaling and compression problems.

## Choose one promise and show it

- Establish the audience, benefit and next action in plain rep language. When an offer leads, use Louis's current approved terms. The November 7–8 example said “Save 50% on startup costs” and “Setup fee waived. Just pay your first month.” It deliberately omitted the separate founder percentage. Treat that price claim and deadline as historical.
- Source the approved community theme loop and the genuine rendered site with its real text and buttons. Check public eligibility for each theme; private custom rep artwork requires specific permission. Use safe sample data. Label previews and sample shows where relevant.
- Compose for a phone. Give the moving subject enough room, make the feature readable, and keep offer copy, URL and deadline clear of TikTok controls. Use a close crop for the character and a wider shot when the viewer needs to understand a product relationship. A still selection approves the artwork only. Judge movement, transitions and pacing in the finished cut.
- Use the brand's Playfair Display and DM Sans type, the theme palette and the existing logo lockup. In this campaign, 1080×1920 at 24 fps and 18–19.33 seconds left enough time for the proof and closing card. Adapt the duration to the brief.
- Prefer existing approved assets. Use generation only when the assignment calls for new art and the spend is authorized. Keep posting, scheduling, ad spend and website changes within the user's explicit scope.

## Lessons from the other three cuts

- **Pumpkin Pie** — Use the actual shopper interaction. Scroll from the themed homepage down to **Upcoming Shows** and hold on the listed show names and times. The enlarged calendar-link overlay made the product look like it opened a pop-up. The final cut uses sample events and zero audio streams so Louis can choose music in TikTok. See `source/capture-pumpkin-calendar.cjs` and `source/edit.py`.
- **Gobble & Fizz** — “Who's next in line?” earns the cut to the actual **Live Lineup**. Enlarge the real sample lineup until names and order can be read. Louis approved this version with its score. The successful callout here does not establish how the calendar works.
- **Starlight Christmas Hollow** — Use the approved lantern-carrying gnome, cranberry-accented site preview and selected Christmas Music Box cue. Identify the site as a theme preview and preserve its actual release status. See `source/starlight_ad.py`.

## Evergreen demo ads

Louis approved the Fizz Festival order-insert cut as the reference for this series. The approved master is `marketing/tiktok/2026-11-11-fizzfest-website/Fizz-Festival-Order-Insert.mp4`.

- Start with the rep’s real routine. For business cards, show the rep tucking a card into a customer’s jewelry order. The customer scans it later to return to that rep’s site. A handwritten thank-you or an actual rep discount can personalize the card. Verify an offer before showing it.
- For Louis’s demo, open the public Fizz Festival site and read its current shop name and theme before making assets. Match the printed card, QR destination and mobile capture to that account. Use existing public content for the proof.
- When jewelry is visible, source the actual piece photo from an authorized listing and keep the photographed BP display card or packaging with it. Use generated scenery for the outer shipping carton or tissue. A generic velvet pouch gives the wrong impression of how the piece comes packaged.
- Match moving site elements to live playback. For frame-by-frame captures, advance the hero and both ticker animations on the same timeline. Measure each ticker’s direction and travel over one second on the live page, then compare two frames one second apart in the encoded MP4. Capture enough footage for the entire shot so the tickers do not jump back mid-scroll.

### Live Lineup and shopper narration

For the second pin, use the approved `marketing/tiktok/2026-11-11-fizzfest-lineup/Fizz-Festival-My-Reveal-Voice-Only.mp4` as the reference. Vary the community theme across pins so each feature shows another side of the same demo shop. Pin 2 pairs Chasing Unicorns with a shopper finding her turn.

- Write in the shopper’s voice. Give her a concrete reason to love the rep, then let the interface prove it. Jess places an order, finds herself third, and says her reveal is coming up soon.
- For a filmed lineup, use plausible staged first names in the real customer interface. Populate them in the isolated recording. Keep the public show and its customer data untouched. On this pin Louis wanted eight feminine first names and no added sample label in the ad.
- Hold one phone framing as the lineup opens. Give viewers time to read the names and keep Jess’s position visible through her final line. Fade directly to the CTA. A jewelry cutaway interrupted the payoff, and the earlier fast reframing and bright bell attacks distracted from her voice.

## Sound, revisions and delivery

Inspect the theme's source streams and provenance. Follow the sound direction for that ad. For ambience only, map the theme audio directly, audition the loop seam and adjust gain for phone playback. When Louis will add music in TikTok, keep any approved narration on its own audio track and omit baked-in music. For a fully silent version, export with zero audio streams. Verify the final streams and listen for the intended sound. For a soundtrack-only change, stream-copy the approved picture and compare video-stream hashes. Keep sibling ads and previously approved elements intact.

Keep sources, reproducible edits, final MP4s, playback proofs and captions in a dated folder under `marketing/tiktok/`. The historical scripts contain machine-specific paths: resolve the current approved checkout, source assets, fonts and local encoder before adapting them. Render to a new output while iterating.

Inspect the encoded cut at phone size, including transitions, hold times, audio, offer legibility and CTA. Probe the final duration, dimensions and streams; fully decode the export. Deliver each approved filename directly in Louis's **Downloads** folder and verify its checksum matches the repo copy. Maintain one copy-ready text file for the batch, with a short description, actual website and five relevant hashtags per ad unless the new brief says otherwise. Preserve earlier entries if adding a new one, and link the delivered files.
