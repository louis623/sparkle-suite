/**
 * Real captured Halloween hero motion for Suite marketing peeks.
 *
 * Witch (`halloween_pumpkin_witch`) has no product video. The mp4 is a screen
 * recording of the live Mile High Fizz CSS/DOM hero, cropped to the hero
 * itself (y=87 through the hero, width trimmed at the window edge).
 *
 * Cat (`halloween_pumpkin_cat`) uses the skin-preview screen recording, not the
 * art-only `hero-desktop-motion.mp4`, so the peek stays the whole hero. The
 * sample-content bar is cropped at y=64 and the right window edge is removed.
 *
 * Posters stay the full-hero stills from the dual-skin peek.
 */
export const halloweenHeroMotion = {
  witch: {
    label: 'Halloween · Witch',
    poster: '/sparkle-suite/landing/hero-halloween-witch-live.webp',
    posterWidth: 1024,
    posterHeight: 513,
    mp4: '/sparkle-suite/landing/hero-halloween-witch-live.mp4',
    width: 1264,
    height: 656,
  },
  cat: {
    label: 'Halloween · Cat',
    poster: '/sparkle-suite/landing/hero-halloween-cat-live.webp',
    posterWidth: 1280,
    posterHeight: 576,
    mp4: '/sparkle-suite/landing/hero-halloween-cat-live.mp4',
    width: 1010,
    height: 576,
  },
} as const
