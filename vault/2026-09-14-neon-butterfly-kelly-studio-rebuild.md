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
  `exec-7d67d65c-2957-44a6-90b1-4a44a0642edc.png` (portrait).
- The three butterfly tubes are isolated directly from Kelly's reference signs
  rather than redrawn as generic icons. Transparent export padding was fixed so
  no black bars or crop-box pixels remain.
- Pink sits above “Let,” violet sits beneath the final “e” in “sparkle,” and
  yellow sits below the main Dance Floor button. Responsive placement keeps the
  signs away from the jewelry shelves.
- Pink and violet use saturated color-only bloom; yellow retains the approved
  warm white-hot core and yellow halo.
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
