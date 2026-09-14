# Neon Butterfly Kelly studio rebuild — September 14, 2026

## Outcome

Neon Butterfly (`NB-01`, preset id `neon_butterfly`) keeps the shared Amethyst
layout, navigation, announcement bar, Dance Floor ticker, Live Lineup rail,
cards, and customer-site behavior. Its hero art has been rebuilt around the
approved Kelly studio composition: plum curtain, black jewelry shelving,
  reveal inventory, one warm lamp, changing colored shelf light, and exactly two
  restrained snake plants. There is no visible floor, foreground furniture, or
  dangling foliage. The right shelf was regenerated after visual review so its
  inner and outer uprights now mirror the left shelf's believable inward
  perspective without doubled, crossed, or backward frame bars.

## Approved art and motion

- The approved responsive environment plates are served as
  `kelly-studio-desktop.webp` and `kelly-studio-mobile.webp`.
- The final built-in ImageGen masters are
  `exec-87e55ae8-5d84-4066-a4a6-8dc1f860465c.png` (wide) and
  `exec-d1fd575f-9019-4aa4-9287-c680d1ec6672.png` (portrait). The portrait
  composition intentionally crops more of both shelves so mobile copy remains
  inside an uninterrupted center-curtain safe area.
- The three butterfly tubes are isolated directly from Kelly's reference signs
  rather than redrawn as generic icons. Transparent export padding was fixed so
  no black bars or crop-box pixels remain.
- Pink sits above “Let,” violet sits beneath the final “e” in “sparkle,” and
  yellow sits below the main Dance Floor button. Responsive placement keeps the
  signs away from the jewelry shelves.
- Pink and violet use saturated color-only bloom; yellow retains the approved
  warm white-hot core and yellow halo.
- The hero headline uses slightly relaxed tracking with display ligatures
  disabled so the “fl” pair remains crisp at nonstandard zoom levels. The
  supporting line is constrained to the center curtain safe area and narrows
  to 66% of the mobile viewport so neither edge runs into the shelving.
- Each sign has independent, staggered left/right wing motion. The surrounding
  set also has restrained LED color drift, lamp shimmer, and 24 intermittent
  sparkle points. Pause/Resume, hidden-page pausing, and reduced-motion support
  remain intact.

## Verification

- Focused Neon Butterfly suite: 13/13 passed.
- Full production build: passed, including branch safety, compilation,
  TypeScript, static generation, and page optimization.
- Browser QA completed at 844px desktop-panel, 768x1024 tablet, and 390x844
  mobile widths.
- Render inspection confirmed three butterflies, 24 sparkles, no horizontal
  overflow, and active 17s, 21s, and 19s independent wing animations.
- Console inspection found no application errors; only the known local preview
  warning about its in-browser Babel transformer.
- Asset regression checks require fully transparent edges, under 17% visible
  crop coverage, and zero opaque near-black pixels in every butterfly PNG.

## Safety

No Finder, Live Lineup, extension, queue, Store, migration, billing,
authentication, or customer-data behavior was changed by this rebuild.

## Release

- Final application commit:
  `a0cbfa0e0e482abac9d48797e0f1c7632ed07f5a` (studio rebuild parent
  `f8bda14c51045a28c9170e061f05123892a636bc`).
- Final READY Vercel deployment:
  `dpl_5S4omxT8Eo8YKx4P5eU3dZzuJ8uU`.
- Direct Vercel inspection confirmed both `https://www.yoursparklesuite.com`
  and `https://yoursparklesuite.com` resolve to that exact deployment.
- The exact live preview path verified in the browser was
  `https://www.yoursparklesuite.com/skin-preview/neon_butterfly/homepage?release=a0cbfa0e`.
- Live desktop-panel, 768x1024 tablet, and 390x844 mobile checks passed; the
  live console reported zero errors. Reviewer-smoke authentication was not
  used because the affected route is the safe public fixture preview.
- The pre-release deployment remained on
  `dpl_5DEQiLQ4mfHZCLkBYRRVknxiKiSX` until final verification and aliasing.
  An initial held manual upload failed safely before aliasing because it lacked
  Vercel Git metadata; the retry supplied the verified repository and branch
  metadata and passed the branch-safety gate. No domain moved during the
  failed attempt.
