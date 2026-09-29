/**
 * Real captured Halloween hero motion for Suite marketing peeks.
 *
 * Both files are page-area captures of the full live hero: site header,
 * announcement / Dance Floor / Live Lineup bars, titles, body copy, every
 * CTA, complete art, and the on-hero pause control. They are not cropped.
 *
 * Witch is the Mile High Fizz CSS/DOM hover, 968×720 (the still is 967 wide;
 * the video pads one edge pixel so the width is even). Cat is the product
 * hero motion, 966×710, including the left headlines.
 */
export const halloweenHeroMotion = {
  witch: {
    label: 'Halloween · Witch',
    poster: '/sparkle-suite/landing/hero-halloween-witch-live.webp',
    posterWidth: 968,
    posterHeight: 720,
    mp4: '/sparkle-suite/landing/hero-halloween-witch-live.mp4',
    width: 968,
    height: 720,
  },
  cat: {
    label: 'Halloween · Cat',
    poster: '/sparkle-suite/landing/hero-halloween-cat-live.webp',
    posterWidth: 966,
    posterHeight: 710,
    mp4: '/sparkle-suite/landing/hero-halloween-cat-live.mp4',
    width: 966,
    height: 710,
  },
} as const
